import { beforeEach, describe, expect, it } from 'vitest';
import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { ProgrammeDB, DEFAULT_SETTINGS_ROW } from './db';
import { deleteDB, v16Schema } from './testSchemas';

const NAME = 'nutrition-v19-safety-test';
describe('nutrition v19', () => {
  beforeEach(async () => { await deleteDB(NAME); });

  it('new installations have no inherited nutrition plan', async () => {
    const db = new ProgrammeDB(NAME);
    await db.open();
    const row = await db.settings.get(1);
    expect(row?.legacyNutritionPlan ?? DEFAULT_SETTINGS_ROW.legacyNutritionPlan).toBe(false);
    expect(DEFAULT_SETTINGS_ROW.bodyweightKg).toBeNull();
    db.close();
  });

  it('existing settings, meals and measurements survive migration', async () => {
    const old = new Dexie(NAME);
    for (const [version, stores] of v16Schema()) old.version(version).stores(stores);
    await old.open();
    await old.table('settings').put({ id: 1, startDate: '2026-09-14', oneRM: {}, bodyweightKg: 78, soundEnabled: true, vibrationEnabled: true });
    await old.table('measurements').add({ date: '2026-10-01', weightKg: 78, waistCm: 82 });
    await old.table('mealLog').add({ date: '2026-10-01', mealId: 'breakfast', eaten: true });
    old.close();

    const upgraded = new ProgrammeDB(NAME);
    await upgraded.open();
    expect(upgraded.verno).toBe(19);
    expect((await upgraded.settings.get(1))?.legacyNutritionPlan).toBe(true);
    expect((await upgraded.settings.get(1))?.bodyweightKg).toBe(78);
    expect(await upgraded.measurements.count()).toBe(1);
    expect(await upgraded.mealLog.count()).toBe(1);
    upgraded.close();
  });
});
