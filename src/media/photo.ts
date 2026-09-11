/**
 * Compression des photos, avant stockage.
 *
 * Une photo d'iPhone brute pèse 2 à 4 Mo. Douze semaines de suivi plus quelques
 * photos d'exécution par séance, et on dépasse le gigaoctet — un volume que le
 * navigateur d'un téléphone n'a aucune raison de garder. On redimensionne et on
 * recompresse donc AVANT d'écrire, jamais après.
 *
 * Un seul module pour les deux usages (photo hebdomadaire et photo d'exercice) :
 * si un jour la cible de taille change, elle change à un seul endroit.
 */

export const PHOTO_LIMITS = {
  /** Largeur maximale. 1280 px suffit largement pour comparer deux silhouettes. */
  maxWidth: 1280,
  /** Qualité JPEG de départ. */
  quality: 0.7,
  /**
   * Taille visée. Au-delà, on relance la compression un cran plus bas : une
   * photo de 800 Ko n'apprend rien de plus qu'une de 250 Ko sur un écran de
   * téléphone, mais elle remplit le stockage trois fois plus vite.
   */
  targetBytes: 300 * 1024,
  /** Paliers de repli, du meilleur au plus économe. */
  fallbackQualities: [0.6, 0.5, 0.42] as const,
} as const;

export interface CompressedPhoto {
  blob: Blob;
  bytes: number;
  width: number;
  height: number;
}

/**
 * Dimensions après redimensionnement, en gardant les proportions.
 *
 * Une image déjà plus petite que la limite n'est jamais agrandie : agrandir
 * n'ajoute aucune information et ne fait que gonfler le fichier.
 */
export function fitWithin(
  width: number,
  height: number,
  maxWidth = PHOTO_LIMITS.maxWidth,
): { width: number; height: number } {
  if (width <= 0 || height <= 0) return { width: 0, height: 0 };
  if (width <= maxWidth) return { width: Math.round(width), height: Math.round(height) };
  const ratio = maxWidth / width;
  return { width: maxWidth, height: Math.max(1, Math.round(height * ratio)) };
}

/** « 248 Ko », « 1,4 Mo » — pour dire l'encombrement sans faire peur. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(Math.round((bytes / (1024 * 1024)) * 10) / 10).toString().replace('.', ',')} Mo`;
}

/**
 * Charge le fichier en respectant l'orientation EXIF.
 *
 * Une photo prise en portrait sur un iPhone est enregistrée en paysage avec un
 * drapeau de rotation. `createImageBitmap` avec `imageOrientation: 'from-image'`
 * applique ce drapeau ; sans lui, toutes les photos verticales arriveraient
 * couchées. Le repli par `<img>` sert aux navigateurs qui n'ont pas l'option —
 * eux appliquent l'orientation au décodage.
 */
async function decode(file: Blob): Promise<{ source: CanvasImageSource; width: number; height: number }> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
      return { source: bitmap, width: bitmap.width, height: bitmap.height };
    } catch {
      // On retombe sur <img> plutôt que d'échouer.
    }
  }

  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = 'sync';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Image illisible.'));
      img.src = url;
    });
    return { source: img, width: img.naturalWidth, height: img.naturalHeight };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
}

/**
 * Redimensionne et compresse une photo prise à l'appareil.
 *
 * Lève si le fichier n'est pas une image lisible : mieux vaut un message clair
 * qu'une ligne vide écrite en base.
 */
export async function compressPhoto(file: Blob): Promise<CompressedPhoto> {
  const { source, width, height } = await decode(file);
  const size = fitWithin(width, height);
  if (size.width === 0) throw new Error('Image vide ou illisible.');

  const canvas = document.createElement('canvas');
  canvas.width = size.width;
  canvas.height = size.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Le navigateur ne sait pas redimensionner cette image.');
  ctx.drawImage(source, 0, 0, size.width, size.height);
  if ('close' in source && typeof source.close === 'function') source.close();

  let blob = await toBlob(canvas, PHOTO_LIMITS.quality);
  for (const q of PHOTO_LIMITS.fallbackQualities) {
    if (blob && blob.size <= PHOTO_LIMITS.targetBytes) break;
    const next = await toBlob(canvas, q);
    if (next) blob = next;
  }
  if (!blob) throw new Error('Compression impossible sur ce navigateur.');

  return { blob, bytes: blob.size, width: size.width, height: size.height };
}

/**
 * Encodage base64 pour l'export, et décodage pour l'import.
 *
 * Réservé à l'export de photos : en base, on garde le `Blob` brut.
 */
export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Lecture de la photo impossible.'));
    reader.readAsDataURL(blob);
  });
}

export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  return res.blob();
}
