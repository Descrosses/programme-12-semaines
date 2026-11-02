/**
 * Bilan hebdomadaire envoyé au coach.
 *
 * Fonctions pures : le bilan se calcule depuis ce qui a été saisi, et rien
 * d'autre. Une valeur jamais saisie reste une absence : elle disparaît du texte,
 * elle ne devient jamais un zéro.
 *
 * Aucune règle sportive nouvelle ici. Les seuls jugements repris sont ceux que
 * l'appli porte déjà : tendance des sauts (`explosiveTrend`), feu tricolore et
 * cible de RPE figée sur chaque série.
 *
 * Décocher une rubrique la retire aussi de la phrase de synthèse : une douleur
 * que l'élève choisit de ne pas envoyer ne doit pas se lire entre les lignes.
 */

import { WEEK_DAYS } from '../data/program';
import { DAY_LABELS, type DayIndex, type WeekIndex } from '../data/types';
import { EXERCISES } from '../data/exercises';
import { addDays, dateFor } from './calendar';
import { fr } from './format';
import { explosiveTrend } from './trends';
import type { ReadinessRecord } from './types';

export type ReportSection = 'seances' | 'sauts' | 'poids' | 'douleurs';

export const REPORT_SECTIONS: ReadonlyArray<{ id: ReportSection; label: string }> = [
  { id: 'seances', label: 'Séances, charges et RPE' },
  { id: 'sauts', label: 'Sauts et feu tricolore' },
  { id: 'poids', label: 'Poids, moyenne de la semaine' },
  { id: 'douleurs', label: 'Douleurs et remarques' },
];

export const ALL_SECTIONS: ReadonlySet<ReportSection> = new Set(REPORT_SECTIONS.map((s) => s.id));

/** Les mouvements détaillés dans le tableau prévu / réalisé (colonnes du §9). */
const LIFT_IDS = [
  'back-squat',
  'front-squat',
  'speed-squat',
  'deadlift',
  'rdl',
  'bench-press',
  'push-press',
  'weighted-pullup',
] as const;

/* Sous-ensembles structurels des lignes de la base : le moteur ne dépend pas de Dexie. */
export interface ReportSession {
  week: number;
  day: DayIndex;
  status: 'planned' | 'done' | 'skipped';
  notes: string;
}
export interface ReportSet {
  exerciseId: string;
  week: number;
  plannedKg: number | null;
  actualKg: number | null;
  actualReps: number | null;
  actualRpe: number | null;
  targetRpeMax: number | null;
}
export interface ReportReadiness extends ReadinessRecord {
  level: 'vert' | 'orange' | 'rouge';
}
export interface ReportMeasurement {
  date: string;
  weightKg: number | null;
}
export interface ReportPain {
  date: string;
  exId: string;
  during: number | null;
  after: number | null;
  nextDay: number | null;
}
export interface ReportNote {
  exerciseId: string | null;
  week: number;
  text: string;
}

export interface WeeklyReportInput {
  week: WeekIndex;
  /** Date de début du programme ; vide tant qu'elle n'est pas réglée. */
  startDate: string;
  todayIso: string;
  sessions: ReportSession[];
  sets: ReportSet[];
  readiness: ReportReadiness[];
  measurements: ReportMeasurement[];
  pain: ReportPain[];
  notes: ReportNote[];
}

export interface LiftLine {
  name: string;
  sets: number;
  plannedKg: number | null;
  actualKg: number | null;
  rpe: number | null;
}

export interface ReportAlert {
  section: ReportSection;
  /** Ce que dit la phrase de synthèse. */
  label: string;
  /** Le détail, chiffres compris. */
  detail: string;
}

export interface WeeklyReport {
  week: WeekIndex;
  planned: number;
  done: number;
  /** Séances sautées, ou dont la date est passée sans être faites. */
  missed: string[];
  rpeAverage: number | null;
  lifts: LiftLine[];
  jumps: number[];
  lights: { vert: number; orange: number; rouge: number };
  weightAverage: number | null;
  weightDelta: number | null;
  pain: string[];
  notes: string[];
  alerts: ReportAlert[];
  hasData: boolean;
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
}

function maxOf(values: Array<number | null>): number | null {
  const known = values.filter((v): v is number => v !== null);
  return known.length > 0 ? Math.max(...known) : null;
}

function known<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

function exerciseName(id: string): string {
  return EXERCISES[id]?.name ?? id;
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n > 1 ? 's' : ''}`;
}

export function buildWeeklyReport(input: WeeklyReportInput): WeeklyReport {
  const { week, startDate, todayIso } = input;
  const days = WEEK_DAYS[week];
  const sessions = input.sessions.filter((s) => s.week === week);

  // --- séances -------------------------------------------------------------
  const statusOf = (day: DayIndex) => sessions.find((s) => s.day === day)?.status ?? 'planned';
  const done = days.filter((d) => statusOf(d) === 'done').length;
  const missed = days
    .filter((d) => {
      const status = statusOf(d);
      if (status === 'skipped') return true;
      if (status === 'done' || !startDate) return false;
      return dateFor(startDate, week, d) < todayIso;
    })
    .map((d) => DAY_LABELS[d]);

  // --- charges -------------------------------------------------------------
  const sets = input.sets.filter((s) => s.week === week);
  const rpeAverage = average(sets.map((s) => s.actualRpe).filter(known));
  const lifts: LiftLine[] = LIFT_IDS.flatMap((id) => {
    const rows = sets.filter((s) => s.exerciseId === id);
    if (rows.length === 0) return [];
    return [
      {
        name: exerciseName(id),
        sets: rows.length,
        plannedKg: maxOf(rows.map((r) => r.plannedKg)),
        actualKg: maxOf(rows.map((r) => r.actualKg)),
        rpe: average(rows.map((r) => r.actualRpe).filter(known)),
      },
    ];
  });

  // --- sauts ---------------------------------------------------------------
  const readiness = input.readiness.filter((r) => r.week === week);
  const lights = { vert: 0, orange: 0, rouge: 0 };
  for (const r of readiness) lights[r.level]++;
  const jumps = [...readiness]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((r) => r.jumpCm)
    .filter((cm) => Number.isFinite(cm) && cm > 0);
  // La tendance s'arrête à la semaine lue : un bilan passé ne change pas après coup.
  const trend = explosiveTrend(input.readiness.filter((r) => r.week <= week));

  // --- poids et douleurs : il faut la date de début pour situer la semaine --
  let weightAverage: number | null = null;
  let weightDelta: number | null = null;
  let pain: string[] = [];
  if (startDate) {
    const first = dateFor(startDate, week, 0);
    const last = addDays(first, 6);
    const weightsBetween = (from: string, to: string) =>
      input.measurements
        .filter((m) => m.date >= from && m.date <= to)
        .map((m) => m.weightKg)
        .filter(known);
    weightAverage = average(weightsBetween(first, last));
    const previous = average(weightsBetween(addDays(first, -7), addDays(first, -1)));
    if (weightAverage !== null && previous !== null) {
      weightDelta = Math.round((weightAverage - previous) * 10) / 10;
    }
    pain = input.pain
      .filter((p) => p.date >= first && p.date <= last)
      .filter((p) => [p.during, p.after, p.nextDay].some((v) => known(v) && v > 0))
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((p) => {
        const parts = [
          known(p.during) ? `pendant ${p.during}/10` : null,
          known(p.after) ? `après ${p.after}/10` : null,
          known(p.nextDay) ? `lendemain ${p.nextDay}/10` : null,
        ].filter(known);
        return `${exerciseName(p.exId)} : ${parts.join(', ')}`;
      });
  }

  // --- remarques -----------------------------------------------------------
  const notes = [
    ...sessions.map((s) => s.notes.trim()).filter(Boolean),
    ...input.notes
      .filter((n) => n.week === week && n.text.trim())
      .map((n) =>
        n.exerciseId ? `${exerciseName(n.exerciseId)} : ${n.text.trim()}` : n.text.trim(),
      ),
  ];

  // --- points à regarder ---------------------------------------------------
  const alerts: ReportAlert[] = [];
  if (trend.declining) {
    const lastWeeks = trend.weekly.slice(-(trend.consecutiveDrops + 1));
    alerts.push({
      section: 'sauts',
      label: 'sauts en baisse',
      detail: `Sauts en baisse depuis ${trend.consecutiveDrops} semaines : ${lastWeeks.map((w) => `${fr(w.cm)} cm`).join(' → ')}.`,
    });
  }
  if (lights.orange + lights.rouge > 0) {
    alerts.push({
      section: 'sauts',
      label: 'feu tricolore dégradé',
      detail: `Feu tricolore : ${lights.orange} orange, ${lights.rouge} rouge.`,
    });
  }
  if (pain.length > 0) {
    alerts.push({
      section: 'douleurs',
      label: 'douleur signalée',
      detail: `Douleur signalée. ${pain.join(' ; ')}.`,
    });
  }
  if (missed.length > 0) {
    alerts.push({
      section: 'seances',
      label: missed.length > 1 ? 'séances manquées' : 'séance manquée',
      detail: `${missed.length > 1 ? 'Séances manquées' : 'Séance manquée'} : ${missed.join(', ')}.`,
    });
  }
  const below = lifts.filter(
    (l) => l.plannedKg !== null && l.actualKg !== null && l.actualKg < l.plannedKg,
  );
  if (below.length > 0) {
    alerts.push({
      section: 'seances',
      label: 'charge sous le plan',
      detail: `Charge sous le plan : ${below.map((l) => `${l.name} ${fr(l.actualKg!)} kg pour ${fr(l.plannedKg!)} kg`).join(' ; ')}.`,
    });
  }
  const overRpe = sets.filter(
    (s) => s.actualRpe !== null && s.targetRpeMax !== null && s.actualRpe > s.targetRpeMax,
  ).length;
  if (overRpe > 0) {
    alerts.push({
      section: 'seances',
      label: 'RPE au-dessus de la cible',
      detail: `${plural(overRpe, 'série')} au-dessus du RPE cible.`,
    });
  }

  const hasData =
    done > 0 ||
    sets.length > 0 ||
    readiness.length > 0 ||
    weightAverage !== null ||
    pain.length > 0 ||
    notes.length > 0;

  return {
    week,
    planned: days.length,
    done,
    missed,
    rpeAverage,
    lifts,
    jumps,
    lights,
    weightAverage,
    weightDelta,
    pain,
    notes,
    alerts,
    hasData,
  };
}

/** La phrase de tête, limitée aux rubriques réellement envoyées. */
export function reportSummary(
  report: WeeklyReport,
  sections: ReadonlySet<ReportSection>,
): string {
  if (!report.hasData) return 'Aucune donnée saisie pour cette semaine.';
  const labels = report.alerts.filter((a) => sections.has(a.section)).map((a) => a.label);
  if (labels.length === 0) return 'Rien à signaler dans les données envoyées.';
  return `À regarder : ${labels.join(', ')}.`;
}

/** Le texte envoyé : lisible tel quel dans un mail ou une messagerie. */
export function formatWeeklyReport(
  report: WeeklyReport,
  sections: ReadonlySet<ReportSection>,
  word = '',
): string {
  const lines: string[] = [`BILAN · SEMAINE ${report.week}`, reportSummary(report, sections)];
  const push = (title: string, body: string[]) => {
    if (body.length > 0) lines.push('', title, ...body);
  };

  push(
    'POINTS À REGARDER',
    report.alerts.filter((a) => sections.has(a.section)).map((a) => `- ${a.detail}`),
  );

  if (sections.has('seances')) {
    const body = [`Séances faites : ${report.done} sur ${report.planned}`];
    if (report.rpeAverage !== null) body.push(`RPE moyen : ${fr(report.rpeAverage)}`);
    for (const l of report.lifts) {
      // Une valeur absente n'apparaît pas : ni « 0 kg », ni case à remplir.
      const details = [
        l.plannedKg === null ? null : `prévu ${fr(l.plannedKg)} kg`,
        l.actualKg === null ? null : `réalisé ${fr(l.actualKg)} kg`,
        l.rpe === null ? null : `RPE ${fr(l.rpe)}`,
      ].filter(known);
      const suffix = details.length > 0 ? ` : ${details.join(', ')}` : '';
      body.push(`- ${l.name} (${plural(l.sets, 'série')})${suffix}`);
    }
    push('SÉANCES ET CHARGES', body);
  }

  if (sections.has('sauts')) {
    const body: string[] = [];
    if (report.jumps.length > 0) {
      body.push(`Sauts : ${report.jumps.map((cm) => `${fr(cm)} cm`).join(', ')}`);
    }
    const { vert, orange, rouge } = report.lights;
    if (vert + orange + rouge > 0) {
      body.push(`Feu tricolore : ${vert} vert, ${orange} orange, ${rouge} rouge`);
    }
    push('SAUTS', body);
  }

  if (sections.has('poids') && report.weightAverage !== null) {
    let line = `Moyenne de la semaine : ${fr(report.weightAverage)} kg`;
    if (report.weightDelta !== null) {
      const sign = report.weightDelta > 0 ? '+' : '';
      line += ` (${sign}${fr(report.weightDelta)} kg sur une semaine)`;
    }
    push('POIDS', [line]);
  }

  if (sections.has('douleurs')) {
    push('REMARQUES', report.notes.map((n) => `- ${n}`));
  }

  const message = word.trim();
  if (message) lines.push('', 'MOT DE L’ÉLÈVE', message);

  return lines.join('\n');
}
