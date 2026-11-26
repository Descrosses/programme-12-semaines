/**
 * Ce que la personne ne mange pas (`regles-repas-automatiques.md` §4).
 * Pur : aucune base, aucun React.
 *
 * L'appli ne devine aucun régime : la personne coche ses exclusions ; ses
 * allergies écrites PRÉ-COCHENT seulement les cases qu'elles nomment, et ce
 * qui n'est pas reconnu lui est rendu mot pour mot.
 */

import type { RepasBibliotheque } from '../data/bibliothequeRepas';
import { EXCLUSIONS, PAS_UNE_ALLERGIE, type ExclusionId } from '../data/exclusionsRepas';
import type { SemaineRepas } from './semaineRepas';

/** Casse et accents ignorés, « œ » lu « oe ». */
export function normaliser(t: string): string {
  return t
    .toLowerCase()
    .replace(/œ/g, 'oe')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export interface LectureAllergies {
  exclusions: ExclusionId[];
  /** Les morceaux du texte qui ne désignent rien du tableau, tels qu'écrits. */
  nonReconnus: string[];
}

/** §4 — lire le champ libre « Allergies ou intolérances ». */
export function lireAllergies(texte: string | null | undefined): LectureAllergies {
  const exclusions = new Set<ExclusionId>();
  const nonReconnus: string[] = [];
  const morceaux = (texte ?? '')
    .split(/[,;/+\n]|\bet\b/i)
    .map((m) => m.trim())
    .filter((m) => m.length > 0);
  for (const morceau of morceaux) {
    const n = normaliser(morceau);
    if (PAS_UNE_ALLERGIE.includes(n)) continue;
    let reconnu = false;
    for (const e of EXCLUSIONS) {
      if (e.mots.some((mot) => n.includes(normaliser(mot)))) {
        exclusions.add(e.id);
        reconnu = true;
      }
    }
    if (!reconnu) nonReconnus.push(morceau);
  }
  return {
    exclusions: EXCLUSIONS.filter((e) => exclusions.has(e.id)).map((e) => e.id),
    nonReconnus,
  };
}

/** Les aliments du catalogue écartés par ces exclusions. */
export function alimentsExclus(ids: readonly ExclusionId[]): Set<string> {
  return new Set(
    EXCLUSIONS.filter((e) => ids.includes(e.id)).flatMap((e) => e.aliments as readonly string[]),
  );
}

/** §4 — un repas qui contient UN SEUL aliment écarté est écarté. */
export function repasExclu(r: RepasBibliotheque, exclus: ReadonlySet<string>): boolean {
  return r.lignes.some((l) => exclus.has(l.foodId));
}

/** Les aliments écartés encore présents dans la semaine (pour le bandeau). */
export function exclusDansSemaine(semaine: SemaineRepas, exclus: ReadonlySet<string>): string[] {
  const vus = new Set<string>();
  for (const jour of semaine.jours) {
    for (const lignes of Object.values(jour)) {
      for (const l of lignes ?? []) if (exclus.has(l.foodId)) vus.add(l.foodId);
    }
  }
  return [...vus];
}

/** Le nom d'une exclusion, pour l'écran. */
export function nomExclusion(id: ExclusionId): string {
  return EXCLUSIONS.find((e) => e.id === id)?.nom ?? id;
}
