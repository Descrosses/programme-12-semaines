/**
 * MON PLAN : cinq repas, mes aliments, mes quantités.
 *
 * ── Ce que cet écran fait, et ce qu'il ne fait pas ───────────────────────
 *
 * Une cible — 2 800 kcal, 160 g de protéines — ne dit pas quoi mettre dans
 * l'assiette. Le plan historique le dit, mais c'est celui de son auteur : le
 * servir à quelqu'un d'autre reviendrait à lui prescrire la diète d'un
 * inconnu.
 *
 * Ici, la STRUCTURE est fournie — cinq repas, quatre groupes — et le CONTENU
 * vient de la personne : les aliments de son questionnaire, les quantités
 * qu'elle règle elle-même jusqu'à tomber sur sa cible.
 *
 * L'APPLICATION NE PROPOSE AUCUNE QUANTITÉ. Elle additionne, elle affiche
 * l'écart, elle s'arrête là. « Il te manque 400 kcal, ajoute 110 g de riz »
 * serait une prescription, et ce n'est pas son rôle.
 *
 * ── Pourquoi un aliment peut être affiché à vide ──────────────────────────
 *
 * Toucher la pastille d'un aliment le fait apparaître avec un champ vide, pas
 * avec 100 g. Une quantité par défaut serait un chiffre que personne n'a
 * décidé — et 100 g d'huile d'olive, personne ne les a décidés. L'aliment
 * s'ouvre, le champ attend.
 */

import { useState } from 'react';
import { Stepper, stepValue } from './Stepper';
import { Icon } from './Icon';
import { fr } from '../engine/format';
import type { LibraryFood } from '../data/foodLibrary';
import type { DayKind } from '../data/nutrition';
import type { Macros } from '../engine/nutrition';
import { ChoixRepas } from './ChoixRepas';
import {
  GROUPES_REPAS,
  REPAS_PERSO,
  choisirAliment,
  groupeDeFamille,
  poserQuantite,
  poserRepas,
  quantiteDe,
  retirerAliment,
  type GroupeId,
  type JourneePerso,
  type RepasId,
} from '../data/planPerso';
import {
  alimentsParGroupe,
  arrondirMacros,
  macrosDeJournee,
  macrosDeRepas,
  quantitesAPoser,
  type Catalogue,
} from '../engine/planPersoTotaux';
import styles from './PlanPerso.module.css';

/**
 * Le pas de saisie, par unité.
 *
 * 10 g sur ce qui se pèse : c'est la précision d'une balance de cuisine et
 * celle à laquelle on raisonne en cuisinant. L'unité va par 1 — on ne mange
 * pas un demi-œuf. Le clavier reste accessible sur la valeur pour tout ce qui
 * tombe entre deux crans.
 */
const PAS: Record<string, { step: number; max: number }> = {
  g: { step: 10, max: 2000 },
  ml: { step: 10, max: 2000 },
  unité: { step: 1, max: 30 },
};

function Macro({ m }: { m: Macros }) {
  return (
    <span className={styles.macroLigne}>
      {m.proteinG} g P · {m.carbsG} g G · {m.fatG} g L
    </span>
  );
}

export function PlanPerso({
  kind,
  journee,
  preferes,
  catalogue,
  cible,
  onChange,
  onCopier,
}: {
  kind: DayKind;
  journee: JourneePerso;
  /** Les aliments de la personne, dans l'ordre de son questionnaire. */
  preferes: readonly string[];
  catalogue: Catalogue;
  cible: Macros | null;
  onChange: (suivante: JourneePerso) => void;
  /** Recopier l'autre journée ici. `null` quand il n'y a rien à copier. */
  onCopier: (() => void) | null;
}) {
  /** Le repas déplié. Un seul à la fois : l'écran tient dans un pouce. */
  const [ouvert, setOuvert] = useState<RepasId | null>(null);
  /** Le repas dont la bibliothèque est dépliée. */
  const [biblio, setBiblio] = useState<RepasId | null>(null);
  /*
   * Il n'y a plus d'état local « aliment ouvert ». Depuis le lot 0, choisir
   * un aliment s'écrit en base : c'est une décision, elle survit au
   * changement d'écran, et c'est ce qui permet à la bibliothèque de poser
   * un repas entier sans quantités.
   */

  const parGroupe = alimentsParGroupe(preferes, catalogue);
  const total = macrosDeJournee(journee, catalogue);
  const aPoser = quantitesAPoser(journee);
  const reste =
    cible === null
      ? null
      : arrondirMacros({
          kcal: cible.kcal - total.kcal,
          proteinG: cible.proteinG - total.proteinG,
          carbsG: cible.carbsG - total.carbsG,
          fatG: cible.fatG - total.fatG,
        });

  if (preferes.length === 0) {
    return (
      <section className={styles.carte}>
        <h2 className={styles.titre}>Mon plan</h2>
        <p className={styles.sousTitre}>
          Il faut d’abord tes aliments. Colle le récapitulatif de ton questionnaire dans Réglages →
          Partager une fiche, et tes cinq repas s’ouvriront avec ta liste à toi.
        </p>
      </section>
    );
  }

  return (
    <section className={styles.carte}>
      <div className={styles.entete}>
        <h2 className={styles.titre}>Mon plan</h2>
        {onCopier !== null && (
          <button type="button" className={styles.copier} onClick={onCopier}>
            Copier l’autre journée
          </button>
        )}
      </div>
      <p className={styles.sousTitre}>
        Cinq repas, tes aliments, tes quantités.{' '}
        {/*
          Dire que l'appli ne proposera rien évite d'attendre une suggestion
          qui ne viendra pas.
        */}
        MAJK additionne et affiche l’écart — il ne décide d’aucune quantité à ta place.
      </p>

      {/* --- Le compteur, en haut, pour l'avoir sous les yeux en remplissant -- */}
      <div className={styles.compteur}>
        <div className={styles.compteurValeur}>
          <b className="tnum">{total.kcal.toLocaleString('fr-FR')}</b>
          <span> kcal</span>
          {cible !== null && (
            <span className={styles.compteurCible}> / {cible.kcal.toLocaleString('fr-FR')}</span>
          )}
        </div>
        <Macro m={total} />
        {aPoser > 0 && (
          /*
           * Le dire UNE fois en haut plutôt que cinq fois dans les repas.
           * C'est la seule chose qui sépare un plan posé par la
           * bibliothèque d'un plan fini, et elle doit se lire d'un coup.
           */
          <p className={styles.aPoser}>
            {aPoser === 1
              ? '1 quantité reste à poser.'
              : `${String(aPoser)} quantités restent à poser.`}
          </p>
        )}
        {reste !== null && (
          /*
           * « IL MANQUE », PAS « IL RESTE ». Le journal du jour, plus bas,
           * dit déjà « il reste tant à manger » — c'est l'écart entre la
           * cible et ce qui est passé dans l'assiette. Ici on parle d'autre
           * chose : l'écart entre la cible et le PLAN. Le même mot pour les
           * deux ferait lire un seul chiffre là où il y en a deux.
           */
          <p className={`${styles.ecart} ${reste.kcal < 0 ? styles.ecartHaut : ''}`}>
            {reste.kcal === 0
              ? 'Ton plan tombe pile sur ta cible.'
              : reste.kcal > 0
                ? `Il manque ${reste.kcal.toLocaleString('fr-FR')} kcal à ton plan · ${fr(reste.proteinG)} g P · ${fr(reste.carbsG)} g G · ${fr(reste.fatG)} g L`
                : `Ton plan dépasse ta cible de ${Math.abs(reste.kcal).toLocaleString('fr-FR')} kcal.`}
          </p>
        )}
      </div>

      {/* --- Les cinq repas ------------------------------------------------- */}
      {REPAS_PERSO.map((repas) => {
        const m = arrondirMacros(macrosDeRepas(journee, repas.id, catalogue));
        const lignes = journee[repas.id] ?? [];
        const estOuvert = ouvert === repas.id;
        return (
          <div key={repas.id} className={styles.repas}>
            <button
              type="button"
              className={styles.repasTete}
              onClick={() => setOuvert(estOuvert ? null : repas.id)}
              aria-expanded={estOuvert}
            >
              <span className={styles.repasNom}>{repas.nom}</span>
              <span className={styles.repasKcal}>
                {lignes.length === 0 ? (
                  <span className={styles.vide}>vide</span>
                ) : (
                  <span className="tnum">{m.kcal.toLocaleString('fr-FR')} kcal</span>
                )}
                <Icon name={estOuvert ? 'chevron-up' : 'chevron-down'} size="18px" />
              </span>
            </button>

            {/* Replié, on lit quand même ce qu'il y a dedans. */}
            {!estOuvert && lignes.length > 0 && (
              <p className={styles.resume}>
                {lignes.map((l) => catalogue[l.foodId]?.label ?? l.foodId).join(', ')}
              </p>
            )}

            {estOuvert && (
              <div className={styles.corps}>
                {/*
                  LA BIBLIOTHÈQUE D'ABORD, les groupes ensuite. C'est
                  l'ordre des gestes : on part d'une assiette proposée, et
                  on ne compose à la main que si aucune ne convient.
                */}
                {biblio === repas.id ? (
                  <ChoixRepas
                    creneau={repas.id}
                    nomCreneau={repas.nom}
                    preferes={preferes}
                    catalogue={catalogue}
                    onChoisir={(r) => {
                      onChange(poserRepas(journee, repas.id, r.lignes));
                      setBiblio(null);
                    }}
                    onFermer={() => setBiblio(null)}
                  />
                ) : (
                  <button
                    type="button"
                    className={styles.biblio}
                    onClick={() => setBiblio(repas.id)}
                  >
                    {lignes.length === 0 ? 'Choisir un repas' : 'Choisir un autre repas'}
                  </button>
                )}
                {GROUPES_REPAS.map((groupe) => {
                  /*
                   * CE QUI EST DANS LE REPAS S'AFFICHE, DÉCLARÉ OU NON.
                   *
                   * L'écran ne montrait que les aliments du questionnaire.
                   * Un repas posé par la bibliothèque apporte les siens — le
                   * brocolis de « Poulet, riz, brocolis » n'est pas dans
                   * toutes les listes — et ceux-là disparaissaient de la vue
                   * tout en comptant dans le total. Trois lignes affichées,
                   * quatre dans l'addition : exactement les deux vérités que
                   * ce dépôt refuse.
                   *
                   * La liste du questionnaire décide des PASTILLES, c'est-à-
                   * dire de ce qu'on peut ajouter. Elle ne décide pas de ce
                   * qui s'affiche.
                   */
                  const posesIds = lignes
                    .filter(
                      (x) =>
                        groupeDeFamille(catalogue[x.foodId]?.category ?? 'autre') === groupe.id,
                    )
                    .map((x) => x.foodId);
                  const declares = parGroupe[groupe.id as GroupeId];
                  const restants = declares.filter((f) => !posesIds.includes(f.id));
                  if (posesIds.length === 0 && restants.length === 0) return null;
                  return (
                    <div key={groupe.id} className={styles.groupe}>
                      <h3 className={styles.groupeNom}>{groupe.nom}</h3>
                      {posesIds.map((id) => {
                        const f = catalogue[id];
                        if (!f) return null;
                        return (
                          <LigneAliment
                            key={id}
                            food={f}
                            qty={quantiteDe(journee, repas.id, id)}
                            horsListe={preferes.length > 0 && !preferes.includes(id)}
                            onQty={(v) => onChange(poserQuantite(journee, repas.id, id, v))}
                            onRetirer={() => onChange(retirerAliment(journee, repas.id, id))}
                          />
                        );
                      })}
                      {restants.length > 0 && (
                        <div className={styles.pastilles}>
                          {restants.map((f) => (
                            <button
                              key={f.id}
                              type="button"
                              className={styles.pastille}
                              onClick={() => onChange(choisirAliment(journee, repas.id, f.id))}
                            >
                              + {f.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/*
                  Les condiments et les hors-catégories n'ont pas de groupe,
                  mais s'ils sont dans le repas ils doivent se voir : une
                  ligne qui compte et qu'on ne peut pas corriger est pire
                  qu'une ligne de trop.
                */}
                {(() => {
                  const orphelins = lignes.filter(
                    (x) => groupeDeFamille(catalogue[x.foodId]?.category ?? 'autre') === null,
                  );
                  if (orphelins.length === 0) return null;
                  return (
                    <div className={styles.groupe}>
                      <h3 className={styles.groupeNom}>Autres</h3>
                      {orphelins.map((x) => {
                        const f = catalogue[x.foodId];
                        if (!f) return null;
                        return (
                          <LigneAliment
                            key={x.foodId}
                            food={f}
                            qty={x.qty}
                            horsListe={preferes.length > 0 && !preferes.includes(x.foodId)}
                            onQty={(v) => onChange(poserQuantite(journee, repas.id, x.foodId, v))}
                            onRetirer={() => onChange(retirerAliment(journee, repas.id, x.foodId))}
                          />
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        );
      })}
      <p className={styles.note}>
        {kind === 'train'
          ? 'Ce plan est celui de tes jours d’entraînement.'
          : 'Ce plan est celui de tes jours de repos.'}{' '}
        L’autre journée a le sien — bascule avec le sélecteur au-dessus.
      </p>
    </section>
  );
}

/** Un aliment et sa quantité, dans un repas. */
function LigneAliment({
  food,
  qty,
  horsListe,
  onQty,
  onRetirer,
}: {
  food: LibraryFood;
  qty: number | null;
  /** L'aliment vient d'un repas de la bibliothèque, pas du questionnaire. */
  horsListe: boolean;
  onQty: (v: number | null) => void;
  onRetirer: () => void;
}) {
  const cfg = PAS[food.unit] ?? PAS['g']!;
  return (
    <div className={styles.ligne}>
      {horsListe && (
        /*
          Le dire sans l'enlever. Il est dans l'assiette qu'on vient de
          choisir, il compte, et c'est à la personne de décider si elle le
          garde — pas à l'application.
        */
        <p className={styles.horsListe}>Pas dans tes aliments déclarés</p>
      )}
      <Stepper
        label={`${food.label} · ${food.unit}`}
        value={qty}
        step={cfg.step}
        min={0}
        max={cfg.max}
        emptyLabel="à poser"
        onStep={(d) => onQty(stepValue(qty, d, 0, cfg.max))}
        onCommit={(v) => onQty(v)}
      />
      {/*
        Retirer est maintenant un geste à part, et il le fallait : vider le
        champ ne jette plus l'aliment, donc il faut bien un endroit pour
        dire « celui-là, je n'en veux pas ».
      */}
      <button
        type="button"
        className={styles.retirer}
        onClick={onRetirer}
        aria-label={`Retirer ${food.label} de ce repas`}
      >
        Retirer
      </button>
    </div>
  );
}
