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
import { MacroBar } from './MacroBar';
import { fr } from '../engine/format';
import { shareOfDay } from '../engine/macroBar';
import { stateLabel, type LibraryFood } from '../data/foodLibrary';
import type { DayKind } from '../data/nutrition';
import type { CibleSaisie } from '../data/ciblesNutrition';
import { ecartCible } from '../engine/cibleDuJour';
import type { Macros } from '../engine/nutrition';
import { ChoixRepas } from './ChoixRepas';
import { FicheRepas } from './FicheRepas';
import { photoDe, type RepasBibliotheque } from '../data/bibliothequeRepas';
import { repasReconnu } from '../engine/repasReconnu';
import { FoodSwapSheet } from './FoodSwapSheet';
import {
  GROUPES_REPAS,
  REPAS_PERSO,
  choisirAliment,
  poserQuantite,
  poserRepas,
  remplacerAliment,
  retirerAliment,
  type GroupeId,
  type JourneePerso,
  type RepasId,
} from '../data/planPerso';
import {
  alimentsParGroupe,
  arrondirMacros,
  macrosDeJournee,
  macrosDeLigne,
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
  customs,
  onCreateCustom,
  cible,
  onChange,
  onCopier,
  semaine,
}: {
  kind: DayKind;
  journee: JourneePerso;
  /** Les aliments de la personne, dans l'ordre de son questionnaire. */
  preferes: readonly string[];
  catalogue: Catalogue;
  /** Les aliments saisis à la main, proposés au remplacement. */
  customs: LibraryFood[];
  onCreateCustom: (food: LibraryFood) => void;
  /** Calories obligatoires, macros facultatives (`null` = non posée). */
  cible: CibleSaisie | null;
  onChange: (suivante: JourneePerso) => void;
  /** Recopier l'autre journée ici. `null` quand il n'y a rien à copier. */
  onCopier: (() => void) | null;
  /**
   * La semaine automatique (`regles-repas-automatiques.md`) : le jour
   * affiché, et l'ajustement d'un repas de la bibliothèque à la part de son
   * créneau (`undefined` pour un créneau que l'appli ne compose pas). Absent :
   * « Mon plan », inchangé.
   */
  semaine?: {
    jour: string;
    ajusteur: (creneau: RepasId) => ((r: RepasBibliotheque) => RepasBibliotheque) | undefined;
  };
}) {
  /** Le repas déplié. Un seul à la fois : l'écran tient dans un pouce. */
  const [ouvert, setOuvert] = useState<RepasId | null>(null);
  /** Le repas dont la bibliothèque est dépliée. */
  const [biblio, setBiblio] = useState<RepasId | null>(null);
  /** La ligne dont le sélecteur de remplacement est ouvert, « repas|aliment ». */
  const [remplace, setRemplace] = useState<string | null>(null);
  /** La ligne dépliée pour régler sa quantité, « repas|aliment ». Une seule. */
  const [ligneOuverte, setLigneOuverte] = useState<string | null>(null);
  /** Le repas dont les pastilles « + Ajouter un aliment » sont dépliées. */
  const [ajout, setAjout] = useState<RepasId | null>(null);
  /** Le plat dont la fiche plein écran est ouverte (photo touchée). */
  const [fiche, setFiche] = useState<RepasBibliotheque | null>(null);
  /*
   * Il n'y a plus d'état local « aliment ouvert ». Depuis le lot 0, choisir
   * un aliment s'écrit en base : c'est une décision, elle survit au
   * changement d'écran, et c'est ce qui permet à la bibliothèque de poser
   * un repas entier sans quantités.
   */

  const parGroupe = alimentsParGroupe(preferes, catalogue);
  const total = macrosDeJournee(journee, catalogue);
  const aPoser = quantitesAPoser(journee);
  // Une macro non posée dans la cible n'a pas d'écart : elle reste absente.
  const reste = cible === null ? null : ecartCible(cible, total);

  // La semaine automatique pose ses repas elle-même : elle n'attend pas la liste.
  if (preferes.length === 0 && semaine === undefined) {
    return (
      <section className={styles.carte}>
        <h2 className={styles.titre}>Mon plan</h2>
        <p className={styles.sousTitre}>
          Il faut d’abord tes aliments. Réponds au questionnaire (environ 2 minutes) : tes cinq
          repas s’ouvriront avec ta liste à toi. Une fiche reçue se colle toujours dans Réglages →
          Partager une fiche.
        </p>
        <a className={styles.lienQuestionnaire} href="#/questionnaire">
          Remplir le questionnaire alimentaire
        </a>
      </section>
    );
  }

  return (
    <section className={styles.carte}>
      <div className={styles.entete}>
        <h2 className={styles.titre}>{semaine ? `Mes repas · ${semaine.jour}` : 'Mon plan'}</h2>
        {onCopier !== null && semaine === undefined && (
          <button type="button" className={styles.copier} onClick={onCopier}>
            Copier l’autre journée
          </button>
        )}
      </div>
      {semaine ? (
        <p className={styles.sousTitre} data-semaine-auto>
          Quantités ajustées à ta cible. Tout reste modifiable : touche un repas pour le changer ou
          régler une quantité.
        </p>
      ) : (
        <p className={styles.sousTitre}>
          Cinq repas, tes aliments, tes quantités.{' '}
          {/*
            Dire que l'appli ne proposera rien évite d'attendre une suggestion
            qui ne viendra pas.
          */}
          MAJK additionne et affiche l’écart — il ne décide d’aucune quantité à ta place.
        </p>
      )}

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
                ? `Il manque ${reste.kcal.toLocaleString('fr-FR')} kcal à ton plan${[
                    [reste.proteinG, 'P'],
                    [reste.carbsG, 'G'],
                    [reste.fatG, 'L'],
                  ]
                    .filter((x): x is [number, string] => x[0] !== null)
                    .map(([g, l]) => ` · ${fr(g)} g ${l}`)
                    .join('')}`
                : `Ton plan dépasse ta cible de ${Math.abs(reste.kcal).toLocaleString('fr-FR')} kcal.`}
          </p>
        )}
      </div>

      {/* --- Les cinq repas ------------------------------------------------- */}
      {REPAS_PERSO.map((repas) => {
        const m = arrondirMacros(macrosDeRepas(journee, repas.id, catalogue));
        const lignes = journee[repas.id] ?? [];
        const estOuvert = ouvert === repas.id;
        const plat = repasReconnu(repas.id, lignes);
        return (
          <div key={repas.id} className={styles.repas}>
            {/*
              L'EN-TÊTE, COMME LES « REPAS TYPES » DU PLAN HISTORIQUE : le nom,
              ce que le repas pèse (kcal) et sa part de la journée. La barre
              des macros est dessous, hors du bouton — un bloc ne se glisse
              pas dans un <button>.
            */}
            <div className={styles.repasLigne}>
              {plat !== null && (
                /*
                  LA PHOTO DU PLAT, tant que le repas EST ce plat : tous ses
                  ingrédients présents (`repasReconnu`). Un ingrédient
                  remplacé ou retiré, et elle disparaît — elle montrerait une
                  assiette qui n'est plus la sienne. Hors du bouton du repas :
                  la toucher ouvre la fiche en grand.
                */
                <button
                  type="button"
                  className={styles.repasPhotoBouton}
                  onClick={() => setFiche(plat)}
                  aria-label={`Voir le plat en grand : ${plat.nom}`}
                >
                  <img
                    className={styles.repasPhoto}
                    src={`${import.meta.env.BASE_URL}${photoDe(plat.id)}`}
                    alt=""
                    width={600}
                    height={600}
                    loading="lazy"
                    decoding="async"
                  />
                </button>
              )}
              <button
                type="button"
                className={styles.repasTete}
                onClick={() => {
                  setOuvert(estOuvert ? null : repas.id);
                  setLigneOuverte(null);
                  setAjout(null);
                }}
                aria-expanded={estOuvert}
              >
                <span className={styles.repasNom}>{repas.nom}</span>
                <span className={styles.repasKcal}>
                  {lignes.length === 0 ? (
                    <span className={styles.vide}>vide</span>
                  ) : (
                    <span className={`${styles.repasChiffres} tnum`}>
                      <span>{m.kcal.toLocaleString('fr-FR')} kcal</span>
                      {/*
                        La part de la CIBLE, pas du plan : tant que le plan est
                        incomplet, « 64 % du plan » ne dirait rien de ce qu'il
                        reste à manger. Sans cible posée, on retombe sur le
                        total du plan.
                      */}
                      <span className={styles.repasPart}>
                        {shareOfDay(m.kcal, cible?.kcal ?? total.kcal)} %
                      </span>
                    </span>
                  )}
                  <Icon name={estOuvert ? 'chevron-up' : 'chevron-down'} size="18px" />
                </span>
              </button>
            </div>

            {lignes.length > 0 && m.kcal > 0 && (
              <div className={styles.repasBarre}>
                <MacroBar macros={m} />
              </div>
            )}

            {/* Replié, on lit quand même ce qu'il y a dedans. */}
            {!estOuvert && lignes.length > 0 && (
              <p className={styles.resume}>
                {lignes.map((l) => catalogue[l.foodId]?.label ?? l.foodId).join(', ')}
              </p>
            )}

            {estOuvert && (
              <div className={styles.corps}>
                {/*
                  Devant un repas VIDE, la bibliothèque passe avant tout : c'est
                  le geste qu'on attend. Une fois le repas posé, ce sont ses
                  aliments qui comptent, et « choisir un autre repas » descend
                  sous la liste.
                */}
                {lignes.length === 0 && biblio !== repas.id && (
                  <button
                    type="button"
                    className={styles.biblio}
                    onClick={() => setBiblio(repas.id)}
                  >
                    Choisir un repas
                  </button>
                )}
                {biblio === repas.id && (
                  <ChoixRepas
                    creneau={repas.id}
                    nomCreneau={repas.nom}
                    preferes={preferes}
                    catalogue={catalogue}
                    {...(semaine?.ajusteur(repas.id)
                      ? { ajuster: semaine.ajusteur(repas.id)! }
                      : {})}
                    onChoisir={(r) => {
                      onChange(poserRepas(journee, repas.id, r.lignes));
                      setBiblio(null);
                      setLigneOuverte(null);
                    }}
                    onFermer={() => setBiblio(null)}
                  />
                )}

                {lignes.length > 0 && (
                  /*
                   * CE QUI EST DANS LE REPAS S'AFFICHE, DÉCLARÉ OU NON — dans
                   * l'ordre du repas, sans titre de groupe. Un aliment du
                   * repas choisi dans la bibliothèque n'est pas toujours dans
                   * le questionnaire ; il compte dans l'addition, donc il se
                   * voit. La liste du questionnaire ne décide que des
                   * pastilles : ce qu'on peut AJOUTER.
                   */
                  <ul className={styles.foodList}>
                    {lignes.map((x) => {
                      const f = catalogue[x.foodId];
                      if (!f) return null;
                      const cle = `${repas.id}|${x.foodId}`;
                      return (
                        <LigneAliment
                          key={x.foodId}
                          food={f}
                          qty={x.qty}
                          kcal={Math.round(macrosDeLigne(x, catalogue).kcal)}
                          horsListe={preferes.length > 0 && !preferes.includes(x.foodId)}
                          ouverte={ligneOuverte === cle}
                          onToggle={() => setLigneOuverte(ligneOuverte === cle ? null : cle)}
                          onQty={(v) => onChange(poserQuantite(journee, repas.id, x.foodId, v))}
                          onRetirer={() => {
                            onChange(retirerAliment(journee, repas.id, x.foodId));
                            setLigneOuverte(null);
                          }}
                          ouvertEnRemplacement={remplace === cle}
                          onRemplacer={() => setRemplace(cle)}
                          customs={customs}
                          onCreateCustom={onCreateCustom}
                          onChoisi={(nouveau) => {
                            onChange(
                              remplacerAliment(
                                journee,
                                repas.id,
                                x.foodId,
                                nouveau,
                                catalogue[x.foodId]?.unit === catalogue[nouveau]?.unit,
                              ),
                            );
                            setRemplace(null);
                            setLigneOuverte(`${repas.id}|${nouveau}`);
                          }}
                          onFermerRemplacement={() => setRemplace(null)}
                        />
                      );
                    })}
                  </ul>
                )}

                {/*
                  « + AJOUTER UN ALIMENT » remplace les pastilles qui étaient
                  toujours dépliées sous chaque groupe : elles occupaient plus
                  de place que le repas lui-même. Elles apparaissent à la
                  demande, rangées par groupe.
                */}
                {GROUPES_REPAS.some((g) =>
                  parGroupe[g.id as GroupeId].some((f) => !lignes.some((x) => x.foodId === f.id)),
                ) && (
                  <button
                    type="button"
                    className={styles.ajouter}
                    aria-expanded={ajout === repas.id}
                    onClick={() => setAjout(ajout === repas.id ? null : repas.id)}
                  >
                    {ajout === repas.id ? 'Fermer' : '+ Ajouter un aliment'}
                  </button>
                )}
                {ajout === repas.id &&
                  GROUPES_REPAS.map((groupe) => {
                    const restants = parGroupe[groupe.id as GroupeId].filter(
                      (f) => !lignes.some((x) => x.foodId === f.id),
                    );
                    if (restants.length === 0) return null;
                    return (
                      <div key={groupe.id} className={styles.groupe}>
                        <h3 className={styles.groupeNom}>{groupe.nom}</h3>
                        <div className={styles.pastilles}>
                          {restants.map((f) => (
                            <button
                              key={f.id}
                              type="button"
                              className={styles.pastille}
                              onClick={() => {
                                onChange(choisirAliment(journee, repas.id, f.id));
                                setAjout(null);
                                setLigneOuverte(`${repas.id}|${f.id}`);
                              }}
                            >
                              + {f.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}

                {lignes.length > 0 && biblio !== repas.id && (
                  <button
                    type="button"
                    className={styles.biblioSecondaire}
                    onClick={() => setBiblio(repas.id)}
                  >
                    {semaine ? 'Changer ce repas' : 'Choisir un autre repas'}
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
      {fiche !== null && (
        <FicheRepas
          repas={fiche}
          catalogue={catalogue}
          preferes={preferes}
          onFermer={() => setFiche(null)}
        />
      )}
      {semaine ? (
        <p className={styles.note}>
          Les repas du {semaine.jour.toLowerCase()}. Chaque jour a les siens — choisis-le au-dessus.
        </p>
      ) : (
        <p className={styles.note}>
          {kind === 'train'
            ? 'Ce plan est celui de tes jours d’entraînement.'
            : 'Ce plan est celui de tes jours de repos.'}{' '}
          L’autre journée a le sien — bascule avec le sélecteur au-dessus.
        </p>
      )}
    </section>
  );
}

/**
 * Un aliment et sa quantité, dans un repas.
 *
 * Une LIGNE comme celles des « Repas types » du plan historique : le nom, la
 * quantité en grisé, les kcal. Toucher la ligne la déplie — le réglage de la
 * quantité, « Remplacer » et « Retirer » n'ont rien à faire à l'écran tant
 * qu'on ne les demande pas.
 */
export function LigneAliment({
  food,
  qty,
  kcal,
  horsListe,
  ouverte,
  ouvertEnRemplacement,
  customs,
  onToggle,
  onQty,
  onRetirer,
  onRemplacer,
  onChoisi,
  onCreateCustom,
  onFermerRemplacement,
}: {
  food: LibraryFood;
  qty: number | null;
  kcal: number;
  /** L'aliment vient d'un repas de la bibliothèque, pas du questionnaire. */
  horsListe: boolean;
  ouverte: boolean;
  ouvertEnRemplacement: boolean;
  customs: LibraryFood[];
  onToggle: () => void;
  onQty: (v: number | null) => void;
  onRetirer: () => void;
  onRemplacer: () => void;
  onChoisi: (foodId: string) => void;
  onCreateCustom: (food: LibraryFood) => void;
  onFermerRemplacement: () => void;
}) {
  const cfg = PAS[food.unit] ?? PAS['g']!;
  const unite = food.unit === 'unité' ? ((qty ?? 0) > 1 ? 'unités' : 'unité') : food.unit;
  const etat = stateLabel(food.referenceState);
  return (
    <li className={styles.foodItem}>
      <button type="button" className={styles.foodRow} onClick={onToggle} aria-expanded={ouverte}>
        <span className={styles.foodName}>
          {food.label}
          {horsListe && (
            /*
              Le dire sans l'enlever, SOUS LE NOM : posé sous la ligne, il
              semblait appartenir à l'aliment suivant. Il est dans l'assiette
              choisie, il compte, et c'est à la personne de décider.
            */
            <span className={styles.horsListe}>Pas dans tes aliments déclarés</span>
          )}
        </span>
        <span className={`${styles.foodQty} tnum`}>
          {qty === null ? (
            /* Un aliment choisi sans quantité reste visible, et dit ce qu'il attend. */
            <span className={styles.foodAPoser}>à poser</span>
          ) : (
            <>
              {fr(qty)} {unite}
              {etat && <span className={styles.foodState}> {etat}</span>}
            </>
          )}
        </span>
        <span className={`${styles.foodKcal} tnum`}>{qty === null ? '—' : `${kcal} kcal`}</span>
      </button>
      {ouverte && (
        <div className={styles.foodEdit}>
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
            LA MÊME FEUILLE QUE LE PLAN HISTORIQUE, à deux chaînes près. Retirer
            reste un geste à part : vider le champ ne jette pas l'aliment.
          */}
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.remplacer}
              onClick={onRemplacer}
              aria-label={`Remplacer ${food.label}`}
            >
              Remplacer
            </button>
            <button
              type="button"
              className={styles.retirer}
              onClick={onRetirer}
              aria-label={`Retirer ${food.label} de ce repas`}
            >
              Retirer
            </button>
          </div>
        </div>
      )}
      {ouvertEnRemplacement && (
        <FoodSwapSheet
          label={food.label}
          category={food.category}
          customs={customs}
          onPick={onChoisi}
          onCreate={onCreateCustom}
          onClose={onFermerRemplacement}
        />
      )}
    </li>
  );
}
