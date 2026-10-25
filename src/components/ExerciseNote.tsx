import { useCallback, useEffect, useState } from 'react';
import { humanDate } from '../engine/calendar';
import { noteHistory, noteWeekLabel } from '../engine/exerciseNotes';
import { addNote, deleteNote, noteDraft, notesFor, saveNoteDraft, sessionNotes } from '../db/repo';
import { SESSION_NOTE_SLOT, type NoteRow } from '../db/db';
import type { DayIndex } from '../data/types';
import styles from '../screens/Session.module.css';

export interface NoteContext {
  week: number;
  day: DayIndex;
  /**
   * `YYYY-MM-DD` de la séance, ou chaîne vide tant que le programme n'a pas de
   * date de début. La remarque se range sous (exercice, semaine, jour) : la
   * date ne sert qu'à l'afficher à la relecture, elle n'est pas une clé.
   */
  date: string;
}

/** Combien de remarques s'affichent avant qu'il faille déplier. */
const VISIBLES = 2;

/**
 * Remarques sur UN mouvement — ou sur la séance entière, quand `exerciseId`
 * vaut `null`.
 *
 * ── Ce qui a changé, et pourquoi ────────────────────────────────────────────
 *
 * Avant, une remarque était un CHAMP : un texte par mouvement et par séance,
 * corrigé au fil de la frappe. Ça décidait aussi qu'un mouvement ne reçoit
 * qu'une remarque par séance. Noter « épaule gauche tire » à la deuxième série
 * puis « c'est passé en 3e » à la quatrième écrasait la première — or c'est
 * leur succession qui dit quelque chose.
 *
 * Une remarque est maintenant une LIGNE qu'on ajoute. Rien ne s'écrase.
 *
 * ── Le compromis du bouton ──────────────────────────────────────────────────
 *
 * La règle de l'appli est qu'une saisie n'attend jamais. Mais une table
 * append-only ne peut pas recevoir chaque frappe, sinon elle empile une ligne
 * par caractère. Donc : le champ est un BROUILLON, écrit en base à chaque
 * frappe, et le bouton « Ajouter » en fait une ligne d'historique.
 *
 * Un téléphone verrouillé au milieu d'une phrase ne perd donc rien. Et une
 * phrase laissée dans le champ est ajoutée automatiquement au moment où la
 * séance est marquée terminée (`commitAllDrafts`), ce qui ferme le seul trou
 * que le bouton ouvrait.
 *
 * ── L'historique est VISIBLE ────────────────────────────────────────────────
 *
 * Les deux plus récentes sont affichées, pas cachées derrière un badge : si
 * l'épaule a tiré en semaine 5, il faut le lire avant de charger la barre en
 * semaine 6, pas après avoir pensé à appuyer sur un bouton. Le reste se
 * déplie.
 */
export function ExerciseNote({
  exerciseId,
  context,
  label,
  placeholder,
}: {
  /** `null` = remarque de séance, celle du bas de l'écran. */
  exerciseId: string | null;
  context: NoteContext;
  label?: string;
  placeholder?: string;
}) {
  const slot = exerciseId ?? SESSION_NOTE_SLOT;
  const [rows, setRows] = useState<NoteRow[]>([]);
  const [text, setText] = useState('');
  const [charge, setCharge] = useState(false);
  const [deplie, setDeplie] = useState(false);
  const [aSupprimer, setASupprimer] = useState<number | null>(null);

  const relire = useCallback(async () => {
    const r = exerciseId === null ? await sessionNotes() : await notesFor(exerciseId);
    setRows(r);
  }, [exerciseId]);

  useEffect(() => {
    let vivant = true;
    void (async () => {
      const [r, brouillon] = await Promise.all([
        exerciseId === null ? sessionNotes() : notesFor(exerciseId),
        noteDraft(slot, context.week, context.day),
      ]);
      if (!vivant) return;
      setRows(r);
      setText(brouillon?.text ?? '');
      setCharge(true);
    })();
    return () => {
      vivant = false;
    };
  }, [exerciseId, slot, context.week, context.day]);

  const historique = noteHistory(rows as never, exerciseId);
  const montrees = deplie ? historique : historique.slice(0, VISIBLES);

  async function ecrire(valeur: string) {
    setText(valeur);
    await saveNoteDraft({ ...context, slot, text: valeur });
  }

  async function ajouter() {
    const ajoutee = await addNote({ ...context, exerciseId, text });
    if (!ajoutee) return;
    await saveNoteDraft({ ...context, slot, text: '' });
    setText('');
    await relire();
  }

  async function supprimer(id: number) {
    await deleteNote(id);
    setASupprimer(null);
    await relire();
  }

  /*
   * Tant que la lecture n'est pas revenue, on n'affiche pas un champ vide :
   * il donnerait à croire qu'il n'y a rien d'écrit, et une frappe à cet
   * instant écraserait le brouillon qu'on est en train de charger.
   */
  if (!charge) return null;

  const aEcrire = text.trim() !== '';

  return (
    <section className={styles.exNote}>
      <div className={styles.exNoteHead}>
        <label htmlFor={`note-${slot}`} className={styles.exNoteLabel}>
          📝 {label ?? 'Remarque'} <span className={styles.exNoteOptional}>— facultatif</span>
        </label>
        {historique.length > VISIBLES && (
          <button
            type="button"
            className={styles.exNoteBadge}
            onClick={() => setDeplie((v) => !v)}
            aria-expanded={deplie}
          >
            {deplie ? '▲ masquer' : `▼ ${historique.length} au total`}
          </button>
        )}
      </div>

      {/*
        L'historique AU-DESSUS du champ : on relit ce qu'on avait noté, puis on
        écrit. Du plus récent au plus ancien, chacune avec sa semaine.
      */}
      {montrees.length > 0 && (
        <ul className={styles.exNotePast}>
          {montrees.map((n) => (
            <li key={n.id ?? `${n.week}-${n.day}-${n.at}`}>
              <span className={styles.exNotePastWhen}>
                {noteWeekLabel(n)}
                {n.date ? ` · ${humanDate(n.date)}` : ''}
              </span>{' '}
              {n.text}
              {n.id !== undefined &&
                (aSupprimer === n.id ? (
                  <span className={styles.exNoteConfirm}>
                    <button
                      type="button"
                      className={styles.exNoteDelYes}
                      onClick={() => void supprimer(n.id!)}
                    >
                      Supprimer
                    </button>
                    <button
                      type="button"
                      className={styles.exNoteDelNo}
                      onClick={() => setASupprimer(null)}
                    >
                      Garder
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    className={styles.exNoteDel}
                    onClick={() => setASupprimer(n.id!)}
                    aria-label={`Retirer la remarque de ${noteWeekLabel(n)}`}
                  >
                    ✕
                  </button>
                ))}
            </li>
          ))}
        </ul>
      )}

      <textarea
        id={`note-${slot}`}
        className={styles.exNoteField}
        rows={2}
        value={text}
        placeholder={placeholder ?? 'Anormalement lourd ? léger ? technique en place ?'}
        onChange={(e) => void ecrire(e.target.value)}
      />

      {/*
        Le bouton n'apparaît que s'il y a quelque chose à ajouter : un bouton
        grisé en permanence sous chacun des neuf exercices d'une séance est du
        bruit, et il allonge l'écran sans rien permettre.
      */}
      {aEcrire && (
        <button type="button" className={styles.exNoteAdd} onClick={() => void ajouter()}>
          ＋ Ajouter cette remarque
        </button>
      )}
    </section>
  );
}
