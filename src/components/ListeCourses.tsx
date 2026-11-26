/**
 * « Ma liste de courses » — plein écran, comme la fiche d'un plat
 * (`regles-courses.md`, lot 3 de la nutrition automatique).
 *
 * Décisions d'ergonomie (Guillaume, 26 novembre : « je compte sur toi ») :
 * - un rayon par bloc, une case par article, la quantité en gros à droite :
 *   on la lit d'un coup d'œil, téléphone dans une main, panier dans l'autre ;
 * - l'article coché se barre et descend d'un ton, il ne disparaît pas (un
 *   doigt qui glisse se rattrape) ;
 * - ce qui a été converti du cuit au cru le dit une fois, en tête, avec la
 *   limite honnête : poids prêt à cuire, épluchures et parures en plus ;
 * - « Partager la liste » : la feuille de partage, sinon le presse-papiers.
 */

import { useEffect, useMemo, useState } from 'react';
import {
  afficherQuantite,
  listeDeCourses,
  texteDeLaListe,
  type ListeCourses as Liste,
} from '../engine/courses';
import type { Catalogue } from '../engine/planPersoTotaux';
import type { SemaineRepas } from '../engine/semaineRepas';
import { ecrireCoches, lireCoches } from '../state/coursesCochees';
import styles from './ListeCourses.module.css';

/** « semaine du 26 novembre » — la date de composition. */
function titreDe(semaine: SemaineRepas): string {
  const [y, m, d] = semaine.creeLe.split('-').map(Number);
  const date = new Date(Date.UTC(y!, m! - 1, d!)).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  });
  return `Mes courses — semaine composée le ${date}`;
}

export function ContenuCourses({
  liste,
  coches,
  onBasculer,
}: {
  liste: Liste;
  coches: ReadonlySet<string>;
  onBasculer: (foodId: string) => void;
}) {
  const converti = liste.rayons.some((r) => r.articles.some((a) => a.converti));
  return (
    <>
      <p className={styles.texte}>
        Les 7 jours de ta semaine de repas, à acheter.
        {converti &&
          ' Riz, pâtes, viandes, légumes cuits… sont donnés en poids cru : poids prêt à cuire, prévois les épluchures et les parures en plus.'}
      </p>
      {liste.sansQuantite > 0 && (
        <p className={styles.note}>
          {liste.sansQuantite === 1
            ? '1 aliment sans quantité n’est pas compté.'
            : `${String(liste.sansQuantite)} aliments sans quantité ne sont pas comptés.`}
        </p>
      )}
      {liste.rayons.map((r) => (
        <section key={r.id} className={styles.rayon} aria-label={r.nom}>
          <h3 className={styles.rayonNom}>{r.nom}</h3>
          <ul className={styles.articles}>
            {r.articles.map((a) => {
              const fait = coches.has(a.foodId);
              return (
                <li key={a.foodId} className={styles.article} data-coche={fait || undefined}>
                  <label className={styles.ligne}>
                    <input
                      type="checkbox"
                      className={styles.case}
                      checked={fait}
                      onChange={() => onBasculer(a.foodId)}
                    />
                    <span className={styles.nom}>{a.nom}</span>
                    <span className={`${styles.quantite} tnum`}>
                      {afficherQuantite(a.quantite, a.unite)}
                    </span>
                  </label>
                  {a.conserve !== undefined && (
                    <p className={styles.conserve}>
                      ou {afficherQuantite(a.conserve, a.unite)} en conserve, égouttées
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </>
  );
}

export function ListeCourses({
  semaine,
  catalogue,
  onFermer,
}: {
  semaine: SemaineRepas;
  catalogue: Catalogue;
  onFermer: () => void;
}) {
  const liste = useMemo(() => listeDeCourses(semaine, catalogue), [semaine, catalogue]);
  const [coches, setCoches] = useState<Set<string>>(() => lireCoches(semaine.creeLe));
  const [statut, setStatut] = useState('');

  // Échap ferme, et la page dessous ne défile pas pendant les courses.
  useEffect(() => {
    const touche = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onFermer();
    };
    document.addEventListener('keydown', touche);
    const avant = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', touche);
      document.body.style.overflow = avant;
    };
  }, [onFermer]);

  const basculer = (id: string) => {
    const suivant = new Set(coches);
    if (suivant.has(id)) suivant.delete(id);
    else suivant.add(id);
    setCoches(suivant);
    ecrireCoches(semaine.creeLe, suivant);
  };

  const partager = async () => {
    const texte = texteDeLaListe(liste, titreDe(semaine));
    try {
      if (typeof navigator.share === 'function') {
        await navigator.share({ title: 'Mes courses', text: texte });
        return;
      }
      await navigator.clipboard.writeText(texte);
      setStatut('Liste copiée : colle-la où tu veux.');
    } catch (e) {
      // Partage annulé par la personne : rien à dire.
      if (e instanceof DOMException && e.name === 'AbortError') return;
      setStatut('Impossible de partager ici. Fais une capture d’écran de la liste.');
    }
  };

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-label="Ma liste de courses"
    >
      <div className={styles.barre}>
        <span className={styles.barreTitre}>Ma liste de courses</span>
        <button type="button" className={styles.fermer} onClick={onFermer}>
          Fermer
        </button>
      </div>
      <div className={styles.defilement}>
        <div className={styles.corps}>
          <ContenuCourses liste={liste} coches={coches} onBasculer={basculer} />
        </div>
      </div>
      <div className={styles.pied}>
        <button type="button" className={styles.partager} onClick={() => void partager()}>
          Partager la liste
        </button>
        <p className={styles.statut} role="status" aria-live="polite">
          {statut}
        </p>
      </div>
    </div>
  );
}
