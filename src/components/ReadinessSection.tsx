import { useState } from 'react';
import {
  JUMP_MAX_CM,
  JUMP_MIN_CM,
  bestJump,
  readiness as compute,
  parseJumpCm,
} from '../engine/readiness';
import type { ReadinessResult } from '../engine/types';
import { Stepper, stepValue } from './Stepper';
import styles from '../screens/Session.module.css';

/**
 * §4 — readiness test. Trois broad jumps, on garde le meilleur.
 *
 * Défauts n°1 et n°4 du prototype corrigés : la saisie est persistée en base,
 * et le verdict modifie réellement la séance affichée en dessous.
 */
export function ReadinessSection({
  baselineCm,
  attempts,
  result,
  onSave,
}: {
  baselineCm: number | null;
  attempts: Array<number | null>;
  result: ReadinessResult | null;
  onSave: (attempts: Array<number | null>) => void;
}) {
  const [draft, setDraft] = useState<Array<number | null>>(attempts);
  const best = bestJump(draft);
  const preview = compute(baselineCm, best);
  const shown = result ?? preview;
  const level = shown?.level;

  // Mise à jour fonctionnelle : deux appuis rapides sur « + » comptent pour deux.
  const stepAttempt = (i: number, delta: number) => {
    setDraft((prev) => {
      const next = [...prev];
      next[i] = stepValue(prev[i] ?? null, delta, JUMP_MIN_CM, JUMP_MAX_CM);
      return next;
    });
  };

  /** Valeur tapée au clavier sur un des trois sauts. */
  const commitAttempt = (i: number, brut: string) => {
    setDraft((prev) => {
      const next = [...prev];
      next[i] = parseJumpCm(brut, prev[i] ?? null);
      return next;
    });
  };

  return (
    <section
      className={`${styles.ready} ${
        level === 'vert'
          ? styles.readyVert
          : level === 'orange'
            ? styles.readyOrange
            : level === 'rouge'
              ? styles.readyRouge
              : ''
      }`}
      aria-label="Readiness test"
    >
      <h2 className={styles.readyTitle}>Readiness — 3 broad jumps</h2>
      <p className={styles.readyHint}>
        {baselineCm
          ? `Référence ${baselineCm} cm. Après l’échauffement, 3 sauts, 1 min de repos entre chaque.`
          : 'Renseigne ta référence de broad jump dans les réglages : sans elle, pas de verdict.'}
      </p>

      <div className={styles.jumps}>
        {[0, 1, 2].map((i) => (
          <Stepper
            key={i}
            label={`Saut ${i + 1}`}
            value={draft[i] ?? null}
            step={5}
            min={JUMP_MIN_CM}
            max={JUMP_MAX_CM}
            unit="cm"
            tone={best !== null && draft[i] === best ? 'accent' : 'normal'}
            onStep={(d) => stepAttempt(i, d)}
            /*
             * Saisie au clavier en plus des boutons : au pas de 5 cm, un saut
             * mesuré à 268 cm était impossible à entrer. Le readiness se joue
             * à 2 % — sur 265 cm, c'est 5,3 cm — donc arrondir la mesure à la
             * grille revenait à arrondir le verdict.
             *
             * `parseJumpCm` garde la valeur précédente en cas de doute : un
             * champ vidé par erreur ne doit pas écrire un 0, qui déclencherait
             * un ROUGE sur une faute de frappe.
             */
            onCommitText={(brut) => commitAttempt(i, brut)}
          />
        ))}
      </div>

      <button
        type="button"
        className={styles.readyValidate}
        onClick={() => onSave(draft)}
        disabled={best === null || baselineCm === null}
      >
        {result ? 'Mettre à jour le verdict' : 'Valider le readiness'}
      </button>

      {shown && (
        <div className={styles.verdict}>
          <span
            className={`${styles.verdictLevel} ${
              level === 'vert'
                ? styles.levelVert
                : level === 'orange'
                  ? styles.levelOrange
                  : styles.levelRouge
            }`}
          >
            {shown.level.toUpperCase()}
          </span>{' '}
          <span className="tnum">
            ({shown.pctDelta > 0 ? '+' : ''}
            {String(shown.pctDelta).replace('.', ',')} %)
          </span>
          <div style={{ marginTop: 6 }}>{shown.effect}</div>
          {!result && <div style={{ marginTop: 6, color: 'var(--ink-3)' }}>Pas encore validé.</div>}
        </div>
      )}
    </section>
  );
}
