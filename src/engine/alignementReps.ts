/**
 * Aligner les répétitions sur ce qui a vraiment été fait.
 *
 * ── Le besoin ──────────────────────────────────────────────────────────────
 *
 * Certains exercices ne progressent pas par la charge : au poids du corps,
 * ou chargés là où le poids ne sert à rien (un Dead Bug lesté en haut du
 * corps alors que le travail se fait avec les jambes). Quand ils deviennent
 * trop faciles, il n'y a pas de kilo à ajouter — seulement des reps.
 *
 * Si l'utilisateur fait 3 × 10 en semaine 1 là où le programme demandait
 * 3 × 6, la semaine 2 lui PROPOSE d'aligner l'attendu sur 10. Accepté, c'est
 * définitif pour la suite du programme ; refusé, la question ne revient que
 * s'il fait encore mieux.
 *
 * ── Les garde-fous ─────────────────────────────────────────────────────────
 *
 * - Jamais sur un lift principal ni un mouvement explosif : un squat à 3 × 3
 *   ne devient pas un 3 × 5 parce qu'on a ajouté deux reps un bon jour, la
 *   charge du §9 est calculée pour CE nombre de reps. Seuls les accessoires
 *   et le tronc sont concernés.
 * - Jamais en deload ni un jour de test : le deload baisse le volume exprès.
 * - Jamais vers le bas : un alignement ne réduit pas une prescription.
 * - La proposition prend le MOINS bon des tours, pas le meilleur : si les
 *   tours ont donné 12, 10, 10, l'attendu devient 10.
 *
 * Fonctions pures.
 */

import { WEEK_BLOCKS } from '../data/program';
import type { WeekIndex } from '../data/types';
import type { Occurrence } from './types';

/** Les rôles qui progressent par les reps quand la charge ne bouge plus. */
const ROLES_ALIGNABLES = new Set(['accessory', 'core']);

export interface DecisionAlignement {
  reps: number;
  accepte: boolean;
}

export interface PropositionAlignement {
  /** L'attendu actuel. */
  prevu: number;
  /** Ce qui a été tenu sur TOUS les tours la dernière fois. */
  propose: number;
  /** La semaine où ça a été fait. */
  semaine: number;
  nbTours: number;
}

/** L'exercice peut-il être aligné ? */
export function estAlignable(role: string, workKind: string, reps: unknown): boolean {
  return ROLES_ALIGNABLES.has(role) && workKind === 'reps' && typeof reps === 'number';
}

/**
 * La proposition à faire, ou `null`.
 *
 * @param prevu l'attendu de la séance affichée (déjà aligné s'il l'a été)
 * @param occurrences l'historique de l'exercice, toutes semaines
 * @param semaine la semaine affichée
 * @param decision la réponse déjà donnée pour cet exercice
 */
export function propositionAlignement(
  prevu: number,
  occurrences: readonly Occurrence[] | undefined,
  semaine: number,
  decision: DecisionAlignement | undefined,
): PropositionAlignement | null {
  if (!occurrences) return null;
  if (WEEK_BLOCKS[semaine as WeekIndex] === 'deload') return null;

  // La dernière séance faite AVANT celle-ci, hors deload.
  const avant = occurrences
    .filter(
      (o) =>
        o.week < semaine &&
        o.completed &&
        WEEK_BLOCKS[o.week as WeekIndex] !== 'deload' &&
        (o.sets?.length ?? 0) > 0,
    )
    .sort((a, b) => b.week - a.week || b.day - a.day)[0];
  if (!avant?.sets) return null;

  const reps = avant.sets.map((s) => s.reps).filter((r): r is number => typeof r === 'number');
  // Au moins deux tours, et TOUS au-dessus de l'attendu.
  if (reps.length < 2 || reps.length !== avant.sets.length) return null;
  const propose = Math.min(...reps);
  if (propose <= prevu) return null;

  // Déjà répondu à ce niveau (ou plus haut) : on ne repose pas la question.
  if (decision && decision.reps >= propose) return null;

  return { prevu, propose, semaine: avant.week, nbTours: reps.length };
}

/**
 * L'attendu après alignement : le plus grand des deux, jamais moins que la
 * prescription. Le deload et les jours de test ne sont pas alignés.
 */
export function repsAlignees(
  prescrit: number,
  aligne: number | undefined,
  enDeloadOuTest: boolean,
): number {
  if (enDeloadOuTest || aligne === undefined) return prescrit;
  return Math.max(prescrit, aligne);
}
