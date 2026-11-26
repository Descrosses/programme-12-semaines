/**
 * ME, MYSELF & I — « Thème de ce programme », dans ses Réglages (lot 1 du
 * 26 novembre).
 *
 * Trois choix : ME, MYSELF & I (par défaut), POWER, MASS. Le thème change
 * les couleurs et les bandeaux photo, rien d'autre : le programme, ses
 * séances et le titre « ME, MYSELF & I » restent. Le choix est enregistré
 * sur le programme importé (il part dans la sauvegarde, et une nouvelle
 * version du programme le reprend).
 *
 * Le choix en cours se dit par un mot (« CHOISI ») et un contour, jamais par
 * la couleur seule.
 */

import { useState } from 'react';
import { choisirTheme } from '../../db/programmesImportes';
import { THEMES_IMPORTES, type ThemeImporte } from '../../data/themesImportes';
import local from './ThemeProgramme.module.css';
import styles from '../../screens/Screens.module.css';

export function ThemeProgramme({
  cle,
  actuel,
  onChange,
}: {
  /** La clé du programme importé (celle du cycle). */
  cle: string;
  actuel: ThemeImporte;
  /** Appelé une fois le choix enregistré : l'appli se repeint. */
  onChange: () => void;
}) {
  const [envoi, setEnvoi] = useState(false);
  return (
    <section className={styles.card} aria-labelledby="theme-programme">
      <h2 className={styles.cardTitle} id="theme-programme">
        Thème de ce programme
      </h2>
      <p className={styles.cardSub}>
        Les couleurs et les photos de l’appli pendant ce programme. Tes séances ne changent pas.
      </p>
      <div className={local.liste} role="radiogroup" aria-labelledby="theme-programme">
        {THEMES_IMPORTES.map((t) => {
          const choisi = t.id === actuel;
          return (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={choisi}
              disabled={envoi}
              className={`${local.choix} ${choisi ? local.choisi : ''}`}
              onClick={() => {
                if (choisi) return;
                setEnvoi(true);
                void choisirTheme(cle, t.id).then(() => {
                  setEnvoi(false);
                  onChange();
                });
              }}
            >
              <span className={local.apercu} aria-hidden="true">
                {t.apercu.map((c) => (
                  <span key={c} style={{ background: c }} />
                ))}
              </span>
              <span className={local.texte}>
                <b>{t.nom}</b>
                <span>{t.description}</span>
              </span>
              {choisi && <span className={local.pastille}>Choisi</span>}
            </button>
          );
        })}
      </div>
    </section>
  );
}
