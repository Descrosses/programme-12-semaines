import { useEffect, useRef, useState } from 'react';
import { compressPhoto, formatBytes, type CompressedPhoto } from '../media/photo';
import styles from './PhotoCapture.module.css';

/**
 * Bouton « prendre une photo ».
 *
 * `capture="environment"` demande à iOS d'ouvrir directement l'appareil photo
 * arrière plutôt que la pellicule. À savoir : une photo prise par ce chemin
 * n'est PAS ajoutée à la pellicule de l'iPhone — elle n'existe que dans
 * l'application. C'est voulu ici (c'est nous qui la stockons), mais c'est
 * exactement la raison pour laquelle la vidéo, elle, ne passe pas par un champ
 * de fichier : elle serait perdue.
 *
 * La compression tourne avant l'écriture en base, et l'utilisateur voit le
 * poids final : il faut qu'il puisse constater que ça reste petit.
 */
export function PhotoCapture({
  label,
  onCapture,
  variant = 'primary',
}: {
  label: string;
  onCapture: (photo: CompressedPhoto) => Promise<void> | void;
  variant?: 'primary' | 'secondary';
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handle(file: File) {
    setBusy(true);
    setError(null);
    try {
      await onCapture(await compressPhoto(file));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Photo impossible à enregistrer.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className={variant === 'primary' ? styles.primary : styles.secondary}
        onClick={() => input.current?.click()}
        disabled={busy}
      >
        {busy ? 'Compression…' : label}
      </button>
      {error && <p className={styles.error}>{error}</p>}
      <input
        ref={input}
        type="file"
        accept="image/*"
        capture="environment"
        className="visually-hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handle(f);
          // Remis à zéro, sinon reprendre deux fois la même photo ne déclenche
          // pas d'événement (la valeur du champ n'aurait pas changé).
          e.target.value = '';
        }}
      />
    </>
  );
}

/** Vignette d'une photo stockée, avec sa date et son poids. */
export function PhotoThumb({
  blob,
  caption,
  bytes,
}: {
  blob: Blob;
  caption: string;
  bytes?: number;
}) {
  const url = useObjectUrl(blob);
  return (
    <figure className={styles.thumb}>
      {url && <img src={url} alt={caption} className={styles.img} />}
      <figcaption className={styles.caption}>
        {caption}
        {bytes !== undefined && <span className={styles.size}> · {formatBytes(bytes)}</span>}
      </figcaption>
    </figure>
  );
}

/**
 * URL temporaire d'un blob, révoquée quand le blob change ou disparaît.
 *
 * Sans la révocation, faire défiler douze semaines de photos laisserait douze
 * images décodées en mémoire jusqu'au rechargement de la page.
 */
export function useObjectUrl(blob: Blob | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!blob) {
      setUrl(null);
      return;
    }
    const next = URL.createObjectURL(blob);
    setUrl(next);
    // La révocation est dans le nettoyage, donc elle a lieu que le composant
    // disparaisse ou que la photo change — jamais pendant un rendu abandonné.
    return () => URL.revokeObjectURL(next);
  }, [blob]);

  return url;
}
