import { describe, expect, it } from 'vitest';
import { performedFormat, type PerformedSet } from './setFormat';

const serie = (reps: number | null, kg: number | null = null): PerformedSet => ({ reps, kg });
const mesuree = (measure: number, measureUnit: string, kg: number | null = null): PerformedSet => ({
  reps: null,
  kg,
  measure,
  measureUnit,
});

describe('performedFormat — séries homogènes', () => {
  it('écrit le format exactement comme on le dit', () => {
    expect(performedFormat(Array.from({ length: 5 }, () => serie(3, 115)))).toBe('5 × 3 × 115 kg');
  });

  it('omet la charge quand il n’y en a pas — poids du corps', () => {
    expect(performedFormat([serie(8), serie(8), serie(8)])).toBe('3 × 8');
  });

  it('écrit les décimales à la française', () => {
    expect(performedFormat([serie(6, 97.5), serie(6, 97.5)])).toBe('2 × 6 × 97,5 kg');
  });

  it('gère une série unique', () => {
    expect(performedFormat([serie(5, 140)])).toBe('1 × 5 × 140 kg');
  });
});

describe('performedFormat — séries hétérogènes', () => {
  it('regroupe les séries identiques consécutives — l’exemple de Guillaume', () => {
    const sets = [serie(3, 115), serie(3, 115), serie(3, 115), serie(2, 115)];
    expect(performedFormat(sets)).toBe('3 × 3 × 115 kg + 1 × 2 × 115 kg');
  });

  it('distingue deux charges différentes', () => {
    const sets = [serie(8, 100), serie(8, 100), serie(6, 110)];
    expect(performedFormat(sets)).toBe('2 × 8 × 100 kg + 1 × 6 × 110 kg');
  });

  it('ne fusionne pas deux groupes identiques séparés par un troisième', () => {
    const sets = [serie(3, 115), serie(2, 115), serie(3, 115)];
    expect(performedFormat(sets)).toBe('1 × 3 × 115 kg + 1 × 2 × 115 kg + 1 × 3 × 115 kg');
  });

  it('énumère au-delà de trois groupes, charge sortie du lot', () => {
    const sets = [serie(8, 60), serie(7, 60), serie(6, 60), serie(5, 60)];
    expect(performedFormat(sets)).toBe('4 séries : 8, 7, 6, 5 × 60 kg');
  });

  it('n’invente pas de charge commune quand les charges diffèrent', () => {
    const sets = [serie(8, 60), serie(7, 62.5), serie(6, 65), serie(5, 67.5)];
    expect(performedFormat(sets)).toBe('4 séries : 8, 7, 6, 5');
  });
});

describe('performedFormat — mouvements mesurés', () => {
  it('écrit la distance avec son unité', () => {
    expect(performedFormat([mesuree(12, 'm', 20), mesuree(12, 'm', 20)])).toBe('2 × 12 m × 20 kg');
  });

  it('garde l’unité telle qu’elle a été saisie — jamais convertie', () => {
    expect(performedFormat([mesuree(18, 'pas', 20), mesuree(18, 'pas', 20)])).toBe(
      '2 × 18 pas × 20 kg',
    );
  });

  it('ne mélange pas deux unités dans un même groupe', () => {
    const sets = [mesuree(12, 'm', 20), mesuree(18, 'pas', 20)];
    expect(performedFormat(sets)).toBe('1 × 12 m × 20 kg + 1 × 18 pas × 20 kg');
  });

  it('accepte une mesure sans charge — un saut', () => {
    expect(performedFormat([mesuree(232, 'cm'), mesuree(228, 'cm')])).toBe(
      '1 × 232 cm + 1 × 228 cm',
    );
  });
});

describe('performedFormat — rien à dire', () => {
  it('rend null sur une liste vide', () => {
    expect(performedFormat([])).toBeNull();
  });

  it('rend null sur des séries validées sans aucun chiffre', () => {
    expect(
      performedFormat([
        { reps: null, kg: null },
        { reps: null, kg: null },
      ]),
    ).toBeNull();
  });

  it('ignore les séries vides au milieu des séries chiffrées', () => {
    const sets = [serie(3, 115), { reps: null, kg: null }, serie(3, 115)];
    expect(performedFormat(sets)).toBe('2 × 3 × 115 kg');
  });
});
