/**
 * Les programmes importés en base — lot 2 de l'ADR ME, MYSELF & I.
 *
 * Ce que ces tests figent :
 * - rien n'est écrit avant validation, ni sans durée quand le document n'en
 *   fixe pas ; aucune durée par défaut ;
 * - un réimport identique n'écrit rien ; une autre durée ou un document
 *   modifié crée une NOUVELLE version, après confirmation, sans toucher aux
 *   précédentes ;
 * - deux programmes ne se mélangent jamais ;
 * - un programme utilisé par un cycle ne se supprime pas ; supprimer emporte
 *   ses images de référence et seulement les siennes ;
 * - la sauvegarde rend programmes ET performances ; un fichier v3 se
 *   restaure ; une restauration incohérente ne modifie rien.
 */
import 'fake-indexeddb/auto';
import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { deleteDB } from './testSchemas';
import { DEFAULT_SETTINGS_ROW, ProgrammeDB, type CycleRow, type SetRow } from './db';

const NOM = 'programmes-importes-test';
const TRAINING1 = readFileSync(
  new URL('../engine/perso/__fixtures__/training1.json', import.meta.url),
  'utf8',
);
const UID_T1 = 'training1guillaume201005';

/** Même procédé que `exportRoundTrip.test.ts` : une base jetable à la place de `db`. */
async function monterBaseJetable(): Promise<ProgrammeDB> {
  await deleteDB(NOM);
  const jetable = new ProgrammeDB(NOM);
  await jetable.open();
  const mod = await import('./db');
  Object.defineProperty(mod, 'db', { value: jetable, configurable: true, writable: true });
  return jetable;
}

/** Un second programme, d'une semaine, qui fixe lui-même sa durée. */
const AUTRE = JSON.stringify({
  format: 'majk-programme',
  schemaVersion: 1,
  programme: {
    uid: 'autreprog01',
    nom: 'Autre',
    source: { document: 'autre.pdf' },
    dureeSemaines: 1,
  },
  exercices: [{ id: 'squat', nom: 'Squat' }],
  semaines: [
    {
      numeros: [1],
      seances: [
        {
          id: 'lundi',
          jour: 0,
          titre: 'Jambes',
          lignes: [
            {
              exerciceId: 'squat',
              texteOriginal: 'Squat | 4 x 5',
              prescription: { series: 4, objectif: { type: 'reps', reps: 5 } },
            },
          ],
        },
      ],
    },
  ],
});

function training1Modifie(): string {
  const o = JSON.parse(TRAINING1);
  o.semaines[0].seances[1].lignes[1].prescription.objectif.reps = 6;
  return JSON.stringify(o);
}

function cycle(programmeId: string): CycleRow {
  return {
    programmeId,
    programmeVersion: '1',
    startDate: '2026-11-16',
    statut: 'en-cours',
    endedAt: '',
    createdAt: '2026-11-16',
  };
}

function serie(cycleId: number, exerciseId: string): SetRow {
  return {
    cycleId,
    sessionId: 1,
    exerciseId,
    week: 1,
    day: 0,
    date: '2026-11-16',
    setIndex: 0,
    plannedKg: null,
    plannedReps: 8,
    targetRpeMin: null,
    targetRpeMax: null,
    targetRpeLabel: null,
    actualKg: 60,
    actualReps: 8,
    actualRpe: null,
    measureValue: null,
    failed: false,
    doneAt: 1,
  };
}

const image = (exerciseId: string) => ({
  exerciseId,
  blob: new Blob(['x']),
  bytes: 1,
  width: 1,
  height: 1,
  addedAt: '2026-11-16',
});

beforeEach(async () => {
  await deleteDB(NOM);
});

describe('importer', () => {
  it('sans durée choisie, rien n’est écrit ; hors de 1 à 12 non plus', async () => {
    const base = await monterBaseJetable();
    const { importerProgramme } = await import('./programmesImportes');
    expect((await importerProgramme(TRAINING1)).statut).toBe('duree-a-choisir');
    expect((await importerProgramme(TRAINING1, { dureeSemaines: 0 })).statut).toBe(
      'duree-a-choisir',
    );
    expect((await importerProgramme(TRAINING1, { dureeSemaines: 13 })).statut).toBe(
      'duree-a-choisir',
    );
    expect(await base.programmesImportes.count()).toBe(0);
    base.close();
  });

  it('un fichier invalide est refusé, rien n’est écrit', async () => {
    const base = await monterBaseJetable();
    const { importerProgramme } = await import('./programmesImportes');
    const r = await importerProgramme('{', { dureeSemaines: 8 });
    expect(r.statut).toBe('refuse');
    expect(await base.programmesImportes.count()).toBe(0);
    base.close();
  });

  it('Training 1 sur 8 semaines : une version figée, texte gardé au caractère près', async () => {
    const base = await monterBaseJetable();
    const { importerProgramme } = await import('./programmesImportes');
    const r = await importerProgramme(TRAINING1, { dureeSemaines: 8, aujourdhui: '2026-11-16' });
    expect(r).toMatchObject({ statut: 'importe', cle: `perso-${UID_T1}-1` });
    if (r.statut === 'importe') expect(r.rapport.compatibles).toBe(44);

    const row = (await base.programmesImportes.toArray())[0]!;
    expect(row).toMatchObject({
      cle: `perso-${UID_T1}-1`,
      uid: UID_T1,
      rev: 1,
      nom: 'Training 1',
      importeLe: '2026-11-16',
      archive: false,
      reponses: { dureeSemaines: 8 },
    });
    expect(row.texte).toBe(TRAINING1);
    expect(row.document.dureeSemaines).toBeNull();
    base.close();
  });

  it('un document qui fixe sa durée ne pose pas la question', async () => {
    const base = await monterBaseJetable();
    const { importerProgramme } = await import('./programmesImportes');
    expect(await importerProgramme(AUTRE, { dureeSemaines: 4 })).toEqual({
      statut: 'duree-deja-fixee',
      dureeSemaines: 1,
    });
    const r = await importerProgramme(AUTRE);
    expect(r).toMatchObject({ statut: 'importe', cle: 'perso-autreprog01-1' });
    expect((await base.programmesImportes.toArray())[0]!.reponses.dureeSemaines).toBeNull();
    base.close();
  });

  it('réimport identique : rien n’est écrit', async () => {
    const base = await monterBaseJetable();
    const { importerProgramme } = await import('./programmesImportes');
    await importerProgramme(TRAINING1, { dureeSemaines: 8 });
    // Même programme, autre mise en page : c'est toujours le même.
    const compact = JSON.stringify(JSON.parse(TRAINING1));
    expect(await importerProgramme(compact, { dureeSemaines: 8 })).toEqual({
      statut: 'deja-importe',
      cle: `perso-${UID_T1}-1`,
    });
    expect(await base.programmesImportes.count()).toBe(1);
    base.close();
  });

  it('nouvelle version : confirmation, puis rev + 1, sans toucher aux précédentes', async () => {
    const base = await monterBaseJetable();
    const { importerProgramme, programmeImporte } = await import('./programmesImportes');
    await importerProgramme(TRAINING1, { dureeSemaines: 8 });
    const avant = await programmeImporte(`perso-${UID_T1}-1`);

    // Même document, autre durée.
    expect(await importerProgramme(TRAINING1, { dureeSemaines: 6 })).toEqual({
      statut: 'nouvelle-version-a-confirmer',
      actuelle: { cle: `perso-${UID_T1}-1`, nom: 'Training 1' },
      nom: 'Training 1',
    });
    expect(await base.programmesImportes.count()).toBe(1);
    expect(
      await importerProgramme(TRAINING1, { dureeSemaines: 6, confirmerNouvelleVersion: true }),
    ).toMatchObject({ statut: 'importe', cle: `perso-${UID_T1}-2` });

    // Document modifié (une répétition).
    expect(
      await importerProgramme(training1Modifie(), {
        dureeSemaines: 8,
        confirmerNouvelleVersion: true,
      }),
    ).toMatchObject({ statut: 'importe', cle: `perso-${UID_T1}-3` });

    expect(await programmeImporte(`perso-${UID_T1}-1`)).toEqual(avant);
    expect(await base.programmesImportes.count()).toBe(3);
    base.close();
  });

  it('deux programmes différents ne se mélangent pas', async () => {
    const base = await monterBaseJetable();
    const { importerProgramme, listerProgrammesImportes, idExerciceImporte } =
      await import('./programmesImportes');
    await importerProgramme(TRAINING1, { dureeSemaines: 8 });
    const r = await importerProgramme(AUTRE);
    // Un autre uid : pas de « nouvelle version » à confirmer.
    expect(r).toMatchObject({ statut: 'importe', cle: 'perso-autreprog01-1' });
    const liste = await listerProgrammesImportes();
    expect(liste.map((p) => p.cle)).toEqual(['perso-autreprog01-1', `perso-${UID_T1}-1`]);
    // Le même « squat » n'a pas le même identifiant d'historique.
    expect(idExerciceImporte('perso-autreprog01-1', 'squat')).not.toBe(
      idExerciceImporte(`perso-${UID_T1}-1`, 'squat'),
    );
    base.close();
  });
});

describe('archiver et supprimer', () => {
  it('archiver ne change que `archive`', async () => {
    const base = await monterBaseJetable();
    const { importerProgramme, archiverProgramme, programmeImporte } =
      await import('./programmesImportes');
    await importerProgramme(TRAINING1, { dureeSemaines: 8 });
    const cle = `perso-${UID_T1}-1`;
    const avant = await programmeImporte(cle);
    expect(await archiverProgramme(cle, true)).toBe(true);
    expect(await programmeImporte(cle)).toEqual({ ...avant, archive: true });
    expect(await archiverProgramme('perso-inconnu00-1', true)).toBe(false);
    base.close();
  });

  it('un programme suivi par un cycle ne se supprime pas', async () => {
    const base = await monterBaseJetable();
    const { importerProgramme, supprimerProgramme } = await import('./programmesImportes');
    await importerProgramme(TRAINING1, { dureeSemaines: 8 });
    const cle = `perso-${UID_T1}-1`;
    await base.cycles.add({ ...cycle(cle), statut: 'termine' });
    expect(await supprimerProgramme(cle)).toBe('utilise-par-un-cycle');
    expect(await base.programmesImportes.count()).toBe(1);
    expect(await supprimerProgramme('perso-inconnu00-1')).toBe('introuvable');
    base.close();
  });

  /*
   * Guillaume (26 novembre) : « après sa seconde confirmation, on supprime ».
   * Avec `avecSesCycles`, le programme part AVEC ses cycles et tout ce qui y
   * a été noté, en une transaction ; les autres programmes n'y perdent rien.
   */
  it('avec ses cycles : le programme, ses cycles et leurs lignes partent ensemble', async () => {
    const base = await monterBaseJetable();
    const { importerProgramme, supprimerProgramme, bilanSuppression } =
      await import('./programmesImportes');
    await importerProgramme(TRAINING1, { dureeSemaines: 8 });
    await importerProgramme(AUTRE);
    const cle = `perso-${UID_T1}-1`;
    const c1 = (await base.cycles.add({ ...cycle(cle), statut: 'termine' })) as number;
    const c2 = (await base.cycles.add(cycle(cle))) as number;
    const autre = (await base.cycles.add(cycle('perso-autreprog01-1'))) as number;
    const power = (await base.cycles.add({
      ...cycle('power12'),
      startDate: '2026-09-01',
    })) as number;
    const seance = (cycleId: number, status: 'done' | 'planned') => ({
      cycleId,
      week: 1,
      day: 0 as const,
      date: '2026-11-16',
      status,
      warmupChecked: [],
      notes: '',
    });
    await base.sessions.bulkAdd([
      seance(c1, 'done'),
      { ...seance(c2, 'done'), day: 2 as const },
      { ...seance(c2, 'planned'), day: 4 as const },
      seance(autre, 'done'),
    ] as never);
    await base.sets.bulkAdd([
      serie(c1, `${cle}-squat`),
      { ...serie(c2, `${cle}-squat`), setIndex: 1 },
      { ...serie(c2, `${cle}-squat`), setIndex: 2 },
      serie(autre, 'perso-autreprog01-1-squat'),
    ]);
    await base.femmesSeances.add({ cycleId: c2, semaine: 1, jour: 0 } as never);
    await base.settings.put({ ...DEFAULT_SETTINGS_ROW, id: 1, cycleActifId: c2 });

    // Ce que la première confirmation annonce.
    expect(await bilanSuppression(cle)).toEqual({ cycles: 2, seances: 2, series: 3 });

    // Sans l'option : toujours refusé, rien ne bouge.
    expect(await supprimerProgramme(cle)).toBe('utilise-par-un-cycle');
    expect(await base.cycles.count()).toBe(4);

    expect(await supprimerProgramme(cle, { avecSesCycles: true })).toBe('supprime');
    expect((await base.programmesImportes.toArray()).map((p) => p.cle)).toEqual([
      'perso-autreprog01-1',
    ]);
    expect((await base.cycles.toArray()).map((c) => c.id).sort()).toEqual([autre, power].sort());
    expect((await base.sessions.toArray()).map((x) => x.cycleId)).toEqual([autre]);
    expect((await base.sets.toArray()).map((x) => x.cycleId)).toEqual([autre]);
    expect(await base.femmesSeances.count()).toBe(0);
    // Le cycle actif est parti : le plus récent des cycles en cours prend sa place.
    expect((await base.settings.get(1))?.cycleActifId).toBe(autre);
    expect(await bilanSuppression(cle)).toEqual({ cycles: 0, seances: 0, series: 0 });
    base.close();
  });

  it('plus aucun cycle en cours : le cycle actif revient à « aucun »', async () => {
    const base = await monterBaseJetable();
    const { importerProgramme, supprimerProgramme } = await import('./programmesImportes');
    await importerProgramme(TRAINING1, { dureeSemaines: 8 });
    const cle = `perso-${UID_T1}-1`;
    const c = (await base.cycles.add(cycle(cle))) as number;
    await base.settings.put({ ...DEFAULT_SETTINGS_ROW, id: 1, cycleActifId: c });
    expect(await supprimerProgramme(cle, { avecSesCycles: true })).toBe('supprime');
    expect(await base.cycles.count()).toBe(0);
    expect((await base.settings.get(1))?.cycleActifId).toBe(0);
    base.close();
  });

  it('après la suppression, la sauvegarde se restaure sur une base neuve', async () => {
    const base = await monterBaseJetable();
    const { importerProgramme, supprimerProgramme } = await import('./programmesImportes');
    await importerProgramme(TRAINING1, { dureeSemaines: 8 });
    await importerProgramme(AUTRE);
    const cle = `perso-${UID_T1}-1`;
    const c1 = (await base.cycles.add(cycle(cle))) as number;
    const c2 = (await base.cycles.add(cycle('perso-autreprog01-1'))) as number;
    await base.sets.bulkAdd([serie(c1, `${cle}-squat`), serie(c2, 'perso-autreprog01-1-squat')]);
    expect(await supprimerProgramme(cle, { avecSesCycles: true })).toBe('supprime');

    const { exportAll, importAll, parseExport } = await import('./export');
    const fichier = JSON.stringify(await exportAll());
    base.close();
    const neuve = await monterBaseJetable();
    const rapport = await importAll(parseExport(fichier));
    expect(rapport.programmesImportes).toBe(1);
    expect(rapport.cycles).toBe(1);
    expect(rapport.sets).toBe(1);
    neuve.close();
  });

  it('supprimer emporte ses images de référence, et seulement les siennes', async () => {
    const base = await monterBaseJetable();
    const { importerProgramme, supprimerProgramme } = await import('./programmesImportes');
    await importerProgramme(TRAINING1, { dureeSemaines: 8 });
    await importerProgramme(TRAINING1, { dureeSemaines: 6, confirmerNouvelleVersion: true });
    await base.exerciseReference.bulkAdd([
      image(`perso-${UID_T1}-1-squat`),
      // La version 2 : « -1- » n'est pas un préfixe de « -2- ».
      image(`perso-${UID_T1}-2-squat`),
      image('back-squat'),
    ]);
    expect(await supprimerProgramme(`perso-${UID_T1}-1`)).toBe('supprime');
    expect((await base.exerciseReference.toArray()).map((r) => r.exerciseId).sort()).toEqual([
      'back-squat',
      `perso-${UID_T1}-2-squat`,
    ]);
    expect((await base.programmesImportes.toArray()).map((p) => p.cle)).toEqual([
      `perso-${UID_T1}-2`,
    ]);
    base.close();
  });
});

describe('sauvegarde', () => {
  async function remplir(base: ProgrammeDB) {
    const { importerProgramme } = await import('./programmesImportes');
    await importerProgramme(TRAINING1, { dureeSemaines: 8 });
    await importerProgramme(training1Modifie(), {
      dureeSemaines: 8,
      confirmerNouvelleVersion: true,
    });
    await importerProgramme(AUTRE);
    const c1 = (await base.cycles.add(cycle(`perso-${UID_T1}-1`))) as number;
    const c2 = (await base.cycles.add(cycle('perso-autreprog01-1'))) as number;
    await base.cycles.add(cycle('power12'));
    await base.sets.bulkAdd([
      serie(c1, `perso-${UID_T1}-1-squat`),
      serie(c2, 'perso-autreprog01-1-squat'),
    ]);
  }

  it('aller-retour : deux programmes, dont un en deux versions, et leurs cycles', async () => {
    const base = await monterBaseJetable();
    await remplir(base);
    const { exportAll, importAll, parseExport } = await import('./export');
    const avant = await base.programmesImportes.toArray();
    const fichier = JSON.stringify(await exportAll());

    // Une autre base, vide, comme sur un nouveau téléphone.
    base.close();
    const neuve = await monterBaseJetable();
    const rapport = await importAll(parseExport(fichier));
    expect(rapport.programmesImportes).toBe(3);
    expect(rapport.cycles).toBe(3);
    expect(rapport.sets).toBe(2);

    const apres = await neuve.programmesImportes.toArray();
    const sansId = (r: { id?: number }) => ({ ...r, id: undefined });
    expect(apres.map(sansId)).toEqual(avant.map(sansId));
    expect((await neuve.sets.toArray()).map((s) => s.exerciseId).sort()).toEqual([
      'perso-autreprog01-1-squat',
      `perso-${UID_T1}-1-squat`,
    ]);
    neuve.close();
  });

  it('un fichier v3, sans programmes importés, se restaure', async () => {
    const base = await monterBaseJetable();
    const { importAll, parseExport } = await import('./export');
    const v3 = JSON.stringify({
      format: 'programme-12-semaines',
      version: 3,
      exportedAt: '2026-11-01T08:00:00.000Z',
      settings: null,
      sessions: [],
      sets: [],
      readiness: [],
      combines: [],
      cycles: [cycle('power12')],
      photosIncluded: false,
    });
    const rapport = await importAll(parseExport(v3));
    expect(rapport.programmesImportes).toBe(0);
    expect(await base.cycles.count()).toBe(1);
    base.close();
  });

  it('un cycle dont le programme manque au fichier : refus, base intacte', async () => {
    const base = await monterBaseJetable();
    await remplir(base);
    const { exportAll, importAll } = await import('./export');
    const avant = {
      programmes: await base.programmesImportes.count(),
      cycles: await base.cycles.count(),
      sets: await base.sets.count(),
    };
    const fichier = await exportAll();
    fichier.programmesImportes = fichier.programmesImportes!.filter(
      (p) => p.cle !== 'perso-autreprog01-1',
    );
    await expect(importAll(fichier)).rejects.toThrow(/absent de ce fichier/);
    expect({
      programmes: await base.programmesImportes.count(),
      cycles: await base.cycles.count(),
      sets: await base.sets.count(),
    }).toEqual(avant);
    base.close();
  });

  it('un programme retouché dans la sauvegarde : refus, base intacte', async () => {
    const base = await monterBaseJetable();
    await remplir(base);
    const { exportAll, importAll } = await import('./export');
    const fichier = await exportAll();
    fichier.programmesImportes![0]!.texte = fichier.programmesImportes![0]!.texte.replace(
      '"schemaVersion": 1',
      '"schemaVersion": 9',
    );
    await expect(importAll(fichier)).rejects.toThrow(/n'est plus valide/);
    expect(await base.programmesImportes.count()).toBe(3);
    base.close();
  });

  it('le document est reconstruit depuis le texte d’origine, pas recopié', async () => {
    const base = await monterBaseJetable();
    await remplir(base);
    const { exportAll, importAll } = await import('./export');
    const fichier = await exportAll();
    const cible = fichier.programmesImportes!.find((p) => p.cle === `perso-${UID_T1}-1`)!;
    cible.document = { ...cible.document, nom: 'Nom falsifié', exercices: [] };
    await importAll(fichier);
    const restaure = await base.programmesImportes.where('cle').equals(`perso-${UID_T1}-1`).first();
    expect(restaure!.document.nom).toBe('Training 1');
    expect(restaure!.document.exercices).toHaveLength(30);
    base.close();
  });
});

describe('la mémoire suit la base', () => {
  it('import, archivage, suppression et restauration mettent la mémoire à jour', async () => {
    const base = await monterBaseJetable();
    const { lireMemoire, viderMemoire } = await import('../programmes/perso/memoire');
    viderMemoire();
    const m = await import('./programmesImportes');
    const cle = `perso-${UID_T1}-1`;

    await m.importerProgramme(TRAINING1, { dureeSemaines: 8 });
    expect(lireMemoire().etat).toBe('pret');
    expect(lireMemoire().programmes.map((p) => p.cle)).toEqual([cle]);

    await m.archiverProgramme(cle, true);
    expect(lireMemoire().programmes[0]!.archive).toBe(true);

    const { exportAll, importAll } = await import('./export');
    const fichier = await exportAll();
    await m.supprimerProgramme(cle);
    expect(lireMemoire().programmes).toEqual([]);

    await importAll(fichier);
    expect(lireMemoire().programmes.map((p) => p.cle)).toEqual([cle]);
    base.close();
  });

  it('une base illisible met la mémoire en erreur, sans lever', async () => {
    const mod = await import('./db');
    const vraie = mod.db;
    Object.defineProperty(mod, 'db', {
      value: { programmesImportes: { toArray: () => Promise.reject(new Error('panne')) } },
      configurable: true,
      writable: true,
    });
    const { hydraterProgrammesImportes } = await import('./programmesImportes');
    const { lireMemoire, viderMemoire } = await import('../programmes/perso/memoire');
    viderMemoire();
    await expect(hydraterProgrammesImportes()).resolves.toBeUndefined();
    expect(lireMemoire()).toEqual({ etat: 'erreur', programmes: [] });
    Object.defineProperty(mod, 'db', { value: vraie, configurable: true, writable: true });
    viderMemoire();
  });
});
