/**
 * La couche cycle du dépôt de données.
 *
 * La migration prouve que la BASE sait porter deux cycles. Ce fichier prouve
 * que le DÉPÔT s'en sert : qu'une écriture va dans le cycle courant, qu'une
 * lecture ne voit que lui, et que basculer de cycle ne mélange rien.
 *
 * C'est la moitié qui manquait. Une base correcte lue par un dépôt qui ignore
 * les cycles rendrait les deux historiques fusionnés — exactement le défaut
 * qu'on cherche à empêcher, avec une migration impeccable par-dessus.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import 'fake-indexeddb/auto';
import { deleteDB } from './testSchemas';
import { ProgrammeDB } from './db';

const NOM = 'cycles-repo-test';

async function monterBaseJetable(): Promise<ProgrammeDB> {
  await deleteDB(NOM);
  const jetable = new ProgrammeDB(NOM);
  await jetable.open();
  const mod = await import('./db');
  Object.defineProperty(mod, 'db', { value: jetable, configurable: true, writable: true });
  return jetable;
}

const serie = (sessionId: number, kg: number) => ({
  sessionId,
  exerciseId: 'back-squat',
  week: 1,
  day: 0 as const,
  date: '2026-09-21',
  setIndex: 0,
  plannedKg: kg,
  plannedReps: 5,
  targetRPE: null,
  actualKg: kg,
  actualReps: 5,
  actualRpe: 7,
  failed: false,
});

describe('le dépôt et les cycles', () => {
  beforeEach(async () => {
    await deleteDB(NOM);
  });

  it('ne fabrique aucun cycle tant qu’on se contente de lire', async () => {
    const base = await monterBaseJetable();
    const { cycleActif, allSessions, allSets, allCombines } = await import('./repo');

    expect(await cycleActif()).toBeNull();
    expect(await allSessions()).toEqual([]);
    expect(await allSets()).toEqual([]);
    expect(await allCombines()).toEqual([]);
    expect(await base.cycles.count()).toBe(0);
  });

  it('crée le premier cycle à la première écriture, et un seul', async () => {
    const base = await monterBaseJetable();
    const { ensureSession, cycleActif } = await import('./repo');

    await ensureSession(1, 0, '2026-09-21');
    await ensureSession(1, 2, '2026-09-23');

    expect(await base.cycles.count()).toBe(1);
    const actif = await cycleActif();
    expect(actif?.statut).toBe('en-cours');
    expect((await base.sessions.toArray()).every((s) => s.cycleId === actif?.id)).toBe(true);
  });

  it('isole deux cycles qui portent la même semaine', async () => {
    const base = await monterBaseJetable();
    const { ensureSession, saveSet, allSessions, allSets, demarrerCycle, terminerCycle } =
      await import('./repo');

    // Cycle 1 : une séance et une série à 100 kg.
    const s1 = await ensureSession(1, 0, '2026-09-21');
    await saveSet({ ...serie(s1.id as number, 100), measureValue: null, measureUnit: null });
    expect(await allSets()).toHaveLength(1);

    // Le premier cycle se termine, un second démarre.
    const premier = (await base.cycles.toArray())[0];
    await terminerCycle(premier?.id as number, '2026-12-06');
    await demarrerCycle({
      programmeId: 'power12',
      programmeVersion: '1.2',
      startDate: '2027-01-04',
    });

    // Le second cycle part d'un historique vide, sans rien avoir effacé.
    expect(await allSessions()).toEqual([]);
    expect(await allSets()).toEqual([]);
    expect(await base.sets.count()).toBe(1);

    // La même semaine, le même jour, dans le second cycle : aucune collision.
    const s2 = await ensureSession(1, 0, '2027-01-11');
    expect(s2.id).not.toBe(s1.id);
    await saveSet({ ...serie(s2.id as number, 110), measureValue: null, measureUnit: null });

    const vues = await allSets();
    expect(vues).toHaveLength(1);
    expect(vues[0]?.actualKg).toBe(110);

    // Et le premier cycle a gardé la sienne, intacte.
    expect(await base.sets.count()).toBe(2);
    const toutes = await base.sets.toArray();
    expect(toutes.map((s) => s.actualKg).sort((a, b) => (a ?? 0) - (b ?? 0))).toEqual([100, 110]);
  });

  it('désigne le cycle courant au lieu de le deviner', async () => {
    const base = await monterBaseJetable();
    const { demarrerCycle, cycleActif, getSettingsRow } = await import('./repo');

    const premier = await demarrerCycle({
      programmeId: 'power12',
      programmeVersion: '1.2',
      startDate: '2026-09-14',
    });
    expect((await getSettingsRow()).cycleActifId).toBe(premier.id);

    const second = await demarrerCycle({
      programmeId: 'mass4',
      programmeVersion: '1.0',
      startDate: '2026-12-14',
    });
    expect((await getSettingsRow()).cycleActifId).toBe(second.id);
    expect((await cycleActif())?.id).toBe(second.id);

    // Les deux tournent : démarrer n'a rien terminé.
    expect((await base.cycles.toArray()).filter((c) => c.statut === 'en-cours')).toHaveLength(2);
  });

  it('planifie un cycle sans quitter celui qu’on est en train de faire', async () => {
    await monterBaseJetable();
    const { demarrerCycle, cycleActif } = await import('./repo');

    const courant = await demarrerCycle({
      programmeId: 'power12',
      programmeVersion: '1.2',
      startDate: '2026-09-14',
    });
    const prevu = await demarrerCycle({
      programmeId: 'power12',
      programmeVersion: '1.2',
      startDate: '2027-03-01',
      statut: 'prevu',
    });

    expect(prevu.statut).toBe('prevu');
    expect((await cycleActif())?.id).toBe(courant.id);
  });

  it('aligne le calendrier sur le cycle qu’on active', async () => {
    await monterBaseJetable();
    const { demarrerCycle, activerCycle, getSettingsRow } = await import('./repo');

    const premier = await demarrerCycle({
      programmeId: 'power12',
      programmeVersion: '1.2',
      startDate: '2026-09-14',
    });
    const second = await demarrerCycle({
      programmeId: 'power12',
      programmeVersion: '1.2',
      startDate: '2027-01-04',
    });
    expect((await getSettingsRow()).startDate).toBe('2027-01-04');

    await activerCycle(premier.id as number);
    const reglages = await getSettingsRow();
    expect(reglages.cycleActifId).toBe(premier.id);
    // Le point qui compte : la date de début suit, sinon les séances du
    // premier cycle s'afficheraient aux dates du second.
    expect(reglages.startDate).toBe('2026-09-14');
    expect(second.startDate).toBe('2027-01-04');
  });

  it('terminer un cycle n’efface rien et ne déplace personne', async () => {
    const base = await monterBaseJetable();
    const { ensureSession, demarrerCycle, terminerCycle, cycleActif } = await import('./repo');

    const cycle = await demarrerCycle({
      programmeId: 'power12',
      programmeVersion: '1.2',
      startDate: '2026-09-14',
    });
    await ensureSession(1, 0, '2026-09-21');

    await terminerCycle(cycle.id as number, '2026-12-06');

    const relu = await base.cycles.get(cycle.id as number);
    expect(relu?.statut).toBe('termine');
    expect(relu?.endedAt).toBe('2026-12-06');
    expect(await base.sessions.count()).toBe(1);
    // Terminer ne téléporte pas l'application ailleurs.
    expect((await cycleActif())?.id).toBe(cycle.id);
  });

  it('garde la date de début du cycle d’accord avec les réglages', async () => {
    const base = await monterBaseJetable();
    const { demarrerCycle, saveSettings } = await import('./repo');

    const cycle = await demarrerCycle({
      programmeId: 'power12',
      programmeVersion: '1.2',
      startDate: '2026-09-14',
    });

    await saveSettings({ startDate: '2026-09-21' });

    expect((await base.cycles.get(cycle.id as number))?.startDate).toBe('2026-09-21');
  });

  it('garde un combine « initial » par cycle, ce qui était impossible', async () => {
    const base = await monterBaseJetable();
    const { saveCombine, allCombines, demarrerCycle, terminerCycle } = await import('./repo');

    await saveCombine('initial', { date: '2026-09-14', metrics: { 'test-squat-1rm': 125 } });

    const premier = (await base.cycles.toArray())[0];
    await terminerCycle(premier?.id as number, '2026-12-06');
    await demarrerCycle({
      programmeId: 'power12',
      programmeVersion: '1.2',
      startDate: '2027-01-04',
    });

    await saveCombine('initial', { date: '2027-01-04', metrics: { 'test-squat-1rm': 137.5 } });

    expect(await base.combines.count()).toBe(2);
    const visibles = await allCombines();
    expect(visibles).toHaveLength(1);
    expect(visibles[0]?.metrics['test-squat-1rm']).toBe(137.5);
  });
});
