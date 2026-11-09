import { useEffect, useState } from 'react';
import type { ExerciseDef } from '../data/types';
import type { VisuelNom } from '../data/visuels';
import { referenceForExercise } from '../db/repo';
import { Icon } from './Icon';
import { useObjectUrl } from './PhotoCapture';
import { Visuel } from './Visuel';
import fiche from './FicheMouvement.module.css';
import styles from '../screens/Session.module.css';

/**
 * Le bloc « Fiche technique » de la carte d'exercice.
 *
 * ── Quelle image ───────────────────────────────────────────────────────────
 *
 * Dans cet ordre, la première qui existe :
 *
 * 1. la fiche DÉPOSÉE par la personne (« + Documenter » → « Ajouter la
 *    fiche »), rangée en base et propre à l'exercice ;
 * 2. la planche livrée avec le programme (`def.fiche`, MASS aujourd'hui) ;
 * 3. aucune : le bloc montre la photo d'ambiance du programme, et le bouton
 *    ouvre le panneau où l'on dépose la fiche.
 *
 * Quand une fiche existe, toucher le bloc l'ouvre en plein écran, et toucher
 * l'image l'agrandit encore — le même geste que la planche de MASS, avec la
 * même mise en page, pour qu'il n'y ait qu'une façon de lire une fiche.
 *
 * ── Ce qu'il n'est pas ─────────────────────────────────────────────────────
 *
 * Une photo d'ambiance n'est JAMAIS présentée comme une fiche : sans fiche, le
 * bouton dit « Ajouter la fiche technique », pas « Fiche technique ». Une
 * image de sprint sous un développé couché ne doit pas laisser croire qu'elle
 * montre le mouvement.
 */
export function FicheTechnique({
  def,
  ambiance,
  version,
  onAjouter,
}: {
  def: ExerciseDef;
  /** La photo d'ambiance du programme, quand il en a une. */
  ambiance?: VisuelNom;
  /** Change quand une fiche est déposée ou retirée : le bloc se relit. */
  version: number;
  /** Ouvre le panneau « Documenter », où la fiche se dépose. */
  onAjouter: () => void;
}) {
  const [blob, setBlob] = useState<Blob | null>(null);
  const [ouverte, setOuverte] = useState(false);
  const [zoom, setZoom] = useState(false);

  useEffect(() => {
    let vivant = true;
    void referenceForExercise(def.id).then((r) => {
      if (vivant) setBlob(r?.blob ?? null);
    });
    return () => {
      vivant = false;
    };
  }, [def.id, version]);

  const deposee = useObjectUrl(blob);
  const livree = def.fiche === undefined ? null : `${import.meta.env.BASE_URL}${def.fiche}`;
  const src = deposee ?? livree;

  return (
    <>
      <div className={styles.fiche}>
        {src !== null ? (
          <img src={src} alt="" className={styles.ficheImage} />
        ) : (
          ambiance && (
            <Visuel nom={ambiance} className={styles.ficheAmbiance} sizes="360px" fit="cover" />
          )
        )}
        <span className={styles.ficheVoile} aria-hidden="true" />
        <button
          type="button"
          className={styles.ficheBouton}
          onClick={() => {
            if (src === null) {
              onAjouter();
              return;
            }
            setZoom(false);
            setOuverte(true);
          }}
        >
          <Icon name={src === null ? 'image' : 'play'} size="16px" />
          {src === null ? 'Ajouter la fiche technique' : 'Fiche technique'}
        </button>
      </div>

      {ouverte && src !== null && (
        <div
          className={fiche.overlay}
          role="dialog"
          aria-modal="true"
          aria-label={`Fiche technique : ${def.name}`}
        >
          <div className={fiche.barre}>
            <span>{zoom ? 'Fais défiler pour lire' : 'Touche l’image pour l’agrandir'}</span>
            <button type="button" className={fiche.fermer} onClick={() => setOuverte(false)}>
              Fermer
            </button>
          </div>
          <div className={fiche.defilement}>
            <button
              type="button"
              className={fiche.imageBouton}
              onClick={() => setZoom((z) => !z)}
              aria-label={zoom ? 'Réduire la fiche' : 'Agrandir la fiche'}
            >
              <img
                src={src}
                alt={`Fiche technique : ${def.name}`}
                className={zoom ? fiche.imageZoom : fiche.image}
              />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
