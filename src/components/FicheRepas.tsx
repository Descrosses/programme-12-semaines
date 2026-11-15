/**
 * LA FICHE D'UN PLAT DE LA BIBLIOTHÈQUE — en plein écran.
 *
 * Retour de Guillaume (15 novembre) : devant les cartes, on ne pouvait ni
 * agrandir la photo ni lire la composition entière — la ligne d'ingrédients
 * est coupée à la largeur de la carte. On choisissait donc un plat sans savoir
 * ce qu'il y avait dedans.
 *
 * La fiche montre la photo en grand, puis chaque ingrédient avec SA quantité
 * de référence et SES kcal, et la barre des macros du plat. Le bouton
 * « Choisir ce repas » y est aussi : on décide après avoir lu, sans revenir
 * chercher la carte.
 *
 * Le même gabarit que la fiche de mouvement (plein écran, « Fermer » en haut).
 */

import { useEffect } from 'react';
import { Icon } from './Icon';
import { MacroBar } from './MacroBar';
import { fr } from '../engine/format';
import { stateLabel } from '../data/foodLibrary';
import { alimentsNonDeclares, photoDe, type RepasBibliotheque } from '../data/bibliothequeRepas';
import { arrondirMacros, macrosDeLigne, type Catalogue } from '../engine/planPersoTotaux';
import type { Macros } from '../engine/nutrition';
import styles from './FicheRepas.module.css';

const BASE = import.meta.env.BASE_URL;

export function macrosDuPlat(repas: RepasBibliotheque, catalogue: Catalogue): Macros {
  return arrondirMacros(
    repas.lignes.reduce(
      (a, l) => {
        const m = macrosDeLigne(l, catalogue);
        return {
          kcal: a.kcal + m.kcal,
          proteinG: a.proteinG + m.proteinG,
          carbsG: a.carbsG + m.carbsG,
          fatG: a.fatG + m.fatG,
        };
      },
      { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 },
    ),
  );
}

export function FicheRepas({
  repas,
  catalogue,
  preferes,
  onChoisir,
  onFermer,
}: {
  repas: RepasBibliotheque;
  catalogue: Catalogue;
  preferes: readonly string[];
  /** Absent quand la fiche est ouverte depuis un repas déjà posé. */
  onChoisir?: () => void;
  onFermer: () => void;
}) {
  const m = macrosDuPlat(repas, catalogue);
  const manquants = new Set(alimentsNonDeclares(repas, preferes));

  // Échap ferme, et la page dessous ne défile pas pendant la lecture.
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

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label={repas.nom}>
      <div className={styles.barre}>
        <span className={styles.barreTitre}>Composition du repas</span>
        <button type="button" className={styles.fermer} onClick={onFermer}>
          Fermer
        </button>
      </div>
      <div className={styles.defilement}>
        <img
          className={styles.photo}
          src={`${BASE}${photoDe(repas.id)}`}
          alt={repas.nom}
          width={600}
          height={600}
          decoding="async"
        />
        <div className={styles.corps}>
          <h2 className={styles.nom}>{repas.nom}</h2>
          <p className={`${styles.kcal} tnum`}>
            {m.kcal.toLocaleString('fr-FR')} <span>kcal</span>
          </p>
          <MacroBar macros={m} />

          <h3 className={styles.sousTitre}>Ingrédients · quantités de référence</h3>
          <ul className={styles.liste}>
            {repas.lignes.map((l) => {
              const f = catalogue[l.foodId];
              if (!f) return null;
              const q = l.qty ?? 0;
              const unite = f.unit === 'unité' ? (q > 1 ? 'unités' : 'unité') : f.unit;
              const etat = stateLabel(f.referenceState);
              return (
                <li key={l.foodId} className={styles.ligne}>
                  <span className={styles.ligneNom}>
                    {f.label}
                    {manquants.has(l.foodId) && (
                      <span className={styles.horsListe}>Pas dans tes aliments déclarés</span>
                    )}
                  </span>
                  <span className={`${styles.ligneQte} tnum`}>
                    {fr(q)} {unite}
                    {etat && ` ${etat}`}
                  </span>
                  <span className={`${styles.ligneKcal} tnum`}>
                    {Math.round(macrosDeLigne(l, catalogue).kcal)} kcal
                  </span>
                </li>
              );
            })}
          </ul>
          <p className={styles.note}>
            Un point de départ, pas une prescription : une fois le repas posé, tu ajustes chaque
            quantité, tu remplaces ou tu retires un aliment.
          </p>
        </div>
      </div>
      {onChoisir && (
        <div className={styles.pied}>
          <button type="button" className={styles.choisir} onClick={onChoisir}>
            <Icon name="check" size="17px" />
            Choisir ce repas
          </button>
        </div>
      )}
    </div>
  );
}
