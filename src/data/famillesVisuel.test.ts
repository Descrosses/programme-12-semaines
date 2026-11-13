/**
 * Les photos des cartes de famille, page Programmes.
 *
 * Une règle simple, facile à enfreindre sans le voir : les photos sont
 * servies BRUTES, et c'est le voile en dégradé du code (`.banniereVoile`) qui
 * les assombrit. Guillaume a fourni la photo FEMMES en deux versions, brute et
 * déjà assombrie ; poser l'assombrie sous le voile la noircirait deux fois.
 */
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { FAMILLES } from './catalogue';
import { HABILLAGE } from './famillesVisuel';
import { VISUELS } from './visuels';

const fichier = (nom: string) => new URL(`../../public/visuels/${nom}`, import.meta.url);

describe('carte FEMMES', () => {
  it('porte sa propre photo, pas celle d’un autre programme', () => {
    expect(HABILLAGE.femmes.photo).toBe('carteFemmes');
    expect(HABILLAGE.femmes.photo).not.toBe(HABILLAGE.power.photo);
    expect(HABILLAGE.femmes.photo).not.toBe(HABILLAGE.mass.photo);
  });

  it('les deux fichiers servis existent', () => {
    for (const f of [VISUELS.carteFemmes.display, VISUELS.carteFemmes.mobile]) {
      expect(existsSync(fichier(f)), f).toBe(true);
    }
  });

  it('la photo servie est la brute : assez claire pour supporter le voile', () => {
    /*
     * Mesuré sur les deux fichiers fournis : la brute fait 26 798 octets,
     * l'assombrie 13 258 — l'ombre se compresse. Ce test vérifie à l'octet
     * près que c'est la brute qui est en place, telle que livrée.
     */
    expect(readFileSync(fichier(VISUELS.carteFemmes.display)).length).toBe(26_798);
  });

  it('annonce « Galbe & renforcement », plus « 8 semaines en circuits »', () => {
    const femmes = FAMILLES.find((f) => f.id === 'femmes')!;
    expect(femmes.sousTitre).toBe('Galbe & renforcement');
  });
});

describe('carte ME, MYSELF & I', () => {
  it('porte sa propre photo, pas celle d’un autre programme', () => {
    expect(HABILLAGE.perso.photo).toBe('cartePerso');
    for (const autre of ['power', 'mass', 'femmes'] as const) {
      expect(HABILLAGE.perso.photo).not.toBe(HABILLAGE[autre].photo);
    }
  });

  it('les deux fichiers servis existent', () => {
    for (const f of [VISUELS.cartePerso.display, VISUELS.cartePerso.mobile]) {
      expect(existsSync(fichier(f)), f).toBe(true);
    }
  });

  it('cadre en haut : la carte de 128 px coupait la tête en cadrage centré', () => {
    expect(VISUELS.cartePerso.focus).toBe('center 10%');
  });
});
