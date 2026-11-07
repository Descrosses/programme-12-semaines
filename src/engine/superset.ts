/**
 * Plusieurs mouvements dans un seul encadré — et le rythme qui va avec.
 *
 * ── Deux, puis N ───────────────────────────────────────────────────────────
 *
 * Ce module ne connaissait que la PAIRE : station A, station B, écrit en dur.
 * POWER 12 et MASS 4 n'ont jamais eu besoin d'autre chose. Mais un programme
 * apporté par quelqu'un d'autre, lui, compte ses circuits par trois — « trois
 * exercices, la séquence répétée deux fois en dix minutes » est la forme la
 * plus courante du renforcement en circuit.
 *
 * Le bloc porte donc une LISTE de mouvements. Deux reste le cas ordinaire,
 * trois ou plus devient possible, et rien dans les deux programmes existants
 * ne change : un circuit de deux se comporte exactement comme la paire d'hier.
 *
 * ── Ce que ça résout ───────────────────────────────────────────────────────
 *
 * Le lundi, l'Ab Wheel et le Roman Side Bench se font « en alternance : une
 * série de chaque, 45 s entre les stations ». À l'écran, c'étaient deux cartes
 * séparées de trois séries chacune. Pour suivre la consigne, il fallait
 * valider la série 1 de la première, faire défiler jusqu'à la seconde, valider
 * sa série 1, remonter — six allers-retours par séance, les mains pleines,
 * entre deux séries de 45 s. Personne ne le fait : on finit l'un, puis l'autre,
 * et l'alternance écrite dans le programme n'existe plus.
 *
 * ── Deux rythmes, pas un ───────────────────────────────────────────────────
 *
 * Réunir deux mouvements peut vouloir dire deux choses opposées, et les
 * confondre fausserait la séance :
 *
 *   ENCHAÎNÉ — A puis B sans aucun repos, et le repos vient après le duo.
 *   C'est le superset classique.
 *
 *   ALTERNÉ — une série de chaque, avec le MÊME repos entre chaque station.
 *   C'est ce que le programme écrit pour le tronc du lundi. Le repos n'est pas
 *   supprimé, il est juste rempli par l'autre mouvement.
 *
 * Le rythme n'est écrit nulle part comme tel : il se LIT dans les repos que
 * la trame donne déjà aux deux créneaux. Un premier créneau à `restSec: 0` ne
 * peut vouloir dire qu'une chose — on enchaîne. Deux repos non nuls veulent
 * dire qu'on alterne. Ajouter un champ pour redire ça aurait fait deux
 * vérités, et le jour où elles divergent, l'écran prescrit un rythme que le
 * programme n'écrit pas.
 *
 * Pur : aucun React, aucune base.
 */

import type { ResolvedExercise } from './getSession';
import { restLabel, workLabel } from './format';
import type { Work } from '../data/types';

export type Rythme = 'enchaine' | 'alterne';

export interface Circuit {
  kind: 'circuit';
  id: string;
  /** Les stations, dans l'ordre où elles se font. Deux au minimum. */
  exs: readonly ResolvedExercise[];
  rythme: Rythme;
  /** Nombre de tours : le plus grand des nombres de séries des stations. */
  tours: number;
  /**
   * Le repos qui compte. En enchaîné, celui de la DERNIÈRE station — c'est
   * lui qui suit le circuit. En alterné, le repos entre deux stations.
   */
  restSec: number;
  /**
   * Minutes allouées au circuit entier, ou `null` s'il n'est pas minuté.
   *
   * Lue sur la PREMIÈRE station qui en déclare une : un programme pose la
   * consigne une fois, en tête de bloc, et n'a pas à la répéter sur chaque
   * mouvement. Deux stations qui se contrediraient donneraient deux vérités —
   * la première gagne, et c'est celle qu'on lit sur la feuille.
   */
  minutesBloc: number | null;
}

export interface Solo {
  kind: 'solo';
  ex: ResolvedExercise;
}

export type Bloc = Circuit | Solo;

/**
 * Le rythme du circuit, lu dans les repos de la trame.
 *
 * Toutes les stations sauf la dernière sans repos → on enchaîne : rien ne
 * sépare les mouvements, et le repos vient après le circuit entier. Sinon on
 * alterne, et le repos écrit entre les stations est celui qu'on respecte.
 *
 * Pour deux mouvements, c'est mot pour mot la règle d'avant.
 */
export function rythmeDe(exs: readonly ResolvedExercise[]): Rythme {
  const derniere = exs[exs.length - 1];
  if (derniere === undefined) return 'alterne';
  const avant = exs.slice(0, -1);
  return avant.length > 0 && avant.every((e) => e.restSec === 0) && derniere.restSec > 0
    ? 'enchaine'
    : 'alterne';
}

/**
 * Regroupe les exercices d'une séance en blocs à afficher.
 *
 * Une paire n'est formée que par deux exercices CONSÉCUTIFS portant le même
 * identifiant. Consécutifs, parce que l'ordre d'une séance n'est pas
 * décoratif : réunir deux mouvements séparés par un troisième reviendrait à
 * déplacer ce troisième sans le dire.
 *
 * Un identifiant esseulé — l'autre moitié retirée par un deload, une
 * suspension ou un remplacement — ne forme pas de paire : l'exercice restant
 * s'affiche normalement, seul. C'est le cas qui casse si on suppose que le
 * voisin est toujours là.
 */
export function groupSupersets(exercises: ResolvedExercise[]): Bloc[] {
  const blocs: Bloc[] = [];
  for (let i = 0; i < exercises.length; i++) {
    const ex = exercises[i]!;
    if (ex.superset) {
      // Toute la suite qui porte le MÊME identifiant, pas seulement le voisin.
      let fin = i + 1;
      while (exercises[fin]?.superset === ex.superset) fin++;
      const exs = exercises.slice(i, fin);
      if (exs.length >= 2) {
        const rythme = rythmeDe(exs);
        blocs.push({
          kind: 'circuit',
          id: ex.superset,
          exs,
          rythme,
          tours: Math.max(...exs.map((e) => e.sets)),
          restSec: rythme === 'enchaine' ? exs[exs.length - 1]!.restSec : ex.restSec,
          minutesBloc: exs.find((e) => e.blocMinutes !== undefined)?.blocMinutes ?? null,
        });
        i = fin - 1; // les stations suivantes sont déjà consommées
        continue;
      }
    }
    blocs.push({ kind: 'solo', ex });
  }
  return blocs;
}

/**
 * Le travail d'UNE série : « 8 », « 8 / côté », « 25 m ».
 *
 * L'en-tête du bloc annonce déjà le nombre de tours ; répéter « 3 × » devant
 * chacun des deux mouvements donnait « 3 tours · 3 × 8 et 3 × 8 / côté », où
 * le même 3 est écrit trois fois et où plus personne ne sait lequel compte.
 */
export function travailCourt(work: Work): string {
  return workLabel(1, work).replace(/^1 × /, '');
}

/** « deux », « trois »… pour écrire la consigne en toutes lettres. */
const NOMBRES = ['', '', 'deux', 'trois', 'quatre', 'cinq', 'six'] as const;

export function enToutesLettres(n: number): string {
  return NOMBRES[n] ?? String(n);
}

/**
 * « Alternance » / « Superset » / « Circuit » — le mot qui coiffe l'encadré.
 *
 * Au-delà de deux mouvements enchaînés, « superset » devient faux : le mot
 * dit deux. C'est « circuit » que les programmes écrivent, et c'est celui que
 * la personne cherchera des yeux sur sa feuille.
 */
export function titreRythme(rythme: Rythme, stations = 2): string {
  if (rythme === 'alterne') return 'Alternance';
  return stations > 2 ? 'Circuit' : 'Superset';
}

/** La phrase qui dit comment mener le bloc, sans répéter le programme. */
export function consigneRythme(c: Circuit): string {
  const n = c.exs.length;
  return c.rythme === 'enchaine'
    ? `Les ${enToutesLettres(n)} enchaînés, sans repos. Repos ${restLabel(c.restSec)} après le ${
        n > 2 ? 'circuit' : 'duo'
      }.`
    : `Une série de chaque, ${restLabel(c.restSec)} entre les stations.`;
}

/** La lettre d'une station : A, B, C… Au-delà de Z, le rang en chiffres. */
export function lettreStation(index: number): string {
  return index < 26 ? String.fromCharCode(65 + index) : String(index + 1);
}

/**
 * Le tour en cours : le premier dont les mouvements ne sont PAS tous validés.
 *
 * C'est lui qu'on ouvre, et lui seul : trois tours dépliés en même temps
 * remettraient à l'écran les six champs qu'on cherchait à ranger.
 */
export function tourActif(tours: number, faits: (tour: number) => boolean): number {
  let i = 0;
  while (i < tours && faits(i)) i++;
  return i;
}

/**
 * Combien de séries de ce bloc sont validées, sur le total.
 *
 * Compte les SÉRIES et non les tours : un tour à moitié fait — l'Ab Wheel
 * validé, le Roman Side Bench pas encore — est un travail réel, et l'afficher
 * comme nul découragerait sans raison.
 */
export function avancement(
  c: Circuit,
  valides: (ex: ResolvedExercise) => number,
): { faites: number; total: number } {
  return {
    faites: c.exs.reduce((n, ex) => n + Math.min(valides(ex), ex.sets), 0),
    total: c.exs.reduce((n, ex) => n + ex.sets, 0),
  };
}
