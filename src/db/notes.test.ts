/**
 * Une remarque n'écrase jamais une autre.
 *
 * C'est la seule chose que ces tests vérifient, et c'est la demande : avant,
 * la clé unique `[exerciseId+week+day]` faisait qu'une deuxième remarque sur
 * le même mouvement, la même séance, remplaçait la première. Deux idées
 * successives devenaient une seule.
 *
 * On vérifie aussi le brouillon, parce que c'est lui qui rend le bouton
 * « Ajouter » acceptable : écrit à chaque frappe, donc un téléphone verrouillé
 * au milieu d'une phrase ne perd rien, et repris automatiquement quand la
 * séance se termine.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import 'fake-indexeddb/auto';
import { deleteDB } from './testSchemas';
import { ProgrammeDB, SESSION_NOTE_SLOT } from './db';
import { noteHistory } from '../engine/exerciseNotes';

const NOM = 'notes-append-test';

async function monterBaseJetable(): Promise<ProgrammeDB> {
  await deleteDB(NOM);
  const jetable = new ProgrammeDB(NOM);
  await jetable.open();
  const mod = await import('./db');
  Object.defineProperty(mod, 'db', { value: jetable, configurable: true, writable: true });
  return jetable;
}

const ctx = { week: 5, day: 2 as const, date: '2026-09-30' };

describe('remarques appendues', () => {
  beforeEach(async () => {
    await deleteDB(NOM);
  });

  it('empile deux remarques sur le même mouvement et la même séance', async () => {
    const base = await monterBaseJetable();
    const { addNote, notesFor } = await import('./repo');

    await addNote({ ...ctx, exerciseId: 'bench-press', text: 'épaule gauche tire un peu' });
    await addNote({ ...ctx, exerciseId: 'bench-press', text: 'c’est passé en 3e série' });

    const rows = await notesFor('bench-press');
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.text).sort()).toEqual([
      'c’est passé en 3e série',
      'épaule gauche tire un peu',
    ]);
    base.close();
  });

  it('n’écrit rien pour une remarque vide', async () => {
    const base = await monterBaseJetable();
    const { addNote, allNotes } = await import('./repo');

    expect(await addNote({ ...ctx, exerciseId: 'rdl', text: '   ' })).toBeNull();
    expect(await addNote({ ...ctx, exerciseId: 'rdl', text: '' })).toBeNull();
    expect(await allNotes()).toHaveLength(0);
    base.close();
  });

  it('range la remarque de séance sous `exerciseId` null, sans la mélanger', async () => {
    const base = await monterBaseJetable();
    const { addNote, sessionNotes, notesFor } = await import('./repo');

    await addNote({ ...ctx, exerciseId: null, text: 'mal dormi' });
    await addNote({ ...ctx, exerciseId: 'back-squat', text: 'lourd dès la 2e' });

    expect((await sessionNotes()).map((n) => n.text)).toEqual(['mal dormi']);
    expect((await notesFor('back-squat')).map((n) => n.text)).toEqual(['lourd dès la 2e']);
    base.close();
  });

  it('garde l’historique des semaines passées intact quand on en ajoute une', async () => {
    const base = await monterBaseJetable();
    const { addNote, notesFor } = await import('./repo');

    await addNote({ week: 1, day: 2, date: '2026-08-31', exerciseId: 'bench-press', text: 'S1' });
    await addNote({ week: 3, day: 2, date: '2026-09-14', exerciseId: 'bench-press', text: 'S3' });
    await addNote({ week: 5, day: 2, date: '2026-09-30', exerciseId: 'bench-press', text: 'S5' });

    const rows = await notesFor('bench-press');
    expect(noteHistory(rows as never, 'bench-press').map((n) => n.text)).toEqual([
      'S5',
      'S3',
      'S1',
    ]);
    base.close();
  });

  it('retire exactement la remarque demandée, et rien d’autre', async () => {
    const base = await monterBaseJetable();
    const { addNote, deleteNote, notesFor } = await import('./repo');

    const une = await addNote({ ...ctx, exerciseId: 'rdl', text: 'à retirer' });
    await addNote({ ...ctx, exerciseId: 'rdl', text: 'à garder' });

    await deleteNote(une!.id!);
    expect((await notesFor('rdl')).map((n) => n.text)).toEqual(['à garder']);
    base.close();
  });
});

describe('brouillons', () => {
  beforeEach(async () => {
    await deleteDB(NOM);
  });

  it('écrit à chaque frappe sans empiler une ligne par caractère', async () => {
    const base = await monterBaseJetable();
    const { saveNoteDraft, noteDraft } = await import('./repo');

    for (const frappe of ['é', 'épa', 'épaule', 'épaule gauche']) {
      await saveNoteDraft({ ...ctx, slot: 'bench-press', text: frappe });
    }
    expect(await base.noteDrafts.count()).toBe(1);
    expect((await noteDraft('bench-press', 5, 2))?.text).toBe('épaule gauche');
    base.close();
  });

  it('supprime le brouillon quand le champ est vidé', async () => {
    const base = await monterBaseJetable();
    const { saveNoteDraft, noteDraft } = await import('./repo');

    await saveNoteDraft({ ...ctx, slot: 'rdl', text: 'quelque chose' });
    await saveNoteDraft({ ...ctx, slot: 'rdl', text: '' });
    expect(await noteDraft('rdl', 5, 2)).toBeUndefined();
    base.close();
  });

  it('ne confond pas deux créneaux de la même séance', async () => {
    const base = await monterBaseJetable();
    const { saveNoteDraft, noteDraft } = await import('./repo');

    await saveNoteDraft({ ...ctx, slot: 'rdl', text: 'pour le RDL' });
    await saveNoteDraft({ ...ctx, slot: 'bench-press', text: 'pour le bench' });
    await saveNoteDraft({ ...ctx, slot: SESSION_NOTE_SLOT, text: 'pour la séance' });

    expect((await noteDraft('rdl', 5, 2))?.text).toBe('pour le RDL');
    expect((await noteDraft('bench-press', 5, 2))?.text).toBe('pour le bench');
    expect((await noteDraft(SESSION_NOTE_SLOT, 5, 2))?.text).toBe('pour la séance');
    base.close();
  });

  it('transforme le brouillon en remarque et vide le champ', async () => {
    const base = await monterBaseJetable();
    const { saveNoteDraft, commitNoteDraft, noteDraft, notesFor } = await import('./repo');

    await saveNoteDraft({ ...ctx, slot: 'rdl', text: 'dos bien plat' });
    const ajoutee = await commitNoteDraft('rdl', 5, 2, 'rdl');

    expect(ajoutee?.text).toBe('dos bien plat');
    expect(await noteDraft('rdl', 5, 2)).toBeUndefined();
    expect((await notesFor('rdl')).map((n) => n.text)).toEqual(['dos bien plat']);
    base.close();
  });

  it('reprend tous les brouillons restants quand la séance se termine', async () => {
    const base = await monterBaseJetable();
    const { saveNoteDraft, commitAllDrafts, allNotes } = await import('./repo');

    await saveNoteDraft({ ...ctx, slot: 'rdl', text: 'oubliée dans le champ' });
    await saveNoteDraft({ ...ctx, slot: SESSION_NOTE_SLOT, text: 'oubliée aussi' });
    // Un brouillon d'une AUTRE séance ne doit pas partir avec.
    await saveNoteDraft({
      week: 6,
      day: 0,
      date: '2026-10-05',
      slot: 'back-squat',
      text: 'plus tard',
    });

    expect(await commitAllDrafts(5, 2)).toBe(2);

    const notes = await allNotes();
    expect(notes).toHaveLength(2);
    expect(notes.find((n) => n.exerciseId === null)?.text).toBe('oubliée aussi');
    expect(notes.find((n) => n.exerciseId === 'rdl')?.text).toBe('oubliée dans le champ');
    expect(await base.noteDrafts.count()).toBe(1);
    base.close();
  });
});
