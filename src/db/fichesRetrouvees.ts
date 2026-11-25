/**
 * Les fiches qui existent déjà dans MAJK, « peu importe dans quel programme »
 * (Guillaume, 25 novembre) — candidates aux PROPOSITIONS de l'aperçu d'import.
 *
 * Trois sources :
 * - les fiches livrées avec MAJK (POWER, MASS CONGESTION, MASS FORCE) ;
 * - les illustrations des programmes déjà importés ;
 * - les fiches déposées à la main sur n'importe quel exercice (LADIES
 *   compris, qui n'a pas de fiche livrée).
 *
 * Rien n'est rattaché ici : `proposerFiches` ne propose qu'à nom identique et
 * planche unique, et la personne confirme dans l'aperçu. Une fiche déposée
 * acceptée est COPIÉE dans la table des illustrations (son empreinte la
 * dédoublonne) : elle devient l'illustration du programme importé, et
 * supprimer la fiche d'origine ne la lui retire pas.
 */

import { EXERCISES as EXERCICES_POWER } from '../data/exercises';
import { EXERCISES as EXERCICES_FEMMES } from '../data/femmes/exercises';
import type { FicheCandidate } from '../engine/perso/illustrations';
import { EXERCICES_MASS4 } from '../programmes/mass4/exercices';
import { SEANCES_FORCE } from '../programmes/massforce/seances';
import { candidatesNatives } from '../programmes/perso/fichesNatives';
import { lireMemoire } from '../programmes/perso/memoire';
import { PREFIXE_PERSO } from '../programmes/perso/ids';
import { empreinteDe } from '../media/enteteImage';
import { allExerciseReferences } from './repo';
import type { ImageAEnregistrer } from './programmesImportes';

/** Une candidate, et l'image à copier quand elle vient d'une fiche déposée. */
export interface Candidate extends FicheCandidate {
  copie?: ImageAEnregistrer;
}

const TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);

/** Le nom et le programme d'un exercice, d'où qu'il vienne. */
function exerciceConnu(id: string): { nom: string; origine: string } | null {
  if (id.startsWith(PREFIXE_PERSO)) {
    for (const r of lireMemoire().programmes) {
      if (!id.startsWith(`${r.cle}-`)) continue;
      const local = id.slice(r.cle.length + 1);
      const e = r.document.exercices.find((x) => x.id === local);
      return e === undefined ? null : { nom: e.nom, origine: r.nom };
    }
    return null;
  }
  const power = EXERCICES_POWER[id];
  if (power !== undefined) return { nom: power.name, origine: 'POWER' };
  const mass = EXERCICES_MASS4[id];
  if (mass !== undefined) return { nom: mass.nom, origine: 'MASS CONGESTION' };
  for (const s of SEANCES_FORCE) {
    for (const l of s.lignes) {
      const o = l.options.find((x) => x.id === id);
      if (o !== undefined) return { nom: o.nom, origine: 'MASS FORCE' };
    }
  }
  const femmes = EXERCICES_FEMMES[id];
  if (femmes !== undefined) return { nom: femmes.name, origine: 'LADIES' };
  return null;
}

export async function candidatesDisponibles(): Promise<Candidate[]> {
  const out: Candidate[] = [...candidatesNatives()];

  for (const r of lireMemoire().programmes) {
    for (const [local, lien] of Object.entries(r.illustrations?.liens ?? {})) {
      if (!('empreinte' in lien)) continue;
      const e = r.document.exercices.find((x) => x.id === local);
      if (e === undefined) continue;
      out.push({ image: lien.empreinte, nom: e.nom, origine: r.nom, lien });
    }
  }

  for (const f of await allExerciseReferences()) {
    const connu = exerciceConnu(f.exerciseId);
    if (connu === null || !TYPES.has(f.blob.type)) continue;
    const empreinte = await empreinteDe(new Uint8Array(await f.blob.arrayBuffer()));
    out.push({
      image: empreinte,
      nom: connu.nom,
      origine: `${connu.origine} (fiche ajoutée)`,
      lien: { empreinte },
      copie: {
        empreinte,
        blob: f.blob,
        type: f.blob.type,
        largeur: f.width,
        hauteur: f.height,
      },
    });
  }
  return out;
}
