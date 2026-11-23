/**
 * Le tempo en tête de carte, à droite du RPE et du repos (décision de
 * Guillaume : « presque plus en évidence que le reste »).
 *
 * Le texte est celui du programme, mot pour mot ; rien ne s'affiche quand
 * le programme n'écrit pas de tempo pour ce jour.
 *
 * Un tempo CHIFFRÉ (« Tempo 3-1-X-1 ») se touche : il s'explique phase par
 * phase, juste dessous (Guillaume, 23 novembre : « détailler à l'endroit
 * propice la signification du tempo »). Un tempo écrit en mots se lit déjà.
 */
import { useState } from 'react';
import { expliquerTempo } from '../engine/tempo';
import styles from '../screens/Session.module.css';

export function TempoChip({ tempo }: { tempo: string | null }) {
  const [ouvert, setOuvert] = useState(false);
  if (tempo === null) return null;
  const explication = expliquerTempo(tempo);
  const contenu = (
    <>
      <span className={styles.tempoIcone} aria-hidden="true">
        ⏱
      </span>
      <span className="visually-hidden">Tempo : </span>
      {tempo}
    </>
  );
  if (explication === null) return <span className={styles.tempo}>{contenu}</span>;
  return (
    <>
      <button
        type="button"
        className={`${styles.tempo} ${styles.tempoBouton}`}
        aria-expanded={ouvert}
        onClick={() => setOuvert((o) => !o)}
      >
        {contenu}
        <span className={styles.tempoAide} aria-hidden="true">
          ?
        </span>
      </button>
      {ouvert && (
        <span className={styles.tempoExplication} role="note">
          <b>{tempo}</b> : {explication.join(' · ')}.
        </span>
      )}
    </>
  );
}
