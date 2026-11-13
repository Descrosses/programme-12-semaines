/**
 * Le report des séances de test vers la fiche Combine.
 *
 * ── Le bug que ce fichier corrige ──────────────────────────────────────────
 *
 * Un jour de combine, chaque test se fait comme une séance : on règle la
 * charge, on valide la série, on passe au test suivant. La valeur restait
 * pourtant dans l'historique des séries, et la fiche Combine — celle que
 * lisent les objectifs et le calcul des charges — restait vide en face du
 * test. Il fallait tout ressaisir une seconde fois.
 *
 * Désormais, valider une série de test REPORTE le meilleur résultat de ce
 * test dans le combine de la semaine. Ressaisir à la main reste possible :
 * c'est la même ligne, la dernière écriture gagne.
 *
 * Fonctions pures. L'écriture en base vit dans `repo.ts`.
 */

import type { CombinePhase } from '../db/db';
import { EXERCISES } from '../data/exercises';
import { COMBINE_METRICS } from '../data/testSessions';

/** Le combine que porte une semaine : 0 initial, 8 intermédiaire, 12 final. */
export function phaseDuCombine(week: number): CombinePhase | null {
  if (week === 0) return 'initial';
  if (week === 8) return 's8';
  if (week === 12) return 'final';
  return null;
}

/** Un test qui a sa case dans la fiche Combine. */
export function estMesureDuCombine(exerciseId: string): boolean {
  return (COMBINE_METRICS as readonly string[]).includes(exerciseId);
}

/** Ce qu'une série de test a mesuré : la mesure, sinon la charge, sinon les reps. */
export function valeurDeSerie(s: {
  measureValue: number | null;
  actualKg: number | null;
  actualReps: number | null;
}): number | null {
  /*
   * La première valeur RÉELLE, pas la première non nulle. Une série de 1RM
   * enregistre sa charge ET une mesure à 0 : prendre `measureValue ?? …`
   * renvoyait ce 0, et la charge n'arrivait jamais dans la fiche. Vu en
   * vérifiant le correctif dans l'application.
   */
  for (const v of [s.measureValue, s.actualKg, s.actualReps]) {
    if (typeof v === 'number' && Number.isFinite(v) && v > 0) return v;
  }
  return null;
}

/**
 * Le meilleur résultat d'un test sur plusieurs essais.
 *
 * Un sprint se gagne au plus PETIT temps ; tout le reste — charge, saut,
 * répétitions — au plus grand. Garder le dernier essai plutôt que le
 * meilleur aurait écrit un 1RM raté par-dessus le bon.
 */
export function meilleurResultat(exerciseId: string, valeurs: readonly number[]): number | null {
  if (valeurs.length === 0) return null;
  const auPlusPetit = EXERCISES[exerciseId]?.measure === 's';
  return auPlusPetit ? Math.min(...valeurs) : Math.max(...valeurs);
}
