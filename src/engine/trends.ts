/**
 * §11 cas 7 et §13 — signaux d'alerte.
 *
 * « Performances explosives en baisse deux semaines de suite (broad jump, box
 * jump, vitesse de barre) → lifts principaux à 3 séries, suppression du
 * conditioning. Si ça persiste 10 jours : deload anticipé. »
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
  /** Le déclin dure depuis plus de 10 jours → deload anticipé (§11). */
  suggestEarlyDeload: boolean;
  weekly: WeeklyBest[];
  message: string;
}

const NO_TREND: ExplosiveTrend = {
  declining: false,
  consecutiveDrops: 0,
  suggestEarlyDeload: false,
  weekly: [],
  message: '',
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
 * @param todayIso date du jour, pour mesurer la durée du déclin
 */
export function explosiveTrend(records: ReadinessRecord[], todayIso?: string): ExplosiveTrend {
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

  // Depuis quand ? Le déclin commence au dernier pic.
  const peakIndex = weekly.length - 1 - drops;
  const peakDate = weekly[peakIndex]!.date;
  const days = todayIso ? daysBetween(peakDate, todayIso) : 0;
  const suggestEarlyDeload = days >= PROGRESSION_RULES.explosiveDecline.deloadAfterDays;

  const from = weekly[peakIndex]!.cm;
  const to = weekly[weekly.length - 1]!.cm;
  const pct = Math.round(((to - from) / from) * 1000) / 10;

  return {
    declining: true,
    consecutiveDrops: drops,
    suggestEarlyDeload,
    weekly,
    message: suggestEarlyDeload
      ? `Tes sauts baissent depuis ${drops} semaines (${from} → ${to} cm, ${pct} %), et ça dure depuis ${days} jours. Le programme dit : deload anticipé.`
      : `Tes sauts baissent depuis ${drops} semaines (${from} → ${to} cm, ${pct} %). Cas 7 : lifts principaux à 3 séries, conditioning supprimé.`,
  };
}

function daysBetween(fromIso: string, toIso: string): number {
  const a = Date.parse(`${fromIso}T12:00:00Z`);
  const b = Date.parse(`${toIso}T12:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}
