/**
 * La carte « Créatine » de l'onglet Nutrition (lot 5 de
 * `regles-nutrition-mass.md`, §11 ; Guillaume, 27 novembre : « pour MASS et
 * POWER, la créatine est essentielle »).
 *
 * Repliée par défaut : un titre et un bouton. Ouverte, elle dit les QUATRE
 * paragraphes d'un bloc — la dose ne s'affiche jamais sans la phrase de
 * prudence qui la suit. Sous POWER et sous MASS seulement ; jamais dans le
 * plan historique de Guillaume, qui garde sa propre note.
 */

import { useState } from 'react';
import { CREATINE } from '../data/creatine';
import styles from '../screens/Screens.module.css';

export function CarteCreatine({ ouverteParDefaut = false }: { ouverteParDefaut?: boolean }) {
  const [ouverte, setOuverte] = useState(ouverteParDefaut);
  return (
    <section className={styles.card} data-creatine>
      <h2 className={styles.cardTitle}>{CREATINE.titre}</h2>
      {ouverte &&
        CREATINE.paragraphes.map((p, i) => (
          <p key={i} className={styles.cardSub}>
            {p.map((m, j) => (typeof m === 'string' ? m : <b key={j}>{m.gras}</b>))}
          </p>
        ))}
      <button
        type="button"
        className={styles.secondary}
        style={{ width: '100%', margin: '12px 0 0' }}
        aria-expanded={ouverte}
        onClick={() => setOuverte(!ouverte)}
      >
        {ouverte ? 'Replier' : 'Ce qu’il faut savoir'}
      </button>
    </section>
  );
}
