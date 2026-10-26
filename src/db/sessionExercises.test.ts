/**
 * Remplacer et ajouter, en base.
 *
 * Ce que ces tests verrouillent n'est pas l'affichage mais les deux
 * conséquences de stockage qui comptent :
 *
 * 1. les séries d'un remplacement s'enregistrent sous l'id du REMPLAÇANT, ce
 *    qui fait que §11 ne les voit jamais sous le lift d'origine ;
 * 2. annuler retire la ligne ET ses séries, parce qu'une série orpheline reste
 *    invisible à l'écran tout en pesant sur l'historique du remplaçant.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import 'fake-indexeddb/auto';
import { deleteDB } from './testSchemas';
import { ProgrammeDB } from './db';
import { applyProgression } from '../engine/progression';
import { rpe } from '../data/types';

const NOM = 'session-exercises-test';

async function monterBaseJetable(): Promise<ProgrammeDB> {
  await deleteDB(NOM);
  const jetable = new ProgrammeDB(NOM);
  await jetable.open();
  const mod = await import('./db');
  Object.defineProperty(mod, 'db', { value: jetable, configurable: true, writable: true });
  return jetable;
}

const base = { week: 5, day: 0 as const, date: '2026-09-28' };

const serie = (sessionId: number, exerciseId: string, setIndex: number, kg: number) => ({
  sessionId,
  exerciseId,
  week: 5,
  day: 0 as const,
  date: '2026-09-28',
  setIndex,
  plannedKg: kg,
  plannedReps: 8,
  targetRpeMin: null,
  targetRpeMax: null,
  targetRpeLabel: null,
  actualKg: kg,
  actualReps: 8,
  actualRpe: 7,
  measureValue: null,
  failed: false,
  doneAt: Date.now(),
});

describe('exercices de séance', () => {
  beforeEach(async () => {
    await deleteDB(NOM);
  });

  it('enregistre le remplacement tout de suite, avec son format', async () => {
    const db = await monterBaseJetable();
    const { addSessionExercise, sessionExercisesFor } = await import('./repo');

    await addSessionExercise({
      sessionId: 1,
      ...base,
      kind: 'replace',
      originalExerciseId: 'back-squat',
      exerciseId: 'hack-squat',
      name: 'Hack Squat',
      sets: 3,
      reps: 8,
      kg: 40,
      restSec: 90,
    });

    const rows = await sessionExercisesFor(1);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.originalExerciseId).toBe('back-squat');
    expect(rows[0]!.exerciseId).toBe('hack-squat');
    expect(rows[0]!.name).toBe('Hack Squat');
    expect(rows[0]!.sets).toBe(3);
    expect(rows[0]!.kg).toBe(40);
    db.close();
  });

  it('un remplacement ne nourrit PAS la progression du lift d’origine', async () => {
    const db = await monterBaseJetable();
    const { addSessionExercise, buildHistoryIndex, allSets } = await import('./repo');

    await addSessionExercise({
      sessionId: 1,
      ...base,
      kind: 'replace',
      originalExerciseId: 'back-squat',
      exerciseId: 'hack-squat',
      name: 'Hack Squat',
      sets: 3,
      reps: 8,
      kg: 40,
      restSec: 90,
    });
    // Les séries validées portent l'id du REMPLAÇANT.
    await db.sets.bulkAdd([
      serie(1, 'hack-squat', 0, 40),
      serie(1, 'hack-squat', 1, 40),
      serie(1, 'hack-squat', 2, 40),
    ]);

    const index = buildHistoryIndex(await allSets());
    expect(index['hack-squat']).toHaveLength(1);
    expect(index['back-squat']).toBeUndefined();

    /*
     * La conséquence qui compte : §11 sur le Back Squat ne voit rien. Sans
     * ça, trois séries de Hack Squat à 40 kg auraient fait baisser la
     * suggestion de squat de 110 à 40 — l'appli aurait proposé la semaine
     * suivante de squatter 40 kg.
     */
    const suggestion = applyProgression({
      history: index['back-squat'] ?? [],
      plannedKg: 110,
      targetRPE: rpe(8),
      step: 2.5,
      isLowerBody: true,
    });
    expect(suggestion.suggestedKg).toBe(110);
    expect(suggestion.requiresConfirm).toBe(false);
    db.close();
  });

  it('le remplaçant nourrit SON propre historique, s’il revient', async () => {
    const db = await monterBaseJetable();
    const { buildHistoryIndex, allSets } = await import('./repo');

    await db.sets.bulkAdd([serie(1, 'hack-squat', 0, 40), serie(2, 'hack-squat', 0, 45)]);
    const index = buildHistoryIndex(await allSets());
    expect(index['hack-squat']).toHaveLength(1); // même semaine, même jour
    expect(index['hack-squat']![0]!.kg).toBe(45);
    db.close();
  });

  it('annuler retire la ligne ET les séries qui s’y rattachaient', async () => {
    const db = await monterBaseJetable();
    const { addSessionExercise, cancelSessionExercise, sessionExercisesFor } =
      await import('./repo');

    const ligne = await addSessionExercise({
      sessionId: 1,
      ...base,
      kind: 'replace',
      originalExerciseId: 'back-squat',
      exerciseId: 'hack-squat',
      name: 'Hack Squat',
      sets: 3,
      reps: 8,
      kg: 40,
      restSec: 90,
    });
    await db.sets.bulkAdd([serie(1, 'hack-squat', 0, 40), serie(1, 'hack-squat', 1, 40)]);
    // Une série d'un AUTRE exercice de la même séance ne doit pas partir.
    await db.sets.add(serie(1, 'rdl', 0, 90));

    const supprimees = await cancelSessionExercise(ligne.id!);
    expect(supprimees).toBe(2);
    expect(await sessionExercisesFor(1)).toHaveLength(0);
    expect(await db.sets.count()).toBe(1);
    expect((await db.sets.toArray())[0]!.exerciseId).toBe('rdl');
    db.close();
  });

  it('annuler ne touche pas les séries d’une AUTRE séance du même exercice', async () => {
    const db = await monterBaseJetable();
    const { addSessionExercise, cancelSessionExercise } = await import('./repo');

    const ligne = await addSessionExercise({
      sessionId: 1,
      ...base,
      kind: 'add',
      originalExerciseId: null,
      exerciseId: 'hack-squat',
      name: 'Hack Squat',
      sets: 3,
      reps: 8,
      kg: 40,
      restSec: 90,
    });
    await db.sets.add(serie(1, 'hack-squat', 0, 40));
    await db.sets.add({ ...serie(2, 'hack-squat', 0, 45), week: 6 });

    expect(await cancelSessionExercise(ligne.id!)).toBe(1);
    const restantes = await db.sets.toArray();
    expect(restantes).toHaveLength(1);
    expect(restantes[0]!.week).toBe(6);
    db.close();
  });

  it('compte les séries déjà saisies, pour prévenir avant d’annuler', async () => {
    const db = await monterBaseJetable();
    const { setsOnSessionExercise } = await import('./repo');

    await db.sets.bulkAdd([serie(1, 'hack-squat', 0, 40), serie(1, 'hack-squat', 1, 40)]);
    expect(await setsOnSessionExercise(1, 'hack-squat')).toBe(2);
    expect(await setsOnSessionExercise(1, 'leg-extension')).toBe(0);
    db.close();
  });

  it('remplacer deux fois le même créneau garde les deux lignes', async () => {
    const db = await monterBaseJetable();
    const { addSessionExercise, sessionExercisesFor } = await import('./repo');

    for (const [exerciseId, name] of [
      ['hack-squat', 'Hack Squat'],
      ['goblet-squat', 'Goblet Squat'],
    ] as const) {
      await addSessionExercise({
        sessionId: 1,
        ...base,
        kind: 'replace',
        originalExerciseId: 'back-squat',
        exerciseId,
        name,
        sets: 3,
        reps: 8,
        kg: 40,
        restSec: 90,
      });
    }
    // Rien n'est écrasé : garder la première dit ce qui a été essayé. C'est
    // `applyCustom` qui décide laquelle s'affiche — la plus récente.
    expect(await sessionExercisesFor(1)).toHaveLength(2);
    db.close();
  });
});
