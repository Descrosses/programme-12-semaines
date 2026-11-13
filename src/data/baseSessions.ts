/**
 * §7 — Les 5 séances de référence (forme du bloc accumulation, semaines 1-3).
 *
 * C'est l'unique trame écrite à la main. Les blocs deload, force max,
 * puissance et taper sont obtenus en appliquant `blockRules.ts` à ces cinq
 * trames — jamais en les recopiant douze fois.
 *
 * Repos : les valeurs exactes de §7 priment sur les fourchettes de §10. Quand
 * §7 donne lui-même une fourchette (« 45-60 s »), on retient la borne haute :
 * un repos raccourci sur un lift lourd transforme la force en fatigue (§10).
 */

import {
  bodyweight,
  autoreg,
  meters,
  noLoad,
  reps,
  rpe,
  rpeRange,
  textLoad,
  type DayIndex,
  type LoadSpec,
  type MainLiftId,
  type RPETarget,
  type SessionBlueprint,
  type Slot,
  type Work,
} from './types';

/** Exercice à charge fixe ou libre, décrit intégralement ici. */
const s = (
  exId: string,
  sets: number,
  work: Work,
  load: LoadSpec,
  targetRPE: RPETarget | null,
  restSec: number,
  note?: string,
): Slot => ({ exId, sets, work, load, targetRPE, restSec, ...(note ? { note } : {}) });

/**
 * Exercice piloté par le tableau §9 : séries, reps, charge et RPE sont lus
 * dans `mainLiftTable.ts` au moment de résoudre la séance.
 */
const fromTable = (exId: string, liftId: MainLiftId, restSec: number, note?: string): Slot => ({
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

const LUNDI: SessionBlueprint = {
  day: 0,
  title: 'Lower Strength — squat',
  durationLabel: '45-80 min',
  intensity: 'DUR',
  warmup: 'lower',
  readinessTest: true,
  notes: [],
  slots: [
    s('pogo-jumps', 3, reps(10), noLoad(), null, 45),
    s('box-jump', 4, reps(3), noLoad(), null, 90),
    fromTable('back-squat', 'back-squat', 210),
    /* Semaines 5 à 7 seulement : le tableau ne le programme nulle part
       ailleurs, et le Back Squat n'y est pas programmé ces semaines-là. Même
       place, même repos que le squat du bloc force (4 min). */
    fromTable('pin-squat', 'pin-squat', 240),
    s(
      'bulgarian-split-squat',
      3,
      reps(8, true, 'jambe'),
      autoreg(undefined, 2, 'dbPair'),
      rpeRange(7, 8),
      90,
    ),
    fromTable('rdl', 'rdl', 150),
    /*
     * §11 cas 9 — le levier porte la progression, pas le volume.
     * Les 3 × 8 ne bougeront pas des douze semaines : c'est la CONSIGNE
     * qui change de bloc en bloc. Une quatrième série allongerait la
     * séance sans rien rendre.
     */
    s(
      'ab-wheel',
      3,
      reps(8),
      bodyweight(),
      null,
      60,
      'À genoux. Descends aussi loin que tu peux remonter sans que le bas du dos se creuse — l’amplitude du jour, pas celle d’après.',
    ),
  ],
};

const MERCREDI: SessionBlueprint = {
  day: 2,
  title: 'Upper Strength — bench + tractions',
  durationLabel: '50-80 min',
  intensity: 'DUR',
  warmup: 'upper',
  readinessTest: false,
  notes: [],
  slots: [
    s('plyo-push-up', 4, reps(4), bodyweight(), null, 90),
    fromTable('bench-press', 'bench-press', 180),
    fromTable('weighted-pullup', 'weighted-pullup', 150),
    s(
      'landmine-press-kneeling',
      3,
      reps(8, true),
      autoreg(undefined, 2.5, 'barbell'),
      rpe(7),
      75,
      'Barre chargée.',
    ),
    s('chest-supported-row', 3, reps(8), autoreg(undefined, 2, 'dbPair'), rpe(8), 90),
    s('face-pull', 2, reps(15), autoreg(undefined, 1, 'cable'), null, 45),
    s('cable-external-rotation', 2, reps(12, true), autoreg(undefined, 1, 'cable'), null, 45),
    s('pallof-press', 3, reps(6, true), autoreg(undefined, 1, 'cable'), null, 60),
  ],
};

const VENDREDI: SessionBlueprint = {
  day: 4,
  title: 'Total Body Power',
  /*
   * 100 et non 95 depuis l'arrivée du Copenhagen Plank : la séance la plus
   * chargée des douze semaines (S9, bloc puissance) atteint 99 minutes.
   * L'étiquette dit ce que la séance fait — la raccourcir en la mentant
   * n'aurait trompé que celui qui la lit avant de partir à la salle.
   */
  durationLabel: '50-100 min',
  intensity: 'RAPIDE',
  warmup: 'lower',
  readinessTest: true,
  notes: ['Tu dois sortir en te disant « j’aurais pu en faire plus ».'],
  slots: [
    s(
      'broad-jump',
      5,
      reps(2),
      noLoad(),
      null,
      120,
      'Les 3 sauts du readiness comptent comme échauffement.',
    ),
    /*
     * Hang High Pull — deuxième, juste derrière le Broad Jump.
     *
     * Le Broad Jump garde la première place parce qu'il sert aussi de test de
     * readiness : sa mesure n'a de sens qu'à froid. Vient ensuite le mouvement
     * chargé et technique du bloc, celui qui demande le plus de fraîcheur
     * nerveuse — avant les bonds, avant la barre.
     *
     * Aucun 1RM ne le chiffre : la charge est autorégulée, amorcée à 40 kg et
     * reprise ensuite de ce qui a réellement été soulevé. 40 kg = la barre et
     * 10 kg par côté, soit 29 % du deadlift testé — assez léger pour que la
     * vitesse, et non la charge, soit ce qui limite le mouvement. C'est tout
     * l'objet de l'exercice, et c'est aussi un geste que Guillaume découvre :
     * les trois premières semaines sont techniques.
     *
     * Pas de RPE cible, volontairement : §11 reporte alors le décalage réel
     * sans proposer de règle, et c'est la vitesse de barre qui décide.
     */
    s('hang-high-pull', 3, reps(3), autoreg(undefined, 2.5, 'barbell'), null, 90),
    s('lateral-bound', 3, reps(3, true), noLoad(), null, 75),
    fromTable('push-press', 'push-press', 120),
    fromTable('speed-squat', 'speed-squat', 60),
    s('jump-squat-db', 4, reps(4), textLoad('2 × 6-8 kg'), null, 90),
    s('explosive-cable-row', 3, reps(5), autoreg(undefined, 1, 'cable'), rpe(6), 75),
    s('farmer-carry', 4, meters(25), autoreg(undefined, 2, 'dbPair'), null, 90),
    s('dead-bug-cable', 3, reps(6, true), autoreg(undefined, 1, 'cable'), null, 45),
    /*
     * Copenhagen Plank — venu du samedi, où il doublonnait avec le Suitcase
     * Carry sur la flexion latérale.
     *
     * Le vendredi n'en avait aucune : le Farmer Carry est bilatéral, donc
     * symétrique, et le Dead Bug résiste à l'extension. Il ferme la séance,
     * après le travail chargé — un exercice qui met l'adducteur en tension
     * maximale n'a rien à faire avant le Push Press ou le Speed Squat.
     */
    /*
     * Levier COURT au départ, et ce n'est pas négociable : c'est le
     * mouvement qui avait fait mal, repris après suspension (§14). La
     * jambe tendue vient au bloc suivant, si les 3 × 8 passent sans gêne.
     */
    s(
      'copenhagen-plank',
      3,
      reps(8, true),
      noLoad(),
      null,
      60,
      'Genou de la jambe haute FLÉCHI, appui sur le genou — levier court. Arrête à la gêne, pas à la douleur.',
    ),
  ],
};

const SAMEDI: SessionBlueprint = {
  day: 5,
  title: 'Posterior Chain — deadlift',
  durationLabel: '45-80 min',
  intensity: 'DUR',
  warmup: 'lower',
  readinessTest: true,
  notes: [],
  slots: [
    s('broad-jump', 3, reps(2), noLoad(), null, 90, 'Potentiation, après le readiness.'),
    fromTable('deadlift', 'deadlift', 210),
    fromTable('front-squat', 'front-squat', 120),
    s('hip-thrust', 4, reps(8), autoreg(undefined, 2.5, 'barbell'), rpe(8), 90),
    s('nordic-curl', 3, reps(5), bodyweight(), null, 120),
    s('single-leg-rdl', 3, reps(8, true), autoreg(undefined, 2, 'dbSingle'), null, 60),
    /*
     * Le Copenhagen Plank était ICI, juste au-dessus du Suitcase Carry. Il est
     * parti au vendredi, et ce n'est pas un détail de rangement : les deux
     * résistent à la FLEXION LATÉRALE, et les faire le même jour, c'est faire
     * deux fois le même travail en croyant en faire deux.
     *
     * Le vendredi est aussi le meilleur jour pour l'adducteur, qui l'avait
     * fait suspendre : deux jours après le squat du lundi, un avant le
     * deadlift d'aujourd'hui — la plus large fenêtre de la semaine.
     */
    s('suitcase-carry', 3, meters(30, true), autoreg(undefined, 2, 'dbSingle'), null, 60),
  ],
};

const DIMANCHE: SessionBlueprint = {
  day: 6,
  title: 'Upper Athletic + tronc',
  durationLabel: '30-70 min',
  intensity: 'MODÉRÉ',
  warmup: 'upper',
  readinessTest: false,
  notes: ['Pas de gros travail excentrique jambes.'],
  slots: [
    s('incline-db-press', 4, reps(8), autoreg(undefined, 2, 'dbPair'), rpeRange(7, 8), 90),
    s('neutral-grip-pullup', 4, reps({ min: 6, max: 8 }), textLoad('+5 à +10 kg'), rpe(7), 90),
    s('one-arm-cable-row', 3, reps(10, true), autoreg(undefined, 1, 'cable'), null, 75),
    s('landmine-press-standing', 3, reps(8, true), autoreg(undefined, 2.5, 'barbell'), null, 75),
    s('cable-chop', 3, reps(8, true), autoreg(undefined, 1, 'cable'), null, 60),
    /*
     * 8-12 ici, 8 à partir du bloc force max : ce n'est pas une baisse,
     * c'est le levier qui s'allonge. Les jambes passent tendues, et une
     * rep tendue vaut deux reps genoux fléchis.
     */
    s(
      'hanging-leg-raise',
      3,
      reps({ min: 8, max: 12 }),
      bodyweight(),
      null,
      60,
      'Genoux à la poitrine, sans balancier. Les 12 reps propres avant de penser aux jambes tendues.',
    ),
    /*
     * Le Bear Crawl n'est plus programmé, dès la semaine 1 — décision de
     * Guillaume. Sa fiche reste au catalogue (« on ne supprime pas
     * d'exercices existants »), comme le Zercher March : seul le créneau
     * disparaît. Le tronc du dimanche tient en deux exercices sur les douze
     * semaines, Woodchop et Hanging Leg Raise.
     */
    s(
      'conditioning',
      1,
      { kind: 'intervals', rounds: 8, workSec: 20, easySec: 70 },
      noLoad(),
      null,
      0,
      '12 min. 8/10 sur les 20 s, pas de sprint maximal.',
    ),
  ],
};

/**
 * Les cinq trames, rangées par jour réel. Mardi, mercredi et jeudi n'ont pas de
 * trame : ce sont des repos dans la semaine type (§3).
 */
export const BASE_SESSIONS: Partial<Record<DayIndex, SessionBlueprint>> = {
  0: LUNDI,
  2: MERCREDI,
  4: VENDREDI,
  5: SAMEDI,
  6: DIMANCHE,
};
