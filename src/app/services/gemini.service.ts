import { Injectable, signal, WritableSignal } from '@angular/core';
import { SherlockAnalysis, SherlockClue, ImageIdentification } from '../models/sherlock.model';

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
Tu es Sherlock Holmes (incarnation moderne BBC avec Benedict Cumberbatch).
Tu disposes d'une mémoire encyclopédique sur les OBJETS, LIEUX, ÉVÉNEMENTS et MARQUES.

══════════════════════════════════════════════════════════════════════
RÈGLE ABSOLUE N°1 : JAMAIS DE RECONNAISSANCE FACIALE
══════════════════════════════════════════════════════════════════════
🚨 Tu es INCAPABLE d'identifier qui est une personne sur une photo. C'est une limite absolue.
Ne dis JAMAIS "c'est [nom d'une célébrité]", "c'est [nom d'un politique]", "c'est un prince", etc.
Si la photo montre un visage humain, TU NE SAIS PAS QUI C'EST. Point.
À la place, Sherlock DÉDUIT : âge estimé, profession probable, humeur, niveau social, habitudes.
C'est ça le génie de Sherlock — pas de la reconnaissance faciale, de la DÉDUCTION comportementale.

══════════════════════════════════════════════════════════════════════
CE QUE SHERLOCK SAIT VRAIMENT IDENTIFIER (sans halluciner) :
══════════════════════════════════════════════════════════════════════

1. OBJETS / PRODUITS : marque visible, modèle, année, référence (ex: Nike Air Max 95, Rolex Submariner 126610LN, iPhone 15 Pro Max)
   → Lis les logos, les textes, les caractéristiques visuelles distinctives réellement visibles sur l'image.

2. LIEUX / MONUMENTS : identifie si un monument ou lieu CONNU est visible (Tour Eiffel, Times Square, Big Ben...)
   → Uniquement si clairement visible dans l'arrière-plan.

3. ÉVÉNEMENTS SPORTIFS avec dossard : lis le texte du dossard, le logo de l'événement, les sponsors sur les banderoles.
   → Si un dossard montre "PARIS MARATHON 2024", dis-le. Si tu ne peux pas lire, ne devine pas.

4. NOURRITURE : identifie le plat, la cuisine d'origine.

5. ANIMAUX : race précise.

6. VÉHICULES : marque + modèle lisible sur l'image.

══════════════════════════════════════════════════════════════════════
POUR UNE PERSONNE ANONYME → MODE DÉDUCTION PURE (style BBC Sherlock)
══════════════════════════════════════════════════════════════════════
Analyse :
- Posture, expression, regard
- Vêtements (marque visible, style, état d'usure, cohérence de la tenue)
- Mains (callositées, manucure, bagues, montre)
- Contexte (où est-elle, que fait-elle)
- Indices comportementaux (tension, confiance, fatigue)
Déduis : âge estimé, profession probable, état émotionnel actuel, habitudes récentes.
NE NOMME JAMAIS la personne. Ne dis pas "il ressemble à X".

══════════════════════════════════════════════════════════════════════
FORMAT DE RÉPONSE JSON STRICT
══════════════════════════════════════════════════════════════════════
Fournis STRICTEMENT un JSON valide sans texte avant ni après :
{
  "subject": "Description précise de ce que montre la photo (ex: 'Homme, ~35 ans, cadre ou ingénieur, jean slim gris et veste Patagonia navy' | 'Nike Air Jordan 1 Retro High OG Chicago 1985' | 'Stade de France vu du terrain')",
  "identification": {
    "mainSubject": "Sujet principal en une phrase courte",
    "category": "person|object|place|event|animal|food|vehicle|artwork|nature|other",
    "categoryLabel": "ANALYSE D'INDIVIDU|IDENTIFICATION PRODUIT|LIEU IDENTIFIÉ|ÉVÉNEMENT SPORTIF|ANIMAL|CUISINE|VÉHICULE|ŒUVRE|NATURE|AUTRE",
    "facts": [
      {"label": "Type", "value": "Ce que c'est précisément", "icon": "🔍"},
      {"label": "Détail clé 1", "value": "Fait observable sur l'image", "icon": "👁️"},
      {"label": "Détail clé 2", "value": "Fait observable sur l'image", "icon": "🔬"},
      {"label": "Contexte", "value": "Situation ou environnement visible", "icon": "📍"}
    ],
    "unseenDetails": [
      "Détail subtil que seul un expert remarquerait (réellement visible sur l'image)",
      "Deuxième détail subtil et observable",
      "Troisième détail subtil et observable"
    ],
    "summary": "Analyse de Sherlock en 3-4 phrases. Pour une personne : déduction comportementale sans nommer. Pour un objet/lieu/événement : informations factuelles précises avec ce qui est visible sur l'image.",
    "deductionNote": "La conclusion la plus percutante de Sherlock."
  },
  "targetPersonProfile": "Pour une personne : profil déduit (âge, métier probable, état émotionnel). Pour un objet : contexte d'utilisation ou propriétaire probable.",
  "verdict": "Verdict Sherlock en une phrase cinglante basée sur les faits OBSERVÉS.",
  "floatingKeywords": ["4 À 6 MOTS-CLÉS MAJUSCULES courts résumant les déductions clés"],
  "clues": [
    {
      "id": "clue-1",
      "label": "Détail visuellement observable et précis",
      "deduction": "Ce que ce détail révèle de façon logique",
      "x": 48,
      "y": 42,
      "category": "behaviour",
      "categoryLabel": "COMPORTEMENT",
      "confidence": 85
    }
  ],
  "speechMonologue": "Le texte que l'utilisateur récite à voix haute. Pour une personne : Sherlock commence par observer sans nommer ('Ne dis rien... Regarde tes mains...') puis enchaîne les déductions comportementales. Pour un objet/lieu : commence par 'Vous croyez voir [généralité] ? Non. C'est précisément [identification détaillée]...' avec les preuves visuelles."
}

RÈGLES ABSOLUES :
🚨 JAMAIS nommer une personne visible sur la photo (ni célébrité supposée, ni titre nobiliaire).
✅ Cite UNIQUEMENT ce qui est RÉELLEMENT VISIBLE sur l'image.
✅ Si incertain : utilise "probablement", "estimé", "vraisemblablement".
✅ confidence dans les clues = certitude réelle (60-85 pour déductions, 90-99 seulement si texte lisible sur l'image).
✅ 3 à 6 clues, 3 à 5 facts, 3 à 5 unseenDetails.
`;

    const imageForMindPalace = displayImageSrc || base64Image;

    // Récupérer la liste des modèles réels supportés par cette clé
    const available = await this.getAvailableModels(key);

    // Priorité aux modèles les plus précis pour la vision (2.0 >> 1.5)
    const PREFERRED_ORDER = [
      'gemini-2.0-flash',
      'gemini-2.5-flash',
      'gemini-2.5-pro',
      'gemini-2.0-pro',
      'gemini-1.5-pro',
      'gemini-1.5-flash',
      'gemini-flash',
    ];

    // Construire la liste des candidats triés par préférence
    const candidatesToTry: string[] = [];
    // Si un modèle est en cache ET c'est un modèle 2.0+, le réutiliser en premier
    if (this.cachedModel && available.includes(this.cachedModel) && this.cachedModel.includes('2.')) {
      candidatesToTry.push(this.cachedModel);
    }
    // Ajouter les modèles disponibles dans l'ordre de préférence
    for (const preferred of PREFERRED_ORDER) {
      const match = available.find(m => m.includes(preferred.replace('gemini-', '')));
      if (match && !candidatesToTry.includes(match)) {
        candidatesToTry.push(match);
      }
    }
    // Fallback : tous les modèles restants
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
        temperature: 0.1,
        maxOutputTokens: 3500,
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
    const defaultIdentification: ImageIdentification = {
      mainSubject: parsed.subject || 'Élément Sous Examen',
      category: 'other',
      categoryLabel: 'IDENTIFICATION',
      eventName: '',
      dateOrPeriod: '',
      location: '',
      facts: [],
      unseenDetails: [],
      summary: 'Analyse complétée par Sherlock Holmes.',
      deductionNote: parsed.verdict || ''
    };

    const identification: ImageIdentification = parsed.identification
      ? {
          mainSubject: parsed.identification.mainSubject || parsed.subject || defaultIdentification.mainSubject,
          category: parsed.identification.category || 'other',
          categoryLabel: (parsed.identification.categoryLabel || 'IDENTIFICATION').toUpperCase(),
          eventName: parsed.identification.eventName || '',
          dateOrPeriod: parsed.identification.dateOrPeriod || '',
          location: parsed.identification.location || '',
          facts: (parsed.identification.facts || []).map((f: any) => ({
            label: f.label || '',
            value: f.value || '',
            icon: f.icon || '📌'
          })),
          unseenDetails: Array.isArray(parsed.identification.unseenDetails)
            ? parsed.identification.unseenDetails
            : [],
          summary: parsed.identification.summary || '',
          deductionNote: parsed.identification.deductionNote || parsed.verdict || ''
        }
      : defaultIdentification;

    return {
      subject: parsed.subject || identification.mainSubject || 'Élément Sous Examen',
      identification,
      targetPersonProfile: parsed.targetPersonProfile || 'Sujet sous observation approfondie',
      verdict: parsed.verdict || identification.deductionNote || 'Identification certifiée par le Palais Mental.',
      floatingKeywords: (parsed.floatingKeywords || ['IDENTIFICATION', 'OBSERVATION', 'DÉDUCTION']).map((k: string) => k.toUpperCase()),
      clues: (parsed.clues || []).map((c: any, index: number) => ({
        id: c.id || `clue-${index + 1}`,
        label: c.label || 'Détail observable',
        deduction: c.deduction || 'Déduction logique.',
        x: Math.max(10, Math.min(90, Number(c.x) || 50)),
        y: Math.max(12, Math.min(88, Number(c.y) || 50)),
        category: c.category || 'identification',
        categoryLabel: (c.categoryLabel || 'INDICE').toUpperCase(),
        confidence: Number(c.confidence) || 96
      })),
      speechMonologue: parsed.speechMonologue || 'Ne dis rien. Tout est déjà visible.',
      analyzedAt: new Date(),
      imageSrc: base64Image
    };
  }
}
