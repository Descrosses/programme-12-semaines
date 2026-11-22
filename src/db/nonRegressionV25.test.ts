/**
 * ME, MYSELF & I, lot 6 — non-régression, tests seulement.
 *
 * Ce que ces tests figent :
 * 1. Une VRAIE sauvegarde d'avant la v25 (format 3, base v24), fabriquée le
 *    22 novembre avec la version d'avant le lot 1 en jouant une séance POWER,
 *    une MASS CONGESTION et une FEMMES, se restaure à l'identique : mêmes
 *    décomptes table par table, mêmes séries, aucun programme importé, et
 *    chaque cycle retrouve SON module (jamais « indisponible »).
 * 2. Training 1, le programme réel de l'étape 0, s'importe ; une séance jouée
 *    avec les vraies fonctions de la base survit à export, base neuve et
 *    restauration ; la séance servie après restauration est identique à
 *    celle d'avant, donc toujours égale au fichier.
 */
import 'fake-indexeddb/auto';
import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { EMPTY_CONTEXT } from '../engine/types';
import { viderMemoire } from '../programmes/perso/memoire';
import { ID_PROGRAMME_INDISPONIBLE, modulePourCycle } from '../programmes/registre';
import { ProgrammeDB, type SetRow } from './db';
import { deleteDB } from './testSchemas';

const NOM = 'non-regression-v25';
const lire = (chemin: string) => readFileSync(new URL(chemin, import.meta.url), 'utf8');
const SAUVEGARDE_V3 = lire('./__fixtures__/sauvegarde-avant-v25.json');
const TRAINING1 = lire('../engine/perso/__fixtures__/training1.json');

async function baseNeuve(): Promise<ProgrammeDB> {
  await deleteDB(NOM);
  const jetable = new ProgrammeDB(NOM);
  await jetable.open();
  const mod = await import('./db');
  Object.defineProperty(mod, 'db', { value: jetable, configurable: true, writable: true });
  return jetable;
}

/** Ce qu'une série dit de l'entraînement, sans identifiants techniques. */
const contenu = (s: SetRow) => ({
  exerciseId: s.exerciseId,
  week: s.week,
  day: s.day,
  date: s.date,
  setIndex: s.setIndex,
  plannedKg: s.plannedKg,
  plannedReps: s.plannedReps,
  actualKg: s.actualKg,
  actualReps: s.actualReps,
  actualRpe: s.actualRpe,
  failed: s.failed,
});

const decomptes = (f: Record<string, unknown>) =>
  Object.fromEntries(
    Object.entries(f)
      .filter(([, v]) => Array.isArray(v))
      .map(([k, v]) => [k, (v as unknown[]).length]),
  );

beforeEach(async () => {
  viderMemoire();
  await deleteDB(NOM);
});

describe('une sauvegarde d’avant la v25 (format 3) se restaure à l’identique', () => {
  const fichier = JSON.parse(SAUVEGARDE_V3) as Record<string, unknown> & { sets: SetRow[] };

  it('le fichier est bien d’avant la v25 : format 3, trois programmes joués', () => {
    expect(fichier.version).toBe(3);
    expect(fichier).not.toHaveProperty('programmesImportes');
    expect(decomptes(fichier)).toMatchObject({ cycles: 3, sessions: 2, sets: 4, femmesSeances: 1 });
    expect((fichier.cycles as { programmeId: string }[]).map((c) => c.programmeId).sort()).toEqual([
      'femmes8',
      'mass4',
      'power12',
    ]);
  });

  it('mêmes décomptes, mêmes séries, aucun programme importé ; ré-export au format 4', async () => {
    const base = await baseNeuve();
    const { exportAll, importAll, parseExport } = await import('./export');
    const rapport = await importAll(parseExport(SAUVEGARDE_V3));
    expect(rapport.sets).toBe(4);
    expect(rapport.cycles).toBe(3);
    expect(rapport.programmesImportes).toBe(0);

    const reexport = await exportAll();
    expect(reexport.version).toBe(4);
    const apres = decomptes(reexport as unknown as Record<string, unknown>);
    for (const [table, n] of Object.entries(decomptes(fichier)))
      expect(apres[table], table).toBe(n);
    expect(apres.programmesImportes).toBe(0);

    const tri = (a: SetRow, b: SetRow) =>
      a.exerciseId.localeCompare(b.exerciseId) || a.setIndex - b.setIndex;
    expect((await base.sets.toArray()).sort(tri).map(contenu)).toEqual(
      [...fichier.sets].sort(tri).map(contenu),
    );
    base.close();
  });

  it('chaque cycle restauré retrouve SON module, jamais « indisponible »', async () => {
    const base = await baseNeuve();
    const { importAll, parseExport } = await import('./export');
    await importAll(parseExport(SAUVEGARDE_V3));
    for (const c of await base.cycles.toArray()) {
      const m = modulePourCycle(c.programmeId);
      expect(m.id, c.programmeId).not.toBe(ID_PROGRAMME_INDISPONIBLE);
      // femmes8 garde son repli voulu sur POWER 12 (il a ses propres écrans).
      expect(m.id).toBe(c.programmeId === 'femmes8' ? 'power12' : c.programmeId);
    }
    base.close();
  });
});

describe('Training 1 (programme réel) : importé, joué, sauvegardé, restauré', () => {
  it('la séance jouée et la séance servie survivent à une base neuve', async () => {
    const base = await baseNeuve();
    const { importerProgramme } = await import('./programmesImportes');
    const repo = await import('./repo');
    const { exportAll, importAll, parseExport } = await import('./export');

    const r = await importerProgramme(TRAINING1, { dureeSemaines: 8, aujourdhui: '2026-11-22' });
    if (r.statut !== 'importe') throw new Error(r.statut);
    await repo.demarrerCycle({
      programmeId: r.cle,
      programmeVersion: '1',
      startDate: '2026-11-23',
    });

    // La séance servie : la transcription du fichier, ligne pour ligne.
    const doc = JSON.parse(TRAINING1);
    const seanceAvant = modulePourCycle(r.cle).getSession(1, 0, EMPTY_CONTEXT)!;
    expect(seanceAvant.exercises).toHaveLength(doc.semaines[0].seances[0].lignes.length);

    // Une séance jouée avec les vraies fonctions de la base.
    const ligne = await repo.ensureSession(1, 0, '2026-11-23');
    const ex = seanceAvant.exercises[0]!;
    for (const setIndex of [0, 1]) {
      await repo.saveSet({
        sessionId: ligne.id!,
        exerciseId: ex.id,
        week: 1,
        day: 0,
        date: '2026-11-23',
        setIndex,
        plannedKg: null,
        plannedReps: 15,
        targetRPE: null,
        actualKg: null,
        actualReps: 15,
        actualRpe: null,
        failed: false,
      });
    }
    const seriesAvant = (await base.sets.toArray()).map(contenu);
    expect(seriesAvant).toHaveLength(2);
    expect(seriesAvant.every((s) => s.actualKg === null)).toBe(true); // une absence n'est jamais 0

    // Export → nouveau téléphone (base ET mémoire vides) → restauration.
    const fichier = JSON.stringify(await exportAll());
    base.close();
    viderMemoire();
    const neuve = await baseNeuve();
    const rapport = await importAll(parseExport(fichier));
    expect(rapport.programmesImportes).toBe(1);

    expect((await neuve.sets.toArray()).map(contenu)).toEqual(seriesAvant);
    const [cycle] = await neuve.cycles.toArray();
    expect(cycle!.programmeId).toBe(r.cle);
    // La mémoire est rechargée par la restauration : même module, même séance.
    expect(modulePourCycle(r.cle).id).toBe(r.cle);
    expect(modulePourCycle(r.cle).getSession(1, 0, EMPTY_CONTEXT)).toEqual(seanceAvant);
    neuve.close();
  });
});
