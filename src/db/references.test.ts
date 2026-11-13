/**
 * Les références de force en base (v24) : ajoutées, jamais modifiées,
 * jamais mélangées aux 1RM de POWER, jamais emportées avec un cycle.
 */
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from './db';
import * as acces from './references';
import { ajouterReference, referencesDe, toutesLesReferences } from './references';
import { demarrerCycle, getSettingsRow, supprimerCycleNonCommence } from './repo';
import { exportAll, importAll, parseExport } from './export';
import type { SaisieReference } from '../engine/references';

const saisie = (p: Partial<SaisieReference> = {}): SaisieReference => ({
  exercice: 'developpe-couche',
  variante: 'barre',
  modalite: 'direct',
  chargeKg: 100,
  reps: 1,
  date: '2026-11-01',
  programmeId: 'mass-force',
  cycleId: null,
  note: '',
  ...p,
});

describe('références de force en base', () => {
  beforeEach(async () => {
    await db.open();
    await Promise.all([db.referencesForce.clear(), db.cycles.clear(), db.settings.clear()]);
  });
  afterAll(() => db.close());

  it('un nouveau test S’AJOUTE : l’ancien reste, avec sa date', async () => {
    await ajouterReference(saisie({ date: '2026-09-01', chargeKg: 90 }));
    await ajouterReference(saisie({ date: '2026-11-01', chargeKg: 100 }));
    const lignes = await referencesDe('developpe-couche');
    expect(lignes.map((r) => [r.date, r.chargeKg])).toEqual([
      ['2026-09-01', 90],
      ['2026-11-01', 100],
    ]);
  });

  it('une saisie invalide est refusée, et rien n’est écrit', async () => {
    await expect(ajouterReference(saisie({ chargeKg: 0 }))).rejects.toThrow();
    await expect(ajouterReference(saisie({ reps: 5 }))).rejects.toThrow(/une seule répétition/);
    expect(await toutesLesReferences()).toHaveLength(0);
  });

  it('le sous-maximal garde ses données brutes, sans estimation stockée', async () => {
    await ajouterReference(saisie({ modalite: 'sous-maximal', chargeKg: 80, reps: 6 }));
    const [r] = await toutesLesReferences();
    expect(r).toMatchObject({ modalite: 'sous-maximal', chargeKg: 80, reps: 6 });
    expect(Object.keys(r!).some((k) => /estim|1rm/i.test(k))).toBe(false);
  });

  it('n’offre ni modification ni suppression', () => {
    expect(Object.keys(acces).sort()).toEqual([
      'ajouterReference',
      'referencesDe',
      'toutesLesReferences',
    ]);
  });

  it('ne touche JAMAIS aux 1RM de POWER (`settings.oneRM`)', async () => {
    await db.settings.put({ ...(await getSettingsRow()), oneRM: { 'bench-press': 115 } });
    const avant = (await getSettingsRow()).oneRM;
    await ajouterReference(saisie({ exercice: 'bench-press', variante: 'barre', chargeKg: 60 }));
    expect((await getSettingsRow()).oneRM).toEqual(avant);
  });

  it('supprimer un cycle n’emporte pas les références qui en viennent', async () => {
    const c = await demarrerCycle({
      programmeId: 'mass-force',
      programmeVersion: '0.1',
      startDate: '',
    });
    await demarrerCycle({ programmeId: 'power12', programmeVersion: '1.2', startDate: '' });
    await ajouterReference(saisie({ cycleId: c.id! }));
    expect(await supprimerCycleNonCommence(c.id!)).toBe(true);
    expect(await toutesLesReferences()).toHaveLength(1);
  });

  it('l’export les emporte, l’import les rend identiques', async () => {
    await ajouterReference(saisie({ date: '2026-09-01', chargeKg: 90 }));
    await ajouterReference(saisie({ variante: 'smith', chargeKg: 95 }));
    const avant = await toutesLesReferences();
    const fichier = JSON.stringify(await exportAll());
    await db.referencesForce.clear();
    const rapport = await importAll(parseExport(fichier));
    expect(rapport.referencesForce).toBe(2);
    expect(await toutesLesReferences()).toEqual(avant);
  });

  it('un export d’avant la v24 se réimporte sans erreur', async () => {
    const fichier = JSON.parse(JSON.stringify(await exportAll()));
    delete fichier.referencesForce;
    const rapport = await importAll(parseExport(JSON.stringify(fichier)));
    expect(rapport.referencesForce).toBe(0);
  });
});
