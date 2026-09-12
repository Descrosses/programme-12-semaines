/**
 * Le défaut le plus dangereux rencontré sur ce projet : le tableau du §9 était
 * calculé sur des 1RM estimés, jamais recalé après le combine. Avec un squat
 * réellement testé à 110 kg, la semaine 1 prescrivait 100 kg — 91 % du max, en
 * première semaine d'accumulation, là où le programme vise 71 %.
 *
 * Ces tests figent le recalage. Les chiffres de Guillaume servent de cas réel.
 */

import { describe, expect, it } from 'vitest';
import {
  calibrationChanges,
  largestChange,
  testedFromCombine,
} from './calibration';
import {
  REFERENCE_1RM,
  calibrationFactor,
  prescriptionFor,
  type TestedOneRM,
} from '../data/mainLiftTable';

/** Combine initial de Guillaume, septembre 2026. */
const TESTÉ: TestedOneRM = {
  'back-squat': 110,
  'bench-press': 115,
  deadlift: 140,
  'weighted-pullup': 42,
};

const kgOf = (
  lift: Parameters<typeof prescriptionFor>[0],
  week: number,
  tested: TestedOneRM = TESTÉ,
) => {
  const p = prescriptionFor(lift, week, tested);
  return p?.load && 'kg' in p.load ? p.load.kg : null;
};

describe('sans 1RM testé, le tableau du .md reste intact', () => {
  it('la semaine 1 garde exactement ses valeurs de référence', () => {
    expect(kgOf('back-squat', 1, {})).toBe(100);
    expect(kgOf('bench-press', 1, {})).toBe(87.5);
    expect(kgOf('deadlift', 1, {})).toBe(97.5);
  });

  it('un test égal à la référence ne déplace rien', () => {
    expect(kgOf('back-squat', 7, REFERENCE_1RM)).toBe(125);
    expect(calibrationFactor('back-squat', REFERENCE_1RM)).toBe(1);
  });

  it('un 1RM absent ou absurde laisse la colonne tranquille', () => {
    expect(calibrationFactor('back-squat', {})).toBe(1);
    expect(calibrationFactor('back-squat', { 'back-squat': 0 })).toBe(1);
    expect(calibrationFactor('rdl', TESTÉ)).toBe(1); // hors tableau §9
  });
});

describe('recalage sur les 1RM testés', () => {
  it('le squat de la semaine 1 passe de 100 à 77,5 kg', () => {
    expect(kgOf('back-squat', 1)).toBe(77.5);
  });

  it('et 77,5 kg représente bien ~71 % du vrai max, la cible du §2', () => {
    const pct = (kgOf('back-squat', 1)! / TESTÉ['back-squat']!) * 100;
    expect(pct).toBeGreaterThanOrEqual(68);
    expect(pct).toBeLessThanOrEqual(74);
  });

  it('les pourcentages du programme sont conservés, semaine par semaine', () => {
    // Chaque semaine doit retomber sur le même pourcentage qu'avant, à
    // l'arrondi de 2,5 kg près.
    for (let w = 1; w <= 12; w++) {
      const avant = kgOf('back-squat', w, REFERENCE_1RM);
      const apres = kgOf('back-squat', w);
      if (avant === null || apres === null) continue;
      const pctAvant = (avant / REFERENCE_1RM['back-squat']) * 100;
      const pctApres = (apres / TESTÉ['back-squat']!) * 100;
      expect(Math.abs(pctApres - pctAvant), `semaine ${w}`).toBeLessThan(1.5);
    }
  });

  it('le bloc force max reste dans la fourchette 82-90 % du §2', () => {
    for (const w of [5, 6, 7]) {
      const pct = (kgOf('back-squat', w)! / TESTÉ['back-squat']!) * 100;
      expect(pct, `semaine ${w}`).toBeGreaterThanOrEqual(80);
      expect(pct, `semaine ${w}`).toBeLessThanOrEqual(91);
    }
  });

  it('aucune semaine d’accumulation ne dépasse 80 % du max testé', () => {
    for (const w of [1, 2, 3]) {
      const pct = (kgOf('back-squat', w)! / TESTÉ['back-squat']!) * 100;
      expect(pct, `semaine ${w}`).toBeLessThanOrEqual(80);
    }
  });

  it('le deadlift monte, puisque le test est au-dessus de l’estimation', () => {
    expect(kgOf('deadlift', 1)).toBe(105); // 97,5 → 105
    expect(kgOf('deadlift', 7)).toBe(130); // 120 → 130
  });

  it('le bench bouge à peine : le test était presque juste', () => {
    expect(kgOf('bench-press', 1)).toBe(85); // 87,5 → 85
  });

  it('les tractions ne bougent pas tant qu’elles ne sont pas testées', () => {
    expect(kgOf('weighted-pullup', 1)).toBe(17.5);
  });

  it('front squat et speed squat suivent le back squat, pas leur propre max', () => {
    expect(calibrationFactor('front-squat', TESTÉ)).toBeCloseTo(110 / 140, 5);
    expect(calibrationFactor('speed-squat', TESTÉ)).toBeCloseTo(110 / 140, 5);
    expect(kgOf('speed-squat', 1)).toBe(60); // 77,5 → 60
  });

  it('le push press suit le bench', () => {
    expect(calibrationFactor('push-press', TESTÉ)).toBeCloseTo(115 / 120, 5);
  });

  it('toutes les charges restent sur le pas de 2,5 kg', () => {
    for (const lift of ['back-squat', 'bench-press', 'deadlift', 'front-squat'] as const) {
      for (let w = 1; w <= 12; w++) {
        const kg = kgOf(lift, w);
        if (kg === null) continue;
        expect((kg * 10) % 25, `${lift} S${w} = ${kg}`).toBe(0);
      }
    }
  });
});

describe('détection de l’écart', () => {
  const metrics = {
    'test-squat-1rm': 110,
    'test-bench-1rm': 115,
    'test-deadlift-1rm': 140,
    'test-weighted-pullup-1rm': null,
  };

  it('lit les 1RM du combine, en ignorant ce qui n’a pas été testé', () => {
    expect(testedFromCombine(metrics)).toEqual({
      'back-squat': 110,
      'bench-press': 115,
      deadlift: 140,
    });
    expect(testedFromCombine(undefined)).toEqual({});
  });

  it('compare aux 1RM qui pilotent actuellement les charges', () => {
    const changes = calibrationChanges(testedFromCombine(metrics), REFERENCE_1RM);
    expect(changes.map((c) => c.lift)).toEqual(['back-squat', 'bench-press', 'deadlift']);
    expect(changes[0]).toMatchObject({ from: 140, to: 110, pct: -21.4 });
  });

  it('ne dit rien quand la base est déjà la bonne', () => {
    expect(calibrationChanges(TESTÉ, TESTÉ)).toEqual([]);
  });

  it('ignore un écart trop petit pour déplacer une charge après arrondi', () => {
    expect(calibrationChanges({ 'back-squat': 140.2 }, REFERENCE_1RM)).toEqual([]);
  });

  it('met en avant le changement le plus lourd, pas le premier venu', () => {
    const changes = calibrationChanges(testedFromCombine(metrics), REFERENCE_1RM);
    expect(largestChange(changes)?.lift).toBe('back-squat');
    expect(largestChange([])).toBeNull();
  });
});
