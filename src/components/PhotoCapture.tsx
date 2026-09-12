import { useEffect, useRef, useState } from 'react';
import { compressPhoto, formatBytes, type CompressedPhoto } from '../media/photo';
import styles from './PhotoCapture.module.css';

/**
 * Deux façons d'apporter une photo, un seul chemin pour la traiter.
 *
 * `capture="environment"` ouvre directement l'appareil photo arrière. C'est le
 * geste le plus rapide en salle, mais il a une conséquence qu'il faut connaître :
 * une photo prise par ce chemin n'est PAS ajoutée à la pellicule de l'iPhone,
 * elle n'existe que dans l'application. Sans le second bouton, impossible non
 * plus de reprendre une photo déjà faite avec l'app Appareil photo.
 *
 * D'où deux boutons et deux champs de fichier — le second sans `capture`, ce
 * qui ouvre la photothèque — mais une seule fonction derrière : `handle`
 * compresse et redimensionne de la même façon, quelle que soit la source. Rien
 * n'est dupliqué, et la taille en base ne dépend pas du bouton utilisé.
 *
 * Effet de bord utile de ce passage obligé : une photo HEIC prise par l'app
 * Appareil photo ressort en JPEG, lisible partout, y compris dans le fichier
 * d'export.
 */
export function PhotoCapture({
  label,
  onCapture,
  variant = 'primary',
}: {
  /** Libellé du bouton appareil photo. Celui de la pellicule est fixe. */
  label: string;
  onCapture: (photo: CompressedPhoto) => Promise<void> | void;
  variant?: 'primary' | 'secondary';
}) {
  const camera = useRef<HTMLInputElement>(null);
  const library = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Le traitement, commun aux deux sources. */
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

  /*
   * La valeur du champ est remise à zéro après chaque choix : sans ça,
   * reprendre exactement le même fichier ne déclencherait aucun événement,
   * puisque la valeur n'aurait pas changé.
   */
  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) void handle(f);
    e.target.value = '';
  };

  return (
    <>
      <button
        type="button"
        className={variant === 'primary' ? styles.primary : styles.secondary}
        onClick={() => camera.current?.click()}
        disabled={busy}
      >
        {busy ? 'Compression…' : `📷 ${label}`}
      </button>
      <button
        type="button"
        className={styles.secondary}
        onClick={() => library.current?.click()}
        disabled={busy}
      >
        🖼️ Choisir depuis la pellicule
      </button>
      {error && <p className={styles.error}>{error}</p>}

      <input
        ref={camera}
        type="file"
        accept="image/*"
        capture="environment"
        className="visually-hidden"
        aria-label={`${label} — appareil photo`}
        onChange={onPick}
      />
      <input
        ref={library}
        type="file"
        accept="image/*"
        className="visually-hidden"
        aria-label={`${label} — pellicule`}
        onChange={onPick}
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
