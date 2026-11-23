/**
 * La sauvegarde en ligne de bout en bout, avec un FAUX serveur en mémoire :
 * la vraie base locale (fake-indexeddb), le vrai export, la vraie
 * restauration. Seul le réseau est simulé.
 */
import 'fake-indexeddb/auto';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../db/db';
import { exportAll, importAll, parseExport } from '../db/export';
import { demarrerCycle, saveSet } from '../db/repo';
import { lireDernierExport } from '../state/dernierExport';
import { lireEtatCloud } from '../state/cloudEtat';
import type { ResumeSauvegarde } from './regles';
import { sauvegarder, sauvegardeAuto, utiliserService } from './sauvegarde';
import type { ServiceCloud } from './service';

function stubStorage() {
  const store = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  });
}

/** Un serveur en mémoire : un compte, un dossier. */
function fauxServeur(opts: { connecte?: boolean; panne?: boolean } = {}) {
  const fichiers = new Map<string, string>();
  const envois: string[] = [];
  const service: ServiceCloud = {
    compte: () =>
      Promise.resolve(opts.connecte === false ? null : { uid: 'u1', email: 'g@exemple.fr' }),
    envoyerCode: () => Promise.resolve(),
    verifierCode: () => Promise.resolve({ uid: 'u1', email: 'g@exemple.fr' }),
    deconnecter: () => Promise.resolve(),
    lireResume: (uid) => {
      if (opts.panne) return Promise.reject(new Error('Failed to fetch'));
      const t = fichiers.get(`${uid}/resume.json`);
      return Promise.resolve(t === undefined ? null : (JSON.parse(t) as ResumeSauvegarde));
    },
    envoyer: async (uid, texte, resume) => {
      await Promise.resolve();
      const ancienne = fichiers.get(`${uid}/sauvegarde.json`);
      if (ancienne !== undefined) fichiers.set(`${uid}/sauvegarde-precedente.json`, ancienne);
      fichiers.set(`${uid}/sauvegarde.json`, texte);
      fichiers.set(`${uid}/resume.json`, JSON.stringify(resume));
      envois.push(texte);
    },
    telecharger: (uid) => Promise.resolve(fichiers.get(`${uid}/sauvegarde.json`) ?? null),
    supprimerTout: () => Promise.resolve(fichiers.clear()),
  };
  return { service, fichiers, envois };
}

const serie = (setIndex: number, actualKg: number) =>
  saveSet({
    sessionId: 1,
    exerciseId: 'back-squat',
    week: 1,
    day: 0,
    date: '2026-09-14',
    setIndex,
    plannedKg: null,
    plannedReps: 5,
    targetRPE: null,
    actualKg,
    actualReps: 5,
    actualRpe: null,
    failed: false,
  });

beforeEach(async () => {
  stubStorage();
  await db.open();
  await Promise.all(db.tables.map((t) => t.clear()));
  await demarrerCycle({ programmeId: 'power12', programmeVersion: '1', startDate: '2026-09-07' });
});
afterEach(() => utiliserService(null));
afterAll(() => db.close());

describe('la sauvegarde part', () => {
  it('le fichier envoyé est l’export, sans photos, et se restaure sur une base neuve', async () => {
    const s = fauxServeur();
    utiliserService(s.service);
    await serie(0, 100);
    await serie(1, 102.5);

    const r = await sauvegarder({ maintenant: new Date('2026-11-23T10:00:00') });
    expect(r.statut).toBe('envoyee');
    expect(s.envois).toHaveLength(1);
    const envoye = parseExport(s.envois[0]!);
    expect(envoye.photosIncluded).toBe(false);
    expect(envoye.sets).toHaveLength(2);
    expect(JSON.parse(s.fichiers.get('u1/resume.json')!)).toMatchObject({ series: 2 });

    // Le rappel d'export du jour se tait, l'état dit « réussi ».
    expect(lireDernierExport()).toBe('2026-11-23');
    expect(lireEtatCloud()).toMatchObject({ enAttente: false, conflit: null });

    // Téléphone neuf : la base est vidée, on restaure ce que le compte garde.
    await Promise.all(db.tables.map((t) => t.clear()));
    const texte = await s.service.telecharger('u1');
    await importAll(parseExport(texte!));
    expect((await db.sets.toArray()).map((x) => x.actualKg)).toEqual([100, 102.5]);
  });

  it('la précédente est gardée à côté de la nouvelle', async () => {
    const s = fauxServeur();
    utiliserService(s.service);
    await serie(0, 100);
    await sauvegarder();
    await serie(1, 102.5);
    await sauvegarder();
    expect(parseExport(s.fichiers.get('u1/sauvegarde-precedente.json')!).sets).toHaveLength(1);
    expect(parseExport(s.fichiers.get('u1/sauvegarde.json')!).sets).toHaveLength(2);
  });

  it('deux demandes rapprochées n’envoient qu’une fois', async () => {
    const s = fauxServeur();
    utiliserService(s.service);
    await serie(0, 100);
    const [a, b] = await Promise.all([sauvegarder(), sauvegarder()]);
    expect(a).toEqual(b);
    expect(s.envois).toHaveLength(1);
  });
});

describe('la sauvegarde ne part PAS', () => {
  it('sans compte connecté', async () => {
    const s = fauxServeur({ connecte: false });
    utiliserService(s.service);
    await serie(0, 100);
    expect((await sauvegarder()).statut).toBe('non-connecte');
    expect(s.envois).toHaveLength(0);
  });

  it('téléphone neuf, vide : il n’écrase pas le compte', async () => {
    const s = fauxServeur();
    utiliserService(s.service);
    await serie(0, 100);
    await sauvegarder();
    await Promise.all(db.tables.map((t) => t.clear()));
    await demarrerCycle({ programmeId: 'power12', programmeVersion: '1', startDate: '2026-09-07' });

    expect((await sauvegarder()).statut).toBe('base-vierge');
    expect(s.envois).toHaveLength(1);
    expect(parseExport(s.fichiers.get('u1/sauvegarde.json')!).sets).toHaveLength(1);
  });

  it('moins de données que le compte : retenu, signalé, puis « Remplacer quand même »', async () => {
    const s = fauxServeur();
    utiliserService(s.service);
    await serie(0, 100);
    await serie(1, 102.5);
    await serie(2, 105);
    await sauvegarder();
    await db.sets.clear();
    await serie(0, 60);

    const r = await sauvegarder();
    expect(r).toMatchObject({ statut: 'moins-que-en-ligne' });
    expect(s.envois).toHaveLength(1);
    expect(lireEtatCloud().conflit).not.toBeNull();

    expect((await sauvegarder({ forcer: true })).statut).toBe('envoyee');
    expect(parseExport(s.fichiers.get('u1/sauvegarde.json')!).sets).toHaveLength(1);
    expect(lireEtatCloud().conflit).toBeNull();
  });

  it('sans réseau : une erreur lisible, et l’envoi attend', async () => {
    const s = fauxServeur({ panne: true });
    utiliserService(s.service);
    await serie(0, 100);
    const r = await sauvegarder();
    expect(r).toEqual({
      statut: 'erreur',
      message: 'Pas de connexion : la sauvegarde partira dès que le réseau revient.',
    });
    expect(lireEtatCloud().enAttente).toBe(true);
  });

  it('sans compte configuré dans l’appli : rien, et « Séance terminée » ne lève jamais', async () => {
    utiliserService(null);
    expect((await sauvegarder()).statut).toBe('non-configure');
    expect(() => sauvegardeAuto()).not.toThrow();
  });
});

describe('le fichier envoyé = l’export « Exporter mes données »', () => {
  it('mêmes tables, mêmes lignes', async () => {
    const s = fauxServeur();
    utiliserService(s.service);
    await serie(0, 100);
    await sauvegarder();
    const envoye = JSON.parse(s.envois[0]!) as Record<string, unknown>;
    const local = (await exportAll()) as unknown as Record<string, unknown>;
    expect(Object.keys(envoye).sort()).toEqual(Object.keys(local).sort());
    expect(envoye.sets).toEqual(local.sets);
  });
});
