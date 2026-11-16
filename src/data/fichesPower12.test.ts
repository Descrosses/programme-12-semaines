/**
 * Les garde-fous des fiches de mouvement de POWER 12.
 *
 * Mêmes risques que pour MASS 4 : une fiche rattachée à un identifiant qui
 * n'existe pas, ou un nom de fichier faux, ne plante rien — on ne s'en
 * aperçoit qu'en salle.
 */

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { EXERCISES, exercise } from './exercises';
import { FICHES_POWER12, MOUVEMENT_DU_TEST, fichePower12 } from './fichesPower12';
import { FICHES_MASS4 } from '../programmes/mass4/fiches';

const DOSSIER = join(process.cwd(), 'public', 'fiches');

describe('fiches de mouvement de POWER 12', () => {
  it('couvre exactement les trente-six mouvements livrés, ni plus ni moins', () => {
    expect(Object.keys(FICHES_POWER12).sort()).toEqual(
      [
        'ab-wheel',
        'back-squat',
        'bench-press',
        'box-jump',
        'broad-jump',
        'bulgarian-split-squat',
        'chest-supported-row',
        'deadlift',
        'explosive-cable-row',
        'face-pull',
        'farmer-carry',
        'hang-high-pull',
        'jump-squat-db',
        'landmine-press-kneeling',
        'pallof-press',
        'plyo-push-up',
        'pogo-jumps',
        'push-press',
        'rdl',
        'roman-side-bench',
        'weighted-pullup',
        'cable-external-rotation',
        'lateral-bound',
        'dead-bug-cable',
        'front-squat',
        'hip-thrust',
        'nordic-curl',
        'single-leg-rdl',
        'copenhagen-plank',
        'suitcase-carry',
        'incline-db-press',
        'neutral-grip-pullup',
        'one-arm-cable-row',
        'landmine-press-standing',
        'cable-chop',
        'hanging-leg-raise',
      ].sort(),
    );
  });

  it('ne déclare aucune fiche pour un mouvement absent du catalogue', () => {
    const orphelines = Object.keys(FICHES_POWER12).filter((id) => EXERCISES[id] === undefined);
    expect(orphelines).toEqual([]);
  });

  it('pointe vers des fichiers qui existent réellement', () => {
    const manquants = Object.values(FICHES_POWER12).filter((f) => !existsSync(join(DOSSIER, f)));
    expect(manquants).toEqual([]);
  });

  it('ne fait pointer deux mouvements vers la même planche', () => {
    const fichiers = Object.values(FICHES_POWER12);
    expect(new Set(fichiers).size).toBe(fichiers.length);
  });

  it('ne partage aucun fichier avec MASS 4', () => {
    // Des mouvements homonymes (ab-wheel, roman-side-bench) ont une planche
    // différente dans chaque programme : un fichier commun en écraserait une.
    const mass4 = new Set(Object.values(FICHES_MASS4));
    expect(Object.values(FICHES_POWER12).filter((f) => mass4.has(f))).toEqual([]);
  });

  it('pose la planche sur la définition servie à la carte', () => {
    expect(exercise('deadlift').fiche).toBe('fiches/power12-deadlift.webp');
    expect(exercise('broad-jump').fiche).toBe('fiches/power12-broad-jump.webp');
  });

  it('laisse sans planche les mouvements qui n’en ont pas', () => {
    expect(exercise('back-squat').fiche).toBe('fiches/power12-back-squat.webp');
    expect(exercise('speed-squat').fiche).toBeUndefined();
    expect(exercise('test-vertical-jump').fiche).toBeUndefined();
    expect(fichePower12('mouvement-inconnu')).toBeUndefined();
  });

  it('garde la règle §5 des explosifs en plus de la planche', () => {
    // `def()` pose les deux : l'ajout de la fiche ne doit pas faire perdre
    // la consigne d'arrêt sur baisse de performance.
    const box = exercise('box-jump');
    expect(box.fiche).toBe('fiches/power12-box-jump.webp');
    expect(box.cues?.some((c) => c.startsWith('Chaque répétition est une tentative'))).toBe(true);
  });

  it('le combiné : chaque test lit la planche de SON mouvement (Back Squat 1RM = back squat)', () => {
    expect(exercise('test-squat-1rm').fiche).toBe(exercise('back-squat').fiche);
    expect(exercise('test-squat-1rm').fiche).toBe('fiches/power12-back-squat.webp');
    expect(exercise('test-bench-1rm').fiche).toBe('fiches/power12-bench-press.webp');
    expect(exercise('test-deadlift-1rm').fiche).toBe('fiches/power12-deadlift.webp');
    expect(exercise('test-weighted-pullup-1rm').fiche).toBe('fiches/power12-weighted-pullup.webp');
    expect(exercise('test-push-press-1rm').fiche).toBe('fiches/power12-push-press.webp');
    expect(exercise('test-broad-jump').fiche).toBe('fiches/power12-broad-jump.webp');
    expect(exercise('test-ab-wheel-max').fiche).toBe('fiches/power12-ab-wheel.webp');
    expect(exercise('test-leg-raise-max').fiche).toBe('fiches/power12-hanging-leg-raise.webp');
  });

  it('le combiné : chaque correspondance vise un test réel et un mouvement qui a une planche', () => {
    for (const [test, mouvement] of Object.entries(MOUVEMENT_DU_TEST)) {
      expect(EXERCISES[test]?.role, test).toBe('test');
      expect(FICHES_POWER12[mouvement], mouvement).toBeDefined();
      expect(EXERCISES[mouvement], mouvement).toBeDefined();
    }
  });

  it('le combiné : sans planche pour CE mouvement, rien n’est rattaché', () => {
    for (const id of [
      'test-vertical-jump',
      'test-sprint-10m',
      'test-sprint-20m',
      'test-bodyweight',
      // Ni la planche des tractions lestées (ceinture + disque) : pas la même traction.
      'test-strict-pullup-max',
    ]) {
      expect(exercise(id).fiche, id).toBeUndefined();
    }
  });
});
