/**
 * §9 — Charges semaine par semaine.
 *
 * Transcription littérale du tableau du .md. C'est LA source de vérité des
 * charges de départ. `src/data/mainLiftTable.test.ts` relit le fichier
 * `programme-final-12-semaines.md` et vérifie chaque case.
 *
 * Rappel de la règle décidée avec Guillaume : ce tableau n'est qu'un plan par
 * défaut. Dès qu'une séance dévie, la charge réelle devient la nouvelle base
 * (`applyProgression`). En revanche la colonne RPE reste fixe : c'est elle
 * qu'on compare au RPE ressenti.
 */

import { roundToStep } from '../engine/rounding';
import {
  attempts,
  bb,
  added,
  reps,
  rpe,
  rpeAtMost,
  rpeRange,
  type LiftSchedule,
  type LoadSpec,
  type MainLiftId,
  type MainLiftTable,
  type Reps,
  type RPETarget,
  type WeekPrescription,
} from './types';

// --- petits constructeurs, pour que le tableau reste lisible ligne à ligne ---

const p = (
  sets: number,
  r: Reps,
  load: LoadSpec | null,
  targetRPE: RPETarget | null,
  extra: Partial<WeekPrescription> = {},
): WeekPrescription => ({ sets, work: reps(r), load, targetRPE, ...extra });

/** Semaine de test 1RM : aucune charge planifiée, on suit le protocole §12. */
const test1RM = (note: string): WeekPrescription => ({
  sets: 1,
  work: attempts(1),
  load: null,
  targetRPE: null,
  isTest: true,
  note,
});

/** « 1-2 » du tableau semaine 11. */
const r1to2 = { min: 1, max: 2 };

// --- notes récurrentes ------------------------------------------------------

const CONTRASTE = 'Contraste : série lourde → 2 min → explosif → 2 min → série suivante.';

// ---------------------------------------------------------------------------
// Les 7 colonnes du tableau §9
// ---------------------------------------------------------------------------

/**
 * Colonne « Back Squat (lun) ».
 * RPE S9-11 : absent du .md (le bloc puissance est piloté par la vitesse de
 * barre, §8), laissé à `null` volontairement — voir note dans README.
 */
const backSquat: LiftSchedule = [
  p(5, 5, bb(100), rpe(7)),
  p(5, 5, bb(105), rpe(7.5)),
  p(5, 4, bb(110), rpe(8)),
  p(3, 3, bb(90), rpe(5)),
  p(5, 3, bb(115), rpe(8)),
  p(4, 3, bb(120), rpe(8.5)),
  p(4, 2, bb(125), rpe(9)),
  p(3, 3, bb(97.5), rpe(5)),
  p(4, 2, bb(117.5), null, { contrast: true, note: CONTRASTE }),
  p(4, 2, bb(120), null, { contrast: true, note: CONTRASTE }),
  p(4, r1to2, bb(125), null, { contrast: true, note: CONTRASTE }),
  p(3, 2, bb(97.5), rpeRange(5, 6), { note: 'Puis TEST 1RM le samedi.' }),
];

/** Colonne « Bench (mer) ». */
const benchPress: LiftSchedule = [
  p(5, 5, bb(87.5), rpe(7)),
  p(5, 5, bb(90), rpe(7.5)),
  p(5, 4, bb(95), rpe(8)),
  p(3, 3, bb(80), rpe(5)),
  p(5, 3, bb(100), rpe(8)),
  p(4, 3, bb(102.5), rpe(8.5)),
  p(4, 2, bb(107.5), rpe(9)),
  p(3, 3, bb(85), rpe(5)),
  p(4, 2, bb(100), null, { contrast: true, note: CONTRASTE }),
  p(4, 2, bb(102.5), null, { contrast: true, note: CONTRASTE }),
  p(4, r1to2, bb(107.5), null, { contrast: true, note: CONTRASTE }),
  p(3, 2, bb(85), rpeAtMost(6), {
    note: 'Placé le lundi, après le squat (décision de Guillaume). TEST 1RM le dimanche.',
  }),
];

/** Colonne « Deadlift (sam) ». */
const deadlift: LiftSchedule = [
  p(4, 5, bb(97.5), rpe(7)),
  p(4, 5, bb(102.5), rpe(7.5)),
  p(4, 4, bb(107.5), rpe(8)),
  p(3, 3, bb(85), rpe(5)),
  p(4, 3, bb(110), rpe(8)),
  p(3, 3, bb(115), rpe(8.5)),
  p(3, 2, bb(120), rpe(9)),
  p(3, 3, bb(90), rpe(5)),
  p(3, 2, bb(112.5), null, { contrast: true, note: CONTRASTE }),
  p(3, 2, bb(117.5), null, { contrast: true, note: CONTRASTE }),
  p(3, r1to2, bb(120), null, { contrast: true, note: CONTRASTE }),
  test1RM('TEST 1RM le mercredi.'),
];

/**
 * Colonne « Tractions lestées (mer) ».
 *
 * Le tableau ne porte aucun RPE sur cette colonne, et §7 n'en donne un que
 * pour la semaine 1. Décision de Guillaume : on aligne la cible sur le bench
 * de la même semaine — même séance, même schéma 5×5 → 5×3 → 4×2. Les semaines
 * 9-11 restent donc à `null`, comme le bench : bloc contraste, la vitesse
 * pilote, pas de progression automatique.
 */
const weightedPullup: LiftSchedule = [
  p(4, 5, added(17.5), rpe(7)),
  p(4, 5, added(20), rpe(7.5)),
  p(4, 4, added(22.5), rpe(8)),
  p(3, 3, added(10), rpe(5)),
  p(4, 3, added(27.5), rpe(8)),
  p(4, 3, added(30), rpe(8.5)),
  p(4, 2, added(32.5), rpe(9)),
  p(3, 2, added(15), rpe(5)),
  p(3, 3, added(27.5), null, { note: 'Intention explosive (§8).' }),
  p(3, 3, added(30), null, { note: 'Intention explosive (§8).' }),
  p(3, 2, added(32.5), null, { note: 'Intention explosive (§8).' }),
  test1RM('TEST 1RM le dimanche.'),
];

/**
 * Colonne « Push Press (ven) ».
 * RPE : §7 « ≤ 7 » pour S1-3, §8 « RPE 6-7 » pour S5-7 et S9-11,
 * §8 deload « zéro série au-dessus de RPE 6 » pour S4 et S8.
 */
const pushPress: LiftSchedule = [
  p(5, 3, bb(50), rpeAtMost(7)),
  p(5, 3, bb(52.5), rpeAtMost(7)),
  p(6, 2, bb(55), rpeAtMost(7)),
  p(3, 3, bb(45), rpeAtMost(6)),
  p(6, 2, bb(55), rpeRange(6, 7)),
  p(6, 2, bb(57.5), rpeRange(6, 7)),
  p(6, 2, bb(60), rpeRange(6, 7)),
  p(3, 2, bb(45), rpeAtMost(6)),
  p(6, 2, bb(57.5), rpeRange(6, 7)),
  p(6, 2, bb(60), rpeRange(6, 7)),
  p(6, 2, bb(62.5), rpeRange(6, 7)),
  p(3, 2, bb(50), rpeAtMost(6), {
    note: 'Placé le lundi, après le squat (décision de Guillaume).',
  }),
];

/**
 * Colonne « Front Squat (sam) ».
 * S8 = 70 kg : c'est la valeur du tableau. La formule de deload (80 % de 90 =
 * 72,5) donnerait 72,5 mais §9 fait foi pour les mouvements tabulés.
 */
const frontSquat: LiftSchedule = [
  p(3, 6, bb(75), rpe(7)),
  p(3, 6, bb(77.5), rpe(7)),
  p(3, 6, bb(80), rpe(7)),
  p(2, 5, bb(65), rpeAtMost(6)),
  p(4, 5, bb(82.5), null),
  p(4, 4, bb(87.5), null),
  p(4, 4, bb(90), null),
  p(2, 4, bb(70), rpeAtMost(6)),
  p(3, 3, bb(90), rpe(7)),
  p(3, 3, bb(92.5), rpe(7)),
  p(3, 3, bb(95), rpe(7)),
  null, // « — » : absent de la semaine 12
];

/**
 * Colonne « Speed Squat (ven) ».
 * Jamais de RPE : l'exercice est piloté par la vitesse (§7 « arrêt dès que la
 * vitesse baisse visiblement »). Les pourcentages viennent de §7 et §8.
 */
const speedSquat: LiftSchedule = [
  p(6, 2, bb(77.5), null, { note: '55 % — vitesse maximale.' }),
  p(6, 2, bb(77.5), null, { note: '55 % — vitesse maximale.' }),
  p(6, 2, bb(80), null, { note: '55 % — vitesse maximale.' }),
  p(4, 2, bb(70), null, { note: 'Deload : volume divisé, intention conservée.' }),
  p(6, 2, bb(85), null, { note: '60 %.' }),
  p(6, 2, bb(85), null, { note: '60 %.' }),
  p(6, 2, bb(85), null, { note: '60 %.' }),
  p(4, 2, bb(70), null, { note: 'Deload.' }),
  p(8, 2, bb(85), null, { note: '60 % — 8 séries (§8).' }),
  p(8, 2, bb(85), null, { note: '60 % — 8 séries (§8).' }),
  p(8, 2, bb(87.5), null, { note: '60 % — 8 séries (§8).' }),
  p(2, 2, bb(70), null, {
    note: 'Après les tests athlétiques du vendredi, charge légère (décision de Guillaume).',
  }),
];

// ---------------------------------------------------------------------------
// 8e ligne : RDL. Absent du tableau §9, ses charges viennent de §7 et §8.
// ---------------------------------------------------------------------------

/**
 * S1-3 : §7 (« 3 × 8 × 80 kg », « S2 : 85 kg, S3 : 90 kg »).
 * S5-7 : §8 « 3 × 6 × 90 kg → 4 × 5 × 92,5-95 kg », découpé 90 / 92,5 / 95.
 * S9-11 : §8 « 3 × 5 × 90-95 kg RPE 7 » → plancher 90, plafond assumé 95.
 * S4 / S8 : règle générale de deload — 80 % de la dernière semaine non-deload,
 *           2 séries, reps conservées. 90 × 0,8 → 72,5 ; 95 × 0,8 → 75.
 */
const romanianDeadlift: LiftSchedule = [
  p(3, 8, bb(80), rpe(7)),
  p(3, 8, bb(85), rpe(7)),
  p(3, 8, bb(90), rpe(7)),
  p(2, 8, bb(72.5), rpeAtMost(6), { note: 'Deload : 80 % de la semaine 3.' }),
  p(3, 6, bb(90), null),
  p(4, 5, bb(92.5), null),
  p(4, 5, bb(95), null),
  p(2, 5, bb(75), rpeAtMost(6), { note: 'Deload : 80 % de la semaine 7.' }),
  p(3, 5, bb(90, 95), rpe(7), { note: 'Plafond assumé à 95 kg.' }),
  p(3, 5, bb(90, 95), rpe(7), { note: 'Plafond assumé à 95 kg.' }),
  p(3, 5, bb(90, 95), rpe(7), { note: 'Plafond assumé à 95 kg.' }),
  null, // absent du taper
];

// ---------------------------------------------------------------------------

export const MAIN_LIFT_TABLE: MainLiftTable = {
  'back-squat': backSquat,
  'bench-press': benchPress,
  deadlift,
  'weighted-pullup': weightedPullup,
  'push-press': pushPress,
  'front-squat': frontSquat,
  'speed-squat': speedSquat,
  rdl: romanianDeadlift,
};

// ---------------------------------------------------------------------------
// Recalage sur les 1RM réellement testés
// ---------------------------------------------------------------------------

/**
 * Les 1RM avec lesquels le tableau du §9 a été écrit.
 *
 * Ce ne sont PAS des mesures : ce sont les estimations faites avant le combine
 * initial, du temps où personne n'avait encore testé quoi que ce soit. Chaque
 * case du tableau est un pourcentage de ces valeurs — 100 kg de squat en
 * semaine 1, c'est 71 % de 140.
 *
 * Le jour où le combine donne les vrais maxima, les pourcentages ne changent
 * pas ; c'est la base qui change. D'où ce tableau : il sert de dénominateur.
 */
export const REFERENCE_1RM = {
  'back-squat': 140,
  'bench-press': 120,
  deadlift: 130,
  'weighted-pullup': 42,
} as const;

export type CalibratedLift = keyof typeof REFERENCE_1RM;

/**
 * Quel 1RM testé pilote chaque colonne du tableau.
 *
 * Quatre mouvements sont testés au combine et se recalent sur eux-mêmes. Les
 * trois autres n'ont pas de 1RM propre :
 *
 * - front squat et speed squat sont des variantes de squat, chargées en
 *   pourcentage du back squat (§7 : « 55-60 % » pour le speed squat). Ils
 *   suivent donc le back squat ;
 * - le push press est une poussée verticale, la seule référence testée qui
 *   s'en approche est le bench. Le lien est plus lâche, mais laisser le push
 *   press seul figé pendant que tout le reste bouge serait pire.
 *
 * Le RDL n'est pas dans le tableau §9 : ses charges viennent d'ailleurs.
 */
const CALIBRATION_BASE: Partial<Record<MainLiftId, CalibratedLift>> = {
  'back-squat': 'back-squat',
  'bench-press': 'bench-press',
  deadlift: 'deadlift',
  'weighted-pullup': 'weighted-pullup',
  'front-squat': 'back-squat',
  'speed-squat': 'back-squat',
  'push-press': 'bench-press',
};

/** 1RM testés, tels qu'ils arrivent des Réglages. Clés absentes = non testé. */
export type TestedOneRM = Partial<Record<CalibratedLift, number>>;

/**
 * Facteur à appliquer aux charges d'une colonne.
 *
 * Vaut exactement 1 tant qu'aucun test n'a été saisi, ou quand le test tombe
 * sur la valeur de référence : le tableau du .md reste alors intact, au
 * kilogramme près. Rien ne bouge tant que Guillaume n'a pas recalé.
 */
export function calibrationFactor(lift: MainLiftId, tested: TestedOneRM | undefined): number {
  const base = CALIBRATION_BASE[lift];
  if (!base || !tested) return 1;
  const kg = tested[base];
  if (typeof kg !== 'number' || kg <= 0) return 1;
  return kg / REFERENCE_1RM[base];
}

/** Applique le facteur à une prescription, en respectant le pas de la charge. */
function calibrate(
  presc: WeekPrescription,
  lift: MainLiftId,
  tested: TestedOneRM | undefined,
): WeekPrescription {
  const factor = calibrationFactor(lift, tested);
  if (factor === 1 || !presc.load || !('kg' in presc.load) || presc.load.kg === null) {
    return presc;
  }
  const load = presc.load;
  const kg = roundToStep(load.kg * factor, load.step);
  return {
    ...presc,
    load: {
      ...load,
      kg,
      ...('kgMax' in load && typeof load.kgMax === 'number'
        ? { kgMax: roundToStep(load.kgMax * factor, load.step) }
        : {}),
    },
  };
}

/**
 * Prescription du tableau pour une semaine donnée.
 *
 * @param week 1 à 12. Renvoie `null` hors de cet intervalle ou si le mouvement
 *             n'est pas programmé cette semaine-là.
 * @param tested 1RM réellement testés. Omis = le tableau de référence tel quel.
 */
export function prescriptionFor(
  lift: MainLiftId,
  week: number,
  tested?: TestedOneRM,
): WeekPrescription | null {
  if (week < 1 || week > 12) return null;
  const presc = MAIN_LIFT_TABLE[lift][week - 1] ?? null;
  return presc && calibrate(presc, lift, tested);
}
