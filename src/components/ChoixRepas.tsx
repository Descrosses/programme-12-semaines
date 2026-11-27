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
 * Sur la carte, elle reste décorative : le nom est écrit juste à côté, son
 * `alt` est vide. Toucher la carte ouvre la FICHE (`FicheRepas`) : la photo
 * en grand et la composition entière. Chargement différé : les images ne
 * doivent pas retarder l'ouverture de la feuille.
 */

import { useState } from 'react';
import { Icon } from './Icon';
import { FicheRepas } from './FicheRepas';
import { fr } from '../engine/format';
import {
  alimentsNonDeclares,
  repasPourCreneau,
  type RepasBibliotheque,
} from '../data/bibliothequeRepas';
import type { RepasId } from '../data/planPerso';
import { repasExclu } from '../engine/exclusionsRepas';
import { macrosDeLigne, type Catalogue } from '../engine/planPersoTotaux';
import { VignetteRepas } from './VignetteRepas';
import styles from './ChoixRepas.module.css';

/** La base du site : les photos vivent dans `public/repas`. */

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
  ajuster,
  exclus,
}: {
  creneau: RepasId;
  nomCreneau: string;
  preferes: readonly string[];
  catalogue: Catalogue;
  onChoisir: (repas: RepasBibliotheque) => void;
  onFermer: () => void;
  /**
   * Semaine automatique : chaque carte est ajustée à la part de ce repas
   * (`regles-repas-automatiques.md` §2) AVANT d'être montrée — la carte, sa
   * fiche et le repas posé disent les mêmes quantités. Absent : les
   * quantités de référence, comme avant.
   */
  ajuster?: (repas: RepasBibliotheque) => RepasBibliotheque;
  /**
   * Ce que la personne ne mange pas (`regles-repas-automatiques.md` §4) :
   * un repas qui en contient un seul aliment n'est pas proposé. Une
   * exception assumée à « les cartes s'affichent toujours » : c'est de la
   * sécurité, pas un goût.
   */
  exclus?: ReadonlySet<string>;
}) {
  const tous = repasPourCreneau(creneau);
  const permis = exclus ? tous.filter((r) => !repasExclu(r, exclus)) : tous;
  const ecartes = tous.length - permis.length;
  const repas = permis.map((r) => (ajuster ? ajuster(r) : r));
  /** Le plat dont la fiche (grande photo, composition) est ouverte. */
  const [detail, setDetail] = useState<RepasBibliotheque | null>(null);

  return (
    <div className={styles.feuille} role="dialog" aria-label={`Choisir un repas — ${nomCreneau}`}>
      <div className={styles.tete}>
        <h3 className={styles.titre}>Choisir un {nomCreneau.toLowerCase()}</h3>
        <button type="button" className={styles.fermer} onClick={onFermer} aria-label="Fermer">
          ×
        </button>
      </div>
      <p className={styles.sous}>
        {ajuster
          ? 'Les quantités sont déjà ajustées à ta cible pour ce repas. Tu peux toujours les régler ensuite.'
          : 'Une carte pose le repas entier avec ses quantités de référence. Tu ajustes ensuite — c’est un point de départ, pas une prescription.'}
      </p>
      {ecartes > 0 && (
        <p className={styles.sous} data-ecartes={ecartes}>
          {ecartes === 1
            ? '1 repas n’est pas proposé : il contient un aliment que tu ne manges pas.'
            : `${String(ecartes)} repas ne sont pas proposés : ils contiennent un aliment que tu ne manges pas.`}
        </p>
      )}

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
              {/*
                Toute la rangée ouvre la fiche : photo en grand et
                composition entière. La ligne d'ingrédients de la carte est
                coupée à sa largeur — elle sert à reconnaître l'assiette, la
                fiche sert à la lire.
              */}
              <button
                type="button"
                className={styles.rangee}
                onClick={() => setDetail(r)}
                aria-label={`Voir la composition : ${r.nom}`}
              >
                <VignetteRepas repas={r} className={styles.photo} />
                <span className={styles.texte}>
                  <span className={styles.nom}>{r.nom}</span>
                  <span className={styles.bas}>
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
                  </span>
                  <span className={styles.ingredients}>
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
                  </span>
                  <span className={styles.voir}>
                    Voir la composition
                    <Icon name="arrow-right" size="14px" />
                  </span>
                </span>
              </button>
              <button type="button" className={styles.choisir} onClick={() => onChoisir(r)}>
                <Icon name="check" size="17px" />
                Choisir ce repas
              </button>
            </li>
          );
        })}
      </ul>
      {detail !== null && (
        <FicheRepas
          repas={detail}
          catalogue={catalogue}
          preferes={preferes}
          {...(ajuster ? { legende: 'Ingrédients · quantités ajustées à ta cible' } : {})}
          onChoisir={() => {
            const r = detail;
            setDetail(null);
            onChoisir(r);
          }}
          onFermer={() => setDetail(null)}
        />
      )}
    </div>
  );
}
