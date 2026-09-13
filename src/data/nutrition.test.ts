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
    expect(MD).toContain('3 600 kcal · 240 g protéines · 425 g glucides · 105 g lipides');
    const t = NUTRITION_TARGETS.train;
    expect(t.kcal).toBe(3600);
    expect(t.proteinG).toBe(240);
    expect(t.carbsG).toBe(425);
    expect(t.fatG).toBe(105);
  });

  it('le jour de repos est le jour d’entraînement moins une prise', () => {
    expect(MD).toContain('moins la prise autour de la séance');
    const train = NUTRITION_TARGETS.train.meals;
    const rest = NUTRITION_TARGETS.rest.meals;
    // Pas « des repas qui se ressemblent » : les MÊMES objets, donc ils ne
    // peuvent pas diverger au fil des retouches.
    expect(rest).toEqual(train.filter((m) => m.name !== 'Autour de la séance — 16 h'));
    expect(train.length - rest.length).toBe(1);
  });

  it('le jour de repos n’allège que les féculents', () => {
    expect(NUTRITION_TARGETS.rest.carbsG).toBeLessThan(NUTRITION_TARGETS.train.carbsG);
    expect(NUTRITION_TARGETS.rest.kcal).toBeLessThan(NUTRITION_TARGETS.train.kcal);
  });

  it('les deux paliers ont bien des repas DIFFÉRENTS, pas juste un bouton actif', () => {
    const train = NUTRITION_TARGETS.train.meals;
    const rest = NUTRITION_TARGETS.rest.meals;
    expect(train).not.toEqual(rest);
    // Seule la prise autour de la séance distingue les deux paliers.
    expect(train.map((m) => m.name)).toContain('Autour de la séance — 16 h');
    expect(rest.map((m) => m.name)).not.toContain('Autour de la séance — 16 h');
    // Les portions, elles, sont identiques : rien à recalculer un jour de repos.
    const kcal = (meals: typeof train, name: string) => meals.find((m) => m.name === name)!.kcal;
    for (const nom of ['Déjeuner', 'Dîner']) {
      expect(kcal(rest, nom), nom).toBe(kcal(train, nom));
    }
  });

  it('la collation du matin suit la dernière version du .md', () => {
    expect(MD).toContain('280 g de skyr nature');
    const c = NUTRITION_TARGETS.train.meals.find((m) => m.name === 'Collation — 10 h')!;
    expect(c.kcal).toBe(430);
    expect(c.proteinG).toBe(34);
    // La même collation les deux jours : le .md ne la change pas au repos.
    expect(NUTRITION_TARGETS.rest.meals.find((m) => m.name === 'Collation — 10 h')).toEqual(c);
  });

  /*
   * Ce test était l'inverse : il constatait un écart de −830 kcal entre les
   * repas listés et la cible annoncée. Le plan a été refait sur les valeurs de
   * composition réelles, avec une sixième prise. L'écart est maintenant sous la
   * tolérance, donc l'alerte de l'écran Nutrition est éteinte — et ce test est
   * ce qui la rallumera si une portion repart à la baisse.
   */
  it('les repas listés totalisent bien la cible annoncée', () => {
    expect(mealsTotal(NUTRITION_TARGETS.train)).toEqual({ kcal: 3610, proteinG: 242 });
    expect(mealsGap(NUTRITION_TARGETS.train)).toEqual({ kcal: 10, pct: 0.3 });

    expect(mealsTotal(NUTRITION_TARGETS.rest)).toEqual({ kcal: 3070, proteinG: 210 });
    expect(mealsGap(NUTRITION_TARGETS.rest)).toEqual({ kcal: -30, pct: -1 });

    for (const t of Object.values(NUTRITION_TARGETS)) {
      expect(Math.abs(mealsGap(t).pct), t.label).toBeLessThanOrEqual(MEALS_GAP_TOLERANCE_PCT);
    }
  });

  /*
   * Les protéines annoncées en tête ne sont plus une intention : elles sont la
   * somme des repas, arrondie. Le plan monte ainsi à 240 g un jour
   * d'entraînement, bien au-dessus des 170 g d'origine — conséquence assumée
   * des 180-200 g de protéine au déjeuner ET au dîner demandés par Guillaume.
   */
  it('les protéines annoncées correspondent aux repas, à l’arrondi près', () => {
    for (const t of Object.values(NUTRITION_TARGETS)) {
      const ecart = Math.abs(mealsTotal(t).proteinG - t.proteinG);
      expect(ecart, `${t.label} — ${mealsTotal(t).proteinG} g listés`).toBeLessThanOrEqual(5);
    }
  });

  it('les portions relevées du déjeuner et du dîner suivent le .md', () => {
    expect(MD).toContain('180-200 g de viande blanche ou rouge maigre');
    expect(MD).toContain('300 g de riz, pâtes ou pommes de terre (poids cuit)');
    expect(MD).toContain('180-200 g de viande, poisson ou œufs');

    for (const t of Object.values(NUTRITION_TARGETS)) {
      for (const nom of ['Déjeuner', 'Dîner']) {
        const m = t.meals.find((x) => x.name === nom)!;
        expect(m.detail, `${t.label} — ${nom}`).toContain('180-200 g de protéine');
      }
    }
    // Guillaume peut monter au-dessus de 200 g de féculent au déjeuner, mais pas
    // au dîner : c'est le déjeuner qui porte la portion la plus grosse.
    const feculent = (nom: string) =>
      Number(/(\d+) g de féculent/.exec(
        NUTRITION_TARGETS.train.meals.find((m) => m.name === nom)!.detail,
      )![1]);
    expect(feculent('Déjeuner')).toBe(300);
    expect(feculent('Dîner')).toBe(200);
    expect(feculent('Déjeuner')).toBeGreaterThan(feculent('Dîner'));
  });

  it('six prises le jour d’entraînement, cinq au repos — la contrainte a bougé', () => {
    expect(MD).toContain('6 prises alimentaires');
    expect(NUTRITION_TARGETS.train.meals).toHaveLength(6);
    expect(NUTRITION_TARGETS.rest.meals).toHaveLength(5);
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
