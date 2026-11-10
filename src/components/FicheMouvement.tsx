/**
 * La planche d'exécution d'un mouvement, en plein écran.
 *
 * ── Pourquoi deux niveaux d'agrandissement ───────────────────────────────
 *
 * L'infographie fait 1 199 px de large et porte du texte : les points clés,
 * les muscles ciblés, les repères de position. Réduite à la largeur d'un
 * téléphone, l'image se voit mais le texte ne se lit pas. Un premier appui
 * l'ouvre en plein écran, un second l'agrandit au-delà de la largeur de
 * l'écran et on la fait défiler pour lire.
 *
 * C'est la raison pour laquelle les fichiers ne sont pas recompressés plus
 * petit : ce qu'on gagnerait en poids, on le perdrait en lisibilité, sur la
 * seule chose que cette image sert à montrer.
 *
 * ── Hors ligne ───────────────────────────────────────────────────────────
 *
 * Les fiches sont pré-cachées (voir `vite.config.ts`), pas chargées à la
 * demande. « Comment on fait ce mouvement, déjà ? » est une question de
 * salle, et une salle est l'endroit où le réseau manque. Une fiche qui
 * n'arrive qu'en 4G serait absente précisément quand elle sert.
 */

import { useState } from 'react';
import { Icon } from './Icon';
import type { ExerciseDef } from '../data/types';
import styles from './FicheMouvement.module.css';

/**
 * `variante` dit OÙ le bouton est posé, pas à quoi il ressemble en soi.
 *
 * - `bandeau` : la barre pleine largeur, telle qu'elle était.
 * - `entete`  : la pastille compacte, sur la ligne du nom du mouvement.
 *
 * La planche affichée, elle, est exactement la même dans les deux cas.
 */
export function FicheMouvement({
  def,
  variante = 'bandeau',
}: {
  def: ExerciseDef;
  variante?: 'bandeau' | 'entete';
}) {
  const [ouverte, setOuverte] = useState(false);
  const [zoom, setZoom] = useState(false);

  // Un mouvement sans planche n'affiche pas de bouton.
  if (def.fiche === undefined) return null;
  const src = `${import.meta.env.BASE_URL}${def.fiche}`;

  return (
    <>
      <button
        type="button"
        className={variante === 'entete' ? styles.ouvrirEntete : styles.ouvrir}
        onClick={() => {
          setZoom(false);
          setOuverte(true);
        }}
      >
        <Icon name="image" size={variante === 'entete' ? '16px' : '18px'} />
        {variante === 'entete' ? 'Fiche' : 'Fiche du mouvement'}
      </button>

      {ouverte && (
        <div
          className={styles.overlay}
          role="dialog"
          aria-modal="true"
          aria-label={`Fiche du mouvement : ${def.name}`}
        >
          <div className={styles.barre}>
            <span>{zoom ? 'Fais défiler pour lire' : 'Touche l’image pour l’agrandir'}</span>
            <button type="button" className={styles.fermer} onClick={() => setOuverte(false)}>
              Fermer
            </button>
          </div>
          <div className={styles.defilement}>
            <button
              type="button"
              className={styles.imageBouton}
              onClick={() => setZoom((z) => !z)}
              aria-label={zoom ? 'Réduire la fiche' : 'Agrandir la fiche'}
            >
              <img
                src={src}
                alt={`Fiche technique : ${def.name}`}
                className={zoom ? styles.imageZoom : styles.image}
              />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
