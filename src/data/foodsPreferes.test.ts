/*
 * L'ordre des aliments préférés n'est pas alphabétique, et c'est le point à
 * ne pas perdre : il vient du questionnaire, qui range par famille. C'est
 * l'ordre dans lequel la personne a pensé ses aliments.
 */
import { describe, expect, it } from 'vitest';
import { foodsPreferes, type LibraryFood } from './foodLibrary';

const PERSO: LibraryFood = {
  id: 'tofuFume',
  label: 'Tofu fumé',
  unit: 'g',
  per: 100,
  kcal: 150,
  proteinG: 16,
  carbsG: 2,
  fatG: 9,
  referenceState: 'na',
  category: 'proteine',
  isCustom: true,
};

describe('foodsPreferes', () => {
  it('garde l’ordre reçu, et ne trie PAS par ordre alphabétique', () => {
    const r = foodsPreferes(['poulet', 'amandes', 'riz']);
    expect(r.map((f) => f.id)).toEqual(['poulet', 'amandes', 'riz']);
  });

  it('saute un identifiant que le catalogue ne connaît pas', () => {
    // Afficher une ligne vide serait pire que de ne rien montrer.
    expect(foodsPreferes(['riz', 'mouton-a-cinq-pattes', 'kiwi']).map((f) => f.id)).toEqual([
      'riz',
      'kiwi',
    ]);
  });

  it('ne montre pas deux fois le même aliment', () => {
    expect(foodsPreferes(['riz', 'riz']).map((f) => f.id)).toEqual(['riz']);
  });

  it('trouve aussi les aliments créés à la main', () => {
    expect(foodsPreferes(['tofuFume'], [PERSO]).map((f) => f.label)).toEqual(['Tofu fumé']);
  });

  it('rend une liste vide quand rien n’est déclaré', () => {
    expect(foodsPreferes([])).toEqual([]);
  });
});
