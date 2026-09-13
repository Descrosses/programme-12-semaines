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

/**
 * Comment se pèse un aliment. `unité` sert à ce qui ne se pèse pas en pratique
 * — une banane, une pomme, un œuf : Guillaume n'a pas de balance au chantier.
 */
export type FoodUnit = 'g' | 'ml' | 'unité';

/**
 * Une ligne d'aliment d'un repas, avec sa composition.
 *
 * Avant ça, un repas n'était qu'une phrase (« 280 g de skyr… ») et deux nombres
 * écrits à la main. Impossible d'en changer une marque de yaourt sans réécrire
 * le total à la main — et sans se tromper.
 *
 * `per` dit sur quelle base la composition est donnée : 100 pour ce qui se pèse,
 * 1 pour ce qui se compte. C'est ce que portent les étiquettes, donc c'est ce que
 * Guillaume recopie sans conversion.
 *
 * `id` est stable et ne doit jamais changer : c'est lui qui relie une valeur
 * modifiée à sa ligne. Renommer un libellé est sans conséquence, renommer un id
 * ferait silencieusement oublier une modification.
 */
export interface FoodItem {
  id: string;
  /** Le produit dont cette ligne sert une quantité. Porte la composition. */
  product: string;
  label: string;
  /** Quantité consommée, dans `unit`. */
  qty: number;
  unit: FoodUnit;
  /** Base de la composition : 100 (g/ml) ou 1 (unité). */
  per: number;
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  /** Précision pratique affichée à la saisie. */
  hint?: string;
}

export interface Meal {
  /** « Réveil », « Déjeuner »… */
  name: string;
  /** Le détail tel qu'il est écrit dans le .md. */
  detail: string;
  kcal: number;
  proteinG: number;
  /**
   * Les aliments de ce repas, quand il a été décomposé.
   *
   * Absent = repas encore décrit par sa seule phrase, `kcal` et `proteinG` font
   * foi. Présent = les aliments font foi, et `kcal`/`proteinG` doivent valoir
   * leur somme (un test le vérifie) : deux nombres qui se contredisent, on en a
   * déjà fait les frais avec l'écart de 830 kcal.
   */
  items?: FoodItem[];
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
// Produits — la composition, partagée par toutes les lignes qui les utilisent
//
// Le pain complet apparaît dans quatre lignes du plan : réveil et collation de
// 16 h, sur les deux paliers. Si chacune portait sa propre composition, changer
// de marque de pain demanderait de la retaper quatre fois — et trois oublis sur
// quatre. La composition vit donc UNE fois, ici, et les lignes n'y ajoutent
// qu'une quantité.
//
// C'est aussi ce que ça veut dire à l'écran : corriger le pain corrige tout le
// pain du plan ; changer une quantité ne touche que la ligne ouverte.
// ---------------------------------------------------------------------------

interface FoodProduct {
  label: string;
  unit: FoodUnit;
  /** 100 pour ce qui se pèse, 1 pour ce qui se compte. */
  per: number;
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  /** Précision pratique affichée à la saisie : « poids cuit », « la tranche »… */
  hint?: string;
}

const PRODUITS = {
  oeuf: { label: 'Œuf entier', unit: 'unité', per: 1, kcal: 71.5, proteinG: 6.3, carbsG: 0.35, fatG: 4.95, hint: 'Un œuf moyen, environ 50 g.' },
  pain: { label: 'Pain complet', unit: 'g', per: 100, kcal: 250, proteinG: 9, carbsG: 43, fatG: 3.3, hint: 'Une tranche pèse environ 35 g.' },
  miel: { label: 'Miel ou confiture', unit: 'g', per: 100, kcal: 300, proteinG: 0.3, carbsG: 82, fatG: 0 },
  banane: { label: 'Banane', unit: 'unité', per: 1, kcal: 107, proteinG: 1.3, carbsG: 27.6, fatG: 0.4, hint: 'Une banane moyenne, environ 120 g épluchée.' },
  pomme: { label: 'Pomme', unit: 'unité', per: 1, kcal: 80, proteinG: 0.5, carbsG: 21.5, fatG: 0.3, hint: 'Une pomme moyenne, environ 155 g.' },
  flocons: { label: 'Flocons d’avoine', unit: 'g', per: 100, kcal: 380, proteinG: 13, carbsG: 60, fatG: 7 },
  lait: { label: 'Lait demi-écrémé', unit: 'ml', per: 100, kcal: 46, proteinG: 3.3, carbsG: 4.8, fatG: 1.6 },
  skyr: { label: 'Skyr nature', unit: 'g', per: 100, kcal: 63, proteinG: 9.8, carbsG: 4, fatG: 0.2 },
  amandes: { label: 'Amandes', unit: 'g', per: 100, kcal: 580, proteinG: 21, carbsG: 10, fatG: 50 },
  viande: { label: 'Viande ou poisson', unit: 'g', per: 100, kcal: 170, proteinG: 27, carbsG: 0, fatG: 7, hint: 'Poulet, dinde, bœuf 5 %, poisson — pesé cuit.' },
  feculent: { label: 'Féculent', unit: 'g', per: 100, kcal: 125, proteinG: 3.5, carbsG: 26, fatG: 0.5, hint: 'Riz, pâtes, pommes de terre — pesé CUIT.' },
  legumes: { label: 'Légumes', unit: 'g', per: 100, kcal: 30, proteinG: 2, carbsG: 5, fatG: 0.3 },
  huile: { label: 'Huile d’olive ou de colza', unit: 'g', per: 100, kcal: 900, proteinG: 0, carbsG: 0, fatG: 100 },
  whey: { label: 'Whey', unit: 'g', per: 100, kcal: 400, proteinG: 80, carbsG: 8, fatG: 5 },
} as const satisfies Record<string, FoodProduct>;

export type ProductId = keyof typeof PRODUITS;

/**
 * Une ligne du plan : un produit, une quantité, et un identifiant à elle.
 *
 * `id` identifie la LIGNE (« le pain du réveil, jour d'entraînement ») et porte
 * la quantité. `product` identifie le PRODUIT et porte la composition. Les deux
 * se corrigent séparément, et c'est tout l'intérêt.
 */
function ligne(id: string, product: ProductId, qty: number): FoodItem {
  return { id, product, qty, ...PRODUITS[product] };
}

// ---------------------------------------------------------------------------
// §« Journée type — jour d'entraînement »
// ---------------------------------------------------------------------------

const REVEIL: Meal = {
  name: 'Réveil — 6 h',
  detail: '3 œufs entiers + 3 tranches de pain complet + 20 g de miel + 1 banane',
  kcal: 644,
  proteinG: 30,
  items: [
    ligne('t.reveil.oeuf', 'oeuf', 3),
    ligne('t.reveil.pain', 'pain', 105),
    ligne('t.reveil.miel', 'miel', 20),
    ligne('t.reveil.banane', 'banane', 1),
  ],
};

const COLLATION_8H: Meal = {
  name: 'Collation — 8 h',
  detail: '60 g de flocons d’avoine + 250 ml de lait demi-écrémé, préparés la veille',
  kcal: 343,
  proteinG: 16,
  items: [ligne('t.collation8.flocons', 'flocons', 60), ligne('t.collation8.lait', 'lait', 250)],
};

/*
 * Seule prise identique aux deux paliers : le même objet sert aux deux, donc
 * ses lignes portent le préfixe « x » et non « t » ou « r ».
 */
const COLLATION_10H: Meal = {
  name: 'Collation — 10 h',
  detail: '280 g de skyr nature + 30 g d’amandes + 1 pomme',
  kcal: 430,
  proteinG: 34,
  items: [
    ligne('x.collation10.skyr', 'skyr', 280),
    ligne('x.collation10.amandes', 'amandes', 30),
    ligne('x.collation10.pomme', 'pomme', 1),
  ],
};

const DEJEUNER: Meal = {
  name: 'Déjeuner',
  detail: '180-200 g de protéine + 300 g de féculent (cuit) + 250 g de légumes + 10 g d’huile d’olive',
  kcal: 863,
  proteinG: 67,
  items: [
    ligne('t.dejeuner.viande', 'viande', 190),
    ligne('t.dejeuner.feculent', 'feculent', 300),
    ligne('t.dejeuner.legumes', 'legumes', 250),
    ligne('t.dejeuner.huile', 'huile', 10),
  ],
};

const AUTOUR_SEANCE: Meal = {
  name: 'Autour de la séance — 16 h',
  detail:
    'Avant (1 h 30) : banane + 2 tranches de pain avec 20 g de miel. Après (45 min) : shaker whey 30 g + 1 pomme',
  kcal: 542,
  proteinG: 32,
  items: [
    ligne('t.autour.banane', 'banane', 1),
    ligne('t.autour.pain', 'pain', 70),
    ligne('t.autour.miel', 'miel', 20),
    ligne('t.autour.whey', 'whey', 30),
    ligne('t.autour.pomme', 'pomme', 1),
  ],
};

const DINER: Meal = {
  name: 'Dîner',
  detail: '180-200 g de protéine + 200 g de féculent (cuit) + 250 g de légumes + 15 g d’huile',
  kcal: 783,
  proteinG: 63,
  items: [
    ligne('t.diner.viande', 'viande', 190),
    ligne('t.diner.feculent', 'feculent', 200),
    ligne('t.diner.legumes', 'legumes', 250),
    ligne('t.diner.huile', 'huile', 15),
  ],
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
// Six prises aussi, et non cinq : Guillaume préfère manger au même rythme tous
// les jours et se servir un peu moins, plutôt que sauter une prise. Sauter la
// prise de 16 h aurait été plus simple à écrire, mais ça crée un jour qui ne
// ressemble à aucun autre, donc un jour qu'on oublie de suivre.
//
// Ce qui baisse : le pain, les flocons, les féculents, le miel — les glucides,
// parce que c'est la dépense de la séance qui disparaît. Ce qui ne bouge PAS :
// la viande, le poisson, les œufs, le skyr, les amandes, l'huile. Le besoin de
// construire du muscle, lui, ne prend pas de jour de repos.
// ---------------------------------------------------------------------------

const REVEIL_REPOS: Meal = {
  name: 'Réveil — 6 h',
  detail: '3 œufs entiers + 2 tranches de pain complet + 20 g de miel + 1 banane',
  kcal: 557,
  proteinG: 27,
  items: [
    ligne('r.reveil.oeuf', 'oeuf', 3),
    ligne('r.reveil.pain', 'pain', 70),
    ligne('r.reveil.miel', 'miel', 20),
    ligne('r.reveil.banane', 'banane', 1),
  ],
};

const COLLATION_8H_REPOS: Meal = {
  name: 'Collation — 8 h',
  detail: '40 g de flocons d’avoine + 250 ml de lait demi-écrémé, préparés la veille',
  kcal: 267,
  proteinG: 13,
  items: [ligne('r.collation8.flocons', 'flocons', 40), ligne('r.collation8.lait', 'lait', 250)],
};

const DEJEUNER_REPOS: Meal = {
  name: 'Déjeuner',
  detail: '180-200 g de protéine + 200 g de féculent (cuit) + 250 g de légumes + 10 g d’huile d’olive',
  kcal: 738,
  proteinG: 63,
  items: [
    ligne('r.dejeuner.viande', 'viande', 190),
    ligne('r.dejeuner.feculent', 'feculent', 200),
    ligne('r.dejeuner.legumes', 'legumes', 250),
    ligne('r.dejeuner.huile', 'huile', 10),
  ],
};

const COLLATION_16H_REPOS: Meal = {
  name: 'Collation — 16 h',
  detail: '1 banane + 1 tranche de pain avec 10 g de miel + shaker whey 30 g (ou 2 yaourts)',
  kcal: 345,
  proteinG: 28,
  items: [
    ligne('r.collation16.banane', 'banane', 1),
    ligne('r.collation16.pain', 'pain', 35),
    ligne('r.collation16.miel', 'miel', 10),
    ligne('r.collation16.whey', 'whey', 30),
  ],
};

const DINER_REPOS: Meal = {
  name: 'Dîner',
  detail: '180-200 g de protéine + 150 g de féculent (cuit) + 250 g de légumes + 15 g d’huile',
  kcal: 721,
  proteinG: 62,
  items: [
    ligne('r.diner.viande', 'viande', 190),
    ligne('r.diner.feculent', 'feculent', 150),
    ligne('r.diner.legumes', 'legumes', 250),
    ligne('r.diner.huile', 'huile', 15),
  ],
};

const REST: NutritionTarget = {
  kind: 'rest',
  label: 'Jour de repos',
  kcal: 3050,
  proteinG: 227,
  carbsG: 315,
  fatG: 100,
  note: 'Ce n’est pas un jour « low carb » : mêmes six prises, mêmes protéines, seuls les féculents baissent.',
  meals: [
    REVEIL_REPOS,
    COLLATION_8H_REPOS,
    COLLATION_10H, // la seule prise identique aux deux paliers
    DEJEUNER_REPOS,
    COLLATION_16H_REPOS,
    DINER_REPOS,
  ],
};

export const NUTRITION_TARGETS: Record<DayKind, NutritionTarget> = {
  train: TRAIN,
  rest: REST,
};

/**
 * Toutes les lignes du plan qui servent un produit donné, paliers confondus.
 *
 * Sert à dire à Guillaume, avant qu'il saisisse, combien d'autres lignes sa
 * correction de composition va toucher. On dédoublonne par identifiant de
 * ligne : la collation de 10 h est le même objet dans les deux paliers, elle ne
 * doit pas compter double.
 */
export function linesForProduct(product: string): FoodItem[] {
  const parId = new Map<string, FoodItem>();
  for (const t of Object.values(NUTRITION_TARGETS)) {
    for (const m of t.meals) {
      for (const i of m.items ?? []) {
        if (i.product === product) parId.set(i.id, i);
      }
    }
  }
  return [...parId.values()];
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
  'Jour de repos : mêmes six prises, on allège seulement les féculents.',
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
