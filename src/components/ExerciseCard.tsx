import { useEffect, useState } from 'react';
import type { SetRow } from '../db/db';
import { fr, loadLine, restLabel } from '../engine/format';
import type { ResolvedExercise } from '../engine/getSession';
import type { LoadShape } from '../engine/loadResolver';
import type { RestTimer } from '../state/useRestTimer';
import { ExerciseMediaButton, type MediaContext } from './ExerciseMedia';
import { Stepper, stepValue } from './Stepper';
import styles from '../screens/Session.module.css';

export interface SetPayload {
  setIndex: number;
  actualKg: number | null;
  actualReps: number | null;
  actualRpe: number | null;
  measureValue: number | null;
  failed: boolean;
}

/**
 * Configuration du stepper de mesure pour les exercices qui ne comptent pas
 * des reps.
 *
 * Chrono au dixième : sur 10 ou 20 m, l'écart entre deux séances se joue à
 * 0,1 s. Et comme un chrono vidéo donne des centièmes, ces mesures acceptent
 * aussi la saisie clavier (appui sur la valeur) — contrairement aux reps, à la
 * charge et au RPE, où la grille du stepper est le bon outil.
 */
const MEASURE = {
  cm: { label: 'Distance', unit: 'cm', step: 5, min: 50, max: 400 },
  s: { label: 'Temps', unit: 's', step: 0.1, min: 0.5, max: 60 },
  m: { label: 'Distance', unit: 'm', step: 5, min: 5, max: 200 },
  kg: { label: 'Charge', unit: 'kg', step: 2.5, min: 0, max: 300 },
  reps: { label: 'Reps', unit: '', step: 1, min: 0, max: 60 },
} as const;

export function ExerciseCard({
  ex,
  savedSets,
  overrideKg,
  timer,
  media,
  onSaveSet,
  onOverride,
}: {
  ex: ResolvedExercise;
  savedSets: SetRow[];
  overrideKg: number | null;
  timer: RestTimer;
  /** Où l'on se trouve dans le programme, pour dater photos et traces vidéo. */
  media: MediaContext | null;
  onSaveSet: (ex: ResolvedExercise, payload: SetPayload) => Promise<void>;
  onOverride: (exId: string, kg: number | null) => void;
}) {
  const [openCues, setOpenCues] = useState(false);
  const [refusing, setRefusing] = useState(false);
  const [manualKg, setManualKg] = useState<number>(ex.load.kg ?? 0);

  const plannedKg = overrideKg ?? ex.load.kg;
  const shownLoadLine = buildLoadLine(ex, plannedKg);
  const allDone = savedSets.length >= ex.sets && ex.sets > 0;
  const suggestion = ex.suggestion;
  const showSuggestion =
    suggestion?.requiresConfirm &&
    suggestion.suggestedKg !== null &&
    overrideKg === null &&
    savedSets.length === 0;

  return (
    <article className={`${styles.exercise} ${allDone ? styles.exerciseDone : ''}`}>
      <div className={styles.exHead}>
        <div className={styles.exName}>{ex.name}</div>
        <div className={`${styles.loadLine} tnum`}>{shownLoadLine}</div>

        <div className={styles.exSub}>
          {ex.targetRPE && <span>{ex.targetRPE.label}</span>}
          {ex.restSec > 0 && (
            <span>
              Repos <b>{restLabel(ex.restSec)}</b>
            </span>
          )}
          {overrideKg !== null && <span style={{ color: 'var(--accent)' }}>charge ajustée</span>}
        </div>

        {ex.contrast && (
          <div className={styles.adjust}>
            <b>Contraste</b> — {ex.contrast.cycleLabel}. Série lourde →{' '}
            {restLabel(ex.contrast.restAfterHeavySec)} → {ex.contrast.explosive} ×{' '}
            {ex.contrast.explosiveReps} → {restLabel(ex.contrast.restAfterExplosiveSec)} → série
            suivante. Ce n’est pas un superset.
          </div>
        )}

        {ex.adjustments.map((a, i) => (
          <div
            key={i}
            className={`${styles.adjust} ${a.source === 'rouge' ? styles.adjustRouge : ''}`}
          >
            <b>{a.what}</b> — {a.why}
          </div>
        ))}

        {ex.notes.map((n, i) => (
          <div key={i} className={styles.exSub} style={{ color: 'var(--ink-2)' }}>
            {n}
          </div>
        ))}
      </div>

      {media && (
        <ExerciseMediaButton exerciseId={ex.id} exerciseName={ex.name} context={media} />
      )}

      {showSuggestion && (
        <div className={styles.suggestion}>
          <div className={styles.suggestionText}>{suggestion.reason}</div>
          {!refusing ? (
            <div className={styles.suggestionActions}>
              <button
                type="button"
                className={styles.accept}
                onClick={() => onOverride(ex.id, suggestion.suggestedKg)}
              >
                Accepter {fr(suggestion.suggestedKg!)} kg
              </button>
              <button
                type="button"
                className={styles.refuse}
                onClick={() => {
                  setManualKg(plannedKg ?? 0);
                  setRefusing(true);
                }}
              >
                Refuser
              </button>
            </div>
          ) : (
            <>
              <div className={styles.suggestionActions} style={{ marginTop: 12 }}>
                <Stepper
                  label="Ma charge"
                  value={manualKg}
                  step={ex.load.step}
                  min={0}
                  max={300}
                  unit="kg"
                  tone="accent"
                  onStep={(d) => setManualKg((v) => stepValue(v, d, 0, 300))}
                />
              </div>
              <div className={styles.suggestionActions}>
                <button
                  type="button"
                  className={styles.accept}
                  onClick={() => {
                    onOverride(ex.id, manualKg);
                    setRefusing(false);
                  }}
                >
                  Utiliser {fr(manualKg)} kg
                </button>
                <button type="button" className={styles.refuse} onClick={() => setRefusing(false)}>
                  Annuler
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {ex.ramp && (
        <div className={styles.adjust} style={{ margin: '0 var(--pad) 12px' }}>
          <b>Paliers</b> —{' '}
          {ex.ramp
            .map(
              (r) =>
                `${r.added ? '+' : ''}${fr(r.kg)}${r.reps > 1 ? `×${r.reps}` : ''}${r.optional ? ' ?' : ''}`,
            )
            .join(' / ')}
        </div>
      )}

      {ex.sets > 0 && (
        <div className={styles.sets}>
          {Array.from({ length: ex.sets }, (_, i) => (
            <SetEntry
              key={i}
              ex={ex}
              index={i}
              plannedKg={plannedKg}
              saved={savedSets.find((s) => s.setIndex === i) ?? null}
              timer={timer}
              onSave={onSaveSet}
            />
          ))}
        </div>
      )}

      {/*
        L'intention suffit à ouvrir le bloc. Avant, il fallait une consigne, une
        alternative ou une règle de progression : un exercice qui n'avait que
        son intention — Explosive Cable Row, One-Arm Cable Row, Cable Chop… —
        ne montrait donc RIEN, alors que le .md écrit bien quelque chose sur lui.
      */}
      {(ex.def.intent || ex.def.cues?.length || ex.def.altBasicFit || ex.def.progressionRule) && (
        <>
          <button
            type="button"
            className={styles.disclosure}
            onClick={() => setOpenCues((v) => !v)}
            aria-expanded={openCues}
          >
            {openCues
              ? '▲ Masquer les consignes'
              : ex.def.altBasicFit
                ? '▼ Consignes et alternative Basic-Fit'
                : '▼ Consignes'}
          </button>
          {openCues && (
            <div className={styles.cues}>
              {ex.def.intent && (
                <p>
                  <b>Intention :</b> {ex.def.intent}
                </p>
              )}
              {ex.def.cues?.map((c, i) => <p key={i}>{c}</p>)}
              {ex.def.progressionRule && (
                <p>
                  <b>Progression :</b> {ex.def.progressionRule}
                </p>
              )}
              {ex.def.altBasicFit && (
                <p>
                  <b>Alternative Basic-Fit :</b> {ex.def.altBasicFit}
                </p>
              )}
            </div>
          )}
        </>
      )}
    </article>
  );
}

// ---------------------------------------------------------------------------

function SetEntry({
  ex,
  index,
  plannedKg,
  saved,
  timer,
  onSave,
}: {
  ex: ResolvedExercise;
  index: number;
  plannedKg: number | null;
  saved: SetRow | null;
  timer: RestTimer;
  onSave: (ex: ResolvedExercise, payload: SetPayload) => Promise<void>;
}) {
  const plannedReps = plannedRepsOf(ex);
  const measure = measureOf(ex);

  const [editing, setEditing] = useState(false);
  const [reps, setReps] = useState<number>(saved?.actualReps ?? plannedReps ?? 1);
  /*
   * `null` et non 0 quand rien n'est planifié : un « 0 kg » affiché sur une
   * poulie ressemble à une charge prescrite, alors que le programme n'en donne
   * aucune. Le stepper montre « — » tant que Guillaume n'a rien saisi, puis la
   * séance suivante part de ce qu'il a réellement tiré (`lastCompleted`).
   */
  const [kg, setKg] = useState<number | null>(saved?.actualKg ?? plannedKg ?? null);
  const [rpeValue, setRpe] = useState<number>(saved?.actualRpe ?? ex.targetRPE?.max ?? 7);
  const [value, setValue] = useState<number>(saved?.measureValue ?? measure?.min ?? 0);
  const [failed, setFailed] = useState<boolean>(saved?.failed ?? false);

  // Quand la charge du plan change — suggestion acceptée, feu tricolore, charge
  // saisie à la main — les séries pas encore validées se réalignent dessus.
  useEffect(() => {
    if (saved === null && plannedKg !== null) setKg(plannedKg);
  }, [plannedKg, saved]);

  /*
   * Le stepper de charge dépend de la FORME du mouvement, pas de l'existence
   * d'une charge planifiée. Les poulies et le landmine debout portent une
   * charge externe que le programme ne chiffre nulle part : les afficher sans
   * stepper revenait à ne jamais pouvoir noter ce qu'on a vraiment tiré.
   *
   * L'inverse — inventer une charge « planifiée » pour faire apparaître le
   * champ — serait pire : le .md n'en donne aucune, l'appli n'a pas à en
   * fabriquer une.
   */
  const hasKg = plannedKg !== null || PORTE_UNE_CHARGE.has(ex.load.shape);

  const done = saved !== null && !editing;

  async function validate() {
    timer.prime();
    await onSave(ex, {
      setIndex: index,
      actualKg: hasKg ? kg : null,
      actualReps: measure ? null : reps,
      actualRpe: ex.targetRPE ? rpeValue : null,
      measureValue: measure ? value : null,
      failed,
    });
    setEditing(false);
    if (ex.restSec > 0) {
      const label = ex.contrast
        ? `→ ${ex.contrast.explosive} × ${ex.contrast.explosiveReps}`
        : `${ex.name} — série ${index + 1}`;
      timer.start(ex.contrast?.restAfterHeavySec ?? ex.restSec, label);
    }
  }

  if (done) {
    return (
      <div className={`${styles.setRow} ${styles.setDone}`}>
        <div className={styles.setIndex}>{index + 1}</div>
        <button type="button" className={styles.setSummary} onClick={() => setEditing(true)}>
          {saved.actualReps !== null && (
            <span className={`${styles.setSummaryValue} tnum`}>
              {saved.actualReps} <span className={styles.setSummaryUnit}>reps</span>
            </span>
          )}
          {saved.measureValue !== null && measure && (
            <span className={`${styles.setSummaryValue} tnum`}>
              {fr(saved.measureValue)} <span className={styles.setSummaryUnit}>{measure.unit}</span>
            </span>
          )}
          {saved.actualKg !== null && (
            <span className={`${styles.setSummaryValue} tnum`}>
              {fr(saved.actualKg)} <span className={styles.setSummaryUnit}>kg</span>
            </span>
          )}
          {saved.actualRpe !== null && (
            <span className={`${styles.setSummaryValue} tnum`}>
              {fr(saved.actualRpe)} <span className={styles.setSummaryUnit}>RPE</span>
            </span>
          )}
          {saved.failed && <span className={styles.failFlag}>Rep ratée</span>}
        </button>
      </div>
    );
  }

  // Trois champs au maximum. Dès qu'il y en a un nombre impair, le dernier
  // prend toute la largeur pour que les boutons gardent leurs 48 px.
  const hasRpe = ex.targetRPE !== null;
  const count = 1 + (hasKg ? 1 : 0) + (hasRpe ? 1 : 0);
  const wide = (position: number) => (count % 2 === 1 && position === count ? styles.stepperWide : '');

  return (
    <div className={styles.setRow}>
      <div className={styles.setIndex}>{index + 1}</div>
      <div className={styles.fields}>
        <div className={styles.steppers}>
          <div className={wide(1)}>
            {measure ? (
              <Stepper
                label={measure.label}
                value={value}
                step={measure.step}
                min={measure.min}
                max={measure.max}
                unit={measure.unit}
                tone="accent"
                onStep={(d) => setValue((v) => stepValue(v, d, measure.min, measure.max))}
                onCommit={(v) => setValue(v ?? measure.min)}
              />
            ) : (
              <Stepper
                label="Reps"
                value={reps}
                step={1}
                min={0}
                max={60}
                onStep={(d) => setReps((v) => stepValue(v, d, 0, 60))}
              />
            )}
          </div>

          {hasKg && (
            <div className={wide(2)}>
              <Stepper
                label={ex.load.shape === 'added' ? 'Lest' : 'Charge'}
                value={kg}
                step={ex.load.step}
                min={0}
                max={300}
                unit="kg"
                onStep={(d) => setKg((v) => stepValue(v ?? 0, d, 0, 300))}
              />
            </div>
          )}

          {hasRpe && (
            <div className={wide(count)}>
              <Stepper
                label="RPE"
                value={rpeValue}
                step={0.5}
                min={4}
                max={10}
                onStep={(d) => setRpe((v) => stepValue(v, d, 4, 10))}
              />
            </div>
          )}
        </div>

        {ex.def.role === 'main' && (
          <button
            type="button"
            className={`${styles.failToggle} ${failed ? styles.failToggleOn : ''}`}
            onClick={() => setFailed((f) => !f)}
            aria-pressed={failed}
          >
            {failed ? '✓ Rep ratée' : 'Rep ratée ?'}
          </button>
        )}

        <button type="button" className={styles.validate} onClick={() => void validate()}>
          Valider la série {index + 1}
        </button>

        {ex.contrast && (
          <button
            type="button"
            className={styles.failToggle}
            onClick={() =>
              timer.start(
                ex.contrast!.restAfterExplosiveSec,
                `${ex.contrast!.explosive} fait → série suivante`,
              )
            }
          >
            {ex.contrast.explosive} × {ex.contrast.explosiveReps} fait
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

/**
 * Les formes qui portent une charge externe. Pour elles, le champ de saisie
 * s'affiche même quand le programme ne chiffre rien : c'est la machine ou la
 * barre qui décide, et seule la saisie de Guillaume peut la connaître.
 */
const PORTE_UNE_CHARGE = new Set<LoadShape>(['barbell', 'added', 'dbPair', 'dbSingle', 'cable']);

function plannedRepsOf(ex: ResolvedExercise): number | null {
  if (ex.work.kind !== 'reps') return null;
  const r = ex.work.reps;
  if (r === 'max') return null;
  return typeof r === 'number' ? r : r.max;
}

function measureOf(ex: ResolvedExercise): (typeof MEASURE)[keyof typeof MEASURE] | null {
  if (ex.work.kind === 'distance') return MEASURE.m;
  if (ex.def.role !== 'test' && !ex.def.measure) return null;
  if (ex.def.role !== 'test') return null;
  const m = ex.def.measure;
  return m ? MEASURE[m] : MEASURE.reps;
}

/** Reprend la ligne de charge en tenant compte d'une charge ajustée. */
function buildLoadLine(ex: ResolvedExercise, kg: number | null): string {
  if (kg === null || kg === ex.load.kg) return ex.loadLine;
  return loadLine(ex.sets, ex.work, { ...ex.load, kg });
}
