/**
 * Ouvrir une séance n'est PAS la commencer.
 *
 * Le chrono partait à la première ouverture. Consulter le jeudi soir la
 * séance du vendredi suffisait à le lancer : le lendemain, l'écran annonçait
 * quatorze heures d'entraînement, et toutes les durées enregistrées en
 * sortaient fausses sans que rien ne le signale.
 *
 * `startedAt` ne se pose plus que sur une action volontaire — le bouton
 * « Démarrer la séance », ou la première série validée.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from './db';
import { ensureSession, resetSessionClock, startSession } from './repo';

beforeEach(async () => {
  if (!db.isOpen()) await db.open();
  for (const t of db.tables) await t.clear();
});

describe('ouvrir une séance', () => {
  it('ne pose aucune heure de début', async () => {
    const row = await ensureSession(7, 4, '2026-10-16');
    expect(row.startedAt).toBeUndefined();
  });

  it('ne la pose pas davantage à la deuxième ouverture', async () => {
    await ensureSession(7, 4, '2026-10-16');
    const row = await ensureSession(7, 4, '2026-10-16');
    expect(row.startedAt).toBeUndefined();
  });

  it('consulter la veille ne crée aucune durée', async () => {
    // Le cas exact rapporté : séance ouverte le jeudi soir, reprise le
    // vendredi. Sans heure de début, il n'y a rien à mesurer.
    const veille = await ensureSession(7, 4, '2026-10-16');
    expect(veille.startedAt).toBeUndefined();
    const lendemain = await ensureSession(7, 4, '2026-10-16');
    expect(lendemain.startedAt).toBeUndefined();
  });
});

describe('démarrer une séance', () => {
  it('pose l’heure de début', async () => {
    const row = await ensureSession(7, 4, '2026-10-16');
    const avant = Date.now();
    await startSession(row.id!);
    const apres = (await db.sessions.get(row.id!))!;
    expect(apres.startedAt).toBeGreaterThanOrEqual(avant);
  });

  it('est idempotent : une séance commencée garde SON heure', async () => {
    const row = await ensureSession(7, 4, '2026-10-16');
    await startSession(row.id!);
    const premier = (await db.sessions.get(row.id!))!.startedAt;
    await startSession(row.id!);
    await startSession(row.id!);
    expect((await db.sessions.get(row.id!))!.startedAt).toBe(premier);
  });

  it('ne ressuscite pas une séance terminée', async () => {
    const row = await ensureSession(7, 4, '2026-10-16');
    await startSession(row.id!);
    const debut = (await db.sessions.get(row.id!))!.startedAt;
    await db.sessions.update(row.id!, { status: 'done', finishedAt: Date.now() });
    await startSession(row.id!);
    expect((await db.sessions.get(row.id!))!.startedAt).toBe(debut);
  });

  it('la remise à zéro reste le seul moyen de réécrire le début', async () => {
    const row = await ensureSession(7, 4, '2026-10-16');
    await db.sessions.update(row.id!, { startedAt: 1_000_000 });
    await startSession(row.id!);
    expect((await db.sessions.get(row.id!))!.startedAt).toBe(1_000_000);
    await resetSessionClock(row.id!);
    expect((await db.sessions.get(row.id!))!.startedAt).toBeGreaterThan(1_000_000);
  });
});

describe('les séances déjà enregistrées', () => {
  it('gardent leur durée telle quelle', async () => {
    // Une séance d'avant le correctif, avec son heure de début. L'ouvrir ne
    // doit ni la perdre, ni la recalculer.
    await db.sessions.add({
      week: 3,
      day: 0,
      date: '2026-09-07',
      status: 'done',
      warmupChecked: [],
      notes: '',
      startedAt: 1_757_000_000_000,
      finishedAt: 1_757_003_600_000,
    });
    const row = await ensureSession(3, 0, '2026-09-07');
    expect(row.startedAt).toBe(1_757_000_000_000);
    expect(row.finishedAt).toBe(1_757_003_600_000);
  });
});
