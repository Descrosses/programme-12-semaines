/**
 * « CHOISIR UN REPAS » — la bibliothèque, ouverte sur un créneau.
 *
 * ── Ce qu'elle ne fait pas : filtrer ──────────────────────────────────────
 *
 * Les dix-neuf cartes s'affichent toujours. Mesuré sur un profil réel de
 * trente-six aliments, un filtre strict n'en aurait laissé que neuf — et une
 * page presque vide à quelqu'un de plus sélectif. Une pastille dit plutôt ce
 * qui demandera un remplacement, et le remplacement se fait en un geste.
 *
 * ── La photo ──────────────────────────────────────────────────────────────
 *
 * Elle est décorative au sens strict : le nom du repas et sa liste
 * d'ingrédients disent déjà tout, donc son `alt` reste vide plutôt que de
 * répéter ce qui est écrit juste à côté. Chargement différé : dix-neuf
 * images ne doivent pas retarder l'ouverture de la feuille.
 */

import { Icon } from './Icon';
import { fr } from '../engine/format';
import {
  alimentsNonDeclares,
  photoDe,
  repasPourCreneau,
  type RepasBibliotheque,
} from '../data/bibliothequeRepas';
import type { RepasId } from '../data/planPerso';
import { macrosDeLigne, type Catalogue } from '../engine/planPersoTotaux';
import styles from './ChoixRepas.module.css';

/** La base du site : les photos vivent dans `public/repas`. */
const BASE = import.meta.env.BASE_URL;

function kcalDe(repas: RepasBibliotheque, catalogue: Catalogue): number {
  return Math.round(repas.lignes.reduce((a, l) => a + macrosDeLigne(l, catalogue).kcal, 0));
}

export function ChoixRepas({
  creneau,
  nomCreneau,
  preferes,
  catalogue,
  onChoisir,
  onFermer,
}: {
  creneau: RepasId;
  nomCreneau: string;
  preferes: readonly string[];
  catalogue: Catalogue;
  onChoisir: (repas: RepasBibliotheque) => void;
  onFermer: () => void;
}) {
  const repas = repasPourCreneau(creneau);

  return (
    <div className={styles.feuille} role="dialog" aria-label={`Choisir un repas — ${nomCreneau}`}>
      <div className={styles.tete}>
        <h3 className={styles.titre}>Choisir un {nomCreneau.toLowerCase()}</h3>
        <button type="button" className={styles.fermer} onClick={onFermer} aria-label="Fermer">
          ×
        </button>
      </div>
      <p className={styles.sous}>
        Une carte pose le repas entier avec ses quantités de référence. Tu ajustes ensuite — c’est
        un point de départ, pas une prescription.
      </p>

      <ul className={styles.liste}>
        {repas.map((r) => {
          const manquants = alimentsNonDeclares(r, preferes);
          return (
            <li key={r.id} className={styles.carte}>
              {/*
                Photo et texte sur une rangée, bouton en barre dessous.
                Les trois en colonnes ne tenaient pas : à 402 px le nom du
                repas se brisait sur trois lignes et le bouton devenait une
                plaque rouge de 62 × 133.
              */}
              <div className={styles.rangee}>
                <img
                  className={styles.photo}
                  src={`${BASE}${photoDe(r.id)}`}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  width={600}
                  height={600}
                />
                <div className={styles.texte}>
                  <p className={styles.nom}>{r.nom}</p>
                  <p className={styles.bas}>
                    <span className="tnum">
                      {kcalDe(r, catalogue).toLocaleString('fr-FR')} kcal
                    </span>
                    {preferes.length > 0 &&
                      (manquants.length === 0 ? (
                        <span className={`${styles.pastille} ${styles.ok}`}>Tous tes aliments</span>
                      ) : (
                        <span className={`${styles.pastille} ${styles.swap}`}>
                          {manquants.length === 1
                            ? '1 à remplacer'
                            : `${String(manquants.length)} à remplacer`}
                        </span>
                      ))}
                  </p>
                  <p className={styles.ingredients}>
                    {r.lignes
                      .map((l) => {
                        const f = catalogue[l.foodId];
                        if (!f) return l.foodId;
                        const q = fr(l.qty ?? 0);
                        return f.unit === 'unité'
                          ? `${f.label} ×${q}`
                          : `${f.label} ${q} ${f.unit}`;
                      })
                      .join(' · ')}
                  </p>
                </div>
              </div>
              <button type="button" className={styles.choisir} onClick={() => onChoisir(r)}>
                <Icon name="check" size="17px" />
                Choisir ce repas
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
