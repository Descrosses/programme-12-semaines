/**
 * Le questionnaire « Votre plan alimentaire », transcrit mot pour mot.
 *
 * Source : https://plan-alimentaire-p.netlify.app (Guillaume), figée dans
 * `docs/questionnaires/plan-alimentaire/` (`app.js` et `foods.js`, copies
 * exactes du 23 novembre). C'est elle qui fait foi : une correction se fait
 * d'abord là-bas. `questionnairePlanAlimentaire.test.ts` relit ces deux
 * fichiers et compare chaque libellé, chaque option, chaque borne, chaque
 * aliment — et fait tourner le code d'origine pour vérifier que l'appli
 * produit le MÊME résumé et les MÊMES erreurs.
 *
 * Un seul écart, voulu (décision du 23 novembre) : les cartes d'aliments ne
 * montrent AUCUNE valeur nutritionnelle. Celles du site sont « non vérifiées »
 * (son propre en-tête) ; celles du catalogue de l'appli, qui font foi dans
 * « Mon plan », comptent cinq aliments à l'unité, ce qui contredirait la
 * phrase « Valeurs moyennes pour 100 g ». Cette phrase-là est donc la seule
 * qui ne soit pas reprise (`CONSIGNE_ALIMENTS`).
 *
 * Aucune logique ici : elle vit dans `engine/questionnairePlanAlimentaire.ts`.
 */

export type CleProfil =
  | 'sex'
  | 'age'
  | 'height'
  | 'weight'
  | 'waist'
  | 'job'
  | 'steps'
  | 'sessions'
  | 'duration'
  | 'sportType'
  | 'goal'
  | 'pace'
  | 'trend'
  | 'weight4w'
  | 'pregnant'
  | 'medical'
  | 'eating'
  | 'allergies';

export const CLES_PROFIL: readonly CleProfil[] = [
  'sex',
  'age',
  'height',
  'weight',
  'waist',
  'job',
  'steps',
  'sessions',
  'duration',
  'sportType',
  'goal',
  'pace',
  'trend',
  'weight4w',
  'pregnant',
  'medical',
  'eating',
  'allergies',
];

export type CleChoix =
  | 'sex'
  | 'job'
  | 'steps'
  | 'sessions'
  | 'duration'
  | 'sportType'
  | 'goal'
  | 'pace'
  | 'trend'
  | 'pregnant'
  | 'medical'
  | 'eating';
export type CleNombre = 'age' | 'height' | 'weight' | 'waist' | 'weight4w';

export const ETAPES_PROFIL = ['p0', 'p1', 'p2', 'p3'] as const;
export type EtapeProfil = (typeof ETAPES_PROFIL)[number];

export const TITRES_PROFIL: Readonly<Record<EtapeProfil, string>> = {
  p0: 'Vous',
  p1: 'Votre activité',
  p2: 'Votre objectif',
  p3: 'Sécurité',
};

export const CHAPEAUX_PROFIL: Readonly<Record<EtapeProfil, string>> = {
  p0: "Ces informations servent uniquement à estimer votre dépense d'énergie.",
  p1: 'Votre activité de tous les jours compte autant que le sport.',
  p2: 'Le plus utile pour nous : savoir si votre poids bouge en ce moment.',
  p3: 'Quelques questions pour votre sécurité. Vos réponses restent entre vous et Guillaume.',
};

/** Les réponses proposées : [valeur enregistrée, libellé affiché]. */
export const OPTIONS: Readonly<Record<CleChoix, readonly (readonly [string, string])[]>> = {
  sex: [
    ['femme', 'Femme'],
    ['homme', 'Homme'],
  ],
  job: [
    ['assis', 'Assis la plupart du temps'],
    ['debout', 'Debout, peu de port de charges'],
    ['physique', 'Physique (port de charges, déplacements)'],
  ],
  steps: [
    ['<5000', 'Moins de 5 000'],
    ['5000-8000', '5 000 à 8 000'],
    ['8000-12000', '8 000 à 12 000'],
    ['>12000', 'Plus de 12 000'],
    ['nsp', 'Je ne sais pas'],
  ],
  sessions: [
    ['0', '0'],
    ['1', '1'],
    ['2', '2'],
    ['3', '3'],
    ['4', '4'],
    ['5', '5'],
    ['6+', '6 ou plus'],
  ],
  duration: [
    ['<45', 'Moins de 45 min'],
    ['45-75', '45 à 75 min'],
    ['>75', 'Plus de 75 min'],
  ],
  sportType: [
    ['muscu', 'Musculation'],
    ['cardio', 'Cardio (course, vélo…)'],
    ['collectif', 'Sport collectif'],
    ['autre', 'Autre'],
  ],
  goal: [
    ['perte', 'Perdre du poids'],
    ['maintien', 'Maintenir mon poids'],
    ['prise', 'Prendre du poids (muscle)'],
  ],
  pace: [
    ['progressif', 'Progressif'],
    ['modere', 'Modéré'],
    ['rapide', 'Le plus vite possible'],
  ],
  trend: [
    ['stable', 'Stable'],
    ['baisse', 'En baisse'],
    ['hausse', 'En hausse'],
    ['nsp', 'Je ne sais pas'],
  ],
  pregnant: [
    ['non', 'Non'],
    ['oui', 'Oui'],
  ],
  medical: [
    ['non', 'Non'],
    ['oui', 'Oui'],
  ],
  eating: [
    ['non', 'Non'],
    ['oui', 'Oui'],
    ['oral', 'Je préfère en parler de vive voix'],
  ],
};

/** Bornes de saisie : détection de fautes de frappe seulement, pas des critères de santé. */
export const NOMBRES: Readonly<
  Record<CleNombre, { label: string; unit: string; min: number; max: number; int?: boolean }>
> = {
  age: { label: 'Âge', unit: 'ans', min: 18, max: 99, int: true },
  height: { label: 'Taille', unit: 'cm', min: 130, max: 220, int: true },
  weight: { label: 'Poids', unit: 'kg', min: 35, max: 250 },
  waist: { label: 'Tour de taille', unit: 'cm', min: 50, max: 180 },
  weight4w: { label: 'Poids il y a environ 4 semaines', unit: 'kg', min: 35, max: 250 },
};

/** Le titre et l'aide de chaque question à choix, et l'aide des nombres. */
export const QUESTIONS: Readonly<
  Record<CleChoix | 'allergies', { titre: string; aide?: string; multi?: boolean }>
> = {
  sex: { titre: 'Sexe', aide: 'Utilisé seulement dans le calcul de la dépense au repos.' },
  job: { titre: 'Votre travail' },
  steps: {
    titre: 'Pas par jour en moyenne',
    aide: 'Si vous avez une montre ou un téléphone qui compte vos pas, regardez la moyenne de la semaine.',
  },
  sessions: { titre: 'Séances de sport par semaine' },
  duration: { titre: "Durée moyenne d'une séance" },
  sportType: { titre: 'Type de sport', aide: 'Plusieurs réponses possibles.', multi: true },
  goal: { titre: 'Votre objectif' },
  pace: { titre: 'À quel rythme ?' },
  trend: { titre: 'Votre poids des 4 dernières semaines' },
  pregnant: {
    titre: 'Êtes-vous enceinte, allaitez-vous ou avez-vous accouché récemment ?',
  },
  medical: {
    titre: 'Avez-vous une maladie ou un traitement qui influence votre alimentation ?',
    aide: 'Par exemple diabète, thyroïde, maladie rénale ou digestive.',
  },
  eating: {
    titre: 'Avez-vous déjà eu une relation compliquée avec la nourriture ?',
    aide: 'Régimes très restrictifs, crises de perte de contrôle, troubles alimentaires.',
  },
  allergies: { titre: 'Allergies ou intolérances alimentaires' },
};

export const AIDES_NOMBRES: Readonly<Partial<Record<CleNombre, string>>> = {
  weight: 'Idéalement la moyenne de 3 matins, à jeun, après être allé aux toilettes.',
  waist: 'Mesuré au niveau du nombril, sans serrer.',
  weight4w: 'Si vous le connaissez.',
};

export const EXEMPLE_ALLERGIES = 'Ex. lactose, arachide';

export const NOTE_SECURITE =
  'Merci pour votre réponse. Guillaume en parlera avec vous avant toute proposition. Vous pouvez continuer le questionnaire.';

export const TEXTES = {
  introTitre: 'Votre plan alimentaire',
  intro1:
    "D'abord quelques questions sur vous et votre activité (environ 2 minutes). Elles servent à estimer vos besoins.",
  intro2:
    'Ensuite, sélectionnez les aliments que vous aimez manger. Nous utiliserons uniquement ces aliments pour construire vos futurs menus.',
  commencer: 'Commencer',
  facultatif: ' (facultatif)',
  precedent: 'Précédent',
  continuer: 'Continuer',
  voirRecap: 'Voir le récapitulatif',
  toutSelectionner: 'Tout sélectionner',
  toutDeselectionner: 'Tout désélectionner',
  reinitialiser: 'Réinitialiser',
  ajouterOuvrir: '+ Ajouter un aliment',
  ajouterPlaceholder: "Nom de l'aliment",
  ajouter: 'Ajouter',
  ajouterNote:
    "Aucune valeur nutritionnelle n'est ajoutée automatiquement : elles seront à renseigner.",
  recapTitre: 'Récapitulatif',
  recapChapeau: 'Vérifiez vos réponses. Vous pouvez les modifier à tout moment.',
  votreProfil: 'Votre profil',
  modifier: 'Modifier',
  aucun: 'aucun',
  aucunAliment: 'Aucun aliment sélectionné.',
  valider: 'Valider mes réponses',
  recommencer: 'Recommencer',
  recommencerConfirmer: 'Effacer toutes vos sélections et recommencer ?',
  finTitre: 'Merci, vos réponses sont notées',
  fin2: 'Relisez le résumé. En appuyant sur WhatsApp ou e-mail, il est copié automatiquement : il vous reste à le coller dans le message (appui long, puis « Coller ») et à envoyer.',
  envoyerWhatsapp: 'Envoyer par WhatsApp',
  envoyerEmail: 'Envoyer par e-mail',
  copierSeulement: 'Copier le résumé seulement',
  copie: 'Résumé copié. Collez-le dans le message, puis envoyez.',
  copieManuelle: 'Sélectionnez le texte et copiez-le à la main.',
  modifierReponses: 'Modifier mes réponses',
} as const;

/** « 12 aliments retenus. Ils serviront de base… » */
export function phraseRetenus(n: number): string {
  return `${n > 1 ? `${n} aliments retenus` : `${n} aliment retenu`}. Ils serviront de base à vos futurs menus, avec des quantités adaptées à votre profil.`;
}

/** Les messages d'erreur de saisie. */
export const ERREURS = {
  choix: 'Choisissez une réponse.',
  valeur: 'Indiquez une valeur.',
  adultes: 'Ce questionnaire est réservé aux adultes (18 ans et plus).',
} as const;

/** La consigne de l'écran des aliments — sa première phrase seulement (voir l'en-tête). */
export const CONSIGNE_ALIMENTS = 'Touchez les aliments que vous aimez.';

export interface CategorieAliments {
  id: 'glucides' | 'fruits' | 'proteines' | 'lipides' | 'legumes';
  label: string;
}

export const CATEGORIES: readonly CategorieAliments[] = [
  { id: 'glucides', label: 'Glucides' },
  { id: 'fruits', label: 'Fruits' },
  { id: 'proteines', label: 'Protéines' },
  { id: 'lipides', label: 'Lipides' },
  { id: 'legumes', label: 'Légumes' },
];

export interface AlimentQuestionnaire {
  id: string;
  name: string;
  category: CategorieAliments['id'];
}

/** Les 43 aliments, dans l'ordre et sous le nom du questionnaire. */
export const ALIMENTS: readonly AlimentQuestionnaire[] = [
  { id: 'riz', name: 'Riz', category: 'glucides' },
  { id: 'pates', name: 'Pâtes', category: 'glucides' },
  { id: 'pomme-de-terre', name: 'Pommes de terre', category: 'glucides' },
  { id: 'patate', name: 'Patate douce', category: 'glucides' },
  { id: 'flocons', name: "Flocons d'avoine", category: 'glucides' },
  { id: 'pain', name: 'Pain complet', category: 'glucides' },
  { id: 'semoule', name: 'Semoule', category: 'glucides' },
  { id: 'boulgour', name: 'Boulgour', category: 'glucides' },
  { id: 'quinoa', name: 'Quinoa', category: 'glucides' },
  { id: 'banane', name: 'Banane', category: 'fruits' },
  { id: 'pomme', name: 'Pomme', category: 'fruits' },
  { id: 'fruits-rouges', name: 'Fruits rouges', category: 'fruits' },
  { id: 'orange', name: 'Orange', category: 'fruits' },
  { id: 'kiwi', name: 'Kiwi', category: 'fruits' },
  { id: 'poulet', name: 'Poulet', category: 'proteines' },
  { id: 'dinde', name: 'Dinde', category: 'proteines' },
  { id: 'boeuf', name: 'Bœuf maigre', category: 'proteines' },
  { id: 'oeufs', name: 'Œufs', category: 'proteines' },
  { id: 'saumon', name: 'Saumon', category: 'proteines' },
  { id: 'thon', name: 'Thon', category: 'proteines' },
  { id: 'poisson-blanc', name: 'Poisson blanc', category: 'proteines' },
  { id: 'lentilles', name: 'Lentilles', category: 'proteines' },
  { id: 'haricots-rouges', name: 'Haricots rouges', category: 'proteines' },
  { id: 'skyr', name: 'Skyr', category: 'proteines' },
  { id: 'fromage-blanc', name: 'Fromage blanc', category: 'proteines' },
  { id: 'whey', name: 'Protéines en poudre (whey)', category: 'proteines' },
  { id: 'amandes', name: 'Amandes', category: 'lipides' },
  { id: 'noix', name: 'Noix', category: 'lipides' },
  { id: 'chocolat-noir', name: 'Chocolat noir ≥ 70 %', category: 'lipides' },
  { id: 'cacahuete', name: 'Beurre de cacahuète', category: 'lipides' },
  { id: 'huile', name: "Huile d'olive", category: 'lipides' },
  { id: 'avocat', name: 'Avocat', category: 'lipides' },
  { id: 'brocolis', name: 'Brocolis', category: 'legumes' },
  { id: 'haricots-verts', name: 'Haricots verts', category: 'legumes' },
  { id: 'courgettes', name: 'Courgettes', category: 'legumes' },
  { id: 'concombre', name: 'Concombre', category: 'legumes' },
  { id: 'poivrons', name: 'Poivrons', category: 'legumes' },
  { id: 'epinards', name: 'Épinards', category: 'legumes' },
  { id: 'carottes', name: 'Carottes', category: 'legumes' },
  { id: 'tomates', name: 'Tomates', category: 'legumes' },
  { id: 'champignons', name: 'Champignons', category: 'legumes' },
  { id: 'petits-pois', name: 'Petits pois', category: 'legumes' },
  { id: 'salade', name: 'Salade verte', category: 'legumes' },
];

/** À qui le résumé s'envoie : les coordonnées écrites dans le questionnaire. */
export const ENVOI = {
  whatsapp: '33699906737',
  email: 'g.descrosses@hotmail.fr',
  sujet: 'Mon plan alimentaire : profil et aliments',
  message:
    "Bonjour, voici mon profil et ma sélection d'aliments. Je colle le résumé ci-dessous :\n\n",
} as const;
