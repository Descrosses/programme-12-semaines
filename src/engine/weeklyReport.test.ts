import { describe, expect, it } from 'vitest';
import {
  ALL_SECTIONS,
  buildWeeklyReport,
  formatWeeklyReport,
  reportSummary,
  type ReportSection,
  type WeeklyReportInput,
} from './weeklyReport';
import { dateFor } from './calendar';
import { WEEK_DAYS } from '../data/program';

const START = '2026-09-07';
const WEEK = 6 as const;
const DAYS = WEEK_DAYS[WEEK];
const MONDAY = dateFor(START, WEEK, 0);
const AFTER_WEEK = dateFor(START, 7, 0);

function input(patch: Partial<WeeklyReportInput> = {}): WeeklyReportInput {
  return {
    week: WEEK,
    startDate: START,
    todayIso: MONDAY,
    sessions: [],
    sets: [],
    readiness: [],
    measurements: [],
    pain: [],
    notes: [],
    ...patch,
  };
}

const set = (p: Partial<WeeklyReportInput['sets'][number]> = {}) => ({
  exerciseId: 'back-squat',
  week: WEEK,
  plannedKg: 120,
  actualKg: 120,
  actualReps: 3,
  actualRpe: 8,
  targetRpeMax: 8,
  ...p,
});

const jump = (week: number, jumpCm: number, level: 'vert' | 'orange' | 'rouge' = 'vert') => ({
  date: dateFor(START, week as 6, 0),
  week,
  jumpCm,
  level,
});

describe('bilan hebdomadaire : valeurs absentes', () => {
  it('une semaine vide dit qu’il n’y a rien, sans aucun zéro inventé', () => {
    const report = buildWeeklyReport(input());
    const text = formatWeeklyReport(report, ALL_SECTIONS);
    expect(report.hasData).toBe(false);
    expect(report.rpeAverage).toBeNull();
    expect(report.weightAverage).toBeNull();
    expect(text).toContain('Aucune donnée saisie');
    expect(text).not.toContain('RPE moyen');
    expect(text).not.toContain('POIDS');
    expect(text).not.toContain('SAUTS');
  });

  it('une charge jamais saisie n’apparaît pas, et ne devient pas 0 kg', () => {
    const report = buildWeeklyReport(input({ sets: [set({ actualKg: null })] }));
    expect(report.lifts[0]!.actualKg).toBeNull();
    const text = formatWeeklyReport(report, ALL_SECTIONS);
    expect(text).toContain('prévu 120 kg');
    expect(text).not.toContain('réalisé');
  });

  it('sans date de début, poids et douleurs restent absents', () => {
    const report = buildWeeklyReport(
      input({
        startDate: '',
        measurements: [{ date: MONDAY, weightKg: 80 }],
        pain: [{ date: MONDAY, exId: 'back-squat', during: 4, after: null, nextDay: null }],
      }),
    );
    expect(report.weightAverage).toBeNull();
    expect(report.pain).toEqual([]);
    expect(report.missed).toEqual([]);
  });
});

describe('bilan hebdomadaire : calculs', () => {
  it('compte les séances de la semaine demandée uniquement', () => {
    const report = buildWeeklyReport(
      input({
        sessions: [
          { week: WEEK, day: DAYS[0]!, status: 'done', notes: '' },
          { week: 5, day: DAYS[1]!, status: 'done', notes: '' },
        ],
      }),
    );
    expect(report.done).toBe(1);
    expect(report.planned).toBe(DAYS.length);
  });

  it('une séance à venir n’est pas manquée, une séance passée non faite l’est', () => {
    expect(buildWeeklyReport(input()).missed).toEqual([]);
    const later = buildWeeklyReport(input({ todayIso: AFTER_WEEK }));
    expect(later.missed).toHaveLength(DAYS.length);
  });

  it('signale une charge sous le plan et un RPE au-dessus de la cible', () => {
    const report = buildWeeklyReport(input({ sets: [set({ actualKg: 115, actualRpe: 9 })] }));
    const details = report.alerts.map((a) => a.detail).join(' ');
    expect(details).toContain('115 kg pour 120 kg');
    expect(details).toContain('1 série au-dessus du RPE cible');
  });

  it('une charge au-dessus du plan n’est pas une alerte', () => {
    const report = buildWeeklyReport(input({ sets: [set({ actualKg: 125 })] }));
    expect(report.alerts).toEqual([]);
  });

  it('moyenne le poids de la semaine et l’écart à la précédente', () => {
    const report = buildWeeklyReport(
      input({
        measurements: [
          { date: dateFor(START, 5, 0), weightKg: 81 },
          { date: MONDAY, weightKg: 80 },
          { date: dateFor(START, WEEK, 2), weightKg: 80.4 },
          { date: AFTER_WEEK, weightKg: 70 },
          { date: MONDAY, weightKg: null },
        ],
      }),
    );
    expect(report.weightAverage).toBe(80.2);
    expect(report.weightDelta).toBe(-0.8);
  });

  it('reprend la tendance des sauts sans regarder les semaines suivantes', () => {
    const readiness = [jump(4, 252), jump(5, 247), jump(6, 243), jump(7, 260)];
    const report = buildWeeklyReport(input({ readiness }));
    expect(report.alerts.map((a) => a.label)).toContain('sauts en baisse');
    expect(report.alerts[0]!.detail).toContain('252 cm → 247 cm → 243 cm');
  });

  it('une douleur à 0 n’est pas une douleur', () => {
    const report = buildWeeklyReport(
      input({ pain: [{ date: MONDAY, exId: 'back-squat', during: 0, after: null, nextDay: null }] }),
    );
    expect(report.pain).toEqual([]);
  });
});

describe('bilan hebdomadaire : ce que l’élève choisit d’envoyer', () => {
  const report = buildWeeklyReport(
    input({
      sets: [set()],
      measurements: [{ date: MONDAY, weightKg: 80 }],
      pain: [{ date: MONDAY, exId: 'back-squat', during: 4, after: null, nextDay: null }],
      notes: [{ exerciseId: null, week: WEEK, text: 'Genou sensible' }],
    }),
  );

  it('une rubrique décochée disparaît du texte et de la synthèse', () => {
    const sections = new Set<ReportSection>(['seances']);
    const text = formatWeeklyReport(report, sections);
    expect(text).not.toContain('ouleur');
    expect(text).not.toContain('Genou');
    expect(text).not.toContain('POIDS');
    expect(reportSummary(report, sections)).toBe('Rien à signaler dans les données envoyées.');
  });

  it('toutes rubriques cochées, la douleur et le mot apparaissent', () => {
    const text = formatWeeklyReport(report, ALL_SECTIONS, '  Peu dormi jeudi  ');
    expect(text).toContain('À regarder : douleur signalée.');
    expect(text).toContain('pendant 4/10');
    expect(text).toContain('MOT DE L’ÉLÈVE\nPeu dormi jeudi');
  });
});
