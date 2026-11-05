import { beforeEach, afterAll, describe, expect, it } from 'vitest';
import 'fake-indexeddb/auto';
import { db, TABLES_PAR_CYCLE } from './db';
import { supprimerCycleNonCommence } from './repo';

describe('suppression securisee des cycles prevus', () => {
  beforeEach(async () => {
    await db.open();
    for (const name of TABLES_PAR_CYCLE) await db.table(name).clear();
    await db.cycles.clear();
    await db.settings.clear();
  });
  afterAll(() => db.close());

  async function creer(statut: 'prevu' | 'en-cours' = 'prevu') {
    return db.cycles.add({
      programmeId: 'mass4', programmeVersion: '1',
      startDate: '2026-11-09', statut, endedAt: '', createdAt: '2026-11-05',
    });
  }

  it('supprime un cycle prevu sans aucune donnee', async () => {
    const id = await creer();
    expect(await supprimerCycleNonCommence(id)).toBe(true);
    expect(await db.cycles.get(id)).toBeUndefined();
  });

  it('refuse un cycle en cours meme avec zero seance terminee', async () => {
    const id = await creer('en-cours');
    expect(await supprimerCycleNonCommence(id)).toBe(false);
    expect(await db.cycles.get(id)).toBeDefined();
  });

  it('refuse un cycle prevu avec une seance non terminee', async () => {
    const id = await creer();
    await db.sessions.add({
      cycleId: id, week: 1, day: 0, date: '2026-11-09',
      status: 'planned', warmupChecked: [], notes: '',
      startedAt: Date.now(),
    });
    expect(await supprimerCycleNonCommence(id)).toBe(false);
    expect(await db.sessions.where('cycleId').equals(id).count()).toBe(1);
  });

  it('refuse un cycle prevu avec une serie enregistree', async () => {
    const id = await creer();
    await db.sets.add({
      cycleId: id, sessionId: 1, exerciseId: 'back-squat',
      week: 1, day: 0, date: '2026-11-09', setIndex: 0,
      plannedKg: 60, plannedReps: 5, targetRpeMin: null,
      targetRpeMax: null, targetRpeLabel: null,
      actualKg: 60, actualReps: 5, actualRpe: null,
      measureValue: null, measureUnit: null, failed: false,
      doneAt: Date.now(),
    });
    expect(await supprimerCycleNonCommence(id)).toBe(false);
    expect(await db.sets.where('cycleId').equals(id).count()).toBe(1);
  });

  it('refuse la suppression du cycle pointe comme actif', async () => {
    const id = await creer();
    await db.settings.put({
      id: 1, cycleActifId: id, startDate: '2026-11-09',
      oneRM: {}, bodyweightKg: null, bodyweightDate: '',
      broadJumpBaselineCm: null, ciblePoidsBasKg: null,
      ciblePoidsHautKg: null, tableauOrigine: false,
      oneRMCalibratedAt: '', soundEnabled: true,
      vibrationEnabled: true, legacyNutritionPlan: false,
    });
    expect(await supprimerCycleNonCommence(id)).toBe(false);
    expect(await db.cycles.get(id)).toBeDefined();
  });
});
