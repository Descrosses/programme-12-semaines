import { useEffect, useState } from 'react';
import { PhotoCapture, PhotoThumb } from './PhotoCapture';
import { humanDate } from '../engine/calendar';
import {
  deleteExerciseMedia,
  logVideo,
  mediaForExercise,
  saveExerciseMedia,
  videoLogForExercise,
} from '../db/repo';
import type { ExerciseMediaRow, ExerciseVideoLogRow } from '../db/db';
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
  const [photos, setPhotos] = useState<ExerciseMediaRow[]>([]);
  const [videos, setVideos] = useState<ExerciseVideoLogRow[]>([]);
  const [compare, setCompare] = useState(false);

  async function reload() {
    const [p, v] = await Promise.all([
      mediaForExercise(exerciseId),
      videoLogForExercise(exerciseId),
    ]);
    setPhotos(p);
    setVideos(v);
  }

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exerciseId]);

  const todayPhoto = photos.find((p) => p.date === context.date);
  const todayVideo = videos.find((v) => v.date === context.date);
  const lastVideo = videos[videos.length - 1];

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
          {/* --- Photo ------------------------------------------------------ */}
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
        </div>
      )}
    </>
  );
}
