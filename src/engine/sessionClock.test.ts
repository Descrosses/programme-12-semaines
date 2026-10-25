import { describe, expect, it } from 'vitest';
import {
  clockLabel,
  durationVerdict,
  elapsedMin,
  elapsedMs,
  formatDuration,
  gapLabel,
  isRunning,
  medianRealMin,
  OVERRUN_PCT,
  sessionDurations,
} from './sessionClock';

const MIN = 60_000;
const T0 = 1_757_000_000_000;

describe('elapsedMs', () => {
  it('mesure l’écart entre le début et maintenant quand la séance tourne', () => {
    expect(elapsedMs({ startedAt: T0 }, T0 + 47 * MIN)).toBe(47 * MIN);
  });

  it('se fige sur `finishedAt` dès que la séance est terminée', () => {
    const clock = { startedAt: T0, finishedAt: T0 + 62 * MIN };
    // Une heure plus tard, le chiffre doit être le même : c'est tout
    // l'intérêt de stocker la fin plutôt que d'arrêter un compteur.
    expect(elapsedMs(clock, T0 + 62 * MIN)).toBe(62 * MIN);
    expect(elapsedMs(clock, T0 + 300 * MIN)).toBe(62 * MIN);
  });

  it('survit à un verrouillage d’écran : la durée ne dépend pas du temps passé dans l’appli', () => {
    // Trois heures de téléphone éteint entre l'ouverture et la relecture.
    expect(elapsedMin({ startedAt: T0 }, T0 + 180 * MIN)).toBe(180);
  });

  it('rend null sans heure de début', () => {
    expect(elapsedMs({}, T0)).toBeNull();
    expect(clockLabel({}, T0)).toBeNull();
  });

  it('rend null plutôt qu’une durée négative si l’horloge recule', () => {
    expect(elapsedMs({ startedAt: T0, finishedAt: T0 - MIN }, T0)).toBeNull();
    expect(elapsedMs({ startedAt: T0 }, T0 - 5 * MIN)).toBeNull();
  });
});

describe('isRunning', () => {
  it('tourne tant que la fin n’est pas posée', () => {
    expect(isRunning({ startedAt: T0 })).toBe(true);
    expect(isRunning({ startedAt: T0, finishedAt: T0 + MIN })).toBe(false);
    expect(isRunning({})).toBe(false);
  });
});

describe('formatDuration', () => {
  it('affiche des minutes en dessous d’une heure', () => {
    expect(formatDuration(7 * MIN)).toBe('7 min');
    expect(formatDuration(48 * MIN)).toBe('48 min');
    expect(formatDuration(59 * MIN)).toBe('59 min');
  });

  it('passe en heures au-delà', () => {
    expect(formatDuration(60 * MIN)).toBe('1 h');
    expect(formatDuration(72 * MIN)).toBe('1 h 12');
    expect(formatDuration(65 * MIN)).toBe('1 h 05');
    expect(formatDuration(125 * MIN)).toBe('2 h 05');
  });

  it('ne descend jamais sous zéro', () => {
    expect(formatDuration(0)).toBe('0 min');
    expect(formatDuration(-1000)).toBe('0 min');
  });

  it('n’affiche aucune seconde : rien ne bouge chaque seconde en tête d’écran', () => {
    expect(formatDuration(47 * MIN + 29_000)).toBe('47 min');
    expect(formatDuration(47 * MIN + 31_000)).toBe('48 min');
  });
});

describe('durationVerdict', () => {
  it('donne l’écart en minutes et en pourcentage', () => {
    const v = durationVerdict(74, 60)!;
    expect(v.gapMin).toBe(14);
    expect(v.overPct).toBe(23);
    expect(v.warn).toBe(true);
  });

  it('ne signale rien tant que le dépassement reste sous 15 %', () => {
    expect(durationVerdict(69, 60)!.overPct).toBe(15);
    expect(durationVerdict(69, 60)!.warn).toBe(false);
    expect(durationVerdict(70, 60)!.warn).toBe(true);
    expect(OVERRUN_PCT).toBe(15);
  });

  it('accepte une séance plus courte que prévue, sans la peindre en rouge', () => {
    const v = durationVerdict(52, 60)!;
    expect(v.gapMin).toBe(-8);
    expect(v.overPct).toBe(-13);
    expect(v.warn).toBe(false);
  });

  it('refuse de calculer un pourcentage sur une durée prévue nulle', () => {
    expect(durationVerdict(50, 0)).toBeNull();
    expect(durationVerdict(50, Number.NaN)).toBeNull();
  });
});

describe('gapLabel', () => {
  it('écrit l’écart avec son signe', () => {
    expect(gapLabel(durationVerdict(74, 60)!)).toBe('+14 min (+23 %)');
    expect(gapLabel(durationVerdict(52, 60)!)).toBe('−8 min (−13 %)');
  });

  it('dit « pile sur le prévu » plutôt que « +0 min »', () => {
    expect(gapLabel(durationVerdict(60, 60)!)).toBe('pile sur le prévu');
  });
});

describe('sessionDurations', () => {
  const MINUTE = 60_000;
  const base = (week: number, day: number, debut: number, fin?: number) => ({
    week,
    day,
    date: `2026-09-${String(10 + week).padStart(2, '0')}`,
    startedAt: debut,
    ...(fin === undefined ? {} : { finishedAt: fin }),
  });

  it('ne retient que les séances terminées', () => {
    const rows = [
      base(1, 0, T0, T0 + 68 * MINUTE),
      // Ouverte hier, jamais fermée : son « chrono » vaut 14 h et ne dit rien.
      base(1, 2, T0, undefined),
      // Jamais ouverte du tout.
      { week: 1, day: 4, date: '2026-09-11' },
    ];
    const entries = sessionDurations(rows, () => 60);
    expect(entries).toHaveLength(1);
    expect(entries[0]!.realMin).toBe(68);
  });

  it('range les séances dans l’ordre du programme, pas de la base', () => {
    const rows = [
      base(3, 0, T0, T0 + 50 * MINUTE),
      base(1, 5, T0, T0 + 80 * MINUTE),
      base(1, 0, T0, T0 + 70 * MINUTE),
    ];
    expect(sessionDurations(rows, () => 60).map((e) => [e.week, e.day])).toEqual([
      [1, 0],
      [1, 5],
      [3, 0],
    ]);
  });

  it('attache la durée prévue du bon jour', () => {
    const rows = [base(1, 0, T0, T0 + 70 * MINUTE), base(1, 4, T0, T0 + 70 * MINUTE)];
    const entries = sessionDurations(rows, (_w, d) => (d === 0 ? 60 : 95));
    expect(entries[0]!.plannedMin).toBe(60);
    expect(entries[0]!.verdict!.warn).toBe(true);
    expect(entries[1]!.plannedMin).toBe(95);
    expect(entries[1]!.verdict!.warn).toBe(false);
  });

  it('accepte une séance sans durée prévue sans inventer de verdict', () => {
    const entries = sessionDurations([base(0, 1, T0, T0 + 40 * MINUTE)], () => null);
    expect(entries[0]!.plannedMin).toBeNull();
    expect(entries[0]!.verdict).toBeNull();
  });

  it('calcule la médiane des durées réelles', () => {
    const rows = [
      base(1, 0, T0, T0 + 60 * MINUTE),
      base(1, 2, T0, T0 + 80 * MINUTE),
      base(1, 4, T0, T0 + 70 * MINUTE),
    ];
    expect(medianRealMin(sessionDurations(rows, () => 60))).toBe(70);
    expect(medianRealMin([])).toBeNull();
  });
});
