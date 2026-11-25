/**
 * Ce qu'une image dit d'elle-même, lu dans ses premiers octets.
 *
 * Le type d'une image importée se décide sur son CONTENU, jamais sur son
 * extension : un « .png » qui n'en est pas un est refusé avant même d'être
 * décodé. Les dimensions servent à refuser une image démesurée avant que le
 * téléphone ne tente de la déplier en mémoire (4096 × 4096 × 4 octets, c'est
 * déjà 64 Mo).
 *
 * Pur : aucune API du navigateur. Le décodage réel (`media/illustration.ts`)
 * vient ensuite et reste le seul juge d'une image abîmée.
 */

export type TypeImage = 'image/png' | 'image/jpeg' | 'image/webp';

export interface EnteteImage {
  type: TypeImage;
  largeur: number;
  hauteur: number;
}

const u16be = (o: Uint8Array, i: number) => (o[i]! << 8) | o[i + 1]!;
const u16le = (o: Uint8Array, i: number) => o[i]! | (o[i + 1]! << 8);
const u24le = (o: Uint8Array, i: number) => o[i]! | (o[i + 1]! << 8) | (o[i + 2]! << 16);
const u32be = (o: Uint8Array, i: number) =>
  ((o[i]! << 24) >>> 0) + (o[i + 1]! << 16) + (o[i + 2]! << 8) + o[i + 3]!;
const ascii = (o: Uint8Array, i: number, n: number) => String.fromCharCode(...o.subarray(i, i + n));

function png(o: Uint8Array): EnteteImage | null {
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (o.length < 24 || !sig.every((b, i) => o[i] === b)) return null;
  if (ascii(o, 12, 4) !== 'IHDR') return null;
  return { type: 'image/png', largeur: u32be(o, 16), hauteur: u32be(o, 20) };
}

function jpeg(o: Uint8Array): EnteteImage | null {
  if (o.length < 4 || o[0] !== 0xff || o[1] !== 0xd8) return null;
  let i = 2;
  while (i + 9 < o.length) {
    if (o[i] !== 0xff) return null;
    const marqueur = o[i + 1]!;
    // Remplissage, ou marqueurs sans longueur.
    if (marqueur === 0xff) {
      i += 1;
      continue;
    }
    if (marqueur === 0xd8 || marqueur === 0x01 || (marqueur >= 0xd0 && marqueur <= 0xd7)) {
      i += 2;
      continue;
    }
    // Début d'image (SOF), hors DHT (C4), JPG (C8) et DAC (CC).
    if (
      marqueur >= 0xc0 &&
      marqueur <= 0xcf &&
      marqueur !== 0xc4 &&
      marqueur !== 0xc8 &&
      marqueur !== 0xcc
    ) {
      return { type: 'image/jpeg', hauteur: u16be(o, i + 5), largeur: u16be(o, i + 7) };
    }
    if (marqueur === 0xda || marqueur === 0xd9) return null;
    i += 2 + u16be(o, i + 2);
  }
  return null;
}

function webp(o: Uint8Array): EnteteImage | null {
  if (o.length < 30 || ascii(o, 0, 4) !== 'RIFF' || ascii(o, 8, 4) !== 'WEBP') return null;
  const bloc = ascii(o, 12, 4);
  if (bloc === 'VP8 ') {
    if (o[23] !== 0x9d || o[24] !== 0x01 || o[25] !== 0x2a) return null;
    return {
      type: 'image/webp',
      largeur: u16le(o, 26) & 0x3fff,
      hauteur: u16le(o, 28) & 0x3fff,
    };
  }
  if (bloc === 'VP8L') {
    if (o[20] !== 0x2f) return null;
    const b = o[21]! | (o[22]! << 8) | (o[23]! << 16) | (o[24]! << 24);
    return { type: 'image/webp', largeur: (b & 0x3fff) + 1, hauteur: ((b >>> 14) & 0x3fff) + 1 };
  }
  if (bloc === 'VP8X') {
    return { type: 'image/webp', largeur: u24le(o, 24) + 1, hauteur: u24le(o, 27) + 1 };
  }
  return null;
}

/** Le type et les dimensions d'une image, ou `null` si ce n'est ni un PNG, ni un JPEG, ni un WebP. */
export function lireEnteteImage(octets: Uint8Array): EnteteImage | null {
  const e = png(octets) ?? jpeg(octets) ?? webp(octets);
  if (e === null || e.largeur < 1 || e.hauteur < 1) return null;
  return e;
}

/** L'empreinte SHA-256 d'un contenu, en hexadécimal : l'identité d'une image. */
export async function empreinteDe(octets: Uint8Array): Promise<string> {
  const copie = new Uint8Array(octets);
  const h = new Uint8Array(await crypto.subtle.digest('SHA-256', copie));
  return [...h].map((b) => b.toString(16).padStart(2, '0')).join('');
}
