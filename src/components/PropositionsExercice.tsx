/**
 * Les questions posées sur un exercice, AVANT d'en faire les séries :
 * aligner les reps attendues, accepter la charge de la semaine (§11).
 *
 * Extraites de la carte d'exercice pour une raison précise (retour de
 * Guillaume, 22 novembre) : dans un superset, la carte de chaque station est
 * rangée SOUS les tours. La question « aligner l'attendu sur 10 reps ? »
 * arrivait donc après toutes les séries — et disparaissait dès la première
 * notée. Le superset la pose désormais en tête de bloc, la carte simple au
 * même endroit qu'avant. Un seul composant : les deux ne peuvent pas diverger.
 */
import { useState } from 'react';
import type { SetRow } from '../db/db';
import {
  estAlignable,
  propositionAlignement,
  type DecisionAlignement,
} from '../engine/alignementReps';
import { fr } from '../engine/format';
import type { ResolvedExercise } from '../engine/getSession';
import type { Occurrence } from '../engine/types';
import type { NoteContext } from './ExerciseNote';
import { Stepper, stepValue } from './Stepper';
import styles from '../screens/Session.module.css';

export function PropositionsExercice({
  ex,
  savedSets,
  overrideKg,
  history,
  note,
  alignement,
  onOverride,
  titre,
}: {
  ex: ResolvedExercise;
  savedSets: SetRow[];
  overrideKg: number | null;
  history: Occurrence[] | undefined;
  note: NoteContext;
  alignement?: {
    decision: DecisionAlignement | undefined;
    onDecider: (d: DecisionAlignement) => void;
  };
  onOverride: (exId: string, kg: number | null) => void;
  /** Le nom de l'exercice, dit au-dessus des questions quand elles sont en tête de superset. */
  titre?: string;
}) {
  const [refusing, setRefusing] = useState(false);
  const [manualKg, setManualKg] = useState<number>(ex.load.kg ?? 0);
  const plannedKg = overrideKg ?? ex.load.kg;

  const suggestion = ex.suggestion;
  const showSuggestion =
    suggestion?.requiresConfirm &&
    suggestion.suggestedKg !== null &&
    overrideKg === null &&
    savedSets.length === 0;

  /*
   * « Tu as fait 3 × 10 au lieu de 3 × 6 : aligner l'attendu ? » — seulement
   * avant la première série du jour, et pour un accessoire ou un exercice de
   * tronc compté en reps.
   */
  const proposition =
    alignement &&
    savedSets.length === 0 &&
    ex.work.kind === 'reps' &&
    typeof ex.work.reps === 'number' &&
    estAlignable(ex.def.role, ex.work.kind, ex.work.reps)
      ? propositionAlignement(ex.work.reps, history, note.week, alignement.decision)
      : null;

  if (!proposition && !showSuggestion) return null;

  return (
    <>
      {titre !== undefined && <p className={styles.propositionTitre}>{titre}</p>}
      {proposition && alignement && (
        <div className={styles.suggestion}>
          <div className={styles.suggestionText}>
            En semaine {proposition.semaine}, tu as tenu <b>{proposition.propose} reps</b> à chacun
            de tes {proposition.nbTours} tours, au lieu de {proposition.prevu}. Aligner l’attendu
            sur {proposition.propose} reps pour la suite du programme ?
          </div>
          <div className={styles.suggestionActions}>
            <button
              type="button"
              className={styles.accept}
              onClick={() => alignement.onDecider({ reps: proposition.propose, accepte: true })}
            >
              Passer à {proposition.propose} reps
            </button>
            <button
              type="button"
              className={styles.refuse}
              onClick={() => alignement.onDecider({ reps: proposition.propose, accepte: false })}
            >
              Garder {proposition.prevu}
            </button>
          </div>
        </div>
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
    </>
  );
}
