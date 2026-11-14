/**
 * MASS FORCE, lot 5 — les fourchettes de charge.
 *
 * Ce qui est figé : les trois calculs du brief, les cinq cas de références
 * (aucune, sous-maximale, autre matériel, historique, Smith ≠ barre), et ce
 * qui ne doit jamais apparaître (fourchette de push press, arrondi, fourchette
 * en semaine 2, fourchette sur le tirage supination).
 */
import { describe, expect, it } from 'vitest';
import type { ReferenceForceRow } from '../../db/db';
import { EMPTY_CONTEXT } from '../../engine/types';
import { chargePour, FOURCHETTES_FORCE, unRMMesure } from './charges';
import { MASS_FORCE } from './module';
import { SEANCES_FORCE } from './seances';
import type { LigneForce, OptionForce } from './types';

let n = 0;
const ref = (
  exercice: string,
  variante: string,
  chargeKg: number,
  p: Partial<ReferenceForceRow> = {},
): ReferenceForceRow => ({
  id: ++n,
  exercice,
  variante,
  modalite: 'direct',
  chargeKg,
  reps: 1,
  date: '2026-11-01',
  programmeId: 'mass-force',
  cycleId: 1,
  note: '',
  creeLe: n,
  ...p,
});

const ligne = (cle: string): LigneForce =>
  SEANCES_FORCE.flatMap((s) => s.lignes).find((l) => l.cle === cle)!;
const option = (cle: string, id: string): [LigneForce, OptionForce] => {
  const l = ligne(cle);
  return [l, l.options.find((o) => o.id === id)!];
};
const charge = (cle: string, id: string, refs: ReferenceForceRow[], semaine = 1) => {
  const [l, o] = option(cle, id);
  return chargePour(l, o, refs, semaine);
};

describe('calculs du brief', () => {
  it('bench 100 kg → 75 à 82,5 kg', () => {
    expect(
      charge('lun-developpe', 'mf-developpe-couche-barre', [ref('developpe-couche', 'barre', 100)]),
    ).toMatchObject({ kind: 'calculee', pctMin: 75, pctMax: 82.5, kgMin: 75, kgMax: 82.5 });
  });

  it('tirage vertical 80 kg → 60 à 66 kg', () => {
    expect(
      charge('mar-tirage', 'mf-tirage-vertical-poulie', [ref('tirage-vertical', 'poulie', 80)]),
    ).toMatchObject({ kind: 'calculee', kgMin: 60, kgMax: 66 });
  });

  it('squat Smith 120 kg → 84 à 96 kg', () => {
    expect(charge('jeu-squat', 'mf-squat-smith', [ref('squat', 'smith', 120)])).toMatchObject({
      kind: 'calculee',
      pctMin: 70,
      pctMax: 80,
      kgMin: 84,
      kgMax: 96,
    });
  });

  it('aucun arrondi : 93 kg × 82,5 % reste 76,725 kg', () => {
    const c = charge('lun-developpe', 'mf-developpe-couche-barre', [
      ref('developpe-couche', 'barre', 93),
    ]);
    if (c?.kind !== 'calculee') throw new Error('calculée attendue');
    expect(c.kgMin).toBeCloseTo(69.75, 10);
    expect(c.kgMax).toBeCloseTo(76.725, 10);
  });

  it('dit d’où vient le 1RM : matériel, date, mesuré', () => {
    expect(
      charge('lun-developpe', 'mf-developpe-couche-smith', [
        ref('developpe-couche', 'smith', 90, { date: '2026-11-12' }),
      ]),
    ).toMatchObject({ materiel: 'Smith machine', date: '2026-11-12', type: 'mesure' });
  });
});

describe('références', () => {
  it('aucune référence → à compléter, avec la fourchette en %', () => {
    expect(charge('lun-developpe', 'mf-developpe-couche-barre', [])).toEqual({
      kind: 'a-completer',
      pctMin: 75,
      pctMax: 82.5,
      materiel: 'Barre libre',
    });
  });

  it('une série sous-maximale n’est jamais prise pour un 1RM', () => {
    const c = charge('lun-developpe', 'mf-developpe-couche-barre', [
      ref('developpe-couche', 'barre', 70, { modalite: 'sous-maximal', reps: 6 }),
    ]);
    expect(c?.kind).toBe('a-completer');
  });

  it('une référence d’un autre matériel ne sert pas : poulie ≠ machine guidée', () => {
    const c = charge('mar-tirage', 'mf-tirage-vertical-machine', [
      ref('tirage-vertical', 'poulie', 80),
    ]);
    expect(c?.kind).toBe('a-completer');
  });

  it('Smith et barre libre : chacun son 1RM, jamais celui de l’autre', () => {
    const refs = [ref('developpe-couche', 'barre', 100), ref('developpe-couche', 'smith', 120)];
    expect(charge('lun-developpe', 'mf-developpe-couche-barre', refs)).toMatchObject({
      kgMin: 75,
    });
    expect(charge('lun-developpe', 'mf-developpe-couche-smith', refs)).toMatchObject({
      kgMin: 90,
    });
    expect(
      charge('lun-developpe', 'mf-developpe-couche-smith', [ref('developpe-couche', 'barre', 100)])
        ?.kind,
    ).toBe('a-completer');
  });

  it('plusieurs références : le 1RM mesuré le plus récent ; un sous-maximal plus récent ne l’efface pas', () => {
    const refs = [
      ref('developpe-couche', 'barre', 90, { date: '2026-09-01' }),
      ref('developpe-couche', 'barre', 100, { date: '2026-10-01' }),
      ref('developpe-couche', 'barre', 80, {
        date: '2026-11-01',
        modalite: 'sous-maximal',
        reps: 5,
      }),
    ];
    expect(unRMMesure(refs, 'developpe-couche', 'barre')?.chargeKg).toBe(100);
    expect(charge('lun-developpe', 'mf-developpe-couche-barre', refs)).toMatchObject({
      kgMin: 75,
      date: '2026-10-01',
    });
  });

  it('ne modifie pas les références lues (données du combiné conservées)', () => {
    const refs = Object.freeze([
      Object.freeze(ref('squat', 'smith', 120)),
      Object.freeze(ref('squat', 'smith', 60, { modalite: 'sous-maximal', reps: 8 })),
    ]) as readonly ReferenceForceRow[];
    const avant = JSON.stringify(refs);
    charge('jeu-squat', 'mf-squat-smith', [...refs]);
    expect(JSON.stringify(refs)).toBe(avant);
  });
});

describe('ce qui ne doit jamais apparaître', () => {
  it('push press : aucune fourchette, même avec un 1RM mesuré', () => {
    for (const id of ['mf-push-press-smith', 'mf-push-press-barre']) {
      expect(
        charge('ven-push-press', id, [
          ref('push-press', 'smith', 70),
          ref('push-press', 'barre', 70),
          ref('developpe-couche', 'barre', 100),
        ]),
      ).toEqual({ kind: 'a-determiner' });
    }
    for (const s of Object.values(FOURCHETTES_FORCE)) {
      expect(Object.keys(s).some((k) => k.includes('push-press'))).toBe(false);
    }
  });

  it('squat à la barre libre : pas de fourchette (décision : Smith seulement)', () => {
    expect(charge('jeu-squat', 'mf-squat-barre', [ref('squat', 'barre', 140)])).toEqual({
      kind: 'a-determiner',
    });
  });

  it('tirage supination : charge libre, le 1RM du tirage vertical n’y passe pas', () => {
    expect(
      charge('mar-supination', 'mf-tirage-supination-poulie', [
        ref('tirage-vertical', 'poulie', 80),
      ]),
    ).toBeNull();
  });

  it('les lignes libres restent libres', () => {
    for (const l of SEANCES_FORCE.flatMap((s) => s.lignes).filter((l) => l.charge === 'libre')) {
      expect(chargePour(l, l.options[0]!, [], 1), l.cle).toBeNull();
    }
  });

  it('semaine 2 : aucune fourchette héritée de la S1', () => {
    expect(Object.keys(FOURCHETTES_FORCE)).toEqual(['1']);
    expect(
      charge(
        'lun-developpe',
        'mf-developpe-couche-barre',
        [ref('developpe-couche', 'barre', 100)],
        2,
      ),
    ).toEqual({ kind: 'a-determiner' });
  });

  it('aucune charge unique : le champ kg n’est jamais pré-rempli', () => {
    const lundi = MASS_FORCE.getSession(1, 0, {
      ...EMPTY_CONTEXT,
      referencesForce: [ref('developpe-couche', 'barre', 100)],
    })!;
    const bench = lundi.exercises[0]!;
    expect(bench.chargeCible).toMatchObject({ kind: 'calculee', kgMin: 75, kgMax: 82.5 });
    expect(bench.load.kg).toBeNull();
    expect(bench.planKg).toBeNull();
    expect(bench.suggestion).toBeNull();
  });
});
