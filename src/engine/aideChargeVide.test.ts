/**
 * La phrase d'aide sous une case « Charge » vide (première fois sur un
 * mouvement). Elle n'apparaît que là où la case vide veut dire « à toi de
 * choisir », et disparaît dès qu'un kilo existe.
 */
import { describe, expect, it } from 'vitest';
import type { ResolvedExercise } from './getSession';
import { aideChargeVide } from './loadEntry';

function ex(p: {
  kg?: number | null;
  lastKg?: number | null;
  source?: string;
  shape?: string;
  rpe?: string | null;
  liftId?: string;
}): ResolvedExercise {
  return {
    def: { liftId: p.liftId },
    load: {
      kg: p.kg ?? null,
      shape: p.shape ?? 'cable',
      step: 1,
      source: p.source ?? 'aucune',
    },
    lastKg: p.lastKg ?? null,
    targetRPE: p.rpe === undefined || p.rpe === null ? null : { label: p.rpe, min: 7, max: 7 },
  } as unknown as ResolvedExercise;
}

describe('la phrase d’aide sous une case Charge vide', () => {
  it('nouvel utilisateur, accessoire sans RPE (Face Pull)', () => {
    expect(aideChargeVide(ex({}), null)).toBe(
      'Première fois : choisis une charge qui tient les répétitions demandées. Elle sera reprise la prochaine fois.',
    );
  });

  it('avec un RPE cible (Landmine Press), le RPE est rappelé', () => {
    expect(aideChargeVide(ex({ shape: 'barbell', rpe: 'RPE 7' }), null)).toContain(
      'répétitions demandées à RPE 7.',
    );
  });

  it('disparaît dès qu’un kilo existe : prévu, repris de l’historique, ou tapé', () => {
    expect(aideChargeVide(ex({ kg: 20, source: 'historique' }), null)).toBeNull();
    expect(aideChargeVide(ex({ lastKg: 20 }), null)).toBeNull();
    expect(aideChargeVide(ex({}), 12.5)).toBeNull();
  });

  it('jamais au poids du corps, donc jamais sur les modules MASS (forme « none »)', () => {
    expect(aideChargeVide(ex({ shape: 'bodyweight' }), null)).toBeNull();
    expect(aideChargeVide(ex({ shape: 'none' }), null)).toBeNull();
  });

  it('un mouvement du combine sans 1RM renvoie au 1RM, pas au choix', () => {
    expect(aideChargeVide(ex({ shape: 'barbell', liftId: 'back-squat', rpe: 'RPE 7' }), null)).toBe(
      'Charge calculée sur ton 1RM : saisis-le dans Réglages, ou passe le combine.',
    );
    // Le RDL (repère de forme) se règle, lui, sur la première série.
    expect(aideChargeVide(ex({ shape: 'barbell', liftId: 'rdl' }), null)).toContain(
      'Première fois',
    );
  });

  it('jamais sur une charge décrite en toutes lettres', () => {
    expect(aideChargeVide(ex({ source: 'programme' }), null)).toBeNull();
  });
});
