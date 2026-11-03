/**
 * L'export est la SEULE copie de secours de cette base.
 *
 * Une table absente du fichier d'export disparaît au premier changement de
 * téléphone, sans message d'erreur et sans qu'on s'en aperçoive — c'était le
 * cas des remarques d'exercice jusqu'ici. Ce test ferme ce trou et le garde
 * fermé : il remplit la base, exporte, vide, réimporte, et compare.
 *
 * Il vérifie aussi l'inverse, qui compte autant : un fichier exporté AVANT la
 * v15, qui ne connaît aucune des tables nouvelles, doit rester réimportable
 * tel quel. Une sauvegarde qu'on ne sait plus relire n'est pas une sauvegarde.
 *
 * Et depuis l'étape 0 de Dcross-fit, il vérifie une chose de plus, qui vaut
 * pour toutes les tables à venir : que la base ne contient AUCUNE table que la
 * sauvegarde ignore. Le trou des remarques d'exercice avait été trouvé à la
 * main ; celui des quatre tables de nutrition aussi, deux ans plus tard. Le
 * test ci-dessous rend le troisième impossible.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import 'fake-indexeddb/auto';
import { deleteDB } from './testSchemas';
import { ProgrammeDB } from './db';

const NOM = 'export-roundtrip-test';

/*
 * `export.ts` parle au singleton `db`. On le remplace par une base jetable le
 * temps du test — sinon chaque exécution écrirait dans la base « réelle » du
 * contexte de test, partagée avec les autres fichiers.
 */
async function monterBaseJetable(): Promise<ProgrammeDB> {
  await deleteDB(NOM);
  const jetable = new ProgrammeDB(NOM);
  await jetable.open();
  const mod = await import('./db');
  Object.defineProperty(mod, 'db', {
    value: jetable,
    configurable: true,
    writable: true,
  });
  return jetable;
}

describe('export / import', () => {
  beforeEach(async () => {
    await deleteDB(NOM);
  });

  it('ne laisse aucune table de la base hors de la sauvegarde', async () => {
    const base = await monterBaseJetable();
    const { TABLES_SAUVEGARDEES, TABLES_PHOTOS } = await import('./export');

    const couvertes = new Set<string>([...TABLES_SAUVEGARDEES, ...TABLES_PHOTOS]);
    const oubliees = base.tables.map((t) => t.name).filter((nom) => !couvertes.has(nom));

    /*
     * Si ce test casse, c'est qu'une table a été ajoutée à `db.ts` sans être
     * ajoutée à l'export. Ce n'est pas le test qu'il faut corriger : c'est
     * `exportAll`, `parseExport` et `importAll`, puis cette liste.
     */
    expect(oubliees).toEqual([]);
  });

  it('sauvegarde et restitue les quatre tables de nutrition', async () => {
    const base = await monterBaseJetable();
    const { exportAll, importAll, parseExport } = await import('./export');

    await base.mealLog.bulkAdd([
      { date: '2026-11-02', mealId: 'petit-dejeuner', at: '2026-11-02T07:12:00.000Z' },
      { date: '2026-11-02', mealId: 'dejeuner', at: '2026-11-02T12:40:00.000Z' },
    ]);
    await base.dayKind.add({ date: '2026-11-02', kind: 'train' });
    await base.foodOverrides.add({
      foodId: 'riz-blanc',
      qty: 180,
      productId: 'custom.patate-douce',
    });
    await base.customFoods.add({
      foodId: 'custom.skyr-maison',
      label: 'Skyr maison',
      unit: 'g',
      per: 100,
      kcal: 63,
      proteinG: 11,
      carbsG: 4,
      fatG: 0.2,
      referenceState: 'na',
      category: 'proteines',
      addedAt: '2026-11-01',
    });

    const fichier = await exportAll();

    /*
     * On passe par le texte : c'est ce que Guillaume manipule réellement, et
     * une clé qui ne survit pas à `JSON.stringify` ne survit pas à l'export.
     */
    const relu = parseExport(JSON.stringify(fichier));

    await Promise.all([
      base.mealLog.clear(),
      base.dayKind.clear(),
      base.foodOverrides.clear(),
      base.customFoods.clear(),
    ]);

    const rapport = await importAll(relu);

    expect(rapport.mealLog).toBe(2);
    expect(rapport.dayKind).toBe(1);
    expect(rapport.foodOverrides).toBe(1);
    expect(rapport.customFoods).toBe(1);

    expect((await base.mealLog.toArray()).map((r) => r.mealId).sort()).toEqual([
      'dejeuner',
      'petit-dejeuner',
    ]);
    expect((await base.dayKind.toArray())[0]?.kind).toBe('train');
    expect((await base.foodOverrides.toArray())[0]?.productId).toBe('custom.patate-douce');
    expect((await base.customFoods.toArray())[0]?.label).toBe('Skyr maison');
  });

  it('fait l’aller-retour sans perdre les tables ajoutées en v15', async () => {
    const base = await monterBaseJetable();
    const { exportAll, importAll } = await import('./export');

    await base.sessions.add({
      cycleId: 1,
      week: 3,
      day: 0,
      date: '2026-09-14',
      status: 'done',
      warmupChecked: [],
      notes: 'legacy',
      startedAt: 1_757_000_000_000,
      finishedAt: 1_757_004_200_000,
    });
    await base.notes.bulkAdd([
      {
        cycleId: 1,
        exerciseId: 'bench-press',
        week: 1,
        day: 2,
        date: '2026-08-31',
        text: 'Épaule gauche tire un peu.',
        at: 1_756_600_000_000,
      },
      {
        cycleId: 1,
        exerciseId: null,
        week: 1,
        day: 2,
        date: '2026-08-31',
        text: 'Bien dormi.',
        at: 1_756_600_500_000,
      },
    ]);
    await base.noteDrafts.add({
      cycleId: 1,
      slot: 'deadlift',
      week: 3,
      day: 5,
      date: '2026-09-19',
      text: 'phrase pas encore ajoutée',
      updatedAt: 1_758_200_000_000,
    });
    await base.sessionExercises.add({
      cycleId: 1,
      sessionId: 1,
      week: 3,
      day: 0,
      date: '2026-09-14',
      kind: 'replace',
      originalExerciseId: 'back-squat',
      exerciseId: 'hack-squat',
      name: 'Hack Squat',
      sets: 3,
      reps: 8,
      kg: 80,
      restSec: 120,
      at: 1_757_000_500_000,
    });
    await base.exerciseNotes.add({
      cycleId: 1,
      exerciseId: 'rdl',
      week: 2,
      day: 5,
      date: '2026-09-12',
      text: 'copie de secours d’avant la v15',
      updatedAt: 1_757_600_000_000,
    });

    const fichier = await exportAll();
    expect(fichier.notes).toHaveLength(2);
    expect(fichier.noteDrafts).toHaveLength(1);
    expect(fichier.sessionExercises).toHaveLength(1);
    expect(fichier.exerciseNotes).toHaveLength(1);

    // Le fichier doit survivre à un aller-retour par JSON : c'est ce que
    // Guillaume manipule, pas l'objet en mémoire.
    const relu = JSON.parse(JSON.stringify(fichier)) as typeof fichier;

    const rapport = await importAll(relu);
    expect(rapport.notes).toBe(2);
    expect(rapport.noteDrafts).toBe(1);
    expect(rapport.sessionExercises).toBe(1);
    expect(rapport.exerciseNotes).toBe(1);

    const notes = await base.notes.toArray();
    expect(notes.map((n) => n.text).sort()).toEqual(['Bien dormi.', 'Épaule gauche tire un peu.']);
    expect(notes.find((n) => n.exerciseId === null)?.week).toBe(1);

    const remplacement = await base.sessionExercises.toArray();
    expect(remplacement[0]!.originalExerciseId).toBe('back-squat');
    expect(remplacement[0]!.name).toBe('Hack Squat');
    expect(remplacement[0]!.kg).toBe(80);

    base.close();
  });

  it('réimporte un fichier d’avant la v15, qui n’a aucune de ces tables', async () => {
    const base = await monterBaseJetable();
    const { importAll, parseAnyExport } = await import('./export');

    const ancien = JSON.stringify({
      format: 'programme-12-semaines',
      version: 1,
      exportedAt: '2026-09-14T08:00:00.000Z',
      settings: null,
      sessions: [
        {
          week: 2,
          day: 5,
          date: '2026-09-12',
          status: 'done',
          warmupChecked: [],
          notes: 'Dos bien plat.',
        },
      ],
      sets: [],
      readiness: [],
      combines: [],
      photosIncluded: false,
    });

    const reconnu = parseAnyExport(ancien);
    expect(reconnu.kind).toBe('données');
    if (reconnu.kind !== 'données') throw new Error('mauvais type de fichier');

    const rapport = await importAll(reconnu.file);
    expect(rapport.sessions).toBe(1);
    expect(rapport.notes).toBe(0);
    expect(rapport.sessionExercises).toBe(0);
    expect(await base.sessions.count()).toBe(1);

    base.close();
  });
});
