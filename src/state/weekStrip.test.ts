/**
 * La bande des semaines garde la semaine choisie sous les yeux.
 *
 * Défaut constaté sur iPhone : choisir la semaine 8 ramenait la bande au début
 * et la pastille active sortait de l'écran.
 */

import { describe, expect, it } from 'vitest';
import { defilementPourCentrer } from './weekStrip';

/* Treize pastilles de 60 px (52 + 8 de gouttière) dans une bande de 358 px :
   les mesures réelles d'un iPhone à 390 px. */
const BANDE = { visible: 358, totale: 13 * 60 };
const pastille = (w: number) => ({ ...BANDE, gauche: w * 60, largeur: 52 });

describe('centrer la semaine choisie', () => {
  it('une semaine du milieu se retrouve au centre', () => {
    const d = defilementPourCentrer(pastille(8));
    // La pastille doit tomber dans la moitié centrale de ce qu'on voit.
    const centreVu = d + BANDE.visible / 2;
    const centrePastille = 8 * 60 + 26;
    expect(Math.abs(centreVu - centrePastille)).toBeLessThan(2);
  });

  /*
   * Aux extrémités, centrer est impossible — et c'est tant mieux : la bande se
   * cale sur son bord, ce qui montre le plus de semaines possible.
   */
  it('les premières semaines ne décalent rien', () => {
    expect(defilementPourCentrer(pastille(0))).toBe(0);
    expect(defilementPourCentrer(pastille(1))).toBe(0);
    expect(defilementPourCentrer(pastille(2))).toBe(0);
  });

  it('les dernières semaines se calent sur la fin', () => {
    const max = BANDE.totale - BANDE.visible;
    expect(defilementPourCentrer(pastille(12))).toBe(max);
    expect(defilementPourCentrer(pastille(11))).toBe(max);
  });

  it('jamais au-delà des bornes, pour aucune semaine', () => {
    const max = BANDE.totale - BANDE.visible;
    for (let w = 0; w <= 12; w++) {
      const d = defilementPourCentrer(pastille(w));
      expect(d, `semaine ${w}`).toBeGreaterThanOrEqual(0);
      expect(d, `semaine ${w}`).toBeLessThanOrEqual(max);
    }
  });

  it('le défilement ne recule jamais quand la semaine avance', () => {
    let precedent = -1;
    for (let w = 0; w <= 12; w++) {
      const d = defilementPourCentrer(pastille(w));
      expect(d, `semaine ${w}`).toBeGreaterThanOrEqual(precedent);
      precedent = d;
    }
  });

  it('tout tient à l’écran : rien ne défile', () => {
    // Un écran large, ou moins de semaines : la bande n'a pas à bouger.
    expect(defilementPourCentrer({ visible: 800, totale: 780, gauche: 480, largeur: 52 })).toBe(0);
  });

  it('une mesure absente ne fait pas sauter la bande', () => {
    // Mieux vaut ne pas défiler que défiler n'importe où.
    expect(defilementPourCentrer({ visible: 0, totale: 780, gauche: 480, largeur: 52 })).toBe(0);
    expect(defilementPourCentrer({ visible: NaN, totale: 780, gauche: 480, largeur: 52 })).toBe(0);
    expect(defilementPourCentrer({ ...BANDE, gauche: NaN, largeur: 52 })).toBe(0);
  });
});
