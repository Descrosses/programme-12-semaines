/**
 * Lecture d'une archive .zip de programme illustré (ME, MYSELF & I).
 *
 * ── Ce qui entre ──────────────────────────────────────────────────────────
 *
 * Trois sortes de fichiers, rien d'autre :
 * - `programme.json` (facultatif : sans lui, l'archive complète un programme
 *   déjà importé) ;
 * - `majk-illustrations.json` (obligatoire) ;
 * - les images, en .png, .jpg ou .webp.
 *
 * Tolérés et ignorés : les dossiers, les fichiers cachés (`.DS_Store`) et le
 * dossier `__MACOSX/` que le Mac ajoute en compressant. Un dossier unique
 * qui enveloppe tout (« Compresser » un dossier sur iPhone ou sur Mac) est
 * retiré des chemins.
 *
 * Tout autre fichier est REFUSÉ, nommé : une archive est un paquet propre,
 * pas un dossier où l'on pioche.
 *
 * ── La bombe zip ──────────────────────────────────────────────────────────
 *
 * `fflate` alloue pour chaque fichier la taille DÉCLARÉE dans l'archive. On
 * lit ces déclarations AVANT d'extraire et on refuse au-delà des limites :
 * la mémoire consommée est bornée quoi que l'archive prétende. Une archive
 * qui ment sur ses tailles donne des images tronquées, refusées au décodage.
 *
 * Pur : aucun React, aucune base. Testable sous Node.
 */

import { unzipSync, type UnzipFileInfo } from 'fflate';
import { LIMITES } from '../engine/perso/types';
import type { ErreurValidation } from '../engine/perso/types';
import { LIMITES_ILLUSTRATIONS, NOM_MANIFESTE, NOM_PROGRAMME } from '../engine/perso/illustrations';

/** L'archive elle-même, compressée. */
export const OCTETS_ARCHIVE_MAX = 20_000_000;
/** Entrées lues dans l'archive, dossiers et fichiers ignorés compris. */
const ENTREES_MAX = 400;
const IMAGE = /\.(?:png|jpe?g|webp)$/i;

export interface ContenuArchive {
  /** Le texte de `programme.json`, ou `null` s'il n'y en a pas. */
  programme: string | null;
  /** Le texte de `majk-illustrations.json`. */
  manifeste: string;
  /** Chemin dans l'archive (sans dossier enveloppe) → octets. */
  images: ReadonlyMap<string, Uint8Array>;
}

export type ResultatArchive =
  | { ok: true; contenu: ContenuArchive }
  | { ok: false; erreurs: ErreurValidation[] };

const ignore = (nom: string) =>
  nom.endsWith('/') ||
  nom.startsWith('__MACOSX/') ||
  nom.split('/').some((segment) => segment.startsWith('.'));

/** Le dossier qui enveloppe tout, s'il y en a un seul. */
function enveloppe(noms: readonly string[]): string {
  if (noms.length === 0) return '';
  const premier = noms[0]!.split('/')[0]!;
  if (noms.every((n) => n.includes('/') && n.split('/')[0] === premier)) return `${premier}/`;
  return '';
}

/** `true` pour une archive .zip (signature `PK\x03\x04` ou archive vide `PK\x05\x06`). */
export function estUneArchive(octets: Uint8Array): boolean {
  return (
    octets.length >= 4 &&
    octets[0] === 0x50 &&
    octets[1] === 0x4b &&
    ((octets[2] === 0x03 && octets[3] === 0x04) || (octets[2] === 0x05 && octets[3] === 0x06))
  );
}

export function lireArchive(octets: Uint8Array): ResultatArchive {
  const erreurs: ErreurValidation[] = [];
  const refus = (message: string, chemin = 'archive'): ResultatArchive => ({
    ok: false,
    erreurs: [...erreurs, { code: 'archive-invalide', chemin, message }],
  });

  if (octets.length > OCTETS_ARCHIVE_MAX) {
    return refus(`L’archive dépasse ${String(OCTETS_ARCHIVE_MAX / 1_000_000)} Mo.`);
  }
  if (!estUneArchive(octets)) return refus('Ce fichier n’est pas une archive .zip.');

  // 1. Le sommaire, sans rien extraire.
  const sommaire: UnzipFileInfo[] = [];
  try {
    unzipSync(octets, {
      filter: (f) => {
        sommaire.push(f);
        return false;
      },
    });
  } catch {
    return refus('Cette archive .zip est illisible ou abîmée.');
  }
  if (sommaire.length > ENTREES_MAX) {
    return refus(`L’archive contient ${String(sommaire.length)} fichiers : c’est trop.`);
  }

  const utiles = sommaire.filter((f) => !ignore(f.name));
  const prefixe = enveloppe(utiles.map((f) => f.name));
  const nomDe = (f: UnzipFileInfo) => f.name.slice(prefixe.length);

  // 2. Chaque fichier utile, contrôlé sur ce qu'il DÉCLARE.
  const vus = new Set<string>();
  let total = 0;
  for (const f of utiles) {
    const nom = nomDe(f);
    if (vus.has(nom)) {
      erreurs.push({
        code: 'archive-invalide',
        chemin: nom,
        message: `« ${nom} » est présent deux fois dans l’archive.`,
      });
      continue;
    }
    vus.add(nom);
    if (f.compression !== 0 && f.compression !== 8) {
      erreurs.push({
        code: 'archive-invalide',
        chemin: nom,
        message: `« ${nom} » est compressé d’une façon que MAJK ne lit pas.`,
      });
      continue;
    }
    const limite =
      nom === NOM_PROGRAMME
        ? LIMITES.octets
        : nom === NOM_MANIFESTE
          ? LIMITES_ILLUSTRATIONS.octetsManifeste
          : IMAGE.test(nom)
            ? LIMITES_ILLUSTRATIONS.octetsImage
            : null;
    if (limite === null) {
      erreurs.push({
        code: 'archive-invalide',
        chemin: nom,
        message: `« ${nom} » : fichier inattendu. Une archive contient ${NOM_PROGRAMME}, ${NOM_MANIFESTE} et des images.`,
      });
      continue;
    }
    if (f.originalSize > limite) {
      erreurs.push({
        code: 'archive-invalide',
        chemin: nom,
        message: `« ${nom} » dépasse ${String(limite / 1_000_000)} Mo.`,
      });
      continue;
    }
    total += f.originalSize;
  }
  if (total > LIMITES_ILLUSTRATIONS.octetsTotal) {
    erreurs.push({
      code: 'archive-invalide',
      chemin: 'archive',
      message: `Le contenu de l’archive dépasse ${String(LIMITES_ILLUSTRATIONS.octetsTotal / 1_000_000)} Mo.`,
    });
  }
  if (!vus.has(NOM_MANIFESTE)) {
    erreurs.push({
      code: 'archive-invalide',
      chemin: NOM_MANIFESTE,
      message: `L’archive n’a pas de « ${NOM_MANIFESTE} » : MAJK ne sait pas à quel exercice va chaque image.`,
    });
  }
  if (erreurs.length > 0) return { ok: false, erreurs };

  // 3. L'extraction, seulement de ce qui a été contrôlé.
  let fichiers: Record<string, Uint8Array>;
  try {
    fichiers = unzipSync(octets, { filter: (f) => !ignore(f.name) });
  } catch {
    return refus('Cette archive .zip est illisible ou abîmée.');
  }

  const decodeur = new TextDecoder('utf-8', { fatal: true });
  const texte = (nom: string): string | null => {
    const brut = fichiers[`${prefixe}${nom}`];
    if (brut === undefined) return null;
    try {
      return decodeur.decode(brut);
    } catch {
      erreurs.push({
        code: 'archive-invalide',
        chemin: nom,
        message: `« ${nom} » n’est pas un texte UTF-8.`,
      });
      return null;
    }
  };
  const programme = texte(NOM_PROGRAMME);
  const manifeste = texte(NOM_MANIFESTE);
  const images = new Map<string, Uint8Array>();
  for (const [brut, contenu] of Object.entries(fichiers)) {
    const nom = brut.slice(prefixe.length);
    if (IMAGE.test(nom)) images.set(nom, contenu);
  }
  if (erreurs.length > 0 || manifeste === null) return { ok: false, erreurs };
  return { ok: true, contenu: { programme, manifeste, images } };
}
