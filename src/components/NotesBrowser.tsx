import { useEffect, useState } from 'react';
import { EXERCISES } from '../data/exercises';
import { humanDate } from '../engine/calendar';
import { noteWeekLabel, notesByExercise } from '../engine/exerciseNotes';
import { allNotes } from '../db/repo';
import type { NoteRow } from '../db/db';
import styles from '../screens/Screens.module.css';

/**
 * Toutes les remarques, mouvement par mouvement.
 *
 * Ce que ça résout : une remarque n'était lisible que depuis la séance où le
 * mouvement revient. Pour relire ce qu'il avait noté sur le squat en semaine 1,
 * Guillaume devait ouvrir une séance de squat — donc attendre le lundi. Ici
 * tout est là, et les mouvements les plus commentés sont en tête : six
 * remarques en douze semaines sur le même exercice disent quelque chose.
 *
 * En lecture seule. Retirer une remarque se fait là où on l'a écrite, sous
 * l'exercice, avec sa confirmation — pas depuis un écran de relecture où un
 * appui malheureux effacerait une ligne qu'on venait chercher.
 */
export function NotesBrowser() {
  const [rows, setRows] = useState<NoteRow[] | null>(null);
  const [ouvert, setOuvert] = useState<string | null>(null);

  useEffect(() => {
    void (async () => setRows(await allNotes()))();
  }, []);

  if (rows === null) return <div className={styles.loading}>Chargement…</div>;

  const groupes = notesByExercise(rows as never);

  if (groupes.length === 0) {
    return (
      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Remarques</h2>
        <p className={styles.cardSub}>
          Rien de noté pour l’instant. Les remarques s’écrivent sous chaque exercice pendant la
          séance, et plus rien ne les écrase.
        </p>
      </section>
    );
  }

  const total = groupes.reduce((n, g) => n + g.notes.length, 0);

  return (
    <>
      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Remarques</h2>
        <p className={styles.cardSub}>
          {total} remarque{total > 1 ? 's' : ''} sur {groupes.length} mouvement
          {groupes.length > 1 ? 's' : ''}. Les plus commentés d’abord, et dans chacun la plus
          récente en tête.
        </p>
      </section>

      {groupes.map((g) => {
        const cle = g.exerciseId ?? '__seance__';
        const nom =
          g.exerciseId === null
            ? 'Remarques de séance'
            : (EXERCISES[g.exerciseId]?.name ?? g.exerciseId);
        const estOuvert = ouvert === cle;
        const visibles = estOuvert ? g.notes : g.notes.slice(0, 2);

        return (
          <section key={cle} className={styles.card}>
            <button
              type="button"
              className={styles.noteGroupHead}
              onClick={() => setOuvert(estOuvert ? null : cle)}
              aria-expanded={estOuvert}
            >
              <span className={styles.noteGroupName}>{nom}</span>
              <span className={styles.noteGroupCount}>
                {g.notes.length} remarque{g.notes.length > 1 ? 's' : ''}
                {g.notes.length > 2 && (estOuvert ? ' ▲' : ' ▼')}
              </span>
            </button>

            <ul className={styles.noteList}>
              {visibles.map((n) => (
                <li key={n.id ?? `${n.week}-${n.day}-${n.at}`} className={styles.noteItem}>
                  <span className={styles.noteWhen}>
                    {noteWeekLabel(n)}
                    {n.date ? ` · ${humanDate(n.date)}` : ''}
                  </span>
                  <span className={styles.noteText}>{n.text}</span>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </>
  );
}
