import { Injectable, signal, WritableSignal } from '@angular/core';
import { SherlockAnalysis, SherlockClue } from '../models/sherlock.model';

@Injectable({
  providedIn: 'root'
})
export class GeminiService {
  private readonly STORAGE_KEY = 'sherlocked_gemini_api_key';
  private readonly STORAGE_MODEL_KEY = 'sherlocked_fast_model';

  public readonly apiKey: WritableSignal<string> = signal('');
  public readonly isAnalyzing: WritableSignal<boolean> = signal(false);
  public readonly errorMessage: WritableSignal<string | null> = signal(null);

  private cachedModel: string | null = null;
  private knownSupportedModels: string[] = [];

  constructor() {
    const saved = localStorage.getItem(this.STORAGE_KEY);
    if (saved) {
      this.apiKey.set(saved);
    }

    const cached = localStorage.getItem(this.STORAGE_MODEL_KEY);
    // Nettoyer tout ancien modèle expérimental obsolète
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
        
        // Garder uniquement les modèles qui supportent generateContent et exclure les anciens modèles -exp
        const supported = models
          .filter(m => (!m.supportedGenerationMethods || m.supportedGenerationMethods.includes('generateContent')) && !m.name.includes('-exp'))
          .map(m => m.name.replace(/^models\//, ''));

        // Prioriser : Flash d'abord (1.5-flash, 2.0-flash), puis Pro
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

    // Modèles stables par défaut (sans aucun -exp)
    return ['gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-1.5-pro'];
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
    } catch (networkErr: any) {
      return {
        success: false,
        message: 'Impossible de joindre Google (vérifiez la connexion ou désactivez un adblocker bloquant googleapis.com).'
      };
    }
  }

  /**
   * Analyse une photo de façon ultra-rapide avec Google Gemini Flash
   */
  public async analyzeImage(
    base64Image: string,
    mimeType: string = 'image/jpeg',
    displayImageSrc?: string
  ): Promise<SherlockAnalysis> {
    this.isAnalyzing.set(true);
    this.errorMessage.set(null);
    const key = this.apiKey();

    if (!key) {
      this.isAnalyzing.set(false);
      this.errorMessage.set('Aucune clé API configurée. Veuillez coller votre clé Google Gemini pour que Sherlock analyse cette photo.');
      throw new Error('NO_API_KEY');
    }

    // Extraction propre du MIME type et du base64 brut
    let resolvedMime = mimeType || 'image/jpeg';
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

    cleanBase64 = cleanBase64.replace(/\s/g, '');

    const prompt = `
Tu es Sherlock Holmes (incarnation moderne de la série BBC avec Benedict Cumberbatch).
Tu as sous les yeux UNE PHOTO RÉELLE envoyée par l'utilisateur. Ton Palais Mental s'active instantanément.

RÈGLE D'OR : TON ANALYSE DOIT ÊTRE 100% ADAPTÉE ET FOCALISÉE SUR CE QUI EST CONCRÈTEMENT PRÉSENT SUR CETTE PHOTO.
Identifie l'objet précis, la marque, les couleurs réelles, la texture, l'environnement, les défauts visibles. Ne sois JAMAIS générique.

Fournis STRICTEMENT un JSON valide sans texte avant ni après, avec ce format :
{
  "subject": "Nom précis et descriptif de ce que tu vois sur la photo (ex: 'Smartphone Samsung noir à écran fissuré', 'Paire de baskets Nike blanches tachées de boue', 'Bureau encombré avec tasse de thé tiède')",
  "targetPersonProfile": "Profil psychologique et sociologique impitoyable déduit de la personne qui possède ou utilise cet élément (âge estimé, métier probable, niveau de stress, état d'esprit récent)",
  "verdict": "La conclusion choc de Sherlock en une phrase cinglante et personnalisée",
  "floatingKeywords": ["4 à 6 MOTS-CLÉS MAJUSCULES COURTS style série Sherlock : ex: GAUCHER, SOMMEIL PERTURBÉ, DÉPLACEMENT RÉCENT, MENSONGE"],
  "clues": [
    {
      "id": "clue-1",
      "label": "Description d'un micro-détail PHYSIQUEMENT OBSERVABLE à cet endroit précis sur la photo",
      "deduction": "La déduction logique et psychologique que Sherlock en tire",
      "x": 45,
      "y": 55,
      "category": "behaviour",
      "categoryLabel": "MICRO-INDICE",
      "confidence": 98
    }
  ],
  "speechMonologue": "Le texte exact que l'utilisateur doit réciter à voix haute à ses amis pour les époustoufler. Sherlock s'exprime à la 1ère personne ('Ne dis rien...', 'Regarde bien...'). Le discours DOIT citer nommément les détails réels visibles sur cette photo avec son arrogance et son génie légendaires."
}
`;

    const imageForMindPalace = displayImageSrc || base64Image;

    // Récupérer la liste des modèles réels supportés par cette clé
    const available = await this.getAvailableModels(key);
    
    // Construire la liste des candidats à tester (en commençant par le modèle en cache s'il est valide)
    const candidatesToTry: string[] = [];
    if (this.cachedModel && available.includes(this.cachedModel)) {
      candidatesToTry.push(this.cachedModel);
    }

    for (const m of available) {
      if (!candidatesToTry.includes(m)) {
        candidatesToTry.push(m);
      }
    }

    const errorsLog: string[] = [];

    for (const modelCandidate of candidatesToTry) {
      try {
        const result = await this.callGenerateContent(modelCandidate, key, prompt, resolvedMime, cleanBase64);
        if (result) {
          this.cachedModel = modelCandidate;
          localStorage.setItem(this.STORAGE_MODEL_KEY, modelCandidate);
          this.isAnalyzing.set(false);
          this.errorMessage.set(null);
          return this.mapParsedToAnalysis(result, imageForMindPalace);
        }
      } catch (err: any) {
        const errMessage = err?.message || String(err);
        errorsLog.push(`${modelCandidate}: ${errMessage}`);
        console.warn(`Modèle ${modelCandidate} non disponible (${errMessage}), tentative avec le suivant...`);
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

  /**
   * Appel direct à generateContent
   */
  private async callGenerateContent(
    modelPath: string,
    key: string,
    prompt: string,
    mimeType: string,
    cleanBase64: string
  ): Promise<any> {
    const formattedModel = modelPath.startsWith('models/') ? modelPath : `models/${modelPath}`;
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/${formattedModel}:generateContent?key=${key}`;

    const body = {
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: mimeType,
                data: cleanBase64
              }
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.6,
        maxOutputTokens: 3000,
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
    } catch (parseErr) {
      console.error('Erreur parsing JSON Gemini brut:', rawText);
      throw new Error('La réponse de Sherlock n\'est pas au format attendu.');
    }
  }

  private mapParsedToAnalysis(parsed: any, base64Image: string): SherlockAnalysis {
    return {
      subject: parsed.subject || 'Élément Sous Examen',
      targetPersonProfile: parsed.targetPersonProfile || 'Sujet sous observation approfondie',
      verdict: parsed.verdict || 'Déduction concluante établie par observation directe.',
      floatingKeywords: (parsed.floatingKeywords || ['OBSERVATION', 'DÉDUCTION', 'LONDRES']).map((k: string) => k.toUpperCase()),
      clues: (parsed.clues || []).map((c: any, index: number) => ({
        id: c.id || `clue-${index + 1}`,
        label: c.label || 'Détail observable',
        deduction: c.deduction || 'Déduction logique.',
        x: Math.max(10, Math.min(90, Number(c.x) || 50)),
        y: Math.max(12, Math.min(88, Number(c.y) || 50)),
        category: c.category || 'behaviour',
        categoryLabel: (c.categoryLabel || 'INDICE').toUpperCase(),
        confidence: Number(c.confidence) || 96
      })),
      speechMonologue: parsed.speechMonologue || 'Ne dis rien. Tout est déjà visible.',
      analyzedAt: new Date(),
      imageSrc: base64Image
    };
  }
}
