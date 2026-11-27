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
import {
  BIBLIOTHEQUE_LIBRE_POWER,
  FICHES_POWER12,
  MEME_GESTE,
  MOUVEMENT_DU_TEST,
  fichePower12,
} from './fichesPower12';
import { ficheLibrePower, freeId, resolveCustom } from '../engine/customExercise';
import { FICHES_MASS4 } from '../programmes/mass4/fiches';

const DOSSIER = join(process.cwd(), 'public', 'fiches');

describe('fiches de mouvement de POWER 12', () => {
  it('couvre exactement les trente-neuf planches livrées, ni plus ni moins', () => {
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
        'barbell-offset-hold',
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
        'test-vertical-jump',
        'test-strict-pullup-max',
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
    // Planche du 27 novembre : un maintien, une seule pose, un seul disque.
    expect(exercise('barbell-offset-hold').fiche).toBe('fiches/power12-barbell-offset-hold.webp');
    expect(exercise('broad-jump').fiche).toBe('fiches/power12-broad-jump.webp');
  });

  it('laisse sans planche les mouvements qui n’en ont pas', () => {
    expect(exercise('back-squat').fiche).toBe('fiches/power12-back-squat.webp');
    expect(exercise('pin-squat').fiche).toBeUndefined();
    expect(exercise('test-sprint-10m').fiche).toBeUndefined();
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

  it('le combiné : Vertical Jump et Tractions strictes ont leur propre planche', () => {
    expect(exercise('test-vertical-jump').fiche).toBe('fiches/power12-vertical-jump.webp');
    expect(exercise('test-strict-pullup-max').fiche).toBe('fiches/power12-strict-pullup.webp');
    // Pas la planche lestée : ceinture et disque de 20 kg, ce n'est pas le geste du test.
    expect(exercise('test-strict-pullup-max').fiche).not.toBe(
      exercise('test-weighted-pullup-1rm').fiche,
    );
  });

  it('le combiné : sans planche pour CE mouvement, rien n’est rattaché', () => {
    for (const id of ['test-sprint-10m', 'test-sprint-20m', 'test-bodyweight']) {
      expect(exercise(id).fiche, id).toBeUndefined();
    }
  });

  it('le Speed Squat lit la planche du back squat (même geste, plus léger, plus vite)', () => {
    expect(exercise('speed-squat').fiche).toBe('fiches/power12-back-squat.webp');
    expect(exercise('speed-squat').fiche).toBe(exercise('back-squat').fiche);
    for (const [id, cible] of Object.entries(MEME_GESTE)) {
      expect(EXERCISES[id], id).toBeDefined();
      expect(FICHES_POWER12[cible], cible).toBeDefined();
    }
  });
});

describe('bibliothèque des exercices libres de POWER', () => {
  it('chaque planche existe, et n’est partagée ni avec POWER ni avec MASS', () => {
    const mass4 = new Set(Object.values(FICHES_MASS4));
    const power = new Set(Object.values(FICHES_POWER12));
    for (const e of BIBLIOTHEQUE_LIBRE_POWER) {
      expect(existsSync(join(DOSSIER, e.fichier)), e.fichier).toBe(true);
      expect(mass4.has(e.fichier), e.fichier).toBe(false);
      expect(power.has(e.fichier), e.fichier).toBe(false);
    }
  });

  it('« Rowing buste penché » tapé à la main retrouve sa planche — nom, alias, casse, accents', () => {
    const attendu = 'fiches/power12-rowing-buste-penche.webp';
    for (const nom of [
      'Rowing buste penché',
      'rowing buste penche',
      'ROWING BUSTE PENCHÉ',
      'Rowing barre buste penché',
      'Bent over row',
    ]) {
      expect(ficheLibrePower(freeId(nom)), nom).toBe(attendu);
    }
    expect(ficheLibrePower(freeId('Rowing haltère'))).toBeUndefined();
    // Un exercice du catalogue n'est pas un exercice libre.
    expect(ficheLibrePower('chest-supported-row')).toBeUndefined();
  });

  it('la planche arrive sur l’exercice de remplacement, sous POWER seulement', () => {
    const spec = {
      exerciseId: freeId('Rowing buste penché'),
      name: 'Rowing buste penché',
      sets: 3,
      reps: 8,
      kg: 60,
      restSec: 90,
    };
    expect(resolveCustom(spec, undefined, ficheLibrePower).def.fiche).toBe(
      'fiches/power12-rowing-buste-penche.webp',
    );
    // Sans bibliothèque (MASS, programmes importés) : la fiche minimale, sans planche.
    expect(resolveCustom(spec).def.fiche).toBeUndefined();
  });
});
