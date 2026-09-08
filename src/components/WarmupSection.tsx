import type { Warmup } from '../data/types';
import styles from '../screens/Session.module.css';

/**
 * §6 — échauffement en liste cochable, et non plus en paragraphe (défaut n°12
 * du prototype). L'état est en base : on peut poser le téléphone entre deux
 * exercices.
 */
export function WarmupSection({
  warmup,
  checked,
  onToggle,
}: {
  warmup: Warmup;
  checked: string[];
  onToggle: (itemId: string) => void;
}) {
  const done = warmup.items.filter((i) => checked.includes(i.id)).length;

  return (
    <section className={styles.section} aria-label="Échauffement">
      <div className={styles.sectionHead}>
        <span>Échauffement · {warmup.durationLabel}</span>
        <span className={styles.sectionCount}>
          {done} / {warmup.items.length}
        </span>
      </div>

      {warmup.items.map((item) => {
        const on = checked.includes(item.id);
        return (
          <button
            key={item.id}
            type="button"
            className={`${styles.warmupItem} ${on ? styles.warmupDone : ''}`}
            onClick={() => onToggle(item.id)}
            aria-pressed={on}
          >
            <span className={`${styles.box} ${on ? styles.boxOn : ''}`} aria-hidden="true">
              {on ? '✓' : ''}
            </span>
            <span className={styles.warmupLabel}>{item.label}</span>
            {item.detail && <span className={styles.warmupDetail}>{item.detail}</span>}
          </button>
        );
      })}
    </section>
  );
}
