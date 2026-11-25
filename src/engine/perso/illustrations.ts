/**
 * ME, MYSELF & I — les illustrations d'un programme importé.
 *
 * ── Le fichier de liens ───────────────────────────────────────────────────
 *
 * Un programme illustré arrive en archive .zip : `programme.json` (le format
 * de toujours, INCHANGÉ), `majk-illustrations.json` (ce fichier-ci) et les
 * images. Les liens vivent à part du programme pour deux raisons :
 * - l'identité d'un programme (son empreinte, ses versions) ne dépend pas de
 *   ses images : ajouter des illustrations à un programme déjà importé ne
 *   fabrique pas une « nouvelle version » ;
 * - un .json seul s'importe exactement comme avant.
 *
 * ── Ce qu'il garantit ─────────────────────────────────────────────────────
 *
 * Toute association repose sur un IDENTIFIANT déclaré, jamais sur un nom :
 * - un exercice du programme pointe vers une illustration de l'archive
 *   (`"bridge"`), vers une fiche de MAJK (`{ "majk": "power12:back-squat" }`)
 *   ou vers rien (`null`, déclaré) ;
 * - un identifiant d'exercice inconnu du programme, une image absente de
 *   l'archive, une illustration jamais utilisée, une fiche de MAJK inconnue :
 *   le fichier est REFUSÉ en entier, avec le chemin fautif ;
 * - un exercice que le fichier ne mentionne pas n'a pas d'illustration, et
 *   l'aperçu le dit.
 *
 * Les seuls rapprochements par nom sont des PROPOSITIONS (`proposerFiches`),
 * montrées dans l'aperçu, cochées, que la personne peut défaire : rien n'est
 * rattaché en silence (décision de Guillaume, 25 novembre).
 *
 * Pur : aucun React, aucune base, aucune dépendance.
 */

import type { ErreurValidation } from './types';

export const LIMITES_ILLUSTRATIONS = {
  /** Le fichier de liens lui-même. */
  octetsManifeste: 500_000,
  /** Images distinctes déclarées dans une archive. */
  illustrations: 200,
  /** Une image, telle qu'elle est dans l'archive. */
  octetsImage: 2_000_000,
  /** Tout ce que l'archive contient, décompressé. */
  octetsTotal: 15_000_000,
  /** Le plus grand côté d'une image, en pixels. */
  coteMax: 4096,
} as const;

/** Le nom du fichier de liens dans l'archive. */
export const NOM_MANIFESTE = 'majk-illustrations.json';
/** Le nom du programme dans l'archive. */
export const NOM_PROGRAMME = 'programme.json';

/** Identifiant d'illustration : minuscules, chiffres, tirets (comme un id d'exercice). */
const ID_ILLUSTRATION = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ID_MAX = 60;
/**
 * Un chemin relatif dans l'archive. Chaque segment commence par une lettre ou
 * un chiffre : « .. », « ./ » et un « / » de tête sont impossibles.
 */
const FICHIER = /^[A-Za-z0-9][A-Za-z0-9._-]*(?:\/[A-Za-z0-9][A-Za-z0-9._-]*)*\.(?:png|jpe?g|webp)$/;
const FICHIER_MAX = 200;
/** `power12:back-squat`, `mass4:curl-incline`, `mass-force:mf-…`. */
const CLE_MAJK = /^[a-z0-9-]+:[a-z0-9-]+$/;
const CLES_INTERDITES = new Set(['__proto__', 'constructor', 'prototype']);

/** Ce que le fichier déclare pour un exercice. */
export type LienDeclare =
  | { type: 'image'; illustration: string }
  | { type: 'majk'; fiche: string }
  | { type: 'aucune' };

export interface IllustrationDeclaree {
  id: string;
  /** Le chemin de l'image dans l'archive. */
  fichier: string;
  nom: string | null;
}

export interface ManifesteIllustrations {
  programmeUid: string;
  illustrations: IllustrationDeclaree[];
  /** Exercice (id local du programme) → lien. Seulement ceux que le fichier mentionne. */
  liens: Readonly<Record<string, LienDeclare>>;
  /** Les exercices du programme que le fichier ne mentionne pas : sans illustration. */
  nonMentionnes: string[];
}

export interface ContexteManifeste {
  /** L'uid du programme visé. */
  uid: string;
  /** Les identifiants d'exercices du programme. */
  exercices: ReadonlySet<string>;
  /** Les fichiers présents dans l'archive. */
  fichiers: ReadonlySet<string>;
  /** Les fiches de MAJK qu'on peut désigner (`power12:…`). */
  fichesMajk: ReadonlySet<string>;
}

export type ResultatManifeste =
  | { ok: false; erreurs: ErreurValidation[] }
  | { ok: true; manifeste: ManifesteIllustrations };

const estObjet = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const lire = (o: Record<string, unknown>, cle: string): unknown =>
  Object.hasOwn(o, cle) ? (o[cle] ?? undefined) : undefined;

/**
 * Relit le fichier de liens d'une archive. Ne lève jamais : rend toutes les
 * erreurs d'un coup, ou le manifeste normalisé.
 */
export function validerManifeste(contenu: string, ctx: ContexteManifeste): ResultatManifeste {
  const erreurs: ErreurValidation[] = [];
  const ajoute = (chemin: string, message: string) =>
    erreurs.push({ code: 'structure-invalide', chemin, message });
  const refus = (): ResultatManifeste => ({ ok: false, erreurs });

  if (new TextEncoder().encode(contenu).length > LIMITES_ILLUSTRATIONS.octetsManifeste) {
    erreurs.push({
      code: 'json-invalide',
      chemin: NOM_MANIFESTE,
      message: 'Le fichier de liens est trop lourd.',
    });
    return refus();
  }
  let racine: unknown;
  try {
    racine = JSON.parse(contenu);
  } catch {
    erreurs.push({
      code: 'json-invalide',
      chemin: NOM_MANIFESTE,
      message: 'Le fichier de liens n’est pas du JSON valide.',
    });
    return refus();
  }
  if (!estObjet(racine) || lire(racine, 'format') !== 'majk-illustrations') {
    erreurs.push({
      code: 'version-inconnue',
      chemin: 'format',
      message: 'Ce fichier n’est pas un fichier d’illustrations MAJK.',
    });
    return refus();
  }
  const version = lire(racine, 'schemaVersion');
  if (version !== 1) {
    erreurs.push({
      code: 'version-inconnue',
      chemin: 'schemaVersion',
      message:
        typeof version === 'number' && version > 1
          ? 'Ces illustrations viennent d’une version plus récente de MAJK : mets l’application à jour.'
          : 'Version de format inconnue.',
    });
    return refus();
  }
  for (const cle of Object.keys(racine)) {
    if (!['format', 'schemaVersion', 'programmeUid', 'illustrations', 'liens'].includes(cle)) {
      ajoute(cle, `Clé inconnue « ${cle} ».`);
    }
  }

  // ---- le programme visé
  const uid = lire(racine, 'programmeUid');
  if (typeof uid !== 'string') {
    ajoute('programmeUid', 'Le champ « programmeUid » est obligatoire.');
  } else if (uid !== ctx.uid) {
    erreurs.push({
      code: 'programme-different',
      chemin: 'programmeUid',
      message: `Ces illustrations sont celles du programme « ${uid} », pas de « ${ctx.uid} ».`,
    });
  }

  // ---- les illustrations
  const illustrations: IllustrationDeclaree[] = [];
  const parId = new Map<string, IllustrationDeclaree>();
  const fichiersVus = new Set<string>();
  const brutes = lire(racine, 'illustrations');
  if (brutes !== undefined && !Array.isArray(brutes)) {
    ajoute('illustrations', 'Une liste est attendue.');
  } else if (Array.isArray(brutes)) {
    if (brutes.length > LIMITES_ILLUSTRATIONS.illustrations) {
      ajoute(
        'illustrations',
        `${String(brutes.length)} illustrations : ${String(LIMITES_ILLUSTRATIONS.illustrations)} au plus.`,
      );
    }
    brutes.forEach((b, i) => {
      const chemin = `illustrations[${String(i)}]`;
      if (!estObjet(b)) {
        ajoute(chemin, 'Un objet est attendu ici.');
        return;
      }
      for (const cle of Object.keys(b)) {
        if (CLES_INTERDITES.has(cle) || !['id', 'fichier', 'nom'].includes(cle)) {
          ajoute(`${chemin}.${cle}`, `Clé inconnue « ${cle} ».`);
        }
      }
      const id = lire(b, 'id');
      const fichier = lire(b, 'fichier');
      const nom = lire(b, 'nom');
      let ok = true;
      if (typeof id !== 'string' || id.length > ID_MAX || !ID_ILLUSTRATION.test(id)) {
        ajoute(`${chemin}.id`, 'Identifiant attendu : minuscules, chiffres et tirets.');
        ok = false;
      } else if (parId.has(id)) {
        erreurs.push({
          code: 'identifiant-duplique',
          chemin: `${chemin}.id`,
          message: `L’illustration « ${id} » est déclarée deux fois.`,
        });
        ok = false;
      }
      if (typeof fichier !== 'string' || fichier.length > FICHIER_MAX || !FICHIER.test(fichier)) {
        ajoute(
          `${chemin}.fichier`,
          'Chemin attendu dans l’archive, en .png, .jpg ou .webp (ex. « images/bridge.png »).',
        );
        ok = false;
      } else if (fichiersVus.has(fichier)) {
        erreurs.push({
          code: 'identifiant-duplique',
          chemin: `${chemin}.fichier`,
          message: `L’image « ${fichier} » est déclarée deux fois : une image, une illustration.`,
        });
        ok = false;
      } else if (!ctx.fichiers.has(fichier)) {
        erreurs.push({
          code: 'fichier-manquant',
          chemin: `${chemin}.fichier`,
          message: `L’image « ${fichier} » n’est pas dans l’archive.`,
        });
        ok = false;
      }
      if (nom !== undefined && (typeof nom !== 'string' || nom.trim() === '' || nom.length > 200)) {
        ajoute(`${chemin}.nom`, 'Un nom non vide est attendu.');
        ok = false;
      }
      if (!ok || typeof id !== 'string' || typeof fichier !== 'string') return;
      const d: IllustrationDeclaree = {
        id,
        fichier,
        nom: typeof nom === 'string' ? nom : null,
      };
      parId.set(id, d);
      fichiersVus.add(fichier);
      illustrations.push(d);
    });
  }

  // ---- les liens
  const liens: Record<string, LienDeclare> = {};
  const utilisees = new Set<string>();
  const bruts = lire(racine, 'liens');
  if (!estObjet(bruts)) {
    ajoute('liens', 'Le champ « liens » est obligatoire : un objet « exercice → illustration ».');
  } else {
    for (const [exercice, valeur] of Object.entries(bruts)) {
      const chemin = `liens.${exercice}`;
      if (CLES_INTERDITES.has(exercice)) {
        ajoute(chemin, `La clé « ${exercice} » est interdite.`);
        continue;
      }
      if (!ctx.exercices.has(exercice)) {
        erreurs.push({
          code: 'exercice-inconnu',
          chemin,
          message: `« ${exercice} » n’est pas un exercice de ce programme.`,
        });
        continue;
      }
      if (valeur === null) {
        liens[exercice] = { type: 'aucune' };
      } else if (typeof valeur === 'string') {
        if (!parId.has(valeur)) {
          erreurs.push({
            code: 'fichier-manquant',
            chemin,
            message: `L’illustration « ${valeur} » n’est pas déclarée.`,
          });
          continue;
        }
        utilisees.add(valeur);
        liens[exercice] = { type: 'image', illustration: valeur };
      } else if (
        estObjet(valeur) &&
        Object.keys(valeur).length === 1 &&
        Object.hasOwn(valeur, 'majk')
      ) {
        const fiche = valeur.majk;
        if (typeof fiche !== 'string' || !CLE_MAJK.test(fiche) || !ctx.fichesMajk.has(fiche)) {
          erreurs.push({
            code: 'fichier-manquant',
            chemin,
            message: `« ${String(fiche)} » n’est pas une fiche de MAJK.`,
          });
          continue;
        }
        liens[exercice] = { type: 'majk', fiche };
      } else {
        ajoute(
          chemin,
          'Attendu : l’identifiant d’une illustration, { "majk": "…" } ou null (pas d’illustration).',
        );
      }
    }
  }

  // Une image jamais utilisée est un oubli de lien, pas un détail.
  for (const d of illustrations) {
    if (!utilisees.has(d.id) && estObjet(bruts)) {
      erreurs.push({
        code: 'illustration-inutilisee',
        chemin: `illustrations[${String(illustrations.indexOf(d))}]`,
        message: `L’illustration « ${d.id} » n’est reliée à aucun exercice.`,
      });
    }
  }

  if (erreurs.length > 0 || typeof uid !== 'string') return refus();
  const nonMentionnes = [...ctx.exercices].filter((id) => !Object.hasOwn(liens, id));
  return { ok: true, manifeste: { programmeUid: uid, illustrations, liens, nonMentionnes } };
}

// ─────────────────────────────────────────────── ce qui est enregistré ──

/** Empreinte SHA-256 d'une image, en hexadécimal. */
export const EMPREINTE = /^[0-9a-f]{64}$/;

/** Ce que la ligne du programme garde : une image stockée, ou une fiche de MAJK. */
export type LienStocke = { empreinte: string } | { majk: string };

/** Les illustrations d'une version de programme importé : exercice (id local) → lien. */
export interface IllustrationsProgramme {
  liens: Readonly<Record<string, LienStocke>>;
}

/**
 * Relit des liens enregistrés (sauvegarde restaurée). `null` au moindre
 * défaut : l'appelant refuse la sauvegarde, il ne garde pas une moitié.
 */
export function relireLiensStockes(
  v: unknown,
  exercices: ReadonlySet<string>,
  fichesMajk: ReadonlySet<string>,
): IllustrationsProgramme | null {
  if (!estObjet(v) || Object.keys(v).length !== 1 || !estObjet(v.liens)) return null;
  const liens: Record<string, LienStocke> = {};
  for (const [exercice, lien] of Object.entries(v.liens)) {
    if (CLES_INTERDITES.has(exercice) || !exercices.has(exercice) || !estObjet(lien)) return null;
    if (Object.keys(lien).length !== 1) return null;
    if (typeof lien.empreinte === 'string' && EMPREINTE.test(lien.empreinte)) {
      liens[exercice] = { empreinte: lien.empreinte };
    } else if (typeof lien.majk === 'string' && fichesMajk.has(lien.majk)) {
      liens[exercice] = { majk: lien.majk };
    } else {
      return null;
    }
  }
  return { liens };
}

/** Les empreintes d'images qu'une ligne de programme utilise. */
export function empreintesDe(ill: IllustrationsProgramme | undefined): Set<string> {
  const out = new Set<string>();
  if (ill === undefined) return out;
  for (const l of Object.values(ill.liens)) if ('empreinte' in l) out.add(l.empreinte);
  return out;
}

// ─────────────────────────────────────── les fiches retrouvées par nom ──

/**
 * Un nom ramené à l'essentiel : sans accents, sans casse, espaces réduits.
 * Rien d'autre — pas de pluriel retiré, pas de mot ignoré : « Sit ups » et
 * « Sit up » restent deux noms (le rapprochement se décide dans le fichier).
 */
export function nomNormalise(nom: string): string {
  return nom.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

/** Une image qui existe déjà dans MAJK, sous un nom d'exercice. */
export interface FicheCandidate {
  /** L'identité de l'IMAGE : deux candidates de même `image` sont la même planche. */
  image: string;
  nom: string;
  /** Où on l'a trouvée, en mots (« POWER », « Top Body Challenge »…). */
  origine: string;
  lien: LienStocke;
}

export interface FicheProposee {
  /** Le nom de l'exercice importé, tel que le programme l'écrit. */
  nom: string;
  /** Tous les exercices du programme qui portent ce nom (un même mouvement à plusieurs places). */
  exercices: string[];
  candidate: FicheCandidate;
}

/**
 * Les fiches qu'on PROPOSE pour les exercices encore sans illustration :
 * seulement à nom STRICTEMENT identique (accents et casse mis à part), et
 * seulement quand ce nom ne désigne qu'UNE planche. Deux planches différentes
 * sous le même nom : rien n'est proposé, le choix serait un pari.
 */
export function proposerFiches(
  exercices: readonly { id: string; nom: string }[],
  dejaLies: ReadonlySet<string>,
  candidates: readonly FicheCandidate[],
): FicheProposee[] {
  const parNom = new Map<string, Map<string, FicheCandidate>>();
  for (const c of candidates) {
    const n = nomNormalise(c.nom);
    const images = parNom.get(n) ?? new Map<string, FicheCandidate>();
    if (!images.has(c.image)) images.set(c.image, c);
    parNom.set(n, images);
  }
  const groupes = new Map<string, FicheProposee>();
  for (const e of exercices) {
    if (dejaLies.has(e.id)) continue;
    const images = parNom.get(nomNormalise(e.nom));
    if (images === undefined || images.size !== 1) continue;
    const candidate = [...images.values()][0]!;
    const cle = nomNormalise(e.nom);
    const g = groupes.get(cle);
    if (g === undefined) groupes.set(cle, { nom: e.nom, exercices: [e.id], candidate });
    else g.exercices.push(e.id);
  }
  return [...groupes.values()];
}
