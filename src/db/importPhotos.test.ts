/**
 * L'import des photos (P0-A, lot de stabilisation).
 *
 * Régression : `importPhotos` lisait le cycle APRÈS avoir converti les photos,
 * alors que la conversion en avait besoin. Dès qu'un fichier contenait une
 * seule photo, l'import partait en « Cannot access 'cyclePhotos' before
 * initialization » : aucune sauvegarde de photos ne pouvait être restaurée.
 * Aucun test n'importait de photo — c'est pourquoi le défaut est passé.
 */
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from './db';
import { demarrerCycle } from './repo';
import { exportPhotos, importPhotos, parseAnyExport, type PhotoExportFile } from './export';

// Un JPEG d'un pixel, en data URL : ce que l'export écrit vraiment.
const PIXEL =
  'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==';

const fichier = (suivi: number, exercice = 0): PhotoExportFile => ({
  format: 'programme-12-semaines-photos',
  version: 1,
  exportedAt: '2026-11-14T10:00:00.000Z',
  progressPhotos: Array.from({ length: suivi }, (_, i) => ({
    week: i + 1,
    date: `2026-11-0${i + 1}`,
    dataUrl: PIXEL,
    width: 1,
    height: 1,
  })),
  exerciseMedia: Array.from({ length: exercice }, (_, i) => ({
    exerciseId: 'back-squat',
    week: 1,
    day: 0,
    date: `2026-11-0${i + 1}`,
    dataUrl: PIXEL,
    width: 1,
    height: 1,
  })),
});

/*
 * L'export lit les photos avec `FileReader`, qui existe dans le navigateur mais
 * pas sous Node. Le strict nécessaire, pour CE test : `readAsDataURL`. Le
 * navigateur, lui, a le vrai (vérifié à part dans Chromium).
 */
if (typeof globalThis.FileReader === 'undefined') {
  class FileReaderNode {
    result: string | null = null;
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    readAsDataURL(blob: Blob) {
      blob
        .arrayBuffer()
        .then((buf) => {
          const type = blob.type || 'application/octet-stream';
          this.result = `data:${type};base64,${Buffer.from(buf).toString('base64')}`;
          this.onload?.();
        })
        .catch(() => this.onerror?.());
    }
  }
  (globalThis as { FileReader?: unknown }).FileReader = FileReaderNode;
}

let cycleId = 0;

beforeEach(async () => {
  await db.open();
  await Promise.all(db.tables.map((t) => t.clear()));
  cycleId = (
    await demarrerCycle({ programmeId: 'power12', programmeVersion: '1', startDate: '2026-09-07' })
  ).id!;
});
afterAll(() => db.close());

describe('importPhotos', () => {
  it('importe une sauvegarde contenant UNE photo, rattachée au cycle actif', async () => {
    await expect(importPhotos(fichier(1))).resolves.toEqual({
      progressPhotos: 1,
      exerciseMedia: 0,
      exerciseReference: 0,
    });
    const [photo] = await db.progressPhotos.toArray();
    expect(photo).toMatchObject({ cycleId, week: 1, date: '2026-11-01', width: 1, height: 1 });
    expect(photo!.bytes).toBeGreaterThan(0);
  });

  it('importe une sauvegarde contenant PLUSIEURS photos (suivi et exercice)', async () => {
    await expect(importPhotos(fichier(2, 2))).resolves.toMatchObject({
      progressPhotos: 2,
      exerciseMedia: 2,
    });
    expect((await db.exerciseMedia.toArray()).every((m) => m.cycleId === cycleId)).toBe(true);
  });

  it('importe un fichier SANS photo', async () => {
    await expect(importPhotos(fichier(0))).resolves.toMatchObject({ progressPhotos: 0 });
  });

  it('un fichier illisible laisse les photos existantes intactes', async () => {
    await db.progressPhotos.add({
      cycleId,
      week: 3,
      date: '2026-10-01',
      blob: new Blob(['x']),
      bytes: 1,
      width: 1,
      height: 1,
    });
    const casse = fichier(1);
    casse.progressPhotos[0]!.dataUrl = 'ceci n’est pas une image';
    await expect(importPhotos(casse)).rejects.toThrow();
    expect((await db.progressPhotos.toArray()).map((p) => p.week)).toEqual([3]);
  });

  it('fait l’aller-retour : exporter puis réimporter rend les mêmes photos', async () => {
    await importPhotos(fichier(2, 1));
    const sauvegarde = await exportPhotos();
    await Promise.all([db.progressPhotos.clear(), db.exerciseMedia.clear()]);
    const relu = parseAnyExport(JSON.stringify(sauvegarde));
    expect(relu.kind).toBe('photos');
    if (relu.kind !== 'photos') return;
    await expect(importPhotos(relu.file)).resolves.toMatchObject({
      progressPhotos: 2,
      exerciseMedia: 1,
    });
    expect((await db.progressPhotos.toArray()).map((p) => p.week)).toEqual([1, 2]);
  });
});
