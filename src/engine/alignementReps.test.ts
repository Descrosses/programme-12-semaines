/**
 * L'alignement des reps : « 3 × 10 au lieu de 3 × 6, aligner l'attendu ? ».
 *
 * L'empreinte ne voit pas cette règle (elle part d'un historique vide). Ces
 * tests fixent ce qui compte : quand on propose, quoi, et ce qui ne doit
 * JAMAIS bouger — lifts principaux, deload, prescriptions à la baisse.
 */

import { describe, expect, it } from 'vitest';
import { estAlignable, propositionAlignement, repsAlignees } from './alignementReps';
import { getSession } from './getSession';
import { EMPTY_CONTEXT, type Occurrence } from './types';
import type { DayIndex, WeekIndex } from '../data/types';

const occ = (week: number, reps: number[]): Occurrence => ({
  exerciseId: 'dead-bug-cable',
  week,
  day: 4 as DayIndex,
  kg: null,
  plannedKg: null,
  rpe: null,
  failed: false,
  targetRPE: null,
  completed: true,
  sets: reps.map((r) => ({ reps: r, kg: null })),
});

describe('quand proposer d’aligner les reps', () => {
  it('3 × 10 fait au lieu de 3 × 6 → propose 10', () => {
    const p = propositionAlignement(6, [occ(1, [10, 10, 10])], 2, undefined);
    expect(p).toEqual({ prevu: 6, propose: 10, semaine: 1, nbTours: 3 });
  });

  it('propose le MOINS bon des tours, pas le meilleur', () => {
    expect(propositionAlignement(6, [occ(1, [12, 10, 9])], 2, undefined)?.propose).toBe(9);
  });

  it('un seul tour au-dessus ne suffit pas : tous les tours doivent dépasser', () => {
    expect(propositionAlignement(6, [occ(1, [10, 6, 10])], 2, undefined)).toBeNull();
  });

  it('ne repose pas la question une fois répondu, sauf si on fait encore mieux', () => {
    const refuse = { reps: 10, accepte: false };
    expect(propositionAlignement(6, [occ(1, [10, 10, 10])], 2, refuse)).toBeNull();
    expect(propositionAlignement(6, [occ(1, [12, 12, 12])], 2, refuse)?.propose).toBe(12);
  });

  it('rien en semaine de deload, et le deload ne sert pas de référence', () => {
    expect(propositionAlignement(6, [occ(3, [10, 10])], 4, undefined)).toBeNull();
    expect(propositionAlignement(6, [occ(4, [10, 10])], 5, undefined)).toBeNull();
  });
});

describe('ce qui est aligné, et ce qui ne l’est jamais', () => {
  it('seuls les accessoires et le tronc comptés en reps', () => {
    expect(estAlignable('core', 'reps', 6)).toBe(true);
    expect(estAlignable('accessory', 'reps', 8)).toBe(true);
    expect(estAlignable('main', 'reps', 3)).toBe(false);
    expect(estAlignable('power', 'reps', 3)).toBe(false);
    expect(estAlignable('core', 'distance', null)).toBe(false);
    // Une fourchette (8-12) n'a pas de chiffre unique à aligner.
    expect(estAlignable('core', 'reps', { min: 8, max: 12 })).toBe(false);
  });

  it('jamais vers le bas, jamais en deload', () => {
    expect(repsAlignees(6, 10, false)).toBe(10);
    expect(repsAlignees(12, 10, false)).toBe(12);
    expect(repsAlignees(6, 10, true)).toBe(6);
  });

  it('dans la vraie séance : le Dead Bug passe à 10, le squat ne bouge pas', () => {
    const ctx = {
      ...EMPTY_CONTEXT,
      settings: {
        ...EMPTY_CONTEXT.settings,
        repsAlignees: { 'dead-bug-cable': 10, 'back-squat': 10 },
      },
    };
    const vendredi = getSession(2 as WeekIndex, 4 as DayIndex, ctx)!;
    const db = vendredi.exercises.find((e) => e.id === 'dead-bug-cable')!;
    expect(db.work.kind === 'reps' && db.work.reps).toBe(10);
    expect(db.adjustments.some((a) => a.source === 'alignement')).toBe(true);

    const lundi = getSession(2 as WeekIndex, 0 as DayIndex, ctx)!;
    const sq = lundi.exercises.find((e) => e.id === 'back-squat')!;
    const sans = getSession(2 as WeekIndex, 0 as DayIndex, EMPTY_CONTEXT)!.exercises.find(
      (e) => e.id === 'back-squat',
    )!;
    expect(sq.work).toEqual(sans.work);

    // En deload, le Dead Bug garde sa prescription réduite.
    const deload = getSession(4 as WeekIndex, 4 as DayIndex, ctx)!;
    const dbDeload = deload.exercises.find((e) => e.id === 'dead-bug-cable')!;
    expect(dbDeload.work.kind === 'reps' && dbDeload.work.reps).toBe(5);
  });
});
