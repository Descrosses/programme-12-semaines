/**
 * Des en-têtes d'images fabriqués, pour les tests.
 *
 * Les tests n'utilisent JAMAIS de vraies illustrations de programme : celles
 * du Top Body Challenge sont des contenus tiers, qui ne vont ni dans le
 * dépôt ni dans l'application publiée (décision de Guillaume, 25 novembre).
 * Ces octets ne sont lisibles que par `lireEnteteImage` ; aucun navigateur
 * ne les afficherait, et c'est voulu.
 */

const be32 = (n: number) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];

/** Un en-tête PNG (signature + IHDR), suivi d'octets qui le rendent unique. */
export function pngFactice(largeur: number, hauteur: number, graine = 0): Uint8Array {
  return new Uint8Array([
    0x89,
    0x50,
    0x4e,
    0x47,
    0x0d,
    0x0a,
    0x1a,
    0x0a,
    0,
    0,
    0,
    13,
    0x49,
    0x48,
    0x44,
    0x52,
    ...be32(largeur),
    ...be32(hauteur),
    8,
    6,
    0,
    0,
    0,
    graine & 255,
    (graine >>> 8) & 255,
    0,
    0,
  ]);
}

/** Un en-tête JPEG (SOI, APP0, SOF0). */
export function jpegFactice(largeur: number, hauteur: number): Uint8Array {
  return new Uint8Array([
    0xff,
    0xd8,
    0xff,
    0xe0,
    0,
    16,
    0x4a,
    0x46,
    0x49,
    0x46,
    0,
    1,
    1,
    0,
    0,
    1,
    0,
    1,
    0,
    0,
    0xff,
    0xc0,
    0,
    17,
    8,
    (hauteur >>> 8) & 255,
    hauteur & 255,
    (largeur >>> 8) & 255,
    largeur & 255,
    3,
    1,
    0x22,
    0,
    2,
    0x11,
    1,
    3,
    0x11,
    1,
    0xff,
    0xd9,
  ]);
}

/** Un en-tête WebP étendu (VP8X). */
export function webpFactice(largeur: number, hauteur: number): Uint8Array {
  const w = largeur - 1;
  const h = hauteur - 1;
  return new Uint8Array([
    0x52,
    0x49,
    0x46,
    0x46,
    30,
    0,
    0,
    0,
    0x57,
    0x45,
    0x42,
    0x50,
    0x56,
    0x50,
    0x38,
    0x58,
    10,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    w & 255,
    (w >>> 8) & 255,
    (w >>> 16) & 255,
    h & 255,
    (h >>> 8) & 255,
    (h >>> 16) & 255,
  ]);
}
