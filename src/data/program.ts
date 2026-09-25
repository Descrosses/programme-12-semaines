/**
 * `program.ts` — point d'entrée unique du programme.
 *
 * L'engine et les écrans importent d'ici, jamais des fichiers internes.
 * Si un jour tu veux corriger une charge ou une consigne, tu ouvres le fichier
 * pointé par le commentaire, tu changes UNE valeur, et les tests te disent
 * immédiatement si tu as cassé la cohérence avec le .md.
 */

// §9 — tableau des charges + ligne RDL
export { MAIN_LIFT_TABLE, prescriptionFor } from './mainLiftTable';

// §5, §7, §8, §12 — catalogue des exercices
export { EXERCISES, EXERCISE_IDS, exercise } from './exercises';

// §6 — échauffements cochables
export { WARMUPS, WARMUP_LOWER, WARMUP_UPPER } from './warmups';

// §7 — les 5 trames de référence
export { BASE_SESSIONS } from './baseSessions';

// §8 — modifications par bloc, encodées en règles
export {
  BLOCK_RULES,
  CONTRAST_BY_DAY,
  DELOAD_POLICY,
  blockNotesFor,
  rulesFor,
  type BlockRuleSet,
  type ContrastSpec,
  type SlotPatch,
  type SlotRule,
} from './blockRules';

// §8 semaine 12 et §12 — combines et taper
export {
  COMBINE_METRICS,
  COMBINE_S8_METRICS,
  MESURES_COMBINE,
  RAMPS,
  RAMPS_S12,
  RAMP_BENCH,
  RAMP_BENCH_S12,
  RAMP_DEADLIFT,
  RAMP_DEADLIFT_S12,
  RAMP_PULLUP,
  RAMP_PULLUP_S12,
  RAMP_SQUAT,
  RAMP_SQUAT_S12,
  SPECIAL_SESSIONS,
  TARGETS_12_WEEKS,
  isCombineDay,
  specialSession,
} from './testSessions';

export * from './types';

// ---------------------------------------------------------------------------
// §2 — Périodisation. La seule table qui dit à quel bloc appartient une semaine.
// ---------------------------------------------------------------------------

import { TRAINING_DAYS, type Block, type DayIndex, type WeekIndex } from './types';

export interface BlockInfo {
  block: Block;
  name: string;
  /** Version courte, pour le sélecteur de semaines où la place manque. */
  short: string;
  /** Intensité des lifts principaux, telle qu'écrite en §2. */
  intensityLabel: string;
  objective: string;
  /** Couleur du bloc dans la vue Semaine. */
  color: string;
}

export const BLOCKS: Record<Block, BlockInfo> = {
  test: {
    block: 'test',
    name: 'Combine initial',
    short: 'Combine',
    intensityLabel: 'Tests 1RM',
    objective: 'Établir les références : 1RM, sauts, sprint, référence de readiness',
    color: '#7ac4a0',
  },
  accumulation: {
    block: 'accumulation',
    name: 'Accumulation',
    short: 'Accum',
    intensityLabel: '71-79 %',
    objective: 'Base de force, technique hinge, apprentissage des sauts',
    color: '#5aa7e0',
  },
  deload: {
    block: 'deload',
    name: 'Deload',
    short: 'Deload',
    intensityLabel: '65-70 %',
    objective: 'Dissipation de fatigue',
    color: '#8fa3b5',
  },
  maxforce: {
    block: 'maxforce',
    name: 'Force maximale',
    short: 'Force',
    intensityLabel: '82-90 %',
    objective: 'Force absolue, longs repos',
    color: '#e5533d',
  },
  power: {
    block: 'power',
    name: 'Puissance',
    short: 'Puiss.',
    intensityLabel: '84-89 % + vitesse 55-60 %',
    objective: 'Contraste, RFD, fraîcheur',
    color: '#f2b33d',
  },
  taper: {
    block: 'taper',
    name: 'Taper + combine final',
    short: 'Taper',
    intensityLabel: 'Léger',
    objective: 'Tests',
    color: '#7ac4a0',
  },
};

/** §2 — bloc de chaque semaine. Semaine 0 = combine initial. */
export const WEEK_BLOCKS: Record<WeekIndex, Block> = {
  0: 'test',
  1: 'accumulation',
  2: 'accumulation',
  3: 'accumulation',
  4: 'deload',
  5: 'maxforce',
  6: 'maxforce',
  7: 'maxforce',
  8: 'deload',
  9: 'power',
  10: 'power',
  11: 'power',
  12: 'taper',
};

/**
 * Jours réellement occupés par chaque semaine.
 *
 * §3 — la semaine type tient sur cinq jours : lundi, mercredi, vendredi,
 * samedi, dimanche. Mardi et jeudi sont des repos.
 *
 * La semaine 0 est différente et c'est voulu : le combine initial étale ses
 * quatre 1RM pour qu'aucun effort de tirage n'en suive un autre à moins de
 * 48 h. Mercredi et dimanche y sont des repos, et le dimanche est là pour
 * qu'on attaque la semaine 1 à froid, pas au lendemain d'un test max.
 *
 *   lundi    sauts, sprints, squat 1RM
 *   mardi    tractions lestées 1RM
 *   jeudi    deadlift 1RM        ← 48 h après les tractions lestées
 *   vendredi bench 1RM, ab wheel
 *   samedi   tractions strictes max, leg raise, farmer carry  ← 48 h après le deadlift
 *
 * La semaine 1 démarre le lundi suivant, avec ses cinq séances.
 */
export const WEEK_DAYS: Record<WeekIndex, readonly DayIndex[]> = {
  0: [0, 1, 3, 4, 5],
  1: TRAINING_DAYS,
  2: TRAINING_DAYS,
  3: TRAINING_DAYS,
  4: TRAINING_DAYS,
  5: TRAINING_DAYS,
  6: TRAINING_DAYS,
  7: TRAINING_DAYS,
  8: TRAINING_DAYS,
  9: TRAINING_DAYS,
  10: TRAINING_DAYS,
  11: TRAINING_DAYS,
  12: TRAINING_DAYS,
};

// ---------------------------------------------------------------------------
// §4 — Readiness, §11 — règles de progression : seuils bruts.
// L'engine s'en sert, il ne les redéfinit pas.
// ---------------------------------------------------------------------------

/** §4 — Feu tricolore sur le broad jump du jour vs la référence. */
export const READINESS_THRESHOLDS = {
  /** ≥ −2 % → vert. */
  greenPct: -2,
  /** ≥ −5 % → orange, en dessous → rouge. */
  orangePct: -5,
  orange: {
    /** « −5 % sur les gros mouvements ». */
    mainLoadFactor: 0.95,
    /** « une série de moins sur les accessoires ». */
    accessorySetsDelta: -1,
  },
  red: {
    /** « technique à 60-70 % » → 65 %, milieu de fourchette (décision de Guillaume). */
    pctOf1RM: 0.65,
    sets: 3,
    reps: 3,
  },
} as const;

/**
 * §4 ORANGE — « les gros mouvements » qui prennent les −5 %.
 * Liste énumérée par Guillaume (arrondi 2,5 kg à la barre, 2 kg au Bulgarian),
 * complétée par tout exercice de rôle `main` : sur un jour jambes, alléger
 * aussi le push press et le speed squat ne coûte rien et reste cohérent.
 */
export const BIG_MOVEMENT_IDS = [
  'back-squat',
  'bench-press',
  'deadlift',
  'front-squat',
  'rdl',
  'hip-thrust',
  'bulgarian-split-squat',
] as const;

/** §11 — les 7 cas, avec les incréments écrits dans le programme. */
export const PROGRESSION_RULES = {
  /** Cas 2 : RPE 6-6,5 pour 8 prévu. */
  wayTooEasy: { rpeGapAtLeast: 1.5, lowerBodyKg: 5, upperBodyKg: 2.5 },
  /** Cas 3 : RPE 7 pour 8 prévu. */
  slightlyTooEasy: { rpeGapAtLeast: 0.5, kg: 2.5 },
  /** Cas 4 : RPE 9 pour 8 prévu → même charge. Deux fois de suite → tableau −5 %. */
  tooHard: { repeatSameLoad: true, recalcAfterOccurrences: 2, recalcFactor: 0.95 },
  /** Cas 5 : rep ratée → −5 à −7,5 %, on retient −7,5 % (le plus prudent). */
  missedRep: { loadFactor: 0.925, rebuildWeeks: 2 },
  /** Cas 7 : sauts en baisse 2 semaines de suite. */
  explosiveDecline: { weeks: 2, mainLiftSets: 3, removeConditioning: true, deloadAfterDays: 10 },
} as const;
