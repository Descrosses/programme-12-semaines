/**
 * Remarques par exercice — les décisions, hors de React et hors de Dexie.
 *
 * Deux questions seulement, mais les deux comptent :
 *   1. qu'est-ce qu'une remarque vide, et que fait-on d'un champ effacé ;
 *   2. lesquelles montrer quand le mouvement revient trois semaines plus tard.
 *
 * Les garder ici les rend testables sans base ni rendu — le reste du fichier
 * n'est que du stockage et de l'affichage.
 */

import type { DayIndex } from '../data/types';

/** Ce dont la décision a besoin : ni l'id de ligne, ni l'horodatage. */
export interface NoteLike {
  exerciseId: string;
  week: number;
  day: DayIndex;
  date: string;
  text: string;
}

/** Où l'on se trouve : une occurrence précise d'un exercice. */
export interface Occurrence {
  week: number;
  day: DayIndex;
}

/**
 * Le texte tel qu'il sera stocké, ou `null` s'il n'y a rien à stocker.
 *
 * Un champ ouvert puis refermé sans rien écrire, ou vidé après coup, ne doit
 * pas laisser de ligne derrière lui : sinon le badge « remarque » s'allumerait
 * sur des remarques vides, et l'indicateur cesserait de vouloir dire quelque
 * chose. `null` veut donc dire « efface la ligne », pas « écris du vide ».
 */
export function normalizeNote(text: string): string | null {
  const t = text.trim();
  return t === '' ? null : t;
}

/** Y a-t-il quelque chose à lire dans cette remarque ? */
export function hasNote(note: { text: string } | null | undefined): boolean {
  return note !== null && note !== undefined && normalizeNote(note.text) !== null;
}

/**
 * Est-ce que `a` vient avant `b` dans le programme ?
 *
 * On compare la semaine puis le jour, jamais la date : la date d'une séance
 * bouge quand Guillaume décale la date de début du programme, et une remarque
 * de la semaine 1 doit rester avant celle de la semaine 3 même après un
 * recalage du calendrier.
 */
function estAvant(a: Occurrence, b: Occurrence): boolean {
  return a.week !== b.week ? a.week < b.week : a.day < b.day;
}

/**
 * Les remarques laissées sur ce mouvement AVANT l'occurrence en cours.
 *
 * Strictement avant : la remarque du jour est déjà dans le champ de saisie, la
 * réafficher au-dessus donnerait à Guillaume l'impression d'en avoir écrit
 * deux. Les plus récentes d'abord — c'est la dernière fois qu'il a fait ce
 * mouvement qui l'intéresse en premier.
 */
export function pastNotes<T extends NoteLike>(rows: T[], current: Occurrence): T[] {
  return rows
    .filter((r) => hasNote(r) && estAvant(r, current))
    .sort((a, b) => (estAvant(a, b) ? 1 : -1));
}

/** « 1 remarque » / « 3 remarques ». */
export function noteBadgeLabel(count: number): string {
  return `${count} remarque${count > 1 ? 's' : ''}`;
}
