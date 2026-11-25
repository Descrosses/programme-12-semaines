/**
 * Une archive de programme illustré, analysée de bout en bout AVANT tout
 * enregistrement : c'est ce que montre l'aperçu, et ce qu'enregistre l'import.
 *
 * Étapes, chacune refusant l'ensemble au moindre défaut :
 * 1. l'archive (`media/archive.ts`) : fichiers attendus, tailles déclarées ;
 * 2. le programme : `programme.json` passé au validateur de toujours, ou, sans
 *    lui, la version déjà importée que désigne `programmeUid` ;
 * 3. le fichier de liens (`validerManifeste`) contre CE programme ;
 * 4. chaque image : une image de l'archive qu'aucune illustration ne déclare
 *    est refusée ; chaque image déclarée est lue (type réel, dimensions) puis
 *    identifiée par son empreinte SHA-256.
 *
 * Le décodage réel et le ré-enregistrement de l'image sont faits par l'écran
 * (`media/illustration.ts`, API du navigateur), juste avant l'écriture en
 * base : une transaction IndexedDB ne peut pas attendre un canvas.
 */

import type {
  ErreurValidation,
  ProgrammeNormalise,
  RapportCompatibilite,
} from '../../engine/perso/types';
import { validerProgramme } from '../../engine/perso/valider';
import {
  LIMITES_ILLUSTRATIONS,
  validerManifeste,
  type IllustrationsProgramme,
  type LienStocke,
  type ManifesteIllustrations,
} from '../../engine/perso/illustrations';
import { lireArchive } from '../../media/archive';
import { empreinteDe, lireEnteteImage, type EnteteImage } from '../../media/enteteImage';
import { clesFichesNatives } from './fichesNatives';

export interface IllustrationLue {
  id: string;
  fichier: string;
  nom: string | null;
  octets: Uint8Array;
  entete: EnteteImage;
  empreinte: string;
}

export interface ArchiveAnalysee {
  /** Le texte de `programme.json`, ou `null` : l'archive complète un programme déjà importé. */
  texteProgramme: string | null;
  programme: ProgrammeNormalise;
  /** Le rapport du validateur, quand l'archive apporte le programme. */
  rapport: RapportCompatibilite | null;
  manifeste: ManifesteIllustrations;
  /** Une entrée par image DISTINCTE (deux fichiers identiques n'en font qu'une). */
  illustrations: IllustrationLue[];
  /** Ce que la ligne du programme gardera : exercice → empreinte ou fiche de MAJK. */
  liens: IllustrationsProgramme;
}

export type ResultatAnalyse =
  | { ok: true; analyse: ArchiveAnalysee }
  | { ok: false; erreurs: ErreurValidation[] };

/** L'uid que vise le fichier de liens, lu sans rien valider (pour trouver le programme). */
function uidVise(manifeste: string): string | null {
  try {
    const v: unknown = JSON.parse(manifeste);
    if (typeof v === 'object' && v !== null && 'programmeUid' in v) {
      const uid = (v as { programmeUid: unknown }).programmeUid;
      return typeof uid === 'string' ? uid : null;
    }
  } catch {
    // Le validateur du fichier de liens dira pourquoi.
  }
  return null;
}

export async function analyserArchive(
  octets: Uint8Array,
  programmeDeja: (uid: string) => ProgrammeNormalise | null,
): Promise<ResultatAnalyse> {
  const a = lireArchive(octets);
  if (!a.ok) return a;
  const { contenu } = a;

  // ---- 2. le programme
  let programme: ProgrammeNormalise;
  let rapport: RapportCompatibilite | null = null;
  if (contenu.programme !== null) {
    const v = validerProgramme(contenu.programme);
    if (!v.ok) {
      return {
        ok: false,
        erreurs: v.erreurs.map((e) => ({ ...e, chemin: `programme.json › ${e.chemin}` })),
      };
    }
    programme = v.programme;
    rapport = v.rapport;
  } else {
    const uid = uidVise(contenu.manifeste);
    const deja = uid === null ? null : programmeDeja(uid);
    if (deja === null) {
      return {
        ok: false,
        erreurs: [
          {
            code: 'programme-different',
            chemin: 'programme.json',
            message:
              uid === null
                ? 'L’archive n’a pas de programme.json et ne dit pas à quel programme elle appartient.'
                : `L’archive n’a pas de programme.json, et le programme « ${uid} » n’est pas importé.`,
          },
        ],
      };
    }
    programme = deja;
  }

  // ---- 3. le fichier de liens
  const m = validerManifeste(contenu.manifeste, {
    uid: programme.uid,
    exercices: new Set(programme.exercices.map((e) => e.id)),
    fichiers: new Set(contenu.images.keys()),
    fichesMajk: clesFichesNatives(),
  });
  if (!m.ok) {
    return {
      ok: false,
      erreurs: m.erreurs.map((e) => ({ ...e, chemin: `majk-illustrations.json › ${e.chemin}` })),
    };
  }
  const manifeste = m.manifeste;

  // ---- 4. les images
  const erreurs: ErreurValidation[] = [];
  const declarees = new Set(manifeste.illustrations.map((d) => d.fichier));
  for (const fichier of contenu.images.keys()) {
    if (!declarees.has(fichier)) {
      erreurs.push({
        code: 'illustration-inutilisee',
        chemin: fichier,
        message: `L’image « ${fichier} » n’est déclarée dans aucune illustration.`,
      });
    }
  }
  const parId = new Map<string, IllustrationLue>();
  const parEmpreinte = new Map<string, IllustrationLue>();
  for (const d of manifeste.illustrations) {
    const brut = contenu.images.get(d.fichier)!;
    const entete = lireEnteteImage(brut);
    if (entete === null) {
      erreurs.push({
        code: 'image-invalide',
        chemin: d.fichier,
        message: `« ${d.fichier} » n’est pas une image PNG, JPEG ou WebP lisible.`,
      });
      continue;
    }
    const cote = Math.max(entete.largeur, entete.hauteur);
    if (cote > LIMITES_ILLUSTRATIONS.coteMax) {
      erreurs.push({
        code: 'image-invalide',
        chemin: d.fichier,
        message: `« ${d.fichier} » mesure ${String(entete.largeur)} × ${String(entete.hauteur)} px : ${String(LIMITES_ILLUSTRATIONS.coteMax)} px au plus.`,
      });
      continue;
    }
    const empreinte = await empreinteDe(brut);
    const lue: IllustrationLue = {
      id: d.id,
      fichier: d.fichier,
      nom: d.nom,
      octets: brut,
      entete,
      empreinte,
    };
    parId.set(d.id, parEmpreinte.get(empreinte) ?? lue);
    if (!parEmpreinte.has(empreinte)) parEmpreinte.set(empreinte, lue);
  }
  if (erreurs.length > 0) return { ok: false, erreurs };

  const liens: Record<string, LienStocke> = {};
  for (const [exercice, lien] of Object.entries(manifeste.liens)) {
    if (lien.type === 'image')
      liens[exercice] = { empreinte: parId.get(lien.illustration)!.empreinte };
    else if (lien.type === 'majk') liens[exercice] = { majk: lien.fiche };
  }

  return {
    ok: true,
    analyse: {
      texteProgramme: contenu.programme,
      programme,
      rapport,
      manifeste,
      illustrations: [...parEmpreinte.values()],
      liens: { liens },
    },
  };
}
