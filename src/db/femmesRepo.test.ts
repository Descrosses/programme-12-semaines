/**
 * Ce que FEMMES écrit en base — et ce qu'il ne doit jamais perdre.
 */
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from './db';
import {
  enregistrerExerciceFemmes,
  enregistrerProfilFemmes,
  marquerSeanceFemmesNonFaite,
  seancesFemmes,
  terminerSeanceFemmes,
} from './femmesRepo';
import { demarrerCycle, supprimerCycleNonCommence } from './repo';
import { exportAll, importAll, parseExport } from './export';
import { ORDRE } from '../engine/femmes/avancement';
import type { ExerciseRecord } from '../engine/femmes/types';

const record = (exerciseId: string, actual: number): ExerciseRecord => ({
  exerciseId,
  week: 1,
  day: 0,
  date: '2026-11-13',
  version: 'maison',
  planned: 10,
  actual,
  kg: null,
  ressenti: 'ok',
  remarque: null,
});

async function cycleFemmes(): Promise<number> {
  const c = await demarrerCycle({ programmeId: 'femmes8', programmeVersion: '0.1', startDate: '' });
  return c.id!;
}

describe('séances FEMMES en base', () => {
  beforeEach(async () => {
    await db.open();
    await Promise.all([db.femmesSeances.clear(), db.cycles.clear(), db.settings.clear()]);
  });
  afterAll(() => db.close());

  it('le profil de départ se pose sur la ligne du cycle', async () => {
    const id = await cycleFemmes();
    await enregistrerProfilFemmes(id, {
      niveau: 'debutante',
      safety: { plancherPelvienOk: false, sansDouleurLimitante: true },
    });
    expect((await db.cycles.get(id))?.femmes).toEqual({
      niveau: 'debutante',
      safety: { plancherPelvienOk: false, sansDouleurLimitante: true },
    });
  });

  it('revalider un exercice le remplace, sans doublon', async () => {
    const id = await cycleFemmes();
    const base = { cycleId: id, semaine: 1, jour: 0 as const, version: 'maison' as const };
    await enregistrerExerciceFemmes({ ...base, record: record('a', 8) });
    await enregistrerExerciceFemmes({ ...base, record: record('b', 10) });
    await enregistrerExerciceFemmes({ ...base, record: record('a', 12) });
    const [ligne] = await seancesFemmes(id);
    expect(await db.femmesSeances.count()).toBe(1);
    expect(ligne!.exercices.map((r) => [r.exerciseId, r.actual])).toEqual([
      ['b', 10],
      ['a', 12],
    ]);
    expect(ligne!.terminee).toBe(false);
  });

  it('deux validations simultanées ne font qu’une séance', async () => {
    const id = await cycleFemmes();
    const base = { cycleId: id, semaine: 1, jour: 0 as const, version: 'maison' as const };
    await Promise.all([
      enregistrerExerciceFemmes({ ...base, record: record('a', 8) }),
      enregistrerExerciceFemmes({ ...base, record: record('b', 9) }),
      enregistrerExerciceFemmes({ ...base, record: record('c', 7) }),
    ]);
    const lignes = await seancesFemmes(id);
    expect(lignes).toHaveLength(1);
    expect(lignes[0]!.exercices).toHaveLength(3);
  });

  it('terminer une séance garde ses exercices', async () => {
    const id = await cycleFemmes();
    const base = { cycleId: id, semaine: 1, jour: 0 as const, version: 'salle' as const };
    await enregistrerExerciceFemmes({ ...base, record: record('a', 8) });
    expect(await terminerSeanceFemmes(base)).toBe(false);
    const [ligne] = await seancesFemmes(id);
    expect(ligne!.terminee).toBe(true);
    expect(ligne!.exercices).toHaveLength(1);
  });

  it('la dernière des trente séances clôt le cycle — une seule fois', async () => {
    const id = await cycleFemmes();
    let fins = 0;
    for (const c of ORDRE) {
      if (
        await terminerSeanceFemmes({
          cycleId: id,
          semaine: c.semaine,
          jour: c.jour,
          version: 'maison',
        })
      ) {
        fins++;
      }
    }
    expect(fins).toBe(1);
    expect((await db.cycles.get(id))?.statut).toBe('termine');
    // Refaire la dernière ne la « reclôt » pas.
    const der = ORDRE[ORDRE.length - 1]!;
    expect(
      await terminerSeanceFemmes({
        cycleId: id,
        semaine: der.semaine,
        jour: der.jour,
        version: 'maison',
      }),
    ).toBe(false);
  });

  it('« non faite » se pose, garde la saisie, et se défait', async () => {
    const id = await cycleFemmes();
    const base = { cycleId: id, semaine: 1, jour: 0 as const, version: 'maison' as const };
    await enregistrerExerciceFemmes({ ...base, record: record('a', 5) });
    await marquerSeanceFemmesNonFaite({ ...base, nonFaite: true });
    let [ligne] = await seancesFemmes(id);
    expect(ligne!.sautee).toBe(true);
    expect(ligne!.exercices).toHaveLength(1);
    await marquerSeanceFemmesNonFaite({ ...base, nonFaite: false });
    [ligne] = await seancesFemmes(id);
    expect(ligne!.sautee).toBe(false);
  });

  it('faire une séance marquée « non faite » efface la marque', async () => {
    const id = await cycleFemmes();
    const base = { cycleId: id, semaine: 1, jour: 0 as const, version: 'maison' as const };
    await marquerSeanceFemmesNonFaite({ ...base, nonFaite: true });
    await terminerSeanceFemmes(base);
    const [ligne] = await seancesFemmes(id);
    expect(ligne).toMatchObject({ terminee: true, sautee: false });
  });

  it('passer la dernière séance restante clôt aussi le cycle', async () => {
    const id = await cycleFemmes();
    for (const c of ORDRE.slice(0, -1)) {
      await terminerSeanceFemmes({
        cycleId: id,
        semaine: c.semaine,
        jour: c.jour,
        version: 'maison',
      });
    }
    const der = ORDRE[ORDRE.length - 1]!;
    expect(
      await marquerSeanceFemmesNonFaite({
        cycleId: id,
        semaine: der.semaine,
        jour: der.jour,
        version: 'maison',
        nonFaite: true,
      }),
    ).toBe(true);
    expect((await db.cycles.get(id))?.statut).toBe('termine');
  });

  it('un cycle FEMMES avec une séance n’est pas « vierge » : il ne se supprime pas', async () => {
    // Un second cycle actif, pour que la suppression ne soit pas refusée
    // pour une autre raison (dernier cycle en cours).
    const id = await cycleFemmes();
    await demarrerCycle({ programmeId: 'power12', programmeVersion: '1.2', startDate: '' });
    await terminerSeanceFemmes({ cycleId: id, semaine: 1, jour: 0, version: 'maison' });
    expect(await supprimerCycleNonCommence(id)).toBe(false);
    expect(await db.cycles.get(id)).toBeDefined();
  });

  it('l’export emporte les séances, l’import les rend telles quelles', async () => {
    const id = await cycleFemmes();
    const base = { cycleId: id, semaine: 1, jour: 0 as const, version: 'maison' as const };
    await enregistrerExerciceFemmes({ ...base, record: record('a', 9) });
    await terminerSeanceFemmes(base);
    const fichier = JSON.parse(JSON.stringify(await exportAll()));
    await db.femmesSeances.clear();
    const rapport = await importAll(parseExport(JSON.stringify(fichier)));
    expect(rapport.femmesSeances).toBe(1);
    const [ligne] = await seancesFemmes(id);
    expect(ligne!.terminee).toBe(true);
    expect(ligne!.exercices[0]!.actual).toBe(9);
  });
});
