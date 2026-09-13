import { useState } from 'react';
import type { FoodItem, Meal } from '../data/nutrition';
import {
  effectiveItem,
  isEdited,
  itemMacros,
  type FoodOverride,
  type FoodOverrides,
} from '../engine/nutrition';
import styles from '../screens/Screens.module.css';

const fr = (n: number) => n.toLocaleString('fr-FR', { maximumFractionDigits: 1 });

/**
 * Les aliments d'un repas, modifiables ligne par ligne.
 *
 * Ce que ça résout : le plan dit « 280 g de skyr nature », mais le skyr de la
 * marque que Guillaume achète n'est pas celui de la table de composition. Sans
 * ça, il faudrait refaire le total à la main à chaque changement de marque —
 * c'est-à-dire ne pas le refaire.
 *
 * Ce que ça N'EST PAS : un journal alimentaire. On ne saisit rien chaque jour,
 * on ne cherche rien dans une base d'aliments, on n'ajoute ni ne retire aucune
 * ligne. La composition du repas vient du .md et n'est pas modifiable ici ; ce
 * qui l'est, ce sont les valeurs d'une ligne qui existe déjà.
 *
 * Les champs sont ceux d'une étiquette de produit — kcal et macros POUR 100 g,
 * quantité à part — pour que Guillaume recopie sans convertir. Une ligne
 * modifiée est marquée, et se remet à l'original d'un bouton : une valeur qu'on
 * ne peut pas annuler est une valeur qu'on n'ose pas changer.
 */
export function MealItems({
  meal,
  overrides,
  onSave,
  onReset,
}: {
  meal: Meal;
  overrides: FoodOverrides;
  onSave: (foodId: string, patch: FoodOverride) => Promise<void>;
  onReset: (foodId: string) => Promise<void>;
}) {
  const [open, setOpen] = useState<string | null>(null);
  if (!meal.items) return null;

  return (
    <ul className={styles.foodList}>
      {meal.items.map((item) => (
        <FoodLine
          key={item.id}
          item={item}
          overrides={overrides}
          open={open === item.id}
          onToggle={() => setOpen((v) => (v === item.id ? null : item.id))}
          onSave={onSave}
          onReset={onReset}
        />
      ))}
    </ul>
  );
}

function FoodLine({
  item,
  overrides,
  open,
  onToggle,
  onSave,
  onReset,
}: {
  item: FoodItem;
  overrides: FoodOverrides;
  open: boolean;
  onToggle: () => void;
  onSave: (foodId: string, patch: FoodOverride) => Promise<void>;
  onReset: (foodId: string) => Promise<void>;
}) {
  const courant = effectiveItem(item, overrides);
  const macros = itemMacros(item, overrides);
  const modifie = isEdited(item, overrides);

  /*
   * Le brouillon est en texte, pas en nombre : pendant la frappe un champ passe
   * par « 1 », « 1, », « 1,0 » — des états qu'un number rejetterait ou
   * réécrirait sous le doigt. La conversion a lieu à l'enregistrement.
   */
  const [draft, setDraft] = useState(() => champsDe(courant));

  function ouvrir() {
    setDraft(champsDe(courant));
    onToggle();
  }

  async function enregistrer() {
    const patch: FoodOverride = {};
    for (const c of CHAMPS) {
      const lu = lireDecimal(draft[c.cle]);
      // On ne stocke que ce qui DIFFÈRE du .md : une valeur recopiée à
      // l'identique ne doit pas figer la ligne, sinon corriger le plan ne
      // profiterait plus jamais à Guillaume.
      if (lu !== null && lu !== item[c.cle]) patch[c.cle] = lu;
    }
    await onSave(item.id, patch);
    onToggle();
  }

  const unite = item.unit === 'unité' ? (courant.qty > 1 ? 'unités' : 'unité') : item.unit;
  const base = item.per === 1 ? 'par unité' : 'pour 100 g';

  return (
    <li className={styles.foodItem}>
      <button type="button" className={styles.foodRow} onClick={ouvrir} aria-expanded={open}>
        <span className={styles.foodName}>
          {item.label}
          {modifie && (
            <span className={styles.foodBadge} title="Valeur modifiée">
              modifié
            </span>
          )}
        </span>
        <span className={`${styles.foodQty} tnum`}>
          {fr(courant.qty)} {unite}
        </span>
        <span className={`${styles.foodKcal} tnum`}>{Math.round(macros.kcal)} kcal</span>
      </button>

      {open && (
        <div className={styles.foodEdit}>
          <p className={styles.fieldHint} style={{ margin: '0 0 10px' }}>
            Recopie l’étiquette de ton produit. Les macros sont <b>{base}</b>, la quantité est à
            part — comme sur l’emballage.
          </p>
          <div className={styles.foodGrid}>
            {CHAMPS.map((c) => (
              <label key={c.cle} className={styles.foodField}>
                {/* La base (« pour 100 g ») est dite une fois au-dessus : la
                    répéter sur chaque étiquette les faisait passer à la ligne. */}
                <span className={styles.foodFieldLabel}>
                  {c.cle === 'qty' ? `Quantité · ${unite}` : c.label}
                </span>
                <input
                  className={styles.input}
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  value={draft[c.cle]}
                  onChange={(e) => setDraft((d) => ({ ...d, [c.cle]: e.target.value }))}
                />
              </label>
            ))}
          </div>
          <div className={styles.foodActions}>
            <button type="button" className={styles.primary} onClick={() => void enregistrer()}>
              Enregistrer
            </button>
            {modifie && (
              <button
                type="button"
                className={styles.secondary}
                onClick={() =>
                  void (async () => {
                    await onReset(item.id);
                    onToggle();
                  })()
                }
              >
                Valeur d’origine
              </button>
            )}
          </div>
          {modifie && (
            <p className={styles.fieldHint}>
              D’origine : {fr(item.qty)} {item.unit === 'unité' ? 'unité' : item.unit} · {fr(item.kcal)}{' '}
              kcal · {fr(item.proteinG)} P · {fr(item.carbsG)} G · {fr(item.fatG)} L ({base}).
            </p>
          )}
        </div>
      )}
    </li>
  );
}

type Cle = 'qty' | 'kcal' | 'proteinG' | 'carbsG' | 'fatG';

const CHAMPS: Array<{ cle: Cle; label: string }> = [
  { cle: 'qty', label: 'Quantité' },
  { cle: 'kcal', label: 'kcal' },
  { cle: 'proteinG', label: 'Protéines' },
  { cle: 'carbsG', label: 'Glucides' },
  { cle: 'fatG', label: 'Lipides' },
];

const champsDe = (i: FoodItem): Record<Cle, string> => ({
  qty: fr(i.qty),
  kcal: fr(i.kcal),
  proteinG: fr(i.proteinG),
  carbsG: fr(i.carbsG),
  fatG: fr(i.fatG),
});

/**
 * Lit un nombre saisi au clavier français, virgule comprise.
 *
 * Champ vide ou illisible = `null`, donc « ne touche à rien » : écrire 0 à la
 * place ferait disparaître un aliment sur une faute de frappe.
 */
export function lireDecimal(texte: string): number | null {
  const t = texte.trim().replace(',', '.');
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? n : null;
}
