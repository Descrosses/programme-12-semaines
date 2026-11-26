/**
 * La semaine de repas automatique, dans l'onglet Nutrition
 * (`regles-repas-automatiques.md`, lot 2 de la nutrition automatique).
 *
 * Décisions d'ergonomie (Guillaume, 26 novembre : « je compte sur toi ») :
 * - UN écran, la journée : une rangée Lun → Dim, ouverte sur aujourd'hui, et
 *   en dessous les repas du jour choisi — le « Mon plan » de toujours, en
 *   mode semaine (photo du plat, quantités, « Changer ce repas » qui propose
 *   la bibliothèque déjà ajustée à la part du repas) ;
 * - la semaine ne bouge jamais toute seule : si la cible change, un bandeau
 *   le dit et propose de recomposer ;
 * - recomposer et revenir à « Mon plan » demandent une confirmation : ils
 *   jettent les changements faits à la main dans la semaine. « Mon plan »
 *   lui-même n'est jamais effacé.
 */

import { useState } from 'react';
import type { CibleSaisie } from '../data/ciblesNutrition';
import type { LibraryFood } from '../data/foodLibrary';
import type { JourneePerso } from '../data/planPerso';
import { JOURS_SEMAINE } from '../data/reglesRepasAutomatiques';
import type { Catalogue } from '../engine/planPersoTotaux';
import {
  ajusterRepas,
  cibleAChange,
  partDe,
  type CibleRepas,
  type SemaineRepas,
} from '../engine/semaineRepas';
import { PlanPerso } from './PlanPerso';
import styles from './SemaineRepasSection.module.css';

const kcalFr = (n: number) => n.toLocaleString('fr-FR');

/** La carte qui propose de composer la semaine, tant qu'il n'y en a pas. */
export function ProposerSemaine({
  cible,
  onComposer,
}: {
  cible: CibleRepas;
  onComposer: () => void;
}) {
  return (
    <section className={styles.carte} data-semaine="a-composer">
      <h2 className={styles.titre}>Ta semaine de repas</h2>
      <p className={styles.texte}>
        MAJK compose 7 jours de repas avec sa bibliothèque, quantités ajustées à ta cible (
        {kcalFr(cible.kcal)} kcal
        {cible.proteinG !== null ? `, ${cible.proteinG} g de protéines` : ''}). Tu changes ce que tu
        veux ensuite.
      </p>
      <button type="button" className={styles.principal} onClick={onComposer}>
        Composer ma semaine
      </button>
    </section>
  );
}

type Confirmation = null | { action: 'recomposer' | 'quitter'; ou: 'haut' | 'bas' };

export function SemaineRepasSection({
  semaine,
  cibleActuelle,
  jourInitial,
  cible,
  preferes,
  catalogue,
  customs,
  onCreateCustom,
  onChange,
  onRecomposer,
  onQuitter,
}: {
  semaine: SemaineRepas;
  /** La cible d'aujourd'hui dans les réglages, pour dire si elle a changé. */
  cibleActuelle: CibleRepas | null;
  /** 0 = lundi. */
  jourInitial: number;
  /** La cible affichée par « Mon plan » pour l'écart du jour. */
  cible: CibleSaisie | null;
  preferes: readonly string[];
  catalogue: Catalogue;
  customs: LibraryFood[];
  onCreateCustom: (food: LibraryFood) => void;
  onChange: (suivante: SemaineRepas) => void;
  onRecomposer: () => void;
  onQuitter: () => void;
}) {
  const [jour, setJour] = useState(jourInitial);
  const [confirme, setConfirme] = useState<Confirmation>(null);
  const change = cibleAChange(semaine, cibleActuelle);
  const nomJour = JOURS_SEMAINE[jour] ?? JOURS_SEMAINE[0];

  /** Recomposer ou retirer jette les changements faits à la main : on le dit. */
  const confirmation = () =>
    confirme === null ? null : (
      <div className={styles.confirmation} role="alertdialog" aria-label="Confirmer">
        <p className={styles.texte}>
          {confirme.action === 'recomposer'
            ? 'MAJK recompose les 7 jours sur ta cible actuelle. Les changements faits à la main dans ta semaine seront perdus.'
            : 'Ta semaine de repas sera retirée, avec les changements faits à la main. « Mon plan » revient tel que tu l’avais laissé.'}
        </p>
        <button
          type="button"
          className={styles.principal}
          onClick={() => {
            setConfirme(null);
            if (confirme.action === 'recomposer') onRecomposer();
            else onQuitter();
          }}
        >
          {confirme.action === 'recomposer' ? 'Recomposer' : 'Retirer ma semaine'}
        </button>
        <button type="button" className={styles.fantome} onClick={() => setConfirme(null)}>
          Annuler
        </button>
      </div>
    );

  return (
    <>
      <div className={styles.jours} role="group" aria-label="Jour de la semaine">
        {JOURS_SEMAINE.map((nom, i) => (
          <button
            key={nom}
            type="button"
            className={`${styles.jour} ${i === jour ? styles.jourOn : ''}`}
            aria-pressed={i === jour}
            aria-label={nom}
            {...(i === jourInitial ? { 'data-aujourdhui': '' } : {})}
            onClick={() => setJour(i)}
          >
            {nom.slice(0, 3)}
          </button>
        ))}
      </div>

      {change && cibleActuelle !== null && (
        <section className={styles.bandeau} role="note" data-semaine="cible-changee">
          <p className={styles.texte}>
            <b>Ta cible a changé</b> ({kcalFr(semaine.cible.kcal)} → {kcalFr(cibleActuelle.kcal)}{' '}
            kcal). Les quantités de ta semaine suivent encore l’ancienne.
          </p>
          {confirme?.ou === 'haut' ? (
            confirmation()
          ) : (
            <button
              type="button"
              className={styles.principal}
              onClick={() => setConfirme({ action: 'recomposer', ou: 'haut' })}
            >
              Recomposer ma semaine
            </button>
          )}
        </section>
      )}

      <PlanPerso
        kind="train"
        journee={semaine.jours[jour] ?? {}}
        preferes={preferes}
        catalogue={catalogue}
        customs={customs}
        onCreateCustom={onCreateCustom}
        cible={cible}
        onChange={(suivante: JourneePerso) =>
          onChange({ ...semaine, jours: semaine.jours.map((j, i) => (i === jour ? suivante : j)) })
        }
        onCopier={null}
        semaine={{
          jour: nomJour,
          ajusteur: (creneau) => {
            const part = partDe(creneau);
            if (part === null) return undefined;
            return (r) => ajusterRepas(r, part, semaine.cible, catalogue);
          },
        }}
      />

      <section className={styles.actions}>
        {confirme?.ou === 'bas' ? (
          confirmation()
        ) : (
          <>
            {!change && (
              <button
                type="button"
                className={styles.secondaire}
                onClick={() => setConfirme({ action: 'recomposer', ou: 'bas' })}
              >
                Recomposer ma semaine
              </button>
            )}
            <button
              type="button"
              className={styles.fantome}
              onClick={() => setConfirme({ action: 'quitter', ou: 'bas' })}
            >
              Revenir à mon plan composé à la main
            </button>
          </>
        )}
      </section>
    </>
  );
}
