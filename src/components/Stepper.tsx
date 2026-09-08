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
 */
export function Stepper({
  label,
  value,
  step,
  min,
  max,
  unit,
  onStep,
  tone = 'normal',
}: {
  label: string;
  value: number | null;
  step: number;
  min: number;
  max: number;
  unit?: string;
  onStep: (delta: number) => void;
  tone?: 'normal' | 'accent';
}) {
  const current = value ?? min;

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
          disabled={current <= min}
          aria-label={`${label} moins ${fr(step)}`}
        >
          −
        </button>
        <output className={`${styles.value} tnum`} aria-labelledby={`lbl-${label}`}>
          {value === null ? '—' : fr(value)}
        </output>
        <button
          type="button"
          className={styles.button}
          onClick={() => onStep(step)}
          disabled={current >= max}
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
  const next = (prev ?? min) + delta;
  return Math.min(max, Math.max(min, Math.round(next * 100) / 100));
}
