/**
 * Remplacer un aliment d'un repas par un autre.
 *
 * Les neuf cas demandés, dans l'ordre. Ce qui est protégé ici :
 *   - le plan du .md n'est JAMAIS réécrit ;
 *   - un remplacement ne touche que la ligne, pas le produit ailleurs ;
 *   - l'état cru/cuit est une donnée, pas une phrase ;
 *   - la cascade portion → repas → journée passe par le même chemin de calcul.
 */

import { describe, expect, it } from 'vitest';
import { NUTRITION_TARGETS, type FoodItem } from '../data/nutrition';
import { FOOD_LIBRARY, searchFoods, type LibraryFood } from '../data/foodLibrary';
import {
  effectiveItem,
  isEdited,
  itemMacros,
  macrosLookWrong,
  mealMacros,
  mealsTotal,
  quantiteApresRemplacement,
  type Catalogue,
  type FoodOverrides,
} from './nutrition';

const TRAIN = NUTRITION_TARGETS.train;
const DEJEUNER = TRAIN.meals.find((m) => m.name.startsWith('Déjeuner'))!;
const poulet = DEJEUNER.items!.find((i) => i.product === 'poulet')!;
const riz = DEJEUNER.items!.find((i) => i.product === 'riz')!;

/** Un aliment personnalisé, comme la base en rendrait un. */
const MAISON: LibraryFood = {
  id: 'custom.tofu',
  label: 'Tofu ferme',
  unit: 'g',
  per: 100,
  kcal: 145,
  proteinG: 16,
  carbsG: 2,
  fatG: 8,
  referenceState: 'cru',
  category: 'proteine',
  isCustom: true,
};
const AVEC_MAISON: Catalogue = { ...FOOD_LIBRARY, [MAISON.id]: MAISON };

describe('TEST 1 — poulet 150 g → saumon 150 g', () => {
  const ov: FoodOverrides = { [poulet.id]: { productId: 'saumon' } };

  it('la portion prend les valeurs du saumon, à quantité conservée', () => {
    const e = effectiveItem(poulet, ov);
    expect(e.label).toBe('Saumon');
    expect(e.qty).toBe(150);
    // 140 g de saumon à 208 kcal/100 → 150 g en valent 312.
    expect(itemMacros(poulet, ov).kcal).toBeCloseTo(312, 1);
    expect(itemMacros(poulet, ov).proteinG).toBeCloseTo(30, 1);
  });

  it('le repas suit', () => {
    const avant = mealMacros(DEJEUNER).kcal;
    const apres = mealMacros(DEJEUNER, ov).kcal;
    // Poulet 150 g = 247,5 kcal ; saumon 150 g = 312. Soit +64,5 → +65 après
    // l'arrondi unique du repas.
    expect(apres - avant).toBe(65);
  });

  it('la journée suit', () => {
    const avant = mealsTotal(TRAIN).kcal;
    const apres = mealsTotal(TRAIN, ov).kcal;
    expect(apres - avant).toBe(65);
    // Et la journée reste la somme exacte de ses repas.
    const somme = TRAIN.meals.reduce((n, m) => n + mealMacros(m, ov).kcal, 0);
    expect(apres).toBe(somme);
  });

  it('la ligne est signalée comme modifiée', () => {
    expect(isEdited(poulet, {})).toBe(false);
    expect(isEdited(poulet, ov)).toBe(true);
  });
});

describe('TEST 2 — saumon 150 g → 200 g', () => {
  it('les quatre macros se recalculent sur la nouvelle quantité', () => {
    const ov: FoodOverrides = { [poulet.id]: { productId: 'saumon', qty: 200 } };
    const e = effectiveItem(poulet, ov);
    expect(e.qty).toBe(200);
    const m = itemMacros(poulet, ov);
    expect(m.kcal).toBeCloseTo(416, 1); // 208 × 2
    expect(m.proteinG).toBeCloseTo(40, 1);
    expect(m.carbsG).toBeCloseTo(0, 1);
    expect(m.fatG).toBeCloseTo(26, 1);
  });

  it('et la journée aussi, sans recalcul à la main', () => {
    const a = mealsTotal(TRAIN, { [poulet.id]: { productId: 'saumon', qty: 150 } }).kcal;
    const b = mealsTotal(TRAIN, { [poulet.id]: { productId: 'saumon', qty: 200 } }).kcal;
    expect(b - a).toBe(104); // 50 g de saumon
  });
});

describe('TEST 3 — riz 250 g → pâtes, et le cru/cuit', () => {
  it('le remplacement respecte l’état de référence', () => {
    const ov: FoodOverrides = { [riz.id]: { productId: 'pates' } };
    const e = effectiveItem(riz, ov);
    expect(e.label).toBe('Pâtes cuites');
    expect(e.qty).toBe(250);
    expect(FOOD_LIBRARY.pates!.referenceState).toBe('cuit');
  });

  /*
   * Le piège que l'état de référence existe pour éviter : 100 g de riz cru
   * valent 350 kcal, 100 g de riz cuit 130. Les deux sont dans la
   * bibliothèque, comme DEUX aliments distincts, et leur libellé le dit.
   */
  it('riz cru et riz cuit sont deux aliments différents, et le disent', () => {
    expect(FOOD_LIBRARY.riz!.referenceState).toBe('cuit');
    expect(FOOD_LIBRARY.rizCru!.referenceState).toBe('cru');
    expect(FOOD_LIBRARY.rizCru!.kcal).toBeGreaterThan(FOOD_LIBRARY.riz!.kcal * 2);
    expect(FOOD_LIBRARY.riz!.label).toContain('cuit');
    expect(FOOD_LIBRARY.rizCru!.label).toContain('cru');
  });

  it('tout aliment qui change de masse à la cuisson déclare son état', () => {
    for (const f of Object.values(FOOD_LIBRARY)) {
      expect(['cru', 'cuit', 'na'], f.label).toContain(f.referenceState);
      // Un libellé qui dit « cuit » doit porter l'état « cuit », et l'inverse.
      if (/\bcuit/i.test(f.label)) expect(f.referenceState, f.label).toBe('cuit');
      if (/\bcru/i.test(f.label)) expect(f.referenceState, f.label).toBe('cru');
    }
  });
});

describe('TEST 4 — aliment personnalisé saisi pour 100 g', () => {
  it('la portion se calcule toute seule depuis les valeurs /100 g', () => {
    const ov: FoodOverrides = { [poulet.id]: { productId: MAISON.id } };
    const m = itemMacros(poulet, ov, AVEC_MAISON);
    // 150 g de tofu à 145 kcal/100 g.
    expect(m.kcal).toBeCloseTo(217.5, 1);
    expect(m.proteinG).toBeCloseTo(24, 1);
  });

  it('il se cherche comme les autres', () => {
    expect(searchFoods('tofu', [MAISON]).map((f) => f.id)).toContain(MAISON.id);
    expect(searchFoods('tofu', []).length).toBe(0);
  });
});

describe('TEST 5 — quantité d’un aliment personnalisé', () => {
  it('se recalcule comme pour un aliment livré', () => {
    const ov: FoodOverrides = { [poulet.id]: { productId: MAISON.id, qty: 250 } };
    expect(itemMacros(poulet, ov, AVEC_MAISON).kcal).toBeCloseTo(362.5, 1);
  });
});

describe('TEST 7 — le plan modèle n’est jamais touché', () => {
  /*
   * Le point le plus important de tout le mécanisme. Les repas de
   * `src/data/nutrition.ts` sont la transcription du .md, en lecture seule ;
   * ce que Guillaume change vit à côté, dans les overrides. C'est ce qui rend
   * le retour en arrière possible, et ce qui empêche le plan et sa source de
   * diverger.
   */
  it('remplacer ne modifie pas l’objet du plan', () => {
    const avant = JSON.stringify(poulet);
    const ov: FoodOverrides = { [poulet.id]: { productId: 'saumon', qty: 999 } };
    effectiveItem(poulet, ov);
    itemMacros(poulet, ov);
    mealsTotal(TRAIN, ov);
    expect(JSON.stringify(poulet)).toBe(avant);
    expect(poulet.product).toBe('poulet');
  });

  it('sans override, tout revient exactement au .md', () => {
    expect(effectiveItem(poulet, {})).toBe(poulet);
    expect(mealsTotal(TRAIN, {})).toEqual(mealsTotal(TRAIN));
  });

  it('un remplacement ne touche QUE la ligne, pas le produit ailleurs', () => {
    // Le poulet est aussi au déjeuner du jour de repos : il ne doit pas bouger.
    const pouletRepos = NUTRITION_TARGETS.rest.meals
      .find((m) => m.name.startsWith('Déjeuner'))!
      .items!.find((i) => i.product === 'poulet')!;
    const ov: FoodOverrides = { [poulet.id]: { productId: 'saumon' } };
    expect(effectiveItem(poulet, ov).label).toBe('Saumon');
    expect(effectiveItem(pouletRepos, ov).label).toBe('Poulet cuit');
  });
});

describe('TEST 8 — la journée est la somme exacte des repas', () => {
  it('avec ou sans modification', () => {
    const jeux: FoodOverrides[] = [
      {},
      { [poulet.id]: { productId: 'saumon' } },
      { [riz.id]: { productId: 'pommesDeTerre', qty: 400 } },
      { [poulet.id]: { productId: MAISON.id }, [riz.id]: { qty: 250 } },
    ];
    for (const ov of jeux) {
      const jour = mealsTotal(TRAIN, ov, AVEC_MAISON);
      const somme = TRAIN.meals.reduce(
        (acc, m) => {
          const x = mealMacros(m, ov, AVEC_MAISON);
          return {
            kcal: acc.kcal + x.kcal,
            proteinG: acc.proteinG + x.proteinG,
            carbsG: acc.carbsG + x.carbsG,
            fatG: acc.fatG + x.fatG,
          };
        },
        { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 },
      );
      expect(jour).toEqual(somme);
    }
  });
});

describe('TEST 9 — un plan d’avant la fonctionnalité continue de marcher', () => {
  it('une ligne sans remplacement se comporte exactement comme avant', () => {
    // Un override écrit avant la v10 n'a pas de `productId` : c'est « aucun
    // remplacement », pas une erreur.
    const ancien: FoodOverrides = { [poulet.id]: { qty: 200 }, poulet: { kcal: 180 } };
    const e = effectiveItem(poulet, ancien);
    expect(e.product).toBe('poulet');
    expect(e.qty).toBe(200);
    expect(e.kcal).toBe(180);
  });

  it('un remplacement vers un aliment introuvable ne casse rien', () => {
    // Aliment personnalisé supprimé depuis, base restaurée ailleurs : on
    // retombe sur l'aliment du plan plutôt que d'afficher du vide.
    const ov: FoodOverrides = { [poulet.id]: { productId: 'custom.disparu' } };
    expect(effectiveItem(poulet, ov).product).toBe('poulet');
    expect(itemMacros(poulet, ov).kcal).toBeCloseTo(247.5, 1);
  });
});

describe('la quantité après un changement d’unité', () => {
  /*
   * Remplacer 150 g de poulet par une banane donnerait 150 bananes si on
   * gardait le nombre : l'unité passe de « g » à « unité » et le chiffre ne
   * veut plus rien dire.
   */
  it('se conserve quand l’unité ne change pas', () => {
    expect(quantiteApresRemplacement(poulet, FOOD_LIBRARY.saumon!)).toBe(150);
  });

  it('repart de 1 pour ce qui se compte', () => {
    expect(quantiteApresRemplacement(poulet, FOOD_LIBRARY.banane!)).toBe(1);
    expect(effectiveItem(poulet, { [poulet.id]: { productId: 'banane' } }).qty).toBe(1);
  });

  it('repart de 100 pour ce qui se pèse', () => {
    const banane = TRAIN.meals
      .find((m) => m.name.startsWith('Pré-entraînement'))!
      .items!.find((i) => i.product === 'banane')!;
    expect(quantiteApresRemplacement(banane, FOOD_LIBRARY.saumon!)).toBe(100);
  });

  it('une quantité saisie prime toujours sur la valeur de départ', () => {
    const ov: FoodOverrides = { [poulet.id]: { productId: 'banane', qty: 2 } };
    expect(effectiveItem(poulet, ov).qty).toBe(2);
  });
});

describe('la composition se corrige sous l’aliment RÉELLEMENT mangé', () => {
  /*
   * Après un remplacement, recopier une étiquette doit atterrir sous le saumon,
   * pas sous le poulet. Sinon la correction serait invisible ici et
   * s'appliquerait au poulet des autres repas.
   */
  it('l’étiquette du remplaçant s’applique, celle du remplacé non', () => {
    const base: FoodOverrides = { [poulet.id]: { productId: 'saumon' } };
    expect(itemMacros(poulet, { ...base, saumon: { kcal: 250 } }).kcal).toBeCloseTo(375, 1);
    expect(itemMacros(poulet, { ...base, poulet: { kcal: 999 } }).kcal).toBeCloseTo(312, 1);
  });
});

describe('l’aliment remplaçant apporte AUSSI son état et sa famille', () => {
  /*
   * L'état cru/cuit est la donnée qui évite de compter le triple : 100 g de riz
   * cru valent 350 kcal, cuits 130. La ligne l'affiche, et la feuille de
   * remplacement l'affiche. Après un remplacement, c'est l'état de l'aliment
   * RÉELLEMENT mangé qui doit s'afficher — pas celui de la ligne du plan, qui
   * ne décrit plus rien.
   */
  it('remplacer du riz cuit par du riz cru dit « cru »', () => {
    const ov: FoodOverrides = { [riz.id]: { productId: 'rizCru' } };
    const e = effectiveItem(riz, ov);
    expect(e.label).toBe('Riz cru');
    expect(e.referenceState).toBe('cru');
  });

  /*
   * La famille sert à ouvrir la feuille de remplacement sur la bonne liste.
   * Après un poulet remplacé par une banane, rouvrir « Remplacer » doit
   * proposer des fruits, pas des protéines.
   */
  it('la famille suit aussi', () => {
    const ov: FoodOverrides = { [poulet.id]: { productId: 'banane' } };
    const e = effectiveItem(poulet, ov);
    expect(e.category).toBe('fruit');
    expect(e.referenceState).toBe('na');
  });

  it('sans remplacement, rien ne change', () => {
    expect(effectiveItem(riz, {}).referenceState).toBe('cuit');
    expect(effectiveItem(poulet, {}).category).toBe('proteine');
  });

  /*
   * Garde-fou général : après un remplacement, tout ce qui décrit l'aliment
   * doit venir du remplaçant. Un champ oublié ici est un champ qui mentira à
   * l'écran, et la liste des champs grandira encore.
   */
  it('tout ce qui décrit l’aliment vient du remplaçant', () => {
    for (const id of ['saumon', 'rizCru', 'banane', 'pates', 'avocat'] as const) {
      const f = FOOD_LIBRARY[id]!;
      const e = effectiveItem(poulet, { [poulet.id]: { productId: id } });
      expect(
        {
          label: e.label,
          unit: e.unit,
          per: e.per,
          kcal: e.kcal,
          proteinG: e.proteinG,
          carbsG: e.carbsG,
          fatG: e.fatG,
          referenceState: e.referenceState,
          category: e.category,
        },
        f.label,
      ).toEqual({
        label: f.label,
        unit: f.unit,
        per: f.per,
        kcal: f.kcal,
        proteinG: f.proteinG,
        carbsG: f.carbsG,
        fatG: f.fatG,
        referenceState: f.referenceState,
        category: f.category,
      });
    }
  });
});

describe('validation d’un aliment personnalisé', () => {
  it('signale des kcal que les macros ne peuvent pas produire', () => {
    const faux: FoodItem = { ...poulet, kcal: 500, proteinG: 80, carbsG: 80, fatG: 50 };
    // 80×4 + 80×4 + 50×9 = 1 090 kcal, pour 500 annoncées.
    expect(macrosLookWrong(faux)).toBe(true);
  });

  it('accepte un aliment cohérent', () => {
    expect(macrosLookWrong({ ...poulet, ...MAISON })).toBe(false);
    for (const f of Object.values(FOOD_LIBRARY)) {
      expect(macrosLookWrong({ ...poulet, ...f }), f.label).toBe(false);
    }
  });
});
