/**
 * La saisie tour par tour d'un circuit FEMMES — fonctions pures.
 *
 * L'écran de séance FEMMES se lit désormais comme celui de POWER : chaque
 * tour d'un exercice se valide sur sa ligne. La progression des charges, elle,
 * n'a pas changé : elle lit `actual` (ce qui a été fait) et `kg` (la charge
 * utilisée). Ces deux champs sont donc RECALCULÉS à chaque tour :
 *
 * - `actual` = le PLUS PETIT nombre fait sur les tours validés. La cible est
 *   atteinte quand chaque tour l'atteint, pas quand le premier, frais, la
 *   dépasse.
 * - `kg` = la charge du DERNIER tour validé : c'est celle qu'on a gardée.
 */

import type { DayIndex, Version } from '../../data/femmes/types';
import type { ExerciseRecord, Ressenti, TourFait } from './types';

export interface ContexteTour {
  exerciseId: string;
  week: number;
  day: DayIndex;
  date: string;
  version: Version;
  planned: number | null;
}

function synthese(tours: readonly (TourFait | null)[]): {
  actual: number | null;
  kg: number | null;
} {
  const faits = tours.filter((t): t is TourFait => t !== null);
  if (faits.length === 0) return { actual: null, kg: null };
  const avecCharge = faits.filter((t) => t.kg !== null);
  return {
    actual: Math.min(...faits.map((t) => t.reps)),
    kg: avecCharge.length > 0 ? avecCharge[avecCharge.length - 1]!.kg : null,
  };
}

/** Le record d'un exercice après la validation (ou la correction) d'un tour. */
export function appliquerTour(
  ancien: ExerciseRecord | null,
  ctx: ContexteTour,
  index: number,
  tour: TourFait,
): ExerciseRecord {
  const tours = [...(ancien?.tours ?? [])];
  while (tours.length <= index) tours.push(null);
  tours[index] = tour;
  return {
    exerciseId: ctx.exerciseId,
    week: ctx.week,
    day: ctx.day,
    date: ctx.date,
    version: ctx.version,
    planned: ctx.planned,
    ressenti: ancien?.ressenti ?? null,
    remarque: ancien?.remarque ?? null,
    tours,
    ...synthese(tours),
  };
}

/** Le record après un ressenti ou une remarque — les tours ne bougent pas. */
export function appliquerNote(
  ancien: ExerciseRecord | null,
  ctx: ContexteTour,
  patch: { ressenti?: Ressenti | null; remarque?: string | null },
): ExerciseRecord {
  const tours = ancien?.tours ?? [];
  return {
    exerciseId: ctx.exerciseId,
    week: ctx.week,
    day: ctx.day,
    date: ctx.date,
    version: ctx.version,
    planned: ctx.planned,
    actual: ancien?.actual ?? null,
    kg: ancien?.kg ?? null,
    tours,
    ressenti: patch.ressenti !== undefined ? patch.ressenti : (ancien?.ressenti ?? null),
    remarque: patch.remarque !== undefined ? patch.remarque : (ancien?.remarque ?? null),
  };
}

/** Le tour `index` est-il validé ? */
export function tourValide(
  record: ExerciseRecord | null | undefined,
  index: number,
): TourFait | null {
  return record?.tours?.[index] ?? null;
}

/** Combien de tours validés sur les `prevus`. */
export function toursValides(record: ExerciseRecord | null | undefined, prevus: number): number {
  let n = 0;
  for (let i = 0; i < prevus; i++) if (tourValide(record, i) !== null) n++;
  return n;
}
