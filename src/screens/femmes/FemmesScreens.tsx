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
 * ── Ce qui n'est volontairement pas branché ───────────────────────────────
 *
 * La saisie (répétitions, ressenti, remarque) vit en mémoire d'écran. Elle
 * n'écrit PAS en base : la persistance de FEMMES 8 n'a pas été validée, et
 * brancher une écriture sur un schéma non arrêté coûterait une migration
 * pour rien. Les champs existent, ils fonctionnent, ils ne survivent pas à
 * un rechargement — et c'est dit dans le compte rendu plutôt que caché.
 */

import { useMemo, useState } from 'react';
import { NIVEAU_PAR_DEFAUT, niveauDef, type Niveau } from '../../data/femmes/niveaux';
import { phaseOf } from '../../data/femmes/phases';
import { SAFETY_CHECKS, WEEK_DAYS } from '../../data/femmes/programme';
import { WEEKS, type DayIndex, type Version, type WeekIndex } from '../../data/femmes/types';
import { getSession, sessionVolume } from '../../engine/femmes/getSession';
import { restLabel, workLabel } from '../../engine/femmes/format';
import { EMPTY_CONTEXT } from '../../engine/femmes/types';
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

export const ETAT_INITIAL: EtatFemmes = {
  semaine: 1,
  jour: 0,
  version: 'maison',
  niveau: NIVEAU_PAR_DEFAUT,
};

/* ═══════════════════════════════════════════════ 1 — AUJOURD'HUI ═══════ */

export function FemmesAujourdhui({
  etat,
  onAller,
  onCommencer,
}: {
  etat: EtatFemmes;
  onAller: (o: OngletFemmes) => void;
  onCommencer: () => void;
}) {
  const phase = phaseOf(etat.semaine);
  const seance = useMemo(
    () => getSession(etat.semaine, etat.jour, etat.version, EMPTY_CONTEXT, etat.niveau),
    [etat],
  );
  const total = WEEKS.reduce((n, w) => n + WEEK_DAYS[w].length, 0);

  return (
    <div className={s.page}>
      <Bandeau titre="MAJK FEMMES" />

      <div className={s.chips}>
        <span className={s.chip}>{niveauDef(etat.niveau).nom}</span>
        <span className={s.chip}>
          Semaine <b>{etat.semaine}</b>
        </span>
        <span className={s.chip}>{NOMS[etat.jour]}</span>
        <span className={s.chip}>
          <Ico nom="chrono" taille={14} />
          <b>{phase.durationLabel}</b>
        </span>
      </div>

      <div className={s.corps}>
        <section className={s.carte}>
          <h2 className={s.carteTitre}>
            Semaine {etat.semaine} · {phase.name}
          </h2>
          <p className={s.carteTexte}>{phase.objective}</p>
        </section>

        <section className={`${s.carte} ${s.carteRose}`}>
          <p className={s.gros}>{sessionVolume(seance)}</p>
          <p className={s.carteTexte}>
            Repos {restLabel(seance.restSec)} entre les tours · Phase {phase.id} — {phase.name}.
          </p>
        </section>

        <button type="button" className={s.cta} onClick={onCommencer}>
          <Ico nom="play" />
          Commencer la séance
        </button>

        <div className={s.duo}>
          <div className={s.tuile}>
            <p className={s.tuileValeur}>0 / {total}</p>
            <p className={s.tuileLabel}>Séances faites</p>
          </div>
          <div className={s.tuile}>
            {/*
              Un tiret, et non « 0 jour ». Rien n'est encore enregistré pour
              FEMMES 8 : afficher un zéro laisserait croire à une mesure.
            */}
            <p className={s.tuileValeur}>—</p>
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
  onSemaine,
  onJour,
  onAller,
}: {
  etat: EtatFemmes;
  onSemaine: (w: WeekIndex) => void;
  onJour: (d: DayIndex) => void;
  onAller: (o: OngletFemmes) => void;
}) {
  const phase = phaseOf(etat.semaine);
  const seance = getSession(etat.semaine, 0, etat.version, EMPTY_CONTEXT, etat.niveau);
  const jours = WEEK_DAYS[etat.semaine];

  return (
    <div className={s.page}>
      <Bandeau surTitre="Programme" titre={`SEMAINE ${etat.semaine}`} />

      <div className={s.chips}>
        <span className={s.chip}>
          Phase <b>{phase.id}</b>
        </span>
        <span className={s.chip}>{phase.name}</span>
      </div>

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
          <h2 className={s.carteTitre}>
            <Ico nom="cible" taille={19} /> Objectif de la semaine
          </h2>
          <p className={s.carteTexte}>{phase.objective}</p>
        </section>

        <section className={`${s.carte} ${s.carteCyan}`}>
          <p className={s.gros}>{sessionVolume(seance)}</p>
          <p className={s.carteTexte}>
            {jours.length} séances de {phase.durationLabel} · repos {restLabel(seance.restSec)}{' '}
            entre les tours.
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
              <span className={`${s.etat} ${d === etat.jour ? s.etatPrevu : ''}`}>
                {d === etat.jour ? 'Prévue' : 'À faire'}
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
  onVersion,
  onAller,
  onExercice,
}: {
  etat: EtatFemmes;
  onVersion: (v: Version) => void;
  onAller: (o: OngletFemmes) => void;
  onExercice: (index: number) => void;
}) {
  const phase = phaseOf(etat.semaine);
  const seance = useMemo(
    () => getSession(etat.semaine, etat.jour, etat.version, EMPTY_CONTEXT, etat.niveau),
    [etat],
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
            <Ico nom="maison" taille={18} />
            Maison
          </button>
          <button
            type="button"
            className={`${s.basculeBtn} ${etat.version === 'salle' ? s.basculeOnSalle : ''}`}
            onClick={() => onVersion('salle')}
            aria-pressed={etat.version === 'salle'}
          >
            <Ico nom="halteres" taille={18} />
            Salle de sport
          </button>
        </div>

        <section className={`${s.carte} ${s.carteRose}`}>
          <h2 className={s.carteTitre}>
            <Ico nom="boucle" taille={19} /> Circuit · {seance.tours} tours
          </h2>
          <p className={s.carteTexte}>
            Repos {restLabel(seance.restSec)} entre les tours · {phase.durationLabel}
          </p>
        </section>

        <section className={s.ligne}>
          <button
            type="button"
            className={s.ligneTete}
            onClick={() => setIntroOuverte((v) => !v)}
            aria-expanded={introOuverte}
          >
            <span className={s.numero}>
              <Ico nom="course" taille={15} />
            </span>
            <span>
              <span className={s.ligneNom}>Échauffement</span>
              <span className={s.ligneDose}>{seance.intro.length} mouvements · 5 min</span>
            </span>
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
                      <Ico nom="coche" taille={16} />
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

        <p className={s.blocLabel}>Circuit · {seance.slots.length} exercices à enchaîner</p>

        <div className={s.lignes}>
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

        <button type="button" className={s.cta}>
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
 * Les répétitions, le ressenti et la remarque vivent en mémoire d'écran et
 * n'écrivent PAS en base. La persistance de FEMMES 8 n'a pas été arrêtée :
 * brancher une écriture sur un schéma non validé coûterait une migration
 * pour rien. Les champs fonctionnent, ils ne survivent pas à un
 * rechargement, et l'écran le dit au lieu de le cacher.
 */
export function FemmesExercice({
  etat,
  index,
  onRetour,
  onIndex,
  onAller,
}: {
  etat: EtatFemmes;
  index: number;
  onRetour: () => void;
  onIndex: (i: number) => void;
  onAller: (o: OngletFemmes) => void;
}) {
  const seance = useMemo(
    () => getSession(etat.semaine, etat.jour, etat.version, EMPTY_CONTEXT, etat.niveau),
    [etat],
  );
  const rangJour = WEEK_DAYS[etat.semaine].indexOf(etat.jour);
  const slot = seance.slots[Math.min(index, seance.slots.length - 1)];
  const [reps, setReps] = useState<number | null>(null);
  const [ressenti, setRessenti] = useState<string | null>(null);

  const cible = useMemo(() => {
    if (slot === undefined) return 10;
    const m = /(\d+)/.exec(workLabel(slot.work));
    return m ? Number(m[1]) : 10;
  }, [slot]);

  if (slot === undefined) return null;
  const valeur = reps ?? cible;
  const dernier = index >= seance.slots.length - 1;

  return (
    <div className={s.page}>
      <Bandeau
        retour={`Séance ${rangJour + 1}`}
        onRetour={onRetour}
        surTitre={`Exercice ${index + 1} / ${seance.slots.length}`}
        titre={slot.exercise.name}
      />

      <div className={s.corps}>
        <section className={s.consignes}>
          <p className={s.consignesTitre}>Consignes</p>
          <ul className={s.consignesListe}>
            <li>
              <span className={s.coche}>
                <Ico nom="coche" taille={16} />
              </span>
              <span>{slot.exercise.intent}</span>
            </li>
            {(slot.exercise.cues ?? []).map((c, i) => (
              <li key={i}>
                <span className={s.coche}>
                  <Ico nom="coche" taille={16} />
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
            {slot.kg !== null ? ` · ${slot.kg} kg` : ''} · {seance.tours} tours
          </p>
        </section>

        <p className={s.blocLabel}>Réalisé · répétitions</p>
        <div className={s.compteur}>
          <button
            type="button"
            className={s.compteurBtn}
            onClick={() => setReps(Math.max(0, valeur - 1))}
            aria-label="Une répétition de moins"
          >
            −
          </button>
          <span className={s.compteurValeur}>{valeur}</span>
          <button
            type="button"
            className={s.compteurBtn}
            onClick={() => setReps(valeur + 1)}
            aria-label="Une répétition de plus"
          >
            +
          </button>
        </div>

        <div className={s.ressenti}>
          {['Facile', 'Correct', 'Dur'].map((r) => (
            <button
              key={r}
              type="button"
              className={`${s.ressentiBtn} ${ressenti === r ? s.ressentiOn : ''}`}
              onClick={() => setRessenti(r)}
              aria-pressed={ressenti === r}
            >
              {r}
            </button>
          ))}
        </div>

        <p className={s.remarqueLabel}>Remarque (facultatif)</p>
        <textarea
          className={s.remarque}
          placeholder="Ce qui a tiré, gêné, mieux marché…"
          aria-label={`Remarque sur ${slot.exercise.name}`}
        />

        <button
          type="button"
          className={s.cta}
          onClick={() => (dernier ? onRetour() : onIndex(index + 1))}
        >
          {dernier ? 'Terminer le circuit' : 'Valider l’exercice'}
          <Ico nom="coche" />
        </button>

        <p className={s.notePetite}>
          La saisie de FEMMES 8 n’est pas encore enregistrée : elle ne survit pas à un rechargement.
        </p>
      </div>

      <NavFemmes actif="aujourdhui" onAller={onAller} />
    </div>
  );
}

/* ════════════════════════════════════════════════ écran de sécurité ════ */

/** Les deux questions, posées une fois, qui écartent des exercices. */
export function FemmesSecurite({ onAller }: { onAller: (o: OngletFemmes) => void }) {
  return (
    <div className={s.page}>
      <Bandeau surTitre="Avant de commencer" titre="Sécurité" />
      <div className={s.corps}>
        {SAFETY_CHECKS.map((c) => (
          <section key={c.key} className={s.carte}>
            <h2 className={s.carteTitre}>{c.question}</h2>
            <p className={s.carteTexte}>{c.consequence}</p>
            <p className={s.notePetite}>{c.detail}</p>
          </section>
        ))}
      </div>
      <NavFemmes actif="reglages" onAller={onAller} />
    </div>
  );
}
