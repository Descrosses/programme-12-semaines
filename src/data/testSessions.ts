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
  w(60, 5),
  w(80, 3),
  w(100, 2),
  w(115, 1),
  w(130, 1),
  a(142.5),
  a(147.5, true),
];

/** « 60×5 / 80×3 / 95×1 / 107,5×1 / 117,5 / 122,5 / 125 » */
export const RAMP_BENCH: RampStep[] = [
  w(60, 5),
  w(80, 3),
  w(95, 1),
  w(107.5, 1),
  a(117.5),
  a(122.5),
  a(125, true),
];

/** « 60×5 / 80×3 / 100×2 / 115×1 / 130×1 / 137,5 / 142,5 / 147,5 selon vitesse » */
export const RAMP_DEADLIFT: RampStep[] = [
  w(60, 5),
  w(80, 3),
  w(100, 2),
  w(115, 1),
  w(130, 1),
  a(137.5),
  a(142.5, true),
  a(147.5, true),
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
  w(47.5, 5),
  w(62.5, 3),
  w(77.5, 2),
  w(90, 1),
  w(102.5, 1),
  a(112.5),
  a(117.5, true),
  a(122.5, true),
];

/** 115 mesuré → essais 117,5 (record) / 120 / 122,5 (cible §13). */
export const RAMP_BENCH_S12: RampStep[] = [
  w(57.5, 5),
  w(77.5, 3),
  w(90, 1),
  w(102.5, 1),
  a(117.5),
  a(120, true),
  a(122.5, true),
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
  w(65, 5),
  w(85, 3),
  w(107.5, 2),
  w(125, 1),
  w(130, 1),
  a(147.5),
  a(155, true),
  a(162.5, true),
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
  durationLabel: '65-75 min',
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
  durationLabel: '35-45 min',
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
  durationLabel: '55-60 min',
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
  durationLabel: '50-60 min',
  intensity: 'TEST',
  warmup: 'upper',
  readinessTest: false,
  notes: [
    'Le bench ne fatigue ni la préhension ni le dos : il ne compromet pas le test de demain.',
  ],
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
  durationLabel: '20-30 min',
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
  durationLabel: '45-55 min',
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
  durationLabel: '25-35 min',
  intensity: 'TEST',
  warmup: 'upper',
  readinessTest: false,
  notes: ['Tests d’abord, puis la séance du dimanche en version deload.'],
  slots: [
    t('test-ab-wheel-max', maxSet(), 0),
    t('test-leg-raise-max', maxSet(), 0),
    {
      exId: 'incline-db-press',
      sets: 2,
      work: reps(8),
      load: dbPair(24),
      targetRPE: rpe(6),
      restSec: 90,
    },
    {
      exId: 'one-arm-cable-row',
      sets: 2,
      work: reps(10, true),
      load: noLoad(),
      targetRPE: rpe(6),
      restSec: 75,
    },
    /*
     * Le Woodchop, et non la Landmine Rotation : depuis que celle-ci vit au
     * vendredi, la programmer ici la ferait apparaître deux fois dans la
     * même semaine — ce que §11 lit mal, et qu'un test du programme
     * interdit explicitement en dehors du Broad Jump.
     */
    {
      exId: 'cable-chop',
      sets: 2,
      work: reps(5, true),
      load: noLoad(),
      targetRPE: rpe(6),
      restSec: 60,
      note: 'Deload : rotation lente et contrôlée, aucune série à l’échec.',
    },
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
  durationLabel: '45-55 min',
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
    {
      exId: 'ab-wheel',
      sets: 2,
      work: reps(6),
      load: bodyweight(),
      targetRPE: rpe(5),
      restSec: 60,
    },
    fromTable(
      'bench-press',
      'bench-press',
      120,
      'Léger, vitesse de barre. Aucune progression automatique en taper.',
    ),
    fromTable(
      'push-press',
      'push-press',
      120,
      'Léger, vitesse de barre. Aucune progression automatique en taper.',
    ),
  ],
};

const S12_MERCREDI: SessionBlueprint = {
  day: 2,
  title: 'TEST Deadlift 1RM',
  durationLabel: '55-60 min',
  intensity: 'TEST',
  warmup: 'lower',
  readinessTest: false,
  notes: [
    'Rien d’autre aujourd’hui.',
    'Les paliers affichés sont ceux du test initial : au-delà de 147,5 kg, monte à la sensation et à la vitesse de barre.',
  ],
  slots: [
    oneRM(
      'test-deadlift-1rm',
      RAMP_DEADLIFT_S12,
      'Si la barre ralentit franchement, c’est le max.',
    ),
  ],
};

const S12_VENDREDI: SessionBlueprint = {
  day: 4,
  title: 'Tests athlétiques',
  durationLabel: '35-45 min max',
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
    fromTable(
      'speed-squat',
      'speed-squat',
      90,
      'Charge légère, juste pour garder la sensation de mouvement.',
    ),
  ],
};

const S12_SAMEDI: SessionBlueprint = {
  day: 5,
  title: 'TEST Back Squat 1RM + Farmer',
  durationLabel: '60-70 min',
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
  durationLabel: '90-95 min',
  intensity: 'TEST',
  warmup: 'upper',
  readinessTest: false,
  notes: ['Dernière séance du programme. Note tout.'],
  slots: [
    oneRM('test-bench-1rm', RAMP_BENCH_S12),
    oneRM(
      'test-weighted-pullup-1rm',
      RAMP_PULLUP_S12,
      'Repos 4 min. Dead hang, menton franchement au-dessus.',
    ),
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
  return specialSession(week, day)?.title.startsWith('Combine') ?? false;
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
/**
 * Un objectif de fin de programme.
 *
 * ── Pourquoi deux formes ───────────────────────────────────────────────────
 *
 * Le §13 écrit ses cibles de deux façons, et la différence est fondamentale
 * dès qu'il y a plus d'un utilisateur.
 *
 * Les cibles RELATIVES — « +5 à 8 % de broad jump », « −2 à 4 % sur 10 m » —
 * sont la méthode du programme. Elles valent pour n'importe qui et s'affichent
 * telles quelles.
 *
 * Les cibles ABSOLUES — « 117,5-122,5 kg au squat » — sont la méthode
 * appliquée AUX MAXIMA DE GUILLAUME. Les servir à quelqu'un d'autre n'a aucun
 * sens : un débutant à 70 kg de squat ne vise pas 122,5 kg en douze semaines,
 * et un powerlifter à 200 kg ne vise pas une régression. Seul le GAIN est
 * transposable, et il ne se calcule qu'une fois la performance initiale
 * connue.
 *
 * ── Et quand il n'y a pas de règle ─────────────────────────────────────────
 *
 * `kind: 'aucune'` n'est pas un oubli. Le §13 ne donne pas de cible pour le
 * sprint 20 m, et le poids de corps n'en reçoit plus : une bande 77-80 kg est
 * l'objectif personnel de Guillaume, pas une recommandation de santé qu'on
 * impose à un inconnu. Un objectif qu'on ne sait pas justifier ne s'invente
 * pas — il s'affiche « à définir ».
 */
export type Cible =
  /** Texte du programme, valable pour tout le monde. */
  | { kind: 'relatif'; label: string }
  /**
   * Gain à appliquer à la performance initiale de l'utilisateur.
   *
   * Les bornes viennent des cibles §13 divisées par les maxima que Guillaume
   * a mesurés : 117,5 ÷ 110 et 122,5 ÷ 110 donnent +6,8 % et +11,4 %. Ce ne
   * sont donc pas des nombres inventés, c'est la même méthode exprimée dans
   * la seule unité qui voyage d'un utilisateur à l'autre.
   */
  | { kind: 'gain'; minPct: number; maxPct: number; unite: 'kg' | 'reps'; lest?: boolean }
  /** Aucune cible chiffrable : le programme n'en donne pas. */
  | { kind: 'aucune' };

export const TARGETS_12_WEEKS: Record<string, Cible> = {
  /*
   * Le gain le plus élevé du tableau, et le seul qui mérite une réserve : ces
   * +16 à +20 % avaient été écrits sur un deadlift estimé à 130 que le
   * programme annonçait lui-même comme sous-estimé, puis mesuré à 140. La
   * cible n'a pas été recalculée, seul le dénominateur a changé.
   */
  'test-deadlift-1rm': { kind: 'gain', minPct: 16.1, maxPct: 19.6, unite: 'kg' },
  'test-squat-1rm': { kind: 'gain', minPct: 6.8, maxPct: 11.4, unite: 'kg' },
  'test-bench-1rm': { kind: 'gain', minPct: 4.3, maxPct: 6.5, unite: 'kg' },
  /* Le gain porte sur le LEST, pas sur poids de corps + lest : +45 → +50. */
  'test-weighted-pullup-1rm': { kind: 'gain', minPct: 11.1, maxPct: 11.1, unite: 'kg', lest: true },
  'test-strict-pullup-max': { kind: 'gain', minPct: 11.1, maxPct: 27.8, unite: 'reps' },
  'test-broad-jump': { kind: 'relatif', label: '+5 à 8 %' },
  'test-vertical-jump': { kind: 'relatif', label: '+4 à 6 cm' },
  'test-sprint-10m': { kind: 'relatif', label: '−2 à 4 %' },
  /* Libellés recopiés mot pour mot du §13 : « distance », pas « de distance ». */
  'test-farmer-carry': { kind: 'relatif', label: '+20 % distance' },
  'test-ab-wheel-max': { kind: 'relatif', label: '+20-30 % reps' },
  /* Le §13 n'en donne pas. Ne pas confondre avec « pas encore mesuré ». */
  'test-sprint-20m': { kind: 'aucune' },
  'test-bodyweight': { kind: 'aucune' },
};

/**
 * L'objectif affiché pour une mesure, sachant ce que l'utilisateur a fait au
 * combine initial.
 *
 * `null` en entrée — rien de mesuré — donne `null` en sortie : on ne calcule
 * pas un objectif sur une performance qu'on n'a pas. L'écran affiche alors
 * « à définir », et c'est la bonne réponse, pas un pis-aller.
 */
export function cibleFor(id: string, initial: number | null): string | null {
  const c = TARGETS_12_WEEKS[id];
  if (!c || c.kind === 'aucune') return null;
  if (c.kind === 'relatif') return c.label;
  if (initial === null || !Number.isFinite(initial) || initial <= 0) return null;

  const pas = c.unite === 'reps' ? 1 : 2.5;
  const arrondi = (v: number) => Math.round(v / pas) * pas;
  const bas = arrondi(initial * (1 + c.minPct / 100));
  const haut = arrondi(initial * (1 + c.maxPct / 100));
  const signe = c.lest ? '+' : '';
  const unite = c.unite === 'reps' ? '' : ' kg';
  const nb = (v: number) => String(v).replace('.', ',');

  return bas === haut ? `${signe}${nb(bas)}${unite}` : `${signe}${nb(bas)}-${nb(haut)}${unite}`;
}

/**
 * §13 — la bande de poids visée, en chiffres utilisables par un graphique.
 *
 * La même valeur existe déjà en texte dans `TARGETS_12_WEEKS['test-bodyweight']`
 * (« 77-80 kg »), mais un SVG a besoin de deux nombres. Les deux formes sont
 * tenues ensemble par un test de transcription : si le .md passe un jour à
 * 78-81, le test tombe ici et là, pas seulement sur l'une des deux.
 *
 * C'est la SEULE borne de poids que le .md donne. Aucun autre seuil — « trop
 * vite », « trop lent » — ne doit être inventé à partir d'elle.
 */
export const BANDE_CIBLE_POIDS = { min: 77, max: 80 } as const;
