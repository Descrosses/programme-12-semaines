/**
 * Les mouvements de MASS 4, transcrits du document de référence.
 *
 * Source : `MODELE_4_SEMAINES_MASSE_CONGESTION.md`, dépôt Descrosses/Programme-Teddy-.
 * Écrit par Guillaume le 27/10/2026, version anonymisée — elle ne contient
 * aucune charge personnelle, et c'est pour cette raison que c'est elle qui
 * fait foi ici plutôt que le programme nominatif du même dépôt.
 *
 * ── La règle de transcription ──────────────────────────────────────────────
 *
 * Une consigne qui n'est pas dans le document n'est pas ici. Plusieurs
 * mouvements n'ont qu'un nom : leur en inventer une reviendrait à parler à la
 * place du programme. C'est la même règle que pour POWER 12.
 */

import type { ExerciceMass4 } from './types';

const LISTE: readonly ExerciceMass4[] = [
  // ---------------------------------------------------------------- épaules
  {
    id: 'oiseau-machine',
    nom: 'Oiseau à la machine',
    consigne: 'Reverse pec deck.',
    materiel: 'Machine',
  },
  {
    id: 'developpe-militaire-smith',
    nom: 'Développé militaire Smith',
    consigne: '6 reps lourdes avec 1 à 2 en réserve, puis aussitôt 10 à 12 reps à ≈ 60 %.',
    materiel: 'Smith machine',
  },
  {
    id: 'elevations-laterales',
    nom: 'Élévations latérales',
    consigne: '10 reps avec 2 en réserve, puis aussitôt le max de reps à ≈ 60 %.',
    materiel: 'Haltères',
  },
  {
    id: 'elevations-frontales-unilat',
    nom: 'Élévations frontales',
    consigne: 'Un bras à la fois.',
    materiel: 'Haltère',
  },
  {
    id: 'oiseau-banc-halteres',
    nom: 'Oiseau sur banc',
    materiel: 'Haltères',
  },

  // ------------------------------------------------------------------- bras
  {
    id: 'barre-au-front',
    nom: 'Barre au front',
    consigne: 'Descente 3 s en superset du lundi, 2 s en superset du samedi.',
    materiel: 'Barre EZ',
  },
  {
    id: 'curl-barre-ez',
    nom: 'Curl barre EZ',
    consigne: 'Descente 3 s.',
    materiel: 'Barre EZ',
  },
  {
    id: 'curl-halteres-alterne',
    nom: 'Curl haltères debout alterné',
    consigne: 'Descente 2 s, pic de contraction.',
    materiel: 'Haltères',
  },
  {
    id: 'curl-machine',
    nom: 'Curl machine',
    materiel: 'Machine',
  },
  {
    id: 'extension-triceps-corde',
    nom: 'Extension triceps poulie',
    consigne: 'À la corde.',
    materiel: 'Poulie',
  },
  {
    id: 'dips-banc',
    nom: 'Dips sur banc',
    consigne: 'Explosifs.',
    materiel: 'Banc',
  },

  // -------------------------------------------------------------------- dos
  {
    id: 'tirage-vertical-supination',
    nom: 'Tirage vertical prise supination',
    consigne: 'Contraction 1 s, relâchement 2 s.',
    materiel: 'Poulie haute',
  },
  {
    id: 'tirage-vertical-unilateral',
    nom: 'Tirage vertical unilatéral machine',
    consigne: 'Prise supination. Les deux côtés faits, puis la dernière contraction tenue 5 s.',
    materiel: 'Machine',
  },
  {
    id: 'tirage-horizontal-serre',
    nom: 'Tirage horizontal prise serrée',
    consigne: 'Contraction 2 s, relâchement 3 s.',
    materiel: 'Poulie basse',
  },
  {
    id: 'pull-over-poulie',
    nom: 'Pull over poulie',
    materiel: 'Poulie haute',
  },
  {
    id: 'rowing-bucheron',
    nom: 'Rowing bûcheron',
    consigne: 'Coude à 45°, pic de contraction 1 s.',
    materiel: 'Haltère',
  },
  {
    id: 'shrugs-halteres',
    nom: 'Shrugs haltères',
    consigne: 'Pic de contraction 1 s, descente 2 s.',
    materiel: 'Haltères',
  },

  // ------------------------------------------------------------------- pecs
  {
    id: 'ecarte-poulie-basse',
    nom: 'Écarté poulie basse',
    consigne: 'Du bas vers le haut.',
    materiel: 'Poulies',
  },
  {
    id: 'developpe-incline-smith',
    nom: 'Développé incliné Smith',
    consigne: '6 reps lourdes avec 1 à 2 en réserve, puis aussitôt 10 à 12 reps à ≈ 60 %.',
    materiel: 'Smith machine',
  },
  {
    id: 'developpe-couche-halteres',
    nom: 'Développé couché haltères',
    consigne: 'Contraction maximale en haut.',
    materiel: 'Haltères',
  },
  {
    id: 'ecarte-couche-halteres',
    nom: 'Écarté couché haltères',
    consigne: 'Descente 3 s, recherche d’étirement.',
    materiel: 'Haltères',
  },
  {
    id: 'pull-over-haltere',
    nom: 'Pull over haltère',
    consigne: 'Descente 3 s, recherche d’étirement.',
    materiel: 'Haltère',
  },

  // ----------------------------------------------------------------- jambes
  {
    id: 'squat-smith',
    nom: 'Squat Smith',
    consigne:
      'Descente 3 s le plus bas possible, dos droit et talons au sol, pause 1 s, remontée explosive.',
    materiel: 'Smith machine',
  },
  {
    id: 'leg-extension',
    nom: 'Leg extension',
    consigne: 'Descente 2 s, pic 1 s.',
    materiel: 'Machine',
  },
  {
    id: 'leg-curl-allonge',
    nom: 'Leg curl allongé',
    consigne: 'Descente 2 s, pic 1 s.',
    materiel: 'Machine',
  },
  {
    id: 'fentes-halteres',
    nom: 'Fentes haltères',
    consigne: 'Avant ou arrière, la même variante pendant tout le cycle.',
    materiel: 'Haltères',
  },

  // ------------------------------------------------------------------ tronc
  {
    id: 'gainage-debout-valise',
    nom: 'Gainage debout',
    consigne: 'Une haltère dans une seule main.',
    materiel: 'Haltère',
  },
  {
    id: 'ab-wheel',
    nom: 'Ab wheel',
    consigne: 'Amplitude adaptée au niveau.',
    materiel: 'Roue abdominale',
  },
  {
    id: 'roman-side-bench',
    nom: 'Roman side bench',
    materiel: 'Banc à lombaires, haltère ou kettlebell',
  },
  {
    id: 'releve-de-buste',
    nom: 'Relevé de buste',
    consigne: 'Lombaires. Descente 2 s, pic 1 s.',
    materiel: 'Banc à lombaires',
  },
];

export const EXERCICES_MASS4: Record<string, ExerciceMass4> = Object.fromEntries(
  LISTE.map((e) => [e.id, e]),
);

export const TOUS_LES_EXERCICES_MASS4 = LISTE;

/**
 * Les techniques d'intensité, telles que le document les décrit.
 *
 * Elles sont ici et non dans chaque ligne de séance : la même technique sert
 * à plusieurs mouvements, et la recopier à chaque fois la ferait diverger au
 * premier ajustement.
 */
export const TECHNIQUES: Record<string, string> = {
  'trois-series':
    'Série 1 : 8 à 10 reps (½ amplitude + amplitude complète = 1 rep), 5 s de pause, puis max de reps jusqu’à l’échec. Série 2 : 5 reps + 5 s de contraction tenue, trois fois. Série 3 : 8 à 10 reps (concentrique explosif, excentrique 3 s), 5 s de pause, puis max de reps.',
  'lourde-degressive': '6 reps lourdes (1 à 2 en réserve), puis aussitôt 10 à 12 reps à ≈ 60 %.',
  'degressive-max': '10 reps (2 en réserve), puis aussitôt le max de reps à ≈ 60 %.',
  superset: 'Deux mouvements enchaînés sans repos. Le repos vient après le duo.',
  droite: 'Séries droites, au tempo indiqué.',
};
