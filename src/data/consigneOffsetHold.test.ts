/**
 * Barbell Offset Hold : la consigne dit la position de la planche.
 *
 * Guillaume, 27 novembre : la barre se tient BRAS TENDUS contre les cuisses,
 * comme sur la fiche. L'ancienne consigne (« Barre en rack avant ») la
 * contredisait. L'empreinte ne lit pas les consignes : ce test le fait.
 */
import { describe, expect, it } from 'vitest';
import { exercise } from './exercises';

describe('Barbell Offset Hold : bras tendus, jamais en rack avant', () => {
  const ex = exercise('barbell-offset-hold');
  const textes = [ex.intent ?? '', ex.altBasicFit ?? '', ...(ex.cues ?? [])].join(' ');

  it('la consigne place la barre bras tendus', () => {
    expect(ex.intent).toMatch(/^Barre tenue bras tendus contre les cuisses/);
    expect(ex.intent).toContain('disques d’un seul côté');
  });

  it('plus aucun texte ne parle de rack avant', () => {
    expect(textes).not.toMatch(/rack avant/i);
    // L'alternative reste, sans sa condition liée au rack avant.
    expect(ex.altBasicFit).toMatch(/^À défaut : même barre tenue à une extrémité/);
  });

  it('la planche est bien celle du maintien', () => {
    expect(ex.fiche).toBe('fiches/power12-barbell-offset-hold.webp');
  });
});
