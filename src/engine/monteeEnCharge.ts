/**
 * Les paliers de la montée en charge, en kilos quand la charge de travail est
 * connue. Pur : aucune base, aucun React.
 *
 * Charge de travail inconnue (pas de 1RM saisi, pas de charge cible) : les
 * paliers restent en pourcentage, jamais un kilo inventé.
 */

import { PALIERS_MONTEE, type PalierMontee } from '../data/monteeEnCharge';
import { fr } from './format';

export interface PalierCalcule {
  reps: string;
  /** « 50 % », « 90-95 % ». */
  pct: string;
  /** « 50 kg », « 90-95 kg », ou `null` sans charge de travail. */
  kg: string | null;
}

function arrondi(kg: number, pas: number): number {
  return Math.round(kg / pas) * pas;
}

function calculer(p: PalierMontee, ct: number | null, pas: number): PalierCalcule {
  const pct = p.pct.length === 1 ? `${p.pct[0]} %` : `${p.pct[0]}-${p.pct[1]} %`;
  if (ct === null || ct <= 0) return { reps: p.reps, pct, kg: null };
  const bornes = p.pct.map((x) => arrondi((ct * x) / 100, pas));
  const kg =
    bornes.length === 1 || bornes[0] === bornes[1]
      ? `${fr(bornes[0]!)} kg`
      : `${fr(bornes[0]!)}-${fr(bornes[1]!)} kg`;
  return { reps: p.reps, pct, kg };
}

/** Les quatre paliers, pour une charge de travail donnée (ou inconnue). */
export function paliersMontee(chargeTravail: number | null, pas = 2.5): PalierCalcule[] {
  return PALIERS_MONTEE.map((p) => calculer(p, chargeTravail, pas > 0 ? pas : 2.5));
}
