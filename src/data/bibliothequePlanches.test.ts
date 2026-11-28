/**
 * La bibliothèque des planches « en attente d'un programme » (Guillaume,
 * 26 novembre : « garde-les dans la bibliothèque dès que ce mouvement fera
 * partie d'un programme ») : Landmine press assis, Wall ball, Copenhague
 * plank, et (27 novembre) Landmine single leg squat puis huit planches du brouillon
 * des remplacements.
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
  [
    'Landmine single leg squat',
    'power12-landmine-single-leg-squat',
    ['Landmine single-leg squat', 'Squat unijambiste landmine'],
  ],
  ['Good morning barre', 'power12-good-morning-barre', ['Good morning']],
  ['Fentes arrière haltères', 'power12-fentes-arriere-halteres', ['Dumbbell reverse lunge']],
  ['RDL haltères', 'power12-rdl-halteres', ['Dumbbell RDL']],
  ['Glute bridge barre au sol', 'power12-glute-bridge-barre', ['Pont fessier barre']],
  ['Pull-through à la poulie basse', 'power12-pull-through-poulie', ['Cable pull-through']],
  ['Leg curl allongé', 'power12-leg-curl-allonge', ['Lying leg curl']],
  ['Single-leg RDL au landmine', 'power12-single-leg-rdl-landmine', ['Landmine single leg RDL']],
  [
    'Développé haltère unilatéral à genou',
    'power12-developpe-haltere-genou',
    ['Half-kneeling dumbbell press'],
  ],
  [
    'Rowing haltère unilatéral sur banc',
    'power12-rowing-haltere-banc',
    // Même planche, autres consignes (Guillaume, 28 novembre).
    ['Rowing haltère unilatéral explosif'],
  ],
  ['Y-raise allongé sur banc incliné', 'power12-y-raise-incline', ['Prone Y raise']],
  ['Oiseau penché haltères', 'power12-oiseau-penche-halteres', ['Bent over reverse fly']],
  [
    'Rowing machine appui poitrine',
    'power12-rowing-machine-poitrine',
    ['Chest supported T-bar row'],
  ],
  ['Développé incliné barre', 'power12-developpe-incline-barre', ['Incline bench press']],
  ['Développé incliné Smith', 'power12-developpe-incline-smith', ['Incline Smith press']],
  [
    'Développé militaire haltère unilatéral debout',
    'power12-developpe-militaire-haltere-unilateral',
    ['Single arm dumbbell overhead press'],
  ],
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
      { id: 'f', nom: 'Landmine single leg squat' },
      { id: 'g', nom: 'Squat unijambiste landmine' },
      { id: 'h', nom: 'Landmine squat' },
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
      f: 'fiches/power12-landmine-single-leg-squat.webp',
      g: 'fiches/power12-landmine-single-leg-squat.webp',
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
