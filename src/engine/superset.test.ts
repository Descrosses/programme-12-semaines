import { describe, expect, it } from 'vitest';
import {
  avancement,
  consigneRythme,
  groupSupersets,
  rythmeDe,
  titreRythme,
  tourActif,
  travailCourt,
  type Paire,
} from './superset';
import { reps, type DayIndex, type Work, type WeekIndex } from '../data/types';
import { getSession, type ResolvedExercise } from './getSession';
import { EMPTY_CONTEXT, type SessionContext } from './types';
import { WEEK_DAYS } from '../data/program';

const ex = (
  id: string,
  over: Partial<ResolvedExercise> & { sets?: number; restSec?: number; work?: Work } = {},
): ResolvedExercise => ({
  def: { id, name: id, fn: 'core', role: 'core' },
  id,
  name: id,
  sets: 3,
  work: reps(8),
  load: { kg: null, shape: 'bodyweight', step: 2.5, source: 'aucune' },
  targetRPE: null,
  restSec: 45,
  loadLine: '',
  notes: [],
  planKg: null,
  lastKg: null,
  lastMeasure: null,
  suggestion: null,
  adjustments: [],
  ...over,
});

describe('rythmeDe — lu dans les repos, pas dans un champ de plus', () => {
  it('premier créneau sans repos : on enchaîne', () => {
    expect(rythmeDe(ex('a', { restSec: 0 }), ex('b', { restSec: 90 }))).toBe('enchaine');
  });

  it('deux repos non nuls : on alterne', () => {
    expect(rythmeDe(ex('a', { restSec: 45 }), ex('b', { restSec: 45 }))).toBe('alterne');
  });

  it('deux repos à zéro : on alterne plutôt que d’inventer un enchaînement', () => {
    // Le cas ne devrait pas exister, mais s'il arrive, prescrire « sans repos »
    // sur un duo qui n'en demande pas serait pire que de ne rien promettre.
    expect(rythmeDe(ex('a', { restSec: 0 }), ex('b', { restSec: 0 }))).toBe('alterne');
  });
});

describe('groupSupersets', () => {
  it('réunit deux exercices consécutifs qui partagent un identifiant', () => {
    const liste = [
      ex('back-squat', { superset: undefined }),
      ex('ab-wheel', { superset: 'tronc' }),
      ex('roman-side-bench', { superset: 'tronc' }),
    ];
    const blocs = groupSupersets(liste);
    expect(blocs).toHaveLength(2);
    expect(blocs[0]).toEqual({ kind: 'solo', ex: liste[0] });
    expect(blocs[1]!.kind).toBe('paire');
    const paire = blocs[1] as Paire;
    expect(paire.a.id).toBe('ab-wheel');
    expect(paire.b.id).toBe('roman-side-bench');
    expect(paire.id).toBe('tronc');
  });

  it('ne consomme pas le voisin deux fois', () => {
    const blocs = groupSupersets([
      ex('a', { superset: 'x' }),
      ex('b', { superset: 'x' }),
      ex('c', { superset: 'y' }),
      ex('d', { superset: 'y' }),
    ]);
    expect(blocs).toHaveLength(2);
    expect(blocs.every((b) => b.kind === 'paire')).toBe(true);
  });

  it('ne réunit PAS deux exercices séparés par un troisième', () => {
    // L'ordre d'une séance n'est pas décoratif : les réunir reviendrait à
    // déplacer celui du milieu sans le dire.
    const blocs = groupSupersets([
      ex('a', { superset: 'x' }),
      ex('milieu'),
      ex('b', { superset: 'x' }),
    ]);
    expect(blocs.map((b) => b.kind)).toEqual(['solo', 'solo', 'solo']);
  });

  it('laisse seul un identifiant esseulé — l’autre moitié a pu être retirée', () => {
    const blocs = groupSupersets([ex('ab-wheel', { superset: 'tronc' })]);
    expect(blocs).toEqual([{ kind: 'solo', ex: expect.objectContaining({ id: 'ab-wheel' }) }]);
  });

  it('ne réunit pas deux identifiants différents côte à côte', () => {
    const blocs = groupSupersets([ex('a', { superset: 'x' }), ex('b', { superset: 'y' })]);
    expect(blocs.map((b) => b.kind)).toEqual(['solo', 'solo']);
  });

  it('laisse une séance sans superset exactement telle quelle', () => {
    const liste = [ex('a'), ex('b'), ex('c')];
    expect(groupSupersets(liste)).toEqual(liste.map((e) => ({ kind: 'solo', ex: e })));
  });

  it('compte les tours sur le mouvement qui en a le plus', () => {
    const blocs = groupSupersets([
      ex('a', { superset: 'x', sets: 3 }),
      ex('b', { superset: 'x', sets: 2 }),
    ]);
    expect((blocs[0] as Paire).tours).toBe(3);
  });

  it('retient le repos qui compte selon le rythme', () => {
    const enchaine = groupSupersets([
      ex('a', { superset: 'x', restSec: 0 }),
      ex('b', { superset: 'x', restSec: 90 }),
    ])[0] as Paire;
    // Enchaîné : le repos est celui qui SUIT le duo, donc celui du second.
    expect(enchaine.restSec).toBe(90);

    const alterne = groupSupersets([
      ex('a', { superset: 'x', restSec: 45 }),
      ex('b', { superset: 'x', restSec: 45 }),
    ])[0] as Paire;
    expect(alterne.restSec).toBe(45);
  });
});

describe('les mots de l’encadré', () => {
  const paire = (rythme: 'enchaine' | 'alterne', restSec: number): Paire =>
    groupSupersets([
      ex('a', { superset: 'x', restSec: rythme === 'enchaine' ? 0 : restSec }),
      ex('b', { superset: 'x', restSec: restSec }),
    ])[0] as Paire;

  it('nomme le bloc d’après son rythme', () => {
    expect(titreRythme('enchaine')).toBe('Superset');
    expect(titreRythme('alterne')).toBe('Alternance');
  });

  it('dit le repos au bon endroit', () => {
    expect(consigneRythme(paire('enchaine', 90))).toBe(
      'Les deux enchaînés, sans repos. Repos 1 min 30 après le duo.',
    );
    expect(consigneRythme(paire('alterne', 45))).toBe(
      'Une série de chaque, 45 s entre les stations.',
    );
  });
});

describe('tourActif', () => {
  it('ouvre le premier tour non fait', () => {
    expect(tourActif(3, (i) => i < 2)).toBe(2);
    expect(tourActif(3, () => false)).toBe(0);
  });

  it('rend le total quand tout est fait — plus rien à ouvrir', () => {
    expect(tourActif(3, () => true)).toBe(3);
  });
});

describe('avancement', () => {
  const paire = groupSupersets([
    ex('a', { superset: 'x', sets: 3 }),
    ex('b', { superset: 'x', sets: 3 }),
  ])[0] as Paire;

  it('compte les séries, pas les tours', () => {
    // Un tour à moitié fait est un travail réel : l'afficher comme nul
    // découragerait sans raison.
    expect(avancement(paire, (e) => (e.id === 'a' ? 2 : 1))).toEqual({ faites: 3, total: 6 });
  });

  it('ne dépasse jamais le prévu, même si une série de plus a été saisie', () => {
    expect(avancement(paire, () => 5)).toEqual({ faites: 6, total: 6 });
  });

  it('part de zéro', () => {
    expect(avancement(paire, () => 0)).toEqual({ faites: 0, total: 6 });
  });
});

// ---------------------------------------------------------------------------

describe('la paire du lundi, dans le vrai programme', () => {
  const ctx: SessionContext = {
    ...EMPTY_CONTEXT,
    settings: {
      startDate: '2026-08-24',
      broadJumpBaselineCm: 232,
      tableauOrigine: false,
      oneRM: { 'back-squat': 140, 'bench-press': 115, deadlift: 180, 'weighted-pullup': 45 },
    },
  };
  const seance = (w: number, d: number) =>
    getSession(w as WeekIndex, d as DayIndex, ctx)!.exercises;
  const paires = (w: number, d: number) =>
    groupSupersets(seance(w, d)).filter((b): b is Paire => b.kind === 'paire');

  it('réunit l’Ab Wheel et le Roman Side Bench le lundi, en force max et en puissance', () => {
    for (const w of [5, 6, 7, 9, 10, 11]) {
      const p = paires(w, 0);
      expect(p, `S${w}`).toHaveLength(1);
      expect([p[0]!.a.id, p[0]!.b.id], `S${w}`).toEqual(['ab-wheel', 'roman-side-bench']);
    }
  });

  it('et c’est une ALTERNANCE, pas un enchaînement — 45 s entre les stations', () => {
    /*
     * La nuance n'est pas cosmétique : le programme écrit « une série de
     * chaque, 45 s entre les stations ». Afficher « enchaîne, sans repos »
     * prescrirait un rythme que le programme ne demande pas, et sur deux
     * mouvements de tronc ça change la séance.
     */
    const p = paires(5, 0)[0]!;
    expect(p.rythme).toBe('alterne');
    expect(p.restSec).toBe(45);
    expect(consigneRythme(p)).toBe('Une série de chaque, 45 s entre les stations.');
    expect(p.tours).toBe(3);
  });

  it('les deux gardent leur volume : 3 séries chacun', () => {
    const p = paires(6, 0)[0]!;
    expect(p.a.sets).toBe(3);
    expect(p.b.sets).toBe(3);
    expect(avancement(p, () => 0).total).toBe(6);
  });

  it('aucune paire le samedi — le Roman Side Bench y ferme la séance tout seul', () => {
    for (const w of [5, 6, 7, 9, 10, 11]) {
      expect(paires(w, 5), `S${w}`).toHaveLength(0);
      expect(
        seance(w, 5).map((e) => e.id),
        `S${w}`,
      ).toContain('roman-side-bench');
    }
  });

  it('aucune paire dans les semaines qui n’ont pas l’alternance', () => {
    // Semaines 1 à 4 : le Roman Side Bench n'existe pas encore.
    // Semaine 8 : deload, et le programme n'y écrit aucune alternance.
    for (const w of [1, 2, 3, 4, 8]) {
      expect(paires(w, 0), `S${w}`).toHaveLength(0);
    }
  });

  it('aucun autre jour du programme ne forme de paire', () => {
    for (let w = 0; w <= 12; w++) {
      for (const d of WEEK_DAYS[w as WeekIndex]) {
        if (d === 0) continue;
        expect(paires(w, d), `S${w} j${d}`).toHaveLength(0);
      }
    }
  });

  it('le marqueur ne survit pas à la disparition d’une moitié', () => {
    /*
     * Si l'Ab Wheel sortait un jour de la séance, le Roman Side Bench ne doit
     * pas rester seul dans un encadré « alternance » qui ne décrit plus rien.
     */
    const sansAbWheel = seance(5, 0).filter((e) => e.id !== 'ab-wheel');
    const blocs = groupSupersets(sansAbWheel);
    expect(blocs.every((b) => b.kind === 'solo')).toBe(true);
    expect(blocs.map((b) => (b.kind === 'solo' ? b.ex.id : ''))).toContain('roman-side-bench');
  });
});

describe('travailCourt', () => {
  it('donne le travail d’UNE série, sans le nombre de séries', () => {
    expect(travailCourt(reps(8))).toBe('8');
    expect(travailCourt(reps(8, true))).toBe('8 / côté');
    expect(travailCourt(reps({ min: 6, max: 8 }))).toBe('6-8');
  });

  it('évite le « 3 tours · 3 × 8 et 3 × 8 » où le même 3 s’écrit trois fois', () => {
    const p = groupSupersets([
      ex('a', { superset: 'x', sets: 3, work: reps(8) }),
      ex('b', { superset: 'x', sets: 3, work: reps(8, true) }),
    ])[0] as Paire;
    const ligne = `${p.tours} tours · ${travailCourt(p.a.work)} et ${travailCourt(p.b.work)}`;
    expect(ligne).toBe('3 tours · 8 et 8 / côté');
  });
});
