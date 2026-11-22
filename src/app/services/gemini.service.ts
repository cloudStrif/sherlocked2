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
Tu disposes d'une mémoire photographique universelle et encyclopédique.

══════════════════════════════════════════════════════════════════════
EXIGENCE FONDAMENTALE : IDENTIFIER AVEC PRÉCISION CE QUE MONTRE L'IMAGE
══════════════════════════════════════════════════════════════════════
L'utilisateur te montre une photo et veut SAVOIR EXACTEMENT CE QUE C'EST.
Sherlock ne fait pas de suppositions vagues comme un simple humain. Il sait identifier ce que l'œil humain ordinaire ne voit pas ou ne connaît pas :

1. SI C'EST UNE COURSE SPORTIVE / UN MARATHONIEN :
   - Indique la COURSE EXACTE (ex: "Marathon de Paris 2024", "Marathon de Berlin 2022", "Jeux Olympiques de Paris 2024").
   - Identifie la DATE EXACTE ou l'année grâce aux repères visuels (couleur et charte graphique du dossard, sponsors sur les bannières, modèle de chaussures carbone, météo).
   - Identifie le LIEU PRÉCIS (monument visible en arrière-plan, kilomètre du tracé, quai, avenue).
   - Identifie l'ATHLÈTE s'il s'agit d'un champion, ou le sas/catégorie et dossard si c'est un amateur.
   - Détaille l'équipement pointu (chaussures exactes comme Nike Alphafly NEXT% 2, dossard #...).

2. SI C'EST UNE CÉLÉBRITÉ / PERSONNALITÉ :
   - Nom complet, nationalité, profession exacte.
   - Événement précis où la photo a été prise (nom du festival, gala, avant-première, match, année exacte).
   - Vêtements portés, marque de haute couture ou détails distinctifs.

3. SI C'EST UN LIEU OU UN MONUMENT :
   - Nom officiel exact, ville, pays, quartier ou coordonnées.
   - Détails historiques ou architecturaux méconnus.

4. SI C'EST UN OBJET / VÉHICULE / MONTRE / APPAREIL :
   - Marque, modèle exact, référence constructeur ou millésime précis.
   - Détails techniques pointus que le grand public ignore.

5. CE QUE L'ŒIL HUMAIN NE VOIT PAS ("unseenDetails") :
   - Cite 3 à 5 faits concrets et invisibles pour un non-initié, directement prouvés par l'image (logos secondaires, typographie de dossard, reflets, asymétries de couture, usure, horodatage solaire).

6. DÉDUCTION COMPLÉMENTAIRE (OPTIONNELLE EN FIN) :
   - Après avoir identifié ce que c'est, ajoute une courte déduction percutante sur la situation ou le profil.

Fournis STRICTEMENT un JSON valide sans texte avant ni après, respectant cette structure exacte :
{
  "subject": "Nom précis et complet (ex: 'Eliud Kipchoge au Marathon de Berlin 2022', 'Zendaya au Festival de Venise 2023', 'Rolex Submariner Date Réf. 126610LN')",
  "identification": {
    "mainSubject": "Identification principale claire et sans ambiguïté",
    "category": "sports|celebrity|event|place|object|animal|artwork|vehicle|food|nature|other",
    "categoryLabel": "COURSE & ATHLÉTISME|CÉLÉBRITÉ|ÉVÉNEMENT|LIEU HISTORIQUE|OBJET RARE|VÉHICULE|ŒUVRE|AUTRE",
    "eventName": "Nom précis de l'événement s'il y a lieu (ex: '48e Marathon de Berlin', 'Grand Prix de Monaco 2023')",
    "dateOrPeriod": "Date exacte ou période temporelle identifiable (ex: '25 septembre 2022', 'Édition Avril 2024')",
    "location": "Lieu géographique exact identifiable sur la photo",
    "facts": [
      {"label": "Événement / Sujet", "value": "Nom précis", "icon": "🏆"},
      {"label": "Date & Période", "value": "Date ou période précise", "icon": "📅"},
      {"label": "Lieu précis", "value": "Localisation géographique détaillée", "icon": "📍"},
      {"label": "Spécificité technique", "value": "Fait pointu d'expert", "icon": "🔬"},
      {"label": "Équipement / Référence", "value": "Marque, modèle ou numéro officiel", "icon": "🏷️"}
    ],
    "unseenDetails": [
      "Détail technique ou historique invisible pour le commun des mortels 1",
      "Détail technique ou historique invisible pour le commun des mortels 2",
      "Détail technique ou historique invisible pour le commun des mortels 3"
    ],
    "summary": "Résumé encyclopédique de Sherlock expliquant ce qu'est l'image avec une précision chirurgicale, révélant des informations factuelles fascinantes que l'utilisateur ne connaissait pas.",
    "deductionNote": "Déduction finale concise de Sherlock découlant de l'identification."
  },
  "targetPersonProfile": "Profil succinct du sujet ou contexte humain.",
  "verdict": "Verdict de Sherlock : identification nette et sans appel.",
  "floatingKeywords": ["4 À 6 MOTS-CLÉS MAJUSCULES EN RAPPORT DIRECT AVEC L'IDENTIFICATION ET LES DÉTAILS"],
  "clues": [
    {
      "id": "clue-1",
      "label": "Détail visuel observable servant de preuve",
      "deduction": "Ce que ce détail prouve de façon incontestable",
      "x": 48,
      "y": 42,
      "category": "identification",
      "categoryLabel": "PREUVE IDENTITÉ",
      "confidence": 98
    }
  ],
  "speechMonologue": "Le texte à réciter à l'oral. Sherlock commence par IDENTIFIER immédiatement ce que c'est ('Vous croyez regarder [généralité] ? Ne soyez pas ridicule. C'est [Nom exact, événement, date]...'), cite les détails invisibles qui le prouvent, et conclut avec une déduction d'expert."
}

RÈGLES IMPORTANTES :
- Priorité à la PRÉCISION et au SAVOIR FACTUEL.
- 🚨 ANTI-HALLUCINATION : Si tu n'es PAS CERTAIN à 100% d'une information (nom, date, événement), utilise "Probablement", "Vraisemblablement", ou "Estimé à" dans le champ value des facts. Ne JAMAIS inventer un nom propre ou une date si tu ne la vois pas clairement sur l'image.
- Si la photo est trop floue, générique ou sans signe distinctif clair, dis-le honnêtement dans summary ("L'image ne contient pas assez d'éléments distinctifs pour identifier précisément...") plutôt que d'inventer.
- Les PREUVES VISUELLES doivent être réelles et observables : cite uniquement ce que l'image montre vraiment.
- confidence dans les clues doit refléter la certitude réelle (jamais 99% si ce n'est pas évident).
- 3 à 5 facts concrets dans identification.facts.
- 3 à 5 unseenDetails concrets prouvés par l'image.
- 3 à 6 clues répartis sur l'image avec coordonnées (x entre 10 et 90, y entre 12 et 88).
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
