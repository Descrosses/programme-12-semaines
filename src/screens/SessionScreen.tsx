import { useState } from 'react';
import { ExerciseCard, type SetPayload } from '../components/ExerciseCard';
import { ExerciseNote } from '../components/ExerciseNote';
import { ExercisePanel } from '../components/ExercisePanel';
import { SupersetCard } from '../components/SupersetCard';
import { ReadinessSection } from '../components/ReadinessSection';
import { WarmupSection } from '../components/WarmupSection';
import { BLOCKS } from '../data/program';
import { DAY_LABELS, type DayIndex, type WeekIndex } from '../data/types';
import { humanDate } from '../engine/calendar';
import { fr, setSummary } from '../engine/format';
import {
  clockLabel,
  durationVerdict,
  elapsedMin,
  gapLabel,
  isRunning,
} from '../engine/sessionClock';
import type { ResolvedExercise } from '../engine/getSession';
import { bestJump, readiness as computeReadiness } from '../engine/readiness';
import {
  addSessionExercise,
  cancelSessionExercise,
  commitAllDrafts,
  resetSessionClock,
  setsOnSessionExercise,
  saveReadiness,
  saveSet,
  toggleWarmupItem,
  updateSession,
} from '../db/repo';
import {
  additionChip,
  prefillFrom,
  previousAdditions,
  previousReplacement,
  type CustomSpec,
} from '../engine/customExercise';
import { EXERCISES } from '../data/exercises';
import { groupSupersets } from '../engine/superset';
import { useNow } from '../state/useNow';
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
  const [resetDemande, setResetDemande] = useState(false);
  /*
   * Quel panneau est ouvert : `{ remplace: id }` pour un remplacement,
   * `{ ajout: true }` pour un ajout, `null` pour aucun. Un seul à la fois —
   * deux panneaux superposés sur un écran de 390 px ne se ferment plus.
   */
  const [panneau, setPanneau] = useState<{ remplace?: string; ajout?: true } | null>(null);
  const [annuleCustom, setAnnuleCustom] = useState<{ id: number; series: number } | null>(null);
  /*
   * Le chrono ne tourne que pendant la séance. Terminée, sa durée est figée en
   * base : plus rien à recalculer, donc plus d'intervalle qui tourne.
   */
  const now = useNow(isRunning(data.row ?? {}));

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
  /*
   * `SessionExerciseRow` satisfait `CustomRow` — elle porte en plus le
   * `sessionId`, dont le moteur n'a pas besoin et qu'il ne regarde pas. Pas de
   * conversion : le moteur reste pur, l'écran garde ce qu'il lui faut.
   */
  const tousRows = data.customRows;
  const duJour = tousRows.filter((r) => r.sessionId === row?.id);
  /** Une séance terminée est un fait enregistré : on ne la réécrit plus. */
  const enCours = row?.status !== 'done';
  /*
   * Les exercices déjà choisis une fois, pour les proposer en tête du
   * panneau — le plus récent d'abord. S'il a remplacé le squat par un Hack
   * Squat la semaine dernière, c'est très probablement ce qu'il rechoisira.
   */
  const dejaUtilises = tousRows.map((r) => ({
    exerciseId: r.exerciseId,
    name: r.name,
    at: r.at,
  }));
  const ajoutsPasses = previousAdditions(tousRows, { week, day });
  /*
   * Les exercices, regroupés : les paires marquées par le programme tombent
   * dans un seul encadré, le reste s'affiche carte par carte. Le regroupement
   * se fait ICI, sur la liste déjà résolue — donc après les règles de bloc, le
   * deload, les suspensions et les remplacements. Une paire dont une moitié a
   * disparu en chemin ne forme plus de paire, et l'autre moitié s'affiche
   * seule, normalement.
   */
  const blocs = groupSupersets(session.exercises);
  const chrono = row ? clockLabel(row, now) : null;
  const reel = row ? elapsedMin(row, now) : null;
  const verdict = reel === null ? null : durationVerdict(reel, session.plannedMin);

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
      plannedReps:
        ex.work.kind === 'reps' && typeof ex.work.reps === 'number' ? ex.work.reps : null,
      targetRPE: ex.targetRPE,
      actualKg: payload.actualKg,
      actualReps: payload.actualReps,
      actualRpe: payload.actualRpe,
      measureValue: payload.measureValue,
      measureUnit: payload.measureUnit,
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

  /**
   * Enregistre un remplacement ou un ajout — immédiatement.
   *
   * Pas de « brouillon » ici : contrairement à une remarque, un exercice de
   * séance n'est pas une phrase en cours de frappe. Il est choisi en un geste
   * et sert tout de suite à saisir des séries.
   */
  async function handleSaveCustom(spec: CustomSpec) {
    if (!row?.id) return;
    const remplace = panneau?.remplace ?? null;
    await addSessionExercise({
      sessionId: row.id,
      week,
      day,
      date: data.date ?? '',
      kind: remplace ? 'replace' : 'add',
      originalExerciseId: remplace,
      ...spec,
    });
    setPanneau(null);
    await data.reload();
  }

  /**
   * Annule un remplacement ou un ajout — et les séries qui s'y rattachaient.
   *
   * Les deux ensemble. Retirer la ligne seule laisserait en base des séries
   * attachées à un exercice absent de la séance : invisibles à l'écran, mais
   * bien présentes dans l'historique du mouvement et dans sa progression.
   * D'où la confirmation, qui dit combien de séries partent.
   */
  async function handleCancelCustom(id: number) {
    const series = await setsOnSessionExercise(
      row?.id ?? -1,
      data.customRows.find((r) => r.id === id)?.exerciseId ?? '',
    );
    if (series === 0) {
      await cancelSessionExercise(id);
      await data.reload();
      return;
    }
    setAnnuleCustom({ id, series });
  }

  async function confirmCancelCustom() {
    if (!annuleCustom) return;
    await cancelSessionExercise(annuleCustom.id);
    setAnnuleCustom(null);
    await data.reload();
  }

  async function handleResetClock() {
    if (!row?.id) return;
    await resetSessionClock(row.id);
    setResetDemande(false);
    await data.reload();
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
    /*
     * `finishedAt` n'est posé qu'en TERMINANT. Avant, il était réécrit aussi
     * en décochant — donc une correction de saisie faite le lendemain
     * rallongeait la séance d'une journée entière. En décochant, on l'efface :
     * la séance reprend, et son chrono repart de son vrai début.
     */
    /*
     * Filet du bouton « Ajouter cette remarque » : une phrase laissée dans un
     * champ est la seule chose que le découpage brouillon / historique pourrait
     * faire perdre. En terminant la séance, on ajoute ce qui restait.
     */
    if (finishing) await commitAllDrafts(week, day);
    await updateSession(row.id, {
      status: finishing ? 'done' : 'planned',
      finishedAt: finishing ? Date.now() : undefined,
    });
    if (finishing) {
      timer.skip();
      onBack();
      return;
    }
    await data.reload();
  }

  /**
   * Une carte d'exercice, avec tout ce qui s'y rattache.
   *
   * Extraite en fonction parce qu'elle sert à deux endroits : seule, et à
   * l'intérieur d'un bloc d'alternance (où `sansSeries` range la saisie dans
   * le bloc). Une seule définition, donc aucun risque qu'un exercice perde sa
   * remarque ou son suivi de douleur selon l'endroit où il s'affiche.
   */
  function carte(ex: ResolvedExercise, sansSeries: boolean) {
    const custom = duJour.find((r) => r.exerciseId === ex.id) ?? null;
    const original = custom?.originalExerciseId ?? null;
    return (
      <div key={ex.id}>
        <ExerciseCard
          ex={ex}
          savedSets={data.savedSets[ex.id] ?? []}
          overrideKg={overrides[ex.id] ?? null}
          history={data.history[ex.id]}
          timer={timer}
          media={data.date ? { week, day, date: data.date } : null}
          note={{ week, day, date: data.date ?? '' }}
          hideSets={sansSeries}
          custom={
            custom
              ? {
                  row: custom,
                  originalName: original ? (EXERCISES[original]?.name ?? original) : null,
                }
              : null
          }
          prevReplacement={previousReplacement(tousRows, {
            exerciseId: custom?.originalExerciseId ?? ex.id,
            week,
            day,
          })}
          /*
           * Remplaçable tant que la séance n'est pas terminée. Après, la
           * séance est un fait enregistré : on ne réécrit pas ce qu'on a fait,
           * on corrige éventuellement les séries.
           */
          onReplace={enCours && !custom ? () => setPanneau({ remplace: ex.id }) : undefined}
          onCancelCustom={
            enCours && custom?.id !== undefined
              ? () => void handleCancelCustom(custom.id!)
              : undefined
          }
          onSaveSet={handleSaveSet}
          onOverride={(id, kg) => void handleOverride(id, kg)}
        />

        {panneau?.remplace === ex.id && (
          <ExercisePanel
            titre={`Remplacer ${ex.name}`}
            sousTitre="L’exercice prévu reste au programme. La semaine prochaine, il revient."
            initial={prefillFrom(ex)}
            used={dejaUtilises}
            onCancel={() => setPanneau(null)}
            onSave={(spec) => void handleSaveCustom(spec)}
          />
        )}
      </div>
    );
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
            Prévu <b>{session.durationLabel}</b>
          </span>
          {chrono !== null && (
            <span className={styles.chrono}>
              ⏱ <b className="tnum">{chrono}</b>
              {row?.status === 'done' ? '' : ' en cours'}
            </span>
          )}
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

      {blocs.map((bloc) =>
        bloc.kind === 'paire' ? (
          /*
           * Deux mouvements menés ensemble : un seul encadré, les séries dans
           * l'ordre où elles se font. Les fiches des deux exercices — remarque,
           * douleur, consignes, remplacement — sont rendues DANS le bloc, par
           * les mêmes cartes que partout ailleurs, privées de leurs séries.
           */
          <SupersetCard
            key={`superset-${bloc.id}`}
            paire={bloc}
            savedSets={data.savedSets}
            overrides={overrides}
            timer={timer}
            onSaveSet={handleSaveSet}
            fiches={
              <>
                {carte(bloc.a, true)}
                {carte(bloc.b, true)}
              </>
            }
          />
        ) : (
          carte(bloc.ex, false)
        ),
      )}

      {/*
        Exercices suspendus — affichés, jamais prescrits.
        Les faire disparaître sans un mot laisserait croire à un oubli, et la
        raison est précisément ce qu'il faut relire pour décider de la reprise.
      */}
      {session.suspended.map((sus) => {
        /*
         * Une suspension retire la PRESCRIPTION, jamais le RÉSULTAT.
         *
         * Les séries déjà faites ce jour-là sont réaffichées telles qu'elles
         * ont été enregistrées. Sans ça, rouvrir une semaine passée donnait
         * l'impression que le travail avait été effacé — alors qu'il était
         * seulement devenu invisible.
         *
         * En lecture seule : pas de champ de saisie, pas de bouton de
         * validation. L'exercice n'est pas au programme, il a juste été fait.
         */
        const faites = [...(data.savedSets[sus.id] ?? [])].sort((a, b) => a.setIndex - b.setIndex);
        return (
          <section key={sus.id} className={styles.suspendu}>
            <div className={styles.suspenduTitre}>{sus.name} — suspendu temporairement</div>
            <p className={styles.suspenduRaison}>{sus.reason}</p>
            {faites.length > 0 && (
              <>
                <p className={styles.suspenduFait}>
                  Ce que tu avais fait ce jour-là — conservé, non modifiable
                </p>
                <ul className={styles.suspenduSeries}>
                  {faites.map((set) => (
                    <li key={set.setIndex} className={styles.suspenduSerie}>
                      <span className={styles.suspenduIndex}>{set.setIndex + 1}</span>
                      <span className="tnum">{setSummary(set)}</span>
                      {set.failed && <span className={styles.suspenduRate}>Rep ratée</span>}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        );
      })}

      {/*
        Ajouter un exercice — en bas de la liste, après tout ce qui était
        prévu. Jamais au milieu : glisser un ajout entre deux exercices
        prescrits déplacerait le travail du programme.
      */}
      {enCours && (
        <section className={styles.addZone}>
          {ajoutsPasses.length > 0 && (
            <div className={styles.addPrev}>
              {ajoutsPasses.map((r) => (
                <div key={r.id ?? `${r.exerciseId}-${r.at}`} className={styles.addPrevRow}>
                  <span className={styles.addPrevText}>➕ {additionChip(r)}</span>
                  {/*
                    « Reprendre » refait le même choix en un geste. Il ne
                    l'applique pas tout seul : un exercice ajouté une fois
                    n'est pas une modification du programme.
                  */}
                  <button
                    type="button"
                    className={styles.addPrevButton}
                    onClick={() =>
                      void handleSaveCustom({
                        exerciseId: r.exerciseId,
                        name: r.name,
                        sets: r.sets,
                        reps: r.reps,
                        kg: r.kg,
                        restSec: r.restSec,
                      })
                    }
                  >
                    Reprendre
                  </button>
                </div>
              ))}
            </div>
          )}

          {panneau?.ajout ? (
            <ExercisePanel
              titre="Ajouter un exercice"
              sousTitre="Il n’entre pas au programme : il compte pour cette séance."
              used={dejaUtilises}
              onCancel={() => setPanneau(null)}
              onSave={(spec) => void handleSaveCustom(spec)}
            />
          ) : (
            <button
              type="button"
              className={styles.addButton}
              onClick={() => setPanneau({ ajout: true })}
            >
              ＋ Ajouter un exercice
            </button>
          )}
        </section>
      )}

      {/*
        Confirmation d'annulation — elle dit ce qui part, parce que des séries
        déjà saisies partent avec.
      */}
      {annuleCustom && (
        <div className={styles.resetConfirm} style={{ margin: '0 var(--pad) 16px' }}>
          <p className={styles.resetAsk}>
            Annuler cet exercice ? Les {annuleCustom.series} série
            {annuleCustom.series > 1 ? 's' : ''} déjà saisie
            {annuleCustom.series > 1 ? 's' : ''} dessus seront supprimées.
          </p>
          <div className={styles.resetActions}>
            <button
              type="button"
              className={styles.resetYes}
              onClick={() => void confirmCancelCustom()}
            >
              Oui, annuler et supprimer les séries
            </button>
            <button type="button" className={styles.resetNo} onClick={() => setAnnuleCustom(null)}>
              Garder
            </button>
          </div>
        </div>
      )}

      {/*
        La remarque de séance, en bas, comme avant — mais appendue elle aussi.
        Même composant que les remarques de mouvement : une remarque de séance
        n'est qu'une remarque sans mouvement, et en faire un second mécanisme
        les aurait fait divergir au premier correctif.
      */}
      <section className={styles.notes}>
        <ExerciseNote
          exerciseId={null}
          context={{ week, day, date: data.date ?? '' }}
          label="Remarque de séance — douleur, sommeil, sensation"
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
          <dt>Durée</dt>
          <dd className="tnum">
            {chrono ?? '—'}
            {verdict && (
              <span className={styles.summaryRef}> / {verdict.plannedMin} min prévu</span>
            )}
          </dd>
          {verdict && (
            <>
              <dt>Écart</dt>
              <dd className="tnum">{gapLabel(verdict)}</dd>
            </>
          )}
        </dl>

        {/*
          Un constat, pas un reproche. L'appli ne sait pas si la séance a
          débordé parce que la salle était pleine, parce qu'un repos a traîné
          ou parce que l'échauffement a été fait sérieusement — donc elle ne
          tranche pas et ne conseille rien.
        */}
        {verdict?.warn && (
          <p className={styles.summaryWarn}>
            Séance plus longue que prévu de {gapLabel(verdict)}. À vérifier : les repos tenus, et le
            temps passé entre deux stations.
          </p>
        )}

        {/*
          Remise à zéro du chrono — avec confirmation, parce qu'elle efface la
          seule chose que le chrono sait : son heure de début.
        */}
        {row &&
          (resetDemande ? (
            <div className={styles.resetConfirm}>
              <p className={styles.resetAsk}>
                Repartir de maintenant ? L’heure de début enregistrée sera perdue.
              </p>
              <div className={styles.resetActions}>
                <button
                  type="button"
                  className={styles.resetYes}
                  onClick={() => void handleResetClock()}
                >
                  Oui, repartir de maintenant
                </button>
                <button
                  type="button"
                  className={styles.resetNo}
                  onClick={() => setResetDemande(false)}
                >
                  Annuler
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className={styles.resetClock}
              onClick={() => setResetDemande(true)}
            >
              ⏱ Remettre le chrono à zéro
            </button>
          ))}
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
