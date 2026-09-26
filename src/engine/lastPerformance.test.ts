/**
 * « La dernière fois, tu as fait ça. »
 *
 * Ce que ces tests protègent, dans l'ordre d'importance :
 *   - le chiffre vient du RÉEL, jamais du plan ;
 *   - il parle de la dernière fois, pas de la série qu'on vient de valider ;
 *   - une baisse n'est jamais peinte comme un échec ;
 *   - un sprint plus court est une progression, pas une régression.
 */

import { describe, expect, it } from 'vitest';
import { lastPerformance } from './lastPerformance';
import type { Occurrence } from './types';

/** Une occurrence chargée : ce que Guillaume a réellement soulevé. */
const kg = (week: number, k: number | null, rpe: number | null = null): Occurrence => ({
  exerciseId: 'back-squat',
  week,
  kg: k,
  plannedKg: 999, // volontairement absurde : le plan ne doit JAMAIS s'afficher
  rpe,
  failed: false,
  targetRPE: null,
  completed: true,
});

/** Une occurrence mesurée : un saut, un sprint, un porté. */
const mes = (week: number, m: number | null, exerciseId = 'broad-jump'): Occurrence => ({
  exerciseId,
  week,
  kg: null,
  plannedKg: null,
  rpe: null,
  failed: false,
  targetRPE: null,
  /* Un saut n'enregistre pas de reps : `completed` vaut false, et c'est
     justement le piège que le module doit éviter. */
  completed: false,
  measure: m,
});

const squat = (occ: Occurrence[] | undefined, before: number) =>
  lastPerformance(occ, { exerciseId: 'back-squat', before });
const saut = (occ: Occurrence[], before: number, unit = 'cm', id = 'broad-jump') =>
  lastPerformance(occ, { exerciseId: id, measureUnit: unit, before });

describe('les mouvements chargés', () => {
  it('affiche la charge et le RPE réellement saisis', () => {
    const p = squat([kg(1, 77.5, 7), kg(2, 80, 7.5)], 3)!;
    expect(p.week).toBe(2);
    expect(p.value).toBe('80 kg');
    expect(p.rpe).toBe('RPE 7,5');
  });

  it('ne montre JAMAIS la charge planifiée', () => {
    // `plannedKg` vaut 999 dans les fixtures : s'il apparaissait, on le verrait.
    const p = squat([kg(1, 77.5, 7), kg(2, 80, 7.5)], 3)!;
    expect(p.value).not.toContain('999');
    expect(JSON.stringify(p)).not.toContain('999');
  });

  it('une charge qui monte : flèche verte et écart', () => {
    const p = squat([kg(1, 77.5, 7), kg(2, 82.5, 7.5)], 3)!;
    expect(p.trend).toBe('up');
    expect(p.delta).toBe('+5 kg');
  });

  it('une charge identique : neutre, aucun écart', () => {
    const p = squat([kg(1, 80, 7), kg(2, 80, 7)], 3)!;
    expect(p.trend).toBe('flat');
    expect(p.delta).toBeNull();
  });

  /*
   * Le point qui compte le plus. Une semaine de deload EST une baisse de
   * charge, un ajustement orange aussi. Les peindre en rouge apprendrait à
   * ignorer la couleur le jour où elle veut dire quelque chose.
   */
  it('une charge qui baisse : neutre, jamais un échec', () => {
    const p = squat([kg(3, 87.5, 8), kg(4, 70, 5)], 5)!;
    expect(p.trend).toBe('down');
    expect(p.value).toBe('70 kg');
    expect(p.delta).toBe('−17,5 kg'); // la valeur est dite, sans jugement
  });

  it('aucun RPE saisi : on n’en invente pas', () => {
    // Speed Squat, Jump Squat : chargés, sans RPE cible.
    const p = squat([kg(1, 60), kg(2, 62.5)], 3)!;
    expect(p.rpe).toBeNull();
    expect(p.value).toBe('62,5 kg');
  });

  it('l’écart ne traîne pas de décimales parasites', () => {
    // 82,5 − 77,5 en binaire donne 5,000000000000007 si on ne l'arrondit pas.
    expect(squat([kg(1, 77.5), kg(2, 82.5)], 3)!.delta).toBe('+5 kg');
  });
});

describe('les sauts, sprints et portés', () => {
  it('affiche la mesure, sans RPE', () => {
    const p = saut([mes(1, 230), mes(2, 238)], 3)!;
    expect(p.value).toBe('238 cm');
    expect(p.rpe).toBeNull();
    expect(p.trend).toBe('up');
    expect(p.delta).toBe('+8 cm');
  });

  /*
   * `completed` vaut `false` sur un saut, parce que le champ mesure remplace
   * les reps. Filtrer dessus aurait fait disparaître l'encart sur exactement
   * les mouvements qui progressent le plus visiblement.
   */
  it('marche sur un mouvement mesuré, dont `completed` est faux', () => {
    expect(saut([mes(1, 230), mes(2, 238)], 3)).not.toBeNull();
  });

  it('un sprint plus COURT est une progression', () => {
    const p = saut([mes(0, 1.84, 'test-sprint-10m'), mes(8, 1.78, 'test-sprint-10m')], 12, 's', 'test-sprint-10m')!;
    expect(p.value).toBe('1,78 s');
    expect(p.trend).toBe('up');
    expect(p.delta).toBe('−0,06 s');
  });

  it('un sprint plus long, lui, reste neutre', () => {
    const p = saut([mes(0, 1.78, 'test-sprint-10m'), mes(8, 1.84, 'test-sprint-10m')], 12, 's', 'test-sprint-10m')!;
    expect(p.trend).toBe('down');
  });

  it('sans unité de mesure connue, on ne montre rien', () => {
    // Un chiffre sans unité ne veut rien dire : mieux vaut se taire.
    expect(lastPerformance([mes(1, 230)], { exerciseId: 'broad-jump', before: 3 })).toBeNull();
  });
});

describe('quand il n’y a rien à montrer', () => {
  it('première occurrence d’un exercice : rien du tout', () => {
    // Choix assumé : en semaine 1, neuf encarts vides repousseraient les
    // champs de saisie hors de l'écran sans rien apprendre.
    expect(squat([], 1)).toBeNull();
    expect(squat(undefined, 1)).toBeNull();
  });

  it('un mouvement sans chiffre — gainage, mobilité — n’affiche rien', () => {
    expect(squat([kg(1, null), kg(2, null)], 3)).toBeNull();
  });

  it('une seule occurrence : la valeur, mais aucun écart', () => {
    const p = squat([kg(1, 77.5, 7)], 2)!;
    expect(p.value).toBe('77,5 kg');
    expect(p.delta).toBeNull();
    expect(p.trend).toBe('flat');
  });
});

describe('« la dernière fois » n’est pas aujourd’hui', () => {
  /*
   * Le piège : l'historique est reconstruit à chaque validation de série. Dès
   * la première série du jour, la semaine en cours entre dans l'index — et
   * l'encart afficherait « Semaine 3 : 82,5 kg » en parlant de la série que
   * Guillaume vient de faire, sous ses yeux.
   */
  it('la semaine en cours est exclue', () => {
    const p = squat([kg(1, 77.5, 7), kg(2, 80, 7.5), kg(3, 82.5, 8)], 3)!;
    expect(p.week).toBe(2);
    expect(p.value).toBe('80 kg');
  });

  it('les semaines à venir aussi', () => {
    // Guillaume peut ouvrir une semaine en avance et y saisir quelque chose.
    const p = squat([kg(2, 80, 7.5), kg(9, 95, 8)], 3)!;
    expect(p.week).toBe(2);
  });

  it('l’écart compare les deux dernières occurrences RÉELLES', () => {
    // Une semaine sans séance ne doit pas décaler la comparaison.
    const p = squat([kg(1, 77.5), kg(2, null), kg(5, 85)], 6)!;
    expect(p.week).toBe(5);
    expect(p.delta).toBe('+7,5 kg');
  });
});
