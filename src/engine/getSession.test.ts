/**
 * `getSession` — le générateur de séances.
 *
 * On vérifie que chaque bloc du programme produit bien la séance décrite dans
 * le .md, et que le feu tricolore modifie réellement la séance (défaut n°4 du
 * prototype).
 */

import { describe, expect, it } from 'vitest';
import { getSession, hasSession, type ResolvedExercise } from './getSession';
import { readiness } from './readiness';
import { EMPTY_CONTEXT, type Occurrence, type SessionContext } from './types';
import type { DayIndex, WeekIndex } from '../data/types';

const ONE_RM = {
  'back-squat': 140,
  'bench-press': 120,
  deadlift: 130,
  'weighted-pullup': 42,
} as const;

function ctx(over: Partial<SessionContext> = {}): SessionContext {
  return {
    ...EMPTY_CONTEXT,
    settings: { startDate: '2026-01-03', broadJumpBaselineCm: 240, oneRM: { ...ONE_RM } },
    ...over,
  };
}

function session(week: number, day: number, c: SessionContext = ctx()) {
  const s = getSession(week as WeekIndex, day as DayIndex, c);
  if (!s) throw new Error(`Pas de séance en S${week} jour ${day}`);
  return s;
}

const ids = (ex: ResolvedExercise[]) => ex.map((e) => e.id);
const find = (s: { exercises: ResolvedExercise[] }, id: string) => {
  const ex = s.exercises.find((e) => e.id === id);
  if (!ex) throw new Error(`${id} absent de la séance : ${ids(s.exercises).join(', ')}`);
  return ex;
};

// ---------------------------------------------------------------------------

describe('calendrier des séances', () => {
  it('la semaine 0 porte les trois jours du combine : samedi, dimanche, lundi', () => {
    expect(hasSession(0, 3)).toBe(true);
    expect(hasSession(0, 4)).toBe(true);
    expect(hasSession(0, 0)).toBe(true);
    // Mercredi et vendredi n'existent pas avant le début du programme.
    expect(hasSession(0, 1)).toBe(false);
    expect(hasSession(0, 2)).toBe(false);
    expect(getSession(0, 1, ctx())).toBeNull();
  });

  it('la semaine 1 n’a plus de lundi : elle démarre le mercredi', () => {
    expect(hasSession(1, 0)).toBe(false);
    expect(getSession(1, 0, ctx())).toBeNull();
    expect(hasSession(1, 1)).toBe(true);
  });

  it('le lundi de la semaine 0 est le 3e jour du combine initial', () => {
    const s = session(0, 0);
    expect(s.title).toBe('Combine initial — jour 3');
    expect(ids(s.exercises)).toEqual([
      'test-deadlift-1rm',
      'test-strict-pullup-max',
      'test-leg-raise-max',
    ]);
    expect(find(s, 'test-deadlift-1rm').ramp?.length).toBe(8);
  });
});

describe('bloc accumulation (S1-3)', () => {
  it('mercredi S1 sort les charges du tableau', () => {
    const s = session(1, 1);
    expect(s.blockName).toBe('Accumulation');
    expect(find(s, 'bench-press').loadLine).toBe('5 × 5 × 87,5 kg');
    expect(find(s, 'bench-press').restSec).toBe(180);
    expect(find(s, 'bench-press').targetRPE?.label).toBe('RPE 7');
    expect(find(s, 'weighted-pullup').loadLine).toBe('4 × 5 × +17,5 kg');
  });

  it('lundi S2 : squat 5 × 5 × 105 et RDL 3 × 8 × 85', () => {
    const s = session(2, 0);
    expect(find(s, 'back-squat').loadLine).toBe('5 × 5 × 105 kg');
    expect(find(s, 'rdl').loadLine).toBe('3 × 8 × 85 kg');
    expect(find(s, 'bulgarian-split-squat').loadLine).toBe('3 × 8 / jambe — 2 × 18 kg');
  });

  it('l’échauffement est une liste cochable, pas un paragraphe', () => {
    const s = session(2, 0);
    expect(s.warmup?.id).toBe('lower');
    expect(s.warmup?.items.length).toBe(7);
    expect(s.warmup?.items[0]).toMatchObject({ id: 'wl-velo', label: 'Vélo' });
  });

  it('le readiness test n’est prévu que les jours jambes', () => {
    expect(session(2, 0).readinessTest).toBe(true); // lundi
    expect(session(2, 1).readinessTest).toBe(false); // mercredi
    expect(session(2, 2).readinessTest).toBe(true); // vendredi
    expect(session(2, 3).readinessTest).toBe(true); // samedi
    expect(session(2, 4).readinessTest).toBe(false); // dimanche
  });
});

describe('bloc force maximale (S5-7) — §8', () => {
  it('les repos passent à 4 min sur squat et deadlift', () => {
    expect(find(session(5, 0), 'back-squat').restSec).toBe(240);
    expect(find(session(5, 3), 'deadlift').restSec).toBe(240);
    expect(find(session(5, 1), 'bench-press').restSec).toBe(210);
    expect(find(session(5, 1), 'weighted-pullup').restSec).toBe(180);
  });

  it('box jump 4 × 2, Bulgarian 4 × 5 RPE 8, hip thrust 4 × 6', () => {
    const lundi = session(5, 0);
    expect(find(lundi, 'box-jump').sets).toBe(4);
    expect(find(lundi, 'box-jump').work).toMatchObject({ reps: 2 });
    expect(find(lundi, 'bulgarian-split-squat').sets).toBe(4);
    expect(find(lundi, 'bulgarian-split-squat').targetRPE?.label).toBe('RPE 8');
    expect(find(session(5, 3), 'hip-thrust').sets).toBe(4);
  });

  it('les accessoires haut passent à 3 × 6 avec +10 %', () => {
    const row = find(session(5, 1), 'chest-supported-row');
    expect(row.sets).toBe(3);
    expect(row.work).toMatchObject({ reps: 6 });
    expect(row.load.kg).toBe(34); // 30 kg + 10 % = 33, arrondi au pas de 2 kg des haltères
  });

  it('dimanche passe tout à 3 séries et le conditioning à 6 × 20 s / 100 s', () => {
    const s = session(5, 4);
    expect(find(s, 'incline-db-press').sets).toBe(3);
    expect(find(s, 'conditioning').work).toMatchObject({ rounds: 6, easySec: 100 });
  });
});

describe('bloc puissance (S9-11) — contraste', () => {
  it('lundi : pogos et box jumps de début supprimés, contraste sur le squat', () => {
    const s = session(9, 0);
    expect(ids(s.exercises)).not.toContain('pogo-jumps');
    expect(ids(s.exercises)).not.toContain('box-jump');
    const squat = find(s, 'back-squat');
    expect(squat.contrast?.explosive).toBe('box-jump');
    expect(squat.contrast?.restAfterHeavySec).toBe(120);
    expect(squat.loadLine).toBe('4 × 2 × 117,5 kg');
  });

  it('mercredi : contraste bench / plyo push-up, 90 s après le bench (§10)', () => {
    const s = session(9, 1);
    expect(ids(s.exercises)).not.toContain('plyo-push-up');
    expect(find(s, 'bench-press').contrast).toMatchObject({
      explosive: 'plyo-push-up',
      explosiveReps: 3,
      restAfterHeavySec: 90,
    });
  });

  it('samedi : contraste deadlift / broad jump', () => {
    const s = session(9, 3);
    expect(ids(s.exercises)).not.toContain('broad-jump');
    expect(find(s, 'deadlift').contrast?.explosive).toBe('broad-jump');
    expect(find(s, 'nordic-curl').sets).toBe(2);
  });

  it('vendredi : pogos ajoutés, ni dead bug ni conditioning', () => {
    const s = session(9, 2);
    expect(ids(s.exercises)).toContain('pogo-jumps');
    expect(ids(s.exercises)).not.toContain('dead-bug-cable');
    expect(ids(s.exercises)).not.toContain('explosive-cable-row');
    expect(find(s, 'speed-squat').loadLine).toBe('8 × 2 × 85 kg');
  });

  it('aucune progression automatique : le tableau tient, la vitesse pilote', () => {
    const historique: Occurrence[] = [
      {
        exerciseId: 'back-squat',
        week: 7,
        kg: 125,
        plannedKg: 125,
        rpe: 6,
        failed: false,
        targetRPE: { min: 9, max: 9, label: 'RPE 9' },
        completed: true,
      },
    ];
    const s = session(9, 0, ctx({ history: { 'back-squat': historique } }));
    expect(find(s, 'back-squat').suggestion?.case).toBeNull();
    expect(find(s, 'back-squat').load.kg).toBe(117.5);
  });
});

describe('deload (S4) — §8', () => {
  it('les lifts tabulés prennent la valeur du tableau, pas la formule', () => {
    expect(find(session(4, 0), 'back-squat').loadLine).toBe('3 × 3 × 90 kg');
    expect(find(session(4, 0), 'rdl').loadLine).toBe('2 × 8 × 72,5 kg');
    expect(find(session(4, 3), 'front-squat').loadLine).toBe('2 × 5 × 65 kg');
  });

  it('les accessoires non tabulés passent à 2 séries et 80 % de la charge réelle', () => {
    const bulgarian = find(session(4, 0), 'bulgarian-split-squat');
    expect(bulgarian.sets).toBe(2);
    expect(bulgarian.load.kg).toBe(14); // 18 × 0,8 = 14,4 → 14 (pas de 2 kg)

    const historique: Occurrence[] = [
      {
        exerciseId: 'hip-thrust',
        week: 3,
        kg: 120,
        plannedKg: 100,
        rpe: 7,
        failed: false,
        targetRPE: { min: 8, max: 8, label: 'RPE 8' },
        completed: true,
      },
    ];
    const hip = find(session(4, 3, ctx({ history: { 'hip-thrust': historique } })), 'hip-thrust');
    expect(hip.load.kg).toBe(95); // 120 réels × 0,8 = 96 → 95
    expect(hip.sets).toBe(2);
  });

  it('le volume de sauts est divisé par deux', () => {
    const s = session(4, 0);
    expect(find(s, 'pogo-jumps').sets).toBe(2); // 3 → 2
    expect(find(s, 'box-jump').sets).toBe(2); // 4 → 2
    expect(find(session(4, 2), 'broad-jump').sets).toBe(3); // 5 → 3
  });

  it('ni Nordic ni conditioning', () => {
    expect(ids(session(4, 3).exercises)).not.toContain('nordic-curl');
    expect(ids(session(4, 4).exercises)).not.toContain('conditioning');
  });

  it('aucune cible au-dessus de RPE 6', () => {
    for (const day of [0, 1, 2, 3, 4]) {
      for (const ex of session(4, day).exercises) {
        if (ex.targetRPE) expect(ex.targetRPE.max, `${ex.id}`).toBeLessThanOrEqual(6);
      }
    }
  });
});

describe('semaine 8 — combine intermédiaire', () => {
  it('samedi : tests d’abord, deadlift et front squat de deload ensuite', () => {
    const s = session(8, 3);
    expect(ids(s.exercises)).toEqual([
      'test-broad-jump',
      'test-vertical-jump',
      'test-sprint-10m',
      'test-sprint-20m',
      'test-strict-pullup-max',
      'test-farmer-carry',
      'deadlift',
      'front-squat',
    ]);
    expect(find(s, 'deadlift').loadLine).toBe('3 × 3 × 90 kg');
    expect(find(s, 'front-squat').loadLine).toBe('2 × 4 × 70 kg');
  });

  it('mercredi S8 reste une séance de deload normale', () => {
    expect(find(session(8, 1), 'bench-press').loadLine).toBe('3 × 3 × 85 kg');
  });
});

describe('semaine 12 — taper', () => {
  it('lundi accueille le bench et le push press du tableau', () => {
    const s = session(12, 0);
    expect(find(s, 'bench-press').loadLine).toBe('3 × 2 × 85 kg');
    expect(find(s, 'push-press').loadLine).toBe('3 × 2 × 50 kg');
    expect(find(s, 'back-squat').loadLine).toBe('3 × 2 × 97,5 kg');
  });

  it('mercredi est le test deadlift, et rien d’autre', () => {
    const s = session(12, 1);
    expect(ids(s.exercises)).toEqual(['test-deadlift-1rm']);
  });

  it('vendredi reste athlétique : tests puis speed squat léger', () => {
    const s = session(12, 2);
    expect(ids(s.exercises)).toEqual([
      'test-broad-jump',
      'test-vertical-jump',
      'test-sprint-10m',
      'test-sprint-20m',
      'test-strict-pullup-max',
      'test-leg-raise-max',
      'speed-squat',
    ]);
    expect(find(s, 'speed-squat').loadLine).toBe('2 × 2 × 70 kg');
  });

  it('le front squat disparaît de la semaine 12 (« — » au tableau)', () => {
    for (const day of [0, 1, 2, 3, 4]) {
      expect(ids(session(12, day).exercises), `jour ${day}`).not.toContain('front-squat');
    }
  });
});

// ---------------------------------------------------------------------------
// §4 — le feu tricolore modifie réellement la séance
// ---------------------------------------------------------------------------

describe('readiness ORANGE', () => {
  const orange = ctx({ readiness: readiness(240, 230) }); // −4,2 %

  it('−5 % sur les gros mouvements, arrondi au 2,5 kg', () => {
    const s = session(5, 0, orange);
    expect(find(s, 'back-squat').load.kg).toBe(110); // 115 × 0,95 = 109,25 → 110
    expect(find(s, 'rdl').load.kg).toBe(85); // 90 × 0,95 = 85,5 → 85
  });

  it('−5 % au Bulgarian, arrondi au 2 kg', () => {
    const bulgarian = find(session(5, 0, orange), 'bulgarian-split-squat');
    expect(bulgarian.load.kg).toBe(18); // 18 × 0,95 = 17,1 → 18 (pas de 2 kg)
  });

  it('une série de moins sur les accessoires', () => {
    const vert = session(5, 0);
    const o = session(5, 0, orange);
    expect(find(vert, 'bulgarian-split-squat').sets).toBe(4);
    expect(find(o, 'bulgarian-split-squat').sets).toBe(3);
  });

  it('la séance dit ce qu’elle a changé', () => {
    const s = session(5, 0, orange);
    expect(s.adjustments.some((a) => a.source === 'orange')).toBe(true);
    expect(find(s, 'back-squat').adjustments.some((a) => a.source === 'orange')).toBe(true);
  });

  it('la suggestion de progression est allégée elle aussi', () => {
    const historique: Occurrence[] = [
      {
        exerciseId: 'back-squat',
        week: 4,
        kg: 90,
        plannedKg: 90,
        rpe: 3,
        failed: false,
        targetRPE: { min: 5, max: 5, label: 'RPE 5' },
        completed: true,
      },
    ];
    const s = session(5, 0, ctx({ readiness: readiness(240, 230), history: { 'back-squat': historique } }));
    const squat = find(s, 'back-squat');
    expect(squat.suggestion?.case).toBe(2);
    // 115 + 5 = 120, puis −5 % = 114 → 115
    expect(squat.suggestion?.suggestedKg).toBe(115);
  });
});

describe('readiness ROUGE', () => {
  const rouge = ctx({ readiness: readiness(240, 220) }); // −8,3 %

  it('le lift principal devient 3 × 3 à 65 % du 1RM testé', () => {
    const squat = find(session(5, 0, rouge), 'back-squat');
    expect(squat.sets).toBe(3);
    expect(squat.work).toMatchObject({ reps: 3 });
    expect(squat.load.kg).toBe(90); // 140 × 0,65 = 91 → 90
    expect(squat.loadLine).toBe('3 × 3 × 90 kg');
    expect(squat.targetRPE).toBeNull();
  });

  it('il ne reste que le lift principal, le tronc et la mobilité', () => {
    expect(ids(session(5, 0, rouge).exercises)).toEqual(['back-squat', 'ab-wheel']);
    expect(ids(session(5, 3, rouge).exercises)).toEqual(['deadlift', 'copenhagen-plank']);
  });

  it('aucun mouvement explosif ne survit', () => {
    for (const day of [0, 2, 3]) {
      for (const ex of session(5, day, rouge).exercises) {
        expect(ex.def.explosive, `${ex.id}`).not.toBe(true);
      }
    }
  });

  it('sans 1RM renseigné, l’appli le dit au lieu d’inventer une charge', () => {
    const sansRM = ctx({ readiness: readiness(240, 220) });
    sansRM.settings = { ...sansRM.settings, oneRM: {} };
    const squat = find(session(5, 0, sansRM), 'back-squat');
    expect(squat.load.kg).toBeNull();
    expect(squat.notes.join(' ')).toContain('Renseigne ton 1RM');
  });

  it('aucune suggestion de progression un jour rouge', () => {
    expect(find(session(5, 0, rouge), 'back-squat').suggestion).toBeNull();
  });
});

describe('readiness VERT', () => {
  it('ne change strictement rien', () => {
    const vert = ctx({ readiness: readiness(240, 245) });
    expect(session(5, 0, vert).exercises.map((e) => e.loadLine)).toEqual(
      session(5, 0).exercises.map((e) => e.loadLine),
    );
  });
});

describe('§11 cas 7 — sauts en baisse', () => {
  const decline = ctx({ explosiveDecline: true });

  it('les lifts principaux passent à 3 séries', () => {
    expect(find(session(5, 0), 'back-squat').sets).toBe(5);
    expect(find(session(5, 0, decline), 'back-squat').sets).toBe(3);
  });

  it('le conditioning disparaît', () => {
    expect(ids(session(5, 4).exercises)).toContain('conditioning');
    expect(ids(session(5, 4, decline).exercises)).not.toContain('conditioning');
  });

  it('les accessoires ne sont pas touchés', () => {
    expect(find(session(5, 0, decline), 'bulgarian-split-squat').sets).toBe(4);
  });
});

// ---------------------------------------------------------------------------

describe('robustesse — toutes les séances du programme', () => {
  it('se construisent sans erreur, avec une ligne de charge non vide', () => {
    for (let week = 0; week <= 12; week++) {
      for (const day of [0, 1, 2, 3, 4] as DayIndex[]) {
        if (!hasSession(week as WeekIndex, day)) continue;
        const s = getSession(week as WeekIndex, day, ctx())!;
        expect(s, `S${week} jour ${day}`).not.toBeNull();
        expect(s.exercises.length, `S${week} jour ${day}`).toBeGreaterThan(0);
        for (const ex of s.exercises) {
          expect(ex.loadLine.length, `S${week} j${day} ${ex.id}`).toBeGreaterThan(0);
          expect(ex.restSec, `S${week} j${day} ${ex.id}`).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });

  it('résistent aux trois états du feu tricolore', () => {
    for (const cm of [245, 230, 215]) {
      const c = ctx({ readiness: readiness(240, cm) });
      for (let week = 1; week <= 12; week++) {
        for (const day of [0, 1, 2, 3, 4] as DayIndex[]) {
          if (!hasSession(week as WeekIndex, day)) continue;
          expect(() => getSession(week as WeekIndex, day, c)).not.toThrow();
        }
      }
    }
  });
});
