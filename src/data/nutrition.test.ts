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
    expect(MD).toContain('3 226 kcal · 190 g protéines · 402 g glucides · 91 g lipides');
    const t = NUTRITION_TARGETS.train;
    expect(t.kcal).toBe(3226);
    expect(t.proteinG).toBe(190);
    expect(t.carbsG).toBe(402);
    expect(t.fatG).toBe(91);
  });

  /*
   * Le changement le moins intuitif du plan, et celui qu'il faut protéger :
   * les protéines BAISSENT. L'alimentation réelle en apportait déjà ≈ 213 g,
   * soit 2,7 g/kg — plus que ce qu'un travail de force exige. Le surplus est
   * reconverti en glucides, qui eux servent à la séance.
   */
  it('les protéines restent dans la fourchette visée, sans la dépasser', () => {
    for (const t of Object.values(NUTRITION_TARGETS)) {
      expect(mealsTotal(t).proteinG, `${t.label} — trop de protéines`).toBeLessThanOrEqual(195);
      expect(mealsTotal(t).proteinG, `${t.label} — pas assez`).toBeGreaterThanOrEqual(170);
    }
  });

  it('le jour de repos garde les cinq prises et n’allège que les féculents', () => {
    expect(MD).toContain('Seuls les féculents baissent');
    const train = NUTRITION_TARGETS.train;
    const rest = NUTRITION_TARGETS.rest;
    expect(rest.meals).toHaveLength(train.meals.length);
    // Les lipides ne bougent pas : ce sont les féculents qui baissent, pas
    // l'huile, les amandes ni le saumon.
    expect(rest.fatG).toBeGreaterThanOrEqual(train.fatG - 5);
    // Les protéines ne perdent qu'une douzaine de grammes.
    expect(train.proteinG - rest.proteinG).toBeLessThanOrEqual(15);
    expect(rest.carbsG).toBeLessThan(train.carbsG);
    expect(rest.kcal).toBeLessThan(train.kcal);
  });

  it('les portions de protéine animale sont IDENTIQUES les deux jours', () => {
    // C'est ce qui distingue un allègement d'une restriction : le poulet et le
    // saumon ne bougent pas, seuls le riz, les pâtes, le pain et les flocons.
    const qte = (kind: 'train' | 'rest', repas: string, produit: string) =>
      NUTRITION_TARGETS[kind].meals
        .find((m) => m.name.startsWith(repas))!
        .items!.find((i) => i.product === produit)!.qty;
    expect(qte('rest', 'Déjeuner', 'poulet')).toBe(qte('train', 'Déjeuner', 'poulet'));
    expect(qte('rest', 'Dîner', 'saumon')).toBe(qte('train', 'Dîner', 'saumon'));
    expect(qte('rest', 'Dîner', 'huile')).toBe(qte('train', 'Dîner', 'huile'));
    // Et les féculents, eux, baissent bien.
    expect(qte('rest', 'Déjeuner', 'riz')).toBeLessThan(qte('train', 'Déjeuner', 'riz'));
    expect(qte('rest', 'Dîner', 'pates')).toBeLessThan(qte('train', 'Dîner', 'pates'));
  });

  it('la collation de 8 h est le même objet aux deux paliers', () => {
    expect(MD).toContain('200 g de skyr');
    const c = NUTRITION_TARGETS.train.meals.find((m) => m.name.startsWith('Collation — 08 h'))!;
    expect(c.kcal).toBe(485);
    expect(NUTRITION_TARGETS.rest.meals.find((m) => m.name.startsWith('Collation — 08 h'))).toEqual(c);
  });

  /*
   * Le garde-fou qui a déjà servi : les repas listés et la cible annoncée ont
   * longtemps différé de 830 kcal. On vérifie maintenant l'égalité EXACTE, les
   * cibles n'étant plus une intention mais le total réel des aliments.
   */
  it('la cible annoncée EST le total des repas, sans écart', () => {
    expect(mealsTotal(NUTRITION_TARGETS.train)).toEqual({
      kcal: 3226,
      proteinG: 190,
      carbsG: 402,
      fatG: 91,
    });
    expect(mealsTotal(NUTRITION_TARGETS.rest)).toEqual({
      kcal: 2802,
      proteinG: 178,
      carbsG: 321,
      fatG: 86,
    });
    for (const t of Object.values(NUTRITION_TARGETS)) {
      expect(mealsGap(t), t.label).toEqual({ kcal: 0, pct: 0 });
      expect(Math.abs(mealsGap(t).pct), t.label).toBeLessThanOrEqual(MEALS_GAP_TOLERANCE_PCT);
    }
  });

  it('les quatre macros de la cible valent celles des repas', () => {
    for (const t of Object.values(NUTRITION_TARGETS)) {
      const m = mealsTotal(t);
      expect(m.carbsG, `${t.label} — glucides`).toBe(t.carbsG);
      expect(m.fatG, `${t.label} — lipides`).toBe(t.fatG);
    }
  });

  /*
   * La prise la plus chargée en glucides de la journée, et c'est voulu : elle
   * tombe juste avant la séance, là où le carburant sert. Elle a encore grossi
   * quand le riz du déjeuner et les pâtes du dîner ont été ramenés à des
   * portions tenables — ces glucides-là sont partis ici, pas à la poubelle.
   */
  it('le pré-entraînement de 16 h est glucidique et pauvre en lipides', () => {
    const m = NUTRITION_TARGETS.train.meals.find((x) => x.name.startsWith('Pré-entraînement'))!;
    const macros = mealMacros(m);
    expect(macros.kcal).toBeGreaterThanOrEqual(450);
    expect(macros.kcal).toBeLessThanOrEqual(650);
    expect(macros.carbsG).toBeGreaterThanOrEqual(100);
    expect(macros.fatG, 'lipides avant une séance').toBeLessThanOrEqual(5);
    // Les glucides portent l'essentiel des calories de cette prise.
    expect((macros.carbsG * 4) / macros.kcal).toBeGreaterThan(0.7);
  });

  it('les glucides se concentrent autour de la séance', () => {
    const parRepas = (nom: string) =>
      mealMacros(NUTRITION_TARGETS.train.meals.find((m) => m.name.startsWith(nom))!).carbsG;
    // Déjeuner, 16 h et dîner portent plus de glucides que les deux prises
    // du matin réunies.
    const autour = parRepas('Déjeuner') + parRepas('Pré-entraînement') + parRepas('Dîner');
    const matin = parRepas('Petit-déjeuner') + parRepas('Collation — 08 h');
    expect(autour).toBeGreaterThan(matin);
  });

  it('cinq prises les deux jours, aux mêmes horaires', () => {
    expect(MD).toContain('**Cinq prises**');
    expect(NUTRITION_TARGETS.train.meals).toHaveLength(5);
    expect(NUTRITION_TARGETS.rest.meals).toHaveLength(5);
    const heures = (k: 'train' | 'rest') => NUTRITION_TARGETS[k].meals.map((m) => m.name);
    expect(heures('rest')).toEqual(heures('train').map((n) =>
      n === 'Pré-entraînement — 16 h' ? 'Collation — 16 h' : n,
    ));
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

  it('la collation de 8 h est le même objet dans les deux paliers', () => {
    const c = NUTRITION_TARGETS.train.meals.find((m) => m.name.startsWith('Collation — 08 h'))!;
    expect(c.items?.map((i) => i.product)).toEqual(['pomme', 'amandes', 'skyr', 'confiture']);
    // `toBe` et non `toEqual` : c'est littéralement le même objet, pas une copie.
    expect(NUTRITION_TARGETS.rest.meals.find((m) => m.name.startsWith('Collation — 08 h'))).toBe(c);
  });

  /*
   * Le point du catalogue de produits : le skyr de 8 h, celui du
   * pré-entraînement et celui de la collation de 16 h doivent être LE MÊME
   * skyr, sinon changer de marque se saisit trois fois.
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
    // Et un produit apparaît bien plusieurs fois : sinon le test ne prouve rien.
    const lignes = (produit: string) =>
      Object.values(NUTRITION_TARGETS)
        .flatMap((t) => t.meals)
        .flatMap((m) => m.items ?? [])
        .filter((i) => i.product === produit);
    for (const produit of ['skyr', 'confiture']) {
      /*
       * On dédoublonne par identifiant : la collation de 8 h est le MÊME objet
       * dans les deux paliers, ses lignes ne doivent pas compter double.
       */
      const distinctes = new Set(lignes(produit).map((i) => i.id));
      expect(distinctes.size, `${produit} — lignes distinctes`).toBeGreaterThanOrEqual(3);
    }
  });
});
