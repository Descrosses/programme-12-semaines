import { describe, expect, it } from 'vitest';
import { shouldRemindSession, missingPrescribedSets, previousUniformLoad, canResumePreviousLoad } from './partialSession';
describe('séances partielles', () => {
  it('rappelle à 150 % du temps prévu, une seule fois et sans ajout', () => {
    const base = { startedAt: 1000, now: 90 * 60_000 + 1000, plannedMin: 60, addedExercise: false, dismissed: false };
    expect(shouldRemindSession(base)).toBe(true);
    expect(shouldRemindSession({ ...base, now: 89 * 60_000 })).toBe(false);
    expect(shouldRemindSession({ ...base, addedExercise: true })).toBe(false);
    expect(shouldRemindSession({ ...base, dismissed: true })).toBe(false);
    expect(shouldRemindSession({ ...base, finishedAt: 20 })).toBe(false);
  });
  it('ignore les séries vides et les index répétés', () => {
    expect(missingPrescribedSets([{ id: 'squat', sets: 2 }], { squat: [
      { setIndex: 0, actualReps: 5 }, { setIndex: 1, actualReps: null },
    ] })).toEqual(['squat']);
    expect(missingPrescribedSets([{ id: 'squat', sets: 2 }], { squat: [
      { setIndex: 0, actualReps: 5 }, { setIndex: 1, actualReps: 5 },
    ] })).toEqual([]);
  });
  it('interdit deload et changement de bloc', () => {
    expect(canResumePreviousLoad({ previousBlock: 'maxforce', currentBlock: 'deload', currentKg: 70, previousKg: 100 })).toBe(false);
    expect(canResumePreviousLoad({ previousBlock: 'accumulation', currentBlock: 'maxforce', currentKg: 100, previousKg: 90 })).toBe(false);
    expect(canResumePreviousLoad({ previousBlock: 'maxforce', currentBlock: 'maxforce', currentKg: 100, previousKg: 90 })).toBe(true);
    expect(canResumePreviousLoad({ previousBlock: 'maxforce', currentBlock: 'maxforce', currentKg: 100, previousKg: 90, previousFailed: true })).toBe(false);
    expect(canResumePreviousLoad({ previousBlock: 'maxforce', currentBlock: 'maxforce', currentKg: 100, previousKg: 90, hasVariablePrescriptions: true })).toBe(false);
    expect(canResumePreviousLoad({ previousBlock: 'test', currentBlock: 'test', currentKg: 100, previousKg: 90 })).toBe(false);
    expect(canResumePreviousLoad({ previousBlock: 'power', currentBlock: 'power', currentKg: 100, previousKg: 0 })).toBe(false);
  });
  it('ne reprend pas aveuglément une charge de série variable', () => {
    const row = (setIndex: number, actualKg: number) => ({ setIndex, actualKg, actualReps: 5, measureValue: null, failed: false });
    expect(previousUniformLoad([row(0, 100), row(1, 110)])).toBeNull();
    expect(previousUniformLoad([row(0, 100), row(1, 100)])).toBe(100);
    expect(previousUniformLoad([])).toBeNull();
  });
});
