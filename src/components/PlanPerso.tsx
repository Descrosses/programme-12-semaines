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
import {
  GROUPES_REPAS,
  REPAS_PERSO,
  poserQuantite,
  quantiteDe,
  type GroupeId,
  type JourneePerso,
  type RepasId,
} from '../data/planPerso';
import {
  alimentsParGroupe,
  arrondirMacros,
  macrosDeJournee,
  macrosDeRepas,
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
  /**
   * Les aliments qu'on a fait apparaître sans leur donner de quantité.
   *
   * Local au composant, et c'est voulu : « j'ai touché la pastille » n'est
   * pas une information à garder en base. Elle disparaît au changement
   * d'écran, et l'aliment avec — tant qu'aucune quantité n'a été posée, il
   * n'y a rien à retenir.
   */
  const [ouverts, setOuverts] = useState<ReadonlySet<string>>(new Set());

  const parGroupe = alimentsParGroupe(preferes, catalogue);
  const total = macrosDeJournee(journee, catalogue);
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
                {GROUPES_REPAS.map((groupe) => {
                  const aliments = parGroupe[groupe.id as GroupeId];
                  if (aliments.length === 0) return null;
                  const poses = aliments.filter(
                    (f) =>
                      quantiteDe(journee, repas.id, f.id) !== null ||
                      ouverts.has(`${repas.id}|${f.id}`),
                  );
                  const restants = aliments.filter((f) => !poses.includes(f));
                  return (
                    <div key={groupe.id} className={styles.groupe}>
                      <h3 className={styles.groupeNom}>{groupe.nom}</h3>
                      {poses.map((f) => (
                        <LigneAliment
                          key={f.id}
                          food={f}
                          qty={quantiteDe(journee, repas.id, f.id)}
                          onQty={(v) => onChange(poserQuantite(journee, repas.id, f.id, v))}
                        />
                      ))}
                      {restants.length > 0 && (
                        <div className={styles.pastilles}>
                          {restants.map((f) => (
                            <button
                              key={f.id}
                              type="button"
                              className={styles.pastille}
                              onClick={() =>
                                setOuverts((p) => new Set(p).add(`${repas.id}|${f.id}`))
                              }
                            >
                              + {f.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
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
  onQty,
}: {
  food: LibraryFood;
  qty: number | null;
  onQty: (v: number | null) => void;
}) {
  const cfg = PAS[food.unit] ?? PAS['g']!;
  return (
    <div className={styles.ligne}>
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
    </div>
  );
}
