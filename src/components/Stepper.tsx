import { useEffect, useRef, useState } from 'react';
import { fr } from '../engine/format';
import styles from './Stepper.module.css';

/**
 * Saisie sans clavier : deux boutons de 48 px et une valeur au milieu.
 *
 * Le champ est pré-rempli avec le plan. Guillaume ne touche que ce qui
 * diffère.
 *
 * Le composant émet un **écart** (`onStep(+step)` / `onStep(-step)`) et non
 * une valeur absolue : passer de 105 à 120 demande six appuis rapides, et si
 * chacun calculait « valeur affichée + 2,5 » à partir d'un rendu périmé, cinq
 * appuis sur six seraient perdus. Le parent applique l'écart avec une mise à
 * jour fonctionnelle, donc aucun appui ne se perd.
 *
 * ---
 *
 * `onCommit` ouvre la porte de sortie : la grille du stepper convient aux
 * séries d'entraînement (reps, charge, RPE, tout tombe sur des paliers), mais
 * pas à une mesure. 78,3 kg de poids de corps ou 1,74 s sur 10 m ne sont sur
 * aucune grille. Quand `onCommit` est fourni, un appui sur la valeur ouvre le
 * clavier numérique du téléphone et accepte n'importe quel nombre.
 *
 * Appui simple et non appui long : sur iOS, un appui long déclenche la
 * sélection de texte et le menu système avant d'arriver jusqu'à nous. Un appui
 * simple est fiable, et le crayon dit qu'il est là.
 */
export function Stepper({
  label,
  value,
  step,
  min,
  max,
  unit,
  onStep,
  onCommit,
  tone = 'normal',
}: {
  label: string;
  value: number | null;
  step: number;
  min: number;
  max: number;
  unit?: string;
  onStep: (delta: number) => void;
  /** Fourni = saisie clavier possible sur la valeur. Absent = steppers seuls. */
  onCommit?: (value: number | null) => void;
  tone?: 'normal' | 'accent';
}) {
  const current = value ?? min;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) input.current?.select();
  }, [editing]);

  function open() {
    setDraft(value === null ? '' : fr(value));
    setEditing(true);
  }

  function commit() {
    setEditing(false);
    if (!onCommit) return;
    // Champ vidé = mesure effacée. Saisie illisible = on ne touche à rien,
    // plutôt que d'écrire un 0 qui passerait pour un résultat.
    if (draft.trim() === '') return onCommit(null);
    const parsed = parseDecimal(draft);
    if (parsed !== null) onCommit(clamp(parsed, min, max));
  }

  return (
    <div className={`${styles.stepper} ${tone === 'accent' ? styles.accent : ''}`}>
      {/* L'unité vit dans le libellé, pas à côté du nombre : ça laisse toute la
          largeur au chiffre, qui est ce qu'on lit d'un coup d'œil. */}
      <div className={styles.label} id={`lbl-${label}`}>
        {label}
        {unit && <span className={styles.unit}> · {unit}</span>}
      </div>
      <div className={styles.controls}>
        <button
          type="button"
          className={styles.button}
          onClick={() => onStep(-step)}
          disabled={editing || current <= min}
          aria-label={`${label} moins ${fr(step)}`}
        >
          −
        </button>

        {editing ? (
          <input
            ref={input}
            className={`${styles.input} tnum`}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            aria-label={`${label}${unit ? ` en ${unit}` : ''}`}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commit();
              if (e.key === 'Escape') setEditing(false);
            }}
          />
        ) : onCommit ? (
          <button
            type="button"
            className={`${styles.value} ${styles.valueEditable} tnum`}
            onClick={open}
            aria-label={`${label} — saisir la valeur au clavier`}
          >
            {value === null ? '—' : fr(value)}
            <span className={styles.pencil} aria-hidden="true">
              ✎
            </span>
          </button>
        ) : (
          <output className={`${styles.value} tnum`} aria-labelledby={`lbl-${label}`}>
            {value === null ? '—' : fr(value)}
          </output>
        )}

        <button
          type="button"
          className={styles.button}
          onClick={() => onStep(step)}
          disabled={editing || current >= max}
          aria-label={`${label} plus ${fr(step)}`}
        >
          +
        </button>
      </div>
    </div>
  );
}

/** Applique un écart en restant dans les bornes, sans flottant sale. */
export function stepValue(prev: number | null, delta: number, min: number, max: number): number {
  return clamp((prev ?? min) + delta, min, max);
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(n * 100) / 100));
}

/**
 * Lit ce que Guillaume tape au clavier du téléphone.
 *
 * La virgule est la touche décimale d'un clavier français : elle doit marcher
 * aussi bien que le point. Une chaîne vide efface la mesure (`null`) ; une
 * saisie illisible ne change rien plutôt que d'écrire 0.
 */
export function parseDecimal(raw: string): number | null {
  const cleaned = raw.trim().replace(',', '.').replace(/\s/g, '');
  if (cleaned === '') return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}
