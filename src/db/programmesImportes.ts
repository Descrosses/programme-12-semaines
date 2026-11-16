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
 */

import { formeCanonique } from '../engine/perso/canonique';
import { LIMITES, type ErreurValidation, type RapportCompatibilite } from '../engine/perso/types';
import { validerProgramme } from '../engine/perso/valider';
import { clePerso, lireCle, PREFIXE_PERSO } from '../programmes/perso/ids';
import { memoireEnErreur, remplirMemoire } from '../programmes/perso/memoire';
import { db, type ProgrammeImporteRow } from './db';

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
  | { statut: 'importe'; cle: string; rapport: RapportCompatibilite };

export interface OptionsImport {
  /** La réponse au questionnaire, quand le document ne fixe pas la durée. */
  dureeSemaines?: number | null;
  /** La personne a vu les deux noms et confirmé la nouvelle version. */
  confirmerNouvelleVersion?: boolean;
  /** Pour les tests. `YYYY-MM-DD`. */
  aujourdhui?: string;
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

  const resultat = await db.transaction(
    'rw',
    db.programmesImportes,
    async (): Promise<ResultatImport> => {
      const versions = await db.programmesImportes.where('uid').equals(doc.uid).toArray();
      const identique = versions.find((r) => empreinte(r) === cible);
      if (identique) return { statut: 'deja-importe', cle: identique.cle };

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
      await db.programmesImportes.add({
        cle,
        uid: doc.uid,
        rev,
        nom: doc.nom,
        importeLe: options.aujourdhui ?? new Date().toISOString().slice(0, 10),
        archive: false,
        texte: contenu,
        document: doc,
        reponses: candidat.reponses,
      });
      return { statut: 'importe', cle, rapport: v.rapport };
    },
  );
  if (resultat.statut === 'importe') await hydraterProgrammesImportes();
  return resultat;
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
    [db.programmesImportes, db.cycles, db.exerciseReference],
    async () => {
      const row = await db.programmesImportes.where('cle').equals(cle).first();
      if (!row) return 'introuvable';
      if ((await db.cycles.where('programmeId').equals(cle).count()) > 0) {
        return 'utilise-par-un-cycle';
      }
      await db.exerciseReference.where('exerciseId').startsWith(`${cle}-`).delete();
      await db.programmesImportes.where('cle').equals(cle).delete();
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
