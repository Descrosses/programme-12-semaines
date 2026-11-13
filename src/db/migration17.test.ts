/**
 * Migration v16 → v17, sur une VRAIE IndexedDB.
 *
 * C'est la migration la plus risquée du projet : elle refait cinq index
 * UNIQUES. Un index unique refait de travers ne « perd » pas des lignes
 * poliment — il fait échouer l'ouverture de la base, ou il rejette la
 * première écriture suivante. Sur le téléphone de Guillaume, avec douze
 * semaines dedans.
 *
 * On ouvre donc deux fois la même base : une première fois au schéma v16
 * exactement, qu'on remplit de tout ce que la montée doit traverser ; une
 * seconde avec le schéma complet, ce qui déclenche la v17. Puis on vérifie
 * trois choses, dans cet ordre d'importance :
 *
 * 1. Rien n'est perdu. Chaque table ressort avec le même nombre de lignes.
 * 2. Tout est rattaché. Aucune ligne ne reste sans cycle.
 * 3. Ce qui était impossible devient possible : deux cycles coexistent.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { deleteDB, v16Schema } from './testSchemas';
import { ProgrammeDB, TABLES_PAR_CYCLE } from './db';

const NOM = 'migration-v17-test';

function ouvrirV16(): Dexie {
  const d = new Dexie(NOM);
  for (const [version, stores] of v16Schema()) d.version(version).stores(stores);
  return d;
}

/** Une base v16 pleine, fermée, prête à être rouverte au schéma complet. */
async function remplirV16(): Promise<void> {
  const v16 = ouvrirV16();
  await v16.open();

  await v16.table('settings').put({
    id: 1,
    startDate: '2026-09-14',
    broadJumpBaselineCm: 225,
    oneRM: { 'back-squat': 125 },
    bodyweightKg: 78.5,
    bodyweightDate: '2026-11-01',
    tableauOrigine: true,
    soundEnabled: true,
    vibrationEnabled: true,
  });

  await v16.table('sessions').bulkAdd([
    {
      week: 1,
      day: 0,
      date: '2026-09-21',
      status: 'done',
      warmupChecked: ['a'],
      notes: '',
    },
    {
      week: 1,
      day: 2,
      date: '2026-09-23',
      status: 'planned',
      warmupChecked: [],
      notes: '',
    },
  ]);
  await v16.table('sets').bulkAdd([
    {
      sessionId: 1,
      exerciseId: 'back-squat',
      week: 1,
      day: 0,
      date: '2026-09-21',
      setIndex: 0,
      plannedKg: 100,
      plannedReps: 5,
      targetRpeMin: 7,
      targetRpeMax: 7,
      targetRpeLabel: null,
      actualKg: 102.5,
      actualReps: 5,
      actualRpe: 7,
      measureValue: null,
      measureUnit: null,
      failed: false,
      doneAt: 1_758_000_000_000,
    },
  ]);
  await v16
    .table('readiness')
    .add({ week: 1, day: 0, date: '2026-09-21', jumpCm: 228, attempts: [220, 228, 225] });
  await v16
    .table('combines')
    .add({ phase: 'initial', date: '2026-09-14', metrics: { 'test-squat-1rm': 125 }, notes: '' });
  await v16
    .table('progressPhotos')
    .add({ week: 1, date: '2026-09-21', blob: new Blob(['x']), bytes: 1, width: 10, height: 20 });
  await v16.table('exerciseMedia').add({
    exerciseId: 'back-squat',
    week: 1,
    day: 0,
    date: '2026-09-21',
    blob: new Blob(['y']),
    bytes: 1,
    width: 10,
    height: 20,
  });
  await v16
    .table('exerciseVideoLog')
    .add({ exerciseId: 'back-squat', week: 1, day: 0, date: '2026-09-21', note: 'filmé' });
  await v16.table('exerciseNotes').add({
    exerciseId: 'rdl',
    week: 1,
    day: 5,
    date: '2026-09-26',
    text: 'dos rond en fin de série',
    updatedAt: 1_758_300_000_000,
  });
  await v16.table('notes').add({
    exerciseId: 'bench-press',
    week: 1,
    day: 2,
    date: '2026-09-23',
    text: 'épaule gauche',
    at: 1_758_200_000_000,
  });
  await v16.table('noteDrafts').add({
    slot: 'deadlift',
    week: 1,
    day: 5,
    date: '2026-09-26',
    text: 'phrase en cours',
    updatedAt: 1_758_310_000_000,
  });
  await v16.table('sessionExercises').add({
    sessionId: 1,
    week: 1,
    day: 0,
    date: '2026-09-21',
    kind: 'replace',
    originalExerciseId: 'back-squat',
    exerciseId: 'hack-squat',
    name: 'Hack Squat',
    sets: 3,
    reps: 8,
    kg: 80,
    restSec: 120,
    at: 1_758_000_500_000,
  });

  // Une table hors cycle, pour vérifier qu'on n'y touche pas.
  await v16.table('measurements').add({ date: '2026-09-21', weightKg: 78.2, waistCm: 82 });

  v16.close();
}

describe('migration v16 → v17', () => {
  beforeEach(async () => {
    await deleteDB(NOM);
  });

  it('ne perd aucune ligne, dans aucune table', async () => {
    await remplirV16();

    const apres = new ProgrammeDB(NOM);
    await apres.open();
    expect(apres.verno).toBe(24);

    expect(await apres.sessions.count()).toBe(2);
    expect(await apres.sets.count()).toBe(1);
    expect(await apres.readiness.count()).toBe(1);
    expect(await apres.combines.count()).toBe(1);
    expect(await apres.progressPhotos.count()).toBe(1);
    expect(await apres.exerciseMedia.count()).toBe(1);
    expect(await apres.exerciseVideoLog.count()).toBe(1);
    expect(await apres.exerciseNotes.count()).toBe(1);
    expect(await apres.notes.count()).toBe(1);
    expect(await apres.noteDrafts.count()).toBe(1);
    expect(await apres.sessionExercises.count()).toBe(1);
    expect(await apres.measurements.count()).toBe(1);

    apres.close();
  });

  it('ne change aucune valeur enregistrée', async () => {
    await remplirV16();
    const apres = new ProgrammeDB(NOM);
    await apres.open();

    const serie = (await apres.sets.toArray())[0];
    expect(serie?.actualKg).toBe(102.5);
    expect(serie?.plannedKg).toBe(100);
    expect(serie?.doneAt).toBe(1_758_000_000_000);

    const reglages = await apres.settings.get(1);
    expect(reglages?.startDate).toBe('2026-09-14');
    expect(reglages?.tableauOrigine).toBe(true);

    apres.close();
  });

  it('rattache toutes les lignes au même cycle, et à un seul', async () => {
    await remplirV16();
    const apres = new ProgrammeDB(NOM);
    await apres.open();

    const cycles = await apres.cycles.toArray();
    expect(cycles).toHaveLength(1);
    expect(cycles[0]?.programmeId).toBe('power12');
    expect(cycles[0]?.startDate).toBe('2026-09-14');
    expect(cycles[0]?.statut).toBe('en-cours');

    const id = cycles[0]?.id;
    for (const nom of TABLES_PAR_CYCLE) {
      const lignes = (await apres.table(nom).toArray()) as Array<{ cycleId?: number }>;
      const orphelines = lignes.filter((l) => l.cycleId !== id);
      expect({ table: nom, orphelines: orphelines.length }).toEqual({ table: nom, orphelines: 0 });
    }

    apres.close();
  });

  it('désigne le cycle courant, au lieu de le laisser deviner (v18)', async () => {
    await remplirV16();
    const apres = new ProgrammeDB(NOM);
    await apres.open();

    const cycle = (await apres.cycles.toArray())[0];
    const reglages = await apres.settings.get(1);
    expect(reglages?.cycleActifId).toBe(cycle?.id);

    apres.close();
  });

  it('n’invente aucun cycle sur une base vierge', async () => {
    const v16 = ouvrirV16();
    await v16.open();
    v16.close();

    const apres = new ProgrammeDB(NOM);
    await apres.open();
    expect(await apres.cycles.count()).toBe(0);
    apres.close();
  });

  it('laisse enfin deux cycles porter la même semaine et le même jour', async () => {
    await remplirV16();
    const apres = new ProgrammeDB(NOM);
    await apres.open();

    const premier = (await apres.cycles.toArray())[0]?.id as number;
    const second = await apres.cycles.add({
      programmeId: 'power12',
      programmeVersion: '1.2',
      startDate: '2027-01-04',
      statut: 'prevu',
      endedAt: '',
      createdAt: '2026-12-20',
    });

    /*
     * Le geste exact qui était impossible avant la v17 : la semaine 1 jour 0
     * existe déjà dans le premier cycle. Sous l'ancien index `&[week+day]`,
     * cette écriture partait en `ConstraintError`.
     */
    await apres.sessions.add({
      cycleId: second,
      week: 1,
      day: 0,
      date: '2027-01-11',
      status: 'planned',
      warmupChecked: [],
      notes: '',
    });

    expect(await apres.sessions.count()).toBe(3);
    expect(await apres.sessions.where('cycleId').equals(premier).count()).toBe(2);
    expect(await apres.sessions.where('cycleId').equals(second).count()).toBe(1);

    // Et l'unicité tient toujours DANS un cycle : deux fois le même créneau
    // dans le même cycle reste refusé.
    await expect(
      apres.sessions.add({
        cycleId: second,
        week: 1,
        day: 0,
        date: '2027-01-11',
        status: 'planned',
        warmupChecked: [],
        notes: '',
      }),
    ).rejects.toThrow();

    apres.close();
  });
});
