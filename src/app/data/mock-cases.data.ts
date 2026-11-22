import { MockCase } from '../models/sherlock.model';

export const MOCK_CASES: MockCase[] = [
  {
    id: 'case-marathon-berlin',
    name: 'Marathonien & Course Mythique',
    description: 'Une photo de coureur : Sherlock identifie la course exacte, l\'athlète, la date et le chrono',
    thumbnail: 'https://images.unsplash.com/photo-1530549387789-4c1017266635?auto=format&fit=crop&w=800&q=80',
    analysis: {
      subject: 'Eliud Kipchoge pulvérisant le Record du Monde au Marathon de Berlin',
      identification: {
        mainSubject: 'Eliud Kipchoge — Marathon de Berlin 2022',
        category: 'sports',
        categoryLabel: 'ATHLÉTISME DE LÉGENDE',
        eventName: '48e BMW Berlin-Marathon (World Marathon Major)',
        dateOrPeriod: 'Dimanche 25 septembre 2022 (Matinée, départ 09h15)',
        location: 'Strasse des 17. Juni / Porte de Brandebourg, Berlin (Allemagne)',
        facts: [
          { label: 'Athlète & Nationalité', value: 'Eliud Kipchoge (Kenya) — Dossard #1', icon: '🏃' },
          { label: 'Événement Officiel', value: '48e BMW Berlin Marathon 2022', icon: '🏆' },
          { label: 'Date & Chrono Historique', value: '25/09/2022 — 2h 01min 09s (Record du Monde)', icon: '⏱️' },
          { label: 'Point de Passage', value: 'Km 41,5 juste avant l\'arche de Brandebourg', icon: '📍' },
          { label: 'Chaussures & Équipement', value: 'Nike Air Zoom Alphafly NEXT% 2 (Coloris exclusif prototype)', icon: '👟' }
        ],
        unseenDetails: [
          'Le dossard #1 porte la typographie officielle Abbott World Marathon Majors de septembre 2022.',
          'La banderole de sponsor BMW violette et blanche en retrait flou n\'a été utilisée sous cette charte qu\'en 2022.',
          'La semelle intermédiaire compensée à double coussin d\'air Zoom Pod confirme le modèle Alphafly NEXT% 2 homologué.',
          'L\'angle des ombres projetées sur le pavé berlinois correspond exactement à 11h14, heure de son passage victorieux.'
        ],
        summary: 'Il s\'agit d\'Eliud Kipchoge lors de son triomphe au Marathon de Berlin le 25 septembre 2022, où il a abaissé le record mondial à 2h01m09s. Berlin est le parcours le plus plat et le plus rapide du monde. L\'asphalte était à 14°C, humidité de 78%, des conditions climatiques idéales immortalisées ici dans les ultimes hectomètres.',
        deductionNote: 'Sa foulée reste parfaitement symétrique à 182 pas par minute malgré 41 km d\'effort : aucune dette lactique apparente, hydratation millimétrée au bidon 35.'
      },
      targetPersonProfile: 'Double champion olympique kenyan, cadence biomécanique inhumaine',
      verdict: 'Record du monde historique de Berlin 2022 identifié sans le moindre doute.',
      imageSrc: 'https://images.unsplash.com/photo-1530549387789-4c1017266635?auto=format&fit=crop&w=800&q=80',
      analyzedAt: new Date(),
      floatingKeywords: ['BERLIN 2022', 'KIPCHOGE', '2:01:09', 'DOSSARD #1', 'ALPHAFLY 2', 'PORTE BRANDEBOURG'],
      clues: [
        {
          id: 'clue-m-1',
          label: 'Dossard #1 et bandeau Abbott World Marathon Majors',
          deduction: 'Réservé au champion tenant du titre lors de l\'édition officielle 2022.',
          x: 48,
          y: 42,
          category: 'identification',
          categoryLabel: 'PREUVE DOSSARD',
          confidence: 99
        },
        {
          id: 'clue-m-2',
          label: 'Arche de Brandebourg et barrières BMW',
          deduction: 'Portion terminale de la Strasse des 17. Juni à Berlin, 600m avant la ligne finale.',
          x: 75,
          y: 22,
          category: 'origin',
          categoryLabel: 'GÉOLOCALISATION',
          confidence: 98
        },
        {
          id: 'clue-m-3',
          label: 'Nike Alphafly NEXT% 2 avec pods Zoom Air visibles',
          deduction: 'Modèle prototype d\'attaque médio-pied conçu sur-mesure pour sa tentative de record.',
          x: 35,
          y: 78,
          category: 'profession',
          categoryLabel: 'ÉQUIPEMENT POINTE',
          confidence: 97
        }
      ],
      speechMonologue: `Vous pensez voir un simple marathonien qui transpire ? Quel manque d'observation. Ce n'est pas n'importe quelle course : c'est le Marathon de Berlin, le 25 septembre 2022 très exactement. Regardez la bannière mauve BMW floutée en arrière-plan et la typographie blanche du dossard numéro un : c'est Eliud Kipchoge. Et cette photo est prise à 11h14, au kilomètre 41,5, à quelques enjambées de la Porte de Brandebourg. À ce moment précis, il est en train de pulvériser le record du monde en deux heures, une minute et neuf secondes. Tout était écrit dans le bitume.`
    }
  },
  {
    id: 'case-coffee-desk',
    name: 'Scène de Bureau & Tasse Abandonnée',
    description: 'Poste de travail déserté en urgence : Sherlock identifie l\'heure, les habitudes et le mobile',
    thumbnail: 'https://images.unsplash.com/photo-1517842645767-c639042777db?auto=format&fit=crop&w=800&q=80',
    analysis: {
      subject: 'Poste de travail d\'un cabinet de conseil parisien quitté en catastrophe',
      identification: {
        mainSubject: 'Bureau de travail professionnel contemporain',
        category: 'object',
        categoryLabel: 'ENVIRONNEMENT DE TRAVAIL',
        eventName: 'Départ impromptu en cours de matinée',
        dateOrPeriod: 'Mardi 11h14 (éclairage néon de bureau)',
        location: 'Immeuble tertiaire d\'affaires, La Défense ou QCA Paris',
        facts: [
          { label: 'Type de Poste', value: 'Open space de cabinet de conseil / audit', icon: '🏢' },
          { label: 'Objets Clés', value: 'Carnet Moleskine, stylo bille Parker, tasse céramique', icon: '📝' },
          { label: 'Horodatage Déduit', value: 'Entre 11h05 et 11h20 (café encore chaud)', icon: '⏰' },
          { label: 'Indice Caché', value: 'Billet de train SNCF Paris-Lyon dissimulé', icon: '🎫' }
        ],
        unseenDetails: [
          'Le niveau d\'évaporation et la condensation sur le bord de la tasse indiquent que le café a été versé il y a moins de 12 minutes.',
          'L\'angle d\'inclinaison du stylo montre un lâcher brusque sans replacement dans le plumier.',
          'Le reflet dans l\'écran d\'ordinateur éteint trahit un départ vers la cage d\'escalier de secours.'
        ],
        summary: 'Un poste de travail individuel déserté au beau milieu d\'une tâche de rédaction. La disposition asymétrique des objets personnels indique une interruption imprévue, très probablement un appel téléphonique confidentiel ou une convocation urgente.',
        deductionNote: 'Départ précipité pour une réunion de crise avec dissimulation d\'un trajet personnel pour le week-end.'
      },
      targetPersonProfile: 'Femme, 28-35 ans, droitière, cadre sous pression intense',
      verdict: 'Interruption brutale sur convocation hiérarchique avec double vie en cours.',
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
          label: 'Billet plié en quatre sous le clavier',
          deduction: 'Trajet Paris-Lyon discret prévu vendredi soir. Son entourage pro ne le sait pas.',
          x: 42,
          y: 80,
          category: 'origin',
          categoryLabel: 'DOUBLE VIE',
          confidence: 91
        }
      ],
      speechMonologue: `Ne dis rien. Observe ce bureau trois secondes. L'anse de la tasse est à gauche, pourtant son bloc-notes est à droite : elle est droitière, mais s'est forcée à boire de la main gauche pour taper sans perdre une seconde. Le café a été servi il y a moins de dix minutes, mais le carnet porte une trace de bille tellement enfoncée qu'elle a perforé deux pages : panique et colère. Et ce pli de papier sous l'angle du clavier ? Un aller simple pour Lyon réservé sous un autre nom. Elle ne reviendra pas cet après-midi.`
    }
  },
  {
    id: 'case-vintage-watch',
    name: 'Montre de Gousset Restaurée',
    description: 'Accessoire victorien : Sherlock identifie l\'horloger londonien et l\'histoire secrète',
    thumbnail: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=800&q=80',
    analysis: {
      subject: 'Montre de gousset victorienne en or 18 carats (Ateliers de Clerkenwell)',
      identification: {
        mainSubject: 'Montre de gousset victorienne (Pocket Watch)',
        category: 'object',
        categoryLabel: 'HORLOGERIE ANCIENNE',
        eventName: 'Manufacture artisanale londonienne',
        dateOrPeriod: 'Circa 1885-1892 (Période Victorienne tardive)',
        location: 'Londres, quartier des horlogers de Clerkenwell (Royaume-Uni)',
        facts: [
          { label: 'Manufacture & Poinçon', value: 'Or 18 carats avec poinçon de la Guilde de Londres', icon: '✨' },
          { label: 'Calibre & Échappement', value: 'Mouvement mécanique à remontoir par couronne', icon: '⚙️' },
          { label: 'Origine Historique', value: 'Clerkenwell, Londres (1885)', icon: '🇬🇧' },
          { label: 'Micro-gravures Détectées', value: '4 numéros secrets de prêteur sur gage', icon: '🔍' }
        ],
        unseenDetails: [
          'Les quatre minuscules chiffres gravés à l\'aiguille sous le couvercle intérieur sont des numéros de quittance de mont-de-piété.',
          'Le troisième maillon de la chaîne n\'est pas en or mais en acier doré au nitrate : réparation économique d\'urgence.',
          'Les stries circulaires autour du remontoir indiquent des tremblements répétés lors du remontage nocturne.'
        ],
        summary: 'Une authentique pièce d\'horlogerie victorienne en or massif transmise de génération en génération. L\'analyse matérielle des restaurations révèle les revers de fortune d\'une famille qui a dû gager son trésor à quatre reprises avant de le récupérer.',
        deductionNote: 'Le propriétaire actuel cherche à projeter une image de vieille noblesse prospère tout en masquant un endettement chronique.'
      },
      targetPersonProfile: 'Homme, 40-50 ans, héritier nostalgique masquant sa ruine',
      verdict: 'Montre victorienne authentique ayant servi de caution chez un prêteur sur gages.',
      imageSrc: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=800&q=80',
      analyzedAt: new Date(),
      floatingKeywords: ['HÉRITAGE', 'PRÊTEUR SUR GAGES', 'REVERS DE FORTUNE', 'CLERKENWELL', 'LONDRES 1885'],
      clues: [
        {
          id: 'clue-w-1',
          label: 'Chiffres microscopiques gravés à la pointe dans le clapet',
          deduction: 'Numéros d\'enregistrement d\'un mont-de-piété londonien. Mise en gage 4 fois.',
          x: 52,
          y: 38,
          category: 'secrets',
          categoryLabel: 'FINANCES CACHÉES',
          confidence: 98
        },
        {
          id: 'clue-w-2',
          label: 'Rayures autour du trou de remontoir',
          deduction: 'Remontée dans l\'obscurité avec gestes imprécis sous état d\'ébriété.',
          x: 45,
          y: 65,
          category: 'behaviour',
          categoryLabel: 'HABITUDE NOCTURNE',
          confidence: 93
        }
      ],
      speechMonologue: `Une montre remarquable, n'est-ce pas ? Vous pensez qu'il est fortuné parce qu'il l'exhibe avec fierté. Erreur élémentaire. C'est une pièce londonienne de Clerkenwell, forgée vers 1885. Mais regardez à l'intérieur du clapet : ces quatre numéros minuscules gravés au scalpel sont les codes de quittance d'un prêteur sur gage. Il a dû la mettre au clou quatre fois pour payer son loyer. Et admirez les griffures erratiques autour du remontoir : un homme qui rentre ivre et peine à trouver le cliquet. La fierté d'un lord, le compte en banque d'un mendiant.`
    }
  }
];
