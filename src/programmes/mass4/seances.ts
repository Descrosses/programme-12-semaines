/**
 * Les quatre séances de MASS 4, transcrites ligne à ligne.
 *
 * Source : `MODELE_4_SEMAINES_MASSE_CONGESTION.md`, section « Les 4 séances ».
 *
 * ── Le principe qui simplifie tout ─────────────────────────────────────────
 *
 * « La même séance chaque semaine, de la semaine 1 à la semaine 4. » Il n'y a
 * donc ni bloc de périodisation, ni table de charges, ni semaine de deload.
 * La seule chose qui varie d'une semaine à l'autre est le nombre de séries
 * sur cinq mouvements, et l'alternance unilatéral / bilatéral sur deux
 * autres — les deux vivent dans `progression.ts`.
 *
 * ── Les repos à deux temps ─────────────────────────────────────────────────
 *
 * Plusieurs lignes du document écrivent « 45 s, puis 3 min ». Le premier
 * chiffre sépare les séries, le second précède l'exercice suivant. Les
 * confondre coûterait ou gagnerait dix minutes par séance, sans que rien ne
 * le signale.
 */

import type { SeanceMass4 } from './types';

export const SEANCES_MASS4: readonly SeanceMass4[] = [
  {
    jour: 0,
    titre: 'Épaules, triceps, biceps',
    lignes: [
      {
        exerciceId: 'oiseau-machine',
        series: 3,
        reps: '8-10',
        reposSec: 45,
        reposFinSec: 180,
        technique: 'trois-series',
      },
      {
        exerciceId: 'developpe-militaire-smith',
        series: 3,
        reps: '6 + 10-12',
        reposSec: 150,
        technique: 'lourde-degressive',
        serieOptionnelle: true,
      },
      {
        exerciceId: 'elevations-laterales',
        series: 3,
        reps: '10 + max',
        reposSec: 90,
        technique: 'degressive-max',
        serieOptionnelle: true,
      },
      {
        exerciceId: 'elevations-frontales-unilat',
        series: 3,
        reps: '15 / bras',
        reposSec: 60,
        technique: 'droite',
      },
      {
        exerciceId: 'oiseau-banc-halteres',
        series: 3,
        reps: '12',
        reposSec: 60,
        technique: 'droite',
      },
      {
        exerciceId: 'barre-au-front',
        series: 4,
        reps: '12',
        reposSec: null,
        technique: 'superset',
        superset: 'lun-bras',
      },
      {
        exerciceId: 'curl-barre-ez',
        series: 4,
        reps: '12',
        reposSec: 90,
        technique: 'superset',
        superset: 'lun-bras',
      },
      {
        exerciceId: 'gainage-debout-valise',
        series: 3,
        reps: '30 s / côté',
        reposSec: null,
        technique: 'droite',
      },
    ],
  },

  {
    jour: 1,
    titre: 'Dos',
    lignes: [
      {
        exerciceId: 'tirage-vertical-supination',
        series: 3,
        reps: '8',
        reposSec: 120,
        reposFinSec: 180,
        technique: 'droite',
      },
      {
        exerciceId: 'tirage-vertical-unilateral',
        series: 3,
        reps: '10-12 / côté',
        reposSec: 90,
        reposFinSec: 180,
        technique: 'droite',
      },
      {
        exerciceId: 'tirage-horizontal-serre',
        series: 3,
        reps: '10',
        reposSec: null,
        technique: 'superset',
        superset: 'mar-dos',
      },
      {
        exerciceId: 'pull-over-poulie',
        series: 3,
        reps: '10',
        reposSec: 120,
        technique: 'superset',
        superset: 'mar-dos',
      },
      {
        exerciceId: 'rowing-bucheron',
        series: 3,
        reps: '10 / bras',
        reposSec: 90,
        reposFinSec: 120,
        technique: 'droite',
      },
      {
        exerciceId: 'shrugs-halteres',
        series: 4,
        reps: '15',
        reposSec: 60,
        technique: 'droite',
      },
      {
        exerciceId: 'ab-wheel',
        series: 4,
        reps: '8',
        reposSec: 60,
        technique: 'droite',
      },
    ],
  },

  {
    jour: 3,
    titre: 'Pecs, biceps',
    lignes: [
      {
        exerciceId: 'ecarte-poulie-basse',
        series: 3,
        reps: '8-10',
        reposSec: 45,
        reposFinSec: 180,
        technique: 'trois-series',
      },
      {
        exerciceId: 'developpe-incline-smith',
        series: 3,
        reps: '6 + 10-12',
        reposSec: 150,
        technique: 'lourde-degressive',
        serieOptionnelle: true,
      },
      {
        exerciceId: 'developpe-couche-halteres',
        series: 3,
        reps: '10',
        reposSec: 90,
        technique: 'droite',
        serieOptionnelle: true,
      },
      {
        exerciceId: 'ecarte-couche-halteres',
        series: 3,
        reps: '12',
        reposSec: null,
        technique: 'superset',
        superset: 'jeu-pecs',
      },
      {
        exerciceId: 'pull-over-haltere',
        series: 3,
        reps: '12',
        reposSec: 90,
        technique: 'superset',
        superset: 'jeu-pecs',
      },
      {
        exerciceId: 'curl-halteres-alterne',
        series: 3,
        reps: '10 / bras',
        reposSec: 90,
        technique: 'droite',
      },
      {
        exerciceId: 'curl-machine',
        series: 3,
        reps: '8-10',
        reposSec: 90,
        reposFinSec: 180,
        technique: 'trois-series',
      },
      {
        exerciceId: 'roman-side-bench',
        series: 3,
        reps: '8 / côté',
        reposSec: 60,
        technique: 'droite',
      },
    ],
  },

  {
    jour: 5,
    titre: 'Jambes, triceps',
    lignes: [
      {
        exerciceId: 'squat-smith',
        series: 3,
        reps: '8',
        reposSec: 150,
        technique: 'droite',
        serieOptionnelle: true,
      },
      {
        exerciceId: 'leg-extension',
        series: 3,
        reps: '10',
        reposSec: 90,
        technique: 'droite',
        alternance: 'unilateral-impair',
      },
      {
        exerciceId: 'leg-curl-allonge',
        series: 3,
        reps: '10',
        reposSec: 90,
        technique: 'droite',
        alternance: 'bilateral-impair',
      },
      {
        exerciceId: 'fentes-halteres',
        series: 3,
        reps: '8 / jambe',
        reposSec: 120,
        technique: 'droite',
      },
      {
        exerciceId: 'barre-au-front',
        series: 3,
        reps: '12',
        reposSec: null,
        technique: 'superset',
        superset: 'sam-triceps',
      },
      {
        exerciceId: 'dips-banc',
        series: 3,
        reps: '12',
        reposSec: 90,
        technique: 'superset',
        superset: 'sam-triceps',
      },
      {
        exerciceId: 'extension-triceps-corde',
        series: 3,
        reps: '8-10',
        reposSec: 45,
        technique: 'trois-series',
      },
      {
        exerciceId: 'releve-de-buste',
        series: 3,
        reps: '10',
        reposSec: 60,
        technique: 'droite',
      },
    ],
  },
];

export function seancePour(jour: number): SeanceMass4 | null {
  return SEANCES_MASS4.find((s) => s.jour === jour) ?? null;
}
