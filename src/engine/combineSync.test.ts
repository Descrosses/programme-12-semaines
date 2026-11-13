/**
 * Le report des séances de test vers la fiche Combine.
 *
 * Le bug : la valeur validée en séance n'apparaissait pas dans la fiche, il
 * fallait la ressaisir. Ces tests fixent les trois décisions qui le
 * corrigent : QUELLE semaine porte QUEL combine, QUELLE valeur une série a
 * mesurée, et QUEL essai garder parmi plusieurs.
 */

import { describe, expect, it } from 'vitest';
import { estMesureDuCombine, meilleurResultat, phaseDuCombine, valeurDeSerie } from './combineSync';

describe('report vers la fiche Combine', () => {
  it('les semaines 0, 8 et 12 portent les trois combines, aucune autre', () => {
    expect(phaseDuCombine(0)).toBe('initial');
    expect(phaseDuCombine(8)).toBe('s8');
    expect(phaseDuCombine(12)).toBe('final');
    for (const w of [1, 4, 7, 9, 11]) expect(phaseDuCombine(w)).toBeNull();
  });

  it('seuls les tests de la fiche sont reportés', () => {
    expect(estMesureDuCombine('test-squat-1rm')).toBe(true);
    expect(estMesureDuCombine('test-broad-jump')).toBe(true);
    expect(estMesureDuCombine('back-squat')).toBe(false);
  });

  it('une série mesure sa mesure, sinon sa charge, sinon ses reps', () => {
    expect(valeurDeSerie({ measureValue: 262, actualKg: null, actualReps: null })).toBe(262);
    expect(valeurDeSerie({ measureValue: null, actualKg: 142.5, actualReps: 1 })).toBe(142.5);
    expect(valeurDeSerie({ measureValue: null, actualKg: null, actualReps: 14 })).toBe(14);
    expect(valeurDeSerie({ measureValue: null, actualKg: null, actualReps: null })).toBeNull();
    // Le cas réel d'un 1RM : la charge est là, la mesure vaut 0.
    expect(valeurDeSerie({ measureValue: 0, actualKg: 140, actualReps: null })).toBe(140);
  });

  it('garde le MEILLEUR essai : le plus lourd, le plus loin — le plus rapide au sprint', () => {
    // Un 1RM raté après le bon ne doit pas l'écraser.
    expect(meilleurResultat('test-squat-1rm', [130, 140, 135])).toBe(140);
    expect(meilleurResultat('test-broad-jump', [255, 262])).toBe(262);
    expect(meilleurResultat('test-sprint-10m', [1.82, 1.76, 1.79])).toBe(1.76);
    expect(meilleurResultat('test-squat-1rm', [])).toBeNull();
  });
});
