/**
 * Le vendredi plafonné (décisions de Guillaume, 22 novembre : « go 73 min »,
 * puis « + S1-S8 »).
 *
 * Ce que ces tests figent, sur les douze semaines :
 * - le vendredi ne porte AUCUN exercice à plus de 4 séries ;
 * - le Jump Squat haltères n'est programmé nulle part, mais reste au
 *   catalogue (on ne supprime pas d'exercices existants) ;
 * - le vendredi tient en 75 min au plus, deloads compris.
 */
import { describe, expect, it } from 'vitest';
import { EXERCISES } from './exercises';
import type { DayIndex, WeekIndex } from './types';
import { getSession } from '../engine/getSession';
import { EMPTY_CONTEXT } from '../engine/types';

const SEMAINES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as WeekIndex[];
const vendredi = (w: WeekIndex) => getSession(w, 4, EMPTY_CONTEXT)!;

describe('le vendredi plafonné', () => {
  it('aucun exercice à plus de 4 séries, S1 à S11', () => {
    for (const w of SEMAINES) {
      const trop = vendredi(w)
        .exercises.filter((e) => e.sets > 4)
        .map((e) => `${e.id} ${e.sets}`);
      expect(trop, `S${w}`).toEqual([]);
    }
  });

  it('le Jump Squat n’est programmé aucun jour, mais reste au catalogue', () => {
    for (let w = 0; w <= 12; w++) {
      for (const d of [0, 1, 2, 3, 4, 5, 6] as DayIndex[]) {
        const ids = getSession(w as WeekIndex, d, EMPTY_CONTEXT)?.exercises.map((e) => e.id) ?? [];
        expect(ids, `S${w} j${d}`).not.toContain('jump-squat-db');
      }
    }
    expect(EXERCISES['jump-squat-db']).toBeDefined();
  });

  it('75 min au plus, deloads compris', () => {
    for (const w of SEMAINES) {
      const min = Number(vendredi(w).durationLabel.replace(/\D/g, ''));
      expect(min, `S${w}`).toBeLessThanOrEqual(75);
    }
  });
});
