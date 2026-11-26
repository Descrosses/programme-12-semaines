/**
 * La bibliothèque des planches « en attente d'un programme » (Guillaume,
 * 26 novembre : « garde-les dans la bibliothèque dès que ce mouvement fera
 * partie d'un programme ») : Landmine press assis, Wall ball, Copenhague
 * plank.
 *
 * Ces tests figent :
 * - chaque planche est retrouvée par son NOM et ses ALIAS, casse et accents
 *   mis à part — en remplacement sous POWER comme à l'import d'un programme ;
 * - à l'import, la proposition se fait par nom strict : « Wall ball » trouve sa
 *   planche, « Wall » ne trouve rien ;
 * - une même planche sous plusieurs noms reste UNE planche proposable ;
 * - chaque mouvement a UNE clé désignable par un fichier de liens.
 */
import { describe, expect, it } from 'vitest';
import { ficheLibrePower, freeId } from '../engine/customExercise';
import { proposerFiches } from '../engine/perso/illustrations';
import {
  candidatesNatives,
  clesFichesNatives,
  ficheNative,
} from '../programmes/perso/fichesNatives';

const PLANCHES = [
  ['Landmine press assis', 'power12-landmine-press-assis', ['Seated landmine press']],
  ['Wall ball', 'power12-wall-ball', ['Wall balls']],
  ['Copenhague plank', 'power12-copenhague-plank', ['Copenhagen plank']],
] as const;

describe('bibliothèque : planches gardées pour les programmes à venir', () => {
  it('en remplacement sous POWER : nom, alias, casse et accents', () => {
    for (const [nom, fichier, alias] of PLANCHES) {
      const attendu = `fiches/${fichier}.webp`;
      for (const n of [nom, nom.toUpperCase(), ...alias]) {
        expect(ficheLibrePower(freeId(n)), n).toBe(attendu);
      }
    }
  });

  it('à l’import d’un programme : proposée sous le nom ET sous l’alias, une seule planche', () => {
    const exercices = [
      { id: 'a', nom: 'Landmine press assis' },
      { id: 'b', nom: 'Wall ball' },
      { id: 'c', nom: 'Copenhague plank' },
      { id: 'd', nom: 'Copenhagen plank' },
      { id: 'e', nom: 'Wall' },
    ];
    const p = proposerFiches(exercices, new Set(), candidatesNatives());
    const parExercice = Object.fromEntries(
      p.flatMap((x) => x.exercices.map((id) => [id, x.candidate.image])),
    );
    expect(parExercice).toEqual({
      a: 'fiches/power12-landmine-press-assis.webp',
      b: 'fiches/power12-wall-ball.webp',
      c: 'fiches/power12-copenhague-plank.webp',
      d: 'fiches/power12-copenhague-plank.webp',
    });
  });

  it('une clé par mouvement, désignable par un fichier de liens', () => {
    for (const [, fichier] of PLANCHES) {
      const cle = `power12-libre:${fichier.replace('power12-', '')}`;
      expect(clesFichesNatives().has(cle), cle).toBe(true);
      expect(ficheNative(cle)).toBe(`fiches/${fichier}.webp`);
    }
  });
});
