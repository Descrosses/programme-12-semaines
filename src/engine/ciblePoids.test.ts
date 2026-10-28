/**
 * L'objectif de poids est au seul utilisateur qui le saisit.
 *
 * Le graphique de l'onglet Progrès a longtemps tracé une bande 77-80 kg pour
 * tout le monde. Ce n'était pas une norme : c'était le but personnel de
 * l'auteur du programme, et quelqu'un qui pèse 95 kg n'a pas à lire en
 * ouvrant l'écran qu'il doit en perdre quinze.
 *
 * Ces tests tiennent la règle : rien par défaut, et une bande seulement
 * lorsque les deux bornes existent et se suivent dans le bon ordre.
 */

import { describe, expect, it } from 'vitest';
import { bandePoids } from './ciblePoids';
import { DEFAULT_SETTINGS_ROW } from '../db/db';

describe('objectif de poids', () => {
  it('n’existe pas tant que personne ne l’a saisi', () => {
    expect(DEFAULT_SETTINGS_ROW.ciblePoidsBasKg).toBeNull();
    expect(DEFAULT_SETTINGS_ROW.ciblePoidsHautKg).toBeNull();
    expect(bandePoids(null, null)).toBeNull();
  });

  it('attend ses deux bornes', () => {
    // Une borne seule reste à l'écran pendant la saisie, mais n'est pas une
    // bande : le graphique ne sait pas dessiner une moitié de cible.
    expect(bandePoids(77, null)).toBeNull();
    expect(bandePoids(null, 80)).toBeNull();
  });

  it('accepte la bande saisie', () => {
    expect(bandePoids(77, 80)).toEqual({ min: 77, max: 80 });
    expect(bandePoids(92.5, 97)).toEqual({ min: 92.5, max: 97 });
  });

  it('accepte un objectif unique', () => {
    // « Je veux faire 78 kg » est un objectif, pas une erreur de saisie.
    expect(bandePoids(78, 78)).toEqual({ min: 78, max: 78 });
  });

  it('refuse des bornes inversées au lieu de les retourner', () => {
    // Les remettre dans l'ordre en silence changerait ce que l'utilisateur a
    // tapé ; mieux vaut ne rien enregistrer et le lui dire.
    expect(bandePoids(80, 77)).toBeNull();
  });

  it('ne traite jamais un zéro comme un objectif', () => {
    // Le Stepper est borné à 40 kg, donc un zéro ne peut venir que d'un
    // import abîmé. Il ne doit pas devenir une cible de 0 kg — c'est la règle
    // du programme : une valeur inconnue est une absence, jamais un zéro.
    expect(bandePoids(0, 0)).toBeNull();
    expect(bandePoids(0, 80)).toBeNull();
    expect(bandePoids(Number.NaN, 80)).toBeNull();
  });
});
