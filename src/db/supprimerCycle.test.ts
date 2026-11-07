import { beforeEach, afterAll, describe, expect, it } from 'vitest';
import 'fake-indexeddb/auto';
import { db, TABLES_PAR_CYCLE } from './db';
import { getSession, resumesDesCycles, supprimerCycleNonCommence } from './repo';

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
      programmeId: 'mass4',
      programmeVersion: '1',
      startDate: '2026-11-09',
      statut,
      endedAt: '',
      createdAt: '2026-11-05',
    });
  }

  it('supprime un cycle prevu sans aucune donnee', async () => {
    const id = await creer();
    expect(await supprimerCycleNonCommence(id)).toBe(true);
    expect(await db.cycles.get(id)).toBeUndefined();
  });

  it('supprime un cycle en cours vierge non actif', async () => {
    const id = await creer('en-cours');
    expect(await supprimerCycleNonCommence(id)).toBe(true);
    expect(await db.cycles.get(id)).toBeUndefined();
  });

  it('refuse un cycle prevu avec une seance non terminee', async () => {
    const id = await creer();
    await db.sessions.add({
      cycleId: id,
      week: 1,
      day: 0,
      date: '2026-11-09',
      status: 'planned',
      warmupChecked: [],
      notes: '',
      startedAt: Date.now(),
    });
    expect(await supprimerCycleNonCommence(id)).toBe(false);
    expect(await db.sessions.where('cycleId').equals(id).count()).toBe(1);
  });

  it('refuse un cycle prevu avec une serie enregistree', async () => {
    const id = await creer();
    await db.sets.add({
      cycleId: id,
      sessionId: 1,
      exerciseId: 'back-squat',
      week: 1,
      day: 0,
      date: '2026-11-09',
      setIndex: 0,
      plannedKg: 60,
      plannedReps: 5,
      targetRpeMin: null,
      targetRpeMax: null,
      targetRpeLabel: null,
      actualKg: 60,
      actualReps: 5,
      actualRpe: null,
      measureValue: null,
      measureUnit: null,
      failed: false,
      doneAt: Date.now(),
    });
    expect(await supprimerCycleNonCommence(id)).toBe(false);
    expect(await db.sets.where('cycleId').equals(id).count()).toBe(1);
  });

  it('refuse une seance incomplete dans un cycle en cours', async () => {
    const id = await creer('en-cours');
    await db.sessions.add({
      cycleId: id,
      week: 1,
      day: 0,
      date: '2026-11-09',
      status: 'planned',
      warmupChecked: [],
      notes: '',
      startedAt: Date.now(),
    });
    expect(await supprimerCycleNonCommence(id)).toBe(false);
    expect(await db.cycles.get(id)).toBeDefined();
  });

  it('reaffecte le cycle actif a un autre cycle en cours', async () => {
    const autre = await creer('en-cours');
    const id = await creer('en-cours');
    await db.settings.put({
      id: 1,
      cycleActifId: id,
      startDate: '2026-11-09',
      oneRM: {},
      bodyweightKg: null,
      bodyweightDate: '',
      broadJumpBaselineCm: null,
      ciblePoidsBasKg: null,
      ciblePoidsHautKg: null,
      tableauOrigine: false,
      oneRMCalibratedAt: '',
      soundEnabled: true,
      vibrationEnabled: true,
      legacyNutritionPlan: false, ciblesNutrition: null,
    });
    expect(await supprimerCycleNonCommence(id)).toBe(true);
    expect((await db.settings.get(1))?.cycleActifId).toBe(autre);
    expect(await db.cycles.get(autre)).toBeDefined();
  });

  it('refuse la suppression du cycle pointe comme actif', async () => {
    const id = await creer();
    await db.settings.put({
      id: 1,
      cycleActifId: id,
      startDate: '2026-11-09',
      oneRM: {},
      bodyweightKg: null,
      bodyweightDate: '',
      broadJumpBaselineCm: null,
      ciblePoidsBasKg: null,
      ciblePoidsHautKg: null,
      tableauOrigine: false,
      oneRMCalibratedAt: '',
      soundEnabled: true,
      vibrationEnabled: true,
      legacyNutritionPlan: false, ciblesNutrition: null,
    });
    expect(await supprimerCycleNonCommence(id)).toBe(false);
    expect(await db.cycles.get(id)).toBeDefined();
  });
});

/*
 * L'impasse corrigée : « Supprimer » proposé, suppression refusée.
 *
 * Le bouton de l'écran Parcours se décidait sur « zéro séance faite ». Or une
 * séance seulement OUVERTE laisse une ligne en base sans être faite : le
 * bouton s'affichait, et la suppression — qui refuse la moindre trace — le
 * démentait. Les deux lisent désormais le même prédicat, `vierge`.
 */
describe('le bouton Supprimer et la suppression disent la meme chose', () => {
  beforeEach(async () => {
    await db.open();
    for (const name of TABLES_PAR_CYCLE) await db.table(name).clear();
    await db.cycles.clear();
    await db.settings.clear();
  });
  afterAll(() => db.close());

  async function creerCycle(statut: 'prevu' | 'en-cours' = 'prevu') {
    return db.cycles.add({
      programmeId: 'mass4',
      programmeVersion: '1',
      startDate: '2026-11-09',
      statut,
      endedAt: '',
      createdAt: '2026-11-05',
    });
  }

  it('un cycle sans aucune ligne est vierge, et la suppression aboutit', async () => {
    const id = await creerCycle();
    const resume = (await resumesDesCycles()).find((r) => r.cycle.id === id);
    expect(resume?.vierge).toBe(true);
    expect(await supprimerCycleNonCommence(id)).toBe(true);
  });

  it("une seance seulement ouverte n'est pas vierge, et la suppression refuse", async () => {
    const id = await creerCycle();
    await db.sessions.add({
      cycleId: id,
      week: 1,
      day: 0,
      date: '2026-11-09',
      status: 'planned',
      warmupChecked: [],
      notes: '',
      // Pas de `startedAt` : la séance a été affichée, pas commencée.
    });
    const resume = (await resumesDesCycles()).find((r) => r.cycle.id === id);
    expect(resume?.faites).toBe(0);
    expect(resume?.vierge).toBe(false);
    expect(await supprimerCycleNonCommence(id)).toBe(false);
  });

  it('une remarque suffit a retirer le bouton', async () => {
    const id = await creerCycle('en-cours');
    await db.notes.add({
      cycleId: id,
      exerciseId: null,
      week: 1,
      day: 0,
      date: '2026-11-09',
      text: 'dos sensible',
      at: Date.now(),
    });
    const resume = (await resumesDesCycles()).find((r) => r.cycle.id === id);
    expect(resume?.vierge).toBe(false);
    expect(await supprimerCycleNonCommence(id)).toBe(false);
  });
});

/*
 * Consulter n'écrit rien. `getSession` lit, et une base sans cycle le reste.
 */
describe('la lecture d’une seance ne cree aucun cycle', () => {
  beforeEach(async () => {
    await db.open();
    for (const name of TABLES_PAR_CYCLE) await db.table(name).clear();
    await db.cycles.clear();
    await db.settings.clear();
  });
  afterAll(() => db.close());

  it('getSession sur une base vide ne cree ni cycle ni seance', async () => {
    expect(await getSession(1, 0)).toBeUndefined();
    expect(await db.cycles.count()).toBe(0);
    expect(await db.sessions.count()).toBe(0);
  });
});
