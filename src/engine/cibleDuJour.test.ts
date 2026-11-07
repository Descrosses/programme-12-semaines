/*
 * La séparation des cibles et des menus tient à une règle d'arbitrage. Ces
 * tests la fixent, dans les deux sens, parce que s'y tromper ferait soit
 * disparaître le plan de Guillaume, soit prescrire ses 3 226 kcal à
 * quelqu'un d'autre.
 */
import { describe, expect, it } from 'vitest';
import { cibleDuJour } from './cibleDuJour';
import { NUTRITION_TARGETS } from '../data/nutrition';
import type { CiblesNutrition } from '../data/ciblesNutrition';

const SAISIE: CiblesNutrition = {
  train: { kcal: 2400, proteinG: 150, carbsG: 260, fatG: 80 },
  rest: { kcal: 2100, proteinG: 150, carbsG: 200, fatG: 70 },
};

describe('quand les menus sont affichés', () => {
  it('ce sont EUX qui font foi, pas les chiffres saisis', () => {
    const r = cibleDuJour('train', { menus: true, cibles: SAISIE });
    expect(r?.origine).toBe('menus');
    expect(r?.cible.kcal).toBe(NUTRITION_TARGETS.train.kcal);
    expect(r?.cible.meals.length).toBeGreaterThan(0);
  });

  it('les chiffres saisis ne sont pas perdus pour autant', () => {
    // Ils sont ignorés, pas effacés : ils ressortent dès que les menus s'en vont.
    expect(cibleDuJour('train', { menus: true, cibles: SAISIE })?.origine).toBe('menus');
    expect(cibleDuJour('train', { menus: false, cibles: SAISIE })?.cible.kcal).toBe(2400);
  });

  it('le deload allège la cible, comme avant la séparation', () => {
    const normal = cibleDuJour('train', { menus: true, cibles: null }, 'normal');
    const allege = cibleDuJour('train', { menus: true, cibles: null }, 'deloadLight');
    expect(allege!.cible.kcal).toBeLessThan(normal!.cible.kcal);
  });
});

describe('quand il n’y a pas de menus', () => {
  it('rend les chiffres saisis, tels quels', () => {
    const r = cibleDuJour('rest', { menus: false, cibles: SAISIE });
    expect(r?.origine).toBe('saisie');
    expect(r?.cible).toMatchObject({ kcal: 2100, proteinG: 150, carbsG: 200, fatG: 70 });
    expect(r?.cible.meals).toEqual([]);
  });

  it('n’applique AUCUN allègement de deload', () => {
    // Le deload réduit les quantités des repas ; sans repas, il n'y a rien à
    // réduire, et inventer un pourcentage reviendrait à prescrire.
    const normal = cibleDuJour('train', { menus: false, cibles: SAISIE }, 'normal');
    const deload = cibleDuJour('train', { menus: false, cibles: SAISIE }, 'deloadLight');
    expect(deload?.cible.kcal).toBe(normal?.cible.kcal);
  });

  it('rend null quand rien n’est saisi, plutôt que des zéros', () => {
    expect(cibleDuJour('train', { menus: false, cibles: null })).toBeNull();
  });

  it('rend null sur une saisie hors bornes, plutôt qu’un chiffre absurde', () => {
    const faux: CiblesNutrition = {
      train: { kcal: 32_260, proteinG: 190, carbsG: 402, fatG: 91 },
      rest: SAISIE.rest,
    };
    expect(cibleDuJour('train', { menus: false, cibles: faux })).toBeNull();
    // L'autre journée reste utilisable : une faute de frappe n'en annule qu'une.
    expect(cibleDuJour('rest', { menus: false, cibles: faux })?.origine).toBe('saisie');
  });
});

describe('une journée à moitié remplie', () => {
  it('n’est pas utilisable, mais n’empêche pas l’autre de l’être', () => {
    // La saisie se fait chiffre par chiffre : une journée incomplète doit
    // pouvoir exister en base sans produire une cible fausse.
    const partiel: CiblesNutrition = {
      train: { kcal: 2400, proteinG: 150, carbsG: null, fatG: null },
      rest: SAISIE.rest,
    };
    expect(cibleDuJour('train', { menus: false, cibles: partiel })).toBeNull();
    expect(cibleDuJour('rest', { menus: false, cibles: partiel })?.origine).toBe('saisie');
  });
});
