/**
 * Les quatre écrans de FEMMES 8.
 *
 * ── Ce qu'ils affichent, et ce qu'ils n'inventent pas ─────────────────────
 *
 * Tout vient du moteur : `getSession` résout le circuit pour une semaine, un
 * jour, une version et un niveau, contre-indications déjà appliquées. Aucun
 * exercice, aucune charge, aucune répétition n'est écrit dans ce fichier.
 *
 * Le programme sportif étant encore en cours de conception, ces écrans sont
 * une INTERFACE sur des données existantes, pas une validation de leur
 * contenu.
 *
 * ── Ce qui est enregistré ──────────────────────────────────────────────────
 *
 * Depuis que FEMMES 8 est jouable, chaque exercice validé (répétitions,
 * charge, ressenti, remarque) et chaque séance terminée sont écrits en base,
 * dans le cycle FEMMES en cours (`femmesSeances`). Les écrans ne font
 * qu'afficher et remonter les saisies : l'écriture est faite par
 * `EcransFemmes`, qui détient le cycle.
 */

import { useMemo, useState } from 'react';
import {
  NIVEAU_DEFS,
  NIVEAU_PAR_DEFAUT,
  NIVEAUX,
  niveauDef,
  type Niveau,
} from '../../data/femmes/niveaux';
import { phaseOf } from '../../data/femmes/phases';
import { SAFETY_CHECKS, WEEK_DAYS } from '../../data/femmes/programme';
import { WEEKS, type DayIndex, type Version, type WeekIndex } from '../../data/femmes/types';
import { getSession } from '../../engine/femmes/getSession';
import { restLabel, workLabel } from '../../engine/femmes/format';
import { estFaite, type Avancement, type SeanceFaite } from '../../engine/femmes/avancement';
import { targetForWeek } from '../../engine/femmes/progression';
import type {
  ExerciseRecord,
  Ressenti,
  SafetyAnswers,
  SessionContext,
} from '../../engine/femmes/types';
import { Bandeau, Ico, NavFemmes, type OngletFemmes } from './Pieces';
import s from './Femmes.module.css';

/* Les trois lettres du jour, dans l'ordre où les séances tombent. */
const CODES = ['LUN', 'MER', 'VEN', 'SAM'] as const;
const NOMS = ['Lundi', 'Mercredi', 'Vendredi', 'Samedi'] as const;

export interface EtatFemmes {
  semaine: WeekIndex;
  jour: DayIndex;
  version: Version;
  niveau: Niveau;
}

/**
 * Ce que la base dit de la pratiquante : son contexte pour le moteur (réponses
 * de sécurité, historique des charges), ses séances, où elle en est.
 */
export interface DonneesFemmes {
  ctx: SessionContext;
  seances: readonly SeanceFaite[];
  avance: Avancement;
  /** `YYYY-MM-DD` du démarrage du cycle. */
  depuis: string;
}

/** Le nombre de jours depuis le démarrage, ou `null` sans date lisible. */
function joursDepuis(iso: string): number | null {
  const t = Date.parse(`${iso}T00:00:00`);
  if (Number.isNaN(t)) return null;
  const auj = Date.parse(`${new Date().toISOString().slice(0, 10)}T00:00:00`);
  return Math.max(0, Math.round((auj - t) / 86_400_000));
}

export const ETAT_INITIAL: EtatFemmes = {
  semaine: 1,
  jour: 0,
  version: 'maison',
  niveau: NIVEAU_PAR_DEFAUT,
};

/* ═══════════════════════════════════════════════ 1 — AUJOURD'HUI ═══════ */

export function FemmesAujourdhui({
  etat,
  donnees,
  onAller,
  onCommencer,
}: {
  etat: EtatFemmes;
  donnees: DonneesFemmes;
  onAller: (o: OngletFemmes) => void;
  onCommencer: () => void;
}) {
  const phase = phaseOf(etat.semaine);
  const seance = useMemo(
    () => getSession(etat.semaine, etat.jour, etat.version, donnees.ctx, etat.niveau),
    [etat, donnees.ctx],
  );
  const { faites, total, termine } = donnees.avance;
  const jours = joursDepuis(donnees.depuis);
  const dejaFaite = estFaite(donnees.seances, etat.semaine, etat.jour);

  return (
    <div className={s.page}>
      <Bandeau logo titre="MAJK FEMMES" />

      {/* Les quatre pastilles de la planche : niveau, semaine, jour, durée. */}
      <div className={`${s.chips} ${s.chipsAccueil}`}>
        <span className={`${s.chip} ${s.chipCaps}`}>{niveauDef(etat.niveau).nom}</span>
        <span className={s.chip}>Semaine {etat.semaine}</span>
        <span className={s.chip}>{NOMS[etat.jour]}</span>
        <span className={s.chip}>
          <Ico nom="chrono" taille={14} />
          {phase.durationLabel}
        </span>
      </div>

      <div className={s.corps}>
        <section className={s.carte}>
          <h2 className={s.carteTitre}>
            Semaine {etat.semaine} · {phase.name}
          </h2>
          <p className={s.carteTexte}>{phase.objective}</p>
        </section>

        {termine && (
          <section className={`${s.carte} ${s.carteRose}`}>
            <h2 className={s.carteTitre}>Programme terminé</h2>
            <p className={s.carteTexte}>
              Les {total} séances sont faites. La transition 1 et le cycle 2 s’ouvrent au catalogue.
            </p>
          </section>
        )}

        {/* La carte d'action : jour et durée en tête, lieu en pastille à
            droite, volume en gros, bouton DANS la carte. */}
        <section className={`${s.carte} ${s.carteRose} ${s.carteAction}`}>
          <div className={s.carteBarre}>
            <span className={s.carteBarreGauche}>
              {NOMS[etat.jour]} · {phase.durationLabel}
            </span>
            <span className={s.lieu}>
              <Ico nom={etat.version === 'maison' ? 'maison' : 'boucle'} taille={19} />
              {etat.version === 'maison' ? 'Maison' : 'Salle'}
            </span>
          </div>
          <p className={`${s.gros} ${s.grosCaps}`}>
            {seance.tours} tours × {seance.slots.length}
          </p>
          <p className={s.carteTexte}>
            Repos {restLabel(seance.restSec)} entre les tours, Phase {phase.id} — {phase.name}.
          </p>
          <button type="button" className={`${s.cta} ${s.ctaDansCarte}`} onClick={onCommencer}>
            <Ico nom="play" />
            {dejaFaite ? 'Revoir la séance' : 'Commencer la séance'}
          </button>
        </section>

        <div className={s.duo}>
          <div className={s.tuile}>
            <p className={s.tuileValeur}>
              {faites} / {total}
            </p>
            <p className={s.tuileLabel}>Séances faites</p>
          </div>
          <div className={s.tuile}>
            <p className={s.tuileValeur}>{jours === null ? '—' : `${jours} j`}</p>
            <p className={s.tuileLabel}>Depuis le départ</p>
          </div>
        </div>

        <button type="button" className={s.secondaire} onClick={() => onAller('semaine')}>
          <Ico nom="calendrier" />
          Voir la semaine entière
        </button>
      </div>

      <NavFemmes actif="aujourdhui" onAller={onAller} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════ 2 — SEMAINE ═══════ */

export function FemmesSemaine({
  etat,
  donnees,
  onSemaine,
  onJour,
  onAller,
}: {
  etat: EtatFemmes;
  donnees: DonneesFemmes;
  onSemaine: (w: WeekIndex) => void;
  onJour: (d: DayIndex) => void;
  onAller: (o: OngletFemmes) => void;
}) {
  const phase = phaseOf(etat.semaine);
  const seance = getSession(etat.semaine, 0, etat.version, donnees.ctx, etat.niveau);
  const prochaine = donnees.avance.prochaine;
  const jours = WEEK_DAYS[etat.semaine];

  return (
    <div className={s.page}>
      <Bandeau
        surTitre="Programme"
        surTitreRose
        titre={`SEMAINE ${etat.semaine}`}
        taille="xl"
        sousTitre={`Phase ${phase.id} · ${phase.name}`}
      />

      <div className={s.semaines}>
        {WEEKS.map((w) => (
          <button
            key={w}
            type="button"
            className={`${s.sem} ${w === etat.semaine ? s.semActive : ''}`}
            onClick={() => onSemaine(w)}
            aria-current={w === etat.semaine ? 'true' : undefined}
          >
            {w}
          </button>
        ))}
      </div>

      <div className={s.corps}>
        <section className={s.carte}>
          <h2 className={`${s.carteTitre} ${s.carteTitreIcone}`}>
            <span className={s.icoRose}>
              <Ico nom="cible" taille={37} />
            </span>
            Objectif de la semaine
          </h2>
          <p className={s.carteTexte}>{phase.objective}</p>
        </section>

        <section className={s.carte}>
          <p className={`${s.gros} ${s.grosCaps}`}>
            {seance.tours} tours × {seance.slots.length}
          </p>
          <p className={s.carteTexte}>
            {jours.length} séances de {phase.durationLabel}, repos {restLabel(seance.restSec)} entre
            les tours.
          </p>
        </section>

        <div className={s.lignes}>
          {jours.map((d, i) => (
            <button key={d} type="button" className={s.jour} onClick={() => onJour(d)}>
              <span className={s.jourCode}>{CODES[i]}</span>
              <span>
                <span className={s.jourNom}>{NOMS[i]}</span>
                <span className={s.jourDetail}>
                  Séance {i + 1} · {phase.durationLabel}
                </span>
              </span>
              {/* Faite, prévue (la prochaine à faire), ou à faire. */}
              {estFaite(donnees.seances, etat.semaine, d) ? (
                <span className={`${s.etat} ${s.etatFaite}`}>Faite</span>
              ) : prochaine?.semaine === etat.semaine && prochaine.jour === d ? (
                <span className={`${s.etat} ${s.etatPrevu}`}>Prévue</span>
              ) : (
                <span className={s.etat}>À faire</span>
              )}
              <span className={s.jourChevron}>
                <Ico nom="chevron" taille={22} />
              </span>
            </button>
          ))}
        </div>
      </div>

      <NavFemmes actif="semaine" onAller={onAller} />
    </div>
  );
}

/* ══════════════════════════════════════ 3 et 4 — SÉANCE + EXERCICE ═════ */

/**
 * L'écran 3 liste le circuit ; il ne déplie rien sur place.
 *
 * Première version : les lignes s'ouvraient en accordéon. C'était une
 * mauvaise lecture de la planche — sa quatrième image est un écran PLEIN,
 * avec son bandeau, son « exercice 1 / 5 » et son bouton de validation.
 * Un accordéon aurait repoussé le bouton « Démarrer le circuit » hors de
 * l'écran dès qu'une fiche s'ouvrait.
 *
 * Les lignes portent donc un chevron qui MÈNE à l'exercice, exactement ce
 * que la planche montre.
 */
export function FemmesSeance({
  etat,
  donnees,
  onVersion,
  onAller,
  onExercice,
}: {
  etat: EtatFemmes;
  donnees: DonneesFemmes;
  onVersion: (v: Version) => void;
  onAller: (o: OngletFemmes) => void;
  onExercice: (index: number) => void;
}) {
  const phase = phaseOf(etat.semaine);
  const seance = useMemo(
    () => getSession(etat.semaine, etat.jour, etat.version, donnees.ctx, etat.niveau),
    [etat, donnees.ctx],
  );
  const [introOuverte, setIntroOuverte] = useState(false);
  const rang = WEEK_DAYS[etat.semaine].indexOf(etat.jour);

  return (
    <div className={s.page}>
      {/* « ‹ Semaine N » : le fil d'Ariane de la référence. Il remonte d'un
          cran, vers la semaine, et il fait sortir le titre de la photo. */}
      <Bandeau
        retour={`Semaine ${etat.semaine}`}
        onRetour={() => onAller('semaine')}
        surTitre={`Phase ${phase.id} · ${phase.name} · ${NOMS[rang]}`}
        titre={`Séance ${rang + 1}`}
        taille="l"
      />

      <div className={s.corps}>
        {/*
          Le choix maison / salle est libre À CHAQUE SÉANCE, jamais imposé
          par le programme : une séance à la maison le lundi et une en salle
          le mercredi doivent rester possibles.
        */}
        <div className={s.bascule}>
          <button
            type="button"
            className={`${s.basculeBtn} ${etat.version === 'maison' ? s.basculeOn : ''}`}
            onClick={() => onVersion('maison')}
            aria-pressed={etat.version === 'maison'}
          >
            <span aria-hidden="true">🏠</span>
            Maison
          </button>
          <button
            type="button"
            className={`${s.basculeBtn} ${etat.version === 'salle' ? s.basculeOnSalle : ''}`}
            onClick={() => onVersion('salle')}
            aria-pressed={etat.version === 'salle'}
          >
            <span aria-hidden="true">🏋️</span>
            Salle de sport
          </button>
        </div>

        <section className={`${s.carte} ${s.carteRose} ${s.carteIcone}`}>
          <span className={s.icoRose}>
            <Ico nom="boucle" taille={42} />
          </span>
          <div>
            <h2 className={s.carteTitre}>Circuit · {seance.tours} tours</h2>
            <p className={s.carteTexte}>
              Repos {restLabel(seance.restSec)} entre les tours · ≈ {phase.durationLabel}
            </p>
          </div>
        </section>

        <section className={`${s.ligne} ${s.ligneIntro}`}>
          <button
            type="button"
            className={s.ligneTete}
            onClick={() => setIntroOuverte((v) => !v)}
            aria-expanded={introOuverte}
          >
            <span className={s.icoRose}>
              <Ico nom="course" taille={26} />
            </span>
            <span className={s.introNom}>Échauffement – 5 min</span>
            <span className={`${s.chevron} ${introOuverte ? s.chevronOuvert : ''}`}>
              <Ico nom="chevron" taille={18} />
            </span>
          </button>
          {introOuverte && (
            <div className={s.ligneCorps}>
              <ul className={s.consignesListe}>
                {seance.intro.map((i) => (
                  <li key={i.id}>
                    <span className={s.coche}>
                      <Ico nom="coche" taille={20} />
                    </span>
                    <span>
                      <b>{i.label}</b> — {i.detail}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <h2 className={s.titreSection}>Circuit · {seance.slots.length} exercices à enchaîner</h2>

        <div className={`${s.lignes} ${s.lignesSerrees}`}>
          {seance.slots.map((slot, i) => (
            <button
              key={slot.slotId}
              type="button"
              className={`${s.ligne} ${s.ligneTete}`}
              onClick={() => onExercice(i)}
            >
              <span className={s.numero}>{i + 1}</span>
              <span>
                <span className={s.ligneNom}>{slot.exercise.name}</span>
                <span className={s.ligneDose}>
                  {workLabel(slot.work)}
                  {slot.kg !== null ? ` · ${slot.kg} kg` : ''}
                </span>
              </span>
              <span className={s.chevron}>
                <Ico nom="chevron" taille={18} />
              </span>
            </button>
          ))}
        </div>

        {/* Le bouton de la planche. Il ouvre le premier exercice : c'est là
            que le circuit commence. */}
        <button type="button" className={`${s.cta} ${s.ctaSobre}`} onClick={() => onExercice(0)}>
          <Ico nom="play" />
          Démarrer le circuit
        </button>

        {seance.notes.length > 0 && (
          <section className={s.carte}>
            {seance.notes.map((n, i) => (
              <p key={i} className={s.carteTexte}>
                {n}
              </p>
            ))}
          </section>
        )}
      </div>

      <NavFemmes actif="aujourdhui" onAller={onAller} />
    </div>
  );
}

/* ═══════════════════════════════════════════ 4 — EXERCICE (écran plein) ═══ */

/**
 * Un exercice, en plein écran, comme la quatrième image de la planche.
 *
 * ── Ce qui est saisi, et ce qui en est fait ───────────────────────────────
 *
 * Répétitions, charge (seulement si elle se règle), ressenti et remarque.
 * « Valider » les ENREGISTRE dans la séance du cycle en cours ; le dernier
 * exercice termine la séance. Revenir sur un exercice déjà validé retrouve
 * sa saisie, et la revalider la remplace — jamais de doublon.
 *
 * La charge et le ressenti nourrissent la progression des charges : deux
 * séances « Facile » en atteignant la cible font monter d'un cran, une
 * séance « Dur » fait redescendre. C'est la règle du moteur, rien d'ajouté.
 */
export function FemmesExercice({
  etat,
  donnees,
  index,
  onRetour,
  onIndex,
  onAller,
  onEnregistrer,
  onTerminer,
}: {
  etat: EtatFemmes;
  donnees: DonneesFemmes;
  index: number;
  onRetour: () => void;
  onIndex: (i: number) => void;
  onAller: (o: OngletFemmes) => void;
  onEnregistrer: (record: ExerciseRecord) => Promise<void>;
  onTerminer: () => Promise<void>;
}) {
  const seance = useMemo(
    () => getSession(etat.semaine, etat.jour, etat.version, donnees.ctx, etat.niveau),
    [etat, donnees.ctx],
  );
  const rangJour = WEEK_DAYS[etat.semaine].indexOf(etat.jour);
  const slot = seance.slots[Math.min(index, seance.slots.length - 1)];
  const exId = slot?.exercise.id ?? '';

  /* Ce qui a déjà été noté pour cet exercice, dans CETTE séance. */
  const deja = useMemo(
    () =>
      donnees.seances
        .find((x) => x.semaine === etat.semaine && x.jour === etat.jour)
        ?.exercices?.find((r) => r.exerciseId === exId) ?? null,
    [donnees.seances, etat.semaine, etat.jour, exId],
  );
  const cible = slot === undefined ? null : targetForWeek(slot.work, etat.semaine);
  const reglable = slot?.load.kind === 'adjustable';
  const pas = slot?.load.kind === 'adjustable' ? slot.load.step : 1;

  return (
    /*
     * La clé remet la saisie à zéro à chaque exercice : sans elle, passer au
     * suivant garderait le ressenti et la remarque du précédent.
     */
    <SaisieExercice
      key={`${etat.semaine}-${etat.jour}-${exId}`}
      etat={etat}
      seanceTours={seance.tours}
      nbExercices={seance.slots.length}
      slot={slot}
      index={index}
      rangJour={rangJour}
      cible={cible}
      reglable={reglable}
      pas={pas}
      deja={deja}
      onRetour={onRetour}
      onIndex={onIndex}
      onAller={onAller}
      onEnregistrer={onEnregistrer}
      onTerminer={onTerminer}
    />
  );
}

const RESSENTIS: readonly { id: Ressenti; label: string }[] = [
  { id: 'facile', label: 'Facile' },
  { id: 'ok', label: 'Correct' },
  { id: 'dur', label: 'Dur' },
];

function SaisieExercice({
  etat,
  seanceTours,
  nbExercices,
  slot,
  index,
  rangJour,
  cible,
  reglable,
  pas,
  deja,
  onRetour,
  onIndex,
  onAller,
  onEnregistrer,
  onTerminer,
}: {
  etat: EtatFemmes;
  seanceTours: number;
  nbExercices: number;
  slot: ReturnType<typeof getSession>['slots'][number] | undefined;
  index: number;
  rangJour: number;
  cible: number | null;
  reglable: boolean;
  pas: number;
  deja: ExerciseRecord | null;
  onRetour: () => void;
  onIndex: (i: number) => void;
  onAller: (o: OngletFemmes) => void;
  onEnregistrer: (record: ExerciseRecord) => Promise<void>;
  onTerminer: () => Promise<void>;
}) {
  const [reps, setReps] = useState<number>(deja?.actual ?? cible ?? 10);
  const [kg, setKg] = useState<number | null>(deja?.kg ?? slot?.kg ?? null);
  const [ressenti, setRessenti] = useState<Ressenti | null>(deja?.ressenti ?? null);
  const [remarque, setRemarque] = useState(deja?.remarque ?? '');
  const [envoi, setEnvoi] = useState(false);

  if (slot === undefined) return null;
  const dernier = index >= nbExercices - 1;

  async function valider() {
    if (slot === undefined || envoi) return;
    setEnvoi(true);
    try {
      await onEnregistrer({
        exerciseId: slot.exercise.id,
        week: etat.semaine,
        day: etat.jour,
        date: new Date().toISOString().slice(0, 10),
        version: etat.version,
        planned: cible,
        actual: reps,
        kg: reglable ? kg : null,
        ressenti,
        remarque: remarque.trim() === '' ? null : remarque.trim(),
      });
      if (dernier) await onTerminer();
      else onIndex(index + 1);
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <div className={s.page}>
      <Bandeau
        retour={`Séance ${rangJour + 1}`}
        onRetour={onRetour}
        surTitre={`Exercice ${index + 1} / ${nbExercices}`}
        titre={slot.exercise.name}
      />

      <div className={s.corps}>
        <section className={s.consignes}>
          <p className={s.consignesTitre}>Consignes</p>
          <ul className={s.consignesListe}>
            <li>
              <span className={s.coche}>
                <Ico nom="coche" taille={20} />
              </span>
              <span>{slot.exercise.intent}</span>
            </li>
            {(slot.exercise.cues ?? []).map((c, i) => (
              <li key={i}>
                <span className={s.coche}>
                  <Ico nom="coche" taille={20} />
                </span>
                <span>{c}</span>
              </li>
            ))}
          </ul>
          {slot.note !== undefined && <p className={s.notePetite}>{slot.note}</p>}
          {slot.substitutedFor !== undefined && (
            /* La substitution se DIT : la taire ferait passer un repli pour
               une erreur de programme. */
            <p className={s.notePetite}>
              Remplace « {slot.substitutedFor.exercise.name} » — {slot.substitutedFor.reason}.
            </p>
          )}
          <p className={s.notePetite}>
            {workLabel(slot.work)}
            {slot.kg !== null ? ` · ${slot.kg} kg` : ''} · {seanceTours} tours
          </p>
        </section>

        <p className={s.blocLabel}>
          Réalisé · {slot.work.kind === 'reps' ? 'répétitions' : 'secondes'}
        </p>
        <div className={s.compteur}>
          <button
            type="button"
            className={s.compteurBtn}
            onClick={() => setReps(Math.max(0, reps - 1))}
            aria-label="Un de moins"
          >
            −
          </button>
          <span className={s.compteurValeur}>{reps}</span>
          <button
            type="button"
            className={s.compteurBtn}
            onClick={() => setReps(reps + 1)}
            aria-label="Un de plus"
          >
            +
          </button>
        </div>

        {/* La charge, seulement quand elle se règle : c'est elle que la
            progression relit à la séance suivante. */}
        {reglable && (
          <>
            <p className={s.blocLabel}>Charge utilisée · kg</p>
            <div className={s.compteur}>
              <button
                type="button"
                className={s.compteurBtn}
                onClick={() => setKg(kg === null ? null : Math.max(0, +(kg - pas).toFixed(2)))}
                aria-label="Charge plus légère"
              >
                −
              </button>
              <span className={s.compteurValeur}>{kg === null ? '—' : kg}</span>
              <button
                type="button"
                className={s.compteurBtn}
                onClick={() => setKg(+((kg ?? 0) + pas).toFixed(2))}
                aria-label="Charge plus lourde"
              >
                +
              </button>
            </div>
          </>
        )}

        <div className={s.ressenti}>
          {RESSENTIS.map((r) => (
            <button
              key={r.id}
              type="button"
              className={`${s.ressentiBtn} ${ressenti === r.id ? s.ressentiOn : ''}`}
              onClick={() => setRessenti(r.id)}
              aria-pressed={ressenti === r.id}
            >
              {r.label}
            </button>
          ))}
        </div>

        <p className={s.remarqueLabel}>Remarque (facultatif)</p>
        <textarea
          className={s.remarque}
          placeholder="Ce qui a tiré, gêné, mieux marché…"
          aria-label={`Remarque sur ${slot.exercise.name}`}
          value={remarque}
          onChange={(e) => setRemarque(e.target.value)}
        />

        <button
          type="button"
          className={`${s.cta} ${s.ctaSobre}`}
          onClick={() => void valider()}
          disabled={envoi}
        >
          {dernier ? 'Terminer le circuit' : 'Valider l’exercice'}
          <Ico nom="coche" />
        </button>
      </div>

      <NavFemmes actif="aujourdhui" onAller={onAller} />
    </div>
  );
}

/* ═══════════════════════════════════════ profil : niveau et sécurité ═══ */

export interface ProfilSaisi {
  niveau: Niveau;
  safety: SafetyAnswers;
}

/**
 * Le niveau et les deux questions de sécurité.
 *
 * Le même écran sert deux fois : au DÉPART, où il est obligatoire — aucune
 * séance ne s'ouvre tant que les deux questions n'ont pas de réponse — puis
 * dans l'onglet Réglages, pour corriger une réponse quand la situation
 * change. Une réponse « non » ne retire rien : le moteur REMPLACE les
 * exercices concernés, et chaque remplacement est dit sur sa fiche.
 */
export function FemmesProfil({
  initial,
  depart,
  onValider,
  onAller,
}: {
  initial: ProfilSaisi | null;
  /** Vrai au démarrage du programme : le titre et le bouton changent. */
  depart: boolean;
  onValider: (p: ProfilSaisi) => Promise<void>;
  onAller: (o: OngletFemmes) => void;
}) {
  const [niveau, setNiveau] = useState<Niveau>(initial?.niveau ?? NIVEAU_PAR_DEFAUT);
  const [safety, setSafety] = useState<SafetyAnswers>(
    initial?.safety ?? { plancherPelvienOk: null, sansDouleurLimitante: null },
  );
  const [envoi, setEnvoi] = useState(false);
  const [enregistre, setEnregistre] = useState(false);
  const complet = SAFETY_CHECKS.every((c) => safety[c.key] !== null);

  async function valider() {
    if (!complet || envoi) return;
    setEnvoi(true);
    try {
      await onValider({ niveau, safety });
      setEnregistre(true);
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <div className={s.page}>
      <Bandeau
        surTitre={depart ? 'Avant de commencer' : 'Réglages'}
        titre={depart ? 'Ton départ' : 'Profil'}
      />
      <div className={s.corps}>
        <h2 className={s.titreSection}>Ton niveau</h2>
        <div className={s.lignes}>
          {NIVEAUX.map((n) => (
            <button
              key={n}
              type="button"
              className={`${s.carte} ${s.choix} ${niveau === n ? s.choixOn : ''}`}
              onClick={() => {
                setNiveau(n);
                setEnregistre(false);
              }}
              aria-pressed={niveau === n}
            >
              <span className={s.carteTitre}>{NIVEAU_DEFS[n].nom}</span>
              <span className={s.carteTexte}>{NIVEAU_DEFS[n].pourQui}</span>
            </button>
          ))}
        </div>

        <h2 className={s.titreSection}>Sécurité</h2>
        {SAFETY_CHECKS.map((c) => (
          <section key={c.key} className={s.carte}>
            <h3 className={s.carteTitre}>{c.question}</h3>
            <div className={s.ouiNon}>
              {[true, false].map((v) => (
                <button
                  key={String(v)}
                  type="button"
                  className={`${s.ressentiBtn} ${safety[c.key] === v ? s.ressentiOn : ''}`}
                  onClick={() => {
                    setSafety({ ...safety, [c.key]: v });
                    setEnregistre(false);
                  }}
                  aria-pressed={safety[c.key] === v}
                >
                  {v ? 'Oui' : 'Non'}
                </button>
              ))}
            </div>
            <p className={s.carteTexte}>{c.consequence}</p>
            <p className={s.notePetite}>{c.detail}</p>
          </section>
        ))}

        <button
          type="button"
          className={`${s.cta} ${s.ctaSobre}`}
          onClick={() => void valider()}
          disabled={!complet || envoi}
        >
          {depart ? 'Commencer le programme' : 'Enregistrer'}
          <Ico nom="coche" />
        </button>
        {!complet && <p className={s.notePetite}>Réponds aux deux questions pour continuer.</p>}
        {enregistre && !depart && <p className={s.notePetite}>Enregistré.</p>}
      </div>
      <NavFemmes actif="reglages" onAller={onAller} />
    </div>
  );
}
