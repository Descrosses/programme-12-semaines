/**
 * Vérifie que `mainLiftTable.ts` est une transcription exacte du tableau §9.
 *
 * Trois filets :
 *  1. le .md est relu et analysé, puis comparé case par case au tableau typé ;
 *  2. une recopie manuelle du tableau est comparée au .md (si les deux
 *     divergent, c'est ma lecture du programme qui est fausse) ;
 *  3. des vérifications de structure (12 semaines, arrondis, cohérence RPE).
 */

import { describe, expect, it } from 'vitest';
import { parseSection9, type ParsedCell } from './__fixtures__/parseProgramMd';
import { MAIN_LIFT_TABLE, prescriptionFor } from './mainLiftTable';
import { TABLE_LIFTS, type MainLiftId, type WeekPrescription } from './types';

const { headers, rows } = parseSection9();

// ---------------------------------------------------------------------------
// 1. Le tableau du .md, recopié à la main. Sert de garde-fou de lecture.
// ---------------------------------------------------------------------------

const RECOPIE_MANUELLE: string[][] = [
  ['1', '5×5×100 – RPE 7', '5×5×87,5 – RPE 7', '4×5×97,5 – RPE 7', '4×5×+17,5', '5×3×50', '3×6×60', '6×2×60'],
  ['2', '5×5×105 – RPE 7,5', '5×5×90 – RPE 7,5', '4×5×102,5 – RPE 7,5', '4×5×+20', '5×3×52,5', '3×6×60', '6×2×60'],
  ['3', '5×4×110 – RPE 8', '5×4×95 – RPE 8', '4×4×107,5 – RPE 8', '4×4×+22,5', '6×2×55', '3×6×62,5', '6×2×60'],
  ['4', '3×3×90 – RPE 5', '3×3×80 – RPE 5', '3×3×85 – RPE 5', '3×3×+10', '3×3×45', '2×5×50', '4×2×55'],
  ['5', '5×3×115 – RPE 8', '5×3×100 – RPE 8', '4×3×110 – RPE 8', '4×3×+27,5', '6×2×55', '4×5×65', '6×2×65'],
  ['6', '4×3×120 – RPE 8,5', '4×3×102,5 – RPE 8,5', '3×3×115 – RPE 8,5', '4×3×+30', '6×2×57,5', '4×4×70', '6×2×65'],
  ['7', '4×2×125 – RPE 9', '4×2×107,5 – RPE 9', '3×2×120 – RPE 9', '4×2×+32,5', '6×2×60', '4×4×70', '6×2×65'],
  ['8', '3×3×97,5 – RPE 5', '3×3×85 – RPE 5', '3×3×90 – RPE 5', '3×2×+15', '3×2×45', '2×4×55', '4×2×55'],
  ['9', '4×2×117,5 + contraste', '4×2×100 + contraste', '3×2×112,5 + contraste', '3×3×+27,5', '6×2×57,5', '3×3×70', '8×2×65'],
  ['10', '4×2×120 + contraste', '4×2×102,5 + contraste', '3×2×117,5 + contraste', '3×3×+30', '6×2×60', '3×3×72,5', '8×2×65'],
  ['11', '4×1-2×125 + contraste', '4×1-2×107,5 + contraste', '3×1-2×120 + contraste', '3×2×+32,5', '6×2×62,5', '3×3×75', '8×2×65'],
  ['12', '3×2×97,5 puis TEST sam', '3×2×85 puis TEST dim', 'TEST mer', 'TEST dim', '3×2×50', '—', '2×2×55'],
];

describe('§9 — lecture du fichier source', () => {
  it('les colonnes sont dans l’ordre attendu', () => {
    expect(headers).toEqual([
      'Sem',
      'Back Squat (lun)',
      'Bench (mer)',
      'Deadlift (sam)',
      'Tractions lestées (mer)',
      'Push Press (ven)',
      'Front Squat (sam)',
      'Speed Squat (ven)',
    ]);
    expect(headers.length - 1).toBe(TABLE_LIFTS.length);
  });

  it('le tableau contient les 12 semaines', () => {
    expect(rows.map((r) => r.week)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });

  it('ma recopie manuelle correspond au fichier, cellule par cellule', () => {
    const duFichier = rows.map((r) => [String(r.week), ...r.cells.map((c) => c.raw)]);
    expect(duFichier).toEqual(RECOPIE_MANUELLE);
  });
});

// ---------------------------------------------------------------------------
// 2. Chaque case du .md vs `mainLiftTable.ts`
// ---------------------------------------------------------------------------

function attendu(cell: ParsedCell, presc: WeekPrescription | null, quoi: string) {
  if (cell.kind === 'absent') {
    expect(presc, `${quoi} devrait être absent`).toBeNull();
    return;
  }

  expect(presc, `${quoi} devrait exister`).not.toBeNull();
  const p = presc!;

  if (cell.kind === 'test') {
    expect(p.isTest, `${quoi} est une semaine de test`).toBe(true);
    expect(p.load, `${quoi} ne doit pas avoir de charge planifiée`).toBeNull();
    return;
  }

  // séries et répétitions
  expect(p.sets, `${quoi} — séries`).toBe(cell.sets);
  expect(p.work.kind).toBe('reps');
  if (p.work.kind === 'reps') {
    expect(p.work.reps, `${quoi} — répétitions`).toEqual(cell.reps);
  }

  // charge
  expect(p.load, `${quoi} — charge`).not.toBeNull();
  const load = p.load!;
  expect(load.kind, `${quoi} — type de charge`).toBe(cell.added ? 'added' : 'barbell');
  if (load.kind === 'added' || load.kind === 'barbell') {
    expect(load.kg, `${quoi} — kg`).toBe(cell.kg);
  }

  // RPE : présent dans la cellule ⇒ cible exacte dans le code
  if (cell.rpe !== null) {
    expect(p.targetRPE, `${quoi} — RPE cible`).not.toBeNull();
    expect(p.targetRPE!.min, `${quoi} — RPE min`).toBe(cell.rpe);
    expect(p.targetRPE!.max, `${quoi} — RPE max`).toBe(cell.rpe);
  }

  // contraste
  expect(Boolean(p.contrast), `${quoi} — contraste`).toBe(cell.contrast);
}

describe('§9 — transcription dans mainLiftTable.ts', () => {
  for (const row of rows) {
    describe(`semaine ${row.week}`, () => {
      TABLE_LIFTS.forEach((lift, col) => {
        const cell = row.cells[col]!;
        it(`${lift} : « ${cell.raw} »`, () => {
          attendu(cell, prescriptionFor(lift, row.week), `S${row.week} ${lift}`);
        });
      });
    });
  }
});

// ---------------------------------------------------------------------------
// 3. Ligne RDL — hors tableau §9, valeurs de §7, §8 et des règles validées
// ---------------------------------------------------------------------------

describe('RDL (hors tableau §9)', () => {
  const attenduRdl: Array<[number, number, number, number] | null> = [
    // [semaine, séries, reps, kg]
    [1, 3, 8, 80],
    [2, 3, 8, 85],
    [3, 3, 8, 90],
    [4, 2, 8, 72.5], // deload : 80 % de 90, arrondi au 2,5
    [5, 3, 6, 90],
    [6, 4, 5, 92.5],
    [7, 4, 5, 95],
    [8, 2, 5, 75], // deload : 80 % de 95, arrondi prudent vers le bas
    [9, 3, 5, 90],
    [10, 3, 5, 90],
    [11, 3, 5, 90],
    null, // absent du taper
  ];

  attenduRdl.forEach((att, i) => {
    const week = i + 1;
    it(`semaine ${week}`, () => {
      const p = prescriptionFor('rdl', week);
      if (att === null) {
        expect(p).toBeNull();
        return;
      }
      const [, sets, r, kg] = att;
      expect(p).not.toBeNull();
      expect(p!.sets).toBe(sets);
      expect(p!.work).toMatchObject({ kind: 'reps', reps: r, perSide: false });
      expect(p!.load).toMatchObject({ kind: 'barbell', kg });
    });
  });

  it('S9-11 porte un plafond assumé à 95 kg', () => {
    for (const week of [9, 10, 11]) {
      const load = prescriptionFor('rdl', week)!.load!;
      expect(load).toMatchObject({ kind: 'barbell', kg: 90, kgMax: 95 });
    }
  });
});

// ---------------------------------------------------------------------------
// 4. Structure
// ---------------------------------------------------------------------------

describe('structure du tableau', () => {
  const lifts = Object.keys(MAIN_LIFT_TABLE) as MainLiftId[];

  it('chaque mouvement couvre exactement 12 semaines', () => {
    for (const lift of lifts) {
      expect(MAIN_LIFT_TABLE[lift], lift).toHaveLength(12);
    }
  });

  it('toute charge en barre s’arrondit au pas de 2,5 kg', () => {
    for (const lift of lifts) {
      for (const p of MAIN_LIFT_TABLE[lift]) {
        if (!p?.load) continue;
        if (p.load.kind === 'barbell' || p.load.kind === 'added') {
          expect(p.load.step, `${lift} : pas d’arrondi`).toBe(2.5);
          expect(p.load.kg % 2.5, `${lift} : ${p.load.kg} kg n’est pas un multiple de 2,5`).toBe(0);
        }
      }
    }
  });

  it('aucune cible de RPE incohérente (min ≤ max)', () => {
    for (const lift of lifts) {
      for (const p of MAIN_LIFT_TABLE[lift]) {
        if (!p?.targetRPE) continue;
        expect(p.targetRPE.min).toBeLessThanOrEqual(p.targetRPE.max);
      }
    }
  });

  it('prescriptionFor renvoie null hors des semaines 1-12', () => {
    expect(prescriptionFor('back-squat', 0)).toBeNull();
    expect(prescriptionFor('back-squat', 13)).toBeNull();
  });

  it('toute prescription du tableau a une séance qui l’accueille', () => {
    // Le tableau ne doit jamais prescrire du travail que le calendrier ignore.
    for (const lift of lifts) {
      for (const [i, p] of MAIN_LIFT_TABLE[lift].entries()) {
        expect(p?.unscheduled, `${lift} S${i + 1}`).not.toBe(true);
      }
    }
  });

  it('les tractions lestées suivent la cible de RPE du bench de la semaine', () => {
    // Décision de Guillaume : même séance, même schéma, donc même cible.
    for (let week = 1; week <= 11; week++) {
      const bench = prescriptionFor('bench-press', week)!.targetRPE;
      const pull = prescriptionFor('weighted-pullup', week)!.targetRPE;
      expect(pull, `S${week}`).toEqual(bench);
    }
  });
});
