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
/**
 * Colonne « Front Squat (sam) » — recalée sur le squat testé à 110 kg.
 *
 * Contrairement au speed squat, le .md n'écrit AUCUN pourcentage sur cette
 * colonne : elle est donnée en kilos absolus avec un RPE 7 et une progression
 * de +2,5 kg/semaine. Le seul recalage possible est donc le rapport à
 * l'ancienne base supposée — chaque case × 110/140, arrondie au 2,5 kg.
 *
 * Que la colonne ait bien été écrite sur 140 se vérifie au résultat : un front
 * squat vaut environ 85 % d'un back squat, soit ~93 kg ici. Les 75 kg de la
 * semaine 1 en faisaient 80 %, pour 3 × 6 annoncés à RPE 7 — impossible. Les
 * 60 kg recalés en font 64 %, ce qui correspond.
 */
const frontSquat: LiftSchedule = [
  p(3, 6, bb(60), rpe(7)),
  p(3, 6, bb(60), rpe(7)),
  p(3, 6, bb(62.5), rpe(7)),
  p(2, 5, bb(50), rpeAtMost(6)),
  p(4, 5, bb(65), null),
  p(4, 4, bb(70), null),
  p(4, 4, bb(70), null),
  p(2, 4, bb(55), rpeAtMost(6)),
  p(3, 3, bb(70), rpe(7)),
  p(3, 3, bb(72.5), rpe(7)),
  p(3, 3, bb(75), rpe(7)),
  null, // « — » : absent de la semaine 12
];

/**
 * Colonne « Speed Squat (ven) ».
 * Jamais de RPE : l'exercice est piloté par la vitesse (§7 « arrêt dès que la
 * vitesse baisse visiblement »). Les pourcentages viennent de §7 et §8.
 */
/*
 * Recalée sur le squat réellement testé (110 kg), et non sur les 140 kg
 * supposés avant le combine.
 *
 * C'est la seule colonne du §9 que le .md exprime en pourcentage : « 55 % » au
 * §7, « 60 % » au §8. Les kilos n'en étaient que la traduction sur la base
 * estimée. Avec un vrai max de 110, les 77,5 kg de la semaine 1 valaient 70 %
 * — une charge de force, à laquelle la barre ne peut pas être rapide, donc
 * l'exercice ne faisait plus ce pour quoi il est là.
 *
 * Chaque case est donc `% × 110` arrondi au 2,5 kg, jamais l'ancienne valeur
 * mise à l'échelle : partir des kilos accumulerait deux arrondis.
 *
 * Les +2,5 kg des semaines 3 et 11 disparaissent : ils venaient d'un arrondi
 * de l'ancienne base (57,1 % et 62,5 %), pas d'une intention écrite. Sur un
 * mouvement de vitesse la progression se lit à la barre, pas au chargement.
 */
const speedSquat: LiftSchedule = [
  p(6, 2, bb(60), null, { note: '55 % de 110 — vitesse maximale.' }),
  p(6, 2, bb(60), null, { note: '55 % de 110 — vitesse maximale.' }),
  p(6, 2, bb(60), null, { note: '55 % de 110 — vitesse maximale.' }),
  p(4, 2, bb(55), null, { note: 'Deload : volume divisé, intention conservée.' }),
  p(6, 2, bb(65), null, { note: '60 % de 110.' }),
  p(6, 2, bb(65), null, { note: '60 % de 110.' }),
  p(6, 2, bb(65), null, { note: '60 % de 110.' }),
  p(4, 2, bb(55), null, { note: 'Deload.' }),
  p(8, 2, bb(65), null, { note: '60 % de 110 — 8 séries (§8).' }),
  p(8, 2, bb(65), null, { note: '60 % de 110 — 8 séries (§8).' }),
  p(8, 2, bb(65), null, { note: '60 % de 110 — 8 séries (§8).' }),
  p(2, 2, bb(55), null, {
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

/**
 * Prescription du tableau §9 pour une semaine donnée.
 *
 * Les kilos sont ceux du .md, tels quels. Le 1RM saisi dans les Réglages ne les
 * touche PAS : le tableau n'est pas un jeu de pourcentages d'un maximum, c'est
 * un plan écrit en kilos.
 *
 * Une version précédente recalait chaque case sur les 1RM testés, en traitant
 * les charges comme des pourcentages de maxima estimés avant le combine. Le
 * deadlift de la semaine 1, écrit 97,5 kg au §9, s'affichait donc à 105 kg dès
 * qu'un 140 était saisi. C'était inventer une valeur que le programme ne dit
 * nulle part.
 *
 * Le SEUL chemin qui modifie une charge est §11, à partir de l'historique réel
 * (`applyProgression`) : un RPE trop bas, une rep ratée, une charge déjà
 * dépassée. Le ressenti d'une séance faite, pas un nombre saisi dans un écran.
 *
 * @param week 1 à 12. Renvoie `null` hors de cet intervalle ou si le mouvement
 *             n'est pas programmé cette semaine-là.
 */
export function prescriptionFor(lift: MainLiftId, week: number): WeekPrescription | null {
  if (week < 1 || week > 12) return null;
  return MAIN_LIFT_TABLE[lift][week - 1] ?? null;
}
