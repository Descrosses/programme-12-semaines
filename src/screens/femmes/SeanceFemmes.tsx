/**
 * La séance FEMMES, présentée comme celle de POWER (demande de Guillaume).
 *
 * ── Même écran, mêmes briques ─────────────────────────────────────────────
 *
 * Pas une imitation : les mêmes classes (`Session.module.css`), le même
 * échauffement à cocher (`WarmupSection`), les mêmes curseurs (`Stepper`), la
 * même carte de circuit que POWER pour ses alternances — en-tête, tours
 * dépliés un à un, stations A, B, C… Le thème FEMMES repeint le tout.
 *
 * Un circuit se fait dans l'ordre des tours : tour 1, A puis B puis C ; tour
 * 2, A puis B… C'est exactement ce que la carte de circuit range, sans rien à
 * faire défiler entre deux exercices. Le repos se lance à la fin d'un tour,
 * pas entre deux exercices : le programme les enchaîne.
 *
 * Sous le circuit, une fiche par exercice : consignes, ressenti, remarque.
 * Le ressenti nourrit la progression des charges en salle — c'est la règle du
 * moteur FEMMES, rien d'ajouté.
 */

import { Fragment, useMemo, useState, type CSSProperties } from 'react';
import { Icon } from '../../components/Icon';
import { Stepper } from '../../components/Stepper';
import { WarmupSection } from '../../components/WarmupSection';
import type { FemmesSeanceRow } from '../../db/db';
import { WEEK_DAYS } from '../../data/femmes/programme';
import { phaseOf } from '../../data/femmes/phases';
import { niveauDef } from '../../data/femmes/niveaux';
import type { ResolvedSlot, Version } from '../../data/femmes/types';
import type { Warmup } from '../../data/types';
import { getSession } from '../../engine/femmes/getSession';
import { restLabel, workLabel } from '../../engine/femmes/format';
import { targetForWeek } from '../../engine/femmes/progression';
import { toursValides, tourValide } from '../../engine/femmes/tours';
import type { ExerciseRecord, Ressenti, TourFait } from '../../engine/femmes/types';
import type { RestTimer } from '../../state/useRestTimer';
import type { DonneesFemmes, EtatFemmes } from './FemmesScreens';
import styles from '../Session.module.css';
import s from './Femmes.module.css';

const NOMS = ['Lundi', 'Mercredi', 'Vendredi', 'Samedi'] as const;
const RESSENTIS: readonly { id: Ressenti; label: string }[] = [
  { id: 'facile', label: 'Facile' },
  { id: 'ok', label: 'Correct' },
  { id: 'dur', label: 'Dur' },
];
const lettre = (i: number) => String.fromCharCode(65 + i);
const borne = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export interface ActionsSeanceFemmes {
  onRetour: () => void;
  onVersion: (v: Version) => void;
  onDemarrer: () => Promise<void>;
  onEchauffement: (ids: string[]) => Promise<void>;
  onTour: (slot: ResolvedSlot, index: number, tour: TourFait, planned: number) => Promise<void>;
  onNote: (
    slot: ResolvedSlot,
    planned: number,
    patch: { ressenti?: Ressenti | null; remarque?: string | null },
  ) => Promise<void>;
  onTerminer: () => Promise<void>;
  onRouvrir: () => Promise<void>;
  onNonFaite: (oui: boolean) => void;
}

export function SeanceFemmes({
  etat,
  donnees,
  timer,
  actions,
}: {
  etat: EtatFemmes;
  donnees: DonneesFemmes;
  timer: RestTimer;
  actions: ActionsSeanceFemmes;
}) {
  const phase = phaseOf(etat.semaine);
  const seance = useMemo(
    () => getSession(etat.semaine, etat.jour, etat.version, donnees.ctx, etat.niveau),
    [etat, donnees.ctx],
  );
  const rang = WEEK_DAYS[etat.semaine].indexOf(etat.jour);
  const ligne: FemmesSeanceRow | null =
    donnees.seances.find((x) => x.semaine === etat.semaine && x.jour === etat.jour) ?? null;
  const record = (exId: string): ExerciseRecord | null =>
    ligne?.exercices.find((r) => r.exerciseId === exId) ?? null;

  const tours = seance.tours;
  const terminee = ligne?.terminee === true;
  const sautee = ligne?.sautee === true && !terminee;
  const demarree = ligne?.debut !== undefined;

  /* Un exercice est fait quand tous ses tours sont validés — comme une carte
     POWER quand toutes ses séries prescrites le sont. */
  const etats = seance.slots.map((sl) => {
    const n = toursValides(record(sl.exercise.id), tours);
    return n >= tours ? 'fait' : n > 0 ? 'en-cours' : 'a-faire';
  });
  const exFaits = etats.filter((e) => e === 'fait').length;
  const seriesFaites = seance.slots.reduce(
    (n, sl) => n + toursValides(record(sl.exercise.id), tours),
    0,
  );
  const tourFait = (i: number) =>
    seance.slots.every((sl) => tourValide(record(sl.exercise.id), i) !== null);
  const tourActif = Array.from({ length: tours }, (_, i) => i).find((i) => !tourFait(i)) ?? -1;

  const warmup: Warmup = {
    id: 'lower',
    durationLabel: '5 min',
    items: seance.intro.map((i) => ({ id: i.id, label: i.label, consigne: i.detail })),
  };

  async function valider(slot: ResolvedSlot, index: number, tour: TourFait) {
    const planned = targetForWeek(slot.work, etat.semaine);
    timer.prime();
    await actions.onTour(slot, index, tour, planned);
    // Le repos se lance quand le tour est complet — sauf après le dernier.
    const complet = seance.slots.every(
      (sl) => sl.slotId === slot.slotId || tourValide(record(sl.exercise.id), index) !== null,
    );
    if (complet && index < tours - 1 && seance.restSec > 0) {
      timer.start(seance.restSec, `Tour ${index + 1} fait — repos`);
    }
  }

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <button type="button" className={styles.back} onClick={actions.onRetour}>
          <Icon name="arrow-left" size="18px" />
          Semaine {etat.semaine}
        </button>
        <h1 className={styles.title}>Séance {rang + 1}</h1>
        <span className={styles.titleRule} aria-hidden="true" />
        <div className={styles.meta}>
          <span
            className={`${styles.metaItem} ${styles.tag}`}
            style={{ '--bloc': 'var(--accent-bright)' } as CSSProperties}
          >
            {niveauDef(etat.niveau).nom}
          </span>
          <span className={styles.metaItem}>{NOMS[rang]}</span>
          <span className={styles.metaItem}>
            Prévu <b>≈ {phase.durationLabel}</b>
          </span>
          <span className={styles.metaItem}>
            <Icon name="stopwatch" size="14px" />{' '}
            {terminee ? 'Terminée' : sautee ? 'Non faite' : demarree ? 'En cours' : 'Pas commencée'}
          </span>
          <span className={styles.metaItem}>
            Phase <b>{phase.name}</b>
          </span>
        </div>
        {seance.notes.map((n, i) => (
          <p key={i} className={styles.note}>
            {n}
          </p>
        ))}
      </header>

      <div className={styles.avancement}>
        <div className={styles.avancementLigne}>
          <p className={styles.avancementTexte}>
            <b className="tnum">{exFaits}</b> / {seance.slots.length}{' '}
            {seance.slots.length > 1 ? 'exercices terminés' : 'exercice terminé'}
          </p>
        </div>
        <div
          className={styles.avancementBarre}
          style={{ '--n': seance.slots.length } as CSSProperties}
          aria-hidden="true"
        >
          {etats.map((e, i) => (
            <span
              key={i}
              className={`${styles.avancementPas} ${
                e === 'fait'
                  ? styles.avancementFait
                  : e === 'en-cours'
                    ? styles.avancementEnCours
                    : ''
              }`}
            />
          ))}
        </div>
      </div>

      {!demarree && !terminee && (
        <button type="button" className={styles.demarrer} onClick={() => void actions.onDemarrer()}>
          <Icon name="play" size="20px" />
          Démarrer la séance
        </button>
      )}

      {/*
        Maison ou salle : libre À CHAQUE SÉANCE, jamais imposé par le
        programme. Le circuit et ses charges suivent le choix.
      */}
      <div className={`${s.bascule} ${s.basculeSeance}`}>
        <button
          type="button"
          className={`${s.basculeBtn} ${etat.version === 'maison' ? s.basculeOn : ''}`}
          onClick={() => actions.onVersion('maison')}
          aria-pressed={etat.version === 'maison'}
        >
          <span aria-hidden="true">🏠</span>
          Maison
        </button>
        <button
          type="button"
          className={`${s.basculeBtn} ${etat.version === 'salle' ? s.basculeOnSalle : ''}`}
          onClick={() => actions.onVersion('salle')}
          aria-pressed={etat.version === 'salle'}
        >
          <span aria-hidden="true">🏋️</span>
          Salle de sport
        </button>
      </div>

      <WarmupSection
        warmup={warmup}
        checked={ligne?.echauffement ?? []}
        onToggle={(id) => {
          const avant = ligne?.echauffement ?? [];
          void actions.onEchauffement(
            avant.includes(id) ? avant.filter((x) => x !== id) : [...avant, id],
          );
        }}
      />

      {/* ------------------------------------------------- le circuit ----- */}
      <section
        className={`${styles.superset} ${seriesFaites >= tours * seance.slots.length ? styles.supersetDone : ''}`}
        aria-label={`Circuit : ${seance.slots.map((sl) => sl.exercise.name).join(', ')}`}
      >
        <div className={styles.supersetHead}>
          <span className={styles.supersetBadge}>CIRCUIT</span>
          <h3 className={styles.supersetTitle}>
            {seance.slots.map((sl, i) => (
              <span key={sl.slotId}>
                {i > 0 && <span className={styles.supersetPlus}> + </span>}
                {sl.exercise.name}
              </span>
            ))}
          </h3>
          <div className={`${styles.supersetFormat} tnum`}>
            {tours} tour{tours > 1 ? 's' : ''} ·{' '}
            {seance.slots.map((sl) => workLabel(sl.work)).join(' · ')}
          </div>
          <p className={styles.supersetConsigne}>
            Enchaîne les {seance.slots.length} exercices sans repos, puis{' '}
            {restLabel(seance.restSec)} de repos entre les tours.
          </p>
          <div className={`${styles.supersetCount} tnum`}>
            {seriesFaites} / {tours * seance.slots.length} séries
          </div>
        </div>

        {Array.from({ length: tours }, (_, i) => (
          <div
            key={i}
            className={`${styles.tour} ${i === tourActif ? styles.tourOuvert : ''} ${
              tourFait(i) ? styles.tourFait : ''
            }`}
          >
            <div className={styles.tourHead}>
              <span className={styles.setIndex}>{i + 1}</span>
              <span className={styles.tourTitre}>
                Tour {i + 1} sur {tours}
              </span>
              {tourFait(i) && (
                <span className={styles.tourFlag}>
                  <Icon name="check" size="15px" /> fait
                </span>
              )}
            </div>

            {seance.slots.map((sl, station) => (
              <Fragment key={sl.slotId}>
                {station > 0 && (
                  <div className={styles.tourChain}>
                    <span />
                    ENCHAÎNE, SANS REPOS
                    <span />
                  </div>
                )}
                <div className={styles.station}>
                  <div className={styles.stationNom}>
                    <span className={styles.stationLettre}>{lettre(station)}</span>
                    {sl.exercise.name}
                  </div>
                  <LigneTour
                    key={`${sl.exercise.id}-${i}`}
                    slot={sl}
                    index={i}
                    semaine={etat.semaine}
                    courante={i === tourActif}
                    fait={tourValide(record(sl.exercise.id), i)}
                    precedent={i > 0 ? tourValide(record(sl.exercise.id), i - 1) : null}
                    onValider={(t) => valider(sl, i, t)}
                  />
                </div>
              </Fragment>
            ))}
          </div>
        ))}

        {/* Les fiches : consignes, ressenti, remarque — sous les tours,
            comme dans la carte de circuit de POWER. */}
        <div className={styles.supersetFiches}>
          {seance.slots.map((sl, i) => (
            <FicheExercice
              key={`${sl.exercise.id}-${etat.semaine}-${etat.jour}`}
              slot={sl}
              rang={i}
              tours={tours}
              semaine={etat.semaine}
              record={record(sl.exercise.id)}
              fait={etats[i] === 'fait'}
              onNote={(patch) => actions.onNote(sl, targetForWeek(sl.work, etat.semaine), patch)}
            />
          ))}
        </div>
      </section>

      <button
        type="button"
        className={`${styles.finish} ${terminee ? styles.finishDone : ''}`}
        onClick={() => void (terminee ? actions.onRouvrir() : actions.onTerminer())}
      >
        {terminee ? 'Séance terminée — annuler' : 'Séance terminée'}
      </button>
      {!terminee && (
        <button
          type="button"
          className={styles.nonFaite}
          onClick={() => actions.onNonFaite(!sautee)}
        >
          {sautee ? 'Marquée non faite — annuler' : 'Séance non faite — passer à la suivante'}
        </button>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════ une ligne de tour ══════ */

/**
 * La ligne d'un exercice dans un tour : ses curseurs, puis « Valider ».
 * Validée, elle se replie en une ligne « 12 reps · 4 kg » qu'on touche pour
 * corriger — exactement comme une série POWER.
 */
function LigneTour({
  slot,
  index,
  semaine,
  courante,
  fait,
  precedent,
  onValider,
}: {
  slot: ResolvedSlot;
  index: number;
  semaine: EtatFemmes['semaine'];
  courante: boolean;
  fait: TourFait | null;
  /** Le tour d'avant : on repart de ce qu'on vient de faire. */
  precedent: TourFait | null;
  onValider: (t: TourFait) => Promise<void>;
}) {
  const cible = targetForWeek(slot.work, semaine);
  const reglable = slot.load.kind === 'adjustable';
  const pas = slot.load.kind === 'adjustable' ? slot.load.step : 1;
  const enSecondes = slot.work.kind === 'time';
  const [reps, setReps] = useState(fait?.reps ?? cible);
  const [kg, setKg] = useState<number | null>(fait?.kg ?? precedent?.kg ?? slot.kg);
  const [edition, setEdition] = useState(false);
  const [envoi, setEnvoi] = useState(false);

  if (fait !== null && !edition) {
    return (
      <div className={`${styles.setRow} ${styles.setDone}`}>
        <div className={styles.setIndex}>{index + 1}</div>
        <button
          type="button"
          className={styles.setSummary}
          onClick={() => setEdition(true)}
          aria-label={`${slot.exercise.name}, tour ${index + 1} validé — toucher pour corriger`}
        >
          <span className={`${styles.setSummaryValue} tnum`}>
            {fait.kg !== null && (
              <>
                {fait.kg} <span className={styles.setSummaryUnit}>kg</span> ×{' '}
              </>
            )}
            {fait.reps} <span className={styles.setSummaryUnit}>{enSecondes ? 's' : 'reps'}</span>
          </span>
        </button>
      </div>
    );
  }

  async function valider() {
    if (envoi) return;
    setEnvoi(true);
    try {
      await onValider({ reps, kg: reglable ? kg : null });
      setEdition(false);
    } finally {
      setEnvoi(false);
    }
  }

  const colonnes = reglable ? 2 : 1;
  return (
    <div className={`${styles.setRow} ${courante ? styles.setCourante : ''}`}>
      <div className={styles.setIndex}>{index + 1}</div>
      <div className={styles.fields}>
        <div
          className={styles.steppersLigne}
          style={{ gridTemplateColumns: `repeat(${colonnes}, auto)` }}
        >
          {reglable && (
            <Stepper
              compact
              label="Charge kg"
              value={kg}
              step={pas}
              min={0}
              max={200}
              onStep={(d) => setKg((v) => borne(+((v ?? 0) + d).toFixed(2), 0, 200))}
              onCommit={(v) => setKg(v)}
            />
          )}
          <Stepper
            compact
            label={enSecondes ? 'Secondes' : 'Reps'}
            value={reps}
            step={enSecondes ? 5 : 1}
            min={0}
            max={enSecondes ? 600 : 100}
            onStep={(d) => setReps((v) => borne(v + d, 0, enSecondes ? 600 : 100))}
            onCommit={(v) => setReps(v ?? 0)}
          />
        </div>
        <button
          type="button"
          className={styles.validate}
          aria-label={`Valider ${slot.exercise.name} — tour ${index + 1}`}
          onClick={() => void valider()}
          disabled={envoi}
        >
          Valider — tour {index + 1}
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════ la fiche d'un exercice ════ */

function FicheExercice({
  slot,
  rang,
  tours,
  semaine,
  record,
  fait,
  onNote,
}: {
  slot: ResolvedSlot;
  rang: number;
  tours: number;
  semaine: EtatFemmes['semaine'];
  record: ExerciseRecord | null;
  fait: boolean;
  onNote: (patch: { ressenti?: Ressenti | null; remarque?: string | null }) => Promise<void>;
}) {
  const [consignes, setConsignes] = useState(false);
  const [noteOuverte, setNoteOuverte] = useState(record?.remarque != null);
  const [remarque, setRemarque] = useState(record?.remarque ?? '');
  const ressenti = record?.ressenti ?? null;

  return (
    <article className={`${styles.exercise} ${fait ? styles.exerciseDone : ''}`}>
      <div className={styles.exHead}>
        <p className={styles.exRepere}>
          Exercice {String(rang + 1).padStart(2, '0')} · {lettre(rang)}
        </p>
        <div className={styles.exName}>{slot.exercise.name}</div>
        <div className={`${styles.loadLine} tnum`}>
          {tours} × {workLabel(slot.work)}
          {slot.kg !== null ? ` × ${slot.kg} kg` : ''}
        </div>
        <div className={styles.exSub}>
          <span>
            Cible <b>{targetForWeek(slot.work, semaine)}</b>
          </span>
        </div>
        {slot.substitutedFor !== undefined && (
          /* La substitution se DIT : la taire ferait passer un repli pour une
             erreur de programme. */
          <p className={styles.note}>
            Remplace « {slot.substitutedFor.exercise.name} » — {slot.substitutedFor.reason}.
          </p>
        )}
      </div>

      <div className={styles.tiroirs}>
        <button
          type="button"
          className={`${styles.tiroir} ${consignes ? styles.tiroirOuvert : ''}`}
          onClick={() => setConsignes((v) => !v)}
          aria-expanded={consignes}
        >
          Consignes
        </button>
        <button
          type="button"
          className={`${styles.tiroir} ${noteOuverte ? styles.tiroirOuvert : ''}`}
          onClick={() => setNoteOuverte((v) => !v)}
          aria-expanded={noteOuverte}
        >
          Remarque
        </button>
      </div>

      {consignes && (
        <div className={styles.cues}>
          <p>{slot.exercise.intent}</p>
          {(slot.exercise.cues ?? []).map((c, i) => (
            <p key={i}>{c}</p>
          ))}
          {slot.note !== undefined && <p>{slot.note}</p>}
        </div>
      )}

      {/* Le ressenti : c'est lui que la progression des charges relit. */}
      <div className={styles.tiroirs} role="group" aria-label={`Ressenti — ${slot.exercise.name}`}>
        {RESSENTIS.map((r) => (
          <button
            key={r.id}
            type="button"
            className={`${styles.tiroir} ${ressenti === r.id ? s.ressentiChoisi : ''}`}
            onClick={() => void onNote({ ressenti: ressenti === r.id ? null : r.id })}
            aria-pressed={ressenti === r.id}
          >
            {r.label}
          </button>
        ))}
      </div>

      {noteOuverte && (
        <div className={styles.cues}>
          <textarea
            className={s.remarque}
            placeholder="Ce qui a tiré, gêné, mieux marché…"
            aria-label={`Remarque sur ${slot.exercise.name}`}
            value={remarque}
            onChange={(e) => setRemarque(e.target.value)}
            onBlur={() =>
              void onNote({ remarque: remarque.trim() === '' ? null : remarque.trim() })
            }
          />
        </div>
      )}
    </article>
  );
}
