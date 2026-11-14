/**
 * La restauration (P1-D, lot de stabilisation).
 *
 * 1. Ce que l'écran annonce AVANT de remplacer (resumeImport).
 * 2. Un import qui échoue en cours d'écriture ne laisse rien de cassé : la
 *    base d'avant est intacte (une seule transaction). Ce cas n'était pas
 *    testé.
 */
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from './db';
import { demarrerCycle, saveSet } from './repo';
import { exportAll, importAll, parseAnyExport, parseExport, type PhotoExportFile } from './export';
import { resumeImport } from './resumeImport';

beforeEach(async () => {
  await db.open();
  await Promise.all(db.tables.map((t) => t.clear()));
});
afterAll(() => db.close());

const serie = (setIndex: number, actualKg: number) =>
  saveSet({
    sessionId: 1,
    exerciseId: 'back-squat',
    week: 1,
    day: 0,
    date: '2026-09-14',
    setIndex,
    plannedKg: null,
    plannedReps: 5,
    targetRPE: null,
    actualKg,
    actualReps: 5,
    actualRpe: null,
    failed: false,
  });

describe('ce que la restauration annonce avant de remplacer', () => {
  it('données : la date, ce que contient le fichier, et que TOUT sera remplacé', async () => {
    await demarrerCycle({ programmeId: 'power12', programmeVersion: '1', startDate: '2026-09-07' });
    await serie(0, 100);
    await serie(1, 102.5);
    const fichier = { ...(await exportAll()), exportedAt: '2026-11-14T09:00:00.000Z' };
    const r = resumeImport(parseAnyExport(JSON.stringify(fichier)));
    expect(r.contenu).toBe(
      'Fichier du samedi 14 novembre : 0 séance, 2 séries, 0 référence du combiné.',
    );
    expect(r.remplace).toMatch(/TOUTES les données/);
    expect(r.remplace).toMatch(/références du combiné/);
    expect(r.garde).toBe('Les photos ne sont pas touchées.');
    expect(r.bouton).toBe('Remplacer mes données');
  });

  it('photos : le nombre de photos, et que l’historique n’est pas touché', () => {
    const f: PhotoExportFile = {
      format: 'programme-12-semaines-photos',
      version: 1,
      exportedAt: 'pas une date',
      progressPhotos: [{ week: 1, date: '2026-11-01', dataUrl: 'x', width: 1, height: 1 }],
      exerciseMedia: [],
    };
    const r = resumeImport({ kind: 'photos', file: f });
    expect(r.contenu).toBe('Fichier : 1 photo de suivi, 0 photo d’exercice, 0 fiche technique.');
    expect(r.remplace).toMatch(/TOUTES les photos/);
    expect(r.garde).toMatch(/historique d’entraînement n’est pas touché/);
  });
});

describe('un import qui échoue en cours d’écriture', () => {
  it('laisse la base d’avant intacte', async () => {
    await demarrerCycle({ programmeId: 'power12', programmeVersion: '1', startDate: '2026-09-07' });
    await serie(0, 100);
    const sauvegarde = parseExport(JSON.stringify(await exportAll()));
    await serie(1, 102.5); // ce qui existe sur le téléphone au moment de restaurer

    const bulkAdd = db.sets.bulkAdd.bind(db.sets);
    db.sets.bulkAdd = (() =>
      Promise.reject(new Error('écriture refusée'))) as unknown as typeof db.sets.bulkAdd;
    try {
      await expect(importAll(sauvegarde)).rejects.toThrow();
    } finally {
      db.sets.bulkAdd = bulkAdd;
    }
    const lignes = (await db.sets.toArray()).map((s) => [s.setIndex, s.actualKg]);
    expect(lignes).toEqual([
      [0, 100],
      [1, 102.5],
    ]);
    expect(await db.cycles.count()).toBe(1);
  });
});
