/**
 * Migration v14 → v15, sur une VRAIE IndexedDB.
 *
 * Pourquoi un test et pas une relecture attentive : une migration ne se
 * rejoue pas. Si elle casse, elle casse sur le téléphone de Guillaume, avec
 * ses douze semaines dedans, et aucun correctif ne les fait revenir. Le seul
 * moyen honnête de savoir qu'elle tient est de la faire tourner sur une base
 * construite au schéma d'AVANT, pleine de ce qu'elle doit traverser :
 * séances, séries, remarques, combines, pesées, douleur, aliments ajoutés.
 *
 * On ouvre donc deux fois la même base : une première fois avec le schéma
 * v14 seul, qu'on remplit ; une seconde avec le schéma complet, ce qui
 * déclenche la montée de version. Puis on vérifie que rien n'a bougé — et que
 * ce qui devait être recopié l'a été.
 */

import { beforeEach, describe, expect, it } from "vitest";
import "fake-indexeddb/auto";
import Dexie from "dexie";
import { deleteDB, v14Schema } from "./testSchemas";
import { ProgrammeDB, type NoteRow } from "./db";

const NOM = "migration-v15-test";

/** Base au schéma v14 exactement, pour pouvoir la remplir avant la montée. */
function ouvrirV14(): Dexie {
  const d = new Dexie(NOM);
  for (const [version, stores] of v14Schema())
    d.version(version).stores(stores);
  return d;
}

/** La base complète, dont l'ouverture déclenche la v15. */
function ouvrirComplete(): ProgrammeDB {
  return new ProgrammeDB(NOM);
}

describe("migration v14 → v15", () => {
  beforeEach(async () => {
    await deleteDB(NOM);
  });

  it("ne perd ni séance, ni série, ni combine, ni pesée", async () => {
    const avant = ouvrirV14();
    await avant.open();
    await avant.table("sessions").bulkAdd([
      {
        week: 3,
        day: 0,
        date: "2026-09-14",
        status: "done",
        warmupChecked: ["hip-flexor"],
        notes: "Genou droit sensible. 5 h de sommeil.",
        startedAt: 1_757_000_000_000,
        finishedAt: 1_757_004_000_000,
      },
      {
        week: 5,
        day: 5,
        date: "2026-10-03",
        status: "planned",
        warmupChecked: [],
        notes: "",
      },
    ]);
    await avant.table("sets").bulkAdd([
      {
        sessionId: 1,
        exerciseId: "back-squat",
        week: 3,
        day: 0,
        date: "2026-09-14",
        setIndex: 0,
        plannedKg: 110,
        plannedReps: 8,
        targetRpeMin: 7,
        targetRpeMax: 8,
        targetRpeLabel: "RPE 7-8",
        actualKg: 110,
        actualReps: 8,
        actualRpe: 8,
        measureValue: null,
        failed: false,
        doneAt: 1_757_001_000_000,
      },
      {
        sessionId: 1,
        exerciseId: "back-squat",
        week: 3,
        day: 0,
        date: "2026-09-14",
        setIndex: 1,
        plannedKg: 110,
        plannedReps: 8,
        targetRpeMin: 7,
        targetRpeMax: 8,
        targetRpeLabel: "RPE 7-8",
        actualKg: 110,
        actualReps: 7,
        actualRpe: 9,
        measureValue: null,
        failed: true,
        doneAt: 1_757_001_300_000,
      },
    ]);
    await avant.table("combines").bulkAdd([
      {
        phase: "initial",
        date: "2026-08-24",
        metrics: { "test-back-squat-1rm": 140, "test-broad-jump": 232 },
        notes: "Première fois en barre basse.",
      },
    ]);
    await avant
      .table("measurements")
      .bulkAdd([{ date: "2026-09-14", weightKg: 78.4, waistCm: 83 }]);
    await avant.table("painLog").bulkAdd([
      {
        date: "2026-09-14",
        exId: "copenhagen-plank",
        during: 2,
        after: 1,
        nextDay: 0,
        toleratedKg: null,
        rom: "partielle",
      },
    ]);
    await avant.table("extraFoods").bulkAdd([
      {
        date: "2026-09-14",
        mealId: "petit-dejeuner",
        foodId: "kiwi",
        qty: 1,
        label: "Kiwi",
        unit: "unité",
        per: 1,
        kcal: 46,
        proteinG: 0.8,
        carbsG: 9,
        fatG: 0.4,
      },
    ]);
    await avant.table("settings").put({
      id: 1,
      startDate: "2026-08-24",
      broadJumpBaselineCm: 232,
      oneRM: { "back-squat": 140 },
      bodyweightKg: 78.4,
      bodyweightDate: "2026-09-14",
      oneRMCalibratedAt: "2026-08-31",
      soundEnabled: true,
      vibrationEnabled: true,
    });
    avant.close();

    const apres = ouvrirComplete();
    await apres.open();
    expect(apres.verno).toBe(15);

    expect(await apres.sessions.count()).toBe(2);
    expect(await apres.sets.count()).toBe(2);
    expect(await apres.combines.count()).toBe(1);
    expect(await apres.measurements.count()).toBe(1);
    expect(await apres.painLog.count()).toBe(1);
    expect(await apres.extraFoods.count()).toBe(1);

    const squat = (await apres.sets.toArray()).find((r) => r.setIndex === 1);
    expect(squat?.actualKg).toBe(110);
    expect(squat?.actualReps).toBe(7);
    expect(squat?.actualRpe).toBe(9);
    expect(squat?.failed).toBe(true);

    const combine = await apres.combines.get(1);
    expect(combine?.metrics["test-back-squat-1rm"]).toBe(140);

    const reglages = await apres.settings.get(1);
    expect(reglages?.oneRM["back-squat"]).toBe(140);
    expect(reglages?.startDate).toBe("2026-08-24");

    // La remarque de séance reste AUSSI à sa place d'origine : la migration
    // recopie, elle ne déplace pas.
    const s3 = await apres.sessions.where("[week+day]").equals([3, 0]).first();
    expect(s3?.notes).toBe("Genou droit sensible. 5 h de sommeil.");
    expect(s3?.startedAt).toBe(1_757_000_000_000);

    apres.close();
  });

  it("recopie les remarques d’exercice dans `notes`, avec leur semaine", async () => {
    const avant = ouvrirV14();
    await avant.open();
    await avant.table("exerciseNotes").bulkAdd([
      {
        exerciseId: "bench-press",
        week: 1,
        day: 2,
        date: "2026-08-31",
        text: "Épaule gauche tire un peu.",
        updatedAt: 1_756_600_000_000,
      },
      {
        exerciseId: "bench-press",
        week: 5,
        day: 2,
        date: "2026-09-30",
        text: "Plus rien à l’épaule.",
        updatedAt: 1_759_200_000_000,
      },
      // Une ligne vide ne mérite pas d'entrer dans l'historique : le badge
      // « remarques » s'allumerait sur du rien.
      {
        exerciseId: "deadlift",
        week: 2,
        day: 5,
        date: "2026-09-12",
        text: "   ",
        updatedAt: 1_757_600_000_000,
      },
    ]);
    avant.close();

    const apres = ouvrirComplete();
    await apres.open();

    const toutes = await apres.notes.toArray();
    expect(toutes).toHaveLength(2);

    const bench = toutes
      .filter((n) => n.exerciseId === "bench-press")
      .sort((a, b) => a.week - b.week);
    expect(bench.map((n) => [n.week, n.text])).toEqual([
      [1, "Épaule gauche tire un peu."],
      [5, "Plus rien à l’épaule."],
    ]);
    expect(bench[0]!.day).toBe(2);
    expect(bench[0]!.date).toBe("2026-08-31");
    expect(bench[0]!.at).toBe(1_756_600_000_000);

    // La source reste intacte — c'est la copie de secours de la migration.
    expect(await apres.exerciseNotes.count()).toBe(3);

    apres.close();
  });

  it("recopie la remarque de séance avec `exerciseId` à null", async () => {
    const avant = ouvrirV14();
    await avant.open();
    await avant.table("sessions").bulkAdd([
      {
        week: 4,
        day: 4,
        date: "2026-09-25",
        status: "done",
        warmupChecked: [],
        notes: "Deload : tout léger, bien dormi.",
      },
      {
        week: 4,
        day: 5,
        date: "2026-09-26",
        status: "done",
        warmupChecked: [],
        notes: "",
      },
    ]);
    avant.close();

    const apres = ouvrirComplete();
    await apres.open();

    const seance = await apres.notes.toArray();
    expect(seance).toHaveLength(1);
    expect(seance[0]!.exerciseId).toBeNull();
    expect(seance[0]!.week).toBe(4);
    expect(seance[0]!.day).toBe(4);
    expect(seance[0]!.text).toBe("Deload : tout léger, bien dormi.");

    apres.close();
  });

  it("laisse les brouillons vides : l’historique porte déjà tout", async () => {
    const avant = ouvrirV14();
    await avant.open();
    await avant.table("exerciseNotes").add({
      exerciseId: "hip-thrust",
      week: 2,
      day: 5,
      date: "2026-09-12",
      text: "Barre trop haute sur le bassin.",
      updatedAt: 1_757_600_000_000,
    });
    avant.close();

    const apres = ouvrirComplete();
    await apres.open();
    expect(await apres.noteDrafts.count()).toBe(0);
    expect(await apres.sessionExercises.count()).toBe(0);
    expect(await apres.notes.count()).toBe(1);
    apres.close();
  });

  it("monte une base vide sans rien inventer", async () => {
    const avant = ouvrirV14();
    await avant.open();
    avant.close();

    const apres = ouvrirComplete();
    await apres.open();
    expect(await apres.notes.count()).toBe(0);
    expect(await apres.sessions.count()).toBe(0);
    apres.close();
  });

  it("est idempotente : rouvrir ne recopie pas une deuxième fois", async () => {
    const avant = ouvrirV14();
    await avant.open();
    await avant.table("exerciseNotes").add({
      exerciseId: "rdl",
      week: 3,
      day: 5,
      date: "2026-09-19",
      text: "Dos bien plat.",
      updatedAt: 1_758_200_000_000,
    });
    avant.close();

    const un = ouvrirComplete();
    await un.open();
    expect(await un.notes.count()).toBe(1);
    un.close();

    const deux = ouvrirComplete();
    await deux.open();
    const apres: NoteRow[] = await deux.notes.toArray();
    expect(apres).toHaveLength(1);
    expect(apres[0]!.text).toBe("Dos bien plat.");
    deux.close();
  });
});
