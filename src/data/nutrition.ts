/**
 * Plan alimentaire — transcription de `plan-alimentaire-12-semaines.md`.
 *
 * Même règle que pour le programme d'entraînement : ce fichier ne contient QUE
 * des données recopiées du .md. Aucun calcul, aucune décision. Ce qui décide
 * vit dans `src/engine/nutrition.ts`.
 *
 * Deux paliers et pas plus, c'est le .md qui le pose : « Une périodisation plus
 * fine, séance par séance, ajouterait de la précision théorique que tu ne peux
 * pas tenir sans peser chaque aliment. »
 *
 * Deux écarts assumés avec les maquettes :
 *
 * 1. Lipides à 100 g et non 105 g. La maquette v2 affiche 105, l'en-tête du .md
 *    écrit 100. Le .md est la source de vérité.
 * 2. Les totaux en kcal ne tombent pas exactement sur la somme des macros
 *    (170 × 4 + 480 × 4 + 100 × 9 = 3 500, pour 3 600 annoncés). C'est recopié
 *    tel quel : un plan alimentaire pratique s'écrit en repères ronds, et le
 *    .md dit lui-même « les quantités données sont des repères, pas des lois ».
 *    Le « corriger » ici inventerait une précision que le plan ne revendique pas.
 */

/** Jour d'entraînement ou jour de repos — les deux seuls paliers du plan. */
export type DayKind = 'train' | 'rest';

export interface Meal {
  /** « Réveil », « Déjeuner »… */
  name: string;
  /** Le détail tel qu'il est écrit dans le .md. */
  detail: string;
  kcal: number;
  proteinG: number;
}

export interface NutritionTarget {
  kind: DayKind;
  label: string;
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  meals: Meal[];
  /** Ce qui distingue ce palier de l'autre, en une phrase. */
  note: string;
}

// ---------------------------------------------------------------------------
// §« Journée type — jour d'entraînement »
// ---------------------------------------------------------------------------

const REVEIL: Meal = {
  name: 'Réveil — 6 h',
  detail: '3 œufs entiers + 3 tranches de pain complet + 20 g de miel + 1 banane',
  kcal: 645,
  proteinG: 30,
};

const COLLATION_8H: Meal = {
  name: 'Collation — 8 h',
  detail: '60 g de flocons d’avoine + 250 ml de lait demi-écrémé, préparés la veille',
  kcal: 345,
  proteinG: 16,
};

const COLLATION_10H: Meal = {
  name: 'Collation — 10 h',
  detail: '280 g de skyr nature (9,8 g de protéines / 100 g) + 30 g d’amandes + 1 pomme',
  kcal: 430,
  proteinG: 34,
};

const DEJEUNER: Meal = {
  name: 'Déjeuner',
  detail: '180-200 g de protéine + 300 g de féculent (cuit) + 250 g de légumes + 10 g d’huile d’olive',
  kcal: 865,
  proteinG: 67,
};

const AUTOUR_SEANCE: Meal = {
  name: 'Autour de la séance — 16 h',
  detail:
    'Avant (1 h 30) : banane + 2 tranches de pain avec 20 g de miel. Après (45 min) : shaker whey 30 g + 1 pomme',
  kcal: 540,
  proteinG: 32,
};

const DINER: Meal = {
  name: 'Dîner',
  detail: '180-200 g de protéine + 200 g de féculent (cuit) + 250 g de légumes + 15 g d’huile',
  kcal: 785,
  proteinG: 63,
};

const TRAIN: NutritionTarget = {
  kind: 'train',
  label: 'Jour d’entraînement',
  kcal: 3600,
  proteinG: 240,
  carbsG: 425,
  fatG: 105,
  note: 'Les glucides se concentrent autour de la séance, pas le soir devant la télé.',
  meals: [REVEIL, COLLATION_8H, COLLATION_10H, DEJEUNER, AUTOUR_SEANCE, DINER],
};

// ---------------------------------------------------------------------------
// §« Journée type — jour de repos (mardi, jeudi) »
//
// Le .md ne décrit plus ce palier par des portions réduites : « Exactement les
// mêmes repas, moins la prise autour de la séance. Aucune portion à
// recalculer. » Les repas ci-dessous sont donc littéralement les mêmes objets,
// la prise de 16 h en moins — ce qui garantit qu'ils ne peuvent pas diverger.
// ---------------------------------------------------------------------------

const REST: NutritionTarget = {
  kind: 'rest',
  label: 'Jour de repos',
  kcal: 3100,
  proteinG: 210,
  carbsG: 325,
  fatG: 100,
  note: 'Ce n’est pas un jour « low carb » : mêmes repas, mêmes portions, simplement une prise en moins.',
  meals: [REVEIL, COLLATION_8H, COLLATION_10H, DEJEUNER, DINER],
};

export const NUTRITION_TARGETS: Record<DayKind, NutritionTarget> = {
  train: TRAIN,
  rest: REST,
};

/**
 * Ce que les repas listés totalisent réellement.
 *
 * Longtemps, ce n'était PAS la cible : le .md annonçait 3 600 kcal en tête et la
 * somme de ses repas tombait à 2 770, puis 2 900. L'écart, −23 % puis −19 %,
 * n'avait rien d'un arrondi : suivre les portions écrites à la lettre revenait
 * à manger nettement moins que la cible, donc à ne pas prendre le poids visé.
 *
 * Le plan a été refait sur les valeurs de composition réelles des aliments
 * listés, avec une sixième prise à 8 h : la somme tombe maintenant à moins de
 * 2 % de la cible sur les deux paliers, donc sous la tolérance, donc l'alerte
 * s'éteint. On continue à calculer la somme au lieu de la coder en dur : c'est
 * précisément ce calcul qui a révélé l'écart, et c'est lui qui le signalera
 * si une portion repart à la baisse.
 *
 * On calcule la somme au lieu de la coder en dur, et on l'affiche à côté de la
 * cible : deux nombres qui se contredisent doivent se voir, pas se cacher l'un
 * derrière l'autre.
 */
export function mealsTotal(target: NutritionTarget): { kcal: number; proteinG: number } {
  return target.meals.reduce(
    (acc, m) => ({ kcal: acc.kcal + m.kcal, proteinG: acc.proteinG + m.proteinG }),
    { kcal: 0, proteinG: 0 },
  );
}

/** Écart entre les repas listés et la cible, en kcal et en pourcentage. */
export function mealsGap(target: NutritionTarget): { kcal: number; pct: number } {
  const kcal = mealsTotal(target).kcal - target.kcal;
  return { kcal, pct: Math.round((kcal / target.kcal) * 1000) / 10 };
}

/** Au-delà, l'écart n'est plus un arrondi et doit être signalé. */
export const MEALS_GAP_TOLERANCE_PCT = 5;

// ---------------------------------------------------------------------------
// §« Liste de courses hebdomadaire type »
// ---------------------------------------------------------------------------

export interface ShoppingGroup {
  title: string;
  items: string;
}

export const SHOPPING_LIST: ShoppingGroup[] = [
  {
    title: 'Protéines',
    items:
      'Œufs (2 douzaines), poulet ou dinde (1 kg), viande hachée 5 % (500 g), poisson (2-3 pavés), yaourts grecs ou skyr (10), fromage blanc, whey (1 boîte)',
  },
  {
    title: 'Glucides',
    items:
      'Riz, pâtes, pain complet, flocons d’avoine, pommes de terre, patates douces, fruits (bananes, pommes, fruits de saison)',
  },
  { title: 'Lipides', items: 'Huile d’olive, amandes ou noix, avocat (optionnel)' },
  {
    title: 'Légumes',
    items: 'En grande quantité, ce qui te plaît — haricots verts, brocolis, carottes, salade, courgettes',
  },
];

// ---------------------------------------------------------------------------
// §« Principe général » et §« Suivi et ajustement », réduits aux règles qu'on
// relit en faisant ses courses.
// ---------------------------------------------------------------------------

export const SIMPLE_RULES: string[] = [
  'Une protéine à chaque repas, sans exception.',
  'Glucides concentrés avant et après l’entraînement.',
  'Légumes à volonté, ça ne compte quasiment pas.',
  'Moyenne 7 jours, jamais une pesée isolée.',
  'Jour de repos : mêmes repas, on saute juste la prise autour de la séance.',
];

/** §« Le seul complément qui vaut le coup ». */
export const SUPPLEMENTS_NOTE =
  'Créatine monohydrate, 5 g par jour, tous les jours, n’importe quand — le seul complément qui vaut le coup. La whey est un dépannage pratique, pas une obligation. Pas de brûleur de graisse, pas de BCAA.';

/** §« Hydratation ». */
export const HYDRATION_NOTE =
  'Bois régulièrement, la couleur des urines suffit comme repère. Plus d’eau et de sel les jours de chaleur ou de grosse transpiration sur chantier. Pas de règle rigide du type « 3 L obligatoires ».';

/** §« Suivi et ajustement » — la vitesse de prise visée. */
export const TARGET_GAIN_KG_PER_WEEK = { min: 0.15, max: 0.3 } as const;

// ---------------------------------------------------------------------------
// Bonus glucidique par séance — décision de Guillaume, hors .md
// ---------------------------------------------------------------------------

/**
 * Carburant supplémentaire les jours où la séance coûte cher en glycogène.
 *
 * Ce n'est PAS un second plan alimentaire. Le plan de base ne bouge pas d'un
 * gramme, les protéines et les lipides ne varient jamais selon la séance :
 * seul un bonus de glucides s'ajoute, affiché à part, et Guillaume le prend ou
 * non selon sa faim, sa fatigue et l'évolution de son poids.
 *
 * Rien n'est fondu dans les totaux du plan de base — un bonus invisible
 * deviendrait une obligation silencieuse, ce qui est l'inverse du but.
 */
export type FuelLevel = 'high' | 'medium' | 'standard' | 'rest';

export interface FuelAdvice {
  level: FuelLevel;
  emoji: string;
  title: string;
  /** Ce que coûte la séance, en une ligne. */
  subtitle: string;
  /** Aliments à ajouter. Vide pour « standard » et « repos ». */
  foods: string[];
  /** Pour le calcul du total avec bonus. 0 quand il n'y a pas de bonus. */
  kcal: number;
  /** Fourchette telle que Guillaume l'a écrite, pour l'affichage. */
  kcalLabel: string;
  carbsLabel: string;
  message: string;
}

export const FUEL_ADVICE: Record<FuelLevel, FuelAdvice> = {
  high: {
    level: 'high',
    emoji: '🔴',
    title: 'CARBURANT ++',
    subtitle: 'Séance très exigeante',
    foods: ['+ 1 banane', '+ 40 g pain', '+ 20 g miel'],
    kcal: 240,
    kcalLabel: '≈ +240 kcal',
    carbsLabel: '≈ +55-60 g glucides',
    message: 'À répartir dans la journée, avec priorité avant l’entraînement.',
  },
  medium: {
    level: 'medium',
    emoji: '🟠',
    title: 'CARBURANT +',
    subtitle: 'Séance exigeante',
    foods: ['+ 1 banane', '+ 20 g miel'],
    kcal: 145,
    kcalLabel: '≈ +145 kcal',
    carbsLabel: '≈ +35-40 g glucides',
    message: 'À consommer de préférence avant l’entraînement.',
  },
  standard: {
    level: 'standard',
    emoji: '🟡',
    title: 'STANDARD',
    subtitle: 'Séance modérée',
    foods: [],
    kcal: 0,
    kcalLabel: '',
    carbsLabel: '',
    message: 'Plan alimentaire de base — aucun ajout nécessaire.',
  },
  rest: {
    level: 'rest',
    emoji: '🟢',
    title: 'REPOS',
    subtitle: 'Pas de séance aujourd’hui',
    foods: [],
    kcal: 0,
    kcalLabel: '',
    carbsLabel: '',
    message: 'Jour de récupération — plan alimentaire de base.',
  },
};

/**
 * Niveau de carburant par jour d'entraînement du programme (§3).
 *
 * La clé est le `DayIndex` de la séance réellement programmée, pas un nom de
 * jour écrit à part : chaque jour du programme porte une et une seule trame
 * (`BASE_SESSIONS`), donc ce numéro EST l'identité du type de séance. Si le
 * calendrier évolue, la carte suit sans retouche.
 *
 *   0 lundi     Lower Strength — squat lourd, RDL, unilatéral, sauts
 *   2 mercredi  Upper Strength — bench et tractions lestées
 *   4 vendredi  Total Body Power — vitesse, sauts, speed squat
 *   5 samedi    Posterior Chain — deadlift, front squat, hip thrust, sauts
 *   6 dimanche  Upper Athletic + tronc
 *
 * Le mercredi est la séance la plus lourde en charge de la semaine, et pourtant
 * « standard » : un travail de force du haut du corps puise beaucoup moins dans
 * le glycogène qu'une séance jambes ou sauts. C'est un choix de Guillaume, pas
 * un oubli.
 *
 * Mardi et jeudi sont absents : sans séance, le niveau est « repos ».
 */
export const FUEL_BY_TRAINING_DAY: Partial<Record<0 | 1 | 2 | 3 | 4 | 5 | 6, FuelLevel>> = {
  0: 'high',
  2: 'standard',
  4: 'medium',
  5: 'high',
  6: 'medium',
};
