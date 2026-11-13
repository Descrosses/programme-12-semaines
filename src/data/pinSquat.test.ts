/**
 * Pin Squat — le squat du lundi en semaines 5 à 7, et seulement là.
 *
 * L'empreinte voit les séries et la charge, pas les consignes ni la règle
 * du jour rouge : ces tests les fixent. Et ils relisent le .md, source de
 * vérité, ligne par ligne.
 */

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { prescriptionFor } from './mainLiftTable';
import { EXERCISES } from './exercises';
import { getSession } from '../engine/getSession';
import { EMPTY_CONTEXT, type SessionContext } from '../engine/types';
import type { DayIndex, WeekIndex } from './types';

const md = readFileSync(new URL('../../programme-final-12-semaines.md', import.meta.url), 'utf8');
const lundi = (w: number, ctx: SessionContext = EMPTY_CONTEXT) =>
  getSession(w as WeekIndex, 0 as DayIndex, ctx)!;
const ids = (w: number, d: number) =>
  (getSession(w as WeekIndex, d as DayIndex, EMPTY_CONTEXT)?.exercises ?? []).map((e) => e.id);

describe('le Pin Squat remplace le Back Squat du lundi en S5-7, et seulement là', () => {
  it('S5, S6, S7 : Pin Squat au lundi, plus de Back Squat', () => {
    for (const w of [5, 6, 7]) {
      expect(ids(w, 0), `S${w}`).toContain('pin-squat');
      expect(ids(w, 0), `S${w}`).not.toContain('back-squat');
    }
  });

  it('partout ailleurs : aucun Pin Squat, et le Back Squat est là où il était', () => {
    for (let w = 0; w <= 12; w++) {
      for (const d of [0, 1, 2, 3, 4, 5, 6]) {
        if ([5, 6, 7].includes(w) && d === 0) continue;
        expect(ids(w, d), `S${w} j${d}`).not.toContain('pin-squat');
      }
    }
    for (const w of [1, 2, 3, 4, 8, 9, 10, 11, 12]) {
      expect(ids(w, 0), `S${w} lundi`).toContain('back-squat');
    }
  });

  it('mêmes séries, reps et RPE que le Back Squat remplacé, repos 4 min', () => {
    const attendu: Record<number, [number, number, number]> = {
      5: [5, 3, 8],
      6: [4, 3, 8.5],
      7: [4, 2, 9],
    };
    for (const [w, [sets, r, rpe]] of Object.entries(attendu)) {
      const ex = lundi(Number(w)).exercises.find((e) => e.id === 'pin-squat')!;
      expect(ex.sets, `S${w}`).toBe(sets);
      expect(ex.work).toMatchObject({ kind: 'reps', reps: r });
      expect(ex.targetRPE?.min, `S${w}`).toBe(rpe);
      expect(ex.restSec).toBe(240);
    }
  });

  it('les charges sont une FORME de référence (95–100, 100–105, 110), pas un % du 1RM', () => {
    expect(prescriptionFor('pin-squat', 5)!.load).toMatchObject({
      kind: 'forme',
      kg: 95,
      kgMax: 100,
    });
    expect(prescriptionFor('pin-squat', 6)!.load).toMatchObject({
      kind: 'forme',
      kg: 100,
      kgMax: 105,
    });
    expect(prescriptionFor('pin-squat', 7)!.load).toMatchObject({ kind: 'forme', kg: 110 });
  });

  it('un nouvel utilisateur ne voit pas les kilos de référence : il choisit au RPE', () => {
    const ex = lundi(5).exercises.find((e) => e.id === 'pin-squat')!;
    expect(ex.load.kg).toBeNull();
    expect(
      lundi(5)
        .exercises.find((e) => e.id === 'pin-squat')!
        .notes.join(' '),
    ).toMatch(/RPE/);
  });

  it('une installation déjà en cours voit la référence', () => {
    const ancienne = {
      ...EMPTY_CONTEXT,
      settings: { ...EMPTY_CONTEXT.settings, tableauOrigine: true },
    };
    const ex = lundi(5, ancienne).exercises.find((e) => e.id === 'pin-squat')!;
    expect(ex.load.kg).toBe(95);
    expect(ex.load.kgMax).toBe(100);
  });

  it('les consignes de Guillaume sont sur la fiche, et l’exercice est distinct', () => {
    const def = EXERCISES['pin-squat']!;
    expect(def.name).toBe('Pin Squat');
    expect(def.liftId).toBe('pin-squat');
    const texte = (def.cues ?? []).join(' ');
    for (const consigne of [
      'même que ton Back Squat',
      'Arrêt complet de la barre sur les sécurités, sans rebond',
      'Ne réduis jamais volontairement l’amplitude',
      'même hauteur de sécurités',
      'rack et des sécurités adaptés',
    ]) {
      expect(texte, consigne).toContain(consigne);
    }
  });

  it('jour ROUGE en S5-7 : le lundi revient au Back Squat 3 × 3 à 65 % du 1RM', () => {
    const rouge: SessionContext = {
      ...EMPTY_CONTEXT,
      settings: { ...EMPTY_CONTEXT.settings, oneRM: { 'back-squat': 110 } },
      readiness: {
        level: 'rouge',
        pctDelta: -9,
        jumpCm: 220,
        baselineCm: 242,
        label: '',
        effect: '',
      },
    };
    const s = lundi(6, rouge);
    expect(s.exercises.map((e) => e.id)).not.toContain('pin-squat');
    const squat = s.exercises.find((e) => e.id === 'back-squat')!;
    expect(squat.sets).toBe(3);
    expect(squat.work).toMatchObject({ reps: 3 });
    expect(squat.load.kg).toBe(72.5); // 110 × 0,65 = 71,5 → 72,5
  });

  it('le .md porte les mêmes trois lignes que le code', () => {
    expect(md).toContain('| 5 | Pin Squat | 5 × 3 | RPE 8 | 95–100 kg |');
    expect(md).toContain('| 6 | Pin Squat | 4 × 3 | RPE 8,5 | 100–105 kg |');
    expect(md).toContain('| 7 | Pin Squat | 4 × 2 | RPE 9 | 110 kg |');
  });
});
