/**
 * Les aliments mangés en plus du plan.
 *
 * Ce qu'ils résolvent : le plan prévoyait un petit-déjeuner à 645 kcal, et
 * Guillaume y a ajouté un kiwi et 30 g de confiture. Sans eux, la journée
 * comptait 645 kcal — et la seule façon d'enregistrer le kiwi était de
 * modifier le plan, c'est-à-dire de confondre ce qui était prévu avec ce qui
 * a été mangé.
 */

import { describe, expect, it } from "vitest";
import {
  consumedTotal,
  extraMacros,
  extrasTotal,
  mealsTotal,
  type ExtraFood,
  type FoodOverrides,
} from "./nutrition";
import { NUTRITION_TARGETS } from "../data/nutrition";

const TRAIN = NUTRITION_TARGETS.train;
import { FOOD_LIBRARY } from "../data/foodLibrary";

const kiwi: ExtraFood = { mealId: "petit-dejeuner", foodId: "kiwi", qty: 1 };
const PREMIER = TRAIN.meals[0]!.id;

describe("ce que pèse un aliment ajouté", () => {
  it("une quantité en grammes se met à l’échelle de la composition", () => {
    const food = FOOD_LIBRARY["pain"]!;
    const m = extraMacros({ mealId: "x", foodId: "pain", qty: 30 });
    expect(m.kcal).toBeCloseTo((food.kcal * 30) / food.per, 5);
    expect(m.proteinG).toBeCloseTo((food.proteinG * 30) / food.per, 5);
  });

  /*
   * Un aliment personnalisé supprimé laisse des ajouts orphelins. Les compter
   * à partir d'une composition inventée serait pire que de ne pas les
   * compter : la journée afficherait un chiffre qui ne vient de nulle part.
   */
  it("un identifiant inconnu vaut zéro, pas une composition inventée", () => {
    expect(
      extraMacros({ mealId: "x", foodId: "ceci-nexiste-pas", qty: 100 }),
    ).toEqual({
      kcal: 0,
      proteinG: 0,
      carbsG: 0,
      fatG: 0,
    });
  });

  it("une étiquette corrigée corrige aussi ce qui a déjà été compté", () => {
    const corrige: FoodOverrides = {
      pain: { kcal: 400, proteinG: 12, carbsG: 70, fatG: 4 },
    };
    const avant = extraMacros({ mealId: "x", foodId: "pain", qty: 100 });
    const apres = extraMacros(
      { mealId: "x", foodId: "pain", qty: 100 },
      corrige,
    );
    expect(apres.kcal).toBe(400);
    expect(apres.kcal).not.toBe(avant.kcal);
  });

  it("le total additionne tous les ajouts de la journée", () => {
    const deux: ExtraFood[] = [
      { mealId: "a", foodId: "pain", qty: 30 },
      { mealId: "b", foodId: "pain", qty: 70 },
    ];
    expect(extrasTotal(deux).kcal).toBe(Math.round(FOOD_LIBRARY["pain"]!.kcal));
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
   * La règle qui compte : un ajout est déjà vrai quand il est saisi. On ne
   * note un kiwi qu'après l'avoir mangé. Le conditionner à la coche du repas
   * pousserait à cocher le repas pour faire apparaître le kiwi — et
   * fausserait les deux informations d'un coup.
   */
  it("un ajout compte sans attendre la coche du repas", () => {
    const rien = consumedTotal(TRAIN, new Set());
    expect(rien.kcal).toBe(0);
    const avecKiwi = consumedTotal(TRAIN, new Set(), {}, FOOD_LIBRARY, [kiwi]);
    expect(avecKiwi.kcal).toBeGreaterThan(0);
    expect(avecKiwi.kcal).toBe(extrasTotal([kiwi]).kcal);
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
    expect(avecAjout.kcal).toBe(repasSeul.kcal + extrasTotal([kiwi]).kcal);
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
      { mealId: PREMIER, foodId: "pain", qty: 100 },
    ]);
    expect(avec.carbsG).toBeGreaterThan(sans.carbsG);
    expect(avec.proteinG).toBeGreaterThan(sans.proteinG);
    expect(avec.fatG).toBeGreaterThanOrEqual(sans.fatG);
  });

  it("dépasser le plan se voit : le consommé passe au-dessus du prévu", () => {
    const tous = new Set(TRAIN.meals.map((m) => m.id));
    const plan = mealsTotal(TRAIN);
    const avec = consumedTotal(TRAIN, tous, {}, FOOD_LIBRARY, [
      { mealId: PREMIER, foodId: "pain", qty: 200 },
    ]);
    expect(avec.kcal).toBeGreaterThan(plan.kcal);
  });
});
