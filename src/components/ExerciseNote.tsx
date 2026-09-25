import { useEffect, useState } from 'react';
import { humanDate } from '../engine/calendar';
import { noteBadgeLabel, pastNotes } from '../engine/exerciseNotes';
import { notesForExercise, saveExerciseNote } from '../db/repo';
import type { ExerciseNoteRow } from '../db/db';
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

/**
 * Remarque libre sur UN exercice, ce jour-là.
 *
 * Ce que ça résout : la remarque de fin de séance parle de la séance entière.
 * Quand le squat de la semaine 1 s'est senti anormalement lourd, ça se note
 * sous le squat, pas dans un champ global relu trois semaines plus tard sans
 * savoir de quel mouvement il parlait. Les deux coexistent, sans fusionner.
 *
 * Trois règles de comportement :
 *
 *   FACULTATIF — rien n'est requis, aucune validation de série ne l'attend, et
 *   le champ laissé vide n'écrit rien du tout. C'est un champ pour les fois où
 *   il y a quelque chose à dire, pas une case à remplir neuf fois par séance.
 *
 *   ÉCRIT TOUT DE SUITE — à chaque frappe, comme le reste de l'appli. Pas de
 *   bouton « enregistrer » : une saisie en attente est une saisie perdue le
 *   jour où le téléphone se verrouille entre deux séries.
 *
 *   RELU PLUS TARD — si ce mouvement a déjà reçu une remarque une semaine
 *   précédente, un badge le dit et le texte se déplie. Même principe que le
 *   « 🎥 filmé le … » des vidéos : l'information vient à Guillaume, il n'a pas
 *   à aller la chercher.
 */
export function ExerciseNote({
  exerciseId,
  context,
}: {
  exerciseId: string;
  context: NoteContext;
}) {
  const [rows, setRows] = useState<ExerciseNoteRow[]>([]);
  const [text, setText] = useState('');
  const [charge, setCharge] = useState(false);
  const [ouvertes, setOuvertes] = useState(false);

  useEffect(() => {
    let vivant = true;
    void (async () => {
      const r = await notesForExercise(exerciseId);
      if (!vivant) return;
      setRows(r);
      const dujour = r.find((x) => x.week === context.week && x.day === context.day);
      setText(dujour?.text ?? '');
      setCharge(true);
    })();
    return () => {
      vivant = false;
    };
  }, [exerciseId, context.week, context.day]);

  const anciennes = pastNotes(rows, context);

  async function ecrire(valeur: string) {
    setText(valeur);
    await saveExerciseNote({ ...context, exerciseId, text: valeur });
  }

  /*
   * Tant que la lecture n'est pas revenue, on n'affiche pas un champ vide :
   * il donnerait à croire qu'il n'y a rien d'écrit, et une frappe à cet
   * instant écraserait la remarque qu'on est en train de charger.
   */
  if (!charge) return null;

  return (
    <section className={styles.exNote}>
      <div className={styles.exNoteHead}>
        <label htmlFor={`note-${exerciseId}`} className={styles.exNoteLabel}>
          📝 Remarque <span className={styles.exNoteOptional}>— facultatif</span>
        </label>
        {anciennes.length > 0 && (
          <button
            type="button"
            className={styles.exNoteBadge}
            onClick={() => setOuvertes((v) => !v)}
            aria-expanded={ouvertes}
          >
            {ouvertes ? '▲ masquer' : `📝 ${noteBadgeLabel(anciennes.length)}`}
          </button>
        )}
      </div>

      {/*
        Les remarques d'avant, dépliées à la demande. Au-dessus du champ et non
        dessous : on relit ce qu'on avait noté, puis on écrit.
      */}
      {ouvertes && anciennes.length > 0 && (
        <ul className={styles.exNotePast}>
          {anciennes.map((n) => (
            <li key={n.id ?? `${n.week}-${n.day}`}>
              <span className={styles.exNotePastWhen}>
                S{n.week}
                {n.date ? ` · ${humanDate(n.date)}` : ''}
              </span>{' '}
              {n.text}
            </li>
          ))}
        </ul>
      )}

      <textarea
        id={`note-${exerciseId}`}
        className={styles.exNoteField}
        rows={2}
        value={text}
        placeholder="Anormalement lourd ? léger ? technique en place ?"
        onChange={(e) => void ecrire(e.target.value)}
      />
    </section>
  );
}
