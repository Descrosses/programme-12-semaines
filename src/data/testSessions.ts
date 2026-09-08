/**
 * §12 — Combines, et §8 semaine 12 — Taper + tests.
 *
 * Ces séances ne se déduisent d'aucune trame : elles sont écrites en toutes
 * lettres dans le programme, donc transcrites en toutes lettres ici.
 *
 * Calendrier du test initial (§12 + décision de Guillaume) :
 *   samedi  → combine jour 1   (semaine 0, jour 3)
 *   dimanche → combine jour 2  (semaine 0, jour 4)
 *   lundi   → combine jour 3   (semaine 1, jour 0 — il REMPLACE le lundi de la S1)
 *   mercredi → début réel de la semaine 1
 */

import {
  attempts,
  bodyweight,
  dbPair,
  maxSet,
  noLoad,
  reps,
  rpe,
  type DayIndex,
  type RampStep,
  type SessionBlueprint,
  type Slot,
  type WeekIndex,
} from './types';

// ---------------------------------------------------------------------------
// Paliers de montée de charge (§12, test initial)
// ---------------------------------------------------------------------------

const w = (kg: number, r: number): RampStep => ({ kg, reps: r });
const a = (kg: number, optional = false): RampStep => ({ kg, reps: 1, attempt: true, optional });

/** « 60×5 / 80×3 / 100×2 / 115×1 / 130×1 / 142,5 / 147,5 si rapide » */
export const RAMP_SQUAT: RampStep[] = [
  w(60, 5), w(80, 3), w(100, 2), w(115, 1), w(130, 1), a(142.5), a(147.5, true),
];

/** « 60×5 / 80×3 / 95×1 / 107,5×1 / 117,5 / 122,5 / 125 » */
export const RAMP_BENCH: RampStep[] = [
  w(60, 5), w(80, 3), w(95, 1), w(107.5, 1), a(117.5), a(122.5), a(125, true),
];

/** « 60×5 / 80×3 / 100×2 / 115×1 / 130×1 / 137,5 / 142,5 / 147,5 selon vitesse » */
export const RAMP_DEADLIFT: RampStep[] = [
  w(60, 5), w(80, 3), w(100, 2), w(115, 1), w(130, 1), a(137.5), a(142.5, true), a(147.5, true),
];

/** « +20×3 / +30×1 / +36×1 / +40 / +42,5 » */
export const RAMP_PULLUP: RampStep[] = [
  { kg: 20, reps: 3, added: true },
  { kg: 30, reps: 1, added: true },
  { kg: 36, reps: 1, added: true },
  { kg: 40, reps: 1, added: true, attempt: true },
  { kg: 42.5, reps: 1, added: true, attempt: true, optional: true },
];

export const RAMPS = {
  'back-squat': RAMP_SQUAT,
  'bench-press': RAMP_BENCH,
  deadlift: RAMP_DEADLIFT,
  'weighted-pullup': RAMP_PULLUP,
} as const;

// ---------------------------------------------------------------------------

const t = (exId: string, work: Slot['work'], restSec: number, note?: string): Slot => ({
  exId,
  sets: 1,
  work,
  load: noLoad(),
  targetRPE: null,
  restSec,
  ...(note ? { note } : {}),
});

const oneRM = (exId: string, ramp: RampStep[], note?: string): Slot => ({
  exId,
  sets: 1,
  work: attempts(ramp.filter((r) => r.attempt).length),
  load: noLoad(),
  targetRPE: null,
  restSec: 300,
  ramp,
  ...(note ? { note } : {}),
});

const fromTable = (exId: string, liftId: Slot['liftId'], restSec: number, note?: string): Slot => ({
  exId,
  liftId,
  sets: 0,
  work: reps(0),
  load: noLoad(),
  targetRPE: null,
  restSec,
  ...(note ? { note } : {}),
});

// ---------------------------------------------------------------------------
// Semaine 0 — combine initial, jours 1 et 2
// ---------------------------------------------------------------------------

const COMBINE_INITIAL_J1: SessionBlueprint = {
  day: 3,
  title: 'Combine initial — jour 1',
  durationLabel: '90 min',
  intensity: 'TEST',
  warmup: 'lower',
  readinessTest: false,
  notes: [
    'Même lieu, mêmes chaussures, même protocole, idéalement même heure — c’est ce qui rendra les trois combines comparables.',
    'Ton meilleur broad jump d’aujourd’hui devient ta référence de readiness pour les 12 semaines.',
  ],
  slots: [
    t('test-bodyweight', maxSet(), 0, 'Moyenne de 3 matins, à jeun.'),
    t('test-broad-jump', attempts(3), 180),
    t('test-vertical-jump', attempts(5), 90),
    t('test-sprint-10m', attempts(4), 240, 'Si la surface ne s’y prête pas, saute ce test.'),
    t('test-sprint-20m', attempts(4), 240),
    oneRM('test-squat-1rm', RAMP_SQUAT, '147,5 seulement si 142,5 passe proprement.'),
    t('test-farmer-carry', maxSet(), 0, 'Haltères 2 × 40 kg, distance max sans poser.'),
  ],
};

const COMBINE_INITIAL_J2: SessionBlueprint = {
  day: 4,
  title: 'Combine initial — jour 2',
  durationLabel: '75 min',
  intensity: 'TEST',
  warmup: 'upper',
  readinessTest: false,
  notes: [],
  slots: [
    oneRM('test-bench-1rm', RAMP_BENCH),
    oneRM('test-weighted-pullup-1rm', RAMP_PULLUP, 'Repos 4 min entre les tentatives.'),
    t('test-ab-wheel-max', maxSet(), 0),
  ],
};

/** Jour 3 du combine initial : il occupe le lundi de la semaine 1. */
const COMBINE_INITIAL_J3: SessionBlueprint = {
  day: 0,
  title: 'Combine initial — jour 3',
  durationLabel: '60 min',
  intensity: 'TEST',
  warmup: 'lower',
  readinessTest: false,
  notes: [
    'Jamais squat et deadlift le même jour.',
    'La semaine 1 commence mercredi par la séance Upper : elle ne compte que 4 séances.',
  ],
  slots: [
    oneRM('test-deadlift-1rm', RAMP_DEADLIFT),
    t('test-strict-pullup-max', maxSet(), 0, 'Poitrine à la barre.'),
    t('test-leg-raise-max', maxSet(), 0),
  ],
};

// ---------------------------------------------------------------------------
// Semaine 8 — combine intermédiaire (samedi + dimanche), sans 1RM
// ---------------------------------------------------------------------------

/**
 * Ordre décidé avec Guillaume : les tests d'abord, à froid, puis le travail de
 * deload. §8 précise « les lifts restent à 70 % » (au pluriel) : le deadlift ET
 * le front squat du tableau sont donc conservés en fin de séance.
 */
const COMBINE_S8_SAMEDI: SessionBlueprint = {
  day: 3,
  title: 'Combine intermédiaire',
  durationLabel: '75 min',
  intensity: 'TEST',
  warmup: 'lower',
  readinessTest: false,
  notes: [
    'Pas de 1RM cette semaine : les tests athlétiques seulement.',
    'Tests d’abord, à froid. Le travail de deload vient après.',
  ],
  slots: [
    t('test-bodyweight', maxSet(), 0, 'Moyenne de 3 matins.'),
    t('test-broad-jump', attempts(3), 180),
    t('test-vertical-jump', attempts(5), 90),
    t('test-sprint-10m', attempts(3), 240),
    t('test-sprint-20m', attempts(3), 240),
    t('test-strict-pullup-max', maxSet(), 0),
    t('test-farmer-carry', maxSet(), 0, 'Haltères 2 × 40 kg, distance max.'),
    fromTable('deadlift', 'deadlift', 180, 'Deload : RPE 5, vitesse de barre.'),
    fromTable('front-squat', 'front-squat', 120, 'Deload : RPE 5.'),
  ],
};

const COMBINE_S8_DIMANCHE: SessionBlueprint = {
  day: 4,
  title: 'Combine intermédiaire (suite) + haut du corps',
  durationLabel: '55 min',
  intensity: 'TEST',
  warmup: 'upper',
  readinessTest: false,
  notes: ['Tests d’abord, puis la séance du dimanche en version deload.'],
  slots: [
    t('test-ab-wheel-max', maxSet(), 0),
    t('test-leg-raise-max', maxSet(), 0),
    { exId: 'incline-db-press', sets: 2, work: reps(8), load: dbPair(24), targetRPE: rpe(6), restSec: 90 },
    { exId: 'one-arm-cable-row', sets: 2, work: reps(10, true), load: noLoad(), targetRPE: rpe(6), restSec: 75 },
    { exId: 'cable-chop', sets: 2, work: reps(6, true), load: noLoad(), targetRPE: rpe(6), restSec: 60 },
  ],
};

// ---------------------------------------------------------------------------
// Semaine 12 — Taper + combine final (§8)
// ---------------------------------------------------------------------------

/**
 * Seule vraie séance d'entraînement de la semaine 12. Elle absorbe le bench
 * 3×2×85 et le push press 3×2×50 que le tableau §9 prescrit sans leur donner
 * de séance (décision de Guillaume) : mercredi, vendredi, samedi et dimanche
 * restent strictement dédiés aux tests, sans fatigue résiduelle avant un 1RM.
 *
 * Repos : 2 min sur les deux ajouts. §10 donnerait 3 min au bench, mais à
 * RPE ≤ 6 sur 2 reps ça n'a pas de sens d'allonger une séance de taper.
 */
const S12_LUNDI: SessionBlueprint = {
  day: 0,
  title: 'Taper — séance complète légère',
  durationLabel: '50 min',
  intensity: 'LÉGER',
  warmup: 'lower',
  readinessTest: true,
  notes: [
    'Semaine de taper. Tu sors frais, pas fatigué. Vitesse de barre, rien de plus.',
    'Seule séance d’entraînement de la semaine : les quatre autres jours sont des tests.',
  ],
  slots: [
    { exId: 'box-jump', sets: 3, work: reps(2), load: noLoad(), targetRPE: null, restSec: 120 },
    fromTable('back-squat', 'back-squat', 180),
    {
      exId: 'bulgarian-split-squat',
      sets: 2,
      work: reps(5, true, 'jambe'),
      load: { kind: 'autoreg', seed: 12, step: 2, as: 'dbPair' },
      targetRPE: rpe(5),
      restSec: 60,
      note: 'Léger.',
    },
    { exId: 'ab-wheel', sets: 2, work: reps(6), load: bodyweight(), targetRPE: rpe(5), restSec: 60 },
    fromTable('bench-press', 'bench-press', 120, 'Léger, vitesse de barre. Aucune progression automatique en taper.'),
    fromTable('push-press', 'push-press', 120, 'Léger, vitesse de barre. Aucune progression automatique en taper.'),
  ],
};

const S12_MERCREDI: SessionBlueprint = {
  day: 1,
  title: 'TEST Deadlift 1RM',
  durationLabel: '45 min',
  intensity: 'TEST',
  warmup: 'lower',
  readinessTest: false,
  notes: [
    'Rien d’autre aujourd’hui.',
    'Les paliers affichés sont ceux du test initial : au-delà de 147,5 kg, monte à la sensation et à la vitesse de barre.',
  ],
  slots: [oneRM('test-deadlift-1rm', RAMP_DEADLIFT, 'Si la barre ralentit franchement, c’est le max.')],
};

const S12_VENDREDI: SessionBlueprint = {
  day: 2,
  title: 'Tests athlétiques',
  durationLabel: '45 min max',
  intensity: 'TEST',
  warmup: 'lower',
  readinessTest: false,
  notes: [
    'Mêmes chaussures, même lieu, même protocole que le test initial.',
    'Tests d’abord, puis le speed squat léger en fin de séance (décision de Guillaume).',
  ],
  slots: [
    t('test-broad-jump', attempts(3), 180),
    t('test-vertical-jump', attempts(5), 90),
    t('test-sprint-10m', attempts(4), 240),
    t('test-sprint-20m', attempts(4), 240),
    t('test-strict-pullup-max', maxSet(), 0),
    t('test-leg-raise-max', maxSet(), 0),
    fromTable('speed-squat', 'speed-squat', 90, 'Charge légère, juste pour garder la sensation de mouvement.'),
  ],
};

const S12_SAMEDI: SessionBlueprint = {
  day: 3,
  title: 'TEST Back Squat 1RM + Farmer',
  durationLabel: '60 min',
  intensity: 'TEST',
  warmup: 'lower',
  readinessTest: true,
  notes: ['Un squat propre à 152,5 vaut plus qu’un grinder hideux à 160.'],
  slots: [
    oneRM('test-squat-1rm', RAMP_SQUAT),
    t('test-farmer-carry', maxSet(), 0, 'Haltères 2 × 40 kg, distance max sans poser.'),
  ],
};

const S12_DIMANCHE: SessionBlueprint = {
  day: 4,
  title: 'TEST Bench + tractions + tronc',
  durationLabel: '75 min',
  intensity: 'TEST',
  warmup: 'upper',
  readinessTest: false,
  notes: ['Dernière séance du programme. Note tout.'],
  slots: [
    oneRM('test-bench-1rm', RAMP_BENCH),
    oneRM('test-weighted-pullup-1rm', RAMP_PULLUP, 'Repos 4 min. Dead hang, menton franchement au-dessus.'),
    t('test-ab-wheel-max', maxSet(), 0, 'Arrêt à la perte de rétroversion.'),
  ],
};

// ---------------------------------------------------------------------------

export interface SpecialSession {
  week: WeekIndex;
  day: DayIndex;
  blueprint: SessionBlueprint;
}

export const SPECIAL_SESSIONS: SpecialSession[] = [
  { week: 0, day: 3, blueprint: COMBINE_INITIAL_J1 },
  { week: 0, day: 4, blueprint: COMBINE_INITIAL_J2 },
  { week: 1, day: 0, blueprint: COMBINE_INITIAL_J3 },
  { week: 8, day: 3, blueprint: COMBINE_S8_SAMEDI },
  { week: 8, day: 4, blueprint: COMBINE_S8_DIMANCHE },
  { week: 12, day: 0, blueprint: S12_LUNDI },
  { week: 12, day: 1, blueprint: S12_MERCREDI },
  { week: 12, day: 2, blueprint: S12_VENDREDI },
  { week: 12, day: 3, blueprint: S12_SAMEDI },
  { week: 12, day: 4, blueprint: S12_DIMANCHE },
];

/** Séance écrite en toutes lettres pour cette case du calendrier, sinon `null`. */
export function specialSession(week: number, day: DayIndex): SessionBlueprint | null {
  return SPECIAL_SESSIONS.find((s) => s.week === week && s.day === day)?.blueprint ?? null;
}

/** Les mesures relevées à chaque combine (§12), dans l'ordre d'affichage. */
export const COMBINE_METRICS = [
  'test-bodyweight',
  'test-broad-jump',
  'test-vertical-jump',
  'test-sprint-10m',
  'test-sprint-20m',
  'test-squat-1rm',
  'test-bench-1rm',
  'test-deadlift-1rm',
  'test-weighted-pullup-1rm',
  'test-strict-pullup-max',
  'test-farmer-carry',
  'test-ab-wheel-max',
  'test-leg-raise-max',
] as const;

/** §12 : le combine intermédiaire ne teste aucun 1RM. */
export const COMBINE_S8_METRICS = COMBINE_METRICS.filter((m) => !m.endsWith('-1rm'));

/** §13 — objectifs à 12 semaines, pour l'écran Progression. */
export const TARGETS_12_WEEKS: Record<string, { start: string; target: string }> = {
  'test-deadlift-1rm': { start: '130 kg', target: '150-155 kg' },
  'test-squat-1rm': { start: '140 kg', target: '150-155 kg' },
  'test-bench-1rm': { start: '120 kg', target: '125-127,5 kg' },
  'test-weighted-pullup-1rm': { start: '≈ +42 kg', target: '+47,5 kg' },
  'test-strict-pullup-max': { start: '≈ 20', target: '22-25' },
  'test-broad-jump': { start: 'référence', target: '+5 à 8 %' },
  'test-vertical-jump': { start: 'référence', target: '+4 à 6 cm' },
  'test-sprint-10m': { start: 'référence', target: '−2 à 4 %' },
  'test-farmer-carry': { start: 'référence', target: '+20 % de distance' },
  'test-ab-wheel-max': { start: 'référence', target: '+20-30 % de reps' },
  'test-bodyweight': { start: '78 kg', target: '78-81 kg' },
};
