import { describe, expect, it } from 'vitest';
import {
  ADD_DEFAULTS,
  additionChip,
  applyCustom,
  exerciseChoices,
  matchChoices,
  freeDef,
  freeId,
  isFreeId,
  prefillFrom,
  previousAdditions,
  previousReplacement,
  replacementChip,
  resolveCustom,
  specFormat,
  type CustomRow,
  type CustomSpec,
} from './customExercise';
import { reps, rpe, type ExerciseDef } from '../data/types';
import type { ResolvedExercise } from './getSession';

const spec = (over: Partial<CustomSpec> = {}): CustomSpec => ({
  exerciseId: 'hack-squat',
  name: 'Hack Squat',
  sets: 3,
  reps: 8,
  kg: 40,
  restSec: 90,
  ...over,
});

const row = (over: Partial<CustomRow> = {}): CustomRow => ({
  ...spec(),
  kind: 'replace',
  originalExerciseId: 'back-squat',
  week: 5,
  day: 0,
  at: 1_000,
  ...over,
});

/** Un exercice résolu réduit à ce que ces fonctions regardent. */
const prevu = (over: Partial<ResolvedExercise> = {}): ResolvedExercise => ({
  def: { id: 'back-squat', name: 'Back Squat', fn: 'squat', role: 'main' },
  id: 'back-squat',
  name: 'Back Squat',
  sets: 4,
  work: reps(6),
  load: { kg: 120, shape: 'barbell', step: 2.5, source: 'programme' },
  targetRPE: rpe(8),
  restSec: 240,
  loadLine: '4 × 6 × 120 kg',
  notes: [],
  planKg: 120,
  lastKg: 115,
  lastMeasure: null,
  suggestion: null,
  adjustments: [],
  ...over,
});

describe('freeId', () => {
  it('deux saisies du même nom donnent le même identifiant', () => {
    // Sinon « Hack Squat » de la semaine 5 et « hack squat » de la semaine 8
    // feraient deux historiques séparés, et la progression serait invisible.
    expect(freeId('Hack Squat')).toBe(freeId('hack squat'));
    expect(freeId('Hack  Squat ')).toBe(freeId('Hack Squat'));
  });

  it('écrase les accents, garde un slug lisible', () => {
    expect(freeId('Élévations latérales')).toBe('libre:elevations-laterales');
  });

  it('se reconnaît, et ne heurte aucun id du programme', () => {
    expect(isFreeId(freeId('Hack Squat'))).toBe(true);
    expect(isFreeId('back-squat')).toBe(false);
  });
});

describe('freeDef', () => {
  it('n’invente ni consigne ni intention', () => {
    const def = freeDef(spec({ exerciseId: freeId('Hack Squat') }));
    expect(def.intent).toBeUndefined();
    expect(def.cues).toBeUndefined();
    expect(def.progressionRule).toBeUndefined();
    expect(def.altBasicFit).toBeUndefined();
  });

  it('n’est jamais un lift principal — le bouton « rep ratée » ne s’applique pas', () => {
    expect(freeDef(spec()).role).toBe('accessory');
    expect(freeDef(spec()).fn).toBe('libre');
  });
});

describe('resolveCustom', () => {
  it('produit un exercice que l’écran séance sait déjà afficher', () => {
    const ex = resolveCustom(spec());
    expect(ex.id).toBe('hack-squat');
    expect(ex.name).toBe('Hack Squat');
    expect(ex.sets).toBe(3);
    expect(ex.restSec).toBe(90);
    expect(ex.loadLine).toBe('3 × 8 × 40 kg');
  });

  it('n’a AUCUNE cible de RPE : §11 n’a rien à dire sur lui', () => {
    expect(resolveCustom(spec()).targetRPE).toBeNull();
    expect(resolveCustom(spec()).suggestion).toBeNull();
  });

  it('accepte un exercice sans charge', () => {
    const ex = resolveCustom(spec({ kg: null, sets: 3, reps: 12 }));
    expect(ex.load.kg).toBeNull();
    expect(ex.loadLine).toBe('3 × 12');
  });

  it('garde la fiche du catalogue quand l’exercice en a une', () => {
    const def: ExerciseDef = {
      id: 'hack-squat',
      name: 'Hack Squat',
      fn: 'squat',
      role: 'accessory',
      intent: 'Quadriceps sous charge guidée.',
    };
    expect(resolveCustom(spec(), def).def.intent).toBe('Quadriceps sous charge guidée.');
  });
});

describe('prefillFrom', () => {
  it('ouvre le panneau sur le format PRÉVU, pas sur des valeurs par défaut', () => {
    // Remplacer un 4 × 6 à 120 kg par un 3 × 8 par défaut obligerait à
    // corriger quatre curseurs avant de commencer.
    expect(prefillFrom(prevu())).toEqual({ sets: 4, reps: 6, kg: 120, restSec: 240 });
  });

  it('ouvre une fourchette de reps sur le haut — c’est la cible', () => {
    expect(prefillFrom(prevu({ work: reps({ min: 6, max: 8 }) })).reps).toBe(8);
  });

  it('retombe sur la valeur par défaut quand les reps ne sont pas un nombre', () => {
    expect(prefillFrom(prevu({ work: reps('max') })).reps).toBe(ADD_DEFAULTS.reps);
    expect(prefillFrom(prevu({ work: { kind: 'distance', meters: 25 } })).reps).toBe(
      ADD_DEFAULTS.reps,
    );
  });

  it('reprend l’absence de charge telle quelle', () => {
    const sans = prevu({ load: { kg: null, shape: 'bodyweight', step: 2.5, source: 'aucune' } });
    expect(prefillFrom(sans).kg).toBeNull();
  });
});

describe('specFormat', () => {
  it('écrit le format comme on le dit', () => {
    expect(specFormat(spec())).toBe('3 × 8 × 40 kg');
    expect(specFormat(spec({ kg: 42.5 }))).toBe('3 × 8 × 42,5 kg');
    expect(specFormat(spec({ kg: null, reps: 12 }))).toBe('3 × 12');
  });
});

describe('applyCustom', () => {
  const def = (id: string): ExerciseDef | undefined =>
    id === 'hack-squat'
      ? { id, name: 'Hack Squat', fn: 'squat', role: 'accessory', intent: 'x' }
      : undefined;

  it('un remplacement prend la PLACE de l’exercice d’origine', () => {
    // L'ordre d'une séance n'est pas décoratif : ce qui remplace le squat
    // hérite de sa place, il ne part pas en fin de liste.
    const liste = [prevu(), prevu({ id: 'rdl', name: 'RDL' })];
    const { exercises, replaced } = applyCustom(liste, [row()], def);
    expect(exercises.map((e) => e.id)).toEqual(['hack-squat', 'rdl']);
    expect(replaced).toHaveLength(1);
    expect(replaced[0]!.original.id).toBe('back-squat');
  });

  it('un ajout va à la fin', () => {
    const ajout = row({
      kind: 'add',
      originalExerciseId: null,
      exerciseId: 'leg-extension',
      name: 'Leg Extension',
    });
    const { exercises, replaced } = applyCustom([prevu()], [ajout], def);
    expect(exercises.map((e) => e.id)).toEqual(['back-squat', 'leg-extension']);
    expect(replaced).toHaveLength(0);
  });

  it('le plus récent remplacement du même créneau gagne', () => {
    const vieux = row({ at: 100, exerciseId: 'hack-squat', name: 'Hack Squat' });
    const neuf = row({ at: 200, exerciseId: 'goblet-squat', name: 'Goblet Squat' });
    const { exercises } = applyCustom([prevu()], [vieux, neuf], def);
    expect(exercises.map((e) => e.id)).toEqual(['goblet-squat']);
  });

  it('ignore un remplacement qui visait un exercice absent de la séance', () => {
    const orphelin = row({ originalExerciseId: 'bench-press' });
    const { exercises, replaced } = applyCustom([prevu()], [orphelin], def);
    expect(exercises.map((e) => e.id)).toEqual(['back-squat']);
    expect(replaced).toHaveLength(0);
  });

  it('laisse la séance intacte sans aucune ligne', () => {
    const liste = [prevu(), prevu({ id: 'rdl', name: 'RDL' })];
    const { exercises } = applyCustom(liste, [], def);
    expect(exercises).toEqual(liste);
  });

  it('un remplacement du catalogue garde sa fiche', () => {
    const { exercises } = applyCustom([prevu()], [row()], def);
    expect(exercises[0]!.def.intent).toBe('x');
  });
});

describe('previousReplacement', () => {
  it('trouve le dernier remplacement du même créneau', () => {
    const rows = [
      row({ week: 3, at: 100, name: 'Goblet Squat', exerciseId: 'goblet-squat' }),
      row({ week: 5, at: 200, name: 'Hack Squat', exerciseId: 'hack-squat' }),
    ];
    const trouve = previousReplacement(rows, { exerciseId: 'back-squat', week: 6, day: 0 });
    expect(trouve?.name).toBe('Hack Squat');
  });

  it('ignore le remplacement du jour — il est déjà affiché à sa place', () => {
    const rows = [row({ week: 6, day: 0 })];
    expect(previousReplacement(rows, { exerciseId: 'back-squat', week: 6, day: 0 })).toBeNull();
  });

  it('ne traverse pas les jours : le créneau du lundi n’est pas celui du samedi', () => {
    const rows = [row({ week: 5, day: 0 })];
    expect(previousReplacement(rows, { exerciseId: 'back-squat', week: 6, day: 5 })).toBeNull();
  });

  it('ne confond pas deux exercices d’origine', () => {
    const rows = [row({ originalExerciseId: 'front-squat' })];
    expect(previousReplacement(rows, { exerciseId: 'back-squat', week: 6, day: 0 })).toBeNull();
  });

  it('ignore les ajouts', () => {
    const rows = [row({ kind: 'add', originalExerciseId: null })];
    expect(previousReplacement(rows, { exerciseId: 'back-squat', week: 6, day: 0 })).toBeNull();
  });

  it('écrit la puce sous la forme demandée', () => {
    expect(replacementChip(row())).toBe('Remplacé par Hack Squat : 3 × 8 × 40 kg');
  });
});

describe('previousAdditions', () => {
  const ajout = (week: number, name: string, at: number): CustomRow =>
    row({ kind: 'add', originalExerciseId: null, week, name, exerciseId: freeId(name), at });

  it('ne propose que ceux de la DERNIÈRE séance concernée', () => {
    // Un ajout fait une fois en semaine 3 n'a pas à revenir proposer ses
    // services pendant neuf semaines.
    const rows = [ajout(3, 'Mollets', 100), ajout(5, 'Hack Squat', 200), ajout(5, 'Leg Ext', 300)];
    expect(previousAdditions(rows, { week: 6, day: 0 }).map((r) => r.name)).toEqual([
      'Hack Squat',
      'Leg Ext',
    ]);
  });

  it('ignore les ajouts du jour', () => {
    expect(previousAdditions([ajout(6, 'Mollets', 100)], { week: 6, day: 0 })).toEqual([]);
  });

  it('ne traverse pas les jours', () => {
    expect(previousAdditions([ajout(5, 'Mollets', 100)], { week: 6, day: 5 })).toEqual([]);
  });

  it('ignore les remplacements', () => {
    expect(previousAdditions([row()], { week: 6, day: 0 })).toEqual([]);
  });

  it('écrit la puce sous la forme demandée', () => {
    expect(additionChip(ajout(5, 'Hack Squat', 100))).toBe(
      'Ajouté la semaine dernière : Hack Squat, 3 × 8 × 40 kg',
    );
  });
});

describe('rien n’est automatique', () => {
  it('une séance sans ligne enregistrée est exactement celle du programme', () => {
    // La garantie centrale : un remplacement ou un ajout de la semaine passée
    // ne se réapplique pas tout seul. Il n'existe que dans une puce, avec un
    // bouton pour refaire le choix.
    const liste = [prevu(), prevu({ id: 'rdl', name: 'RDL' })];
    const passees = [row({ week: 5 }), row({ week: 5, kind: 'add', originalExerciseId: null })];
    const aujourdhui = passees.filter((r) => r.week === 6);
    const { exercises } = applyCustom(liste, aujourdhui, () => undefined);
    expect(exercises.map((e) => e.id)).toEqual(['back-squat', 'rdl']);
  });
});

describe('exerciseChoices', () => {
  const catalogue = [
    { id: 'back-squat', name: 'Back Squat' },
    { id: 'rdl', name: 'RDL barre' },
    { id: 'ab-wheel', name: 'Ab Wheel' },
  ];

  it('met les exercices déjà utilisés en tête, le plus récent d’abord', () => {
    const deja = [
      { exerciseId: 'hack-squat', name: 'Hack Squat', at: 100 },
      { exerciseId: freeId('Mollets debout'), name: 'Mollets debout', at: 200 },
    ];
    expect(exerciseChoices(catalogue, deja).map((c) => c.name)).toEqual([
      'Mollets debout',
      'Hack Squat',
      'Ab Wheel',
      'Back Squat',
      'RDL barre',
    ]);
  });

  it('range le catalogue par ordre alphabétique français', () => {
    expect(exerciseChoices(catalogue, []).map((c) => c.name)).toEqual([
      'Ab Wheel',
      'Back Squat',
      'RDL barre',
    ]);
  });

  it('ne liste jamais deux fois le même exercice', () => {
    const deja = [{ exerciseId: 'rdl', name: 'RDL barre', at: 100 }];
    const liste = exerciseChoices(catalogue, deja);
    expect(liste.filter((c) => c.exerciseId === 'rdl')).toHaveLength(1);
    expect(liste[0]!.name).toBe('RDL barre');
  });

  it('distingue un nom tapé d’un exercice du programme', () => {
    const deja = [
      { exerciseId: freeId('Mollets'), name: 'Mollets', at: 200 },
      { exerciseId: 'rdl', name: 'RDL barre', at: 100 },
    ];
    const liste = exerciseChoices(catalogue, deja);
    expect(liste[0]!.source).toBe('historique');
    expect(liste[1]!.source).toBe('programme');
  });
});

describe('matchChoices', () => {
  const liste = exerciseChoices(
    [
      { id: 'back-squat', name: 'Back Squat' },
      { id: 'front-squat', name: 'Front Squat' },
      { id: 'ab-wheel', name: 'Ab Wheel' },
    ],
    [],
  );

  it('rend tout sur une recherche vide', () => {
    expect(matchChoices(liste, '')).toHaveLength(3);
    expect(matchChoices(liste, '   ')).toHaveLength(3);
  });

  it('cherche sans tenir compte de la casse ni des accents', () => {
    expect(matchChoices(liste, 'SQUAT').map((c) => c.name)).toEqual(['Back Squat', 'Front Squat']);
    expect(matchChoices(liste, 'wheel').map((c) => c.name)).toEqual(['Ab Wheel']);
  });

  it('rend une liste vide plutôt que tout quand rien ne correspond', () => {
    expect(matchChoices(liste, 'curl biceps')).toEqual([]);
  });
});
