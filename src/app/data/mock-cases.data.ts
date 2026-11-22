import { MockCase } from '../models/sherlock.model';

export const MOCK_CASES: MockCase[] = [
  {
    id: 'case-coffee-desk',
    name: 'Bureau & Tasse de Café Abandonnée',
    description: 'Scène de bureau prise en flagrant délit : traces, écriture et agenda',
    thumbnail: 'https://images.unsplash.com/photo-1517842645767-c639042777db?auto=format&fit=crop&w=800&q=80',
    analysis: {
      subject: 'Poste de travail déserté en urgence',
      targetPersonProfile: 'Femme, 28-35 ans, droitière, juriste ou consultante en crise aiguë',
      verdict: 'Départ précipité pour une réunion non planifiée avec dissimulation d\'un appel personnel',
      imageSrc: 'https://images.unsplash.com/photo-1517842645767-c639042777db?auto=format&fit=crop&w=800&q=80',
      analyzedAt: new Date(),
      floatingKeywords: ['GAUCHER ? NON', 'STRESS AIGU', 'CAFÉ DOUBLE', 'DÉPART 11H14', 'APPEL DISCRET', 'BUREAU 402'],
      clues: [
        {
          id: 'clue-1',
          label: 'Trace de rouge à lèvres et anse orientée à gauche',
          deduction: 'Elle est droitière mais buvait de la main gauche pour continuer à taper de la droite.',
          x: 28,
          y: 42,
          category: 'behaviour',
          categoryLabel: 'HABITUDE MOTRICE',
          confidence: 97
        },
        {
          id: 'clue-2',
          label: 'Carnet griffonné avec pression d\'encre anormale',
          deduction: 'Papier presque déchiré par la plume : colère contenue et tension artérielle élevée.',
          x: 68,
          y: 35,
          category: 'secrets',
          categoryLabel: 'ÉTAT ÉMOTIONNEL',
          confidence: 94
        },
        {
          id: 'clue-3',
          label: 'Écran de veille verrouillé sans éteindre la lampe',
          deduction: 'Raccroché en moins de 4 secondes suite à une convocation hiérarchique imprévue.',
          x: 75,
          y: 72,
          category: 'timeline',
          categoryLabel: 'CHRONOLOGIE',
          confidence: 99
        },
        {
          id: 'clue-4',
          label: 'Billet de train plié en quatre sous le clavier',
          deduction: 'Trajet Paris-Lyon discret prévu vendredi soir. Son conjoint ne le sait pas.',
          x: 42,
          y: 80,
          category: 'origin',
          categoryLabel: 'DOUBLE VIE',
          confidence: 91
        }
      ],
      speechMonologue: `Ne dis rien. Observe ce bureau trois secondes. L'anse de la tasse est à gauche, pourtant son bloc-notes est à droite : elle est droitière, mais s'est forcée à boire de la main gauche pour taper sans perdre une seconde. Le café est encore tiède, mais le carnet porte une trace de bille tellement enfoncée qu'elle a perforé deux pages : panique et colère. Et ce pli de papier sous l'angle du clavier ? Un aller simple réservé sous un autre nom. Elle ne reviendra pas cet après-midi.`
    }
  },
  {
    id: 'case-vintage-watch',
    name: 'Montre de Gousset Restaurée',
    description: 'Accessoire porté au quotidien avec micro-gravures et traces d\'usure',
    thumbnail: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=800&q=80',
    analysis: {
      subject: 'Montre de famille en or 18k transmise de père en fils',
      targetPersonProfile: 'Homme, 40-50 ans, issu d\'une lignée bourgeoise mais en déclin financier récent',
      verdict: 'Orgueil aristocratique, mise en gage temporaire à plusieurs reprises',
      imageSrc: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=800&q=80',
      analyzedAt: new Date(),
      floatingKeywords: ['HÉRITAGE', 'PRÊTEUR SUR GAGES', 'REVERS DE FORTUNE', 'NÉGLIGENCE', 'ALCOOL'],
      clues: [
        {
          id: 'clue-w-1',
          label: 'Chiffres microscopiques gravés à la pointe dans le clapet',
          deduction: 'Numéros d\'enregistrement d\'un mont-de-piété londonien. Mise en gage au moins 4 fois.',
          x: 52,
          y: 38,
          category: 'secrets',
          categoryLabel: 'FINANCES CACHÉES',
          confidence: 98
        },
        {
          id: 'clue-w-2',
          label: 'Rayures autour du trou de remontoir',
          deduction: 'Clé insérée de travers dans l\'obscurité ou sous l\'emprise de l\'alcool tard la nuit.',
          x: 45,
          y: 65,
          category: 'behaviour',
          categoryLabel: 'HABITUDE NOCTURNE',
          confidence: 93
        },
        {
          id: 'clue-w-3',
          label: 'Maillon de chaîne en acier de substitution',
          deduction: 'La chaîne d\'origine en or a été vendue pièce par pièce pour régler des dettes immédiates.',
          x: 72,
          y: 78,
          category: 'profession',
          categoryLabel: 'STATUT RÉEL',
          confidence: 96
        }
      ],
      speechMonologue: `Une montre remarquable, n'est-ce pas ? Vous pensez qu'il est fortuné parce qu'il l'exhibe avec fierté. Erreur élémentaire. Regardez à l'intérieur du clapet : ces quatre numéros minuscules gravés au scalpel sont les codes de quittance d'un prêteur sur gage. Il a dû la mettre au clou quatre fois pour payer son loyer. Et admirez les griffures erratiques autour du remontoir : un homme qui rentre ivre tous les soirs et peine à trouver le trou de la clé. La fierté d'un lord, le portefeuille d'un gueux.`
    }
  },
  {
    id: 'case-running-shoes',
    name: 'Chaussures de Sport avec Boue et Semelle Biseautée',
    description: 'Une paire de sneakers posée sur le paillasson après une sortie matinale',
    thumbnail: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80',
    analysis: {
      subject: 'Chaussures de running haute performance',
      targetPersonProfile: 'Homme, 30 ans, sédentaire voulant prouver sa jeunesse, coureur occasionnel impulsif',
      verdict: 'Entraînement forcé suite à une rupture amoureuse ou un diagnostic médical alarmant',
      imageSrc: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80',
      analyzedAt: new Date(),
      floatingKeywords: ['ÉGO BLESSÉ', 'PARC DES BUTTES-CHAUMONT', 'TENDINITE', 'RUPTURE RÉCENTE', 'SURCOMPENSATION'],
      clues: [
        {
          id: 'clue-s-1',
          label: 'Semelle extérieure gauche usée sur la tranche interne',
          deduction: 'Pronation compensatoire : il court avec une douleur cachée au genou droit depuis 3 jours.',
          x: 35,
          y: 62,
          category: 'behaviour',
          categoryLabel: 'BIOMÉCANIQUE',
          confidence: 95
        },
        {
          id: 'clue-s-2',
          label: 'Argile rouge incrustée entre les crampons',
          deduction: 'Ne vient pas du bitume urbain, mais du sentier escarpé du parc boisé, évité par les vrais marathoniens.',
          x: 65,
          y: 48,
          category: 'origin',
          categoryLabel: 'LOCALISATION',
          confidence: 97
        },
        {
          id: 'clue-s-3',
          label: 'Lacets serrés au maximum avec double nœud lâche',
          deduction: 'Achetées sur un coup de tête après une rupture : pointure une demi-taille trop grande.',
          x: 48,
          y: 28,
          category: 'secrets',
          categoryLabel: 'PSYCHOLOGIE',
          confidence: 91
        }
      ],
      speechMonologue: `Tu t'es remis à la course samedi matin, n'est-ce pas ? Inutile de hocher la tête, tes chaussures parlent pour toi. Cette terre ocre ne se trouve qu'au sentier nord du parc, là où le dénivelé est le plus violent. Tu as voulu impressionner quelqu'un. Sauf que tes lacets sont serrés à l'extrême parce que la paire est trop grande, achetée à la va-vite sans essayer. Et ton appui intérieur gauche ? Tu boites déjà pour masquer une tendinite à droite. L'égo est un bien mauvais coach sportif.`
    }
  }
];
