/**
 * Régression signalée par Guillaume : l'écran Aujourd'hui d'un cycle MASS
 * FORCE parlait du « combine initial » de POWER et proposait la nutrition de
 * MASS CONGESTION. POWER, lui, ne doit pas bouger d'un mot.
 */
import { describe, expect, it } from 'vitest';
import { moduleParId } from './registre';
import { textesCycle } from './textesCycle';

describe('textes de l’écran Aujourd’hui, hors séance', () => {
  it('POWER 12 garde exactement ses mots', () => {
    expect(textesCycle(moduleParId('power12'))).toEqual({
      sousAvant: 'Combine initial',
      attente: 'Premier jour du combine initial',
      fin: '12 semaines bouclées',
      comparerCombines: true,
      raccourciNutrition: true,
    });
    // Programme pas encore lu : on ne change rien non plus.
    expect(textesCycle(null).sousAvant).toBe('Combine initial');
  });

  it('MASS FORCE : semaine 1, quatre semaines, pas de raccourci vers une nutrition à venir', () => {
    expect(textesCycle(moduleParId('mass-force'))).toEqual({
      sousAvant: 'Semaine 1',
      attente: 'Première séance',
      fin: '4 semaines bouclées',
      comparerCombines: false,
      raccourciNutrition: false,
    });
  });

  it('MASS CONGESTION : quatre semaines, et son raccourci vers ses principes reste', () => {
    expect(textesCycle(moduleParId('mass4'))).toMatchObject({
      sousAvant: 'Semaine 1',
      fin: '4 semaines bouclées',
      raccourciNutrition: true,
    });
  });
});
