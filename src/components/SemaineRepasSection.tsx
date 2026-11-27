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
 * - « Je ne mange pas » (§4) : une case par famille, et TOUJOURS la phrase
 *   « vérifie la composition de chaque repas ». Changer ses exclusions ne
 *   recompose rien : un bandeau dit ce qui reste à écarter.
 *
 * REFONTE « JOURNAL » (maquette C, Guillaume, 26 novembre : « go refonte C
 * avec la possibilité d'ajouter un repas ») :
 * - les jours sont des pastilles datées (la semaine en cours), aujourd'hui
 *   repéré par son contour même quand un autre jour est choisi ;
 * - les repas se lisent en frise (`PlanPerso` en mode semaine) ;
 * - les outils descendent en tuiles sous la journée : courses, « Je ne
 *   mange pas », point des 2 semaines, recomposer ;
 * - le NOMBRE DE REPAS (§1 : 4, 5 ou 6) se choisit en recomposant — par la
 *   tuile ou par « + Ajouter un repas » sous le dernier repas. Un nombre que
 *   la cible ne tient pas n'est pas proposé, et l'écran dit pourquoi.
 */

import { useState, type ReactNode } from 'react';
import type { CibleSaisie } from '../data/ciblesNutrition';
import type { LibraryFood } from '../data/foodLibrary';
import type { JourneePerso, RepasId } from '../data/planPerso';
import { repasPourCreneau } from '../data/bibliothequeRepas';
import { EXCLUSIONS, type ExclusionId } from '../data/exclusionsRepas';
import {
  CIBLE_MINIMALE,
  JOURS_SEMAINE,
  NOMBRES_DE_REPAS,
  type NombreRepas,
} from '../data/reglesRepasAutomatiques';
import { REPAS_JOURNEE } from '../data/planPerso';
import {
  alimentsExclus,
  exclusDansSemaine,
  nomExclusion,
  repasExclu,
} from '../engine/exclusionsRepas';
import type { Catalogue } from '../engine/planPersoTotaux';
import { ajouterJours } from '../engine/reajustement';
import {
  ajusterRepas,
  cibleAChange,
  creneauxDe,
  nombreAdmis,
  nombreDeRepas,
  nombresPossibles,
  partDe,
  type CibleRepas,
  type SemaineRepas,
} from '../engine/semaineRepas';
import { Icon } from './Icon';
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
  ou: 'cible' | 'exclus' | 'ajout' | 'outils';
  /** Le nombre de repas présélectionné en ouvrant (« + Ajouter un repas »). */
  nombre?: NombreRepas;
};

/**
 * « Je ne mange pas » (§4) — une case par famille. La phrase de prudence est
 * toujours là, dépliée ou non.
 *
 * Seule (`ouvert` absent) : une ligne repliée avec son « Modifier ». Pilotée
 * par la tuile de la semaine (`ouvert` donné) : pas de ligne d'en-tête, la
 * tuile la remplace.
 */
export function JeNeMangePas({
  exclusions,
  onChange,
  ouvertParDefaut = false,
  ouvert: ouvertImpose,
  creneaux = creneauxDe(4).map((c) => c.repas),
}: {
  exclusions: readonly ExclusionId[];
  onChange: (suivantes: ExclusionId[]) => void;
  ouvertParDefaut?: boolean;
  ouvert?: boolean;
  /** Les repas que la semaine compose : ceux dont on dit qu'ils restent vides. */
  creneaux?: readonly RepasId[];
}) {
  const [ouvertLocal, setOuvert] = useState(ouvertParDefaut);
  const ouvert = ouvertImpose ?? ouvertLocal;
  const set = alimentsExclus(exclusions);
  // Les créneaux que la bibliothèque ne peut plus remplir du tout.
  const vides = creneaux
    .filter((c) => repasPourCreneau(c).every((r) => repasExclu(r, set)))
    .map((c) => REPAS_JOURNEE.find((r) => r.id === c)!.nom.toLowerCase());
  return (
    <section className={styles.exclusions} aria-label="Je ne mange pas" data-exclusions>
      {ouvertImpose === undefined && (
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
      )}
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

/**
 * §1 — « Repas par jour » : 4, 5 ou 6. Un nombre que la cible ne tient pas
 * est montré désactivé, avec son seuil : on dit pourquoi plutôt que de le
 * cacher.
 */
export function ChoixNombreRepas({
  nombre,
  kcal,
  onChange,
}: {
  nombre: NombreRepas;
  kcal: number;
  onChange: (n: NombreRepas) => void;
}) {
  const possibles = nombresPossibles(kcal);
  const refuses = NOMBRES_DE_REPAS.filter((n) => !possibles.includes(n));
  return (
    <div className={styles.nombre} data-nombre-repas>
      <p className={styles.nombreTitre} id="repas-par-jour">
        Repas par jour
      </p>
      <div className={styles.nombreChoix} role="group" aria-labelledby="repas-par-jour">
        {NOMBRES_DE_REPAS.map((n) => (
          <button
            key={n}
            type="button"
            className={`${styles.nombreBouton} ${n === nombre ? styles.nombreOn : ''}`}
            aria-pressed={n === nombre}
            disabled={!possibles.includes(n)}
            onClick={() => onChange(n)}
          >
            {n}
          </button>
        ))}
      </div>
      {/* Ce que ce nombre compose, lu dans les règles (§1) : rien d'inventé. */}
      <p className={styles.note} data-nombre-detail>
        {creneauxDe(nombre)
          .map((c) => REPAS_JOURNEE.find((r) => r.id === c.repas)!.nom)
          .join(' · ')}
      </p>
      {refuses.length > 0 && (
        <p className={styles.note} data-nombre-refuse>
          {refuses
            .map((n) => `${String(n)} repas : à partir de ${kcalFr(CIBLE_MINIMALE[n])} kcal`)
            .join(' ; ')}
          . En dessous, les collations de la bibliothèque dépasseraient leur part, et ta journée
          avec.
        </p>
      )}
    </div>
  );
}

export function SemaineRepasSection({
  semaine,
  cibleActuelle,
  jourInitial,
  aujourdhui,
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
  apresRepas,
  point,
  conseilRepas,
}: {
  semaine: SemaineRepas;
  /** La cible d'aujourd'hui dans les réglages, pour dire si elle a changé. */
  cibleActuelle: CibleRepas | null;
  /** 0 = lundi. */
  jourInitial: number;
  /** AAAA-MM-JJ — pour dater les sept pastilles de la semaine en cours. */
  aujourdhui: string;
  /** La cible affichée par « Mon plan » pour l'écart du jour. */
  cible: CibleSaisie | null;
  preferes: readonly string[];
  catalogue: Catalogue;
  customs: LibraryFood[];
  onCreateCustom: (food: LibraryFood) => void;
  onChange: (suivante: SemaineRepas) => void;
  /** Recompose les 7 jours, avec ce nombre de repas par jour (§1). */
  onRecomposer: (nombre: NombreRepas) => void;
  onQuitter: () => void;
  /** Les repas d'AUJOURD'HUI cochés « mangé », et le geste pour en cocher un. */
  faits?: { pris: ReadonlySet<RepasId>; onBasculer: (repas: RepasId) => void };
  /** §4 — ce que la personne ne mange pas. */
  exclusions?: readonly ExclusionId[];
  onExclusions?: (suivantes: ExclusionId[]) => void;
  /** Ce que l'écran pose entre les repas et les outils (aliments en plus, pesée). */
  apresRepas?: ReactNode;
  /** Le point des 2 semaines quand il n'est pas dû : sa date, et sa phrase. */
  point?: { resume: string; detail: ReactNode };
  /**
   * Un conseil sur le nombre de repas, dit au-dessus de « + Ajouter un
   * repas » (MASS en prise de masse : `regles-nutrition-mass.md`, §6).
   */
  conseilRepas?: string;
}) {
  const [jour, setJour] = useState(jourInitial);
  const exclus = alimentsExclus(exclusions);
  const restants = exclusDansSemaine(semaine, exclus).map((id) => catalogue[id]?.label ?? id);
  const [confirme, setConfirme] = useState<Confirmation>(null);
  /** « Ma liste de courses » ouverte en plein écran (lot 3). */
  const [courses, setCourses] = useState(false);
  /** Le panneau déplié sous les tuiles. */
  const [panneau, setPanneau] = useState<null | 'exclusions' | 'point'>(null);
  const change = cibleAChange(semaine, cibleActuelle);
  const nomJour = JOURS_SEMAINE[jour] ?? JOURS_SEMAINE[0];
  const nombre = nombreDeRepas(semaine);
  const creneaux = creneauxDe(nombre).map((c) => c.repas);
  // La cible sur laquelle on recomposerait : celle d'aujourd'hui.
  const kcal = (cibleActuelle ?? semaine.cible).kcal;
  /** « + Ajouter un repas » : le nombre suivant, s'il tient sous cette cible. */
  const suivant = nombresPossibles(kcal).find((n) => n > nombre) ?? null;
  const lundi = ajouterJours(aujourdhui, -jourInitial);

  /** Le nombre de repas choisi dans la confirmation ouverte. */
  const [choix, setChoix] = useState<NombreRepas>(nombre);
  const ouvrir = (c: Exclude<Confirmation, null>) => {
    setChoix(c.nombre ?? nombreAdmis(nombre, kcal));
    setConfirme(c);
  };

  /** Recomposer ou retirer jette les changements faits à la main : on le dit. */
  const confirmation = () =>
    confirme === null ? null : (
      <div className={styles.confirmation} role="alertdialog" aria-label="Confirmer">
        {confirme.action === 'recomposer' && (
          <ChoixNombreRepas nombre={choix} kcal={kcal} onChange={setChoix} />
        )}
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
            if (confirme.action === 'recomposer') onRecomposer(choix);
            else onQuitter();
          }}
        >
          {confirme.action === 'recomposer'
            ? `Recomposer en ${String(choix)} repas`
            : 'Retirer ma semaine'}
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
            aria-label={i === jourInitial ? `${nom} (aujourd’hui)` : nom}
            {...(i === jourInitial ? { 'data-aujourdhui': '' } : {})}
            onClick={() => setJour(i)}
          >
            <span className={styles.jourNom}>{nom.slice(0, 3)}</span>
            <span className={`${styles.jourDate} tnum`}>
              {Number(ajouterJours(lundi, i).slice(8))}
            </span>
          </button>
        ))}
      </div>

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
              onClick={() => ouvrir({ action: 'recomposer', ou: 'exclus' })}
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
          {confirme?.ou === 'cible' ? (
            confirmation()
          ) : (
            <button
              type="button"
              className={styles.principal}
              onClick={() => ouvrir({ action: 'recomposer', ou: 'cible' })}
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
          creneaux,
          // On ne coche que les repas du jour : la semaine est un modèle.
          ...(faits && jour === jourInitial ? { faits } : {}),
          ajusteur: (creneau) => {
            const part = partDe(creneau, nombre);
            if (part === null) return undefined;
            return (r) => ajusterRepas(r, part, semaine.cible, catalogue);
          },
        }}
      />

      {/*
        « + AJOUTER UN REPAS » (Guillaume : « j'ai 5 repas, voire 6 ») — sous
        le dernier repas, là où on le cherche. Il passe par la recomposition :
        un repas de plus change la part de tous les autres.
      */}
      {conseilRepas !== undefined && confirme?.ou !== 'ajout' && (
        <p className={styles.noteLarge} data-conseil-repas>
          {conseilRepas}
        </p>
      )}
      {confirme?.ou === 'ajout' ? (
        <section className={styles.bandeau} data-semaine="ajouter-repas">
          {confirmation()}
        </section>
      ) : suivant !== null ? (
        <button
          type="button"
          className={styles.ajouterRepas}
          data-ajouter-repas="propose"
          onClick={() => ouvrir({ action: 'recomposer', ou: 'ajout', nombre: suivant })}
        >
          + Ajouter un repas
        </button>
      ) : (
        nombre < 6 && (
          <p className={styles.noteLarge} data-ajouter-repas="refuse">
            Un repas de plus ({nombre + 1} par jour) : à partir de{' '}
            {kcalFr(CIBLE_MINIMALE[(nombre + 1) as NombreRepas])} kcal de cible. En dessous, les
            collations de la bibliothèque dépasseraient leur part.
          </p>
        )
      )}

      {apresRepas}

      {/* --- Les outils de la semaine, en tuiles ----------------------------- */}
      <div className={styles.tuiles} role="group" aria-label="Outils de ma semaine">
        <button type="button" className={styles.tuile} onClick={() => setCourses(true)}>
          <Icon name="panier" size="22px" />
          <span>
            Ma liste de courses<small>7 jours, prêt à cuire</small>
          </span>
        </button>
        {onExclusions && (
          <button
            type="button"
            className={styles.tuile}
            aria-expanded={panneau === 'exclusions'}
            onClick={() => setPanneau(panneau === 'exclusions' ? null : 'exclusions')}
          >
            <Icon name="interdit" size="22px" />
            <span>
              Je ne mange pas
              <small>
                {exclusions.length === 0
                  ? 'rien d’écarté'
                  : exclusions.map(nomExclusion).join(', ')}
              </small>
            </span>
          </button>
        )}
        {point && (
          <button
            type="button"
            className={styles.tuile}
            aria-expanded={panneau === 'point'}
            onClick={() => setPanneau(panneau === 'point' ? null : 'point')}
          >
            <Icon name="balance" size="22px" />
            <span>
              Point des 2 semaines<small>{point.resume}</small>
            </span>
          </button>
        )}
        <button
          type="button"
          className={styles.tuile}
          onClick={() => ouvrir({ action: 'recomposer', ou: 'outils' })}
        >
          <Icon name="repeat" size="22px" />
          <span>
            Recomposer ma semaine<small>{nombre} repas par jour</small>
          </span>
        </button>
      </div>

      {panneau === 'point' && point && <div className={styles.panneau}>{point.detail}</div>}
      {onExclusions && (
        <JeNeMangePas
          exclusions={exclusions}
          onChange={onExclusions}
          ouvert={panneau === 'exclusions'}
          creneaux={creneaux}
        />
      )}

      {confirme?.ou === 'outils' ? (
        <section className={styles.bandeau} data-semaine="confirmer">
          {confirmation()}
        </section>
      ) : (
        <section className={styles.actions}>
          <button
            type="button"
            className={styles.fantome}
            onClick={() => setConfirme({ action: 'quitter', ou: 'outils' })}
          >
            Revenir à mon plan composé à la main
          </button>
        </section>
      )}
      {courses && (
        <ListeCourses semaine={semaine} catalogue={catalogue} onFermer={() => setCourses(false)} />
      )}
    </>
  );
}
