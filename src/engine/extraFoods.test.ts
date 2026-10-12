/**
 * Les aliments mangés en plus du plan.
 *
 * Ce qu'ils résolvent : le plan prévoyait un petit-déjeuner à 645 kcal, et
 * Guillaume y a ajouté un kiwi et 30 g de confiture. Sans eux, la journée
 * comptait 645 kcal — et la seule façon d'enregistrer le kiwi était de
 * modifier le plan, c'est-à-dire de confondre ce qui était prévu avec ce qui
 * a été mangé.
 *
 * Le piège évité, signalé par Guillaume : toutes les marques de skyr n'ont pas
 * les mêmes macros. Un ajout qui ne porterait qu'un identifiant d'aliment
 * verrait ses calories changer le jour d'un changement de marque — et
 * réécrirait des journées déjà vécues.
 */

import { describe, expect, it } from "vitest";
import {
  consumedTotal,
  extraMacros,
  extrasTotal,
  mealsTotal,
  type ExtraFood,
} from "./nutrition";
import { NUTRITION_TARGETS } from "../data/nutrition";
import { FOOD_LIBRARY } from "../data/foodLibrary";

const TRAIN = NUTRITION_TARGETS.train;
const PREMIER = TRAIN.meals[0]!.id;

/** Un ajout tel qu'il est stocké : sa composition voyage avec lui. */
const fige = (qty: number, m: Partial<ExtraFood> = {}): ExtraFood => ({
  qty,
  per: 100,
  kcal: 250,
  proteinG: 0.5,
  carbsG: 60,
  fatG: 0.1,
  ...m,
});

const kiwi = fige(1, { per: 1, kcal: 45, proteinG: 0.9, carbsG: 9, fatG: 0.4 });

describe("ce que pèse un aliment ajouté", () => {
  it("une quantité en grammes se met à l’échelle de sa composition", () => {
    const m = extraMacros(fige(30));
    expect(m.kcal).toBeCloseTo(75, 5);
    expect(m.carbsG).toBeCloseTo(18, 5);
  });

  it("un aliment qui se compte à l’unité ne se divise pas par 100", () => {
    expect(extraMacros(kiwi).kcal).toBe(45);
    expect(extraMacros({ ...kiwi, qty: 2 }).kcal).toBe(90);
  });

  /*
   * LE point de cette fonctionnalité. Un ajout est un fait daté : le 12
   * octobre, 200 g de CE skyr-là valaient ces calories-là. Changer de marque
   * en novembre ne doit rien réécrire.
   */
  it("changer de marque ne réécrit pas ce qui a déjà été mangé", () => {
    const skyrLidl = fige(200, {
      kcal: 60,
      proteinG: 11,
      carbsG: 4,
      fatG: 0.2,
    });
    const avant = extraMacros(skyrLidl);
    // Une autre marque, saisie plus tard : deux lignes, deux compositions.
    const skyrAutre = fige(200, { kcal: 72, proteinG: 10, carbsG: 5, fatG: 1 });
    expect(extraMacros(skyrAutre).kcal).not.toBe(avant.kcal);
    // Et la première n'a pas bougé.
    expect(extraMacros(skyrLidl).kcal).toBe(avant.kcal);
  });

  it("aucun catalogue n’entre dans le calcul — la ligne se suffit", () => {
    // La signature elle-même l'interdit : un seul argument, pas de
    // bibliothèque ni de corrections d'étiquette à passer.
    expect(extraMacros.length).toBe(1);
  });

  it("une base de composition absurde vaut zéro, pas l’infini", () => {
    expect(extraMacros(fige(30, { per: 0 }))).toEqual({
      kcal: 0,
      proteinG: 0,
      carbsG: 0,
      fatG: 0,
    });
  });

  it("le total additionne tous les ajouts de la journée", () => {
    expect(extrasTotal([fige(30), kiwi]).kcal).toBe(75 + 45);
  });

  it("aucun ajout ne pèse rien", () => {
    expect(extrasTotal([])).toEqual({
      kcal: 0,
      proteinG: 0,
      carbsG: 0,
      fatG: 0,
    });
  });
});

describe("ce que la journée compte", () => {
  /*
   * Un ajout est déjà vrai quand il est saisi : on ne note un kiwi qu'après
   * l'avoir mangé. Le conditionner à la coche du repas pousserait à cocher le
   * repas pour faire apparaître le kiwi, et fausserait les deux informations
   * d'un coup.
   */
  it("un ajout compte sans attendre la coche du repas", () => {
    expect(consumedTotal(TRAIN, new Set()).kcal).toBe(0);
    expect(consumedTotal(TRAIN, new Set(), {}, FOOD_LIBRARY, [kiwi]).kcal).toBe(
      45,
    );
  });

  it("il s’ajoute au repas coché, il ne le remplace pas", () => {
    const repasSeul = consumedTotal(TRAIN, new Set([PREMIER]));
    const avecAjout = consumedTotal(
      TRAIN,
      new Set([PREMIER]),
      {},
      FOOD_LIBRARY,
      [kiwi],
    );
    expect(avecAjout.kcal).toBe(repasSeul.kcal + 45);
  });

  /*
   * La séparation qui donne tout son sens à la fonctionnalité : le plan dit
   * ce qui était prévu, les ajouts disent ce qui a été mangé en plus. Si un
   * ajout déplaçait le plan, « j'ai mangé un kiwi mardi » deviendrait « le
   * programme prévoit un kiwi ».
   */
  it("un ajout ne touche jamais au plan", () => {
    const planAvant = mealsTotal(TRAIN);
    consumedTotal(TRAIN, new Set([PREMIER]), {}, FOOD_LIBRARY, [kiwi]);
    expect(mealsTotal(TRAIN)).toEqual(planAvant);
  });

  it("les quatre macros suivent, pas seulement les calories", () => {
    const sans = consumedTotal(TRAIN, new Set([PREMIER]));
    const avec = consumedTotal(TRAIN, new Set([PREMIER]), {}, FOOD_LIBRARY, [
      fige(100),
    ]);
    expect(avec.carbsG).toBe(sans.carbsG + 60);
    expect(avec.kcal).toBe(sans.kcal + 250);
  });

  it("dépasser le plan se voit : le consommé passe au-dessus du prévu", () => {
    const tous = new Set(TRAIN.meals.map((m) => m.id));
    const plan = mealsTotal(TRAIN);
    const avec = consumedTotal(TRAIN, tous, {}, FOOD_LIBRARY, [fige(400)]);
    expect(avec.kcal).toBeGreaterThan(plan.kcal);
  });

  it("corriger une étiquette du plan ne touche pas aux ajouts", () => {
    const corrige = { pain: { kcal: 999, proteinG: 1, carbsG: 1, fatG: 1 } };
    const sans = consumedTotal(TRAIN, new Set(), {}, FOOD_LIBRARY, [kiwi]);
    const avec = consumedTotal(TRAIN, new Set(), corrige, FOOD_LIBRARY, [kiwi]);
    expect(avec.kcal).toBe(sans.kcal);
  });
});
