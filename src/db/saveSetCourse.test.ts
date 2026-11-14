/**
 * `saveSet` et les validations simultanées (P1-A, lot de stabilisation).
 *
 * « Lire la série, puis l'écrire » hors transaction : deux validations
 * concurrentes pourraient voir toutes les deux « rien en base » et insérer
 * deux lignes. Ce n'était pas reproductible — ni ici, ni dans Chromium —,
 * mais seulement par HASARD : chaque appel passe d'abord par une transaction
 * d'écriture sur le cycle, qui les met en file. Une garantie ne doit pas
 * dépendre d'un détail voisin : la lecture et l'écriture partagent désormais
 * UNE transaction sur `sets`, et le dernier test le vérifie directement.
 */
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from './db';
import { demarrerCycle, saveSet, type SetInput } from './repo';

const serie = (o: Partial<SetInput> = {}): SetInput => ({
  sessionId: 1,
  exerciseId: 'mf-developpe-couche-barre',
  week: 1,
  day: 0,
  date: '2026-11-16',
  setIndex: 0,
  plannedKg: 75,
  plannedReps: 5,
  targetRPE: null,
  actualKg: 75,
  actualReps: 5,
  actualRpe: null,
  failed: false,
  ...o,
});

beforeEach(async () => {
  await db.open();
  await Promise.all(db.tables.map((t) => t.clear()));
  await demarrerCycle({
    programmeId: 'mass-force',
    programmeVersion: '1',
    startDate: '2026-11-16',
  });
});
afterAll(() => db.close());

describe('saveSet — validations simultanées d’une même série', () => {
  it('trois validations simultanées → une seule série', async () => {
    await Promise.all([saveSet(serie()), saveSet(serie()), saveSet(serie())]);
    expect(await db.sets.count()).toBe(1);
  });

  it('valeurs différentes en même temps → une série, celle de la dernière validation', async () => {
    await Promise.all([
      saveSet(serie({ actualReps: 3 })),
      saveSet(serie({ actualReps: 4 })),
      saveSet(serie({ actualReps: 5 })),
    ]);
    expect((await db.sets.toArray()).map((s) => s.actualReps)).toEqual([5]);
  });

  it('séries différentes en même temps → chacune la sienne', async () => {
    await Promise.all([0, 1, 2, 3].map((i) => saveSet(serie({ setIndex: i }))));
    expect((await db.sets.toArray()).map((s) => s.setIndex).sort()).toEqual([0, 1, 2, 3]);
  });

  it('corriger une série validée la met à jour, sans doublon, et garde son id', async () => {
    const id = await saveSet(serie({ actualReps: 4 }));
    expect(await saveSet(serie({ actualReps: 5 }))).toBe(id);
    expect((await db.sets.toArray()).map((s) => [s.id, s.actualReps])).toEqual([[id, 5]]);
  });

  it('la lecture et l’écriture partagent UNE transaction sur les séries', async () => {
    const vues: string[][] = [];
    const origine = db.transaction.bind(db) as (...a: unknown[]) => unknown;
    (db as unknown as { transaction: (...a: unknown[]) => unknown }).transaction = (
      ...args: unknown[]
    ) => {
      const tables = args
        .slice(1, -1)
        .flat()
        .map((t) => (typeof t === 'string' ? t : (t as { name: string }).name));
      vues.push([String(args[0]), ...tables]);
      return origine(...args);
    };
    try {
      await saveSet(serie());
    } finally {
      delete (db as unknown as { transaction?: unknown }).transaction;
    }
    expect(vues).toContainEqual(['rw', 'sets']);
  });
});
