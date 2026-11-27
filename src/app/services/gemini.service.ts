import { Injectable, signal, WritableSignal } from '@angular/core';
import { TextExtractionResult } from '../models/sherlock.model';

export interface ImagePayload {
  base64: string;
  mimeType: string;
}

@Injectable({
  providedIn: 'root'
})
export class GeminiService {
  private readonly STORAGE_KEY = 'sherlocked_gemini_api_key';
  private readonly STORAGE_MODEL_KEY = 'sherlocked_fast_model';

  public readonly apiKey: WritableSignal<string> = signal('');
  public readonly isAnalyzing: WritableSignal<boolean> = signal(false);
  public readonly errorMessage: WritableSignal<string | null> = signal(null);
  public readonly activeModel: WritableSignal<string | null> = signal(null);

  private cachedModel: string | null = null;
  private knownSupportedModels: string[] = [];

  constructor() {
    const saved = localStorage.getItem(this.STORAGE_KEY);
    if (saved) {
      this.apiKey.set(saved);
    }

    const cached = localStorage.getItem(this.STORAGE_MODEL_KEY);
    if (cached && !cached.includes('-exp')) {
      this.cachedModel = cached.replace(/^models\//, '');
    } else {
      localStorage.removeItem(this.STORAGE_MODEL_KEY);
      this.cachedModel = null;
    }
  }

  public setApiKey(key: string): void {
    const cleanKey = key.trim().replace(/^Bearer\s+/i, '').replace(/^["']|["']$/g, '');
    this.apiKey.set(cleanKey);
    this.errorMessage.set(null);
    this.cachedModel = null;
    this.knownSupportedModels = [];
    localStorage.removeItem(this.STORAGE_MODEL_KEY);
    if (cleanKey) {
      localStorage.setItem(this.STORAGE_KEY, cleanKey);
    } else {
      localStorage.removeItem(this.STORAGE_KEY);
    }
  }

  public resetCachedModel(): void {
    this.cachedModel = null;
    this.knownSupportedModels = [];
    localStorage.removeItem(this.STORAGE_MODEL_KEY);
  }

  /**
   * Récupère dynamiquement la liste des modèles actifs pour cette clé API
   */
  public async getAvailableModels(key: string): Promise<string[]> {
    if (this.knownSupportedModels.length > 0) {
      return this.knownSupportedModels;
    }

    try {
      const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
      if (resp.ok) {
        const data = await resp.json();
        const models = (data.models || []) as Array<{ name: string; supportedGenerationMethods?: string[] }>;

        const supported = models
          .filter(m => (!m.supportedGenerationMethods || m.supportedGenerationMethods.includes('generateContent')) && !m.name.includes('-exp'))
          .map(m => m.name.replace(/^models\//, ''));

        supported.sort((a, b) => {
          const aFlash = a.includes('flash') ? 0 : 1;
          const bFlash = b.includes('flash') ? 0 : 1;
          if (aFlash !== bFlash) return aFlash - bFlash;
          return a.localeCompare(b);
        });

        if (supported.length > 0) {
          this.knownSupportedModels = supported;
          return supported;
        }
      }
    } catch (e) {
      console.warn('Impossible de lister les modèles en ligne via ListModels:', e);
    }

    return ['gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'];
  }

  /**
   * Vérifie la validité d'une clé API Google AI Studio en appelant ListModels
   */
  public async testApiKey(key: string): Promise<{ success: boolean; message: string; models?: string[] }> {
    const cleanKey = key.trim().replace(/^Bearer\s+/i, '').replace(/^["']|["']$/g, '');
    if (!cleanKey) {
      return { success: false, message: 'La clé API est vide.' };
    }

    try {
      const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${cleanKey}`);
      if (resp.ok) {
        const data = await resp.json();
        const models = (data.models || []) as Array<{ name: string; supportedGenerationMethods?: string[] }>;
        const supported = models
          .filter(m => (!m.supportedGenerationMethods || m.supportedGenerationMethods.includes('generateContent')) && !m.name.includes('-exp'))
          .map(m => m.name.replace(/^models\//, ''));

        const topModels = supported.filter(m => m.includes('flash')).slice(0, 3);
        const modelsSummary = topModels.length > 0 ? topModels.join(', ') : supported.slice(0, 3).join(', ');

        return {
          success: true,
          message: `Connexion réussie ! Clé valide (${supported.length} modèles actifs détectés : ${modelsSummary}).`,
          models: supported
        };
      }

      let errDetail = `Erreur HTTP ${resp.status}`;
      try {
        const errJson = await resp.json();
        if (errJson?.error?.message) {
          errDetail = errJson.error.message;
        }
      } catch {}

      if (resp.status === 400 || resp.status === 403 || errDetail.includes('API_KEY_INVALID')) {
        return {
          success: false,
          message: `Clé non reconnue par Google : ${errDetail}`
        };
      } else if (resp.status === 429) {
        return {
          success: false,
          message: 'Quota Google AI Studio dépassé (Erreur 429).'
        };
      }

      return {
        success: false,
        message: `Erreur Google AI (${resp.status}) : ${errDetail}`
      };
    } catch {
      return {
        success: false,
        message: 'Impossible de joindre Google (vérifiez la connexion ou désactivez un adblocker bloquant googleapis.com).'
      };
    }
  }

  /**
   * Extrait fidèlement tout le texte ou code depuis 1 à N photos
   */
  public async extractTextFromImages(
    images: ImagePayload[],
    displayImages: string[] = []
  ): Promise<TextExtractionResult> {
    this.isAnalyzing.set(true);
    this.errorMessage.set(null);
    const key = this.apiKey();

    if (!key) {
      this.isAnalyzing.set(false);
      this.errorMessage.set('Aucune clé API configurée. Veuillez coller votre clé Google Gemini pour extraire le texte.');
      throw new Error('NO_API_KEY');
    }

    if (!images.length) {
      this.isAnalyzing.set(false);
      this.errorMessage.set('Aucune image fournie pour l\'extraction.');
      throw new Error('NO_IMAGES');
    }

    const preparedImages = images.map(img => this.normalizeBase64(img.base64, img.mimeType));

    const prompt = `
Tu es un moteur OCR expert spécialisé dans la transcription fidèle de CODE INFORMATIQUE et de TEXTE ÉCRIT à partir de photos (écrans d'ordinateur, feuilles imprimées, notes manuscrites, tableaux, documents).

L'utilisateur t'envoie ${preparedImages.length} photo(s) dans l'ordre.

RÈGLES STRICTES DE TRANSCRIPTION :
1. TRANSCRIS TOUT LE TEXTE/CODE VISIBLE avec une fidélité maximale, caractère par caractère :
   - Préserve exactement l'indentation (espaces / tabulations), les sauts de ligne, les accolades { }, crochets [ ], parenthèses ( ), guillemets ' " \`, points-virgules ; et opérateurs.
   - Ne résume JAMAIS le code et ne remplace JAMAIS des lignes par "// ...". Transcris 100% du contenu lisible.
   - Ignore les éléments d'interface parasite autour de la zone utile (ex: barre des tâches Windows/Mac, numéros de ligne dans la gouttière d'un éditeur VS Code, icônes de fenêtre) sauf s'ils font partie du texte.
2. GESTION MULTI-PHOTOS (${preparedImages.length} image(s)) :
   - Si les photos montrent la suite d'un même fichier de code ou d'un même document, FUSIONNE-les proprement dans l'ordre en supprimant les lignes en double au niveau du chevauchement.
   - Si les photos montrent des extraits indépendants, sépare-les clairement par une ligne vide (ou un commentaire de séparation si c'est du code).
3. FORMAT DE SORTIE :
   - Retourne STRICTEMENT un objet JSON valide sans texte ni balise markdown avant ou après :
{
  "title": "Titre court décrivant le contenu (ex: 'Composant Angular UserProfile', 'Script Python de tri', 'Notes de réunion')",
  "contentType": "code" | "text" | "mixed",
  "language": "Langage détecté en minuscules (ex: 'typescript', 'javascript', 'python', 'html', 'css', 'json', 'java', 'csharp', 'php', 'sql', 'bash', 'markdown', 'plaintext')",
  "suggestedFilename": "Nom de fichier pertinent avec la bonne extension (ex: 'user-profile.component.ts', 'script.py', 'document.txt')",
  "extractedText": "Le texte ou code complet extrait, avec \\n pour les sauts de ligne.",
  "summary": "Une seule phrase courte précisant ce qui a été extrait (ex: 'Code TypeScript extrait et fusionné depuis 2 captures d\\'écran')."
}

Si aucun texte lisible n'est présent sur les images, mets "extractedText": "" et explique-le brièvement dans "summary".
`;

    const available = await this.getAvailableModels(key);
    const candidatesToTry = this.buildCandidateModels(available);
    const errorsLog: string[] = [];

    for (const modelCandidate of candidatesToTry) {
      try {
        const result = await this.callGenerateContent(modelCandidate, key, prompt, preparedImages);
        if (result) {
          this.cachedModel = modelCandidate;
          this.activeModel.set(modelCandidate);
          localStorage.setItem(this.STORAGE_MODEL_KEY, modelCandidate);
          this.isAnalyzing.set(false);
          this.errorMessage.set(null);
          return this.mapParsedToResult(result, displayImages.length ? displayImages : images.map(i => i.base64));
        }
      } catch (err: any) {
        const errMessage = err?.message || String(err);
        errorsLog.push(`${modelCandidate}: ${errMessage}`);
        console.warn(`Modèle ${modelCandidate} indisponible (${errMessage}), essai du suivant...`);
      }
    }

    this.isAnalyzing.set(false);
    const lastError = errorsLog[errorsLog.length - 1] || 'Erreur inconnue';

    let friendlyError = 'Impossible de contacter l\'IA Google.';
    if (lastError.includes('API_KEY_INVALID') || lastError.includes('API key not valid')) {
      friendlyError = 'Clé Google AI Studio invalide ou révoquée. Veuillez vérifier votre clé API.';
    } else if (lastError.includes('RESOURCE_EXHAUSTED') || lastError.includes('429') || lastError.includes('quota')) {
      friendlyError = 'Quota Google AI Studio dépassé (Erreur 429). Attendez une minute ou utilisez une autre clé.';
    } else {
      friendlyError = `Erreur Google AI : ${lastError}`;
    }

    this.errorMessage.set(friendlyError);
    throw new Error(friendlyError);
  }

  private normalizeBase64(base64Image: string, fallbackMime: string): { mimeType: string; data: string } {
    let resolvedMime = fallbackMime || 'image/jpeg';
    let cleanBase64 = base64Image;

    if (base64Image.includes(',')) {
      const parts = base64Image.split(',');
      const header = parts[0];
      cleanBase64 = parts[1];
      const match = header.match(/^data:([^;]+);base64/);
      if (match) {
        resolvedMime = match[1];
      }
    }

    return {
      mimeType: resolvedMime,
      data: cleanBase64.replace(/\s/g, '')
    };
  }

  private buildCandidateModels(available: string[]): string[] {
    const preferredOrder = [
      'gemini-2.0-flash',
      'gemini-2.5-flash',
      'gemini-2.5-pro',
      'gemini-2.0-pro',
      'gemini-1.5-pro',
      'gemini-1.5-flash',
      'gemini-flash'
    ];

    const candidates: string[] = [];
    if (this.cachedModel && available.includes(this.cachedModel) && this.cachedModel.includes('2.')) {
      candidates.push(this.cachedModel);
    }

    for (const preferred of preferredOrder) {
      const match = available.find(m => m.includes(preferred.replace('gemini-', '')));
      if (match && !candidates.includes(match)) {
        candidates.push(match);
      }
    }

    for (const m of available) {
      if (!candidates.includes(m)) {
        candidates.push(m);
      }
    }

    return candidates;
  }

  private async callGenerateContent(
    modelPath: string,
    key: string,
    prompt: string,
    images: Array<{ mimeType: string; data: string }>
  ): Promise<any> {
    const formattedModel = modelPath.startsWith('models/') ? modelPath : `models/${modelPath}`;
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/${formattedModel}:generateContent?key=${key}`;

    const parts: any[] = [{ text: prompt }];
    for (const img of images) {
      parts.push({
        inlineData: {
          mimeType: img.mimeType,
          data: img.data
        }
      });
    }

    const body = {
      contents: [{ parts }],
      generationConfig: {
        temperature: 0.05,
        maxOutputTokens: 8192,
        responseMimeType: 'application/json'
      }
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      let errMessage = `HTTP ${response.status}`;
      try {
        const errorData = await response.json();
        if (errorData?.error?.message) {
          errMessage = errorData.error.message;
        }
      } catch {}
      throw new Error(errMessage);
    }

    const data = await response.json();
    let rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      const finishReason = data?.candidates?.[0]?.finishReason;
      throw new Error(`Réponse vide (Raison : ${finishReason || 'inconnue'})`);
    }

    rawText = rawText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
    try {
      return JSON.parse(rawText);
    } catch {
      console.error('Erreur parsing JSON Gemini brut:', rawText);
      throw new Error('La réponse de l\'IA n\'est pas au format JSON attendu.');
    }
  }

  private mapParsedToResult(parsed: any, photos: string[]): TextExtractionResult {
    const contentType = parsed.contentType === 'code' || parsed.contentType === 'mixed' ? parsed.contentType : 'text';
    const language = (parsed.language || 'plaintext').toLowerCase();
    const defaultExt = language === 'typescript' ? 'ts'
      : language === 'javascript' ? 'js'
      : language === 'python' ? 'py'
      : language === 'html' ? 'html'
      : language === 'css' ? 'css'
      : language === 'json' ? 'json'
      : language === 'markdown' ? 'md'
      : 'txt';

    return {
      title: parsed.title || 'Contenu extrait',
      contentType,
      language,
      suggestedFilename: parsed.suggestedFilename || `extraction.${defaultExt}`,
      extractedText: parsed.extractedText ?? '',
      summary: parsed.summary || `Texte extrait depuis ${photos.length} photo(s).`,
      photoCount: photos.length,
      photos,
      extractedAt: new Date()
    };
  }
}
