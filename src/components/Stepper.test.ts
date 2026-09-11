/**
 * Régression : passer de 105 à 120 kg demande six appuis rapides sur « + ».
 * Tant que le composant émettait une valeur absolue calculée depuis le rendu
 * affiché, cinq de ces six appuis étaient perdus quand React n'avait pas eu le
 * temps de redessiner. Le composant émet désormais un écart, appliqué par une
 * mise à jour fonctionnelle : chaque appui compte.
 */

import { describe, expect, it } from 'vitest';
import { stepValue } from './Stepper';

describe('stepValue', () => {
  it('applique l’écart', () => {
    expect(stepValue(105, 2.5, 0, 300)).toBe(107.5);
    expect(stepValue(7.5, -0.5, 4, 10)).toBe(7);
  });

  it('six appuis rapides déplacent bien de six pas', () => {
    let v: number | null = 105;
    for (let i = 0; i < 6; i++) v = stepValue(v, 2.5, 0, 300);
    expect(v).toBe(120);
  });

  it('trois appuis sur « − » descendent le RPE de 7,5 à 6', () => {
    let v: number | null = 7.5;
    for (let i = 0; i < 3; i++) v = stepValue(v, -0.5, 4, 10);
    expect(v).toBe(6);
  });

  it('respecte les bornes', () => {
    expect(stepValue(10, 0.5, 4, 10)).toBe(10);
    expect(stepValue(4, -0.5, 4, 10)).toBe(4);
    expect(stepValue(0, -2.5, 0, 300)).toBe(0);
  });

  it('part du minimum quand rien n’est encore saisi', () => {
    expect(stepValue(null, 5, 100, 400)).toBe(105);
  });

  it('ne produit pas de flottant sale', () => {
    let v: number | null = 0;
    for (let i = 0; i < 40; i++) v = stepValue(v, 2.5, 0, 300);
    expect(v).toBe(100);
    let r: number | null = 4;
    for (let i = 0; i < 7; i++) r = stepValue(r, 0.5, 4, 10);
    expect(r).toBe(7.5);
  });
});
