/**
 * Une bascule de thème qui se trompe ne plante pas : elle affiche les
 * mauvaises couleurs. Rien ne le signale, et on ne le voit qu'en ouvrant
 * l'écran concerné. D'où ces tests.
 */

import { describe, expect, it } from 'vitest';
import { THEME_PLATEFORME, themePour } from './theme';

describe('choix du thème', () => {
  it('habille un programme aux couleurs de sa famille', () => {
    expect(themePour('power12', false)).toBe('power');
    expect(themePour('mass4', false)).toBe('mass');
  });

  it('garde l’identité Dcross-fit sur les écrans de la plateforme', () => {
    /*
     * Même en plein cycle MASS : le catalogue montre les trois familles à la
     * fois, et l'habiller aux couleurs de l'une d'elles ferait croire à un
     * classement.
     */
    expect(themePour('mass4', true)).toBe(THEME_PLATEFORME);
    expect(themePour('power12', true)).toBe(THEME_PLATEFORME);
  });

  it('retombe sur la plateforme quand il n’y a aucun cycle', () => {
    expect(themePour(null, false)).toBe(THEME_PLATEFORME);
  });

  it('habille les écrans FEMMES en FEMMES, même pendant un cycle POWER', () => {
    /*
     * Le bug de production : l'aperçu FEMMES 8 s'ouvre pendant un cycle
     * POWER, et le thème suivait le cycle. L'écran impose sa famille.
     */
    expect(themePour('power12', false, 'femmes')).toBe('femmes');
    expect(themePour(null, false, 'femmes')).toBe('femmes');
    // Sans écran imposé, rien ne change pour POWER.
    expect(themePour('power12', false)).toBe('power');
  });

  it('ne reste jamais sans couleurs devant un programme inconnu', () => {
    // Une vieille ligne, un identifiant qui ne figure plus au catalogue.
    expect(themePour('power99', false)).toBe(THEME_PLATEFORME);
  });
});
