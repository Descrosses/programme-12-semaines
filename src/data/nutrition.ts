/**
 * Plan alimentaire — transcription de `plan-alimentaire-12-semaines.md`.
 *
 * Même règle que pour le programme d'entraînement : ce fichier ne contient QUE
 * des données recopiées du .md. Aucun calcul, aucune décision. Ce qui décide
 * vit dans `src/engine/nutrition.ts`.
 *
 * Deux paliers d'aliments et pas plus, c'est le .md qui le pose : « Une
 * périodisation plus fine, séance par séance, ajouterait de la précision
 * théorique que tu ne peux pas tenir sans peser chaque aliment. »
 *
 * Les semaines de deload ne font pas un troisième palier : ce sont les mêmes
 * repas, dont trois portions de féculent baissent. Voir `DELOAD_QUANTITIES`,
 * en bas de ce fichier.
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
  /**
   * L'état auquel se rapportent les valeurs ci-dessus, et la famille de
   * l'aliment. Hérités du produit — une ligne EST un produit plus une quantité.
   */
  referenceState: ReferenceState;
  category: FoodCategory;
  /** Précision pratique affichée à la saisie. */
  hint?: string;
  /**
   * Posé quand la quantité a été ajustée par la PHASE du programme, et non par
   * Guillaume.
   *
   * Les deux ajustements ne doivent pas se confondre à l'écran : « MODIFIÉ »
   * veut dire « tu as changé ça », et c'est lui que compte le bouton de remise
   * à zéro. Un ajustement de deload n'est pas à lui, et le réinitialiser
   * n'aurait aucun sens.
   */
  adjusted?: NutritionPhase;
}

/**
 * Phase nutritionnelle d'une journée — ce qui s'ajoute au couple
 * entraînement/repos.
 *
 * `deloadLight` : journée d'entraînement d'une semaine de deload, hors combine.
 * Le volume tombe, donc la dépense aussi, mais c'est aussi une semaine de
 * récupération : on ne coupe pas à proportion du volume.
 */
export type NutritionPhase = 'normal' | 'deloadLight';

export interface Meal {
  /**
   * Identifiant stable de la prise, jamais son libellé.
   *
   * C'est lui qui relie « pris » ou « pas pris » à ce repas, un jour donné.
   * Renommer « Collation — 08 h » en « Collation du matin » doit être sans
   * conséquence ; renommer un identifiant effacerait silencieusement tout
   * l'historique de ce repas.
   *
   * Le préfixe suit celui de ses lignes : `t.` jour d'entraînement, `r.` jour
   * de repos, `x.` les deux.
   */
  id: string;
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

/**
 * L'état dans lequel l'aliment est PESÉ, et donc celui auquel ses valeurs
 * nutritionnelles se rapportent.
 *
 * C'est une donnée et non une phrase, parce que c'est une source d'erreur
 * silencieuse : 100 g de riz cru valent 350 kcal, 100 g de riz cuit en valent
 * 130. Une portion pesée cuite comptée sur des valeurs crues triple l'apport
 * réel. Avant, l'information vivait dans `hint`, un texte libre qu'aucun calcul
 * ne pouvait lire et qu'aucun test ne pouvait vérifier.
 *
 * `na` pour tout ce qui ne change pas de masse à la préparation : un œuf, une
 * pomme, du lait, du pain, de l'huile.
 */
export type ReferenceState = 'cru' | 'cuit' | 'na';

/** Famille d'aliment, pour ranger la bibliothèque de remplacement. */
export type FoodCategory = 'proteine' | 'feculent' | 'legumineuse' | 'legume' | 'fruit' | 'laitier' | 'gras' | 'autre';

export interface FoodProduct {
  label: string;
  unit: FoodUnit;
  /** 100 pour ce qui se pèse, 1 pour ce qui se compte. */
  per: number;
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  /** L'état auquel se rapportent les valeurs ci-dessus. */
  referenceState: ReferenceState;
  category: FoodCategory;
  /** Précision pratique affichée à la saisie : « la tranche »… */
  hint?: string;
}

export const PRODUITS = {
  oeuf: { label: 'Œuf entier', unit: 'unité', per: 1, kcal: 71.5, proteinG: 6.3, carbsG: 0.35, fatG: 4.95, referenceState: 'na', category: 'proteine', hint: 'Un œuf moyen, environ 50 g.' },
  /*
   * Flocons CROUSTILLANTS, pas des flocons d'avoine nature : ce sont deux
   * produits différents, l'un à 380 kcal/100 g, l'autre autour de 460 à cause
   * du sucre et de l'huile ajoutés. Les confondre faisait disparaître 55 kcal
   * et 12 g de lipides par petit-déjeuner.
   *
   * Valeur DÉDUITE du total de 674 kcal annoncé pour ce petit-déjeuner, pas
   * lue sur un paquet : c'est la ligne la moins fiable du plan, à recopier
   * depuis l'étiquette réelle dans l'écran Nutrition.
   */
  floconsCroustillants: { label: 'Flocons croustillants', unit: 'g', per: 100, kcal: 460, proteinG: 9, carbsG: 62, fatG: 19, referenceState: 'na', category: 'feculent', hint: 'Type Bjorg. Valeur approchée — recopie ton étiquette.' },
  fruitsRouges: { label: 'Fruits rouges', unit: 'g', per: 100, kcal: 45, proteinG: 0.9, carbsG: 8, fatG: 0.4, referenceState: 'na', category: 'fruit', hint: 'Surgelés ou frais, mélange standard.' },
  lait: { label: 'Lait demi-écrémé', unit: 'ml', per: 100, kcal: 46, proteinG: 3.3, carbsG: 4.8, fatG: 1.6, referenceState: 'na', category: 'laitier' },
  pomme: { label: 'Pomme', unit: 'unité', per: 1, kcal: 80, proteinG: 0.5, carbsG: 21.5, fatG: 0.3, referenceState: 'na', category: 'fruit', hint: 'Une pomme moyenne, environ 155 g.' },
  amandes: { label: 'Amandes', unit: 'g', per: 100, kcal: 580, proteinG: 21, carbsG: 10, fatG: 50, referenceState: 'na', category: 'gras' },
  skyr: { label: 'Skyr nature', unit: 'g', per: 100, kcal: 63, proteinG: 9.8, carbsG: 4, fatG: 0.2, referenceState: 'na', category: 'laitier' },
  confiture: { label: 'Miel ou confiture', unit: 'g', per: 100, kcal: 300, proteinG: 0.3, carbsG: 82, fatG: 0, referenceState: 'na', category: 'autre' },
  poulet: { label: 'Poulet cuit', unit: 'g', per: 100, kcal: 165, proteinG: 31, carbsG: 0, fatG: 3.6, referenceState: 'cuit', category: 'proteine', hint: 'Blanc de poulet.' },
  riz: { label: 'Riz cuit', unit: 'g', per: 100, kcal: 130, proteinG: 2.7, carbsG: 28, fatG: 0.3, referenceState: 'cuit', category: 'feculent' },
  petitsPois: { label: 'Petits pois', unit: 'g', per: 100, kcal: 81, proteinG: 5.4, carbsG: 14.5, fatG: 0.4, referenceState: 'cuit', category: 'legume', hint: 'Riches en fibres.' },
  pain: { label: 'Pain complet', unit: 'g', per: 100, kcal: 250, proteinG: 9, carbsG: 43, fatG: 3.3, referenceState: 'na', category: 'feculent', hint: 'Une tranche pèse environ 35 g.' },
  banane: { label: 'Banane', unit: 'unité', per: 1, kcal: 107, proteinG: 1.3, carbsG: 27.6, fatG: 0.4, referenceState: 'na', category: 'fruit', hint: 'Une banane moyenne, environ 120 g épluchée.' },
  saumon: { label: 'Saumon', unit: 'g', per: 100, kcal: 208, proteinG: 20, carbsG: 0, fatG: 13, referenceState: 'cuit', category: 'proteine', hint: 'Pavé.' },
  pates: { label: 'Pâtes cuites', unit: 'g', per: 100, kcal: 158, proteinG: 5.8, carbsG: 31, fatG: 0.9, referenceState: 'cuit', category: 'feculent' },
  brocolis: { label: 'Purée de brocolis', unit: 'g', per: 100, kcal: 35, proteinG: 2.8, carbsG: 4, fatG: 0.4, referenceState: 'cuit', category: 'legume' },
  huile: { label: 'Huile d’olive', unit: 'g', per: 100, kcal: 900, proteinG: 0, carbsG: 0, fatG: 100, referenceState: 'na', category: 'gras', hint: '10 g ≈ une cuillère à soupe.' },
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
//
// Cinq prises, celles que Guillaume fait déjà — 05 h 45, 08 h, 12 h, 16 h, 20 h.
// Ce sont SES aliments : le plan précédent parlait de « viande ou poisson » et
// de « féculent », ce qui ne ressemblait à aucun de ses repas, donc à rien
// qu'il puisse suivre. Seules les quantités ont bougé.
//
// Les protéines BAISSENT, et c'est le changement le moins intuitif : son
// alimentation réelle en apportait déjà ≈ 213 g, soit 2,7 g/kg. Le surplus est
// reconverti en glucides, qui eux servent à la séance.
// ---------------------------------------------------------------------------

const PETIT_DEJEUNER: Meal = {
  id: 't.pdej',
  name: 'Petit-déjeuner — 05 h 45',
  detail: '3 œufs + 70 g de flocons croustillants + 150 g de fruits rouges + 250 ml de lait',
  kcal: 719,
  proteinG: 35,
  items: [
    ligne('t.pdej.oeuf', 'oeuf', 3),
    ligne('t.pdej.flocons', 'floconsCroustillants', 70),
    ligne('t.pdej.fruitsRouges', 'fruitsRouges', 150),
    ligne('t.pdej.lait', 'lait', 250),
  ],
};

/*
 * Seule prise identique aux deux paliers : le même objet sert aux deux, donc
 * ses lignes portent le préfixe « x » et non « t » ou « r ».
 *
 * Le skyr passe de 280 à 200 g. C'est là qu'on récupère le plus de protéines
 * superflues sans toucher à un aliment ni à une habitude.
 */
const COLLATION_8H: Meal = {
  id: 'x.collation8',
  name: 'Collation — 08 h',
  detail: '1 pomme + 30 g d’amandes + 200 g de skyr + 35 g de confiture',
  kcal: 485,
  proteinG: 27,
  items: [
    ligne('x.collation8.pomme', 'pomme', 1),
    ligne('x.collation8.amandes', 'amandes', 30),
    ligne('x.collation8.skyr', 'skyr', 200),
    ligne('x.collation8.confiture', 'confiture', 35),
  ],
};

const DEJEUNER: Meal = {
  id: 't.dejeuner',
  name: 'Déjeuner — 12 h',
  detail: '150 g de poulet cuit + 250 g de riz cuit + 150 g de petits pois',
  kcal: 694,
  proteinG: 61,
  items: [
    ligne('t.dejeuner.poulet', 'poulet', 150),
    ligne('t.dejeuner.riz', 'riz', 250),
    ligne('t.dejeuner.petitsPois', 'petitsPois', 150),
  ],
};

/*
 * La prise la plus retravaillée du plan : de 289 à 458 kcal, de 36 à 87 g de
 * glucides, pour 3 g de lipides.
 *
 * Une collation pré-séance doit fournir du carburant disponible, pas ralentir
 * la digestion — d'où le pain et le miel plutôt qu'un gros volume de skyr, et
 * d'où les lipides maintenus au plancher.
 */
const PRE_ENTRAINEMENT: Meal = {
  id: 't.pre',
  name: 'Pré-entraînement — 16 h',
  detail: '1 banane + 110 g de pain complet + 40 g de miel + 120 g de skyr',
  kcal: 578,
  proteinG: 23,
  items: [
    ligne('t.pre.banane', 'banane', 1),
    ligne('t.pre.pain', 'pain', 110),
    ligne('t.pre.confiture', 'confiture', 40),
    ligne('t.pre.skyr', 'skyr', 120),
  ],
};

const DINER: Meal = {
  id: 't.diner',
  name: 'Dîner — 20 h',
  detail: '140 g de saumon + 200 g de pâtes cuites + 150 g de purée de brocolis + 10 g d’huile',
  kcal: 750,
  proteinG: 44,
  items: [
    ligne('t.diner.saumon', 'saumon', 140),
    ligne('t.diner.pates', 'pates', 200),
    ligne('t.diner.brocolis', 'brocolis', 150),
    ligne('t.diner.huile', 'huile', 10),
  ],
};

/*
 * Les cibles ne sont PAS des nombres ronds choisis d'avance : ce sont les
 * totaux réels des aliments ci-dessus, recopiés ici pour que l'écran puisse
 * afficher « visé » et « réellement listé » côte à côte. Un test vérifie qu'ils
 * coïncident — c'est ce qui a révélé l'écart de 830 kcal de l'ancien plan.
 */
const TRAIN: NutritionTarget = {
  kind: 'train',
  label: 'Jour d’entraînement',
  kcal: 3226,
  proteinG: 190,
  carbsG: 402,
  fatG: 91,
  note: 'Les glucides se concentrent autour de la séance : déjeuner, 16 h, dîner.',
  meals: [PETIT_DEJEUNER, COLLATION_8H, DEJEUNER, PRE_ENTRAINEMENT, DINER],
};

// ---------------------------------------------------------------------------
// §« Journée type — jour de repos (mardi, jeudi) »
//
// Mêmes aliments, mêmes horaires, mêmes cinq prises. Seuls les féculents
// baissent — flocons, riz, pain, pâtes. La viande, le poisson, les œufs, le
// skyr, les amandes et l'huile ne bougent pas : c'est la dépense de la séance
// qui disparaît, pas le besoin de construire.
//
// 432 kcal de moins, dont 84 g de glucides. Les protéines ne perdent que 12 g.
// ---------------------------------------------------------------------------

const PETIT_DEJEUNER_REPOS: Meal = {
  id: 'r.pdej',
  name: 'Petit-déjeuner — 05 h 45',
  detail: '3 œufs + 60 g de flocons croustillants + 150 g de fruits rouges + 200 ml de lait',
  kcal: 650,
  proteinG: 32,
  items: [
    ligne('r.pdej.oeuf', 'oeuf', 3),
    ligne('r.pdej.flocons', 'floconsCroustillants', 60),
    ligne('r.pdej.fruitsRouges', 'fruitsRouges', 150),
    ligne('r.pdej.lait', 'lait', 200),
  ],
};

const DEJEUNER_REPOS: Meal = {
  id: 'r.dejeuner',
  name: 'Déjeuner — 12 h',
  detail: '150 g de poulet cuit + 180 g de riz cuit + 150 g de petits pois',
  kcal: 603,
  proteinG: 59,
  items: [
    ligne('r.dejeuner.poulet', 'poulet', 150),
    ligne('r.dejeuner.riz', 'riz', 180),
    ligne('r.dejeuner.petitsPois', 'petitsPois', 150),
  ],
};

const COLLATION_16H_REPOS: Meal = {
  id: 'r.collation16',
  name: 'Collation — 16 h',
  detail: '1 banane + 60 g de pain complet + 20 g de miel + 120 g de skyr',
  kcal: 393,
  proteinG: 19,
  items: [
    ligne('r.collation16.banane', 'banane', 1),
    ligne('r.collation16.pain', 'pain', 60),
    ligne('r.collation16.confiture', 'confiture', 20),
    ligne('r.collation16.skyr', 'skyr', 120),
  ],
};

const DINER_REPOS: Meal = {
  id: 'r.diner',
  name: 'Dîner — 20 h',
  detail: '140 g de saumon + 150 g de pâtes cuites + 150 g de purée de brocolis + 10 g d’huile',
  kcal: 671,
  proteinG: 41,
  items: [
    ligne('r.diner.saumon', 'saumon', 140),
    ligne('r.diner.pates', 'pates', 150),
    ligne('r.diner.brocolis', 'brocolis', 150),
    ligne('r.diner.huile', 'huile', 10),
  ],
};

const REST: NutritionTarget = {
  kind: 'rest',
  label: 'Jour de repos',
  kcal: 2802,
  proteinG: 178,
  carbsG: 321,
  fatG: 86,
  note: 'Ce n’est pas un jour « low carb » : mêmes aliments, seuls les féculents baissent.',
  meals: [
    PETIT_DEJEUNER_REPOS,
    COLLATION_8H, // la seule prise identique aux deux paliers
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
  'Jour de repos : mêmes cinq prises, on allège seulement les féculents.',
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
    subtitle: 'Séance très exigeante — ajout suggéré',
    foods: ['+ 1 banane', '+ 40 g pain', '+ 20 g miel'],
    kcal: 240,
    kcalLabel: '≈ +240 kcal',
    carbsLabel: '≈ +55-60 g glucides',
    message:
      'Facultatif. À ajouter si la faim ou la fatigue le justifient, de préférence avant la séance.',
  },
  medium: {
    level: 'medium',
    emoji: '🟠',
    title: 'CARBURANT +',
    subtitle: 'Séance exigeante — ajout suggéré',
    foods: ['+ 1 banane', '+ 20 g miel'],
    kcal: 145,
    kcalLabel: '≈ +145 kcal',
    carbsLabel: '≈ +35-40 g glucides',
    message:
      'Facultatif. À ajouter si la faim ou la fatigue le justifient, de préférence avant la séance.',
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

// ---------------------------------------------------------------------------
// Semaines de deload — décision de Guillaume, hors .md
// ---------------------------------------------------------------------------

/**
 * Ce qui baisse pendant une journée d'entraînement de semaine de deload.
 *
 * ── Le principe ─────────────────────────────────────────────────────────────
 *
 * Moins de volume, donc moins de dépense — mais une semaine de deload est AUSSI
 * une semaine de récupération. Une coupe proportionnelle au volume (−40 % de
 * séries ne veut pas dire −40 % de calories) saboterait exactement ce que la
 * semaine est censée produire.
 *
 * La baisse est donc modeste, et elle vient des glucides seuls.
 *
 *   JOUR D'ENTRAÎNEMENT
 *   riz du déjeuner       250 → 200 g
 *   pâtes du dîner        200 → 160 g
 *   pain du pré-séance    110 →  85 g
 *                         ─────────────
 *                         −190 kcal, dont 37 g de glucides
 *
 *   JOUR DE REPOS
 *   riz du déjeuner       180 → 150 g
 *   pâtes du dîner        150 → 120 g
 *                         ─────────────
 *                         −86 kcal
 *
 * Le jour de repos baisse DEUX FOIS MOINS, et c'est voulu : il part déjà 424
 * kcal plus bas qu'un jour d'entraînement. Y empiler une seconde grosse coupe
 * ferait d'une semaine de récupération la semaine la plus restrictive du
 * programme.
 *
 * Les protéines perdent 6 g sur 190, les lipides 1 : rien qui compte.
 *
 * ── Ce qui NE baisse pas, et pourquoi ───────────────────────────────────────
 *
 * Le miel du pré-entraînement reste à 40 g. C'est le seul repas dont le travail
 * est de fournir du carburant disponible, et la séance a lieu quand même —
 * allégée, pas annulée.
 *
 * Les flocons croustillants restent à 70 g : ils portent 19 g de lipides pour
 * 100 g, donc les réduire ferait baisser les lipides autant que les glucides.
 * C'est l'inverse de la règle.
 *
 * Fruits, légumes, œufs, skyr, poulet, saumon, huile, amandes : intacts. La
 * dépense de la séance diminue, pas le besoin de récupérer.
 *
 * ── La clé est un identifiant de LIGNE ──────────────────────────────────────
 *
 * Et non de produit : on allège le riz du déjeuner, pas « le riz » partout. Les
 * deux paliers ont donc leurs propres entrées — préfixe `t.` pour le jour
 * d'entraînement, `r.` pour le jour de repos — et chacun baisse de ce qui le
 * concerne.
 */
export const DELOAD_QUANTITIES: Readonly<Record<string, number>> = {
  // Jour d'entraînement : −190 kcal, dont 37 g de glucides.
  't.dejeuner.riz': 200,
  't.diner.pates': 160,
  't.pre.pain': 85,
  // Jour de repos : −86 kcal. On l'effleure, on ne le creuse pas.
  'r.dejeuner.riz': 150,
  'r.diner.pates': 120,
};

/** Le bandeau affiché dans l'écran Nutrition pendant une semaine de deload. */
export const DELOAD_BANNER = {
  title: 'SEMAINE DE DELOAD',
  text:
    'Volume d’entraînement réduit : apports légèrement ajustés pour correspondre à la dépense énergétique tout en favorisant la récupération. Protéines et lipides inchangés — seuls les féculents baissent.',
} as const;
