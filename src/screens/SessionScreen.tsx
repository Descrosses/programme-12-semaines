import { useEffect, useState } from 'react';
import { ExerciseCard, type SetPayload } from '../components/ExerciseCard';
import { ReadinessSection } from '../components/ReadinessSection';
import { WarmupSection } from '../components/WarmupSection';
import { BLOCKS } from '../data/program';
import { DAY_LABELS, type DayIndex, type WeekIndex } from '../data/types';
import { humanDate } from '../engine/calendar';
import { fr } from '../engine/format';
import type { ResolvedExercise } from '../engine/getSession';
import { bestJump, readiness as computeReadiness } from '../engine/readiness';
import {
  saveReadiness,
  saveSet,
  toggleWarmupItem,
  updateSession,
} from '../db/repo';
import type { RestTimer } from '../state/useRestTimer';
import { useSessionData } from '../state/useSessionData';
import styles from './Session.module.css';

/**
 * Écran séance.
 *
 * Ordre de lecture voulu : où j'en suis → échauffement → readiness → les
 * exercices → notes → terminer. Rien à chercher, rien à faire défiler deux
 * fois pour retrouver la charge.
 */
export function SessionScreen({
  week,
  day,
  timer,
  onBack,
}: {
  week: WeekIndex;
  day: DayIndex;
  timer: RestTimer;
  onBack: () => void;
}) {
  const data = useSessionData(week, day);
  const [notes, setNotes] = useState('');
  const [notesLoaded, setNotesLoaded] = useState(false);

  useEffect(() => {
    if (data.row && !notesLoaded) {
      setNotes(data.row.notes);
      setNotesLoaded(true);
    }
  }, [data.row, notesLoaded]);

  if (data.loading) {
    return <div className={styles.loading}>Chargement…</div>;
  }

  if (!data.session) {
    return (
      <div className={styles.screen}>
        <header className={styles.header}>
          <button type="button" className={styles.back} onClick={onBack}>
            ← Retour
          </button>
          <h1 className={styles.title}>Repos</h1>
          <p className={styles.meta}>Pas de séance prévue ce jour-là.</p>
        </header>
      </div>
    );
  }

  const { session, row } = data;
  const overrides = row?.loadOverrides ?? {};
  const doneSets = Object.values(data.savedSets).flat().length;
  const plannedSets = session.exercises.reduce((n, e) => n + e.sets, 0);

  async function handleSaveSet(ex: ResolvedExercise, payload: SetPayload) {
    if (!row?.id) return;
    await saveSet({
      sessionId: row.id,
      exerciseId: ex.id,
      week,
      day,
      date: data.date,
      setIndex: payload.setIndex,
      plannedKg: overrides[ex.id] ?? ex.load.kg,
      plannedReps: ex.work.kind === 'reps' && typeof ex.work.reps === 'number' ? ex.work.reps : null,
      targetRPE: ex.targetRPE,
      actualKg: payload.actualKg,
      actualReps: payload.actualReps,
      actualRpe: payload.actualRpe,
      measureValue: payload.measureValue,
      failed: payload.failed,
    });
    await data.reload();
  }

  async function handleOverride(exId: string, kg: number | null) {
    if (!row?.id) return;
    const next = { ...overrides };
    if (kg === null) delete next[exId];
    else next[exId] = kg;
    await updateSession(row.id, { loadOverrides: next });
    await data.reload();
  }

  async function handleWarmup(itemId: string) {
    if (!row?.id) return;
    await toggleWarmupItem(row.id, itemId);
    await data.reload();
  }

  async function handleReadiness(attempts: Array<number | null>) {
    const best = bestJump(attempts);
    const result = computeReadiness(data.baselineCm, best);
    if (best === null || !result) return;
    await saveReadiness({
      date: data.date,
      week,
      day,
      attempts,
      jumpCm: best,
      level: result.level,
      pctDelta: result.pctDelta,
    });
    await data.reload();
  }

  async function handleNotes(value: string) {
    setNotes(value);
    if (row?.id) await updateSession(row.id, { notes: value });
  }

  /**
   * « Séance terminée » ramène à la vue Semaine : ce qu'on veut voir juste
   * après avoir rangé les disques, c'est l'état des 5 jours et le prochain à
   * faire — pas l'écran qu'on vient de finir. Dé-cocher, à l'inverse, sert à
   * corriger une saisie : on reste alors sur place.
   */
  async function handleFinish() {
    if (!row?.id) return;
    const finishing = row.status !== 'done';
    await updateSession(row.id, {
      status: finishing ? 'done' : 'planned',
      finishedAt: Date.now(),
    });
    if (finishing) {
      timer.skip();
      onBack();
      return;
    }
    await data.reload();
  }

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <button type="button" className={styles.back} onClick={onBack}>
          ← Semaine {week}
        </button>
        <h1 className={styles.title}>{session.title}</h1>
        <div className={styles.meta}>
          <span className={styles.tag} style={{ background: session.blockColor }}>
            {session.intensity}
          </span>
          <span>{DAY_LABELS[day]}</span>
          {data.date && <span>{humanDate(data.date)}</span>}
          <span>
            Durée <b>{session.durationLabel}</b>
          </span>
          <span>
            Bloc <b>{BLOCKS[session.block].name}</b>
          </span>
        </div>

        {data.trend.declining && <p className={styles.note}>{data.trend.message}</p>}
        {session.notes.map((n, i) => (
          <p key={i} className={styles.note}>
            {n}
          </p>
        ))}
      </header>

      {session.warmup && (
        <WarmupSection
          warmup={session.warmup}
          checked={row?.warmupChecked ?? []}
          onToggle={(id) => void handleWarmup(id)}
        />
      )}

      {session.readinessTest && (
        <ReadinessSection
          baselineCm={data.baselineCm}
          attempts={data.readinessRow?.attempts ?? [null, null, null]}
          result={data.readiness}
          onSave={(a) => void handleReadiness(a)}
        />
      )}

      {session.exercises.map((ex) => (
        <ExerciseCard
          key={ex.id}
          ex={ex}
          savedSets={data.savedSets[ex.id] ?? []}
          overrideKg={overrides[ex.id] ?? null}
          timer={timer}
          media={data.date ? { week, day, date: data.date } : null}
          onSaveSet={handleSaveSet}
          onOverride={(id, kg) => void handleOverride(id, kg)}
        />
      ))}

      <section className={styles.notes}>
        <label htmlFor="session-notes" className={styles.exName}>
          Notes — douleur, sommeil, remarque
        </label>
        <textarea
          id="session-notes"
          className={styles.notesField}
          value={notes}
          onChange={(e) => void handleNotes(e.target.value)}
          placeholder="Genou droit sensible en fin de série. 5 h de sommeil."
        />
      </section>

      <button
        type="button"
        className={`${styles.finish} ${row?.status === 'done' ? styles.finishDone : ''}`}
        onClick={() => void handleFinish()}
      >
        {row?.status === 'done' ? 'Séance terminée — annuler' : 'Séance terminée'}
      </button>

      <div className={styles.summary}>
        <b>Résumé</b>
        <dl>
          <dt>Séries validées</dt>
          <dd>
            {doneSets} / {plannedSets}
          </dd>
          <dt>Échauffement</dt>
          <dd>
            {row?.warmupChecked.length ?? 0} / {session.warmup?.items.length ?? 0}
          </dd>
          {data.readiness && (
            <>
              <dt>Readiness</dt>
              <dd>
                {data.readiness.level.toUpperCase()} · {data.readiness.jumpCm} cm (
                {data.readiness.pctDelta > 0 ? '+' : ''}
                {fr(data.readiness.pctDelta)} %)
              </dd>
            </>
          )}
          <dt>Tonnage</dt>
          <dd>{fr(tonnage(data.savedSets))} kg</dd>
        </dl>
      </div>
    </div>
  );
}

function tonnage(saved: Record<string, { actualKg: number | null; actualReps: number | null }[]>) {
  let total = 0;
  for (const list of Object.values(saved)) {
    for (const s of list) {
      if (s.actualKg && s.actualReps) total += s.actualKg * s.actualReps;
    }
  }
  return Math.round(total);
}
