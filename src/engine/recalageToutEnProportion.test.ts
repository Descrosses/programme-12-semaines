/**
 * Le recalage sur le réel se fait EN PROPORTION, pour toute charge sauf un
 * lest (décision de Guillaume, 22 novembre : « le plus de règles de calcul en
 * % possible »).
 *
 * Son exemple : « tu as fait 110 kg au lieu de 100 la semaine précédente,
 * aujourd'hui tu fais 115 au lieu des 105 prévus » — c'était le report en
 * KILOS (+10). En proportion, l'écart vaut ×1,10 : 105 × 1,10 = 115,5, au pas
 * de charge. Avant ce changement, seules les cases du §9 écrites en % du 1RM
 * se recalaient ainsi ; les deux charges que le programme écrit en kilos —
 * RDL et Pin Squat — reportaient l'écart en kilos.
 *
 * Le lest reste en kilos : +5 kg à la ceinture restent +5 kg, le corps porte
 * le reste de la charge.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { DayIndex, WeekIndex } from '../data/types';
import { getSession } from './getSession';
import { premierePhrase } from './apercuSeance';
import { roundToStep } from './rounding';
import { EMPTY_CONTEXT, type Occurrence, type SessionContext } from './types';

const SETTINGS = {
  ...EMPTY_CONTEXT.settings,
  startDate: '2026-08-24',
  tableauOrigine: false,
  oneRM: { 'back-squat': 140, 'bench-press': 115, deadlift: 180, 'weighted-pullup': 45 },
};

const occ = (
  exerciseId: string,
  week: number,
  day: number,
  kg: number,
  plannedKg: number,
): Occurrence => ({
  exerciseId,
  week,
  day: day as DayIndex,
  kg,
  plannedKg,
  rpe: null,
  failed: false,
  targetRPE: null,
  completed: true,
});

const exo = (id: string, week: number, day: number, history: Occurrence[] = []) => {
  const c: SessionContext = { ...EMPTY_CONTEXT, settings: SETTINGS, history: { [id]: history } };
  return getSession(week as WeekIndex, day as DayIndex, c)!.exercises.find((e) => e.id === id)!;
};

describe('en proportion, pour toute charge écrite en kilos', () => {
  it('RDL : 110 au lieu de 100 → le plan de la semaine suivante × 1,10', () => {
    const plan = exo('rdl', 3, 0).planKg!;
    const ex = exo('rdl', 3, 0, [occ('rdl', 2, 0, 110, 100)]);
    expect(ex.load.kg).toBe(roundToStep(plan * 1.1, 2.5));
    // Et pas le report en kilos, dès que les deux diffèrent.
    if (roundToStep(plan * 1.1, 2.5) !== plan + 10) expect(ex.load.kg).not.toBe(plan + 10);
    const why = ex.adjustments.find((a) => a.source === 'reel')!.why;
    // La proportion se lit dans la première phrase : la seule que la carte affiche.
    expect(premierePhrase(why)).toContain('110 % du plan');
  });

  it('une sous-performance allège aussi en proportion', () => {
    const plan = exo('rdl', 3, 0).planKg!;
    const ex = exo('rdl', 3, 0, [occ('rdl', 2, 0, 90, 100)]);
    expect(ex.load.kg).toBe(roundToStep(plan * 0.9, 2.5));
  });

  it('Pin Squat (kilos écrits en S5-7) : même règle', () => {
    const plan = exo('pin-squat', 6, 0).planKg;
    expect(plan).not.toBeNull();
    const ex = exo('pin-squat', 6, 0, [occ('pin-squat', 5, 0, 121, 110)]);
    expect(ex.load.kg).toBe(roundToStep(plan! * 1.1, 2.5));
  });
});

describe('le lest reste en kilos', () => {
  it('tractions lestées : +5 kg réels restent +5 kg', () => {
    const plan = exo('weighted-pullup', 3, 2).load.kg!;
    const ex = exo('weighted-pullup', 3, 2, [occ('weighted-pullup', 2, 2, 25, 20)]);
    expect(ex.load.shape).toBe('added');
    expect(ex.load.kg).toBe(roundToStep(plan + 5, ex.load.step));
  });
});

describe('le .md le dit (source de vérité)', () => {
  it('§11 : recalage en proportion, le lest seul en kilos', () => {
    const md = readFileSync(
      new URL('../../programme-final-12-semaines.md', import.meta.url),
      'utf8',
    );
    const p = md.slice(md.indexOf('**Recalage sur le réel'), md.indexOf('Règle générale'));
    expect(p).toContain('en **pourcentage**, jamais en kilos');
    expect(p).toContain('105 prévus deviennent 115,5');
    expect(p).toContain('**lest**');
  });
});
