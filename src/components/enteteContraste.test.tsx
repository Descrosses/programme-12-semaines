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

const carte = (ex: ResolvedExercise) =>
  renderToStaticMarkup(
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
const entete = (ex: ResolvedExercise) => {
  const html = carte(ex);
  const i = html.indexOf('exSub');
  return html.slice(i, html.indexOf('</div>', i));
};

describe('en contraste, l’en-tête dit le cycle du §10, pas le repos de base', () => {
  it('back squat S9 : « Cycle ≈ 3 min 30 », plus de « Repos 4 min »', () => {
    const h = entete(exo(9, 0, 'back-squat'));
    expect(h).toContain('Cycle ≈ 3 min 30');
    expect(h).not.toContain('Repos');
  });

  it('bench et deadlift S10 : « Cycle ≈ 3 min 30 » (1 min 30 → explosif → 2 min, les trois jours)', () => {
    expect(entete(exo(10, 2, 'bench-press'))).toContain('Cycle ≈ 3 min 30');
    expect(entete(exo(10, 5, 'deadlift'))).toContain('Cycle ≈ 3 min 30');
  });

  it('hors contraste, le repos de base reste affiché', () => {
    expect(entete(exo(1, 0, 'back-squat'))).toContain('Repos');
  });
});

describe('en contraste, la planche du mouvement explosif est dans la carte', () => {
  const planches = (html: string) => [
    ...new Set([...html.matchAll(/fiches\/([a-z0-9-]+\.webp)/g)].map((m) => m[1])),
  ];

  it('bench S10 : la planche du bench ET celle du plyo push-up, chacune nommée', () => {
    const html = carte(exo(10, 2, 'bench-press'));
    expect(planches(html)).toEqual(['power12-bench-press.webp', 'power12-plyo-push-up.webp']);
    expect(html).toContain('Fiche — Plyo Push-Up');
    expect(html).toContain('Fiche — Bench Press');
  });

  it('squat S9 : box jump ; deadlift S9 : broad jump', () => {
    expect(planches(carte(exo(9, 0, 'back-squat')))).toContain('power12-box-jump.webp');
    expect(planches(carte(exo(9, 5, 'deadlift')))).toContain('power12-broad-jump.webp');
  });

  it('hors contraste : une seule planche, bouton inchangé', () => {
    const html = carte(exo(1, 2, 'bench-press'));
    expect(planches(html)).toEqual(['power12-bench-press.webp']);
    expect(html).toContain('Fiche technique');
  });
});
