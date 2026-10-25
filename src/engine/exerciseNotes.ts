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

// ---------------------------------------------------------------------------
// Historique APPENDÉ — une remarque n'écrase plus la précédente
// ---------------------------------------------------------------------------

/**
 * Une remarque telle qu'elle est stockée depuis la v15.
 *
 * Deux différences avec `NoteLike`, et elles changent tout :
 *   — `exerciseId` peut valoir `null`, pour la remarque de séance ;
 *   — plusieurs remarques peuvent porter le même (exercice, semaine, jour),
 *     puisque rien n'est unique. `at` les départage.
 */
export interface NoteEntry {
  id?: number;
  exerciseId: string | null;
  week: number;
  day: DayIndex;
  date: string;
  text: string;
  at: number;
}

/**
 * Les remarques laissées sur ce mouvement, de la plus récente à la plus
 * ancienne.
 *
 * ── Pourquoi tout l'historique, et pas seulement « avant aujourd'hui » ─────
 *
 * L'ancien encart excluait l'occurrence en cours : la remarque du jour était
 * dans le champ de saisie, la réafficher au-dessus donnait l'impression d'en
 * avoir écrit deux. Ce n'est plus vrai. Le champ ne contient qu'un brouillon
 * pas encore ajouté ; dès qu'une remarque est ajoutée, elle sort du champ et
 * entre dans l'historique. Les deux ne peuvent donc plus faire doublon, et
 * cacher la remarque qu'on vient d'ajouter serait cette fois le défaut.
 *
 * Tri par semaine puis jour puis horodatage : c'est l'ordre du PROGRAMME, pas
 * celui du calendrier. Décaler la date de début ne doit pas réordonner douze
 * semaines de remarques.
 */
export function noteHistory(rows: NoteEntry[], exerciseId: string | null): NoteEntry[] {
  return rows
    .filter((r) => r.exerciseId === exerciseId && normalizeNote(r.text) !== null)
    .sort(plusRecentDAbord);
}

/** Toutes les remarques, du plus récent au plus ancien, exercices confondus. */
export function allNotesNewestFirst(rows: NoteEntry[]): NoteEntry[] {
  return rows.filter((r) => normalizeNote(r.text) !== null).sort(plusRecentDAbord);
}

function plusRecentDAbord(a: NoteEntry, b: NoteEntry): number {
  if (a.week !== b.week) return b.week - a.week;
  if (a.day !== b.day) return b.day - a.day;
  return b.at - a.at;
}

/** « S5 » — le repère que Guillaume lit en premier. */
export function noteWeekLabel(row: Pick<NoteEntry, 'week'>): string {
  return `S${row.week}`;
}

/** « S5 — épaule gauche tire un peu », la forme demandée. */
export function noteLine(row: NoteEntry): string {
  return `${noteWeekLabel(row)} — ${row.text.trim()}`;
}

/**
 * Les remarques regroupées par mouvement, chaque groupe trié du plus récent au
 * plus ancien, et les groupes rangés par nombre de remarques décroissant.
 *
 * Pour l'écran Progression : ce qui intéresse là-bas n'est pas la chronologie
 * mais le mouvement qui a fait parler de lui. Un exercice avec six remarques
 * en douze semaines dit quelque chose ; un exercice avec une dit beaucoup
 * moins.
 */
export function notesByExercise(rows: NoteEntry[]): Array<{
  exerciseId: string | null;
  notes: NoteEntry[];
}> {
  const parEx = new Map<string, NoteEntry[]>();
  for (const r of rows) {
    if (normalizeNote(r.text) === null) continue;
    const cle = r.exerciseId ?? '';
    const list = parEx.get(cle);
    if (list) list.push(r);
    else parEx.set(cle, [r]);
  }
  return [...parEx.entries()]
    .map(([cle, notes]) => ({
      exerciseId: cle === '' ? null : cle,
      notes: [...notes].sort(plusRecentDAbord),
    }))
    .sort(
      (a, b) =>
        b.notes.length - a.notes.length ||
        /*
         * À égalité, la plus récente d'abord — et les remarques de séance en
         * dernier : elles parlent de tout, donc de rien en particulier, et
         * les mettre en tête repousserait les mouvements hors de l'écran.
         */
        Number(a.exerciseId === null) - Number(b.exerciseId === null) ||
        plusRecentDAbord(a.notes[0]!, b.notes[0]!),
    );
}
