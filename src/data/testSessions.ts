/**
 * §12 — Combines, et §8 semaine 12 — Taper + tests.
 *
 * Ces séances ne se déduisent d'aucune trame : elles sont écrites en toutes
 * lettres dans le programme, donc transcrites en toutes lettres ici.
 *
 * COMBINE INITIAL — six jours, semaine 0 (décision de Guillaume, après une
 * première version à trois jours).
 *
 * Le problème de la version à trois jours : elle enchaînait tractions lestées
 * 1RM et tractions strictes max sur deux jours consécutifs, sans récupération
 * de la préhension ni du dos entre deux efforts maximaux.
 *
 * La règle qui a produit la répartition ci-dessous : jamais deux efforts de
 * tirage ou de préhension à moins de 48 h.
 *
 *   lundi    sauts, sprints, SQUAT 1RM
 *   mardi    TRACTIONS LESTÉES 1RM, seule
 *   mercredi repos
 *   jeudi    DEADLIFT 1RM, seul            ← 48 h après les tractions lestées
 *   vendredi BENCH 1RM, ab wheel max
 *   samedi   tractions strictes max, leg raise max, farmer carry  ← 48 h après
 *   dimanche repos complet
 *   lundi    début de la semaine 1, à froid
 *
 * Le deadlift est le mieux protégé des quatre : un jour de repos complet la
 * veille. C'est voulu — son 1RM alimente tout le tableau de charges du §9, et
 * l'écart deadlift − squat est le critère central du §13. Le tester bas
 * fausserait douze semaines.
 *
 * Le Farmer Carry a quitté le lundi pour le samedi : sa préhension chargée
 * empêchait les tractions lestées du mardi. Il est donc mesuré en fin de
 * séance, préhension déjà fatiguée — mais à l'identique aux semaines 8 et 12,
 * donc les trois combines restent comparables. C'est ce qu'exige le §12 : même
 * protocole, pas protocole parfait.
 *
 * Le poids de corps ne figure dans AUCUNE de ces séances : §12 demande « une
 * moyenne de 3 matins, à jeun », un relevé fait à la maison sur plusieurs
 * jours. Il se saisit dans Réglages et se reporte dans l'écran Combine.
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

/*
 * Deux jeux de paliers, et c'est volontaire.
 *
 * Ceux du test INITIAL sont ceux du §12, transcrits tels quels. Ils avaient été
 * écrits sur des maxima estimés avant le combine — un squat supposé à 140, un
 * deadlift à 130. Ce sont les paliers qui ont réellement été montés ce jour-là :
 * les réécrire après coup reviendrait à réécrire la séance qui a produit les
 * mesures.
 *
 * Ceux du test FINAL sont recalculés sur les maxima MESURÉS. Réutiliser les
 * premiers en semaine 12 ferait monter le squat par 100 / 115 / 130 pour un 1RM
 * mesuré à 110 : trois séries au-dessus du maximum avant le premier essai.
 * C'est ce que faisait l'appli jusqu'ici.
 *
 * Méthode, identique à celle du §9 et du §13 : les mêmes rapports de montée que
 * le §12, appliqués au maximum mesuré, arrondis au 2,5 kg. Les essais vont du
 * record personnel à la cible du §13.
 */

// --- Test initial (§12) — maxima estimés d'avant combine ---------------------

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

// --- Test final (semaine 12) — maxima mesurés au combine ---------------------

/** Les 1RM du combine initial. Ce sont eux qui calibrent les paliers ci-dessous. */
export const MESURES_COMBINE = {
  'back-squat': 110,
  'bench-press': 115,
  deadlift: 140,
  'weighted-pullup': 45,
} as const;

/** 110 mesuré → essais 112,5 (record) / 117,5 / 122,5 (cible §13). */
export const RAMP_SQUAT_S12: RampStep[] = [
  w(47.5, 5), w(62.5, 3), w(77.5, 2), w(90, 1), w(102.5, 1), a(112.5), a(117.5, true), a(122.5, true),
];

/** 115 mesuré → essais 117,5 (record) / 120 / 122,5 (cible §13). */
export const RAMP_BENCH_S12: RampStep[] = [
  w(57.5, 5), w(77.5, 3), w(90, 1), w(102.5, 1), a(117.5), a(120, true), a(122.5, true),
];

/**
 * 140 mesuré → essais 147,5 / 155 / 162,5.
 *
 * Le §12 finissait son échauffement à 130, soit 100 % du maximum supposé —
 * l'auteur compensait un 130 qu'il annonçait lui-même comme sous-estimé. Le
 * combine a donné 140 : le dernier palier revient à 93 %, parce qu'un maximum
 * mesuré ne se soulève pas à l'échauffement.
 *
 * Le 162,5 est la borne BASSE de la cible §13, déjà +16 % en douze semaines.
 * C'est un troisième essai, pas un objectif. Le 167,5 du haut de la bande n'est
 * volontairement pas un palier — voir la réserve sur TARGETS_12_WEEKS.
 */
export const RAMP_DEADLIFT_S12: RampStep[] = [
  w(65, 5), w(85, 3), w(107.5, 2), w(125, 1), w(130, 1), a(147.5), a(155, true), a(162.5, true),
];

/** +45 mesuré → essais +47,5 (record) / +50 (cible §13) / +52,5. */
export const RAMP_PULLUP_S12: RampStep[] = [
  { kg: 20, reps: 3, added: true },
  { kg: 30, reps: 1, added: true },
  { kg: 40, reps: 1, added: true },
  { kg: 47.5, reps: 1, added: true, attempt: true },
  { kg: 50, reps: 1, added: true, attempt: true, optional: true },
  { kg: 52.5, reps: 1, added: true, attempt: true, optional: true },
];

export const RAMPS_S12 = {
  'back-squat': RAMP_SQUAT_S12,
  'bench-press': RAMP_BENCH_S12,
  deadlift: RAMP_DEADLIFT_S12,
  'weighted-pullup': RAMP_PULLUP_S12,
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
// Semaine 0 — combine initial, cinq séances sur six jours
// ---------------------------------------------------------------------------

/** Lundi — le jour qui fixe la référence de readiness pour les 12 semaines. */
const COMBINE_LUNDI: SessionBlueprint = {
  day: 0,
  title: 'Combine initial — sauts, sprints, squat 1RM',
  durationLabel: '75 min',
  intensity: 'TEST',
  warmup: 'lower',
  readinessTest: false,
  notes: [
    'Même lieu, mêmes chaussures, même protocole, idéalement même heure — c’est ce qui rendra les trois combines comparables.',
    'Ton meilleur broad jump d’aujourd’hui devient ta référence de readiness pour les 12 semaines.',
    'Sauts et sprints avant le squat : peu fatigants, et ils préparent le système nerveux.',
    'Le poids de corps ne se prend pas ici : c’est une moyenne de 3 matins à jeun, à saisir dans Réglages.',
  ],
  slots: [
    t('test-broad-jump', attempts(3), 180),
    t('test-vertical-jump', attempts(5), 90),
    t('test-sprint-10m', attempts(4), 240, 'Si la surface ne s’y prête pas, saute ce test.'),
    t('test-sprint-20m', attempts(4), 240),
    oneRM('test-squat-1rm', RAMP_SQUAT, '147,5 seulement si 142,5 passe proprement.'),
  ],
};

/** Mardi — seule, pour arriver frais sur la préhension. */
const COMBINE_MARDI: SessionBlueprint = {
  day: 1,
  title: 'Combine initial — tractions lestées 1RM',
  durationLabel: '40 min',
  intensity: 'TEST',
  warmup: 'upper',
  readinessTest: false,
  notes: [
    'Séance volontairement courte : rien d’autre aujourd’hui.',
    'Repos 4 min entre les tentatives. Dead hang, menton franchement au-dessus.',
  ],
  slots: [oneRM('test-weighted-pullup-1rm', RAMP_PULLUP)],
};

/** Jeudi — le lift prioritaire du programme, précédé d'un repos complet. */
const COMBINE_JEUDI: SessionBlueprint = {
  day: 3,
  title: 'Combine initial — deadlift 1RM',
  durationLabel: '45 min',
  intensity: 'TEST',
  warmup: 'lower',
  readinessTest: false,
  notes: [
    'Jamais squat et deadlift 1RM le même jour — ici trois jours les séparent.',
    'Le mercredi de repos est là pour ce test : c’est ton 1RM le plus important, il alimente tout le tableau de charges.',
    'Rien d’autre aujourd’hui. Si la barre ralentit franchement, c’est le max.',
  ],
  slots: [oneRM('test-deadlift-1rm', RAMP_DEADLIFT)],
};

/** Vendredi — le bench ne touche ni la préhension ni les lats. */
const COMBINE_VENDREDI: SessionBlueprint = {
  day: 4,
  title: 'Combine initial — bench 1RM + ab wheel',
  durationLabel: '55 min',
  intensity: 'TEST',
  warmup: 'upper',
  readinessTest: false,
  notes: ['Le bench ne fatigue ni la préhension ni le dos : il ne compromet pas le test de demain.'],
  slots: [oneRM('test-bench-1rm', RAMP_BENCH), t('test-ab-wheel-max', maxSet(), 0)],
};

/**
 * Samedi — les trois tests « jusqu'à l'épuisement », aucun 1RM.
 *
 * Les grouper est assumé : ils sollicitent tous la préhension, donc les deux
 * derniers seront sous-estimés. Mais ils le seront de la même façon aux
 * semaines 8 et 12, et c'est la comparaison qui compte. L'ordre est fixe :
 * tractions d'abord, c'est le test prioritaire.
 */
const COMBINE_SAMEDI: SessionBlueprint = {
  day: 5,
  title: 'Combine initial — tractions max, leg raise, farmer',
  durationLabel: '50 min',
  intensity: 'TEST',
  warmup: 'upper',
  readinessTest: false,
  notes: [
    '48 h après le deadlift : ta préhension et ton dos sont récupérés.',
    'Ordre imposé, et le même aux trois combines : tractions, puis leg raise, puis farmer.',
    'Demain, repos complet. La semaine 1 démarre lundi, à froid.',
  ],
  slots: [
    t('test-strict-pullup-max', maxSet(), 0, 'Poitrine à la barre.'),
    t('test-leg-raise-max', maxSet(), 0),
    t('test-farmer-carry', maxSet(), 0, 'Haltères 2 × 40 kg, distance max sans poser.'),
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
  day: 5,
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
  day: 6,
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
  day: 2,
  title: 'TEST Deadlift 1RM',
  durationLabel: '45 min',
  intensity: 'TEST',
  warmup: 'lower',
  readinessTest: false,
  notes: [
    'Rien d’autre aujourd’hui.',
    'Les paliers affichés sont ceux du test initial : au-delà de 147,5 kg, monte à la sensation et à la vitesse de barre.',
  ],
  slots: [oneRM('test-deadlift-1rm', RAMP_DEADLIFT_S12, 'Si la barre ralentit franchement, c’est le max.')],
};

const S12_VENDREDI: SessionBlueprint = {
  day: 4,
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
  day: 5,
  title: 'TEST Back Squat 1RM + Farmer',
  durationLabel: '60 min',
  intensity: 'TEST',
  warmup: 'lower',
  readinessTest: true,
  notes: ['Un squat propre à 152,5 vaut plus qu’un grinder hideux à 160.'],
  slots: [
    oneRM('test-squat-1rm', RAMP_SQUAT_S12),
    t('test-farmer-carry', maxSet(), 0, 'Haltères 2 × 40 kg, distance max sans poser.'),
  ],
};

const S12_DIMANCHE: SessionBlueprint = {
  day: 6,
  title: 'TEST Bench + tractions + tronc',
  durationLabel: '75 min',
  intensity: 'TEST',
  warmup: 'upper',
  readinessTest: false,
  notes: ['Dernière séance du programme. Note tout.'],
  slots: [
    oneRM('test-bench-1rm', RAMP_BENCH_S12),
    oneRM('test-weighted-pullup-1rm', RAMP_PULLUP_S12, 'Repos 4 min. Dead hang, menton franchement au-dessus.'),
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
  { week: 0, day: 0, blueprint: COMBINE_LUNDI },
  { week: 0, day: 1, blueprint: COMBINE_MARDI },
  { week: 0, day: 3, blueprint: COMBINE_JEUDI },
  { week: 0, day: 4, blueprint: COMBINE_VENDREDI },
  { week: 0, day: 5, blueprint: COMBINE_SAMEDI },
  { week: 8, day: 5, blueprint: COMBINE_S8_SAMEDI },
  { week: 8, day: 6, blueprint: COMBINE_S8_DIMANCHE },
  { week: 12, day: 0, blueprint: S12_LUNDI },
  { week: 12, day: 2, blueprint: S12_MERCREDI },
  { week: 12, day: 4, blueprint: S12_VENDREDI },
  { week: 12, day: 5, blueprint: S12_SAMEDI },
  { week: 12, day: 6, blueprint: S12_DIMANCHE },
];

/** Séance écrite en toutes lettres pour cette case du calendrier, sinon `null`. */
export function specialSession(week: number, day: DayIndex): SessionBlueprint | null {
  return SPECIAL_SESSIONS.find((s) => s.week === week && s.day === day)?.blueprint ?? null;
}

/**
 * Jour de combine ? Sert au rappel de poids de corps sur l'écran Aujourd'hui :
 * la moyenne de 3 matins doit être prête AVANT, pas relevée sur place.
 */
export function isCombineDay(week: number, day: DayIndex): boolean {
  return (
    specialSession(week, day)?.title.startsWith('Combine') ?? false
  );
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
/**
 * §13 — cibles à 12 semaines, transcrites du .md.
 *
 * Les départs sont ceux du COMBINE INITIAL et non les estimations d'avant test.
 * Le squat avait été estimé à 140 pour 110 réels : garder l'ancienne cible de
 * 150-155 kg revenait à demander +40 kg en douze semaines.
 *
 * Chaque cible garde la progression relative que le programme visait, appliquée
 * au vrai départ — squat +7 à +11 %, bench +4 à +6 %, tractions lestées +13 %,
 * deadlift +15 à +19 %.
 */
export const TARGETS_12_WEEKS: Record<string, { start: string; target: string }> = {
  /*
   * Seule ligne à prendre comme une borne haute : ces +15 à +19 % avaient été
   * écrits sur un 130 que le programme annonçait lui-même comme sous-estimé.
   * Appliqués aux 140 mesurés, ils demandent +22,5 à +27,5 kg.
   */
  'test-deadlift-1rm': { start: '140 kg', target: '162,5-167,5 kg' },
  'test-squat-1rm': { start: '110 kg', target: '117,5-122,5 kg' },
  'test-bench-1rm': { start: '115 kg', target: '120-122,5 kg' },
  'test-weighted-pullup-1rm': { start: '+45 kg', target: '+50 kg' },
  'test-strict-pullup-max': { start: '18', target: '20-23' },
  'test-broad-jump': { start: 'référence', target: '+5 à 8 %' },
  'test-vertical-jump': { start: 'référence', target: '+4 à 6 cm' },
  'test-sprint-10m': { start: 'référence', target: '−2 à 4 %' },
  'test-farmer-carry': { start: 'référence', target: '+20 % de distance' },
  'test-ab-wheel-max': { start: 'référence', target: '+20-30 % de reps' },
  'test-bodyweight': { start: '77 kg', target: '77-80 kg' },
};
