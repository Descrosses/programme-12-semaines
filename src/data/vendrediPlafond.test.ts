/**
 * Le vendredi plafonné (décisions de Guillaume, 22 novembre : « go 73 min »,
 * « + S1-S8 », puis « option B, Push Press et Speed Squat restent à 4 »).
 *
 * Ce que ces tests figent, sur les douze semaines :
 * - le vendredi ne porte aucun exercice à plus de 3 séries, sauf le Push Press
 *   et le Speed Squat (4) : trop de séries empêchent de rester explosif ;
 * - le Jump Squat est gardé, à 3 séries (2 en deload), le vendredi seulement ;
 * - le vendredi tient en 81 min au plus, deloads compris : 75 min au plafond
 *   du 22 novembre, plus les ~5 min de la montée en charge du 23 novembre.
 */
import { describe, expect, it } from 'vitest';
import type { DayIndex, WeekIndex } from './types';
import { getSession } from '../engine/getSession';
import { EMPTY_CONTEXT } from '../engine/types';

const SEMAINES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as WeekIndex[];
const vendredi = (w: WeekIndex) => getSession(w, 4, EMPTY_CONTEXT)!;
const A_QUATRE = new Set(['push-press', 'speed-squat']);

describe('le vendredi plafonné', () => {
  it('3 séries au plus, sauf Push Press et Speed Squat (4), S1 à S11', () => {
    for (const w of SEMAINES) {
      const trop = vendredi(w)
        .exercises.filter((e) => e.sets > (A_QUATRE.has(e.id) ? 4 : 3))
        .map((e) => `${e.id} ${e.sets}`);
      expect(trop, `S${w}`).toEqual([]);
    }
  });

  it('Push Press et Speed Squat gardent 4 séries hors deload', () => {
    for (const w of SEMAINES.filter((x) => x !== 4 && x !== 8)) {
      for (const id of A_QUATRE) {
        expect(vendredi(w).exercises.find((e) => e.id === id)?.sets, `S${w} ${id}`).toBe(4);
      }
    }
  });

  it('le Jump Squat est gardé : 3 séries (2 en deload), le vendredi seulement', () => {
    for (const w of SEMAINES) {
      const js = vendredi(w).exercises.find((e) => e.id === 'jump-squat-db');
      expect(js?.sets, `S${w}`).toBe(w === 4 || w === 8 ? 2 : 3);
    }
    for (let w = 0; w <= 12; w++) {
      for (const d of [0, 1, 2, 3, 5, 6] as DayIndex[]) {
        const ids = getSession(w as WeekIndex, d, EMPTY_CONTEXT)?.exercises.map((e) => e.id) ?? [];
        expect(ids, `S${w} j${d}`).not.toContain('jump-squat-db');
      }
    }
  });

  it('81 min au plus, deloads compris (montée en charge comprise)', () => {
    for (const w of SEMAINES) {
      const min = Number(vendredi(w).durationLabel.replace(/\D/g, ''));
      expect(min, `S${w}`).toBeLessThanOrEqual(81);
    }
  });
});
