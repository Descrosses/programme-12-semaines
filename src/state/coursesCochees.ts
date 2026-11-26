/**
 * Les articles cochés de la liste de courses, sur CE téléphone
 * (`regles-courses.md` §4).
 *
 * Un confort de magasin, pas une donnée : `localStorage`, jamais en base ni
 * dans la sauvegarde. Les coches valent pour UNE semaine composée (sa date
 * `creeLe`) : recomposer la semaine repart d'une liste vierge. Un stockage
 * refusé ou illisible = rien de coché, jamais une erreur.
 */

const CLE = 'p12s:courses-cochees';

export function lireCoches(creeLe: string): Set<string> {
  try {
    const v = JSON.parse(localStorage.getItem(CLE) ?? 'null') as {
      creeLe?: unknown;
      ids?: unknown;
    } | null;
    if (v === null || v.creeLe !== creeLe || !Array.isArray(v.ids)) return new Set();
    return new Set(v.ids.filter((x): x is string => typeof x === 'string'));
  } catch {
    return new Set();
  }
}

export function ecrireCoches(creeLe: string, ids: ReadonlySet<string>): void {
  try {
    localStorage.setItem(CLE, JSON.stringify({ creeLe, ids: [...ids] }));
  } catch {
    // Navigation privée : les coches ne survivront pas, rien de grave.
  }
}
