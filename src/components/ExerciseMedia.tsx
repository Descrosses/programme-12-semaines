import { useEffect, useState } from 'react';
import { PhotoCapture, PhotoThumb } from './PhotoCapture';
import { humanDate } from '../engine/calendar';
import {
  deleteExerciseMedia,
  deleteExerciseReference,
  logVideo,
  mediaForExercise,
  referenceForExercise,
  saveExerciseMedia,
  saveExerciseReference,
  videoLogForExercise,
} from '../db/repo';
import type { ExerciseMediaRow, ExerciseReferenceRow, ExerciseVideoLogRow } from '../db/db';
import type { DayIndex } from '../data/types';
import styles from '../screens/Session.module.css';

export interface MediaContext {
  week: number;
  day: DayIndex;
  date: string;
}

/**
 * Documentation d'un mouvement : photo stockée, vidéo simplement notée.
 *
 * ── Pourquoi la vidéo ne passe PAS par un champ de fichier ──────────────────
 *
 * `<input type="file" accept="video/*" capture>` ouvre bien la caméra sur iOS,
 * mais la vidéo enregistrée par ce chemin n'est PAS ajoutée à la pellicule :
 * iOS la remet à la page web et l'oublie. Comme l'appli, elle, ne veut pas
 * stocker de vidéo (le stockage d'une PWA peut être vidé par le système), le
 * fichier serait perdu des deux côtés — le pire résultat possible.
 *
 * Le seul chemin qui met vraiment la vidéo dans la pellicule est l'application
 * Appareil photo d'iOS, qu'une page web ne peut pas lancer. Le bouton dit donc
 * quoi faire et enregistre la trace une fois que c'est fait. C'est exactement
 * ce que la trace était censée accompagner, sans le piège.
 *
 * ── Deux blocs, deux natures d'image ────────────────────────────────────────
 *
 * FICHE TECHNIQUE : une infographie d'exécution, la même partout. Elle vit
 * dans sa propre table, sans date, donc la poser une fois la fait apparaître
 * sur les dix occurrences du back squat des douze semaines.
 *
 * TA PROGRESSION : des photos de Guillaume à une séance précise, datées, pour
 * comparer son exécution dans le temps.
 *
 * Les deux se ressemblent à l'écran — ce sont deux images d'un même mouvement —
 * donc ils sont séparés par un titre, une couleur de liseré et un espacement
 * net. Sans ça, une infographie finirait dans l'historique de progression, ce
 * qui est exactement le défaut qu'on corrige.
 */
export function ExerciseMediaButton({
  exerciseId,
  exerciseName,
  context,
}: {
  exerciseId: string;
  exerciseName: string;
  context: MediaContext;
}) {
  const [open, setOpen] = useState(false);
  const [reference, setReference] = useState<ExerciseReferenceRow | null>(null);
  const [photos, setPhotos] = useState<ExerciseMediaRow[]>([]);
  const [videos, setVideos] = useState<ExerciseVideoLogRow[]>([]);
  const [compare, setCompare] = useState(false);

  async function reload() {
    const [p, v, r] = await Promise.all([
      mediaForExercise(exerciseId),
      videoLogForExercise(exerciseId),
      referenceForExercise(exerciseId),
    ]);
    setPhotos(p);
    setVideos(v);
    setReference(r ?? null);
  }

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exerciseId]);

  const todayPhoto = photos.find((p) => p.date === context.date);
  const todayVideo = videos.find((v) => v.date === context.date);
  const lastVideo = videos[videos.length - 1];

  /** Fiche technique : aucune semaine, aucun jour. C'est tout l'intérêt. */
  async function captureReference(b: {
    blob: Blob;
    bytes: number;
    width: number;
    height: number;
  }) {
    await saveExerciseReference({
      exerciseId,
      blob: b.blob,
      bytes: b.bytes,
      width: b.width,
      height: b.height,
      addedAt: context.date,
    });
    await reload();
  }

  async function capture(b: { blob: Blob; bytes: number; width: number; height: number }) {
    await saveExerciseMedia({
      exerciseId,
      week: context.week,
      day: context.day,
      date: context.date,
      blob: b.blob,
      bytes: b.bytes,
      width: b.width,
      height: b.height,
    });
    await reload();
  }

  return (
    <>
      <div className={styles.mediaRow}>
        <button
          type="button"
          className={styles.mediaToggle}
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          {open ? '× Fermer' : '+ Documenter'}
        </button>

        {/* Badges : ce qui existe déjà, sans rien charger. */}
        {reference && <span className={styles.mediaBadge}>📘 fiche</span>}
        {photos.length > 0 && (
          <span className={styles.mediaBadge}>
            📷 {photos.length} photo{photos.length > 1 ? 's' : ''}
          </span>
        )}
        {lastVideo && (
          <span className={styles.mediaBadge}>🎥 filmé le {humanDate(lastVideo.date)}</span>
        )}
      </div>

      {open && (
        <div className={styles.mediaPanel}>
          {/* --- 1. Fiche technique : hors du temps ------------------------- */}
          <section className={`${styles.mediaBlock} ${styles.mediaBlockReference}`}>
            <h4 className={styles.mediaBlockTitle}>📘 Fiche technique</h4>
            <p className={styles.mediaNote} style={{ marginTop: 4 }}>
              L’exécution du mouvement. Posée une fois, elle s’affiche sur{' '}
              <b>toutes les semaines</b> — rien à refaire.
            </p>
            {reference ? (
              <>
                <div style={{ marginTop: 10 }}>
                  <PhotoThumb
                    blob={reference.blob}
                    caption={`${exerciseName} — fiche ajoutée le ${humanDate(reference.addedAt)}`}
                    bytes={reference.bytes}
                  />
                </div>
                <PhotoCapture
                  label="Remplacer la fiche"
                  onCapture={captureReference}
                  variant="secondary"
                />
                <button
                  type="button"
                  className={styles.mediaAction}
                  style={{ color: 'var(--rouge)' }}
                  onClick={() =>
                    void (async () => {
                      if (reference.id !== undefined) await deleteExerciseReference(reference.id);
                      await reload();
                    })()
                  }
                >
                  Supprimer la fiche
                </button>
              </>
            ) : (
              <PhotoCapture label="Ajouter la fiche" onCapture={captureReference} variant="secondary" />
            )}
          </section>

          {/* --- 2. Ta progression : daté, séance par séance ---------------- */}
          <section className={`${styles.mediaBlock} ${styles.mediaBlockProgress}`}>
            <h4 className={styles.mediaBlockTitle}>
              📷 Ta progression — semaine {context.week}
            </h4>
            <p className={styles.mediaNote} style={{ marginTop: 4 }}>
              Ton exécution du jour, datée. C’est elle qu’on compare d’une semaine à l’autre.
            </p>
          {todayPhoto ? (
            <>
              <PhotoThumb
                blob={todayPhoto.blob}
                caption={`${exerciseName} — ${humanDate(todayPhoto.date)}`}
                bytes={todayPhoto.bytes}
              />
              <PhotoCapture label="Reprendre la photo" onCapture={capture} variant="secondary" />
              <button
                type="button"
                className={styles.mediaAction}
                style={{ color: 'var(--rouge)' }}
                onClick={() =>
                  void (async () => {
                    if (todayPhoto.id !== undefined) await deleteExerciseMedia(todayPhoto.id);
                    await reload();
                  })()
                }
              >
                Supprimer la photo du jour
              </button>
            </>
          ) : (
            <PhotoCapture label="Photo de l’exécution" onCapture={capture} />
          )}

          {/* --- Vidéo : une trace, pas un fichier --------------------------- */}
          {todayVideo ? (
            <p className={styles.mediaNote}>
              🎥 Vidéo notée pour aujourd’hui. Le fichier est dans ta pellicule, pas dans l’appli.
            </p>
          ) : (
            <>
              <button
                type="button"
                className={styles.mediaAction}
                onClick={() =>
                  void (async () => {
                    await logVideo({
                      exerciseId,
                      week: context.week,
                      day: context.day,
                      date: context.date,
                      note: '',
                    });
                    await reload();
                  })()
                }
              >
                🎥 J’ai filmé cette série
              </button>
              <p className={styles.mediaNote}>
                Filme avec l’application <b>Appareil photo</b> de l’iPhone : elle seule enregistre
                dans ta pellicule. Ce bouton note juste la date, pour retrouver la vidéo plus tard
                et savoir quand tu t’es filmé.
              </p>
            </>
          )}

          {/* --- Comparaison de deux dates ---------------------------------- */}
          {photos.length >= 2 && (
            <>
              <button
                type="button"
                className={styles.mediaAction}
                onClick={() => setCompare((v) => !v)}
                aria-expanded={compare}
              >
                {compare ? 'Masquer la comparaison' : `Comparer (${photos.length} photos)`}
              </button>
              {compare && (
                <div className={styles.mediaCompare}>
                  <PhotoThumb
                    blob={photos[0]!.blob}
                    caption={`S${photos[0]!.week} · ${humanDate(photos[0]!.date)}`}
                  />
                  <PhotoThumb
                    blob={photos[photos.length - 1]!.blob}
                    caption={`S${photos[photos.length - 1]!.week} · ${humanDate(photos[photos.length - 1]!.date)}`}
                  />
                </div>
              )}
            </>
          )}

          {videos.length > 1 && (
            <p className={styles.mediaNote}>
              Filmé {videos.length} fois : {videos.map((v) => humanDate(v.date)).join(', ')}.
            </p>
          )}
          </section>
        </div>
      )}
    </>
  );
}
