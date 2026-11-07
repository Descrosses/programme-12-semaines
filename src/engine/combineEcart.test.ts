import { describe, expect, it } from 'vitest';
import { ecartCombine } from './combineEcart';

describe('l’écart entre deux combines', () => {
  it('compte la différence et le pourcentage', () => {
    const e = ecartCombine('test-broad-jump', 225, 233)!;
    expect(e.ecart).toBe(8);
    expect(e.pct).toBeCloseTo(3.56, 2);
    expect(e.mieux).toBe(true);
  });

  it('un saut plus court est un recul', () => {
    expect(ecartCombine('test-broad-jump', 225, 220)!.mieux).toBe(false);
  });

  /*
   * La règle qui existait déjà dans le tableau, et qu'il fallait emmener
   * telle quelle : sur un chrono, la valeur descend quand la performance
   * monte.
   */
  it('un sprint plus court est un PROGRÈS, même si le chiffre baisse', () => {
    const e = ecartCombine('test-sprint-10m', 1.82, 1.74)!;
    expect(e.ecart).toBeCloseTo(-0.08, 5);
    expect(e.mieux).toBe(true);
  });

  it('un sprint plus long est un recul', () => {
    expect(ecartCombine('test-sprint-10m', 1.82, 1.9)!.mieux).toBe(false);
  });

  /*
   * LE TEST QUI JUSTIFIE CE MODULE.
   *
   * Le tableau de comparaison colorait une prise de poids en vert : il
   * appliquait « plus grand = mieux » à une mesure dont le §13 dit
   * explicitement qu'elle n'a pas de cible. L'application félicitait une
   * prise de poids sans rien savoir de qui la lit.
   */
  it('le poids de corps ne se juge pas, dans aucun des deux sens', () => {
    expect(ecartCombine('test-bodyweight', 78, 80)!.mieux).toBeNull();
    expect(ecartCombine('test-bodyweight', 78, 76)!.mieux).toBeNull();
    // L'écart, lui, reste calculé : c'est une information, pas un verdict.
    expect(ecartCombine('test-bodyweight', 78, 80)!.ecart).toBe(2);
  });

  it('un écart nul ne se juge pas non plus', () => {
    expect(ecartCombine('test-broad-jump', 225, 225)!.mieux).toBeNull();
  });

  it('sans mesure de départ, il n’y a rien à comparer', () => {
    expect(ecartCombine('test-broad-jump', null, 233)).toBeNull();
    expect(ecartCombine('test-broad-jump', undefined, 233)).toBeNull();
    // Zéro n'est pas une performance : ce serait une division par zéro
    // déguisée en pourcentage infini.
    expect(ecartCombine('test-broad-jump', 0, 233)).toBeNull();
  });

  it('sans mesure du jour, il n’y a rien à comparer non plus', () => {
    expect(ecartCombine('test-broad-jump', 225, null)).toBeNull();
    expect(ecartCombine('test-broad-jump', 225, 0)).toBeNull();
  });
});
