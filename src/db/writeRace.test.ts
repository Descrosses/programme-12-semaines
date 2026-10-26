import { beforeEach, describe, expect, it } from 'vitest';
import 'fake-indexeddb/auto';
import { deleteDB } from './testSchemas';
import { ProgrammeDB } from './db';

const NOM = 'draft-race-test';

async function monterBaseJetable(): Promise<ProgrammeDB> {
  await deleteDB(NOM);
  const jetable = new ProgrammeDB(NOM);
  await jetable.open();
  const mod = await import('./db');
  Object.defineProperty(mod, 'db', { value: jetable, configurable: true, writable: true });
  return jetable;
}

/**
 * Deux écritures qui se croisent sur une ligne unique.
 *
 * Le défaut est toujours le même : « lire la ligne, puis l'écrire » hors
 * transaction. Deux appels concurrents voient tous les deux « rien en base »
 * et insèrent tous les deux ; l'index unique rejette le second, et la saisie
 * est perdue sans message. Il ne se voit jamais en cliquant lentement, et
 * toujours en tapant vite.
 */
describe('frappe rapide sur un brouillon', () => {
  beforeEach(async () => {
    await deleteDB(NOM);
  });

  it('n’explose pas quand plusieurs frappes s’écrivent en parallèle', async () => {
    const db = await monterBaseJetable();
    const { saveNoteDraft, noteDraft } = await import('./repo');

    /*
     * Ce que fait un vrai doigt : chaque frappe lance une écriture SANS
     * attendre la précédente. Avec un index unique et un « lire puis écrire »
     * non atomique, deux appels voient « rien en base » et insèrent tous les
     * deux — ConstraintError, et la frappe est perdue.
     */
    await Promise.all(
      ['é', 'ép', 'épa', 'épau', 'épaul', 'épaule'].map((t) =>
        saveNoteDraft({ slot: 'bench-press', week: 5, day: 2, date: '2026-09-30', text: t }),
      ),
    );

    expect(await db.noteDrafts.count()).toBe(1);
    expect((await noteDraft('bench-press', 5, 2))?.text).toBeTruthy();
    db.close();
  });
});

describe('appuis rapprochés sur un curseur de douleur', () => {
  beforeEach(async () => {
    await deleteDB(NOM);
  });

  it('garde une seule ligne et ne perd aucun appui', async () => {
    const db = await monterBaseJetable();
    const { savePain, painLogOn } = await import('./repo');

    await Promise.all([
      savePain('2026-09-28', 'back-squat', { during: 1 }),
      savePain('2026-09-28', 'back-squat', { during: 2 }),
      savePain('2026-09-28', 'back-squat', { during: 3 }),
    ]);

    expect(await db.painLog.count()).toBe(1);
    expect((await painLogOn('2026-09-28')).get('back-squat')?.during).not.toBeNull();
    db.close();
  });
});

describe('appuis rapprochés sur la pesée du jour', () => {
  beforeEach(async () => {
    await deleteDB(NOM);
  });

  it('garde une seule ligne par date', async () => {
    const db = await monterBaseJetable();
    const { saveMeasurement } = await import('./repo');

    await Promise.all([
      saveMeasurement('2026-09-28', { weightKg: 78 }),
      saveMeasurement('2026-09-28', { weightKg: 78.5 }),
      saveMeasurement('2026-09-28', { waistCm: 83 }),
    ]);

    expect(await db.measurements.count()).toBe(1);
    db.close();
  });
});

describe('deux ouvertures simultanées de la même séance', () => {
  beforeEach(async () => {
    await deleteDB(NOM);
  });

  it('crée UNE ligne de séance, et la rend aux deux appelants', async () => {
    const db = await monterBaseJetable();
    const { ensureSession } = await import('./repo');

    /*
     * Le cas réel : l'écran recharge après chaque série validée, et React
     * monte ses effets deux fois en développement. Sans transaction, le second
     * appel partait en `ConstraintError` — donc SANS ligne de séance, et plus
     * aucune série ne pouvait s'enregistrer.
     */
    const [a, b, c] = await Promise.all([
      ensureSession(5, 0, '2026-09-28'),
      ensureSession(5, 0, '2026-09-28'),
      ensureSession(5, 0, '2026-09-28'),
    ]);

    expect(await db.sessions.count()).toBe(1);
    expect(a.id).toBeDefined();
    expect(b.id).toBe(a.id);
    expect(c.id).toBe(a.id);
    db.close();
  });

  it('ne pose l’heure de début qu’une seule fois', async () => {
    const db = await monterBaseJetable();
    const { ensureSession } = await import('./repo');

    const premier = await ensureSession(5, 0, '2026-09-28');
    await new Promise((r) => setTimeout(r, 5));
    const second = await ensureSession(5, 0, '2026-09-28');
    expect(second.startedAt).toBe(premier.startedAt);
    db.close();
  });

  it('ne démarre aucun chrono sur une séance déjà terminée', async () => {
    const db = await monterBaseJetable();
    const { ensureSession } = await import('./repo');

    await db.sessions.add({
      week: 3,
      day: 0,
      date: '2026-09-14',
      status: 'done',
      warmupChecked: [],
      notes: '',
    });
    const relu = await ensureSession(3, 0, '2026-09-14');
    expect(relu.startedAt).toBeUndefined();
    db.close();
  });
});
