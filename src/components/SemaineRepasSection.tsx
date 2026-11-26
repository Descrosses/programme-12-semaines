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
 *   lui-même n'est jamais effacé ;
 * - « Je ne mange pas » (§4) : une ligne repliée au-dessus des jours, qui
 *   dit ce qui est écarté ; dépliée, une case par famille, et TOUJOURS la
 *   phrase « vérifie la composition de chaque repas ». Changer ses
 *   exclusions ne recompose rien : un bandeau dit ce qui reste à écarter.
 */

import { useState } from 'react';
import type { CibleSaisie } from '../data/ciblesNutrition';
import type { LibraryFood } from '../data/foodLibrary';
import type { JourneePerso, RepasId } from '../data/planPerso';
import { repasPourCreneau } from '../data/bibliothequeRepas';
import { EXCLUSIONS, type ExclusionId } from '../data/exclusionsRepas';
import { CRENEAUX_AUTO, JOURS_SEMAINE } from '../data/reglesRepasAutomatiques';
import { REPAS_PERSO } from '../data/planPerso';
import {
  alimentsExclus,
  exclusDansSemaine,
  nomExclusion,
  repasExclu,
} from '../engine/exclusionsRepas';
import type { Catalogue } from '../engine/planPersoTotaux';
import {
  ajusterRepas,
  cibleAChange,
  partDe,
  type CibleRepas,
  type SemaineRepas,
} from '../engine/semaineRepas';
import { ListeCourses } from './ListeCourses';
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

type Confirmation = null | {
  action: 'recomposer' | 'quitter';
  ou: 'haut' | 'bas' | 'exclus';
};

/**
 * « Je ne mange pas » (§4) — repliée, une ligne ; dépliée, une case par
 * famille. La phrase de prudence est toujours là, dépliée ou non.
 */
export function JeNeMangePas({
  exclusions,
  onChange,
  ouvertParDefaut = false,
}: {
  exclusions: readonly ExclusionId[];
  onChange: (suivantes: ExclusionId[]) => void;
  ouvertParDefaut?: boolean;
}) {
  const [ouvert, setOuvert] = useState(ouvertParDefaut);
  const set = alimentsExclus(exclusions);
  // Les créneaux que la bibliothèque ne peut plus remplir du tout.
  const vides = CRENEAUX_AUTO.filter((c) =>
    repasPourCreneau(c.repas).every((r) => repasExclu(r, set)),
  ).map((c) => REPAS_PERSO.find((r) => r.id === c.repas)!.nom.toLowerCase());
  return (
    <section className={styles.exclusions} aria-label="Je ne mange pas" data-exclusions>
      <div className={styles.exclusionsTete}>
        <p className={styles.texte}>
          <b>Je ne mange pas :</b>{' '}
          {exclusions.length === 0 ? 'rien d’écarté' : exclusions.map(nomExclusion).join(', ')}
        </p>
        <button
          type="button"
          className={styles.lien}
          aria-expanded={ouvert}
          onClick={() => setOuvert(!ouvert)}
        >
          {ouvert ? 'Terminé' : 'Modifier'}
        </button>
      </div>
      {ouvert && (
        <div className={styles.puces} role="group" aria-label="Familles écartées">
          {EXCLUSIONS.map((e) => {
            const on = exclusions.includes(e.id);
            return (
              <button
                key={e.id}
                type="button"
                className={`${styles.puce} ${on ? styles.puceOn : ''}`}
                aria-pressed={on}
                onClick={() =>
                  onChange(
                    EXCLUSIONS.filter((x) => (x.id === e.id ? !on : exclusions.includes(x.id))).map(
                      (x) => x.id,
                    ),
                  )
                }
              >
                {e.nom}
              </button>
            );
          })}
        </div>
      )}
      {vides.length > 0 && (
        <p className={styles.texte} data-creneaux-vides>
          Avec ces exclusions, la bibliothèque n’a aucun repas pour : {vides.join(', ')}. Ces repas
          restent vides : compose-les à la main.
        </p>
      )}
      <p className={styles.note}>
        Les exclusions ne couvrent que ces familles. Avec une allergie, vérifie toujours la
        composition de chaque repas.
      </p>
    </section>
  );
}

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
  faits,
  exclusions = [],
  onExclusions,
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
  /** Les repas d'AUJOURD'HUI cochés « mangé », et le geste pour en cocher un. */
  faits?: { pris: ReadonlySet<RepasId>; onBasculer: (repas: RepasId) => void };
  /** §4 — ce que la personne ne mange pas. */
  exclusions?: readonly ExclusionId[];
  onExclusions?: (suivantes: ExclusionId[]) => void;
}) {
  const [jour, setJour] = useState(jourInitial);
  const exclus = alimentsExclus(exclusions);
  const restants = exclusDansSemaine(semaine, exclus).map((id) => catalogue[id]?.label ?? id);
  const [confirme, setConfirme] = useState<Confirmation>(null);
  /** « Ma liste de courses » ouverte en plein écran (lot 3). */
  const [courses, setCourses] = useState(false);
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

      {onExclusions && <JeNeMangePas exclusions={exclusions} onChange={onExclusions} />}

      {restants.length > 0 && (
        <section className={styles.bandeau} role="note" data-semaine="exclus-restants">
          <p className={styles.texte}>
            <b>Ta semaine contient encore</b> un aliment que tu ne manges pas :{' '}
            {restants.join(', ')}.
          </p>
          {confirme?.ou === 'exclus' ? (
            confirmation()
          ) : (
            <button
              type="button"
              className={styles.principal}
              onClick={() => setConfirme({ action: 'recomposer', ou: 'exclus' })}
            >
              Recomposer ma semaine
            </button>
          )}
        </section>
      )}

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
        exclus={exclus}
        semaine={{
          jour: nomJour,
          // On ne coche que les repas du jour : la semaine est un modèle.
          ...(faits && jour === jourInitial ? { faits } : {}),
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
            <button type="button" className={styles.principal} onClick={() => setCourses(true)}>
              Ma liste de courses
            </button>
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
      {courses && (
        <ListeCourses semaine={semaine} catalogue={catalogue} onFermer={() => setCourses(false)} />
      )}
    </>
  );
}
