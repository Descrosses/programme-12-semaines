/**
 * Les choix d'un cycle MASS FORCE, en base : sur la ligne du cycle, refusés
 * hors liste, et emportés par l'export.
 */
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from './db';
import { enregistrerChoixForce, MASS_FORCE_PROGRAMME_ID } from './massForceRepo';
import { cycleActif, demarrerCycle, saveSet } from './repo';
import { exportAll, importAll, parseExport } from './export';
import { choixParDefaut } from '../programmes/massforce/depart';

const demarrer = () =>
  demarrerCycle({
    programmeId: MASS_FORCE_PROGRAMME_ID,
    programmeVersion: '1',
    startDate: '2026-11-16',
  });

describe('choix du cycle MASS FORCE', () => {
  beforeEach(async () => {
    await db.open();
    await Promise.all([db.cycles.clear(), db.settings.clear(), db.sets.clear()]);
  });
  afterAll(() => db.close());

  it('se rangent sur la ligne du cycle', async () => {
    const c = await demarrer();
    const choix = { ...choixParDefaut(), 'jeu-squat': 'mf-squat-smith' };
    await enregistrerChoixForce(c.id!, choix);
    expect((await cycleActif())?.massForce).toEqual({ choix });
  });

  it('un choix hors liste est refusé, et rien n’est écrit', async () => {
    const c = await demarrer();
    await expect(
      enregistrerChoixForce(c.id!, { ...choixParDefaut(), 'jeu-squat': 'mf-squat-halteres' }),
    ).rejects.toThrow(/inconnu/);
    expect((await db.cycles.get(c.id!))?.massForce).toBeUndefined();
  });

  it('survivent à un export puis un import', async () => {
    const c = await demarrer();
    const choix = { ...choixParDefaut(), 'jeu-fentes': 'mf-fentes-bulgares' };
    await enregistrerChoixForce(c.id!, choix);
    const fichier = await exportAll();
    await db.cycles.clear();
    await importAll(parseExport(JSON.stringify(fichier)));
    expect((await db.cycles.toArray())[0]?.massForce).toEqual({ choix });
  });
});

describe('séries MASS FORCE (lot 6) : cible du jour et RIR', () => {
  beforeEach(async () => {
    await db.open();
    await Promise.all([db.cycles.clear(), db.settings.clear(), db.sets.clear()]);
  });

  const serie = (setIndex: number, extra: object = {}) =>
    saveSet({
      sessionId: 1,
      exerciseId: 'mf-developpe-couche-barre',
      week: 1,
      day: 0,
      date: '2026-11-16',
      setIndex,
      plannedKg: null,
      plannedReps: 5,
      targetRPE: null,
      actualKg: 75,
      actualReps: 5,
      actualRpe: null,
      failed: false,
      ...extra,
    });

  it('écrit le % prescrit, la charge cible et le RIR ; actualRpe reste vide', async () => {
    await demarrer();
    await serie(3, { pctPrescrit: 75, kgCible: 75, rirSaisi: 2 });
    const [r] = await db.sets.toArray();
    expect(r).toMatchObject({ pctPrescrit: 75, kgCible: 75, rirSaisi: 2, actualRpe: null });
  });

  it('un RIR non saisi reste absent : jamais une valeur supposée', async () => {
    await demarrer();
    await serie(0, { pctPrescrit: 75, kgCible: 75 });
    const [r] = await db.sets.toArray();
    expect(r!.rirSaisi).toBeUndefined();
  });

  it('survit à un export puis un import', async () => {
    await demarrer();
    await serie(3, { pctPrescrit: 77.5, kgCible: 77.5, rirSaisi: 0 });
    const fichier = await exportAll();
    await db.sets.clear();
    await importAll(parseExport(JSON.stringify(fichier)));
    expect((await db.sets.toArray())[0]).toMatchObject({
      pctPrescrit: 77.5,
      kgCible: 77.5,
      rirSaisi: 0,
    });
  });
});
