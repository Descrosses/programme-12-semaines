/**
 * Arrondis de charge.
 *
 * Une seule règle, décidée avec Guillaume : 2,5 kg pour tout ce qui se charge
 * en barre, 2 kg pour les haltères. Chaque `LoadSpec` porte son propre `step`,
 * donc personne n'a à s'en souvenir ailleurs dans le code.
 *
 * Les trois exemples de deload qu'il a donnés valident l'arrondi « au plus
 * proche » : 80 × 0,8 = 64 → 65 ; 90 × 0,8 = 72 → 72,5 ; 95 × 0,8 = 76 → 75.
 */

import type { LoadStep } from '../data/types';

/** Arrondi au multiple de `step` le plus proche. Départage vers le haut. */
export function roundToStep(kg: number, step: LoadStep): number {
  return round2(Math.round(kg / step) * step);
}

/** Arrondi au multiple de `step` inférieur ou égal. */
export function floorToStep(kg: number, step: LoadStep): number {
  return round2(Math.floor(kg / step + 1e-9) * step);
}

/** Arrondi au multiple de `step` supérieur ou égal. */
export function ceilToStep(kg: number, step: LoadStep): number {
  return round2(Math.ceil(kg / step - 1e-9) * step);
}

/**
 * Arrondi contraint à un intervalle, pour les règles écrites en fourchette.
 * §11 cas 5 : « −5 à −7,5 % » — on cherche le multiple de `step` situé dans
 * [lo, hi] le plus proche de `lo` (le plus prudent). Si aucun multiple ne
 * tombe dans l'intervalle, on prend le plus proche de `lo`.
 */
export function roundIntoRange(lo: number, hi: number, step: LoadStep): number {
  const first = ceilToStep(lo, step);
  if (first <= hi + 1e-9) return first;
  return roundToStep(lo, step);
}

/** Évite les 92.50000000000001 dans l'affichage et les comparaisons de tests. */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Borne une charge par un plafond éventuel (RDL plafonné à 95 kg). */
export function capKg(kg: number, kgMax?: number): { kg: number; capped: boolean } {
  if (kgMax !== undefined && kg > kgMax) return { kg: kgMax, capped: true };
  return { kg, capped: false };
}
