/**
 * Recalage des charges sur les 1RM réellement testés.
 *
 * Le tableau du §9 a été écrit en pourcentages de maxima ESTIMÉS avant le
 * combine — squat 140, bench 120, deadlift 130, tractions +42. Le combine les
 * mesure pour de vrai, et l'écart peut être énorme : un squat testé à 110
 * transforme la séance « 5×5×100, RPE 7 » de la semaine 1 en 91 % du max, soit
 * une charge quasi-maximale dès le premier jour d'accumulation.
 *
 * Ce module ne fait que deux choses : lire les tests du combine, et dire s'ils
 * s'écartent de la base qui pilote actuellement les charges. Il n'applique
 * rien — c'est Guillaume qui décide quand recaler, parce que voir son plan de
 * squat perdre 22 kg sans comprendre pourquoi serait pire que le défaut.
 */

import {
  REFERENCE_1RM,
  type CalibratedLift,
  type TestedOneRM,
} from '../data/mainLiftTable';

/** Mesure du combine → colonne du tableau §9. */
export const COMBINE_METRIC_TO_LIFT: Record<string, CalibratedLift> = {
  'test-squat-1rm': 'back-squat',
  'test-bench-1rm': 'bench-press',
  'test-deadlift-1rm': 'deadlift',
  'test-weighted-pullup-1rm': 'weighted-pullup',
};

const LIFT_LABELS: Record<CalibratedLift, string> = {
  'back-squat': 'Back Squat',
  'bench-press': 'Bench Press',
  deadlift: 'Deadlift',
  'weighted-pullup': 'Tractions lestées',
};

export function liftLabel(lift: CalibratedLift): string {
  return LIFT_LABELS[lift];
}

/** Les 1RM testés d'un combine, mis en forme pour le tableau des charges. */
export function testedFromCombine(metrics: Record<string, number | null> | undefined): TestedOneRM {
  const out: TestedOneRM = {};
  for (const [metric, lift] of Object.entries(COMBINE_METRIC_TO_LIFT)) {
    const kg = metrics?.[metric];
    if (typeof kg === 'number' && kg > 0) out[lift] = kg;
  }
  return out;
}

export interface CalibrationChange {
  lift: CalibratedLift;
  /** Base actuelle des charges. */
  from: number;
  /** Ce que le combine a mesuré. */
  to: number;
  /** Écart en pourcentage de la base actuelle, arrondi au dixième. */
  pct: number;
}

/**
 * Ce que le recalage changerait.
 *
 * Vide = rien à faire, soit parce que le combine n'a rien à dire, soit parce
 * que la base est déjà la bonne. Un écart de moins d'un demi-kilo est ignoré :
 * il ne déplacerait aucune charge après arrondi au pas de 2,5 kg.
 */
export function calibrationChanges(
  tested: TestedOneRM,
  current: Record<string, number> | undefined,
): CalibrationChange[] {
  const out: CalibrationChange[] = [];
  for (const [lift, to] of Object.entries(tested) as Array<[CalibratedLift, number]>) {
    const from = current?.[lift] ?? REFERENCE_1RM[lift];
    if (Math.abs(to - from) < 0.5) continue;
    out.push({
      lift,
      from,
      to,
      pct: Math.round(((to - from) / from) * 1000) / 10,
    });
  }
  return out;
}

/**
 * Le changement le plus lourd de conséquences.
 *
 * C'est lui qu'on met en avant : une baisse de 21 % sur le squat est le
 * message, pas le +7,7 % du deadlift qui l'accompagne.
 */
export function largestChange(changes: CalibrationChange[]): CalibrationChange | null {
  if (changes.length === 0) return null;
  return changes.reduce((a, b) => (Math.abs(b.pct) > Math.abs(a.pct) ? b : a));
}
