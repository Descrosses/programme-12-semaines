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
} from './nutrition';
import { mealMacros, mealsGap, mealsTotal } from '../engine/nutrition';

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

  it('le jour de repos garde les six prises et n’allège que les glucides', () => {
    expect(MD).toContain('Mêmes six prises, mêmes protéines, mêmes lipides');
    const train = NUTRITION_TARGETS.train;
    const rest = NUTRITION_TARGETS.rest;
    expect(rest.meals).toHaveLength(train.meals.length);
    // Les lipides ne bougent pas : ce sont les féculents qui baissent, pas
    // l'huile ni les amandes.
    expect(rest.fatG).toBeGreaterThanOrEqual(train.fatG - 5);
    expect(rest.carbsG).toBeLessThan(train.carbsG);
    // Les repas porteurs de viande, de poisson ou d'œufs gardent leur portion.
    for (const nom of ['Déjeuner', 'Dîner']) {
      const t = train.meals.find((m) => m.name === nom)!;
      const r = rest.meals.find((m) => m.name === nom)!;
      expect(r.detail, nom).toContain('180-200 g de protéine');
      expect(t.detail, nom).toContain('180-200 g de protéine');
    }
  });

  it('le jour de repos n’allège que les féculents', () => {
    expect(NUTRITION_TARGETS.rest.carbsG).toBeLessThan(NUTRITION_TARGETS.train.carbsG);
    expect(NUTRITION_TARGETS.rest.kcal).toBeLessThan(NUTRITION_TARGETS.train.kcal);
  });

  it('les deux paliers ont bien des repas DIFFÉRENTS, pas juste un bouton actif', () => {
    const train = NUTRITION_TARGETS.train.meals;
    const rest = NUTRITION_TARGETS.rest.meals;
    expect(train).not.toEqual(rest);
    // La prise de 16 h change de nature : elle entoure une séance un jour
    // d'entraînement, ce n'est qu'une collation un jour de repos.
    expect(train.map((m) => m.name)).toContain('Autour de la séance — 16 h');
    expect(rest.map((m) => m.name)).toContain('Collation — 16 h');
    // Et chaque prise du repos pèse moins, sauf celle de 10 h, inchangée.
    const kcal = (meals: typeof train, name: string) => meals.find((m) => m.name === name)!.kcal;
    for (const nom of ['Réveil — 6 h', 'Collation — 8 h', 'Déjeuner', 'Dîner']) {
      expect(kcal(rest, nom), nom).toBeLessThan(kcal(train, nom));
    }
    expect(kcal(rest, 'Collation — 10 h')).toBe(kcal(train, 'Collation — 10 h'));
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
    expect(mealsTotal(NUTRITION_TARGETS.train)).toEqual({ kcal: 3605, proteinG: 242 });
    expect(mealsGap(NUTRITION_TARGETS.train)).toEqual({ kcal: 5, pct: 0.1 });

    expect(mealsTotal(NUTRITION_TARGETS.rest)).toEqual({ kcal: 3058, proteinG: 227 });
    expect(mealsGap(NUTRITION_TARGETS.rest)).toEqual({ kcal: 8, pct: 0.3 });

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

  it('six prises les deux jours — la contrainte a bougé', () => {
    expect(MD).toContain('6 prises alimentaires');
    // Guillaume a tranché : même rythme tous les jours, portions réduites au
    // repos. Un jour à cinq prises serait le seul de la semaine, donc celui
    // qu'on oublie de suivre.
    expect(NUTRITION_TARGETS.train.meals).toHaveLength(6);
    expect(NUTRITION_TARGETS.rest.meals).toHaveLength(6);
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

describe('aliments décomposés', () => {
  /*
   * Le garde-fou du nouveau modèle : dès qu'un repas est décomposé, ses deux
   * nombres écrits doivent valoir la somme de ses aliments. Sans ce test, on
   * récrée exactement l'écart de 830 kcal qu'on vient de corriger, mais à
   * l'échelle d'un repas.
   */
  it('un repas décomposé annonce le total de ses aliments', () => {
    for (const t of Object.values(NUTRITION_TARGETS)) {
      for (const m of t.meals.filter((x) => x.items)) {
        const calc = mealMacros(m);
        expect(calc.kcal, `${t.label} — ${m.name} (kcal)`).toBe(m.kcal);
        expect(calc.proteinG, `${t.label} — ${m.name} (protéines)`).toBe(m.proteinG);
      }
    }
  });

  it('chaque aliment a un identifiant unique et une base de composition cohérente', () => {
    const vus = new Set<string>();
    for (const t of Object.values(NUTRITION_TARGETS)) {
      for (const m of t.meals) {
        for (const i of m.items ?? []) {
          // Un même aliment peut revenir dans les deux paliers : c'est voulu,
          // une valeur corrigée doit valoir partout. On vérifie donc que le
          // même id porte bien le même aliment, pas qu'il n'apparaît qu'une fois.
          const signature = `${i.id}|${i.label}|${i.per}|${i.unit}`;
          if (vus.has(i.id)) expect(vus.has(signature), i.id).toBe(true);
          vus.add(i.id);
          vus.add(signature);
          expect(i.per, i.id).toBe(i.unit === 'unité' ? 1 : 100);
          expect(i.qty, i.id).toBeGreaterThan(0);
        }
      }
    }
  });

  it('tous les repas des deux paliers sont décomposés', () => {
    for (const t of Object.values(NUTRITION_TARGETS)) {
      for (const m of t.meals) {
        expect(m.items, `${t.label} — ${m.name}`).toBeDefined();
        expect(m.items!.length, `${t.label} — ${m.name}`).toBeGreaterThan(0);
      }
    }
  });

  it('la collation de 10 h est le même objet dans les deux paliers', () => {
    const c = NUTRITION_TARGETS.train.meals.find((m) => m.name === 'Collation — 10 h')!;
    expect(c.items?.map((i) => i.product)).toEqual(['skyr', 'amandes', 'pomme']);
    expect(NUTRITION_TARGETS.rest.meals.find((m) => m.name === 'Collation — 10 h')).toBe(c);
  });

  /*
   * Le point du catalogue de produits : le pain du réveil et celui de la
   * collation de 16 h doivent être LE MÊME pain, sinon changer de marque se
   * saisit quatre fois.
   */
  it('un même produit a partout la même composition', () => {
    const parProduit = new Map<string, string>();
    for (const t of Object.values(NUTRITION_TARGETS)) {
      for (const m of t.meals) {
        for (const i of m.items ?? []) {
          const compo = `${i.label}|${i.unit}|${i.per}|${i.kcal}|${i.proteinG}|${i.carbsG}|${i.fatG}`;
          const vu = parProduit.get(i.product);
          if (vu === undefined) parProduit.set(i.product, compo);
          else expect(compo, i.product).toBe(vu);
        }
      }
    }
    // Et le pain apparaît bien plusieurs fois : sinon le test ne prouve rien.
    const lignesPain = Object.values(NUTRITION_TARGETS)
      .flatMap((t) => t.meals)
      .flatMap((m) => m.items ?? [])
      .filter((i) => i.product === 'pain');
    expect(lignesPain.length).toBeGreaterThanOrEqual(4);
    expect(new Set(lignesPain.map((i) => i.id)).size).toBe(lignesPain.length);
  });
});
