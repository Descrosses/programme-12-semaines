/**
 * Le cycle du tronc, l'adaptation à l'adducteur, et le deload qui n'en était
 * pas un.
 *
 * Trois défauts sont verrouillés ici :
 *
 * 1. `role: 'core'` et `role: 'carry'` ne tombaient dans aucune branche du
 *    deload. Un dimanche de semaine 4 sortait avec le volume d'une semaine
 *    pleine, dans la semaine censée dissiper la fatigue.
 * 2. La rotation était la seule fonction du tronc sans expression en
 *    puissance : le Cable Chop restait identique de la semaine 1 à la 11.
 * 3. Un exercice douloureux n'avait aucun moyen d'être retiré sans être
 *    supprimé du catalogue — ce qui aurait effacé l'historique.
 */

import { describe, expect, it } from 'vitest';
import { getSession, type ResolvedExercise } from './getSession';
import { EMPTY_CONTEXT, type SessionContext } from './types';
import { readiness } from './readiness';
import { EXERCISES } from '../data/exercises';
import { DELOAD_CORE } from '../data/blockRules';
import type { DayIndex, WeekIndex } from '../data/types';

const ONE_RM = {
  'back-squat': 110,
  'bench-press': 115,
  deadlift: 140,
  'weighted-pullup': 45,
} as const;

const ctx = (over: Partial<SessionContext> = {}): SessionContext => ({
  ...EMPTY_CONTEXT,
  settings: { startDate: '2026-01-03', broadJumpBaselineCm: 240, oneRM: { ...ONE_RM } },
  ...over,
});

function session(week: number, day: number, c: SessionContext = ctx()) {
  const s = getSession(week as WeekIndex, day as DayIndex, c);
  if (!s) throw new Error(`Pas de séance en S${week} jour ${day}`);
  return s;
}

const ids = (ex: ResolvedExercise[]) => ex.map((e) => e.id);
const trouve = (week: number, day: number, id: string) => {
  const ex = session(week, day).exercises.find((e) => e.id === id);
  if (!ex) throw new Error(`${id} absent de S${week} jour ${day}`);
  return ex;
};
const DIMANCHE = 6;

// ---------------------------------------------------------------------------

describe('Landmine Rotation — elle remplace le chop, elle ne s’y ajoute pas', () => {
  it('les semaines 1 à 4 gardent le Cable Chop et ignorent la rotation', () => {
    for (const w of [1, 2, 3, 4]) {
      const noms = ids(session(w, DIMANCHE).exercises);
      expect(noms, `S${w}`).toContain('cable-chop');
      expect(noms, `S${w}`).not.toContain('landmine-rotation');
    }
  });

  it('à partir de la semaine 5, le chop disparaît et la rotation ouvre la séance', () => {
    for (const w of [5, 6, 7, 9, 10, 11]) {
      const noms = ids(session(w, DIMANCHE).exercises);
      expect(noms, `S${w}`).not.toContain('cable-chop');
      expect(noms[0], `S${w}`).toBe('landmine-rotation');
    }
  });

  it('force max : 3 × 5/côté, repos 75 s', () => {
    for (const w of [5, 6, 7]) {
      const ex = trouve(w, DIMANCHE, 'landmine-rotation');
      expect(ex.loadLine, `S${w}`).toBe('3 × 5 / côté');
      expect(ex.restSec, `S${w}`).toBe(75);
    }
  });

  it('puissance : 3 × 4/côté, repos 90 s, intention explosive', () => {
    for (const w of [9, 10, 11]) {
      const ex = trouve(w, DIMANCHE, 'landmine-rotation');
      expect(ex.loadLine, `S${w}`).toBe('3 × 4 / côté');
      expect(ex.restSec, `S${w}`).toBe(90);
      expect(ex.notes.join(' '), `S${w}`).toMatch(/vitesse prime/i);
    }
  });

  it('semaine 8 : 2 × 4/côté sur le dimanche du combine intermédiaire', () => {
    const ex = trouve(8, DIMANCHE, 'landmine-rotation');
    expect(ex.loadLine).toBe('2 × 4 / côté');
    expect(ids(session(8, DIMANCHE).exercises)).not.toContain('cable-chop');
  });

  it('semaine 12 : ni chop ni rotation, ce sont les tests', () => {
    const noms = ids(session(12, DIMANCHE).exercises);
    expect(noms).not.toContain('landmine-rotation');
    expect(noms).not.toContain('cable-chop');
  });

  /*
   * Le garde-fou de la consigne « ne pas augmenter le nombre total
   * d'exercices » : le dimanche de la semaine 5 doit compter autant
   * d'exercices que celui de la semaine 3.
   */
  it('le dimanche ne gagne aucun exercice au passage', () => {
    expect(session(5, DIMANCHE).exercises).toHaveLength(session(3, DIMANCHE).exercises.length);
  });

  it('elle n’apparaît aucun autre jour de la semaine', () => {
    for (const w of [5, 9]) {
      for (const d of [0, 2, 4, 5]) {
        expect(ids(session(w, d).exercises), `S${w} j${d}`).not.toContain('landmine-rotation');
      }
    }
  });
});

describe('le deload touche enfin le tronc et les portés', () => {
  it('chaque exercice de la table tombe exactement à sa valeur de deload', () => {
    const attendu: Record<string, { jour: number; ligne: string }> = {
      'ab-wheel': { jour: 0, ligne: '2 × 6 — poids du corps' },
      'pallof-press': { jour: 2, ligne: '2 × 5 / côté' },
      'dead-bug-cable': { jour: 4, ligne: '2 × 5 / côté' },
      'bear-crawl': { jour: DIMANCHE, ligne: '2 × 15 m' },
      'hanging-leg-raise': { jour: DIMANCHE, ligne: '2 × 6 — poids du corps' },
      'cable-chop': { jour: DIMANCHE, ligne: '2 × 6 / côté' },
    };
    for (const [id, { jour, ligne }] of Object.entries(attendu)) {
      expect(trouve(4, jour, id).loadLine, id).toBe(ligne);
    }
  });

  it('les portés sont raccourcis ET allégés de 20 %', () => {
    // Farmer : 4 × 25 m à 2 × 34 kg → 2 × 20 m à 2 × 28 kg (27,2 arrondi).
    expect(trouve(4, 4, 'farmer-carry').loadLine).toBe('2 × 20 m — 2 × 28 kg');
    // Suitcase : 3 × 30 m/côté à 32 kg → 2 × 20 m/côté à 26 kg (25,6 arrondi).
    expect(trouve(4, 5, 'suitcase-carry').loadLine).toBe('2 × 20 m / côté × 26 kg');
  });

  it('hors deload, rien n’est touché', () => {
    expect(trouve(3, 0, 'ab-wheel').loadLine).toBe('3 × 8 — poids du corps');
    expect(trouve(3, 4, 'farmer-carry').loadLine).toBe('4 × 25 m — 2 × 34 kg');
    expect(trouve(3, 5, 'suitcase-carry').loadLine).toBe('3 × 30 m / côté × 32 kg');
  });

  /*
   * Le piège d'une réduction appliquée deux fois : une fois par la table du
   * tronc, une fois par la branche des accessoires. Aucun exercice de la
   * table ne doit descendre sous 2 séries.
   */
  it('la réduction n’est jamais appliquée deux fois', () => {
    for (const w of [4, 8]) {
      for (const d of [0, 2, 4, 5, DIMANCHE]) {
        const s = getSession(w as WeekIndex, d as DayIndex, ctx());
        if (!s) continue;
        for (const ex of s.exercises) {
          if (ex.def.role !== 'core' && ex.def.role !== 'carry') continue;
          expect(ex.sets, `S${w} j${d} ${ex.id}`).toBeGreaterThanOrEqual(2);
        }
      }
    }
  });

  it('la table de deload ne vise que des exercices qui existent', () => {
    for (const id of Object.keys(DELOAD_CORE)) expect(EXERCISES[id], id).toBeDefined();
  });

  it('la séance dit qu’elle a allégé le tronc', () => {
    const chop = trouve(4, DIMANCHE, 'cable-chop');
    expect(chop.adjustments.map((a) => a.what)).toContain('3 × 8 / côté → 2 × 6 / côté');
  });
});

describe('Copenhagen Plank — suspendu, pas supprimé', () => {
  it('il ne figure dans aucune séance, quelle que soit la semaine', () => {
    for (let w = 1; w <= 12; w++) {
      for (const d of [0, 2, 4, 5, DIMANCHE]) {
        const s = getSession(w as WeekIndex, d as DayIndex, ctx());
        expect(ids(s?.exercises ?? []), `S${w} j${d}`).not.toContain('copenhagen-plank');
      }
    }
  });

  it('le samedi dit pourquoi, au lieu de le faire disparaître en silence', () => {
    const s = session(3, 5);
    expect(s.suspended.map((x) => x.id)).toEqual(['copenhagen-plank']);
    expect(s.suspended[0]!.reason).toMatch(/adducteur gauche/i);
    // Aucune semaine de reprise écrite : elle dépend des symptômes.
    expect(s.suspended[0]!.reason).not.toMatch(/semaine \d/i);
  });

  it('il reste au catalogue — sinon l’historique des semaines 1-3 serait orphelin', () => {
    expect(EXERCISES['copenhagen-plank']).toBeDefined();
    expect(EXERCISES['copenhagen-plank']!.suspended).toBeDefined();
  });

  it('une suspension passe avant le feu tricolore et avant le deload', () => {
    const rouge = ctx({ readiness: readiness(150, 240) });
    expect(ids(session(5, 5, rouge).exercises)).not.toContain('copenhagen-plank');
    expect(ids(session(4, 5).exercises)).not.toContain('copenhagen-plank');
  });

  it('rien ne le remplace : le samedi ne gagne aucun exercice', () => {
    expect(ids(session(3, 5).exercises)).toEqual([
      'broad-jump',
      'deadlift',
      'front-squat',
      'hip-thrust',
      'nordic-curl',
      'single-leg-rdl',
      'suitcase-carry',
    ]);
  });
});

describe('suivi de douleur — seulement là où il a un sens', () => {
  it('les deux mouvements symptomatiques le portent', () => {
    expect(EXERCISES['back-squat']!.painWatch).toMatch(/adducteur gauche/i);
    expect(EXERCISES['bulgarian-split-squat']!.painWatch).toMatch(/adducteur gauche/i);
  });

  it('et personne d’autre — un curseur de douleur partout ferait un questionnaire', () => {
    const avec = Object.values(EXERCISES)
      .filter((e) => e.painWatch)
      .map((e) => e.id)
      .sort();
    expect(avec).toEqual(['back-squat', 'bulgarian-split-squat']);
  });

  it('les mouvements surveillés gardent leur programmation, avec un rappel', () => {
    for (const id of [
      'front-squat',
      'deadlift',
      'single-leg-rdl',
      'hip-thrust',
      'farmer-carry',
      'suitcase-carry',
      'lateral-bound',
    ]) {
      expect(EXERCISES[id]!.cues?.join(' '), id).toMatch(/adducteur gauche|aucune douleur/i);
      expect(EXERCISES[id]!.suspended, id).toBeUndefined();
    }
  });

  it('le Bulgarian conditionne sa progression à la tolérance, pas au seul RPE', () => {
    expect(EXERCISES['bulgarian-split-squat']!.progressionRule).toMatch(/tolérance passe avant/i);
  });
});
