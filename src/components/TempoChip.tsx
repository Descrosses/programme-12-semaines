/**
 * Le tempo en tête de carte, à droite du RPE et du repos (décision de
 * Guillaume : « presque plus en évidence que le reste »).
 *
 * Le texte est celui du programme, mot pour mot ; rien ne s'affiche quand
 * le programme n'écrit pas de tempo pour ce jour.
 */
import styles from '../screens/Session.module.css';

export function TempoChip({ tempo }: { tempo: string | null }) {
  if (tempo === null) return null;
  return (
    <span className={styles.tempo}>
      <span className={styles.tempoIcone} aria-hidden="true">
        ⏱
      </span>
      <span className="visually-hidden">Tempo : </span>
      {tempo}
    </span>
  );
}
