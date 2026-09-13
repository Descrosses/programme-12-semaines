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

const TRAIN: NutritionTarget = {
  kind: 'train',
  label: 'Jour d’entraînement',
  kcal: 3600,
  proteinG: 170,
  carbsG: 480,
  fatG: 100,
  note: 'Les glucides se concentrent autour de la séance, pas le soir devant la télé.',
  meals: [
    {
      name: 'Réveil',
      detail: '3 œufs entiers + 2 tranches de pain complet + 1 fruit',
      kcal: 550,
      proteinG: 32,
    },
    {
      name: 'Collation matin',
      detail: '280 g de skyr nature (9,8 g de protéines / 100 g) + 30 g d’amandes + 1 pomme',
      kcal: 420,
      proteinG: 34,
    },
    {
      name: 'Déjeuner',
      detail: '150-180 g de protéine + 150 g de féculent (cuit) + légumes + huile d’olive',
      kcal: 700,
      proteinG: 45,
    },
    {
      name: 'Avant / après séance',
      detail:
        'Avant (1 h 30) : banane + pain miel. Après (45 min) : shaker whey 30 g + fruit, ou 2 yaourts + flocons d’avoine',
      kcal: 350,
      proteinG: 30,
    },
    {
      name: 'Dîner',
      detail: '150-180 g de protéine + 200 g de féculent + légumes + huile d’olive ou de colza',
      kcal: 750,
      proteinG: 45,
    },
  ],
};

// ---------------------------------------------------------------------------
// §« Journée type — jour de repos (mardi, jeudi) »
//
// Le .md décrit ce palier par différence : « Retire la collation glucidique
// spécifiquement post-training, et réduis les féculents du déjeuner et du dîner
// d'environ 30-40 g chacun ». Les quantités ci-dessous sont cette soustraction,
// telle que la maquette validée avec Guillaume l'a chiffrée.
// ---------------------------------------------------------------------------

const REST: NutritionTarget = {
  kind: 'rest',
  label: 'Jour de repos',
  kcal: 3150,
  proteinG: 170,
  carbsG: 380,
  fatG: 100,
  note: 'Ce n’est pas un jour « low carb » : mêmes protéines, seulement moins de féculents.',
  meals: [
    {
      name: 'Réveil',
      detail: '3 œufs entiers + 2 tranches de pain complet + 1 fruit',
      kcal: 550,
      proteinG: 32,
    },
    {
      name: 'Collation matin',
      detail: '280 g de skyr nature (9,8 g de protéines / 100 g) + 30 g d’amandes + 1 pomme',
      kcal: 420,
      proteinG: 34,
    },
    {
      name: 'Déjeuner',
      detail: '150-180 g de protéine + 110-120 g de féculent + légumes + huile d’olive',
      kcal: 630,
      proteinG: 45,
    },
    {
      name: 'Dîner',
      detail: '150-180 g de protéine + 160 g de féculent + légumes + huile d’olive',
      kcal: 620,
      proteinG: 45,
    },
  ],
};

export const NUTRITION_TARGETS: Record<DayKind, NutritionTarget> = {
  train: TRAIN,
  rest: REST,
};

/**
 * Ce que les repas listés totalisent réellement.
 *
 * Ce n'est PAS la cible : le .md annonce 3 600 kcal en tête, mais la somme de
 * ses cinq repas tombe à 2 770. L'écart est de −830 kcal, soit 23 % — bien
 * au-delà d'un arrondi. Suivre les portions écrites à la lettre revient donc à
 * manger nettement moins que la cible, et à ne pas prendre le poids visé.
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
  'Jours de repos : un peu moins de féculents, mêmes protéines.',
];

/** §« Le seul complément qui vaut le coup ». */
export const SUPPLEMENTS_NOTE =
  'Créatine monohydrate, 5 g par jour, tous les jours, n’importe quand — le seul complément qui vaut le coup. La whey est un dépannage pratique, pas une obligation. Pas de brûleur de graisse, pas de BCAA.';

/** §« Hydratation ». */
export const HYDRATION_NOTE =
  'Bois régulièrement, la couleur des urines suffit comme repère. Plus d’eau et de sel les jours de chaleur ou de grosse transpiration sur chantier. Pas de règle rigide du type « 3 L obligatoires ».';

/** §« Suivi et ajustement » — la vitesse de prise visée. */
export const TARGET_GAIN_KG_PER_WEEK = { min: 0.15, max: 0.3 } as const;
