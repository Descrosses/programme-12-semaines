import { describe, expect, it } from 'vitest';
import { explosiveTrend, weeklyBests } from './trends';
import type { ReadinessRecord } from './types';

const rec = (week: number, jumpCm: number, date: string): ReadinessRecord => ({
  week,
  jumpCm,
  date,
  day: 0,
});

describe('meilleur saut par semaine', () => {
  it('garde le meilleur de chaque semaine et trie', () => {
    const best = weeklyBests([
      rec(2, 238, '2026-01-12'),
      rec(1, 240, '2026-01-05'),
      rec(2, 244, '2026-01-16'),
      rec(1, 236, '2026-01-09'),
    ]);
    expect(best.map((b) => [b.week, b.cm])).toEqual([
      [1, 240],
      [2, 244],
    ]);
  });

  it('ignore les saisies invalides', () => {
    expect(weeklyBests([rec(1, 0, 'x'), rec(1, -5, 'y')])).toEqual([]);
  });
});

describe('§11 cas 7 — sauts en baisse deux semaines de suite', () => {
  it('ne se déclenche pas sur une seule baisse', () => {
    const t = explosiveTrend([
      rec(1, 240, '2026-01-05'),
      rec(2, 245, '2026-01-12'),
      rec(3, 242, '2026-01-19'),
    ]);
    expect(t.declining).toBe(false);
    expect(t.consecutiveDrops).toBe(1);
  });

  it('se déclenche à la deuxième baisse consécutive', () => {
    const t = explosiveTrend([
      rec(1, 240, '2026-01-05'),
      rec(2, 245, '2026-01-12'),
      rec(3, 242, '2026-01-19'),
      rec(4, 238, '2026-01-26'),
    ]);
    expect(t.declining).toBe(true);
    expect(t.consecutiveDrops).toBe(2);
    expect(t.message).toContain('245');
    expect(t.message).toContain('238');
    expect(t.message).toContain('Cas 7');
  });

  it('une remontée remet le compteur à zéro', () => {
    const t = explosiveTrend([
      rec(1, 245, '2026-01-05'),
      rec(2, 242, '2026-01-12'),
      rec(3, 238, '2026-01-19'),
      rec(4, 244, '2026-01-26'),
    ]);
    expect(t.declining).toBe(false);
    expect(t.consecutiveDrops).toBe(0);
  });

  it('au-delà de 10 jours de déclin, propose un deload anticipé (§11)', () => {
    const t = explosiveTrend(
      [
        rec(1, 245, '2026-01-05'),
        rec(2, 242, '2026-01-12'),
        rec(3, 238, '2026-01-19'),
      ],
      '2026-01-20',
    );
    expect(t.declining).toBe(true);
    expect(t.suggestEarlyDeload).toBe(true);
    expect(t.message).toContain('deload anticipé');
  });

  it('en dessous de 10 jours, cas 7 seulement', () => {
    const t = explosiveTrend(
      [
        rec(1, 245, '2026-01-12'),
        rec(2, 242, '2026-01-15'),
        rec(3, 238, '2026-01-19'),
      ],
      '2026-01-20',
    );
    expect(t.declining).toBe(true);
    expect(t.suggestEarlyDeload).toBe(false);
  });

  it('reste muet tant qu’il n’y a pas assez de données', () => {
    expect(explosiveTrend([]).declining).toBe(false);
    expect(explosiveTrend([rec(1, 240, '2026-01-05')]).declining).toBe(false);
  });

  it('un plateau strict n’est pas une baisse', () => {
    const t = explosiveTrend([
      rec(1, 240, '2026-01-05'),
      rec(2, 240, '2026-01-12'),
      rec(3, 240, '2026-01-19'),
    ]);
    expect(t.declining).toBe(false);
  });
});
