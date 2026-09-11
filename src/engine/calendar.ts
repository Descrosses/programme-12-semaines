/**
 * Calendrier du programme.
 *
 * ANCRE : le LUNDI du combine initial (`settings.startDate`), saisi une fois en
 * Réglages. Une séance ne se date JAMAIS à partir de la date du jour où on
 * consulte l'écran : `dateFor()` ne lit pas l'horloge, et deux ouvertures de
 * l'appli à deux dates différentes donnent exactement le même calendrier.
 *
 *   S0  lundi    = J+0   sauts, sprints, squat 1RM
 *   S0  mardi    = J+1   tractions lestées 1RM
 *   S0  jeudi    = J+3   deadlift 1RM
 *   S0  vendredi = J+4   bench 1RM, ab wheel
 *   S0  samedi   = J+5   tractions strictes max, leg raise, farmer
 *   S0  dimanche = J+6   repos complet
 *   S1  lundi    = J+7   ← début réel du programme, semaine pleine
 *   S2  lundi    = J+14  … puis rythme hebdomadaire régulier
 *
 * Le mercredi et le dimanche de la semaine 0 sont vides : ce sont les repos qui
 * séparent les efforts de tirage (§ restructuration du combine). Ils ne sont
 * pas dans `WEEK_DAYS[0]`, donc aucune séance ne s'y crée.
 *
 * Une seule formule couvre tout, semaine 0 comprise :
 *   J + semaine × 7 + décalage du jour.
 * La semaine 0 occupe la première semaine calendaire, la semaine 1 la suivante.
 * Plus aucun cas particulier, contrairement à la version à 3 jours.
 */

import { WEEK_DAYS } from '../data/program';
import { DAY_LABELS, type DayIndex, type WeekIndex } from '../data/types';

/**
 * Décalage en jours depuis le lundi de la semaine de programme.
 *
 * Depuis que `DayIndex` couvre les sept jours réels, c'est l'identité — mais on
 * garde la fonction nommée plutôt que d'écrire `day` partout : le jour du
 * programme et le décalage calendaire sont deux idées distinctes, et les
 * confondre est exactement ce qui a produit le bug de rangement du combine.
 */
const dayOffset = (day: DayIndex): number => day;

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
  return week * 7 + dayOffset(day);
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

/**
 * Semaine de programme en cours, pour dater une photo ou un relevé.
 *
 * On prend la semaine de la dernière séance déjà passée : entre le dimanche de
 * la semaine 3 et le lundi de la semaine 4, on est encore « en semaine 3 », ce
 * qui est la lecture naturelle quand on se photographie le lundi matin.
 * `null` tant que le calendrier n'a pas d'ancre.
 */
export function currentWeek(startDate: string, todayIso: string): WeekIndex | null {
  if (!startDate) return null;
  const all = schedule(startDate);
  const first = all[0]!;
  if (todayIso < first.date) return first.week;
  let week = first.week;
  for (const s of all) {
    if (s.date > todayIso) break;
    week = s.week;
  }
  return week;
}

/** Numéro de jour ISO d'une date `YYYY-MM-DD` (0 = dimanche … 6 = samedi). */
export function weekdayOf(iso: string): number {
  return parseDate(iso).getUTCDay();
}

/** L'ancre du calendrier doit être un lundi : tout le reste en découle. */
export function isMonday(iso: string): boolean {
  return weekdayOf(iso) === 1;
}

/** Lundi le plus proche d'une date, pour proposer une correction d'ancre. */
export function nearestMonday(iso: string): string {
  const delta = 1 - weekdayOf(iso); // -5 … +1 ; 0 si déjà lundi
  return addDays(iso, delta < -3 ? delta + 7 : delta);
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
