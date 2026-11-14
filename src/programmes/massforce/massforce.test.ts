/**
 * MASS FORCE, lot 4a — le .md est la source de vérité.
 *
 * Ces tests relisent `programme-mass-force.md` case par case, puis vérifient
 * ce que le module NE fait pas : aucune charge, aucun %, aucune semaine 2 à 4,
 * aucun champ RPE. Et le départ : choix du cycle + combiné au matériel choisi.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { programmeParId } from '../../data/catalogue';
import { COMBINE_MASS_FORCE } from '../../data/combineMass';
import type { ReferenceForceRow } from '../../db/db';
import { consigneRythme, groupSupersets } from '../../engine/superset';
import { EMPTY_CONTEXT } from '../../engine/types';
import { moduleParId } from '../registre';
import {
  choixParDefaut,
  erreurChoix,
  etatDepart,
  lignesAChoix,
  optionChoisie,
  testsRequis,
} from './depart';
import { FOURCHETTES_FORCE } from './charges';
import { MASS_FORCE } from './module';
import { SEANCES_FORCE } from './seances';

const MD = readFileSync(resolve(__dirname, '../../../programme-mass-force.md'), 'utf8');

/** Les lignes d'un tableau markdown qui suit un titre donné. */
function tableau(titre: string): string[][] {
  const debut = MD.indexOf(titre);
  expect(debut, titre).toBeGreaterThan(-1);
  const lignes = MD.slice(debut).split('\n');
  const out: string[][] = [];
  let dedans = false;
  for (const l of lignes) {
    if (l.startsWith('|')) {
      dedans = true;
      const cases = l
        .split('|')
        .slice(1, -1)
        .map((c) => c.trim());
      if (cases.every((c) => /^-+$/.test(c))) continue;
      out.push(cases);
    } else if (dedans) break;
  }
  return out.slice(1); // sans l'en-tête
}

const JOURS: Record<string, number> = { Lundi: 0, Mardi: 1, Jeudi: 3, Vendredi: 4 };
const toutes = SEANCES_FORCE.flatMap((s) => s.lignes.map((l) => ({ s, l })));

const ref = (exercice: string, variante: string): ReferenceForceRow => ({
  id: 1,
  exercice,
  variante,
  modalite: 'sous-maximal',
  chargeKg: 60,
  reps: 6,
  date: '2026-11-01',
  programmeId: 'mass-force',
  cycleId: 1,
  note: '',
  creeLe: 0,
});

describe('MASS FORCE — §1 semaine type, case par case', () => {
  const md = tableau('| Séance | Exercice |');

  it('dix-neuf lignes, dans l’ordre du .md', () => {
    expect(md).toHaveLength(19);
    expect(toutes).toHaveLength(19);
  });

  it('chaque case du .md est transcrite telle quelle', () => {
    md.forEach(([seance, exercice, materiel, test, s1], i) => {
      const { s, l } = toutes[i]!;
      const [jour, titre] = seance!.split(' — ');
      expect({ i, jour: s.jour, titre: s.titre }).toEqual({ i, jour: JOURS[jour!], titre });
      expect({ i, v: l.libelle }).toEqual({ i, v: exercice });
      expect({ i, v: l.materiel }).toEqual({ i, v: materiel });
      expect({ i, v: l.testLibelle }).toEqual({ i, v: test });

      const m =
        /^(\d+)×(\d+)(\/jambe)? · (À définir|Libre|([\d,]+)–([\d,]+) %( \(Smith\))?) · (\d+)s$/.exec(
          s1!,
        );
      expect(m, `${exercice} : ${s1}`).not.toBeNull();
      const [, series, reps, jambe, charge, pMin, pMax, smithSeul, repos] = m!;
      // §1 bis : la fourchette du .md, option par option — et rien d'autre.
      for (const o of l.options) {
        const vise =
          pMin !== undefined && (smithSeul === undefined || o.test?.variante === 'smith');
        expect({ o: o.id, f: FOURCHETTES_FORCE[o.id] }).toEqual({
          o: o.id,
          f: vise
            ? { min: Number(pMin.replace(',', '.')), max: Number(pMax!.replace(',', '.')) }
            : undefined,
        });
      }
      expect({ i, series: l.series, reps: l.reps, charge: l.charge, repos: l.reposSec }).toEqual({
        i,
        series: Number(series),
        reps: jambe ? `${reps} / jambe` : reps,
        charge: charge === 'Libre' ? 'libre' : 'a-definir',
        repos: Number(repos),
      });
    });
  });

  it('une ligne avec test a, pour chaque option, un test au matériel de l’option', () => {
    for (const { l } of toutes) {
      const avecTest = l.testLibelle !== 'Aucun';
      for (const o of l.options)
        expect({ o: o.id, test: o.test !== undefined }).toEqual({
          o: o.id,
          test: avecTest,
        });
    }
  });

  it('tirage vertical supination : exercice distinct, charge libre, sans combiné', () => {
    const sup = toutes.find(({ l }) => l.cle === 'mar-supination')!.l;
    expect(sup.charge).toBe('libre');
    expect(sup.options.every((o) => o.test === undefined)).toBe(true);
    const tirage = toutes.find(({ l }) => l.cle === 'mar-tirage')!.l;
    const ids = new Set(tirage.options.map((o) => o.id));
    expect(sup.options.some((o) => ids.has(o.id))).toBe(false);
  });

  it('chaque option est un exercice à part : aucun identifiant partagé', () => {
    const ids = toutes.flatMap(({ l }) => l.options.map((o) => o.id));
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('MASS FORCE — §3 consignes et vigilance', () => {
  const md = tableau('| Exercice | Consignes techniques | Vigilance |');

  it('chaque ligne de séance porte la consigne et la vigilance de son exercice', () => {
    const parCle = new Map(md.map(([e, c, v]) => [e!, { c: c!, v: v! }]));
    for (const { l } of toutes) {
      const attendu = parCle.get(l.consigneCle);
      expect(attendu, l.consigneCle).toBeDefined();
      expect({ cle: l.cle, c: l.consigne, v: l.vigilance }).toEqual({
        cle: l.cle,
        c: attendu!.c,
        v: attendu!.v,
      });
    }
  });

  it('aucune ligne du tableau n’est orpheline', () => {
    const utilisees = new Set(toutes.map(({ l }) => l.consigneCle));
    expect(md.map(([e]) => e).filter((e) => !utilisees.has(e!))).toEqual([]);
  });
});

describe('MASS FORCE — le module ne prescrit rien de non validé', () => {
  it('est enregistré, et reste « à venir » au catalogue (pas de bouton Commencer)', () => {
    expect(moduleParId('mass-force')).toBe(MASS_FORCE);
    // Ouvert à la demande de Guillaume ; le résumé dit que seule la S1 existe.
    expect(programmeParId('mass-force')?.statut).toBe('disponible');
    expect(programmeParId('mass-force')?.resume).toMatch(/seule la semaine 1 est écrite/);
  });

  it('quatre semaines, prescription identique (§1 ter) : seule la charge évolue', () => {
    expect(MASS_FORCE.semaines).toEqual([1, 2, 3, 4]);
    const forme = (w: number, d: 0 | 1 | 3 | 4) =>
      MASS_FORCE.getSession(w, d, EMPTY_CONTEXT)!.exercises.map((e) => [
        e.id,
        e.sets,
        e.loadLine,
        e.restSec,
        e.def.intent,
        e.def.vigilance,
      ]);
    for (const d of [0, 1, 3, 4] as const) {
      for (const w of [2, 3, 4]) expect(forme(w, d), `S${w} j${d}`).toEqual(forme(1, d));
    }
    for (const w of [0, 5]) {
      expect(MASS_FORCE.joursDeLaSemaine(w)).toEqual([]);
      expect(MASS_FORCE.getSession(w, 0, EMPTY_CONTEXT)).toBeNull();
    }
    expect(MASS_FORCE.getSession(1, 2, EMPTY_CONTEXT)).toBeNull();
  });

  it('aucune charge, aucun RPE à saisir, aucun pourcentage', () => {
    for (const d of [0, 1, 3, 4] as const) {
      const s = MASS_FORCE.getSession(1, d, EMPTY_CONTEXT)!;
      for (const e of s.exercises) {
        expect({ id: e.id, kg: e.load.kg, plan: e.planKg, rpe: e.targetRPE }).toEqual({
          id: e.id,
          kg: null,
          plan: null,
          rpe: null,
        });
        const texte = [e.loadLine, ...e.notes, e.def.intent ?? ''].join(' ');
        expect(texte, e.id).not.toMatch(/\d\s*%|%\s*1RM \d/);
        expect(texte, e.id).not.toMatch(/\bkg\b/);
      }
    }
  });

  it('sans référence, les mouvements évalués disent quoi faire — jamais une charge', () => {
    const charges = [0, 1, 3, 4].flatMap((d) =>
      MASS_FORCE.getSession(1, d as 0, EMPTY_CONTEXT)!
        .exercises.filter((e) => e.chargeCible !== undefined)
        .map((e) => [e.id, e.chargeCible!.kind]),
    );
    expect(charges).toEqual([
      ['mf-developpe-couche-barre', 'a-completer'],
      ['mf-tirage-vertical-poulie', 'a-completer'],
      ['mf-squat-barre', 'a-determiner'],
      ['mf-push-press-smith', 'a-determiner'],
    ]);
  });

  it('la vigilance arrive sur l’exercice, pour l’écran', () => {
    const lundi = MASS_FORCE.getSession(1, 0, EMPTY_CONTEXT)!;
    expect(lundi.exercises[0]!.def.vigilance).toBe(
      'Ne pas transférer les charges entre barre et Smith. Prévoir des sécurités adaptées.',
    );
    expect(lundi.exercises.every((e) => (e.def.vigilance ?? '').length > 0)).toBe(true);
  });

  it('suit le choix du cycle, et la première option par défaut', () => {
    const smith = MASS_FORCE.getSession(1, 0, {
      ...EMPTY_CONTEXT,
      choixCycle: { 'lun-developpe': 'mf-developpe-couche-smith' },
    })!;
    expect(smith.exercises[0]!.id).toBe('mf-developpe-couche-smith');
    expect(MASS_FORCE.getSession(1, 0, EMPTY_CONTEXT)!.exercises[0]!.id).toBe(
      'mf-developpe-couche-barre',
    );
  });

  it('fentes : 12 par jambe, lu comme tel', () => {
    const jeudi = MASS_FORCE.getSession(1, 3, EMPTY_CONTEXT)!;
    const fentes = jeudi.exercises.find((e) => e.id.startsWith('mf-fentes'))!;
    expect(fentes.loadLine).toBe('3 × 12 / jambe');
    expect(fentes.work).toMatchObject({ kind: 'reps', reps: 12, perSide: true });
  });
});

describe('MASS FORCE — §2 le superset biceps', () => {
  it('curl barre W → 15 s de transition → curl haltères → 120 s, quatre tours', () => {
    const mardi = MASS_FORCE.getSession(1, 1, EMPTY_CONTEXT)!;
    const circuits = groupSupersets(mardi.exercises).filter((b) => b.kind === 'circuit');
    expect(circuits).toHaveLength(1);
    const c = circuits[0]!;
    if (c.kind !== 'circuit') throw new Error('circuit attendu');
    expect(c.exs.map((e) => e.name)).toEqual(['Curl barre W', 'Curl haltères']);
    expect(c.rythme).toBe('transition');
    expect(c.tours).toBe(4);
    expect(c.restSec).toBe(120);
    expect(consigneRythme(c)).toBe(
      'Transition de 15 s entre les mouvements, puis repos 2 min après le duo.',
    );
  });
});

describe('MASS FORCE — le départ', () => {
  const tous = (variante: (exercice: string) => string) =>
    COMBINE_MASS_FORCE.map((t) => ref(t.exercice, variante(t.exercice)));

  it('sans choix confirmés, rien ne s’ouvre — même avec un combiné complet', () => {
    const e = etatDepart(
      undefined,
      tous((x) => (x === 'tirage-vertical' ? 'poulie' : 'barre')),
    );
    expect(e.choixFaits).toBe(false);
    expect(e.pret).toBe(false);
  });

  it('choix faits, combiné vide : les quatre tests manquent', () => {
    const e = etatDepart(choixParDefaut(), []);
    expect(e.manquants.map((t) => t.nom)).toEqual([
      'Développé couché',
      'Tirage vertical',
      'Squat',
      'Push press',
    ]);
    expect(e.pret).toBe(false);
  });

  it('une référence à la barre ne débloque pas un cycle à la Smith', () => {
    const choix = { ...choixParDefaut(), 'lun-developpe': 'mf-developpe-couche-smith' };
    const refs = [
      ref('developpe-couche', 'barre'),
      ref('tirage-vertical', 'poulie'),
      ref('squat', 'barre'),
      ref('push-press', 'smith'),
    ];
    const e = etatDepart(choix, refs);
    expect(e.manquants).toEqual([
      { exercice: 'developpe-couche', variante: 'smith', nom: 'Développé couché' },
    ]);
    expect(etatDepart(choix, [...refs, ref('developpe-couche', 'smith')]).pret).toBe(true);
  });

  it('le tirage supination n’ajoute aucun test', () => {
    const exercices = testsRequis(choixParDefaut()).map((t) => t.exercice);
    expect(exercices).toEqual(['developpe-couche', 'tirage-vertical', 'squat', 'push-press']);
  });

  it('refuse un choix incomplet, inconnu ou hors des lignes', () => {
    expect(erreurChoix(choixParDefaut())).toBeNull();
    const { ['jeu-fentes']: _, ...incomplet } = choixParDefaut();
    expect(erreurChoix(incomplet)).toMatch(/manquant/);
    expect(erreurChoix({ ...choixParDefaut(), 'jeu-squat': 'mf-squat-halteres' })).toMatch(
      /inconnu/,
    );
    expect(erreurChoix({ ...choixParDefaut(), 'lun-ecarte': 'x' })).toMatch(/Ligne inconnue/);
  });

  it('un choix inconnu retombe sur la première option, jamais sur rien', () => {
    const l = lignesAChoix()[0]!;
    expect(optionChoisie(l, { [l.cle]: 'n-importe-quoi' }).id).toBe(l.options[0]!.id);
  });
});

describe('MASS FORCE — combiné aligné sur le programme', () => {
  it('développé couché : barre ou Smith, plus d’haltères', () => {
    const bench = COMBINE_MASS_FORCE.find((t) => t.exercice === 'developpe-couche')!;
    expect([...bench.variantes]).toEqual(['barre', 'smith']);
  });

  it('chaque matériel proposé au programme est testable au combiné, et inversement', () => {
    for (const t of COMBINE_MASS_FORCE) {
      const auProgramme = toutes
        .flatMap(({ l }) => l.options)
        .filter((o) => o.test?.exercice === t.exercice)
        .map((o) => o.test!.variante);
      expect({ test: t.exercice, v: [...auProgramme].sort() }).toEqual({
        test: t.exercice,
        v: [...t.variantes].sort(),
      });
    }
  });
});

describe('MASS FORCE — §1 ter, mode de progression ligne par ligne', () => {
  const md = tableau('| Exercice | Progression |');
  const MODE: Record<string, string> = {
    Plage: 'plage',
    Fixe: 'fixe',
    'Push press': 'push-press',
  };

  it('chaque ligne sans fourchette porte le mode écrit dans le .md', () => {
    const sansPct = toutes.filter(({ l }) => l.progression !== 'pourcentage');
    expect(md.map(([e]) => e)).toEqual(sansPct.map(({ l }) => l.libelle));
    md.forEach(([, mode], i) => {
      expect({ l: sansPct[i]!.l.cle, m: sansPct[i]!.l.progression }).toEqual({
        l: sansPct[i]!.l.cle,
        m: MODE[mode!],
      });
    });
  });

  it('les trois mouvements à fourchette sont en pourcentage, et eux seuls', () => {
    expect(toutes.filter(({ l }) => l.progression === 'pourcentage').map(({ l }) => l.cle)).toEqual(
      ['lun-developpe', 'mar-tirage', 'jeu-squat'],
    );
  });
});
