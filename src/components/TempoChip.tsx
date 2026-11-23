/**
 * Le tempo en tête de carte (décision de Guillaume : « presque plus en
 * évidence que le reste »).
 *
 * Le texte est celui du programme, mot pour mot ; rien ne s'affiche quand
 * le programme n'écrit pas de tempo pour ce jour.
 *
 * Un tempo CHIFFRÉ (« Tempo 2-1-X-0 ») s'affiche en QUATRE CASES qui
 * s'expliquent seules — 2 descente · 1 en bas · X montée · 0 en haut —
 * (variante TB, Guillaume, 23 novembre), en ivoire doux pour rester discret ;
 * la case « X » (le plus vite possible) est rouge. Le lecteur d'écran lit la
 * phrase complète (`expliquerTempo`). Un tempo écrit en mots reste une
 * pastille : il se lit déjà.
 */
import { expliquerTempo, phasesTempo } from '../engine/tempo';
import styles from '../screens/Session.module.css';

export function TempoChip({ tempo }: { tempo: string | null }) {
  if (tempo === null) return null;
  const phases = phasesTempo(tempo);
  if (phases === null) {
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
  return (
    <span
      className={styles.tempoCases}
      role="img"
      aria-label={`${tempo} : ${expliquerTempo(tempo)!.join(', ')}.`}
      data-tempo={tempo}
    >
      <span className={styles.tempoCasesTitre} aria-hidden="true">
        Tempo
      </span>
      {phases.map((p) => (
        <span
          key={p.libelle}
          className={`${styles.tempoCase} ${p.explosif ? styles.tempoCaseX : ''}`}
          aria-hidden="true"
        >
          <span className={styles.tempoCaseValeur}>{p.valeur}</span>
          <span className={styles.tempoCaseLibelle}>{p.libelle}</span>
        </span>
      ))}
    </span>
  );
}
