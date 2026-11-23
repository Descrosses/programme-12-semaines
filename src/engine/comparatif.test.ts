/**
 * Le comparatif « Avant · Après » (Guillaume, 23 novembre) :
 * - une mesure absente s'écrit « non mesuré S0 / S12 », jamais 0 ;
 * - vert = progrès, rouge = recul, avec le jugement de l'écran Combine
 *   (un sprint plus court est un progrès) ;
 * - 1RM en %, lest des tractions en kg, saut en cm, sprint en s.
 */
import { describe, expect, it } from 'vitest';
import { comparatif } from './comparatif';

const S0 = {
  'test-squat-1rm': 140,
  'test-bench-1rm': 105,
  'test-deadlift-1rm': 160,
  'test-weighted-pullup-1rm': 35,
  'test-broad-jump': 265,
  'test-sprint-10m': 1.82,
};
const S12 = {
  'test-squat-1rm': 152.5,
  'test-bench-1rm': 115,
  'test-deadlift-1rm': 177.5,
  'test-weighted-pullup-1rm': 32.5,
  'test-broad-jump': 281,
  'test-sprint-10m': 1.74,
};
const parId = (c: ReturnType<typeof comparatif>) =>
  Object.fromEntries([...c.barres, ...c.tuiles].map((l) => [l.id, l]));

describe('le comparatif S0 → S12', () => {
  it('les écarts, dans l’unité de chaque mesure', () => {
    const l = parId(comparatif(S0, S12));
    expect(l['test-squat-1rm']!.ecartTexte).toBe('+9 %');
    expect(l['test-bench-1rm']!.ecartTexte).toBe('+10 %');
    expect(l['test-deadlift-1rm']!.ecartTexte).toBe('+11 %');
    expect(l['test-weighted-pullup-1rm']!.ecartTexte).toBe('−2,5 kg');
    expect(l['test-broad-jump']!.ecartTexte).toBe('+16 cm');
    expect(l['test-sprint-10m']!.ecartTexte).toBe('−0,08 s');
    expect(l['test-weighted-pullup-1rm']!.departTexte).toBe('+35 kg');
    expect(l['test-squat-1rm']!.arriveeTexte).toBe('152,5 kg');
  });

  it('vert = progrès, rouge = recul ; un sprint plus court est un progrès', () => {
    const l = parId(comparatif(S0, S12));
    expect(l['test-squat-1rm']!.mieux).toBe(true);
    expect(l['test-weighted-pullup-1rm']!.mieux).toBe(false);
    expect(l['test-sprint-10m']!.mieux).toBe(true);
  });

  it('une mesure absente : « non mesuré S0 / S12 », jamais 0, jamais de ligne qui disparaît', () => {
    const c = comparatif({ ...S0, 'test-squat-1rm': null }, { ...S12, 'test-sprint-10m': null });
    const l = parId(c);
    expect(c.barres).toHaveLength(4);
    expect(c.tuiles).toHaveLength(2);
    expect(l['test-squat-1rm']!.departTexte).toBe('non mesuré S0');
    expect(l['test-squat-1rm']!.ecartTexte).toBeNull();
    expect(l['test-squat-1rm']!.barre).toBeNull();
    expect(l['test-sprint-10m']!.arriveeTexte).toBe('non mesuré S12');
    expect(JSON.stringify(c)).not.toMatch(/"0 kg"|"0 cm"|"0 s"/);
  });

  it('les barres : la plus grande occupe 82 % de la piste', () => {
    const b = parId(comparatif(S0, S12))['test-squat-1rm']!.barre!;
    expect(b.arrivee).toBeCloseTo(0.82);
    expect(b.depart).toBeCloseTo((140 / 152.5) * 0.82);
  });

  it('prêt seulement avec au moins une mesure de la semaine 12', () => {
    expect(comparatif(S0, null).pret).toBe(false);
    expect(comparatif(S0, {}).pret).toBe(false);
    expect(comparatif(null, { 'test-bench-1rm': 110 }).pret).toBe(true);
  });
});
