/**
 * Les questions d'un exercice de superset se posent AVANT les tours
 * (retour de Guillaume, 22 novembre).
 *
 * Dans un superset, la carte de chaque station est rangée sous les tours.
 * La question « aligner l'attendu sur 10 reps ? » y arrivait donc une fois
 * toutes les séries faites — et disparaissait dès la première notée. Ces
 * tests figent :
 * - la question se lit en tête de bloc, avant « Tour 1 » ;
 * - la carte de la station (séries saisies au-dessus) ne la répète pas ;
 * - la carte d'un exercice seul la garde, au même endroit qu'avant.
 */
import 'fake-indexeddb/auto';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { ResolvedExercise } from '../engine/getSession';
import { groupSupersets, type Circuit } from '../engine/superset';
import { EMPTY_CONTEXT, type Occurrence } from '../engine/types';
import { moduleParId } from '../programmes/registre';
import type { RestTimer } from '../state/useRestTimer';
import { PropositionsExercice } from './PropositionsExercice';
import { SupersetCard } from './SupersetCard';

const timer = { state: null, start: () => {} } as unknown as RestTimer;
const note = { week: 11, day: 0, date: '' };

/** Le superset de tronc du lundi : Ab Wheel + Roman Side Bench (S11). */
const lundi = moduleParId('power12')!.getSession(11, 0, EMPTY_CONTEXT)!;
const circuit = groupSupersets(lundi.exercises).find(
  (b): b is Circuit => b.kind === 'circuit' && b.exs.some((e) => e.id === 'roman-side-bench'),
)!;
const roman = circuit.exs.find((e) => e.id === 'roman-side-bench')!;

/** S10 : 10 reps à chacun des 3 tours, au lieu de 8. */
const historique: Occurrence[] = [
  {
    exerciseId: 'roman-side-bench',
    week: 10,
    day: 0,
    kg: null,
    plannedKg: null,
    rpe: null,
    failed: false,
    targetRPE: null,
    completed: true,
    sets: [
      { reps: 10, kg: null },
      { reps: 10, kg: null },
      { reps: 10, kg: null },
    ],
  },
];

const questions = (ex: ResolvedExercise) => (
  <PropositionsExercice
    ex={ex}
    savedSets={[]}
    overrideKg={null}
    history={ex.id === 'roman-side-bench' ? historique : undefined}
    note={note}
    titre={ex.name}
    alignement={{ decision: undefined, onDecider: () => {} }}
    onOverride={() => {}}
  />
);

describe('superset : la question avant les tours', () => {
  it('le lundi a bien un superset avec le Roman Side Bench, compté en reps', () => {
    expect(circuit.exs.length).toBeGreaterThanOrEqual(2);
    expect(roman.work).toMatchObject({ kind: 'reps' });
  });

  it('« Aligner l’attendu » se lit en tête de bloc, avant « Tour 1 »', () => {
    const html = renderToStaticMarkup(
      <SupersetCard
        circuit={circuit}
        week={11}
        day={0}
        savedSets={{}}
        overrides={{}}
        timer={timer}
        onSaveSet={async () => {}}
        fiches={<p>FICHES-DU-BAS</p>}
        propositions={<>{circuit.exs.map((e) => questions(e))}</>}
      />,
    );
    const question = html.indexOf('Aligner l’attendu sur 10 reps');
    expect(question).toBeGreaterThan(-1);
    expect(question).toBeLessThan(html.indexOf('Tour 1 sur'));
    expect(question).toBeLessThan(html.indexOf('FICHES-DU-BAS'));
    // Le nom de la station dit à qui s'adresse la question.
    expect(html).toContain('Roman Side Bench');
  });

  it('la carte d’une station (séries au-dessus) ne répète pas la question ; une carte seule la garde', () => {
    const carte = readFileSync(new URL('./ExerciseCard.tsx', import.meta.url), 'utf8');
    expect(carte).toMatch(/\{!hideSets && \(\s*<PropositionsExercice/);
    const seance = readFileSync(new URL('../screens/SessionScreen.tsx', import.meta.url), 'utf8');
    expect(seance).toMatch(
      /propositions=\{<>\{bloc\.exs\.map\(\(ex\) => propositions\(ex\)\)\}<\/>\}/,
    );
  });
});
