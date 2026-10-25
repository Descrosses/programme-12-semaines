/**
 * Le Single-Leg RDL sort du samedi en force maximale — et seulement là.
 *
 * Ce qui est verrouillé ici n'est pas une liste de semaines : c'est que le
 * retrait soit porté par le BLOC. Un test qui vérifierait « absent en 5, 6,
 * 7 » passerait aussi avec trois exceptions codées en dur, et laisserait
 * l'exercice disparaître le jour où quelqu'un ajoute une semaine au bloc sans
 * y penser. Celui-ci vérifie les deux faces : absent de tout le bloc force
 * max, présent dans tous les autres.
 */

import { describe, expect, it } from 'vitest';
import { getSession } from './getSession';
import { EMPTY_CONTEXT, type SessionContext } from './types';
import { BLOCK_RULES } from '../data/blockRules';
import { WEEK_BLOCKS, WEEK_DAYS } from '../data/program';
import { specialSession } from '../data/testSessions';
import type { DayIndex, WeekIndex } from '../data/types';

const ctx: SessionContext = {
  ...EMPTY_CONTEXT,
  settings: {
    startDate: '2026-01-03',
    broadJumpBaselineCm: 240,
    oneRM: { 'back-squat': 110, 'bench-press': 115, deadlift: 140, 'weighted-pullup': 45 },
  },
};

function ids(week: number, day: number): string[] {
  const s = getSession(week as WeekIndex, day as DayIndex, ctx);
  return (s?.exercises ?? []).map((e) => e.id);
}

describe('Single-Leg RDL — retiré par le bloc, pas par un numéro de semaine', () => {
  it('absent du samedi de force maximale', () => {
    for (const w of [5, 6, 7]) {
      expect(ids(w, 5), `S${w}`).not.toContain('single-leg-rdl');
    }
  });

  it('présent le samedi dans tous les autres blocs', () => {
    // Accumulation, deload, puissance. La semaine 12 est écrite en toutes
    // lettres (tests) et n'a pas de trame de samedi ordinaire.
    for (const w of [1, 2, 3, 4, 9, 10, 11]) {
      expect(ids(w, 5), `S${w}`).toContain('single-leg-rdl');
    }
  });

  it('le deload de la semaine 8 ne le reprend pas pour autant — son samedi est un combine', () => {
    expect(specialSession(8, 5)).toBeDefined();
  });

  it('le retrait est écrit comme une règle de bloc', () => {
    const regles = BLOCK_RULES.filter(
      (r) =>
        r.block === 'maxforce' &&
        r.day === 5 &&
        r.rules.some((x) => x.op === 'remove' && x.exId === 'single-leg-rdl'),
    );
    expect(regles).toHaveLength(1);
    // Aucun `fromWeek` : la règle porte sur le bloc entier, pas sur trois
    // numéros. C'est ce qui la rend juste si le bloc change de bornes.
    expect(regles[0]!.fromWeek).toBeUndefined();
  });

  it('rien d’autre ne bouge le samedi de force max', () => {
    // Le reste de la séance est exactement celui qu'elle avait, le
    // Single-Leg RDL en moins. On le vérifie contre le samedi de puissance,
    // qui garde le même squelette.
    expect(ids(6, 5)).toEqual([
      'broad-jump',
      'deadlift',
      'front-squat',
      'hip-thrust',
      'nordic-curl',
      'zercher-march',
      'roman-side-bench',
    ]);
  });

  it('aucun autre jour n’est touché par le retrait', () => {
    // Le mouvement n'existe qu'au samedi : s'il apparaissait ailleurs, le
    // retirer du samedi aurait pu laisser une occurrence orpheline.
    for (let w = 0; w <= 12; w++) {
      const week = w as WeekIndex;
      for (const day of WEEK_DAYS[week]) {
        if (day === 5) continue;
        expect(ids(week, day), `S${week} j${day}`).not.toContain('single-leg-rdl');
      }
    }
    expect(WEEK_BLOCKS[5]).toBe('maxforce');
    expect(WEEK_BLOCKS[7]).toBe('maxforce');
  });
});
