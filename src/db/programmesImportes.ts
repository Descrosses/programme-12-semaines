/**
 * ME, MYSELF & I — les programmes importés en base (lot 2 de l'ADR).
 *
 * ── Ce que ce module garantit ─────────────────────────────────────────────
 *
 * - Rien n'est écrit avant que le fichier ait passé le validateur.
 * - Une version importée ne change plus : seul `archive` bouge. Réimporter
 *   un programme modifié crée une NOUVELLE version, et les cycles déjà
 *   commencés gardent la leur.
 * - Deux programmes ne se mélangent jamais : chacun a sa clé, et ses
 *   exercices portent cette clé dans leur identifiant.
 * - Supprimer un programme qu'un cycle utilise est refusé : l'archiver le
 *   masque sans rien perdre.
 *
 * Après chaque écriture, la mémoire (`programmes/perso/memoire.ts`) est
 * relue : les lectures synchrones du catalogue et du registre la consultent.
 *
 * Ce module ne joue aucune séance : le moteur des programmes importés est le
 * lot 4.
 *
 * ── Les illustrations (v26) ───────────────────────────────────────────────
 *
 * Les liens « exercice → image » vivent sur la ligne de la version ; les
 * images, dans la table `illustrations`, une par EMPREINTE. Tout s'écrit
 * dans UNE transaction : un import qui échoue ne laisse ni programme sans
 * ses images, ni image sans programme. Après chaque suppression ou
 * remplacement, les images que plus aucune version ne désigne sont retirées.
 * Les liens n'entrent pas dans l'empreinte d'un programme : ajouter des
 * illustrations ne fabrique pas une nouvelle version.
 */

import { formeCanonique } from '../engine/perso/canonique';
import { LIMITES, type ErreurValidation, type RapportCompatibilite } from '../engine/perso/types';
import { validerProgramme } from '../engine/perso/valider';
import {
  EMPREINTE,
  empreintesDe,
  relireLiensStockes,
  type IllustrationsProgramme,
  type LienStocke,
} from '../engine/perso/illustrations';
import type { ProgrammeNormalise } from '../engine/perso/types';
import { clesFichesNatives } from '../programmes/perso/fichesNatives';
import { clePerso, lireCle, PREFIXE_PERSO } from '../programmes/perso/ids';
import { memoireEnErreur, remplirMemoire } from '../programmes/perso/memoire';
import { db, type IllustrationRow, type ProgrammeImporteRow } from './db';

export { PREFIXE_PERSO, clePerso, idExerciceImporte, lireCle } from '../programmes/perso/ids';

/** Ce qui identifie un import : le document normalisé ET les réponses. */
function empreinte(row: Pick<ProgrammeImporteRow, 'document' | 'reponses'>): string {
  return `${formeCanonique(row.document)}|${String(row.reponses.dureeSemaines)}`;
}

/**
 * Remplit la mémoire depuis la base. Appelé au démarrage, avant le premier
 * écran, puis après chaque écriture.
 *
 * Ne lève jamais : une base illisible met la mémoire en erreur, et
 * l'application démarre quand même — POWER, MASS et FEMMES n'en dépendent pas.
 */
export async function hydraterProgrammesImportes(): Promise<void> {
  try {
    remplirMemoire(await db.programmesImportes.toArray());
  } catch {
    memoireEnErreur();
  }
}

export type ResultatImport =
  | { statut: 'refuse'; erreurs: ErreurValidation[] }
  /** Le document ne fixe pas sa durée et la réponse manque ou sort de 1 à 12. */
  | { statut: 'duree-a-choisir' }
  /** Le document fixe sa durée : la question ne se pose pas. */
  | { statut: 'duree-deja-fixee'; dureeSemaines: number }
  | { statut: 'deja-importe'; cle: string }
  | {
      statut: 'nouvelle-version-a-confirmer';
      actuelle: { cle: string; nom: string };
      nom: string;
    }
  | { statut: 'importe'; cle: string; rapport: RapportCompatibilite }
  /** Le programme était déjà là, identique : ses illustrations ont été posées. */
  | { statut: 'illustrations-ajoutees'; cle: string }
  /** Le programme a déjà d'AUTRES illustrations : la personne confirme le remplacement. */
  | { statut: 'illustrations-a-remplacer'; cle: string; nom: string };

/** Une image prête à entrer en base (ré-enregistrée par le navigateur). */
export interface ImageAEnregistrer {
  empreinte: string;
  blob: Blob;
  type: string;
  largeur: number;
  hauteur: number;
}

/** Les types d'image qu'une illustration peut avoir en base. */
const TYPES_IMAGE = new Set(['image/png', 'image/jpeg', 'image/webp']);
/** Une image ré-enregistrée peut grossir (un PNG redessiné) : 10 Mo au plus. */
const OCTETS_IMAGE_EN_BASE = 10_000_000;

export interface OptionsImport {
  /** La réponse au questionnaire, quand le document ne fixe pas la durée. */
  dureeSemaines?: number | null;
  /** La personne a vu les deux noms et confirmé la nouvelle version. */
  confirmerNouvelleVersion?: boolean;
  /** Pour les tests. `YYYY-MM-DD`. */
  aujourdhui?: string;
  /**
   * Les illustrations : exercice (id local) → empreinte ou fiche de MAJK.
   * Ce sont les liens de l'archive ET les fiches retrouvées que la personne
   * a laissées cochées dans l'aperçu.
   */
  liens?: Readonly<Record<string, LienStocke>>;
  /** Les images nouvelles que ces liens désignent. */
  images?: readonly ImageAEnregistrer[];
  /** La personne a confirmé le remplacement des illustrations existantes. */
  remplacerIllustrations?: boolean;
}

/**
 * Contrôle des liens et des images AVANT toute écriture. Rend le message
 * d'erreur, ou `null` si tout est cohérent avec ce programme.
 */
function erreurIllustrations(
  doc: ProgrammeNormalise,
  liens: Readonly<Record<string, LienStocke>>,
  images: readonly ImageAEnregistrer[],
): string | null {
  const exercices = new Set(doc.exercices.map((e) => e.id));
  const natives = clesFichesNatives();
  const designees = new Set<string>();
  for (const [exercice, lien] of Object.entries(liens)) {
    if (!exercices.has(exercice)) return `« ${exercice} » n’est pas un exercice de ce programme.`;
    if ('empreinte' in lien) {
      if (!EMPREINTE.test(lien.empreinte)) return `Lien illisible pour « ${exercice} ».`;
      designees.add(lien.empreinte);
    } else if (!natives.has(lien.majk)) {
      return `« ${lien.majk} » n’est pas une fiche de MAJK.`;
    }
  }
  const vues = new Set<string>();
  for (const i of images) {
    if (!designees.has(i.empreinte)) return 'Une image ne correspond à aucun exercice.';
    if (vues.has(i.empreinte)) return 'Une image est fournie deux fois.';
    vues.add(i.empreinte);
    if (!TYPES_IMAGE.has(i.type) || !TYPES_IMAGE.has(i.blob.type)) {
      return 'Une image n’est ni en PNG, ni en JPEG, ni en WebP.';
    }
    if (i.blob.size === 0 || i.blob.size > OCTETS_IMAGE_EN_BASE)
      return 'Une image est trop lourde.';
    if (![i.largeur, i.hauteur].every((n) => Number.isInteger(n) && n >= 1 && n <= 4096)) {
      return 'Une image a des dimensions impossibles.';
    }
  }
  return null;
}

/**
 * Dans la transaction : écrit les images qui manquent, vérifie que chaque
 * empreinte désignée existe. Lève si une image désignée n'existe nulle part
 * (la transaction est alors annulée en entier).
 */
async function ecrireImages(
  liens: Readonly<Record<string, LienStocke>>,
  images: readonly ImageAEnregistrer[],
  aujourdhui: string,
): Promise<void> {
  for (const i of images) {
    if ((await db.illustrations.where('empreinte').equals(i.empreinte).count()) > 0) continue;
    const row: IllustrationRow = {
      empreinte: i.empreinte,
      blob: i.blob,
      type: i.blob.type,
      octets: i.blob.size,
      largeur: i.largeur,
      hauteur: i.hauteur,
      ajouteLe: aujourdhui,
    };
    await db.illustrations.add(row);
  }
  for (const h of empreintesDe({ liens })) {
    if ((await db.illustrations.where('empreinte').equals(h).count()) === 0) {
      throw new ImageAbsente();
    }
  }
}

class ImageAbsente extends Error {}

/**
 * Retire les images que plus aucune version de programme ne désigne. Dans la
 * transaction de l'écriture qui a pu les rendre orphelines.
 */
async function nettoyerIllustrations(): Promise<void> {
  const utiles = new Set<string>();
  for (const r of await db.programmesImportes.toArray()) {
    for (const h of empreintesDe(r.illustrations)) utiles.add(h);
  }
  await db.illustrations.filter((i) => !utiles.has(i.empreinte)).delete();
}

const memesLiens = (
  a: IllustrationsProgramme | undefined,
  b: IllustrationsProgramme | undefined,
) => {
  const forme = (x: IllustrationsProgramme | undefined) =>
    JSON.stringify(Object.entries(x?.liens ?? {}).sort(([p], [q]) => p.localeCompare(q)));
  return forme(a) === forme(b);
};

const avecLiens = (liens: Readonly<Record<string, LienStocke>>) =>
  Object.keys(liens).length > 0 ? { illustrations: { liens: { ...liens } } } : {};

/** Pose des illustrations sur une version existante, dans la transaction appelante. */
async function poserSur(
  row: ProgrammeImporteRow,
  liens: Readonly<Record<string, LienStocke>>,
  images: readonly ImageAEnregistrer[],
  options: OptionsImport,
  aujourdhui: string,
): Promise<ResultatImport> {
  const nouvelles = Object.keys(liens).length > 0 ? { liens: { ...liens } } : undefined;
  if (memesLiens(row.illustrations, nouvelles)) {
    return { statut: 'illustrations-ajoutees', cle: row.cle };
  }
  const existantes = Object.keys(row.illustrations?.liens ?? {}).length > 0;
  if (existantes && options.remplacerIllustrations !== true) {
    return { statut: 'illustrations-a-remplacer', cle: row.cle, nom: row.nom };
  }
  await ecrireImages(liens, images, aujourdhui);
  await db.programmesImportes.update(row.id!, { illustrations: nouvelles });
  await nettoyerIllustrations();
  return { statut: 'illustrations-ajoutees', cle: row.cle };
}

export async function importerProgramme(
  contenu: string,
  options: OptionsImport = {},
): Promise<ResultatImport> {
  const v = validerProgramme(contenu);
  if (!v.ok) return { statut: 'refuse', erreurs: v.erreurs };
  const doc = v.programme;

  // ---- la durée : écrite par le document, ou choisie par la personne.
  const reponse = options.dureeSemaines ?? null;
  if (doc.dureeSemaines !== null) {
    if (reponse !== null) return { statut: 'duree-deja-fixee', dureeSemaines: doc.dureeSemaines };
  } else if (
    reponse === null ||
    !Number.isInteger(reponse) ||
    reponse < 1 ||
    reponse > LIMITES.semainesMax
  ) {
    return { statut: 'duree-a-choisir' };
  }

  const candidat = { document: doc, reponses: { dureeSemaines: reponse } };
  const cible = empreinte(candidat);
  const liens = options.liens ?? {};
  const images = options.images ?? [];
  const aujourdhui = options.aujourdhui ?? new Date().toISOString().slice(0, 10);
  const defaut = erreurIllustrations(doc, liens, images);
  if (defaut !== null) {
    return {
      statut: 'refuse',
      erreurs: [{ code: 'fichier-manquant', chemin: 'illustrations', message: defaut }],
    };
  }
  const illustre = Object.keys(liens).length > 0;

  const resultat = await db
    .transaction(
      'rw',
      [db.programmesImportes, db.illustrations],
      async (): Promise<ResultatImport> => {
        const versions = await db.programmesImportes.where('uid').equals(doc.uid).toArray();
        const identique = versions.find((r) => empreinte(r) === cible);
        if (identique) {
          // Sans illustrations : rien à faire. Avec : elles se posent sur la
          // version déjà là, sans en créer une nouvelle.
          if (!illustre) return { statut: 'deja-importe', cle: identique.cle };
          return poserSur(identique, liens, images, options, aujourdhui);
        }

        const derniere = versions.reduce<ProgrammeImporteRow | null>(
          (max, r) => (max === null || r.rev > max.rev ? r : max),
          null,
        );
        if (derniere !== null && options.confirmerNouvelleVersion !== true) {
          return {
            statut: 'nouvelle-version-a-confirmer',
            actuelle: { cle: derniere.cle, nom: derniere.nom },
            nom: doc.nom,
          };
        }

        const rev = derniere === null ? 1 : derniere.rev + 1;
        const cle = clePerso(doc.uid, rev);
        await ecrireImages(liens, images, aujourdhui);
        await db.programmesImportes.add({
          cle,
          uid: doc.uid,
          rev,
          nom: doc.nom,
          importeLe: aujourdhui,
          archive: false,
          texte: contenu,
          document: doc,
          reponses: candidat.reponses,
          ...avecLiens(liens),
        });
        return { statut: 'importe', cle, rapport: v.rapport };
      },
    )
    .catch((e: unknown): ResultatImport => {
      if (e instanceof ImageAbsente) return refusImageAbsente();
      throw e;
    });
  if (resultat.statut === 'importe' || resultat.statut === 'illustrations-ajoutees') {
    await hydraterProgrammesImportes();
  }
  return resultat;
}

const refusImageAbsente = (): ResultatImport => ({
  statut: 'refuse',
  erreurs: [
    {
      code: 'fichier-manquant',
      chemin: 'illustrations',
      message: 'Une image désignée n’est ni dans l’archive, ni déjà dans MAJK.',
    },
  ],
});

/**
 * Pose des illustrations sur un programme DÉJÀ importé (archive sans
 * programme.json) : sur sa version la plus récente.
 */
export async function completerIllustrations(
  uid: string,
  options: Pick<OptionsImport, 'liens' | 'images' | 'remplacerIllustrations' | 'aujourdhui'>,
): Promise<ResultatImport | { statut: 'introuvable' }> {
  const liens = options.liens ?? {};
  const images = options.images ?? [];
  const aujourdhui = options.aujourdhui ?? new Date().toISOString().slice(0, 10);
  const resultat = await db
    .transaction(
      'rw',
      [db.programmesImportes, db.illustrations],
      async (): Promise<ResultatImport | { statut: 'introuvable' }> => {
        const versions = await db.programmesImportes.where('uid').equals(uid).toArray();
        const derniere = versions.reduce<ProgrammeImporteRow | null>(
          (max, r) => (max === null || r.rev > max.rev ? r : max),
          null,
        );
        if (derniere === null) return { statut: 'introuvable' };
        const defaut = erreurIllustrations(derniere.document, liens, images);
        if (defaut !== null) {
          return {
            statut: 'refuse',
            erreurs: [{ code: 'fichier-manquant', chemin: 'illustrations', message: defaut }],
          };
        }
        return poserSur(derniere, liens, images, options, aujourdhui);
      },
    )
    .catch((e: unknown): ResultatImport => {
      if (e instanceof ImageAbsente) return refusImageAbsente();
      throw e;
    });
  if (resultat.statut === 'illustrations-ajoutees') await hydraterProgrammesImportes();
  return resultat;
}

/** Les images d'illustration, par empreinte (pour l'affichage en séance). */
export async function illustration(empreinte: string): Promise<IllustrationRow | null> {
  return (await db.illustrations.where('empreinte').equals(empreinte).first()) ?? null;
}

/** Toutes les versions, archivées comprises, rangées par programme puis par version. */
export async function listerProgrammesImportes(): Promise<ProgrammeImporteRow[]> {
  const tout = await db.programmesImportes.toArray();
  return tout.sort((a, b) => a.uid.localeCompare(b.uid) || a.rev - b.rev);
}

export async function programmeImporte(cle: string): Promise<ProgrammeImporteRow | null> {
  return (await db.programmesImportes.where('cle').equals(cle).first()) ?? null;
}

/** Le seul champ qui change après l'import. `false` si la version n'existe pas. */
export async function archiverProgramme(cle: string, archive: boolean): Promise<boolean> {
  const trouve = (await db.programmesImportes.where('cle').equals(cle).modify({ archive })) > 0;
  if (trouve) await hydraterProgrammesImportes();
  return trouve;
}

export type ResultatSuppression = 'supprime' | 'utilise-par-un-cycle' | 'introuvable';

/**
 * Supprime une version et ses images de référence, en une transaction.
 *
 * Refusé si un cycle — commencé, prévu ou terminé — la désigne : ses séries
 * resteraient sans programme. Dans ce cas, l'archivage est la voie prévue.
 */
export async function supprimerProgramme(cle: string): Promise<ResultatSuppression> {
  const resultat = await db.transaction(
    'rw',
    [db.programmesImportes, db.cycles, db.exerciseReference, db.illustrations],
    async () => {
      const row = await db.programmesImportes.where('cle').equals(cle).first();
      if (!row) return 'introuvable';
      if ((await db.cycles.where('programmeId').equals(cle).count()) > 0) {
        return 'utilise-par-un-cycle';
      }
      await db.exerciseReference.where('exerciseId').startsWith(`${cle}-`).delete();
      await db.programmesImportes.where('cle').equals(cle).delete();
      // Ses images partent avec elle, sauf celles qu'une autre version désigne.
      await nettoyerIllustrations();
      return 'supprime' as const;
    },
  );
  if (resultat === 'supprime') await hydraterProgrammesImportes();
  return resultat;
}

/**
 * Relit les programmes d'une sauvegarde AVANT toute écriture.
 *
 * Chaque version repasse par le validateur, depuis son texte d'origine, et
 * son `document` en est reconstruit : une sauvegarde retouchée ne fait entrer
 * aucun programme invalide. Chaque cycle qui désigne un programme importé
 * doit le trouver dans le même fichier.
 *
 * Lève une erreur au premier défaut : l'appelant n'a encore rien effacé.
 */
export function programmesDeSauvegarde(
  lignes: readonly unknown[],
  cycles: readonly { programmeId?: unknown }[],
): ProgrammeImporteRow[] {
  const sortie: ProgrammeImporteRow[] = [];
  const cles = new Set<string>();
  lignes.forEach((brute, i) => {
    const r = (typeof brute === 'object' && brute !== null ? brute : {}) as Partial<
      Record<keyof ProgrammeImporteRow, unknown>
    >;
    const ici = `Programme importé n° ${String(i + 1)}`;
    const cle = typeof r.cle === 'string' ? lireCle(r.cle) : null;
    if (cle === null || typeof r.cle !== 'string') throw new Error(`${ici} : clé illisible.`);
    if (cles.has(r.cle)) throw new Error(`${ici} : la version « ${r.cle} » figure deux fois.`);
    if (typeof r.texte !== 'string') throw new Error(`${ici} : texte d'origine absent.`);
    const v = validerProgramme(r.texte);
    if (!v.ok) throw new Error(`${ici} (${r.cle}) : le programme n'est plus valide.`);
    if (v.programme.uid !== cle.uid) {
      throw new Error(`${ici} : la clé ne correspond pas au programme.`);
    }
    const reponses = r.reponses as { dureeSemaines?: unknown } | undefined;
    const duree = reponses?.dureeSemaines ?? null;
    const dureeValide =
      v.programme.dureeSemaines === null
        ? typeof duree === 'number' &&
          Number.isInteger(duree) &&
          duree >= 1 &&
          duree <= LIMITES.semainesMax
        : duree === null;
    if (!dureeValide) throw new Error(`${ici} (${r.cle}) : durée choisie incohérente.`);
    let illustrations: IllustrationsProgramme | undefined;
    if (r.illustrations !== undefined) {
      const relues = relireLiensStockes(
        r.illustrations,
        new Set(v.programme.exercices.map((e) => e.id)),
        clesFichesNatives(),
      );
      if (relues === null) throw new Error(`${ici} (${r.cle}) : illustrations illisibles.`);
      illustrations = relues;
    }
    cles.add(r.cle);
    sortie.push({
      cle: r.cle,
      uid: cle.uid,
      rev: cle.rev,
      nom: v.programme.nom,
      importeLe: typeof r.importeLe === 'string' ? r.importeLe : '',
      archive: r.archive === true,
      texte: r.texte,
      document: v.programme,
      reponses: { dureeSemaines: duree as number | null },
      ...(illustrations === undefined ? {} : { illustrations }),
    });
  });

  for (const c of cycles) {
    const id = c.programmeId;
    if (typeof id === 'string' && id.startsWith(PREFIXE_PERSO) && !cles.has(id)) {
      throw new Error(
        `Un cycle suit le programme importé « ${id} », absent de ce fichier. Restauration refusée.`,
      );
    }
  }
  return sortie;
}
