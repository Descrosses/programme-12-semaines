/**
 * Saisie manuelle des distances du readiness.
 *
 * Les trois champs n'avaient que leurs boutons +/−, au pas de 5 cm depuis
 * 100 cm. Un saut mesuré à 268 cm n'était donc pas seulement long à saisir :
 * il était **impossible**, la grille ne passant que par les multiples de 5.
 *
 * Ce n'est pas un détail de confort. Le readiness se décide sur un écart de
 * 2 % — sur une référence de 265 cm, 2 % valent 5,3 cm, c'est-à-dire un cran
 * de la grille. Arrondir la mesure revenait à arrondir le verdict.
 */

import { describe, expect, it } from 'vitest';
import { JUMP_MAX_CM, JUMP_MIN_CM, parseJumpCm, readiness } from './readiness';
import { parseKg } from './loadEntry';
import { parseNombre } from './numberEntry';

describe('ce qui est accepté', () => {
  it('une distance que la grille de 5 cm ne permettait pas', () => {
    expect(parseJumpCm('268', null)).toBe(268);
    expect(parseJumpCm('253', null)).toBe(253);
  });

  it('les espaces de bord et la virgule du clavier français', () => {
    expect(parseJumpCm(' 268 ', null)).toBe(268);
    // Un saut se note en centimètres entiers : la décimale est arrondie.
    expect(parseJumpCm('268,4', null)).toBe(268);
    expect(parseJumpCm('268,6', null)).toBe(269);
  });

  it('les deux bornes exactes', () => {
    expect(parseJumpCm(String(JUMP_MIN_CM), null)).toBe(100);
    expect(parseJumpCm(String(JUMP_MAX_CM), null)).toBe(400);
  });
});

describe('ce qui est refusé — et la valeur précédente est gardée', () => {
  /*
   * La règle qui protège le verdict : un champ vidé par erreur ne doit jamais
   * écrire un 0. Un 0 passerait pour un saut de zéro centimètre, soit −100 %
   * de la référence, soit un ROUGE déclenché par une faute de frappe.
   */
  it('un champ vidé ou illisible garde ce qu’il y avait', () => {
    for (const saisie of ['', '   ', 'abc', '268cm', '--5', '2,6,8', '.']) {
      expect(parseJumpCm(saisie, 265), JSON.stringify(saisie)).toBe(265);
    }
  });

  it('jamais de NaN, jamais de 0 sur une saisie douteuse', () => {
    for (const saisie of ['', 'abc', '268cm', '--5']) {
      const lu = parseJumpCm(saisie, 265);
      expect(Number.isNaN(lu as number), saisie).toBe(false);
      expect(lu, saisie).not.toBe(0);
    }
  });

  it('hors bornes : refusé, sans rien écrire', () => {
    expect(parseJumpCm('99', 265)).toBe(265);
    expect(parseJumpCm('401', 265)).toBe(265);
    expect(parseJumpCm('0', 265)).toBe(265);
    // Un zéro de trop à la frappe : 2650 au lieu de 265.
    expect(parseJumpCm('2650', 265)).toBe(265);
  });

  it('quand il n’y avait rien, il n’y a toujours rien', () => {
    expect(parseJumpCm('abc', null)).toBeNull();
    expect(parseJumpCm('', null)).toBeNull();
  });
});

describe('pourquoi la précision compte pour le verdict', () => {
  /*
   * Démonstration chiffrée du défaut. Référence 265 cm, saut réel 260 cm.
   * La grille de 5 cm oblige à choisir entre 260 et 265 — ici elle tombe juste,
   * mais un saut à 262 devait être arrondi, et l'arrondi traverse une borne.
   */
  it('deux centimètres séparent un VERT d’un ORANGE', () => {
    const reference = 265;
    expect(readiness(reference, 260)!.level).toBe('vert'); // −1,9 %
    expect(readiness(reference, 259)!.level).toBe('orange'); // −2,3 %
  });

  it('et la valeur exacte est maintenant saisissable', () => {
    // Impossible avant : 259 n'est pas un multiple de 5 au départ de 100.
    expect(parseJumpCm('259', null)).toBe(259);
    expect(259 % 5).not.toBe(0);
  });
});

describe('le lecteur est partagé, pas recopié', () => {
  /*
   * La même lecture existait déjà pour les charges. Une troisième copie pour
   * les sauts aurait garanti qu'elles divergent le jour où l'une est corrigée.
   */
  it('charges et sauts suivent la même règle du doute', () => {
    expect(parseKg('abc', 20)).toBe(20);
    expect(parseJumpCm('abc', 200)).toBe(200);
  });

  it('seules les bornes et les décimales les distinguent', () => {
    // Une charge accepte une décimale, un saut non.
    expect(parseKg('37,5', null)).toBe(37.5);
    expect(parseJumpCm('37,5', null)).toBeNull(); // sous la borne basse
    expect(parseNombre('268,4', null, { min: 100, max: 400, decimales: 1 })).toBe(268.4);
    expect(parseNombre('268,4', null, { min: 100, max: 400, decimales: 0 })).toBe(268);
  });
});
