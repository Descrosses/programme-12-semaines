import { mmss } from '../engine/format';
import type { RestTimer } from '../state/useRestTimer';
import styles from './RestBar.module.css';

/**
 * Barre de repos persistante. Gros chiffres, deux boutons, rien d'autre :
 * elle est lue entre deux séries, en trois secondes.
 */
export function RestBar({ timer }: { timer: RestTimer }) {
  if (!timer.state) return null;

  const { finished, remaining, overtime, ratio, state } = timer;

  return (
    <div
      className={`${styles.bar} ${finished ? styles.over : ''}`}
      role="timer"
      aria-live="off"
      aria-label={finished ? 'Repos terminé' : `Repos, ${mmss(remaining)} restantes`}
    >
      <div className={styles.track}>
        <div className={styles.fill} style={{ width: `${ratio * 100}%` }} />
      </div>

      <div className={styles.row}>
        <div className={`${styles.time} tnum`}>{finished ? `+${mmss(overtime)}` : mmss(remaining)}</div>

        <div className={styles.label}>
          {finished ? 'Repos terminé — série suivante' : state.label}
          {/* Court exprès : la barre est étroite, et le détail complet est dans
              les réglages. Ce qui compte ici est de savoir en un coup d'œil si
              l'écran va s'éteindre pendant le repos. */}
          {!finished && (
            <span className={styles.hold}>
              {timer.screenHeld ? 'écran allumé' : 'écran non tenu'}
            </span>
          )}
        </div>

        <div className={styles.actions}>
          {!finished && (
            <button type="button" className={styles.action} onClick={timer.add30}>
              +30 s
            </button>
          )}
          <button type="button" className={styles.action} onClick={timer.skip}>
            {finished ? 'OK' : 'Passer'}
          </button>
        </div>
      </div>
    </div>
  );
}
