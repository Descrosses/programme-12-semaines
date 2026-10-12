/**
 * « J'ai mangé un kiwi en plus » — l'ajout d'un aliment hors plan.
 *
 * ── Ce qu'il ne fait pas ───────────────────────────────────────────────────
 *
 * Il ne modifie pas le plan. Le plan dit ce qui était prévu, l'ajout dit ce
 * qui a réellement été avalé en plus, et les deux restent lisibles
 * séparément. Sans cette séparation, « j'ai mangé un kiwi mardi » devient
 * « le programme prévoit un kiwi », et trois semaines plus tard plus personne
 * ne sait ce qui était la consigne.
 *
 * ── Deux écrans, pas un ────────────────────────────────────────────────────
 *
 * On choisit l'aliment, PUIS la quantité. Le remplacement d'une ligne du plan
 * ne demande pas de quantité — elle est déjà là, juste derrière. Ici il n'y a
 * rien derrière : 30 g de confiture et 300 g de confiture ne sont pas le même
 * ajout, et deviner serait pire que demander.
 *
 * La liste d'aliments est celle du remplacement, au composant près. Deux
 * bibliothèques qui divergeraient seraient la pire façon de s'en apercevoir.
 */

import { useState } from "react";
import {
  FOOD_LIBRARY,
  stateLabel,
  type LibraryFood,
} from "../data/foodLibrary";
import { extraMacros } from "../engine/nutrition";
import { fr } from "../engine/format";
import { FoodPicker } from "./FoodSwapSheet";
import { Stepper, stepValue } from "./Stepper";
import styles from "../screens/Screens.module.css";

/** Pas, minimum et maximum du curseur, selon ce que l'aliment se compte. */
function reglage(food: LibraryFood) {
  return food.unit === "unité"
    ? { step: 1, min: 1, max: 20, depart: 1, unite: food.unit }
    : { step: 10, min: 5, max: 1000, depart: 100, unite: "g" };
}

export function AddFoodSheet({
  mealName,
  customs,
  onAdd,
  onCreateCustom,
  onClose,
}: {
  mealName: string;
  customs: LibraryFood[];
  /*
   * L'aliment ENTIER remonte, pas son seul identifiant : c'est sa composition
   * du jour qui sera recopiée dans la ligne, et c'est ici qu'on la tient.
   */
  onAdd: (food: LibraryFood, qty: number) => void;
  onCreateCustom: (food: LibraryFood) => void;
  onClose: () => void;
}) {
  const [choisi, setChoisi] = useState<LibraryFood | null>(null);
  const [qty, setQty] = useState(100);

  /** Le catalogue vu par la feuille : la bibliothèque, plus ce que tu as créé. */
  const catalogue: Record<string, LibraryFood> = {
    ...FOOD_LIBRARY,
    ...Object.fromEntries(customs.map((f) => [f.id, f])),
  };

  function choisir(foodId: string) {
    const food = catalogue[foodId];
    if (!food) return;
    setChoisi(food);
    setQty(reglage(food).depart);
  }

  const r = choisi ? reglage(choisi) : null;
  const apercu = choisi ? extraMacros({ ...choisi, qty }) : null;

  return (
    <div
      className={styles.sheet}
      role="dialog"
      aria-label={`Ajouter un aliment à ${mealName}`}
    >
      <div className={styles.sheetHead}>
        <h3 className={styles.sheetTitle}>
          {choisi
            ? `Combien de ${choisi.label.toLowerCase()} ?`
            : `Ajouter à ${mealName}`}
        </h3>
        <button
          type="button"
          className={styles.sheetClose}
          onClick={onClose}
          aria-label="Fermer"
        >
          ×
        </button>
      </div>

      {!choisi ? (
        <FoodPicker
          customs={customs}
          // Pas de famille évidente pour un ajout : on ouvre sur les fruits,
          // de loin ce qui s'ajoute le plus souvent hors plan.
          categorieParDefaut="fruit"
          suggestion=""
          onPick={choisir}
          onCreate={(f) => {
            onCreateCustom(f);
            setChoisi(f);
            setQty(reglage(f).depart);
          }}
        />
      ) : (
        <div className={styles.foodEdit}>
          <p className={styles.fieldHint} style={{ margin: "0 0 12px" }}>
            {Math.round(choisi.kcal)} kcal{" "}
            {choisi.per === 1 ? "par unité" : "pour 100 g"}
            {stateLabel(choisi.referenceState)
              ? ` · ${stateLabel(choisi.referenceState)}`
              : ""}
          </p>

          <Stepper
            label={choisi.unit === "unité" ? "Quantité" : "Quantité"}
            value={qty}
            step={r!.step}
            min={r!.min}
            max={r!.max}
            unit={r!.unite}
            tone="accent"
            onStep={(d) => setQty((v) => stepValue(v, d, r!.min, r!.max))}
            onCommit={(v) => setQty(v ?? r!.depart)}
          />

          {apercu && (
            <p className={styles.fieldHint} style={{ margin: "12px 0 0" }}>
              Ça ajoute <b>{Math.round(apercu.kcal)} kcal</b> — G{" "}
              {Math.round(apercu.carbsG)} g · P {Math.round(apercu.proteinG)} g
              · L {Math.round(apercu.fatG)} g.
            </p>
          )}

          <div className={styles.foodActions}>
            <button
              type="button"
              className={styles.primary}
              onClick={() => {
                onAdd(choisi, qty);
                onClose();
              }}
            >
              Ajouter {fr(qty)} {r!.unite}
            </button>
            <button
              type="button"
              className={styles.secondary}
              onClick={() => setChoisi(null)}
            >
              Changer d’aliment
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
