/**
 * La durée affichée, et l'étiquette qui la promet.
 *
 * Le défaut que ces tests ferment : le §3 annonçait « 60 min » le vendredi
 * depuis le premier jour du programme, et personne ne l'a recalculé en trois
 * cycles de modifications. La séance en faisait quatre-vingts. Une étiquette
 * écrite à la main ne se contredit jamais toute seule ; celle-ci est
 * désormais tenue par un test.
 */

import { describe, expect, it } from 'vitest';
import { dureeEstimeeMin, minutesEchauffement, secondesParSerie } from './sessionDuration';
import { getSession, hasSession } from './getSession';
import { EMPTY_CONTEXT, type SessionContext } from './types';
import { BASE_SESSIONS } from '../data/baseSessions';
import { specialSession } from '../data/testSessions';
import { WEEK_DAYS } from '../data/program';
import { hold, meters, reps } from '../data/types';
import type { DayIndex, WeekIndex } from '../data/types';

const CTX: SessionContext = {
  ...EMPTY_CONTEXT,
  settings: {
    startDate: '2026-01-03',
    broadJumpBaselineCm: 240,
    tableauOrigine: false,
    oneRM: { 'back-squat': 110, 'bench-press': 115, deadlift: 140, 'weighted-pullup': 45 },
  },
};

/** « 45-75 min » → [45, 75]. « 90 min » → [90, 90]. */
function bornes(label: string): [number, number] {
  const n = [...label.matchAll(/\d+/g)].map((m) => Number(m[0]));
  return [Math.min(...n), Math.max(...n)];
}

describe('le temps d’une série', () => {
  it('une rep coûte 4 s, avec un plancher par série', () => {
    expect(secondesParSerie(reps(8))).toBe(32);
    // Une série de 2 reps ne se fait pas en huit secondes : on s'installe.
    expect(secondesParSerie(reps(2))).toBe(12);
  });

  it('un exercice par côté compte double — il se fait deux fois', () => {
    expect(secondesParSerie(reps(6, true))).toBe(secondesParSerie(reps(6)) * 2);
    expect(secondesParSerie(meters(20, true))).toBe(secondesParSerie(meters(20)) * 2);
    expect(secondesParSerie(hold(25, true))).toBe(50);
  });

  it('une fourchette de reps compte sa borne haute', () => {
    expect(secondesParSerie(reps({ min: 8, max: 12 }))).toBe(48);
  });

  it('un porté se parcourt lentement, avec un plancher lui aussi', () => {
    expect(secondesParSerie(meters(25))).toBe(40);
    expect(secondesParSerie(meters(5))).toBe(20);
  });
});

describe('l’échauffement', () => {
  it('« 8-10 min » vaut 10 : on annonce la borne haute', () => {
    expect(minutesEchauffement('8-10 min')).toBe(10);
    expect(minutesEchauffement('7-9 min')).toBe(9);
  });

  it('pas d’échauffement, pas de minutes', () => {
    expect(minutesEchauffement(undefined)).toBe(0);
  });
});

describe('les montées de charge comptent', () => {
  it('un test 1RM ne se résume pas à ses trois essais', () => {
    const sansPaliers = dureeEstimeeMin({
      readinessTest: false,
      exercises: [{ sets: 1, work: reps(1), restSec: 300 }],
    });
    const avecPaliers = dureeEstimeeMin({
      readinessTest: false,
      exercises: [{ sets: 1, work: reps(1), restSec: 300, ramp: [1, 2, 3, 4, 5] }],
    });
    // Cinq paliers à cinq minutes de repos font à eux seuls une demi-heure.
    expect(avecPaliers - sansPaliers).toBeGreaterThanOrEqual(26);
  });
});

describe('l’étiquette du §3 tient ce que la séance fait', () => {
  it('chaque séance des douze semaines tombe dans sa fourchette', () => {
    for (let w = 0; w <= 12; w++) {
      const week = w as WeekIndex;
      for (const day of WEEK_DAYS[week]) {
        if (!hasSession(week, day)) continue;
        const s = getSession(week, day, CTX);
        if (!s) continue;
        const bp = specialSession(week, day) ?? BASE_SESSIONS[day as DayIndex]!;
        const [bas, haut] = bornes(bp.durationLabel);
        const calcule = Number(s.durationLabel.replace(/\D/g, ''));
        expect(calcule, `S${week} j${day} — ${bp.durationLabel}`).toBeGreaterThanOrEqual(bas);
        expect(calcule, `S${week} j${day} — ${bp.durationLabel}`).toBeLessThanOrEqual(haut);
      }
    }
  });

  /*
   * Le garde-fou qui aurait attrapé le défaut d'origine : une étiquette doit
   * être une FOURCHETTE. « 60 min » sur une séance qui va de 52 à 92 selon le
   * bloc ne peut qu'être fausse onze semaines sur douze.
   */
  it('aucune étiquette de séance d’entraînement n’annonce un chiffre unique', () => {
    for (const bp of Object.values(BASE_SESSIONS)) {
      const [bas, haut] = bornes(bp!.durationLabel);
      expect(haut, bp!.title).toBeGreaterThan(bas);
    }
  });
});

describe('ce que la séance affiche', () => {
  it('la durée vient du calcul, plus de la trame', () => {
    // Le vendredi du bloc puissance : la trame annonçait 60 min pour tout le
    // programme, le calcul en donne plus de quatre-vingts.
    const s = getSession(9 as WeekIndex, 4 as DayIndex, CTX)!;
    expect(s.durationLabel).toMatch(/^≈ \d+ min$/);
    expect(Number(s.durationLabel.replace(/\D/g, ''))).toBeGreaterThan(80);
  });

  it('un deload est visiblement plus court que la semaine pleine', () => {
    const plein = Number(getSession(3, 0, CTX)!.durationLabel.replace(/\D/g, ''));
    const deload = Number(getSession(4, 0, CTX)!.durationLabel.replace(/\D/g, ''));
    expect(deload).toBeLessThan(plein);
  });
});
