/**
 * « Passer à 10 reps » doit changer la séance (retour de Guillaume,
 * 22 novembre : « même après avoir validé, ça ne les augmente pas »).
 *
 * Deux défauts, deux gardes :
 * - les curseurs de reps restaient sur la valeur de leur ouverture : l'en-tête
 *   disait 3 × 10, chaque série proposait 6. Ils suivent désormais l'attendu
 *   tant que la série n'est pas validée, comme la charge le faisait déjà ;
 * - la question se posait aussi là où le moteur n'applique pas la réponse
 *   (MASS, programme importé, exercice remplacé) : on acceptait, rien ne
 *   bougeait. Elle n'est posée que sur un exercice marqué `alignable` par la
 *   séance POWER.
 */
import 'fake-indexeddb/auto';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vitest';
import type { DayIndex } from '../data/types';
import { resolveCustom } from '../engine/customExercise';
import type { ResolvedExercise } from '../engine/getSession';
import { validerProgramme } from '../engine/perso/valider';
import { EMPTY_CONTEXT, type Occurrence } from '../engine/types';
import { remplirMemoire, viderMemoire } from '../programmes/perso/memoire';
import { moduleParId } from '../programmes/registre';
import { PropositionsExercice } from './PropositionsExercice';

const JOURS: DayIndex[] = [0, 1, 2, 3, 4, 5, 6];

function tousLesExercices(id: string): ResolvedExercise[] {
  const m = moduleParId(id)!;
  return m.semaines.flatMap((w) =>
    JOURS.flatMap((d) => m.getSession(w, d, EMPTY_CONTEXT)?.exercises ?? []),
  );
}

const vendrediS2 = moduleParId('power12')!.getSession(2, 4, EMPTY_CONTEXT)!;
const deadBug = vendrediS2.exercises.find((e) => e.id === 'dead-bug-cable')!;

/** S1 : 10 reps à chacun des 3 tours, au lieu de 6. */
const historique: Occurrence[] = [
  {
    exerciseId: 'dead-bug-cable',
    week: 1,
    day: 4,
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

const question = (ex: ResolvedExercise) =>
  renderToStaticMarkup(
    <PropositionsExercice
      ex={ex}
      savedSets={[]}
      overrideKg={null}
      history={historique}
      note={{ week: 2, day: 4, date: '' }}
      alignement={{ decision: undefined, onDecider: () => {} }}
      onOverride={() => {}}
    />,
  );

afterEach(() => viderMemoire());

describe('la question n’est posée que là où la réponse s’applique', () => {
  it('POWER : le Dead Bug est alignable, la question se pose', () => {
    expect(deadBug.alignable).toBe(true);
    expect(question(deadBug)).toContain('Passer à 10 reps');
  });

  it('POWER : jamais un lift principal, jamais en deload', () => {
    const lundi = moduleParId('power12')!.getSession(2, 0, EMPTY_CONTEXT)!;
    expect(lundi.exercises.find((e) => e.id === 'back-squat')!.alignable).toBeUndefined();
    const deload = moduleParId('power12')!.getSession(4, 4, EMPTY_CONTEXT)!;
    expect(deload.exercises.some((e) => e.alignable)).toBe(false);
  });

  it('sans la marque, pas de question — même historique, même exercice', () => {
    const { alignable: _ignore, ...sansMarque } = deadBug;
    expect(question(sansMarque)).toBe('');
  });

  it('MASS CONGESTION et MASS FORCE : aucun exercice alignable', () => {
    expect(tousLesExercices('mass4').some((e) => e.alignable)).toBe(false);
    expect(tousLesExercices('mass-force').some((e) => e.alignable)).toBe(false);
  });

  it('programme importé : aucun exercice alignable', () => {
    const texte = readFileSync(
      new URL('../engine/perso/__fixtures__/training1.json', import.meta.url),
      'utf8',
    );
    const v = validerProgramme(texte);
    if (!v.ok) throw new Error('Training 1 invalide');
    remplirMemoire([
      {
        cle: 'perso-test-1',
        uid: v.programme.uid,
        rev: 1,
        nom: v.programme.nom,
        importeLe: '2026-11-22',
        archive: false,
        texte,
        document: v.programme,
        reponses: { dureeSemaines: 2 },
      },
    ]);
    const tous = tousLesExercices('perso-test-1');
    expect(tous.length).toBeGreaterThan(0);
    expect(tous.some((e) => e.alignable)).toBe(false);
  });

  it('exercice remplacé : pas alignable (ses reps sont celles saisies)', () => {
    const libre = resolveCustom({
      exerciseId: 'libre-gainage',
      name: 'Gainage',
      sets: 3,
      reps: 6,
      kg: null,
      restSec: 60,
    });
    expect(libre.alignable).toBeUndefined();
  });
});

describe('les curseurs suivent l’attendu', () => {
  it('une série non validée se recale sur les reps prévues quand elles changent', () => {
    const carte = readFileSync(new URL('./ExerciseCard.tsx', import.meta.url), 'utf8');
    expect(carte).toMatch(
      /useEffect\(\(\) => \{\s*if \(saved === null && plannedReps !== null\) setReps\(plannedReps\);\s*\}, \[plannedReps, saved\]\);/,
    );
  });
});
