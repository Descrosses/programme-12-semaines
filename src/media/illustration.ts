/**
 * Une illustration importée, décodée puis RÉ-ENREGISTRÉE par le navigateur
 * avant d'entrer en base.
 *
 * Pourquoi ne pas garder le fichier tel quel :
 * - le décodage réel est le seul juge d'une image abîmée ou piégée : un
 *   fichier que le navigateur ne sait pas dessiner est refusé ;
 * - redessiner l'image ne garde que ses pixels : métadonnées (lieu de prise
 *   de vue…) et tout octet ajouté derrière l'image disparaissent.
 *
 * Le format reste celui d'origine quand le navigateur sait l'écrire (PNG
 * pour un dessin au trait, JPEG pour une photo) ; sinon PNG. Les
 * proportions ne changent pas : la toile a la taille exacte de l'image.
 *
 * Navigateur seulement (canvas). L'identité de l'image (son empreinte) est
 * calculée sur le fichier D'ORIGINE (`archiveIllustree.ts`) : elle ne dépend
 * pas de l'encodeur du téléphone.
 */

import type { TypeImage } from './enteteImage';

export interface IllustrationPreparee {
  blob: Blob;
  largeur: number;
  hauteur: number;
}

function versBlob(toile: HTMLCanvasElement, type: string): Promise<Blob | null> {
  return new Promise((ok) => toile.toBlob(ok, type, 0.92));
}

/** Décode et ré-enregistre ; rejette si le navigateur ne sait pas dessiner l'image. */
export async function preparerIllustration(
  octets: Uint8Array,
  type: TypeImage,
): Promise<IllustrationPreparee> {
  const source = new Blob([new Uint8Array(octets)], { type });
  const image = await createImageBitmap(source);
  try {
    const toile = document.createElement('canvas');
    toile.width = image.width;
    toile.height = image.height;
    const ctx = toile.getContext('2d');
    if (ctx === null) throw new Error('canvas indisponible');
    ctx.drawImage(image, 0, 0);
    let blob = await versBlob(toile, type);
    // Un navigateur qui ne sait pas écrire ce format rend du PNG (ou rien).
    if (blob === null || blob.type !== type) blob = await versBlob(toile, 'image/png');
    if (blob === null) throw new Error('ré-enregistrement impossible');
    return { blob, largeur: image.width, hauteur: image.height };
  } finally {
    image.close();
  }
}
