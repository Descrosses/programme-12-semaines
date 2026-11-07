import { describe, expect, it } from 'vitest';
import {
  avancement,
  consigneRythme,
  groupSupersets,
  rythmeDe,
  titreRythme,
  lettreStation,
  tourActif,
  travailCourt,
  type Circuit,
} from './superset';
import { reps, type DayIndex, type Work, type WeekIndex } from '../data/types';
import { getSession, type ResolvedExercise } from './getSession';
import { EMPTY_CONTEXT, type SessionContext } from './types';
import { joursDeLaSemaine } from '../data/program';

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
    expect(rythmeDe([ex('a', { restSec: 0 }), ex('b', { restSec: 90 })])).toBe('enchaine');
  });

  it('deux repos non nuls : on alterne', () => {
    expect(rythmeDe([ex('a', { restSec: 45 }), ex('b', { restSec: 45 })])).toBe('alterne');
  });

  it('deux repos à zéro : on alterne plutôt que d’inventer un enchaînement', () => {
    // Le cas ne devrait pas exister, mais s'il arrive, prescrire « sans repos »
    // sur un duo qui n'en demande pas serait pire que de ne rien promettre.
    expect(rythmeDe([ex('a', { restSec: 0 }), ex('b', { restSec: 0 })])).toBe('alterne');
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
    expect(blocs[1]!.kind).toBe('circuit');
    const circuit = blocs[1] as Circuit;
    expect(circuit.exs.map((e) => e.id)).toEqual(['ab-wheel', 'roman-side-bench']);
    expect(circuit.id).toBe('tronc');
  });

  it('ne consomme pas le voisin deux fois', () => {
    const blocs = groupSupersets([
      ex('a', { superset: 'x' }),
      ex('b', { superset: 'x' }),
      ex('c', { superset: 'y' }),
      ex('d', { superset: 'y' }),
    ]);
    expect(blocs).toHaveLength(2);
    expect(blocs.every((b) => b.kind === 'circuit')).toBe(true);
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
    expect((blocs[0] as Circuit).tours).toBe(3);
  });

  it('retient le repos qui compte selon le rythme', () => {
    const enchaine = groupSupersets([
      ex('a', { superset: 'x', restSec: 0 }),
      ex('b', { superset: 'x', restSec: 90 }),
    ])[0] as Circuit;
    // Enchaîné : le repos est celui qui SUIT le duo, donc celui du second.
    expect(enchaine.restSec).toBe(90);

    const alterne = groupSupersets([
      ex('a', { superset: 'x', restSec: 45 }),
      ex('b', { superset: 'x', restSec: 45 }),
    ])[0] as Circuit;
    expect(alterne.restSec).toBe(45);
  });
});

describe('les mots de l’encadré', () => {
  const paire = (rythme: 'enchaine' | 'alterne', restSec: number): Circuit =>
    groupSupersets([
      ex('a', { superset: 'x', restSec: rythme === 'enchaine' ? 0 : restSec }),
      ex('b', { superset: 'x', restSec: restSec }),
    ])[0] as Circuit;

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
  ])[0] as Circuit;

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
    groupSupersets(seance(w, d)).filter((b): b is Circuit => b.kind === 'circuit');

  it('réunit l’Ab Wheel et le Roman Side Bench le lundi, en force max et en puissance', () => {
    for (const w of [5, 6, 7, 9, 10, 11]) {
      const p = paires(w, 0);
      expect(p, `S${w}`).toHaveLength(1);
      expect(
        p[0]!.exs.map((e) => e.id),
        `S${w}`,
      ).toEqual(['ab-wheel', 'roman-side-bench']);
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
    expect(p.exs[0]!.sets).toBe(3);
    expect(p.exs[1]!.sets).toBe(3);
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

  it('aucune paire avant la semaine 5 — le Roman Side Bench n’existe pas encore', () => {
    for (const w of [1, 2, 3, 4]) {
      expect(paires(w, 0), `S${w}`).toHaveLength(0);
    }
  });

  it('la semaine 8 garde l’alternance, en version deload', () => {
    /*
     * Ce test affirmait l'inverse, et il avait tort : « le programme n'y
     * écrit aucune alternance ». §7 écrit « à partir de la semaine 5, il
     * s'enchaîne en alternance avec le Roman Side Bench », sans exclure la
     * huitième ; et le tableau de deload du §8 donne une valeur aux DEUX
     * mouvements, côte à côte.
     *
     * Ce que l'écran montrait : deux cartes séparées, sous un texte qui
     * promettait une alternance. La règle de deload insérait le Roman Side
     * Bench sans identifiant de paire.
     */
    const paire = paires(8, 0);
    expect(paire, 'la semaine 8 a perdu son alternance').toHaveLength(1);
    expect(paire[0]!.exs[0]!.id).toBe('ab-wheel');
    expect(paire[0]!.exs[1]!.id).toBe('roman-side-bench');
    // À volume égal, sinon « une série de chaque » n'a plus de sens.
    expect(paire[0]!.exs[0]!.sets).toBe(paire[0]!.exs[1]!.sets);
    expect(paire[0]!.tours).toBe(2);
  });

  it('le texte ne promet jamais une alternance qui n’existe pas', () => {
    /*
     * L'autre moitié du même défaut : la note « en alternance avec l'Ab
     * Wheel » était écrite d'avance, y compris le samedi — où l'Ab Wheel
     * n'est pas dans la séance. Six samedis sur douze annonçaient une
     * alternance avec un mouvement absent.
     */
    for (let w = 1; w <= 12; w++) {
      for (const d of joursDeLaSemaine(w)) {
        const ex = seance(w, d).find((e) => e.id === 'roman-side-bench');
        if (!ex) continue;
        const promet = ex.notes.some((n) => /alternance avec l’Ab Wheel/.test(n));
        const alterne = paires(w, d).some((p) => p.exs[1]!.id === 'roman-side-bench');
        expect(promet, `S${w} j${d} — le texte et l’écran ne disent pas la même chose`).toBe(
          alterne,
        );
      }
    }
  });

  it('aucun autre jour du programme ne forme de paire', () => {
    for (let w = 0; w <= 12; w++) {
      for (const d of joursDeLaSemaine(w)) {
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
    ])[0] as Circuit;
    const ligne = `${p.tours} tours · ${p.exs.map((e) => travailCourt(e.work)).join(' · ')}`;
    expect(ligne).toBe('3 tours · 8 · 8 / côté');
  });
});

/*
 * LE CIRCUIT DE TROIS — le cas que la paire ne savait pas dire.
 *
 * Trois exercices enchaînés, la séquence répétée deux fois : c'est la forme
 * la plus courante du renforcement en circuit, et c'est ce que portent les
 * programmes qu'on importera. POWER 12 et MASS 4 n'en ont aucun ; ces tests
 * sont donc le seul endroit où cette forme existe aujourd'hui, et le seul
 * filet si quelqu'un la casse en revenant à deux stations.
 */
describe('un circuit de trois stations et plus', () => {
  it('réunit trois exercices consécutifs qui partagent un identifiant', () => {
    const blocs = groupSupersets([
      ex('bridge', { superset: 'circuit-1', restSec: 0 }),
      ex('ab-bikes', { superset: 'circuit-1', restSec: 0 }),
      ex('planche', { superset: 'circuit-1', restSec: 120 }),
    ]);
    expect(blocs).toHaveLength(1);
    const c = blocs[0] as Circuit;
    expect(c.exs.map((e) => e.id)).toEqual(['bridge', 'ab-bikes', 'planche']);
    expect(c.rythme).toBe('enchaine');
    // Enchaîné : le repos est celui qui SUIT le circuit, donc celui de la dernière.
    expect(c.restSec).toBe(120);
  });

  it('nomme « Circuit » au-delà de deux, « Superset » à deux', () => {
    expect(titreRythme('enchaine', 2)).toBe('Superset');
    expect(titreRythme('enchaine', 3)).toBe('Circuit');
    expect(titreRythme('alterne', 3)).toBe('Alternance');
  });

  it('écrit la consigne avec le bon nombre et le bon mot', () => {
    const trois = groupSupersets([
      ex('a', { superset: 'x', restSec: 0 }),
      ex('b', { superset: 'x', restSec: 0 }),
      ex('c', { superset: 'x', restSec: 90 }),
    ])[0] as Circuit;
    expect(consigneRythme(trois)).toBe(
      'Les trois enchaînés, sans repos. Repos 1 min 30 après le circuit.',
    );

    const deux = groupSupersets([
      ex('a', { superset: 'y', restSec: 0 }),
      ex('b', { superset: 'y', restSec: 90 }),
    ])[0] as Circuit;
    expect(consigneRythme(deux)).toBe(
      'Les deux enchaînés, sans repos. Repos 1 min 30 après le duo.',
    );
  });

  it('un repos entre chaque station reste une alternance, à trois comme à deux', () => {
    // Le cas du circuit minuté : 20 s de récupération entre chaque exercice.
    const c = groupSupersets([
      ex('a', { superset: 'x', restSec: 20 }),
      ex('b', { superset: 'x', restSec: 20 }),
      ex('c', { superset: 'x', restSec: 20 }),
    ])[0] as Circuit;
    expect(c.rythme).toBe('alterne');
    expect(c.restSec).toBe(20);
    expect(consigneRythme(c)).toBe('Une série de chaque, 20 s entre les stations.');
  });

  it('compte l’avancement sur toutes les stations, pas sur deux', () => {
    const c = groupSupersets([
      ex('a', { superset: 'x', sets: 2 }),
      ex('b', { superset: 'x', sets: 2 }),
      ex('c', { superset: 'x', sets: 2 }),
    ])[0] as Circuit;
    expect(c.tours).toBe(2);
    expect(avancement(c, () => 0)).toEqual({ faites: 0, total: 6 });
    expect(avancement(c, () => 2)).toEqual({ faites: 6, total: 6 });
  });

  it('donne à chaque station sa lettre, A, B, C…', () => {
    expect([0, 1, 2, 3].map(lettreStation)).toEqual(['A', 'B', 'C', 'D']);
    // Au-delà de Z, le rang en chiffres plutôt qu'un caractère au hasard.
    expect(lettreStation(26)).toBe('27');
  });

  it('coupe le circuit dès qu’un exercice porte un autre identifiant', () => {
    const blocs = groupSupersets([
      ex('a', { superset: 'x' }),
      ex('b', { superset: 'x' }),
      ex('c', { superset: 'y' }),
      ex('d', { superset: 'y' }),
      ex('e', { superset: 'y' }),
    ]);
    expect(blocs).toHaveLength(2);
    expect((blocs[0] as Circuit).exs).toHaveLength(2);
    expect((blocs[1] as Circuit).exs).toHaveLength(3);
  });
});

/*
 * LE BLOC MINUTÉ.
 *
 * Aucun programme écrit en code n'en pose : POWER 12 et MASS 4 ne minutent
 * pas leurs blocs, et `minutesBloc` y vaut toujours `null`. Ces tests sont
 * donc le seul endroit où cette forme existe, et le seul filet si quelqu'un
 * la débranche en croyant qu'elle ne sert à rien.
 */
describe('la minuterie du bloc', () => {
  it('vaut null quand le programme n’impose aucun temps', () => {
    const c = groupSupersets([
      ex('a', { superset: 'x' }),
      ex('b', { superset: 'x' }),
    ])[0] as Circuit;
    expect(c.minutesBloc).toBeNull();
  });

  it('se lit sur la première station qui en déclare une', () => {
    const c = groupSupersets([
      ex('a', { superset: 'x', blocMinutes: 10 }),
      ex('b', { superset: 'x' }),
      ex('c', { superset: 'x' }),
    ])[0] as Circuit;
    expect(c.minutesBloc).toBe(10);
  });

  it('la trouve même posée sur une station qui n’est pas la première', () => {
    // Un programme peut l'écrire au milieu : on ne la rate pas pour autant.
    const c = groupSupersets([
      ex('a', { superset: 'x' }),
      ex('b', { superset: 'x', blocMinutes: 8 }),
    ])[0] as Circuit;
    expect(c.minutesBloc).toBe(8);
  });

  it('deux stations qui se contredisent : la première gagne', () => {
    // Deux vérités valent moins qu'une seule, même imparfaite. La feuille
    // pose la consigne en tête de bloc, c'est elle qu'on lit.
    const c = groupSupersets([
      ex('a', { superset: 'x', blocMinutes: 10 }),
      ex('b', { superset: 'x', blocMinutes: 4 }),
    ])[0] as Circuit;
    expect(c.minutesBloc).toBe(10);
  });

  it('un exercice seul ne fabrique pas de bloc minuté', () => {
    const blocs = groupSupersets([ex('a', { blocMinutes: 10 })]);
    expect(blocs[0]!.kind).toBe('solo');
  });
});

/*
 * Le garde-fou qui compte pour les deux programmes existants : aucun de leurs
 * blocs n'est minuté. Le jour où l'un le devient, c'est une décision, pas un
 * effet de bord — et ce test oblige à l'assumer.
 */
describe('POWER 12 et MASS 4 ne minutent aucun bloc', () => {
  it('ne pose minutesBloc nulle part dans les douze semaines', () => {
    for (let w = 1; w <= 12; w++) {
      for (let d = 0; d < 7; d++) {
        const s = getSession(w as WeekIndex, d as DayIndex, EMPTY_CONTEXT as SessionContext);
        if (s === null) continue;
        for (const bloc of groupSupersets(s.exercises)) {
          if (bloc.kind === 'circuit') expect(bloc.minutesBloc, `S${w}J${d}`).toBeNull();
        }
      }
    }
  });
});
