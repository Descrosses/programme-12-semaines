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
 */

import { beforeEach, describe, expect, it } from "vitest";
import "fake-indexeddb/auto";
import { deleteDB } from "./testSchemas";
import { ProgrammeDB } from "./db";

const NOM = "export-roundtrip-test";

/*
 * `export.ts` parle au singleton `db`. On le remplace par une base jetable le
 * temps du test — sinon chaque exécution écrirait dans la base « réelle » du
 * contexte de test, partagée avec les autres fichiers.
 */
async function monterBaseJetable(): Promise<ProgrammeDB> {
  await deleteDB(NOM);
  const jetable = new ProgrammeDB(NOM);
  await jetable.open();
  const mod = await import("./db");
  Object.defineProperty(mod, "db", {
    value: jetable,
    configurable: true,
    writable: true,
  });
  return jetable;
}

describe("export / import", () => {
  beforeEach(async () => {
    await deleteDB(NOM);
  });

  it("fait l’aller-retour sans perdre les tables ajoutées en v15", async () => {
    const base = await monterBaseJetable();
    const { exportAll, importAll } = await import("./export");

    await base.sessions.add({
      week: 3,
      day: 0,
      date: "2026-09-14",
      status: "done",
      warmupChecked: [],
      notes: "legacy",
      startedAt: 1_757_000_000_000,
      finishedAt: 1_757_004_200_000,
    });
    await base.notes.bulkAdd([
      {
        exerciseId: "bench-press",
        week: 1,
        day: 2,
        date: "2026-08-31",
        text: "Épaule gauche tire un peu.",
        at: 1_756_600_000_000,
      },
      {
        exerciseId: null,
        week: 1,
        day: 2,
        date: "2026-08-31",
        text: "Bien dormi.",
        at: 1_756_600_500_000,
      },
    ]);
    await base.noteDrafts.add({
      slot: "deadlift",
      week: 3,
      day: 5,
      date: "2026-09-19",
      text: "phrase pas encore ajoutée",
      updatedAt: 1_758_200_000_000,
    });
    await base.sessionExercises.add({
      sessionId: 1,
      week: 3,
      day: 0,
      date: "2026-09-14",
      kind: "replace",
      originalExerciseId: "back-squat",
      exerciseId: "hack-squat",
      name: "Hack Squat",
      sets: 3,
      reps: 8,
      kg: 80,
      restSec: 120,
      at: 1_757_000_500_000,
    });
    await base.exerciseNotes.add({
      exerciseId: "rdl",
      week: 2,
      day: 5,
      date: "2026-09-12",
      text: "copie de secours d’avant la v15",
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
    expect(notes.map((n) => n.text).sort()).toEqual([
      "Bien dormi.",
      "Épaule gauche tire un peu.",
    ]);
    expect(notes.find((n) => n.exerciseId === null)?.week).toBe(1);

    const remplacement = await base.sessionExercises.toArray();
    expect(remplacement[0]!.originalExerciseId).toBe("back-squat");
    expect(remplacement[0]!.name).toBe("Hack Squat");
    expect(remplacement[0]!.kg).toBe(80);

    base.close();
  });

  it("réimporte un fichier d’avant la v15, qui n’a aucune de ces tables", async () => {
    const base = await monterBaseJetable();
    const { importAll, parseAnyExport } = await import("./export");

    const ancien = JSON.stringify({
      format: "programme-12-semaines",
      version: 1,
      exportedAt: "2026-09-14T08:00:00.000Z",
      settings: null,
      sessions: [
        {
          week: 2,
          day: 5,
          date: "2026-09-12",
          status: "done",
          warmupChecked: [],
          notes: "Dos bien plat.",
        },
      ],
      sets: [],
      readiness: [],
      combines: [],
      photosIncluded: false,
    });

    const reconnu = parseAnyExport(ancien);
    expect(reconnu.kind).toBe("données");
    if (reconnu.kind !== "données") throw new Error("mauvais type de fichier");

    const rapport = await importAll(reconnu.file);
    expect(rapport.sessions).toBe(1);
    expect(rapport.notes).toBe(0);
    expect(rapport.sessionExercises).toBe(0);
    expect(await base.sessions.count()).toBe(1);

    base.close();
  });
});
