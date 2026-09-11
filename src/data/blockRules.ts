/**
 * §8 — Modifications par bloc, encodées comme des règles.
 *
 * Personne ne recopie une séance douze fois : l'engine part des cinq trames de
 * `baseSessions.ts` et applique les règles ci-dessous selon le bloc de la
 * semaine. Corriger le deload, c'est corriger une ligne ici, pas soixante.
 */

import {
  meters,
  noLoad,
  reps,
  rpe,
  rpeAtMost,
  rpeRange,
  type Block,
  type DayIndex,
  type LoadSpec,
  type RPETarget,
  type Slot,
  type Work,
} from './types';

// ---------------------------------------------------------------------------
// Formes de règles
// ---------------------------------------------------------------------------

export interface SlotPatch {
  sets?: number;
  work?: Work;
  restSec?: number;
  targetRPE?: RPETarget | null;
  /** Multiplie la charge résolue (ex. 1.1 pour « +10 % » des accessoires haut). */
  loadFactor?: number;
  load?: LoadSpec;
  note?: string;
  /** Id de l'exercice explosif intercalé entre les séries (contraste S9-11). */
  contrastWith?: string;
}

export type SlotRule =
  | { op: 'patch'; exId: string; patch: SlotPatch }
  | { op: 'remove'; exId: string }
  | { op: 'insert'; slot: Slot; after?: string; atStart?: true };

export interface BlockRuleSet {
  block: Block;
  /** Absent = s'applique à tous les jours du bloc. */
  day?: DayIndex;
  rules: SlotRule[];
  notes?: string[];
}

const patch = (exId: string, p: SlotPatch): SlotRule => ({ op: 'patch', exId, patch: p });
const remove = (exId: string): SlotRule => ({ op: 'remove', exId });

// ---------------------------------------------------------------------------
// Deload — semaines 4 et 8 (§8)
// ---------------------------------------------------------------------------

/**
 * Ces règles s'appliquent par rôle, pas par exercice : c'est ce qui permet de
 * couvrir aussi les accessoires que le tableau ne chiffre pas (Bulgarian,
 * Hip Thrust). Base de calcul décidée avec Guillaume : 80 % de la charge
 * RÉELLE de la dernière semaine non-deload du même exercice.
 */
export const DELOAD_POLICY = {
  /** « Accessoires : 2 séries au lieu de 3-4 ». */
  accessorySets: 2,
  /** « −20 % ». */
  accessoryLoadFactor: 0.8,
  /** « Sauts : volume divisé par 2, intention maximale conservée ». */
  jumpVolumeDivisor: 2,
  /** « Zéro série au-dessus de RPE 6 ». */
  maxRPE: 6,
  /** « Aucun Nordic difficile, aucun conditioning ». */
  removeExIds: ['nordic-curl', 'conditioning', 'zone2-bike'],
  notes: [
    'Deload : 2 séries sur les accessoires à −20 %, volume de sauts divisé par 2 (intention maximale conservée), zéro série au-dessus de RPE 6.',
    'Aucun Nordic difficile, aucun conditioning.',
  ],
} as const;

// ---------------------------------------------------------------------------
// Semaines 5-7 — Force maximale (§8)
// ---------------------------------------------------------------------------

const MAXFORCE: BlockRuleSet[] = [
  {
    block: 'maxforce',
    day: 0,
    notes: ['Fini le tempo 3 s : descente contrôlée ~2 s, remontée intention maximale.'],
    rules: [
      patch('box-jump', { sets: 4, work: reps(2), restSec: 120 }),
      patch('back-squat', { restSec: 240 }),
      patch('bulgarian-split-squat', {
        sets: 4,
        work: reps(5, true, 'jambe'),
        targetRPE: rpe(8),
        restSec: 120,
      }),
    ],
  },
  {
    block: 'maxforce',
    day: 2,
    rules: [
      patch('bench-press', { restSec: 210 }),
      patch('weighted-pullup', { restSec: 180 }),
      // « Accessoires haut : 3 × 6 au lieu de 3 × 8, +10 % »
      patch('landmine-press-kneeling', { sets: 3, work: reps(6, true), loadFactor: 1.1, targetRPE: rpe(8) }),
      patch('chest-supported-row', { sets: 3, work: reps(6), loadFactor: 1.1, targetRPE: rpe(8) }),
    ],
  },
  {
    block: 'maxforce',
    day: 4,
    rules: [
      patch('push-press', { restSec: 150 }),
      patch('speed-squat', { restSec: 75 }),
    ],
  },
  {
    block: 'maxforce',
    day: 5,
    rules: [
      patch('deadlift', { restSec: 240 }),
      patch('front-squat', { restSec: 150 }),
      patch('hip-thrust', { sets: 4, work: reps(6), targetRPE: rpe(8), restSec: 120 }),
      patch('nordic-curl', { sets: 3, work: reps({ min: 4, max: 5 }) }),
    ],
  },
  {
    block: 'maxforce',
    day: 6,
    notes: ['Dimanche : tout à 3 séries.'],
    rules: [
      // « Dimanche : tout à 3 séries, conditioning 6 × 20 s / 100 s »
      patch('incline-db-press', { sets: 3 }),
      patch('neutral-grip-pullup', { sets: 3, work: reps(6) }),
      patch('one-arm-cable-row', { sets: 3, work: reps(8, true) }),
      patch('landmine-press-standing', { sets: 3, work: reps(6, true) }),
      patch('cable-chop', { sets: 3, work: reps(6, true) }),
      patch('hanging-leg-raise', { sets: 3, work: reps(8) }),
      patch('bear-crawl', { sets: 3 }),
      patch('conditioning', {
        work: { kind: 'intervals', rounds: 6, workSec: 20, easySec: 100 },
        note: 'Et pas davantage.',
      }),
    ],
  },
];

// ---------------------------------------------------------------------------
// Semaines 9-11 — Conversion force → puissance, contraste (§8)
// ---------------------------------------------------------------------------

/**
 * « Série lourde → repos → mouvement explosif → repos → série lourde suivante.
 * C'est du contraste, pas un superset. » Repos de §10.
 */
export interface ContrastSpec {
  heavy: string;
  explosive: string;
  explosiveReps: number;
  /** Lourd → explosif. */
  restAfterHeavySec: number;
  /** Explosif → lourd suivant. */
  restAfterExplosiveSec: number;
  cycleLabel: string;
}

export const CONTRAST_BY_DAY: Partial<Record<DayIndex, ContrastSpec>> = {
  0: {
    heavy: 'back-squat',
    explosive: 'box-jump',
    explosiveReps: 2,
    restAfterHeavySec: 120,
    restAfterExplosiveSec: 120,
    cycleLabel: 'Cycle ≈ 4 min',
  },
  2: {
    heavy: 'bench-press',
    explosive: 'plyo-push-up',
    explosiveReps: 3,
    restAfterHeavySec: 90,
    restAfterExplosiveSec: 120,
    cycleLabel: 'Cycle ≈ 3 min 30',
  },
  5: {
    heavy: 'deadlift',
    explosive: 'broad-jump',
    explosiveReps: 2,
    restAfterHeavySec: 120,
    restAfterExplosiveSec: 120,
    cycleLabel: 'Cycle ≈ 4 min',
  },
};

const POWER: BlockRuleSet[] = [
  {
    block: 'power',
    day: 0,
    notes: ['Pogos et box jumps de début de séance supprimés : ils passent dans le contraste.'],
    rules: [
      remove('pogo-jumps'),
      remove('box-jump'),
      patch('back-squat', { contrastWith: 'box-jump' }),
      patch('bulgarian-split-squat', { sets: 3, work: reps(5, true, 'jambe'), targetRPE: rpe(7.5) }),
      patch('ab-wheel', { sets: 3, work: reps(8) }),
    ],
  },
  {
    block: 'power',
    day: 2,
    rules: [
      remove('plyo-push-up'),
      patch('bench-press', { contrastWith: 'plyo-push-up' }),
      patch('weighted-pullup', { restSec: 180, note: 'Intention explosive.' }),
      patch('landmine-press-kneeling', { sets: 4, work: reps(5, true), targetRPE: rpe(6), note: 'Explosif.' }),
      patch('chest-supported-row', { sets: 3, work: reps(6) }),
      patch('pallof-press', { sets: 3, work: reps(5, true) }),
    ],
  },
  {
    block: 'power',
    day: 4,
    notes: ['Pas de dead bug, pas de conditioning. Tu quittes la salle stimulé, pas détruit.'],
    rules: [
      {
        op: 'insert',
        after: 'broad-jump',
        slot: {
          exId: 'pogo-jumps',
          sets: 3,
          work: reps(10),
          load: noLoad(),
          targetRPE: null,
          restSec: 45,
        },
      },
      patch('lateral-bound', { sets: 4, work: reps(2, true), restSec: 90 }),
      patch('speed-squat', { restSec: 90 }),
      patch('jump-squat-db', { sets: 5, work: reps(3), restSec: 120 }),
      patch('farmer-carry', { sets: 3, work: meters(20) }),
      remove('explosive-cable-row'),
      remove('dead-bug-cable'),
    ],
  },
  {
    block: 'power',
    day: 5,
    rules: [
      remove('broad-jump'),
      patch('deadlift', { contrastWith: 'broad-jump' }),
      patch('hip-thrust', { sets: 4, work: reps(5), targetRPE: rpeRange(7, 8), note: 'Explosif.' }),
      patch('nordic-curl', { sets: 2, work: reps(4) }),
      patch('copenhagen-plank', { sets: 3, work: reps(5, true) }),
      patch('suitcase-carry', { sets: 3, work: meters(20, true) }),
    ],
  },
  {
    block: 'power',
    day: 6,
    rules: [
      patch('incline-db-press', { sets: 3, work: reps({ min: 6, max: 8 }) }),
      patch('neutral-grip-pullup', { sets: 3, work: reps({ min: 5, max: 6 }) }),
      patch('one-arm-cable-row', { sets: 3, work: reps(8, true) }),
      patch('landmine-press-standing', { sets: 2, work: reps(8, true) }),
      patch('cable-chop', { sets: 3, work: reps(6, true) }),
      patch('hanging-leg-raise', { sets: 3, work: reps(8) }),
      patch('bear-crawl', { sets: 3, work: meters(15) }),
      remove('conditioning'),
      {
        op: 'insert',
        slot: {
          exId: 'zone2-bike',
          sets: 1,
          work: { kind: 'time', seconds: 900 },
          load: noLoad(),
          targetRPE: rpeAtMost(4),
          restSec: 0,
          note: 'Facultatif : 10-15 min, rien de plus.',
        },
      },
    ],
  },
];

export const BLOCK_RULES: BlockRuleSet[] = [...MAXFORCE, ...POWER];

/** Règles applicables à une séance donnée. */
export function rulesFor(block: Block, day: DayIndex): SlotRule[] {
  return BLOCK_RULES.filter((r) => r.block === block && (r.day === undefined || r.day === day)).flatMap(
    (r) => r.rules,
  );
}

/** Notes de bloc à afficher en tête de séance. */
export function blockNotesFor(block: Block, day: DayIndex): string[] {
  return BLOCK_RULES.filter((r) => r.block === block && (r.day === undefined || r.day === day)).flatMap(
    (r) => r.notes ?? [],
  );
}
