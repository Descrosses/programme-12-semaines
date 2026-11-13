/**
 * §11 cas 7 et §13 — signaux d'alerte.
 *
 * « Performances explosives en baisse deux semaines de suite (broad jump, box
 * jump, vitesse de barre) → lifts principaux à 3 séries, suppression du
 * conditioning. »
 *
 * Le « deload anticipé » qui suivait (« si ça persiste 10 jours ») a été
 * RETIRÉ par Guillaume : un readiness moins bon n'empêche pas d'avoir la
 * patate sous la barre, et le programme ne laisse jamais plus de trois
 * semaines dures d'affilée avant un deload prévu.
 */

import { PROGRESSION_RULES } from '../data/program';
import type { ReadinessRecord } from './types';

export interface WeeklyBest {
  week: number;
  cm: number;
  date: string;
}

export interface ExplosiveTrend {
  /** Déclenche le cas 7 : lifts principaux à 3 séries, plus de conditioning. */
  declining: boolean;
  /** Nombre de semaines consécutives en baisse, en partant de la dernière. */
  consecutiveDrops: number;
  weekly: WeeklyBest[];
  message: string;
  /**
   * La date du dernier pic, d'où part le déclin. Elle IDENTIFIE l'épisode :
   * tant que les sauts baissent depuis ce pic, c'est la même alerte, et la
   * réponse déjà donnée vaut toujours. Un nouveau pic, puis une nouvelle
   * baisse, reposent la question. `null` hors déclin.
   */
  debut: string | null;
}

/** Ce que l'utilisateur a répondu à l'alerte « sauts en baisse ». */
export interface DecisionSauts {
  /** Le `debut` de l'épisode auquel la réponse s'applique. */
  debut: string;
  accepte: boolean;
}

/**
 * Le cas 7 s'applique-t-il à la séance ? Seulement si les sauts baissent ET
 * que l'utilisateur a ACCEPTÉ d'alléger pour cet épisode.
 *
 * Avant, l'allègement tombait tout seul. Guillaume l'a vécu : ses relevés de
 * readiness étaient incomplets, les sauts « baissaient », et il ne savait
 * plus si la séance du jour était la vraie ou une version allégée. Un
 * allègement qu'on n'a pas choisi est un allègement dont on doute.
 */
export function allegementAccepte(
  trend: ExplosiveTrend,
  decision: DecisionSauts | null | undefined,
): boolean {
  return trend.declining && decision != null && decision.debut === trend.debut && decision.accepte;
}

/** Une question est-elle en attente pour l'épisode en cours ? */
export function decisionEnAttente(
  trend: ExplosiveTrend,
  decision: DecisionSauts | null | undefined,
): boolean {
  return trend.declining && (decision == null || decision.debut !== trend.debut);
}

const NO_TREND: ExplosiveTrend = {
  declining: false,
  consecutiveDrops: 0,
  weekly: [],
  message: '',
  debut: null,
};

/** Meilleur saut de chaque semaine, dans l'ordre chronologique. */
export function weeklyBests(records: ReadinessRecord[]): WeeklyBest[] {
  const byWeek = new Map<number, WeeklyBest>();
  for (const r of records) {
    if (!Number.isFinite(r.jumpCm) || r.jumpCm <= 0) continue;
    const current = byWeek.get(r.week);
    if (!current || r.jumpCm > current.cm) {
      byWeek.set(r.week, { week: r.week, cm: r.jumpCm, date: r.date });
    }
  }
  return [...byWeek.values()].sort((a, b) => a.week - b.week);
}

/**
 * @param records tous les relevés de readiness, tous ordres acceptés
 */
export function explosiveTrend(records: ReadinessRecord[]): ExplosiveTrend {
  const weekly = weeklyBests(records);
  if (weekly.length < 2) return { ...NO_TREND, weekly };

  let drops = 0;
  for (let i = weekly.length - 1; i >= 1; i--) {
    if (weekly[i]!.cm < weekly[i - 1]!.cm) drops++;
    else break;
  }

  const declining = drops >= PROGRESSION_RULES.explosiveDecline.weeks;
  if (!declining) {
    return { ...NO_TREND, weekly, consecutiveDrops: drops };
  }

  // Le déclin commence au dernier pic : c'est lui qui identifie l'épisode.
  const peakIndex = weekly.length - 1 - drops;
  const peakDate = weekly[peakIndex]!.date;

  const from = weekly[peakIndex]!.cm;
  const to = weekly[weekly.length - 1]!.cm;
  const pct = Math.round(((to - from) / from) * 1000) / 10;

  return {
    declining: true,
    consecutiveDrops: drops,
    weekly,
    debut: peakDate,
    message: `Tes sauts baissent depuis ${drops} semaines (${from} → ${to} cm, ${pct} %).`,
  };
}
