import { useEffect, useState } from 'react';
import { PhotoCapture, PhotoThumb, useObjectUrl } from './PhotoCapture';
import { currentWeek, dateFor, humanDate } from '../engine/calendar';
import { fr } from '../engine/format';
import { windowAverage, type Measurement } from '../engine/nutrition';
import { formatBytes } from '../media/photo';
import {
  allMeasurements,
  allPhotos,
  deletePhoto,
  getSettingsRow,
  photoUsage,
  savePhoto,
  type PhotoUsage,
} from '../db/repo';
import type { ProgressPhotoRow } from '../db/db';
import type { WeekIndex } from '../data/types';
import styles from '../screens/Screens.module.css';

/**
 * Suivi visuel — une photo par semaine, et la comparaison de deux d'entre elles.
 *
 * Vit dans l'écran Progression et pas dans un onglet à part : c'est la même
 * question que les courbes (« est-ce que ça bouge ? »), répondue par l'œil
 * plutôt que par un chiffre. Et la barre de navigation compte déjà six onglets,
 * un septième les réduirait sous la largeur du pouce.
 *
 * Le poids n'est pas re-saisi ici : il vient du journal de l'onglet Nutrition,
 * en moyenne 7 jours à la date de la photo. Une photo et une pesée isolée se
 * contrediraient un jour sur deux ; une photo et une moyenne, non.
 */
export function VisualTracking() {
  const [photos, setPhotos] = useState<ProgressPhotoRow[] | null>(null);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [startDate, setStartDate] = useState('');
  const [usage, setUsage] = useState<PhotoUsage | null>(null);
  const [a, setA] = useState<number | null>(null);
  const [b, setB] = useState<number | null>(null);

  const todayIso = new Date().toISOString().slice(0, 10);

  async function reload() {
    const [rows, settings, m] = await Promise.all([
      allPhotos(),
      getSettingsRow(),
      allMeasurements(),
    ]);
    setPhotos(rows);
    setStartDate(settings.startDate);
    setMeasurements(m.map((r) => ({ date: r.date, weightKg: r.weightKg, waistCm: r.waistCm })));
    setUsage(await photoUsage());
    // Par défaut on compare la première et la dernière : c'est la comparaison
    // qu'on veut voir, pas deux semaines voisines qui se ressemblent.
    if (rows.length >= 2) {
      setA((prev) => prev ?? rows[0]!.week);
      setB((prev) => prev ?? rows[rows.length - 1]!.week);
    }
  }

  useEffect(() => {
    void reload();
  }, []);

  if (!photos) return <div className={styles.loading}>Chargement…</div>;

  const week = currentWeek(startDate, todayIso);
  const thisWeekPhoto = week === null ? undefined : photos.find((p) => p.week === week);
  const photoA = photos.find((p) => p.week === a);
  const photoB = photos.find((p) => p.week === b);

  /** Moyenne de poids à la date d'une photo — le chiffre qui va avec l'image. */
  const weightAt = (date: string) => windowAverage(measurements, date, 7);

  const caption = (p: ProgressPhotoRow) => {
    const kg = weightAt(p.date);
    return `S${p.week} · ${humanDate(p.date)}${kg === null ? '' : ` · ${fr(kg)} kg`}`;
  };

  async function capture(blobInfo: { blob: Blob; bytes: number; width: number; height: number }) {
    if (week === null) return;
    await savePhoto({
      week,
      date: todayIso,
      blob: blobInfo.blob,
      bytes: blobInfo.bytes,
      width: blobInfo.width,
      height: blobInfo.height,
    });
    await reload();
  }

  return (
    <>
      <section className={styles.card}>
        <h2 className={styles.cardTitle}>
          {week === null ? 'Photo de la semaine' : `Photo — semaine ${week}`}
        </h2>
        {week === null ? (
          <p className={styles.cardSub}>
            Renseigne d’abord la date de début du programme dans Réglages : c’est elle qui dit à
            quelle semaine rattacher une photo.
          </p>
        ) : (
          <>
            <p className={styles.cardSub}>
              Même endroit, même lumière, même pose, idéalement le même jour de la semaine. C’est ce
              qui rend deux photos comparables — exactement la règle du combine.
            </p>
            {thisWeekPhoto ? (
              <>
                <div style={{ marginTop: 12 }}>
                  <PhotoThumb
                    blob={thisWeekPhoto.blob}
                    caption={caption(thisWeekPhoto)}
                    bytes={thisWeekPhoto.bytes}
                  />
                </div>
                <PhotoCapture label="Reprendre la photo" onCapture={capture} variant="secondary" />
                <button
                  type="button"
                  className={styles.secondary}
                  style={{ width: '100%', margin: '10px 0 0', color: 'var(--rouge)' }}
                  onClick={() =>
                    void (async () => {
                      if (thisWeekPhoto.id !== undefined) await deletePhoto(thisWeekPhoto.id);
                      await reload();
                    })()
                  }
                >
                  Supprimer cette photo
                </button>
              </>
            ) : (
              <>
                <PhotoCapture label="Prendre la photo de la semaine" onCapture={capture} />
                {startDate && (
                  <p className={styles.fieldHint}>
                    Semaine {week}, à partir du {humanDate(dateFor(startDate, week as WeekIndex, 0))}.
                  </p>
                )}
              </>
            )}
          </>
        )}
      </section>

      {/* --- Comparaison ---------------------------------------------------- */}
      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Comparaison</h2>
        {photos.length < 2 ? (
          <p className={styles.cardSub}>
            Il faut au moins deux photos. La première est celle qui compte le plus : prends-la avant
            la semaine 1, elle sera ta référence pendant douze semaines.
          </p>
        ) : (
          <>
            <p className={styles.cardSub}>
              Deux semaines côte à côte. Le poids affiché est ta moyenne 7 jours à la date de la
              photo.
            </p>
            <div className={styles.compareSelects}>
              <label className={styles.compareField}>
                <span className={styles.label}>Avant</span>
                <select
                  className={styles.input}
                  value={a ?? ''}
                  onChange={(e) => setA(Number(e.target.value))}
                >
                  {photos.map((p) => (
                    <option key={p.week} value={p.week}>
                      Semaine {p.week}
                    </option>
                  ))}
                </select>
              </label>
              <label className={styles.compareField}>
                <span className={styles.label}>Après</span>
                <select
                  className={styles.input}
                  value={b ?? ''}
                  onChange={(e) => setB(Number(e.target.value))}
                >
                  {photos.map((p) => (
                    <option key={p.week} value={p.week}>
                      Semaine {p.week}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className={styles.comparePair}>
              {photoA && <PhotoThumb blob={photoA.blob} caption={caption(photoA)} />}
              {photoB && <PhotoThumb blob={photoB.blob} caption={caption(photoB)} />}
            </div>
            {photoA && photoB && <Delta a={photoA} b={photoB} weightAt={weightAt} />}
          </>
        )}
      </section>

      {usage && usage.count > 0 && <StorageCard usage={usage} />}
    </>
  );
}

/** Ce que les deux photos disent en chiffres, pour ne pas juger qu'à l'œil. */
function Delta({
  a,
  b,
  weightAt,
}: {
  a: ProgressPhotoRow;
  b: ProgressPhotoRow;
  weightAt: (date: string) => number | null;
}) {
  const ka = weightAt(a.date);
  const kb = weightAt(b.date);
  const weeks = b.week - a.week;
  if (ka === null || kb === null || weeks === 0) return null;
  const delta = Math.round((kb - ka) * 10) / 10;
  const perWeek = Math.round((delta / weeks) * 100) / 100;
  return (
    <p className={styles.fieldHint}>
      {weeks > 0 ? `${weeks} semaines` : `${-weeks} semaines`} d’écart ·{' '}
      <b>
        {delta > 0 ? '+' : ''}
        {fr(delta)} kg
      </b>{' '}
      au total, soit {perWeek > 0 ? '+' : ''}
      {fr(perWeek)} kg par semaine.
    </p>
  );
}

/**
 * Encombrement des photos.
 *
 * Affiché dès la première photo et pas seulement quand ça déborde : sur iPhone,
 * le stockage d'une PWA peut être vidé par le système sous pression d'espace.
 * Savoir où on en est, c'est pouvoir exporter à temps.
 */
export function StorageCard({ usage }: { usage: PhotoUsage }) {
  const mo = usage.bytes / (1024 * 1024);
  const tendu = mo > 40;
  return (
    <section className={styles.card}>
      <h2 className={styles.cardTitle}>Place occupée</h2>
      <p className={styles.cardSub}>
        {usage.count} photo{usage.count > 1 ? 's' : ''} · <b>{formatBytes(usage.bytes)}</b>
        {usage.quotaBytes !== null &&
          ` · le navigateur t’accorde ${formatBytes(usage.quotaBytes)} sur ce téléphone`}
        .
      </p>
      <p className={`${styles.fieldHint} ${tendu ? styles.hintWarn : ''}`}>
        {tendu
          ? 'Au-delà de 40 Mo, iOS peut vider le stockage de l’application si la place manque sur le téléphone. Exporte tes photos depuis Réglages, et supprime celles des exercices que tu n’utilises plus pour comparer.'
          : 'iOS peut vider le stockage d’une application web quand la place manque. Exporte tes photos de temps en temps depuis Réglages : c’est la seule copie qui survit à ça.'}
      </p>
    </section>
  );
}

export { useObjectUrl };
