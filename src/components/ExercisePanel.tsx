import { useMemo, useState } from 'react';
import { EXERCISES, EXERCISE_IDS } from '../data/exercises';
import {
  ADD_DEFAULTS,
  exerciseChoices,
  freeId,
  matchChoices,
  specFormat,
  type CustomSpec,
} from '../engine/customExercise';
import { KG_MAX, KG_MIN } from '../engine/loadEntry';
import { restLabel } from '../engine/format';
import { Stepper, stepValue } from './Stepper';
import styles from '../screens/Session.module.css';

/** Ce que le panneau a besoin de savoir des exercices déjà utilisés. */
export interface UsedExercise {
  exerciseId: string;
  name: string;
  at: number;
}

/**
 * Le panneau de saisie, commun au remplacement et à l'ajout.
 *
 * Un seul composant pour les deux, parce que c'est le même geste : choisir un
 * mouvement, poser un format. Ce qui change est le titre, les valeurs
 * d'ouverture, et ce qu'on en fait après — donc trois paramètres, pas deux
 * écrans.
 *
 * ── Ce que le panneau ne fait pas ───────────────────────────────────────────
 *
 * Il ne modifie pas le programme, et il ne touche à rien avant qu'on valide.
 * Tant que « Enregistrer » n'est pas pressé, la séance affichée est intacte.
 *
 * ── Deux façons de choisir ──────────────────────────────────────────────────
 *
 * Une liste — les exercices déjà utilisés en tête, puis le catalogue du
 * programme — et un champ libre. Le champ libre n'est pas un repli de
 * deuxième classe : la moitié des machines d'une salle n'est pas dans le
 * programme, et obliger à choisir une entrée approchante fabriquerait un
 * historique faux.
 */
export function ExercisePanel({
  titre,
  sousTitre,
  initial,
  used,
  onCancel,
  onSave,
}: {
  titre: string;
  sousTitre?: string;
  /** Valeurs d'ouverture : celles de l'exercice d'origine, ou celles d'un ajout. */
  initial?: Partial<CustomSpec>;
  used: UsedExercise[];
  onCancel: () => void;
  onSave: (spec: CustomSpec) => void;
}) {
  const choix = useMemo(
    () =>
      exerciseChoices(
        EXERCISE_IDS.map((id) => ({ id, name: EXERCISES[id]!.name })),
        used,
      ),
    [used],
  );

  const [recherche, setRecherche] = useState('');
  const [choisi, setChoisi] = useState<{ exerciseId: string; name: string } | null>(null);
  const [sets, setSets] = useState(initial?.sets ?? ADD_DEFAULTS.sets);
  const [reps, setReps] = useState(initial?.reps ?? ADD_DEFAULTS.reps);
  const [kg, setKg] = useState<number | null>(initial?.kg ?? ADD_DEFAULTS.kg);
  const [restSec, setRestSec] = useState(initial?.restSec ?? ADD_DEFAULTS.restSec);

  const filtres = matchChoices(choix, recherche).slice(0, 12);
  /*
   * Le nom tapé devient une proposition dès qu'aucune entrée exacte ne lui
   * correspond. Pas de bouton « nom libre » séparé : on tape, et si ça
   * n'existe pas, on prend ce qu'on a tapé.
   */
  const nomTape = recherche.trim();
  const exact = filtres.some((c) => c.name.toLowerCase() === nomTape.toLowerCase());
  const libre = nomTape.length >= 2 && !exact;

  const spec: CustomSpec | null = choisi
    ? { exerciseId: choisi.exerciseId, name: choisi.name, sets, reps, kg, restSec }
    : null;

  return (
    <div className={styles.panel} role="dialog" aria-label={titre}>
      <div className={styles.panelHead}>
        <div>
          <div className={styles.panelTitle}>{titre}</div>
          {sousTitre && <div className={styles.panelSub}>{sousTitre}</div>}
        </div>
        <button type="button" className={styles.panelClose} onClick={onCancel}>
          Annuler
        </button>
      </div>

      {choisi === null ? (
        <>
          <input
            type="text"
            className={styles.panelSearch}
            value={recherche}
            placeholder="Chercher, ou taper un nom"
            onChange={(e) => setRecherche(e.target.value)}
            autoComplete="off"
          />

          <ul className={styles.panelList}>
            {libre && (
              <li>
                <button
                  type="button"
                  className={`${styles.panelChoice} ${styles.panelChoiceFree}`}
                  onClick={() => setChoisi({ exerciseId: freeId(nomTape), name: nomTape })}
                >
                  <span className={styles.panelChoiceName}>« {nomTape} »</span>
                  <span className={styles.panelChoiceTag}>nom libre</span>
                </button>
              </li>
            )}
            {filtres.map((c) => (
              <li key={c.exerciseId}>
                <button
                  type="button"
                  className={styles.panelChoice}
                  onClick={() => setChoisi({ exerciseId: c.exerciseId, name: c.name })}
                >
                  <span className={styles.panelChoiceName}>{c.name}</span>
                  {c.source === 'historique' && (
                    <span className={styles.panelChoiceTag}>déjà utilisé</span>
                  )}
                </button>
              </li>
            ))}
            {filtres.length === 0 && !libre && (
              <li className={styles.panelEmpty}>
                Rien à ce nom. Tape au moins deux lettres pour l’ajouter tel quel.
              </li>
            )}
          </ul>
        </>
      ) : (
        <>
          <button type="button" className={styles.panelPicked} onClick={() => setChoisi(null)}>
            <span className={styles.panelPickedName}>{choisi.name}</span>
            <span className={styles.panelPickedChange}>changer</span>
          </button>

          <div className={styles.panelSteppers}>
            <Stepper
              label="Séries"
              value={sets}
              step={1}
              min={1}
              max={10}
              onStep={(d) => setSets((v) => stepValue(v, d, 1, 10))}
            />
            <Stepper
              label="Reps"
              value={reps}
              step={1}
              min={1}
              max={60}
              onStep={(d) => setReps((v) => stepValue(v, d, 1, 60))}
            />
            <Stepper
              label="Charge"
              value={kg}
              emptyLabel="aucune"
              step={2.5}
              min={KG_MIN}
              max={KG_MAX}
              unit="kg"
              onStep={(d) => setKg((v) => stepValue(v ?? 0, d, KG_MIN, KG_MAX))}
            />
            <Stepper
              label="Repos"
              value={restSec}
              step={15}
              min={0}
              max={360}
              unit="s"
              onStep={(d) => setRestSec((v) => stepValue(v, d, 0, 360))}
            />
          </div>

          <div className={styles.panelRecap}>
            <b>{choisi.name}</b> — {spec ? specFormat(spec) : ''} · repos {restLabel(restSec)}
          </div>

          <button type="button" className={styles.panelSave} onClick={() => spec && onSave(spec)}>
            Enregistrer
          </button>
        </>
      )}
    </div>
  );
}
