/**
 * L'en-tête d'un exercice en contraste (S9-11) : une seule durée.
 *
 * Retour de Guillaume : « Back squat + box jump : 3'30 ou 4' ? ». La carte
 * affichait « Repos 3 min 30 » (le repos de base du squat) et, juste dessous,
 * « Cycle ≈ 4 min » (la séquence du §10 : 2 min lourd → explosif, 2 min
 * explosif → lourd). Le chrono, lui, suivait déjà la séquence. L'en-tête dit
 * désormais le cycle, et rien d'autre ; hors contraste, rien ne change.
 */
import 'fake-indexeddb/auto';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { ResolvedExercise } from '../engine/getSession';
import { EMPTY_CONTEXT } from '../engine/types';
import { moduleParId } from '../programmes/registre';
import type { RestTimer } from '../state/useRestTimer';
import { ExerciseCard } from './ExerciseCard';

const SETTINGS = {
  ...EMPTY_CONTEXT.settings,
  oneRM: { 'back-squat': 140, 'bench-press': 100, deadlift: 180 },
};
const exo = (semaine: number, jour: number, id: string) =>
  moduleParId('power12')!
    .getSession(semaine, jour as 0, { ...EMPTY_CONTEXT, settings: SETTINGS })!
    .exercises.find((e) => e.id === id)!;

const entete = (ex: ResolvedExercise) => {
  const html = renderToStaticMarkup(
    <ExerciseCard
      ex={ex}
      savedSets={[]}
      overrideKg={null}
      timer={{ state: null, start: () => {} } as unknown as RestTimer}
      history={undefined}
      media={null}
      note={{ week: 9, day: 0, date: '' }}
      onSaveSet={async () => {}}
      onOverride={() => {}}
    />,
  );
  const i = html.indexOf('exSub');
  return html.slice(i, html.indexOf('</div>', i));
};

describe('en contraste, l’en-tête dit le cycle du §10, pas le repos de base', () => {
  it('back squat S9 : « Cycle ≈ 4 min », plus de « Repos 3 min 30 »', () => {
    const h = entete(exo(9, 0, 'back-squat'));
    expect(h).toContain('Cycle ≈ 4 min');
    expect(h).not.toContain('Repos');
  });

  it('bench et deadlift S10 : « Cycle ≈ 3 min 30 »', () => {
    expect(entete(exo(10, 2, 'bench-press'))).toContain('Cycle ≈ 3 min 30');
    expect(entete(exo(10, 5, 'deadlift'))).toContain('Cycle ≈ 3 min 30');
  });

  it('hors contraste, le repos de base reste affiché', () => {
    expect(entete(exo(1, 0, 'back-squat'))).toContain('Repos');
  });
});
