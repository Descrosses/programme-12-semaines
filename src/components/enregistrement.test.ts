import { describe, expect, it } from 'vitest';
import { enregistrerOuSignaler } from './enregistrement';

describe('enregistrer une série, ou dire pourquoi elle ne l’est pas', () => {
  it('écriture confirmée : aucune phrase', async () => {
    await expect(enregistrerOuSignaler(async () => {})).resolves.toBeNull();
  });

  it('écriture refusée : la phrase dit que rien n’a été compté, avec la raison', async () => {
    const m = await enregistrerOuSignaler(() => Promise.reject(new Error('QuotaExceededError')));
    expect(m).toBe('Série non enregistrée (QuotaExceededError). Rien n’a été compté : réessaie.');
  });

  it('erreur sans message : la phrase reste lisible', async () => {
    expect(await enregistrerOuSignaler(() => Promise.reject(new Error('')))).toBe(
      'Série non enregistrée. Rien n’a été compté : réessaie.',
    );
    expect(await enregistrerOuSignaler(() => Promise.reject('x'))).toMatch(/^Série non/);
  });

  it('n’annonce jamais un succès avant la fin de l’écriture', async () => {
    let fini = false;
    const p = enregistrerOuSignaler(
      () => new Promise<void>((r) => setTimeout(() => ((fini = true), r()), 20)),
    );
    expect(fini).toBe(false);
    await expect(p).resolves.toBeNull();
    expect(fini).toBe(true);
  });
});
