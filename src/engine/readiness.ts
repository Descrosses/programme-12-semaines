/**
 * §4 — Readiness test : 3 broad jumps après l'échauffement, on garde le
 * meilleur, on le compare à la référence figée du combine initial.
 *
 *   ≥ −2 %        → VERT   : séance complète
 *   −2 % à −5 %   → ORANGE : −5 % sur les gros mouvements, une série
 *                            d'accessoires en moins
 *   ≤ −5 %        → ROUGE  : pas de RPE 8+, technique 3 × 3 à 65 %, tronc,
 *                            mobilité, et tu rentres
 *
 * Le « ou pire » de « −5 % ou pire → ROUGE » est inclusif : à exactement
 * −5 %, c'est rouge. C'est la lecture prudente, et la seule qui rende les
 * deux bornes du .md non contradictoires.
 */

import { READINESS_THRESHOLDS } from '../data/program';
import type { ReadinessLevel, ReadinessResult } from './types';

const LABELS: Record<ReadinessLevel, string> = {
  vert: 'VERT — séance complète.',
  orange: 'ORANGE — tu es un peu émoussé, la séance s’allège.',
  rouge: 'ROUGE — pas de travail lourd aujourd’hui.',
};

const EFFECTS: Record<ReadinessLevel, string> = {
  vert: 'Rien ne change.',
  orange:
    '−5 % sur les gros mouvements et une série de moins sur les accessoires. C’est déjà appliqué ci-dessous.',
  rouge:
    'Lift principal remplacé par 3 × 3 à 65 % de ton 1RM, tronc et mobilité conservés, tout le reste retiré. Tu rentres.',
};

/**
 * @param baselineCm référence figée (meilleur broad jump du combine initial)
 * @param jumpCm     meilleur des 3 sauts du jour
 * @returns `null` si la référence n'est pas encore définie ou si la saisie est invalide
 */
export function readiness(baselineCm: number | null, jumpCm: number | null): ReadinessResult | null {
  if (baselineCm === null || jumpCm === null) return null;
  if (!Number.isFinite(baselineCm) || !Number.isFinite(jumpCm)) return null;
  if (baselineCm <= 0 || jumpCm <= 0) return null;

  const pctDelta = ((jumpCm - baselineCm) / baselineCm) * 100;
  const level = levelFor(pctDelta);

  return {
    level,
    pctDelta: Math.round(pctDelta * 10) / 10,
    jumpCm,
    baselineCm,
    label: LABELS[level],
    effect: EFFECTS[level],
  };
}

function levelFor(pctDelta: number): ReadinessLevel {
  // Marge de 1e-9 : 148/150 doit donner exactement −1,333 %, pas −2,0000001 %.
  if (pctDelta >= READINESS_THRESHOLDS.greenPct - 1e-9) return 'vert';
  if (pctDelta > READINESS_THRESHOLDS.orangePct + 1e-9) return 'orange';
  return 'rouge';
}

/**
 * §4 — Le rouge se déclenche aussi sans test : « moins de 5 h de sommeil +
 * courbatures généralisées + échauffement anormalement lourd ». Les trois
 * conditions sont cumulatives dans le programme.
 */
export function manualRed(signals: {
  sleepUnder5h: boolean;
  generalSoreness: boolean;
  warmupFeltHeavy: boolean;
}): boolean {
  return signals.sleepUnder5h && signals.generalSoreness && signals.warmupFeltHeavy;
}

/** Meilleur des essais saisis, en ignorant les cases vides. */
export function bestJump(attempts: Array<number | null>): number | null {
  const valid = attempts.filter((a): a is number => a !== null && Number.isFinite(a) && a > 0);
  return valid.length === 0 ? null : Math.max(...valid);
}
