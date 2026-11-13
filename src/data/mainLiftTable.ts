/**
 * §9 — Charges semaine par semaine.
 *
 * Transcription littérale du tableau du .md. C'est LA source de vérité des
 * charges de départ. `src/data/mainLiftTable.test.ts` relit le fichier
 * `programme-final-12-semaines.md` et vérifie chaque case.
 *
 * TOUTES les colonnes indexées sur un maximum sont calées sur les 1RM
 * réellement testés au combine initial — back squat 110 (estimé 140 avant le
 * test), bench 115 (estimé 120), deadlift 140 (estimé 130), tractions lestées
 * +45 (estimé +42) — et non sur les estimations d'avant le combine. Chaque case
 * garde le pourcentage que le programme visait, appliqué au vrai maximum,
 * arrondi au 2,5 kg.
 *
 * Le back squat était de loin le plus faux : six semaines sur douze demandaient
 * plus de 100 % du vrai max, dont un 5 × 4 à 110 kg en semaine 3 — le 1RM
 * exact, cinq fois quatre répétitions. Ce n'étaient pas des séances dures,
 * c'étaient des séances qui ne pouvaient pas exister.
 *
 * LE RDL n'est PAS indexé : kilos absolus, plafond de RPE, règle de
 * progression propre. Il ne bouge pas, parce que rien ne le mesure.
 *
 * LE PUSH PRESS l'est depuis que le §12 le teste. C'était la dernière colonne
 * à servir les kilos de l'auteur à tout le monde ; le raisonnement complet,
 * et la preuve que la colonne n'a pas changé de contenu, sont au-dessus de
 * `pushPress`.
 *
 * Rappel de la règle décidée avec Guillaume : ce tableau n'est qu'un plan par
 * défaut. Dès qu'une séance dévie, la charge réelle devient la nouvelle base
 * (`applyProgression`). En revanche la colonne RPE reste fixe : c'est elle
 * qu'on compare au RPE ressenti.
 */

import {
  attempts,
  reps,
  rpe,
  rpeAtMost,
  pct,
  forme,
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
  p(5, 5, pct(70, 'back-squat', 77.5), rpe(7)),
  p(5, 5, pct(75, 'back-squat', 82.5), rpe(7.5)),
  p(5, 4, pct(80, 'back-squat', 87.5), rpe(8)),
  p(3, 3, pct(64, 'back-squat', 70), rpe(5)),
  // S5-7 : remplacé par le Pin Squat (§8). « — » au tableau §9.
  null,
  null,
  null,
  p(3, 3, pct(70, 'back-squat', 77.5), rpe(5)),
  p(4, 2, pct(84, 'back-squat', 92.5), null, { contrast: true, note: CONTRASTE }),
  p(4, 2, pct(86, 'back-squat', 95), null, { contrast: true, note: CONTRASTE }),
  p(4, r1to2, pct(89, 'back-squat', 97.5), null, { contrast: true, note: CONTRASTE }),
  p(3, 2, pct(70, 'back-squat', 77.5), rpeRange(5, 6), { note: 'Puis TEST 1RM le samedi.' }),
];

/** Colonne « Bench (mer) ». */
const benchPress: LiftSchedule = [
  p(5, 5, pct(74, 'bench-press', 85), rpe(7)),
  p(5, 5, pct(76, 'bench-press', 87.5), rpe(7.5)),
  p(5, 4, pct(78, 'bench-press', 90), rpe(8)),
  p(3, 3, pct(67, 'bench-press', 77.5), rpe(5)),
  p(5, 3, pct(83, 'bench-press', 95), rpe(8)),
  p(4, 3, pct(85, 'bench-press', 97.5), rpe(8.5)),
  p(4, 2, pct(89, 'bench-press', 102.5), rpe(9)),
  p(3, 3, pct(72, 'bench-press', 82.5), rpe(5)),
  p(4, 2, pct(83, 'bench-press', 95), null, { contrast: true, note: CONTRASTE }),
  p(4, 2, pct(85, 'bench-press', 97.5), null, { contrast: true, note: CONTRASTE }),
  p(4, r1to2, pct(89, 'bench-press', 102.5), null, { contrast: true, note: CONTRASTE }),
  p(3, 2, pct(72, 'bench-press', 82.5), rpeAtMost(6), {
    note: 'Placé le lundi, après le squat (décision de Guillaume). TEST 1RM le dimanche.',
  }),
];

/** Colonne « Deadlift (sam) ». */
const deadlift: LiftSchedule = [
  p(4, 5, pct(70, 'deadlift', 105), rpe(7)),
  p(4, 5, pct(75, 'deadlift', 110), rpe(7.5)),
  p(4, 4, pct(80, 'deadlift', 115), rpe(8)),
  p(3, 3, pct(64, 'deadlift', 92.5), rpe(5)),
  p(4, 3, pct(82, 'deadlift', 117.5), rpe(8)),
  p(3, 3, pct(86, 'deadlift', 125), rpe(8.5)),
  p(3, 2, pct(89, 'deadlift', 130), rpe(9)),
  p(3, 3, pct(70, 'deadlift', 97.5), rpe(5)),
  p(3, 2, pct(84, 'deadlift', 120), null, { contrast: true, note: CONTRASTE }),
  p(3, 2, pct(86, 'deadlift', 127.5), null, { contrast: true, note: CONTRASTE }),
  p(3, r1to2, pct(89, 'deadlift', 130), null, { contrast: true, note: CONTRASTE }),
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
  p(4, 5, pct(44, 'weighted-pullup', 20), rpe(7)),
  p(4, 5, pct(50, 'weighted-pullup', 22.5), rpe(7.5)),
  p(4, 4, pct(56, 'weighted-pullup', 25), rpe(8)),
  p(3, 3, pct(22, 'weighted-pullup', 10), rpe(5)),
  p(4, 3, pct(67, 'weighted-pullup', 30), rpe(8)),
  p(4, 3, pct(72, 'weighted-pullup', 32.5), rpe(8.5)),
  p(4, 2, pct(78, 'weighted-pullup', 35), rpe(9)),
  p(3, 2, pct(33, 'weighted-pullup', 15), rpe(5)),
  p(3, 3, pct(67, 'weighted-pullup', 30), null, { note: 'Intention explosive (§8).' }),
  p(3, 3, pct(72, 'weighted-pullup', 32.5), null, { note: 'Intention explosive (§8).' }),
  p(3, 2, pct(78, 'weighted-pullup', 35), null, { note: 'Intention explosive (§8).' }),
  test1RM('TEST 1RM le dimanche.'),
];

/**
 * Colonne « Push Press (ven) » — indexée depuis que le §12 la mesure.
 *
 * RPE : §7 « ≤ 7 » pour S1-3, §8 « RPE 6-7 » pour S5-7 et S9-11,
 * §8 deload « zéro série au-dessus de RPE 6 » pour S4 et S8.
 *
 * ── Pourquoi elle n'est plus en kilos ─────────────────────────────────────
 *
 * Elle l'était pour une raison honnête : aucun maximum de push press n'avait
 * jamais été mesuré, et le §9 écrivait noir sur blanc qu'« aucune de ses
 * cases ne tombe sur un pourcentage d'un maximum testé — leur donner un
 * pourcentage serait en inventer un ».
 *
 * Le combine le teste maintenant (décision de Guillaume : un polyarticulaire
 * chargé mérite une charge mesurée, même travaillé en vitesse). Le
 * pourcentage n'est donc plus une invention, c'est une lecture.
 *
 * ── D'où sortent ces douze pourcentages ───────────────────────────────────
 *
 * LA FORME DE LA COLONNE N'A PAS BOUGÉ D'UN GRAMME. Ce sont les mêmes
 * rapports de semaine à semaine que le programme écrivait : 1 — 1,05 — 1,10 —
 * 0,90 — 1,10 — 1,15 — 1,20 — 0,90 — 1,15 — 1,20 — 1,25 — 1.
 *
 * Il fallait une base. Le programme en donne UNE, et une seule : la semaine
 * 11 est écrite « 6 × 2, RPE 6-7 ». Six séries de doubles à deux répétitions
 * en réserve, c'est 81 % d'un maximum — ce n'est pas un avis, c'est ce que
 * dit n'importe quelle table de RPE. 62,5 kg à 81 % donnent 77,5.
 *
 * Deux vérifications indépendantes, et c'est ce qui emporte la décision :
 *
 *   1. Appliqués à 77,5 kg, les douze pourcentages redonnent EXACTEMENT les
 *      douze kilos d'origine au 2,5 kg près. Un test le prouve case par case.
 *      Même méthode et même preuve que pour les quatre colonnes déjà
 *      indexées.
 *   2. 77,5 kg, c'est 67 % du bench mesuré à 115. Le rapport push press /
 *      bench vaut 0,65 à 0,75 chez à peu près tout le monde. La colonne était
 *      donc cohérente depuis le début avec un push press d'environ 77,5 kg —
 *      personne ne l'avait écrit, mais elle le supposait.
 *
 * La semaine 1 tombe alors à 65 % pour un 5 × 3 annoncé « RPE ≤ 7 ». C'est
 * largement sous le plafond, et c'est voulu : les trois premières semaines
 * sont techniques sur un mouvement que Guillaume découvre, exactement comme
 * pour le Hang High Pull du même jour.
 */
const pushPress: LiftSchedule = [
  p(5, 3, pct(65, 'push-press', 50), rpeAtMost(7)),
  p(5, 3, pct(68, 'push-press', 52.5), rpeAtMost(7)),
  p(6, 2, pct(71, 'push-press', 55), rpeAtMost(7)),
  p(3, 3, pct(58, 'push-press', 45), rpeAtMost(6)),
  p(6, 2, pct(71, 'push-press', 55), rpeRange(6, 7)),
  p(6, 2, pct(74, 'push-press', 57.5), rpeRange(6, 7)),
  p(6, 2, pct(77, 'push-press', 60), rpeRange(6, 7)),
  p(3, 2, pct(58, 'push-press', 45), rpeAtMost(6)),
  p(6, 2, pct(74, 'push-press', 57.5), rpeRange(6, 7)),
  p(6, 2, pct(77, 'push-press', 60), rpeRange(6, 7)),
  p(6, 2, pct(81, 'push-press', 62.5), rpeRange(6, 7)),
  p(3, 2, pct(65, 'push-press', 50), rpeAtMost(6), {
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
  p(3, 6, pct(55, 'back-squat', 60), rpe(7)),
  p(3, 6, pct(55, 'back-squat', 60), rpe(7)),
  p(3, 6, pct(57, 'back-squat', 62.5), rpe(7)),
  p(2, 5, pct(45, 'back-squat', 50), rpeAtMost(6)),
  p(4, 5, pct(59, 'back-squat', 65), null),
  p(4, 4, pct(64, 'back-squat', 70), null),
  p(4, 4, pct(64, 'back-squat', 70), null),
  p(2, 4, pct(50, 'back-squat', 55), rpeAtMost(6)),
  p(3, 3, pct(64, 'back-squat', 70), rpe(7)),
  p(3, 3, pct(66, 'back-squat', 72.5), rpe(7)),
  p(3, 3, pct(68, 'back-squat', 75), rpe(7)),
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
  p(6, 2, pct(55, 'back-squat', 60), null, { note: '55 % du 1RM — vitesse maximale.' }),
  p(6, 2, pct(55, 'back-squat', 60), null, { note: '55 % du 1RM — vitesse maximale.' }),
  p(6, 2, pct(55, 'back-squat', 60), null, { note: '55 % du 1RM — vitesse maximale.' }),
  p(4, 2, pct(50, 'back-squat', 55), null, {
    note: 'Deload : volume divisé, intention conservée.',
  }),
  p(6, 2, pct(60, 'back-squat', 65), null, { note: '60 % du 1RM.' }),
  p(6, 2, pct(60, 'back-squat', 65), null, { note: '60 % du 1RM.' }),
  p(6, 2, pct(60, 'back-squat', 65), null, { note: '60 % du 1RM.' }),
  p(4, 2, pct(50, 'back-squat', 55), null, { note: 'Deload.' }),
  p(8, 2, pct(60, 'back-squat', 65), null, { note: '60 % du 1RM — 8 séries (§8).' }),
  p(8, 2, pct(60, 'back-squat', 65), null, { note: '60 % du 1RM — 8 séries (§8).' }),
  p(8, 2, pct(60, 'back-squat', 65), null, { note: '60 % du 1RM — 8 séries (§8).' }),
  p(2, 2, pct(50, 'back-squat', 55), null, {
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
 *           Ces deux kilos sont 80 % du PRÉVISIONNEL : `deloadFromRealFactor`
 *           les fait recalculer sur ce qui a vraiment été soulevé, sans quoi
 *           ils ne descendent de rien dès que le réel s'en écarte. C'est la
 *           seule ligne du tableau dont le deload est écrit comme une
 *           proportion — les autres ont leur propre règle (§8).
 */
const romanianDeadlift: LiftSchedule = [
  p(3, 8, forme(80), rpe(7)),
  p(3, 8, forme(85), rpe(7)),
  p(3, 8, forme(90), rpe(7)),
  p(2, 8, forme(72.5), rpeAtMost(6), {
    deloadFromRealFactor: 0.8,
    note: 'Deload : 80 % de la semaine 3.',
  }),
  p(3, 6, forme(90), null),
  p(4, 5, forme(92.5), null),
  p(4, 5, forme(95), null),
  p(2, 5, forme(75), rpeAtMost(6), {
    deloadFromRealFactor: 0.8,
    note: 'Deload : 80 % de la semaine 7.',
  }),
  p(3, 5, forme(90, 95), rpe(7), { note: 'Plafond assumé à 95 kg.' }),
  p(3, 5, forme(90, 95), rpe(7), { note: 'Plafond assumé à 95 kg.' }),
  p(3, 5, forme(90, 95), rpe(7), { note: 'Plafond assumé à 95 kg.' }),
  null, // absent du taper
];

/**
 * Pin Squat — lundi des semaines 5 à 7 seulement (§8, hors tableau §9).
 *
 * Mêmes séries, reps et RPE que le Back Squat qu'il remplace. Les kilos
 * sont une FORME (comme le RDL) : la référence individuelle de Guillaume,
 * établie sur une performance réelle (110 kg, 4 × 2, RPE 9, sans rebond).
 *
 * - Une installation déjà en cours les voit tels quels.
 * - Un nouvel utilisateur ne les voit pas : il choisit sa charge au RPE en
 *   semaine 5, et la forme se cale sur ce qu'il a vraiment soulevé.
 * - Ensuite, le recalage sur le réel et le §11 s'appliquent comme partout.
 *
 * Aucun coefficient back squat → pin squat : ces kilos ne dépendent d'aucun
 * 1RM, et aucun 1RM n'est recalculé à partir d'eux.
 */
const pinSquat: LiftSchedule = [
  null,
  null,
  null,
  null,
  p(5, 3, forme(95, 100), rpe(8)),
  p(4, 3, forme(100, 105), rpe(8.5)),
  p(4, 2, forme(110), rpe(9)),
  null,
  null,
  null,
  null,
  null,
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
  'pin-squat': pinSquat,
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
