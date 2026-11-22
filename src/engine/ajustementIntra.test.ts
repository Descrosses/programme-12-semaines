/**
 * §11 cas 10 — l'ajustement après la 1re série (décision de Guillaume,
 * 22 novembre).
 *
 * Ce que ces tests figent :
 * - la règle, chiffre par chiffre (seuils, incréments, arrondis, plafond) ;
 * - le .md et le code disent la même chose (le .md est la source de vérité) ;
 * - qui y a droit : POWER, semaines de travail, readiness verte, exercices
 *   chargés à RPE cible. Ni deload, ni combine, ni affûtage, ni MASS.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { PROGRESSION_RULES } from '../data/program';
import { rpe, type RPETarget } from '../data/types';
import { moduleParId } from '../programmes/registre';
import { propositionApresPremiereSerie, type ParametresIntra } from './ajustementIntra';
import { EMPTY_CONTEXT, type ReadinessResult, type SessionContext } from './types';

const BAS: ParametresIntra = { isLowerBody: true, step: 2.5 };
const HAUT: ParametresIntra = { isLowerBody: false, step: 2.5 };
const r78: RPETarget = { min: 7, max: 8, label: 'RPE 7-8' };
const p = (
  params: ParametresIntra,
  cible: RPETarget | null,
  kg: number | null,
  r: number | null,
  failed = false,
) => propositionApresPremiereSerie(params, cible, { kg, rpe: r, failed });

describe('la règle', () => {
  it('beaucoup trop facile (≥ 1,5 point sous la cible) : +5 kg bas, +2,5 kg haut', () => {
    expect(p(BAS, rpe(8), 100, 6.5)).toMatchObject({ sens: 'monter', kg: 105 });
    expect(p(HAUT, rpe(8), 80, 6.5)).toMatchObject({ sens: 'monter', kg: 82.5 });
    // Cible en fourchette : on compare au BAS de la fourchette.
    expect(p(BAS, r78, 100, 5.5)).toMatchObject({ kg: 105 });
    expect(p(BAS, r78, 100, 6)).toBeNull(); // 1 point sous : on garde
  });

  it('trop dur (≥ 1 point au-dessus de la cible) : −5 %, au pas inférieur', () => {
    expect(p(BAS, rpe(8), 100, 9)).toMatchObject({ sens: 'baisser', kg: 95 });
    expect(p(BAS, rpe(8), 77.5, 9)).toMatchObject({ kg: 72.5 }); // 73,6 → 72,5
    expect(p(BAS, r78, 100, 9)).toMatchObject({ kg: 95 }); // haut de fourchette
    expect(p(BAS, rpe(8), 100, 8.5)).toBeNull(); // un demi-point : on garde
    // Un lest de 20 kg : −5 % ne se charge pas, on descend d'un pas entier.
    expect(p(HAUT, rpe(7), 20, 8)).toMatchObject({ kg: 17.5 });
  });

  it('rep ratée à la 1re série : cas 5, −7,5 % tout de suite', () => {
    expect(p(BAS, rpe(8), 100, 10, true)).toMatchObject({ sens: 'baisser', kg: 92.5 });
    // Même sans RPE noté.
    expect(p(BAS, rpe(8), 100, null, true)).toMatchObject({ kg: 92.5 });
  });

  it('dans la cible, ou rien à comparer : aucune proposition', () => {
    expect(p(BAS, rpe(8), 100, 8)).toBeNull();
    expect(p(BAS, rpe(8), 100, 7)).toBeNull(); // 1 point sous : le cas 3 attend la semaine suivante
    expect(p(BAS, null, 100, 5)).toBeNull();
    expect(p(BAS, rpe(8), null, 5)).toBeNull();
    expect(p(BAS, rpe(8), 100, null)).toBeNull();
  });

  it('plafond de bloc respecté ; haltères au pas de 2 kg', () => {
    expect(p({ ...BAS, kgMax: 95 }, rpe(8), 95, 6)).toBeNull();
    expect(p({ ...BAS, kgMax: 95 }, rpe(8), 92.5, 6)).toMatchObject({ kg: 95 });
    // Même arrondi que le cas 2 de la semaine suivante.
    expect(p({ isLowerBody: true, step: 2 }, rpe(8), 18, 6)).toMatchObject({ kg: 24 });
  });
});

describe('le .md et le code disent la même chose', () => {
  const md = readFileSync(new URL('../../programme-final-12-semaines.md', import.meta.url), 'utf8');
  const cas10 = md.slice(md.indexOf('**Cas 10'), md.indexOf('Règle générale'));

  it('le cas 10 est écrit au §11, avec ses chiffres', () => {
    expect(cas10.length).toBeGreaterThan(100);
    expect(cas10).toContain('au moins 1,5 point au bas de la cible');
    expect(cas10).toContain('au moins 1 point au haut de la cible');
    expect(cas10).toContain('+5 kg bas du corps, +2,5 kg haut du corps');
    expect(cas10).toContain('−5 %');
    expect(cas10).toContain('−7,5 %');
    expect(cas10).toContain('jamais imposée');
  });

  it('les constantes du code sont celles du .md', () => {
    expect(PROGRESSION_RULES.apresPremiereSerie).toEqual({
      rpeSousCibleAuMoins: 1.5,
      rpeAuDessusAuMoins: 1,
      baisseFacteur: 0.95,
    });
    expect(PROGRESSION_RULES.wayTooEasy).toMatchObject({ lowerBodyKg: 5, upperBodyKg: 2.5 });
    expect(PROGRESSION_RULES.missedRep.loadFactor).toBe(0.925);
  });
});

describe('qui y a droit', () => {
  const ctx = (level?: ReadinessResult['level']): SessionContext => ({
    ...EMPTY_CONTEXT,
    settings: {
      ...EMPTY_CONTEXT.settings,
      oneRM: { 'back-squat': 140, 'bench-press': 100, deadlift: 180 },
    },
    readiness: level === undefined ? null : ({ level } as unknown as ReadinessResult),
  });
  const eligibles = (prog: string, semaine: number, jour: number, c = ctx()) =>
    (moduleParId(prog)!.getSession(semaine, jour as 0, c)?.exercises ?? [])
      .filter((e) => e.ajustementIntra !== undefined)
      .map((e) => e.id);

  it('POWER S1 lundi : le back squat, bas du corps, pas de 2,5', () => {
    const s = moduleParId('power12')!.getSession(1, 0, ctx())!;
    const squat = s.exercises.find((e) => e.id === 'back-squat')!;
    expect(squat.ajustementIntra).toEqual({ isLowerBody: true, step: 2.5 });
    // Sans charge (tronc), pas de proposition.
    expect(s.exercises.find((e) => e.id === 'ab-wheel')?.ajustementIntra).toBeUndefined();
  });

  it('jamais en deload, au combine, à l’affûtage, ni un jour orange ou rouge', () => {
    expect(eligibles('power12', 1, 0)).toContain('back-squat');
    for (const s of [0, 4, 8, 12]) {
      for (const j of [0, 2, 4, 5, 6])
        expect(eligibles('power12', s, j), `S${s} j${j}`).toEqual([]);
    }
    expect(eligibles('power12', 1, 0, ctx('orange'))).toEqual([]);
    expect(eligibles('power12', 1, 0, ctx('rouge'))).toEqual([]);
    expect(eligibles('power12', 1, 0, ctx('vert'))).toContain('back-squat');
  });

  it('MASS n’y passe pas', () => {
    for (const j of [0, 1, 3, 5]) expect(eligibles('mass4', 1, j)).toEqual([]);
    for (const j of [0, 1, 3, 4]) expect(eligibles('mass-force', 1, j)).toEqual([]);
  });
});
