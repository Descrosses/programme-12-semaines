/**
 * La partie de la compression qui se teste sans navigateur : le calcul des
 * dimensions et l'affichage des tailles. Le passage par `<canvas>` lui-même est
 * vérifié dans un vrai navigateur, il n'existe pas sous Node.
 */

import { describe, expect, it } from 'vitest';
import { PHOTO_LIMITS, fitWithin, formatBytes } from './photo';

describe('fitWithin', () => {
  it('ramène une photo d’iPhone à la largeur maximale en gardant les proportions', () => {
    // 4032 × 3024, le format habituel d'un iPhone en paysage.
    expect(fitWithin(4032, 3024)).toEqual({ width: 1280, height: 960 });
  });

  it('traite aussi le portrait, qui est le cadrage d’un suivi de silhouette', () => {
    expect(fitWithin(3024, 4032)).toEqual({ width: 1280, height: 1707 });
  });

  it('n’agrandit jamais une image déjà petite', () => {
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 });
    expect(fitWithin(1280, 720)).toEqual({ width: 1280, height: 720 });
  });

  it('ne produit jamais une hauteur nulle sur un format très allongé', () => {
    expect(fitWithin(10000, 3).height).toBeGreaterThanOrEqual(1);
  });

  it('rend des dimensions nulles pour une image vide, au lieu de diviser par zéro', () => {
    expect(fitWithin(0, 0)).toEqual({ width: 0, height: 0 });
  });
});

describe('formatBytes', () => {
  it('écrit les tailles en français', () => {
    expect(formatBytes(512)).toBe('512 o');
    expect(formatBytes(250 * 1024)).toBe('250 Ko');
    expect(formatBytes(3 * 1024 * 1024)).toBe('3 Mo');
    expect(formatBytes(Math.round(1.6 * 1024 * 1024))).toBe('1,6 Mo');
    // La virgule, pas le point : le reste de l'appli écrit les nombres en français.
    expect(formatBytes(Math.round(2.5 * 1024 * 1024))).toContain(',');
  });
});

describe('budget de stockage', () => {
  it('la cible par photo tient sous 300 Ko', () => {
    expect(PHOTO_LIMITS.targetBytes).toBe(300 * 1024);
  });

  it('12 semaines de suivi visuel restent négligeables', () => {
    const total = 13 * PHOTO_LIMITS.targetBytes; // semaines 0 à 12
    expect(total).toBeLessThan(4 * 1024 * 1024);
  });

  it('c’est le volume des photos d’exercice qui décide, pas le suivi visuel', () => {
    // Scénario chargé : 3 exercices photographiés, 5 séances par semaine,
    // 12 semaines. C'est le chiffre à surveiller, pas les 13 photos de suivi.
    const chargé = 3 * 5 * 12 * PHOTO_LIMITS.targetBytes;
    expect(chargé).toBeGreaterThan(50 * 1024 * 1024);
  });
});
