/**
 * Le bouton « Rep ratée » (P0-B, lot de stabilisation).
 *
 * Régression : il n'existait que pour les exercices de rôle `main`, ceux de
 * POWER. Sous MASS FORCE, `failed` restait donc toujours faux, alors que la
 * progression (§1 ter) classe en échec une série marquée ratée : la règle
 * existait, l'utilisateur ne pouvait pas la déclencher.
 */
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { DayIndex } from '../data/types';
import type { ResolvedExercise } from '../engine/getSession';
import { EMPTY_CONTEXT } from '../engine/types';
import { moduleParId } from '../programmes/registre';
import type { RestTimer } from '../state/useRestTimer';
import { SetEntry } from './ExerciseCard';

const timer = {
  state: null,
  remaining: 0,
  overtime: 0,
  ratio: 0,
  finished: false,
  start: () => {},
  add30: () => {},
  skip: () => {},
  prime: () => {},
  screenHeld: false,
  wakeLockSupported: false,
} as unknown as RestTimer;

const formulaire = (ex: ResolvedExercise) =>
  renderToStaticMarkup(
    <SetEntry
      ex={ex}
      index={0}
      plannedKg={null}
      saved={null}
      unite={null}
      lastInUnit={null}
      timer={timer}
      onSave={async () => {}}
    />,
  );
const aLeBouton = (ex: ResolvedExercise) => formulaire(ex).includes('Rep ratée ?');

const exercices = (id: string, week: number, jours: DayIndex[]) =>
  jours.flatMap((d) => moduleParId(id)!.getSession(week, d, EMPTY_CONTEXT)?.exercises ?? []);

describe('bouton « Rep ratée »', () => {
  it('présent sur TOUS les exercices de MASS FORCE', () => {
    const tous = exercices('mass-force', 1, [0, 1, 3, 4]);
    expect(tous).toHaveLength(19);
    expect(tous.filter((e) => !aLeBouton(e)).map((e) => e.id)).toEqual([]);
  });

  it('POWER inchangé : sur les mouvements principaux, et eux seuls', () => {
    const power = exercices('power12', 1, [0, 1, 2, 3, 4, 5, 6]);
    for (const e of power) {
      expect({ id: e.id, bouton: aLeBouton(e) }).toEqual({
        id: e.id,
        bouton: e.def.role === 'main',
      });
    }
    expect(power.some((e) => e.def.role === 'main')).toBe(true);
  });

  it('MASS CONGESTION inchangé : aucun bouton', () => {
    expect(exercices('mass4', 1, [0, 1, 3, 5]).filter(aLeBouton)).toEqual([]);
  });
});
