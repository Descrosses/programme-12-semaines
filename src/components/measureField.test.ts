/**
 * Ce qui s'affiche sur la ligne d'une série : une distance ou des reps, une
 * charge ou rien.
 *
 * Le défaut corrigé ici : le Broad Jump du vendredi, « 5 × 2 », affichait REPS
 * et CHARGE·KG à « PDC ». Deux champs, aucun des deux utile — la distance,
 * seule valeur qui progresse sur un saut, n'avait nulle part où être notée.
 * Elle ne l'était qu'en semaine de combine, parce que le champ de mesure était
 * réservé aux exercices de rôle `test`.
 */

import { describe, expect, it } from 'vitest';
import { measureOf, showsLoadField } from './ExerciseCard';
import { getSession, hasSession } from '../engine/getSession';
import { WEEK_DAYS } from '../data/program';
import { EMPTY_CONTEXT, type SessionContext } from '../engine/types';
import type { ResolvedExercise } from '../engine/getSession';
import type { WeekIndex } from '../data/types';

const CTX: SessionContext = {
  ...EMPTY_CONTEXT,
  settings: { ...EMPTY_CONTEXT.settings, startDate: '2026-09-14' },
};

/** Chaque exercice du programme, une seule fois, avec où on l'a trouvé. */
function tousLesExercices(): Map<string, ResolvedExercise> {
  const out = new Map<string, ResolvedExercise>();
  for (let w = 0; w <= 12; w++) {
    const week = w as WeekIndex;
    for (const day of WEEK_DAYS[week]) {
      if (!hasSession(week, day)) continue;
      for (const ex of getSession(week, day, CTX)?.exercises ?? []) {
        if (!out.has(ex.id)) out.set(ex.id, ex);
      }
    }
  }
  return out;
}

const trouve = (id: string): ResolvedExercise => {
  const ex = tousLesExercices().get(id);
  expect(ex, `${id} introuvable dans le programme`).toBeDefined();
  return ex!;
};

describe('le Broad Jump du vendredi se note en distance', () => {
  it('affiche un champ Distance en cm, pas un compte de reps', () => {
    const m = measureOf(trouve('broad-jump'));
    expect(m).not.toBeNull();
    expect(m!.unit).toBe('cm');
    expect(m!.label).toBe('Distance');
  });

  it('n’affiche plus de champ de charge « PDC »', () => {
    // Il n'y a rien à lester sur un saut en longueur : le champ ne pouvait que
    // rester vide, en prenant la moitié de la ligne.
    expect(showsLoadField(trouve('broad-jump'))).toBe(false);
  });

  it('vaut pour toutes les semaines, pas seulement le combine', () => {
    // Le bug venait de là : la mesure était conditionnée au rôle `test`.
    for (const week of [1, 5, 9, 12] as WeekIndex[]) {
      for (const day of WEEK_DAYS[week]) {
        if (!hasSession(week, day)) continue;
        const ex = getSession(week, day, CTX)?.exercises.find((e) => e.id === 'broad-jump');
        if (!ex) continue;
        expect(measureOf(ex)?.unit, `S${week} jour ${day}`).toBe('cm');
        expect(showsLoadField(ex), `S${week} jour ${day}`).toBe(false);
      }
    }
  });
});

describe('la règle vaut pour tout ce qui se mesure en distance ou en temps', () => {
  it('sauts et bonds : une distance, pas de charge', () => {
    for (const id of ['broad-jump', 'box-jump', 'lateral-bound']) {
      expect(measureOf(trouve(id))?.unit, id).toBe('cm');
      expect(showsLoadField(trouve(id)), id).toBe(false);
    }
  });

  it('un porté garde ses DEUX champs : sa charge existe vraiment', () => {
    // C'est la limite de la règle. 2 × 40 kg sur 25 m : les deux chiffres
    // comptent, et supprimer la charge effacerait la moitié de l'exercice.
    const carry = trouve('farmer-carry');
    expect(measureOf(carry)?.unit).toBe('m');
    expect(showsLoadField(carry)).toBe(true);
  });

  it('un mouvement au poids du corps sans mesure garde son champ de lest', () => {
    // La règle ne doit pas déborder : « PDC » reste là où il sert à noter un
    // lest de ceinture ou un gilet.
    for (const id of ['ab-wheel', 'nordic-curl', 'pogo-jumps']) {
      expect(showsLoadField(trouve(id)), id).toBe(true);
    }
  });

  it('un mouvement chargé garde son champ de charge', () => {
    for (const id of ['back-squat', 'bench-press', 'deadlift', 'push-press']) {
      expect(showsLoadField(trouve(id)), id).toBe(true);
      // Et sa mesure reste les reps : le kg se note dans le champ de charge,
      // pas une deuxième fois à côté.
      expect(measureOf(trouve(id)), id).toBeNull();
    }
  });
});
