/**
 * Les choix d'un cycle MASS FORCE, en base : sur la ligne du cycle, refusés
 * hors liste, et emportés par l'export.
 */
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from './db';
import { enregistrerChoixForce, MASS_FORCE_PROGRAMME_ID } from './massForceRepo';
import { cycleActif, demarrerCycle } from './repo';
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
    await Promise.all([db.cycles.clear(), db.settings.clear()]);
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
