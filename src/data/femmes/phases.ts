/**
 * Les 3 phases, transcrites mot pour mot de la §2 du .md.
 *
 * Un point de vigilance : les valeurs écrites en intervalle dans le programme
 * (« 3-4 tours », « repos 45-60 s », « planche 20-30 s ») restent des
 * INTERVALLES ici. Choisir 3 ou 4 tours pour la semaine 4 est une décision,
 * pas une donnée : elle est prise dans `engine/progression.ts`, où elle est
 * visible et testable.
 */

import {
  adjustable,
  bodyweight,
  fixedLoad,
  minutesWork,
  noLoad,
  reps,
  secondsWork,
  type IntroItem,
  type Phase,
  type PhaseId,
  type WeekIndex,
} from './types';

/**
 * L'ÉCHAUFFEMENT, validé par Guillaume le 12 novembre.
 *
 * Il remplace l'intro respiratoire de la base d'origine — respiration
 * diaphragmatique, activation du transverse, synchronisation périnée —
 * conçue pour une reprise post-partum. Le programme MAJK s'adresse à
 * toutes : cet échauffement-ci ne suppose rien d'une grossesse.
 *
 * Ses trois derniers mouvements sont DÉJÀ au circuit du programme : il
 * prépare donc exactement ce que la séance va demander, et aucun mouvement
 * n'a été inventé pour l'occasion.
 *
 * Il tient sans matériel, à la maison comme en salle, en cinq minutes.
 */
export const ECHAUFFEMENT: IntroItem[] = [
  {
    id: 'marche',
    label: 'Marche sur place ou vélo',
    detail:
      'Deux minutes, allure tranquille. Le but est d’avoir chaud, pas d’être essoufflée : tu dois pouvoir parler.',
  },
  {
    id: 'epaules',
    label: 'Cercles d’épaules puis de bras',
    detail:
      '10 cercles d’épaules en arrière, puis 10 grands cercles de bras. Amplitude complète, sans forcer sur la fin.',
  },
  {
    id: 'bassin',
    label: 'Cercles de bassin',
    detail:
      '10 dans un sens, 10 dans l’autre. Pieds écartés largeur de hanches, genoux souples, le mouvement vient des hanches.',
  },
  {
    id: 'squat-echauffement',
    label: 'Squat au poids du corps, lent',
    detail:
      '10 répétitions, descente en trois temps. On cherche l’amplitude du jour, pas la profondeur maximale.',
  },
  {
    id: 'fentes-echauffement',
    label: 'Fentes alternées sans charge',
    detail: '6 par jambe, en alternant. Genou arrière vers le sol sans le toucher, buste droit.',
  },
  {
    id: 'birddog-echauffement',
    label: 'Bird-dog',
    detail:
      '6 par côté. Bras et jambe opposés, dos immobile. C’est le dos qui travaille à ne PAS bouger.',
  },
];

/**
 * Le kettlebell 8 kg et les haltères 2 kg sont le matériel disponible à la
 * maison : la charge n'y bouge pas, c'est le volume qui progresse.
 */
const KB8 = () => fixedLoad(8, 'kettlebell 8 kg');
const DB2 = () => fixedLoad(2, 'haltères 2 kg');

export const PHASES: Record<PhaseId, Phase> = {
  1: {
    id: 1,
    name: 'Réactivation',
    weeks: [1, 2],
    objective:
      'Réveiller le gainage profond, remettre le corps en mouvement, aucune charge lourde.',
    sessionsPerWeek: 3,
    durationLabel: '20 min',
    tours: 3,
    restSec: 45,
    notes: [
      'Marche 10-15 min possible en plus, pas obligatoire.',
      'Aucune charge lourde cette phase : si un exercice demande un effort maximal, c’est qu’il est mal dosé.',
    ],
    circuit: [
      {
        slotId: 'p1-squat',
        maison: 'squat-pdc',
        salle: 'presse-cuisses',
        work: reps(12),
        load: { maison: bodyweight(), salle: adjustable(null, 5, 'machine') },
        note: 'En salle : charge légère.',
      },
      {
        slotId: 'p1-fente',
        maison: 'fentes-statiques',
        salle: 'fentes-marchees-legeres',
        work: reps(10, true, 'jambe'),
        load: { maison: bodyweight(), salle: adjustable(null, 1, 'pair') },
        note: 'En salle : à vide ou haltères légers.',
      },
      {
        slotId: 'p1-fessier',
        maison: 'pont-fessier',
        salle: 'hip-thrust-banc',
        work: reps(15),
        load: { maison: bodyweight(), salle: adjustable(null, 2.5, 'machine') },
      },
      {
        slotId: 'p1-tirage',
        maison: 'rowing-halteres-2kg',
        salle: 'tirage-horizontal-poulie',
        work: reps(12),
        load: { maison: DB2(), salle: adjustable(null, 2.5, 'machine') },
      },
      {
        slotId: 'p1-core',
        maison: 'bird-dog',
        salle: 'bird-dog-sol',
        work: reps(10, true, 'côté'),
        load: { maison: bodyweight(), salle: bodyweight() },
      },
    ],
  },

  2: {
    id: 2,
    name: 'Construction',
    weeks: [3, 4, 5],
    objective: 'Introduction du kettlebell 8 kg (maison) ou de charges équivalentes (salle).',
    sessionsPerWeek: 4,
    durationLabel: '30 min',
    tours: { min: 3, max: 4 },
    restSec: { min: 45, max: 60 },
    notes: [
      'La planche sort du programme si une douleur limite un mouvement (§1). L’appli la remplace d’elle-même, elle ne la retire pas.',
    ],
    circuit: [
      {
        slotId: 'p2-squat',
        maison: 'goblet-squat-kb',
        salle: 'goblet-squat-haltere',
        work: reps(10),
        load: { maison: KB8(), salle: adjustable(8, 2, 'single') },
      },
      {
        slotId: 'p2-hinge',
        maison: 'deadlift-kb',
        salle: 'sdt-roumain-halteres',
        work: reps(10),
        load: { maison: KB8(), salle: adjustable(6, 2, 'pair') },
      },
      {
        slotId: 'p2-fente',
        maison: 'fentes-marchees',
        salle: 'fentes-marchees-halteres',
        work: reps(10, true, 'jambe'),
        load: { maison: bodyweight(), salle: adjustable(4, 2, 'pair') },
      },
      {
        slotId: 'p2-tirage',
        maison: 'rowing-kb',
        salle: 'tirage-poulie-unilateral',
        work: reps(10, true, 'bras'),
        load: { maison: KB8(), salle: adjustable(null, 2.5, 'machine') },
      },
      {
        slotId: 'p2-core',
        maison: 'planche-genoux',
        salle: 'planche-genoux-salle',
        work: secondsWork({ min: 20, max: 30 }),
        load: { maison: bodyweight(), salle: bodyweight() },
      },
      {
        slotId: 'p2-fessier',
        maison: 'pont-fessier-unilateral',
        salle: 'pont-fessier-unilateral-banc',
        work: reps(10, true, 'jambe'),
        load: { maison: bodyweight(), salle: bodyweight() },
      },
    ],
  },

  3: {
    id: 3,
    name: 'Intensification',
    weeks: [6, 7, 8],
    objective: 'Volume complet, mouvements explosifs, gainage complet.',
    sessionsPerWeek: 4,
    durationLabel: '35-45 min',
    tours: 4,
    restSec: { min: 30, max: 45 },
    notes: [
      'Cardio en option : 1-2 séances de 15-20 min selon son envie et son ressenti, jamais imposé.',
      'Sur les mouvements explosifs, on arrête la série dès que la qualité baisse — une répétition molle n’apporte rien et coûte cher.',
    ],
    circuit: [
      {
        slotId: 'p3-hinge',
        maison: 'swing-kb',
        salle: 'swing-ou-sdt-explosif',
        work: reps(12),
        load: { maison: KB8(), salle: adjustable(8, 2, 'single') },
      },
      {
        slotId: 'p3-squat',
        maison: 'squat-saute',
        salle: 'squat-guide',
        work: reps(12),
        load: { maison: bodyweight(), salle: adjustable(null, 5, 'machine') },
        note: 'Maison : squat sauté ou squat tempo. Salle : squat guidé ou squat sauté.',
      },
      {
        slotId: 'p3-fente',
        maison: 'fentes-bulgares-chaise',
        salle: 'fentes-bulgares-banc',
        work: reps(10, true, 'jambe'),
        load: { maison: bodyweight(), salle: adjustable(4, 2, 'pair') },
      },
      {
        slotId: 'p3-tirage',
        maison: 'rowing-presse-halteres',
        salle: 'tirage-developpe-poulie',
        work: reps(12),
        load: { maison: DB2(), salle: adjustable(null, 2.5, 'machine') },
      },
      {
        slotId: 'p3-core',
        maison: 'planche-complete',
        salle: 'planche-complete-salle',
        work: secondsWork({ min: 30, max: 45 }),
        load: { maison: bodyweight(), salle: bodyweight() },
      },
      {
        slotId: 'p3-dos',
        maison: 'superman',
        salle: 'extension-lombaire-banc',
        work: reps(15),
        load: { maison: bodyweight(), salle: bodyweight() },
      },
    ],
  },
};

/** Phase d'une semaine donnée. */
export function phaseOf(week: WeekIndex): Phase {
  if (week <= 2) return PHASES[1];
  if (week <= 5) return PHASES[2];
  return PHASES[3];
}

/** Le cardio optionnel de la phase 3, sous forme de séance courte. */
export const CARDIO = {
  work: minutesWork({ min: 15, max: 20 }),
  load: noLoad(),
  sessionsPerWeek: { min: 1, max: 2 },
  label: 'Cardio optionnel',
  detail:
    'Selon son envie et son ressenti, jamais imposé. Marche rapide ou corde à sauter à la maison, vélo ou tapis en salle.',
};
