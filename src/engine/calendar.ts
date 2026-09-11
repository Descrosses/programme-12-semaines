/**
 * Calendrier du programme.
 *
 * Origine : le SAMEDI du combine initial (`settings.startDate`).
 *
 *   S0  samedi   = J+0      S0  dimanche = J+1
 *   S1  lundi    = J+2      ← 3e jour du combine initial, il remplace le lundi
 *   S1  mercredi = J+4      ← début réel du programme
 *   S1  vendredi = J+6      S1 samedi = J+7      S1 dimanche = J+8
 *   S2  lundi    = J+9      … puis rythme hebdomadaire régulier
 *
 * Une seule formule couvre tout : J + 2 + (semaine − 1) × 7 + décalage du jour.
 */

import { WEEK_DAYS } from '../data/program';
import { DAY_LABELS, type DayIndex, type WeekIndex } from '../data/types';

/** Décalage en jours depuis le lundi de la semaine de programme. */
const DAY_OFFSET: Record<DayIndex, number> = { 0: 0, 1: 2, 2: 4, 3: 5, 4: 6 };

const MS_PER_DAY = 86_400_000;

/** `YYYY-MM-DD` → Date à midi UTC (immunise contre les fuseaux et l'heure d'été). */
export function parseDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y!, (m ?? 1) - 1, d ?? 1, 12, 0, 0));
}

export function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number): string {
  return formatDate(new Date(parseDate(iso).getTime() + days * MS_PER_DAY));
}

export function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((parseDate(toIso).getTime() - parseDate(fromIso).getTime()) / MS_PER_DAY);
}

/** Décalage, en jours depuis `startDate`, d'une case du calendrier. */
export function offsetFor(week: WeekIndex, day: DayIndex): number {
  return 2 + (week - 1) * 7 + DAY_OFFSET[day];
}

/** Date d'une séance. */
export function dateFor(startDate: string, week: WeekIndex, day: DayIndex): string {
  return addDays(startDate, offsetFor(week, day));
}

export interface ScheduledSession {
  week: WeekIndex;
  day: DayIndex;
  date: string;
  label: string;
}

/** Toutes les séances du programme, dans l'ordre chronologique. */
export function schedule(startDate: string): ScheduledSession[] {
  const out: ScheduledSession[] = [];
  for (let w = 0; w <= 12; w++) {
    const week = w as WeekIndex;
    for (const day of WEEK_DAYS[week]) {
      out.push({
        week,
        day,
        date: dateFor(startDate, week, day),
        label: DAY_LABELS[day],
      });
    }
  }
  return out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

export type TodayState =
  /** Une séance est prévue aujourd'hui. */
  | { kind: 'session'; session: ScheduledSession }
  /** Jour de repos : on annonce la prochaine séance. */
  | { kind: 'rest'; next: ScheduledSession; daysUntil: number }
  /** Le programme n'a pas encore commencé. */
  | { kind: 'before'; first: ScheduledSession; daysUntil: number }
  /** Les 12 semaines sont derrière. */
  | { kind: 'finished'; last: ScheduledSession };

/**
 * Écran « Aujourd'hui » : que fait-on maintenant ?
 * @param todayIso date du jour, `YYYY-MM-DD`
 */
export function locateToday(startDate: string, todayIso: string): TodayState | null {
  if (!startDate) return null;
  const all = schedule(startDate);
  const first = all[0]!;
  const last = all[all.length - 1]!;

  const exact = all.find((s) => s.date === todayIso);
  if (exact) return { kind: 'session', session: exact };

  if (todayIso < first.date) {
    return { kind: 'before', first, daysUntil: daysBetween(todayIso, first.date) };
  }
  const next = all.find((s) => s.date > todayIso);
  if (!next) return { kind: 'finished', last };
  return { kind: 'rest', next, daysUntil: daysBetween(todayIso, next.date) };
}

/** Séance précédant immédiatement une case donnée, pour la navigation manuelle. */
export function previousSession(startDate: string, week: WeekIndex, day: DayIndex): ScheduledSession | null {
  const all = schedule(startDate);
  const i = all.findIndex((s) => s.week === week && s.day === day);
  return i > 0 ? all[i - 1]! : null;
}

export function nextSession(startDate: string, week: WeekIndex, day: DayIndex): ScheduledSession | null {
  const all = schedule(startDate);
  const i = all.findIndex((s) => s.week === week && s.day === day);
  return i >= 0 && i < all.length - 1 ? all[i + 1]! : null;
}

/** « samedi 8 mars », pour l'en-tête de l'écran Aujourd'hui. */
export function humanDate(iso: string): string {
  const d = parseDate(iso);
  const jours = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  const mois = [
    'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
    'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
  ];
  return `${jours[d.getUTCDay()]} ${d.getUTCDate()} ${mois[d.getUTCMonth()]}`;
}
