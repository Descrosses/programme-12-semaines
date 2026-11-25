import { useEffect, useState } from 'react';
import type { ExerciseDef, InfosFiche } from '../data/types';
import type { VisuelNom } from '../data/visuels';
import { illustration } from '../db/programmesImportes';
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
 * 2. l'illustration IMPORTÉE avec un programme ME, MYSELF & I
 *    (`def.illustration`, une image de la table `illustrations`) ;
 * 3. la planche livrée avec le programme (`def.fiche`, MASS 4 et une partie
 *    de POWER 12 — ou une fiche de MAJK qu'un programme importé désigne) ;
 * 4. aucune : le bloc montre la photo d'ambiance du programme, et le bouton
 *    ouvre le panneau où l'on dépose la fiche.
 *
 * La fiche déposée passe en premier : c'est le choix de la personne. La
 * retirer fait réapparaître l'illustration importée.
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
  titre,
}: {
  def: ExerciseDef;
  /** Le mouvement nommé sur le bouton, quand deux fiches se suivent (contraste). */
  titre?: string;
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
    const empreinte = def.illustration;
    void (async () => {
      const deposee = await referenceForExercise(def.id);
      const image =
        deposee?.blob ?? (empreinte === undefined ? null : (await illustration(empreinte))?.blob);
      if (vivant) setBlob(image ?? null);
    })();
    return () => {
      vivant = false;
    };
  }, [def.id, def.illustration, version]);

  // L'image lue en base : la fiche déposée, sinon l'illustration importée.
  const enBase = useObjectUrl(blob);
  const livree = def.fiche === undefined ? null : `${import.meta.env.BASE_URL}${def.fiche}`;
  const src = enBase ?? livree;

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
          {src === null
            ? 'Ajouter la fiche technique'
            : titre === undefined
              ? 'Fiche technique'
              : `Fiche — ${titre}`}
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
            {def.infosFiche !== undefined && (
              <InfosDeLaFiche infos={def.infosFiche} onCompris={() => setOuverte(false)} />
            )}
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Sous la planche : les muscles sollicités et les erreurs à éviter (maquette
 * « Fiche » de la DA MAJK). Le texte vient du tableau validé par Guillaume ;
 * une liste vide n'affiche pas sa section, rien n'est inventé à la place.
 *
 * « C'est compris — aux séries » referme la fiche : on la lit AVANT la
 * première série, puis on revient à la carte.
 */
export function InfosDeLaFiche({ infos, onCompris }: { infos: InfosFiche; onCompris: () => void }) {
  const muscles = infos.principaux.length + infos.secondaires.length > 0;
  return (
    <div className={fiche.infos}>
      {muscles && (
        <section className={fiche.carteInfo} aria-labelledby="fiche-muscles">
          <h2 id="fiche-muscles" className={fiche.titreInfo}>
            Muscles sollicités
          </h2>
          {infos.principaux.length > 0 && (
            <>
              <p className={fiche.sousTitreInfo}>Principaux</p>
              <ul className={fiche.pastilles}>
                {infos.principaux.map((m) => (
                  <li key={m} className={fiche.pastillePrincipale}>
                    {m}
                  </li>
                ))}
              </ul>
            </>
          )}
          {infos.secondaires.length > 0 && (
            <>
              <p className={fiche.sousTitreInfo}>Secondaires</p>
              <ul className={fiche.pastilles}>
                {infos.secondaires.map((m) => (
                  <li key={m} className={fiche.pastille}>
                    {m}
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}

      {infos.erreurs.length > 0 && (
        <section className={fiche.carteInfo} aria-labelledby="fiche-erreurs">
          <h2 id="fiche-erreurs" className={fiche.titreInfo}>
            <Icon name="alert" size="18px" />
            Erreurs à éviter
          </h2>
          <ul className={fiche.erreurs}>
            {infos.erreurs.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </section>
      )}

      <button type="button" className={fiche.compris} onClick={onCompris}>
        <Icon name="check" size="18px" />
        C’est compris — aux séries
      </button>
    </div>
  );
}
