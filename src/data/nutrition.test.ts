/**
 * Le fichier `nutrition.ts` recopie `plan-alimentaire-12-semaines.md`. Ces
 * tests lisent le .md sur le disque et vérifient que la transcription ne s'en
 * est pas écartée — même garde-fou que `program.test.ts` pour l'entraînement.
 */

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  MEALS_GAP_TOLERANCE_PCT,
  NUTRITION_TARGETS,
  SHOPPING_LIST,
  SIMPLE_RULES,
  TARGET_GAIN_KG_PER_WEEK,
  mealsGap,
  mealsTotal,
} from './nutrition';

const MD = readFileSync(new URL('../../plan-alimentaire-12-semaines.md', import.meta.url), 'utf8');

describe('cibles transcrites du .md', () => {
  it('le jour d’entraînement reprend l’en-tête du plan', () => {
    expect(MD).toContain('3 600 kcal · 170 g protéines · 480 g glucides · 100 g lipides');
    const t = NUTRITION_TARGETS.train;
    expect(t.kcal).toBe(3600);
    expect(t.proteinG).toBe(170);
    expect(t.carbsG).toBe(480);
    expect(t.fatG).toBe(100); // le .md dit 100, la maquette disait 105
  });

  it('le jour de repos garde les mêmes protéines et les mêmes lipides', () => {
    expect(MD).toContain('Même structure, mêmes protéines');
    expect(NUTRITION_TARGETS.rest.proteinG).toBe(NUTRITION_TARGETS.train.proteinG);
    expect(NUTRITION_TARGETS.rest.fatG).toBe(NUTRITION_TARGETS.train.fatG);
  });

  it('le jour de repos n’allège que les féculents', () => {
    expect(NUTRITION_TARGETS.rest.carbsG).toBeLessThan(NUTRITION_TARGETS.train.carbsG);
    expect(NUTRITION_TARGETS.rest.kcal).toBeLessThan(NUTRITION_TARGETS.train.kcal);
  });

  it('les deux paliers ont bien des repas DIFFÉRENTS, pas juste un bouton actif', () => {
    const train = NUTRITION_TARGETS.train.meals;
    const rest = NUTRITION_TARGETS.rest.meals;
    expect(train).not.toEqual(rest);
    // Le .md : « Retire la collation glucidique spécifiquement post-training. »
    expect(train.map((m) => m.name)).toContain('Avant / après séance');
    expect(rest.map((m) => m.name)).not.toContain('Avant / après séance');
    // « … et réduis les féculents du déjeuner et du dîner. »
    const kcal = (meals: typeof train, name: string) => meals.find((m) => m.name === name)!.kcal;
    expect(kcal(rest, 'Déjeuner')).toBeLessThan(kcal(train, 'Déjeuner'));
    expect(kcal(rest, 'Dîner')).toBeLessThan(kcal(train, 'Dîner'));
  });

  it('la collation du matin suit la dernière version du .md', () => {
    expect(MD).toContain('280 g de skyr nature');
    const c = NUTRITION_TARGETS.train.meals.find((m) => m.name === 'Collation matin')!;
    expect(c.kcal).toBe(420);
    expect(c.proteinG).toBe(34);
    // La même collation les deux jours : le .md ne la change pas au repos.
    expect(NUTRITION_TARGETS.rest.meals.find((m) => m.name === 'Collation matin')).toEqual(c);
  });

  /*
   * Ce test ne verrouille pas une valeur « correcte » : il CONSTATE un écart
   * du .md et empêche qu'on l'oublie. Si Guillaume rééquilibre ses portions,
   * l'écart se réduira et le test le dira.
   */
  it('les repas listés ne totalisent PAS la cible annoncée — écart connu du .md', () => {
    expect(mealsTotal(NUTRITION_TARGETS.train)).toEqual({ kcal: 2770, proteinG: 186 });
    expect(mealsGap(NUTRITION_TARGETS.train)).toEqual({ kcal: -830, pct: -23.1 });

    expect(mealsTotal(NUTRITION_TARGETS.rest)).toEqual({ kcal: 2220, proteinG: 156 });
    expect(mealsGap(NUTRITION_TARGETS.rest).kcal).toBe(-930);

    // L'écart dépasse largement ce qu'un arrondi expliquerait : l'appli doit
    // donc l'afficher, pas montrer la seule cible.
    for (const t of Object.values(NUTRITION_TARGETS)) {
      expect(Math.abs(mealsGap(t).pct)).toBeGreaterThan(MEALS_GAP_TOLERANCE_PCT);
    }
  });

  it('cinq prises maximum le jour d’entraînement — c’est la contrainte du .md', () => {
    expect(MD).toContain('5 prises alimentaires, pas plus');
    expect(NUTRITION_TARGETS.train.meals.length).toBeLessThanOrEqual(5);
    expect(NUTRITION_TARGETS.rest.meals.length).toBeLessThanOrEqual(5);
  });

  it('une protéine à chaque repas, sur les deux paliers', () => {
    for (const t of Object.values(NUTRITION_TARGETS)) {
      for (const m of t.meals) {
        expect(m.proteinG, `${t.label} — ${m.name}`).toBeGreaterThan(0);
      }
    }
  });

  it('la vitesse de prise visée est celle du .md', () => {
    expect(MD).toContain('+0,15 à +0,30 kg/semaine');
    expect(TARGET_GAIN_KG_PER_WEEK.min).toBe(0.15);
    expect(TARGET_GAIN_KG_PER_WEEK.max).toBe(0.3);
  });
});

describe('liste de courses et règles', () => {
  it('reprend les quatre familles du .md', () => {
    expect(SHOPPING_LIST.map((g) => g.title)).toEqual([
      'Protéines',
      'Glucides',
      'Lipides',
      'Légumes',
    ]);
  });

  it('rappelle la règle qui pilote tout le reste', () => {
    expect(SIMPLE_RULES.some((r) => r.includes('Moyenne 7 jours'))).toBe(true);
  });
});
