/**
 * Le recalage, vu depuis la séance entière.
 *
 * Le scénario est celui que Guillaume a signalé : le tableau §9 annonce 95 kg
 * de RDL en semaine 7, il en tire 130 depuis la semaine 5, et la semaine 8
 * affichait « Deload : 80 % de la semaine 7 » avec 75 kg — 80 % du
 * prévisionnel, pas de ce qu'il soulève.
 */

import { describe, expect, it } from 'vitest';
import { getSession } from './getSession';
import { prescriptionFor } from '../data/mainLiftTable';
import { EMPTY_CONTEXT, type Occurrence, type SessionContext } from './types';
import type { WeekIndex } from '../data/types';

const SETTINGS = {
  startDate: '2026-08-24',
  broadJumpBaselineCm: 232,
  tableauOrigine: false,
  oneRM: { 'back-squat': 140, 'bench-press': 115, deadlift: 180, 'weighted-pullup': 45 },
};

/** Une occurrence de RDL : charge réelle, et le plan que le tableau annonçait. */
const rdl = (week: number, actualKg: number): Occurrence => {
  const p = prescriptionFor('rdl', week);
  return {
    exerciseId: 'rdl',
    week,
    day: 0,
    kg: actualKg,
    plannedKg: p?.load && 'kg' in p.load ? p.load.kg : null,
    rpe: 7,
    failed: false,
    targetRPE: p?.targetRPE ?? null,
    completed: true,
  };
};

const ctx = (history: Occurrence[]): SessionContext => ({
  ...EMPTY_CONTEXT,
  settings: SETTINGS,
  history: { rdl: history },
});

const charge = (week: number, c: SessionContext) =>
  getSession(week as WeekIndex, 0, c)?.exercises.find((e) => e.id === 'rdl');

const REEL = [rdl(5, 130), rdl(6, 130), rdl(7, 130)];

describe('la semaine de deload se calcule sur le réel', () => {
  it('80 % de ce qu’il soulève, pas 80 % de ce que le plan annonçait', () => {
    const ex = charge(8, ctx(REEL))!;
    // 130 × 0,8 = 104 → 105 au pas de 2,5 kg. Le tableau disait 75.
    expect(ex.load.kg).toBe(105);
    expect(ex.planKg).toBe(75);
  });

  it('et le dit, chiffres à l’appui', () => {
    const ex = charge(8, ctx(REEL))!;
    const a = ex.adjustments.find((x) => x.source === 'deload')!;
    expect(a.why).toContain('80 % de tes 130 kg');
    expect(a.why).toContain('semaine 7');
    expect(a.what).toContain('105');
  });

  it('sans historique, le tableau fait foi — on n’invente rien', () => {
    const ex = charge(8, { ...EMPTY_CONTEXT, settings: SETTINGS })!;
    expect(ex.load.kg).toBe(75);
    expect(ex.adjustments.filter((x) => x.source === 'deload')).toHaveLength(0);
  });

  it('un deload reste un deload : plus léger que la dernière charge réelle', () => {
    const ex = charge(8, ctx(REEL))!;
    expect(ex.load.kg!).toBeLessThan(130);
  });
});

describe('le décalage cumulé suit le programme', () => {
  it('les semaines 9 à 11 repartent du réel, pas du tableau', () => {
    for (const w of [9, 10, 11]) {
      const ex = charge(w, ctx(REEL))!;
      // Plan 90 + décalage 35 = 125.
      expect(ex.load.kg, `S${w}`).toBe(125);
      expect(ex.planKg, `S${w}`).toBe(90);
    }
  });

  it('le plafond de 95 kg ne fait plus redescendre de 35 kg', () => {
    /*
     * « Plafond assumé à 95 kg » a été écrit quand le plan partait de 90.
     * Le décalage déplace la forme entière, plafond compris — sinon la
     * semaine 9 prescrirait 95 kg à quelqu'un qui en tire 130.
     */
    const ex = charge(9, ctx(REEL))!;
    expect(ex.load.kgMax).toBe(130);
    expect(ex.load.kg).toBe(125);
  });

  it('explique d’où vient le chiffre', () => {
    const a = charge(9, ctx(REEL))!.adjustments.find((x) => x.source === 'reel')!;
    expect(a.why).toContain('130 kg');
    expect(a.why).toContain('+35 kg');
  });

  it('descend aussi quand il soulève MOINS que prévu', () => {
    const ex = charge(9, ctx([rdl(7, 80)]))!;
    // Plan 90, réel 80 pour 95 annoncés → décalage −15.
    expect(ex.load.kg).toBe(75);
  });

  it('sans historique, rien ne bouge', () => {
    const ex = charge(9, { ...EMPTY_CONTEXT, settings: SETTINGS })!;
    expect(ex.load.kg).toBe(90);
    expect(ex.adjustments.filter((x) => x.source === 'reel')).toHaveLength(0);
  });
});

describe('le décalage ne se mange pas lui-même', () => {
  it('§11 reçoit le plan BRUT, donc ne compte pas le décalage deux fois', () => {
    const ex = charge(9, ctx(REEL))!;
    // Le décalage vaut +35. Si §11 le rajoutait à une charge qui le contient
    // déjà, la suggestion partirait à 160 au lieu de 125.
    expect(ex.suggestion?.offsetKg).toBe(35);
    expect(ex.suggestion?.suggestedKg).toBe(125);
    expect(ex.load.kg).toBe(ex.suggestion?.suggestedKg);
  });

  it('`planKg` reste le chiffre du tableau, à enregistrer avec chaque série', () => {
    /*
     * C'est ce qui empêche l'écart de retomber à zéro. Enregistrer la charge
     * recalée donnerait « prévu 130, fait 130 », et la semaine suivante le
     * plan repartirait du prévisionnel.
     */
    for (const [w, attendu] of [
      [8, 75],
      [9, 90],
      [10, 90],
      [11, 90],
    ] as const) {
      expect(charge(w, ctx(REEL))!.planKg, `S${w}`).toBe(attendu);
    }
  });
});

describe('ce que le recalage ne touche pas', () => {
  it('une charge autorégulée n’est pas décalée — elle EST déjà le réel', () => {
    /*
     * Le Hip Thrust tire sa charge de l'historique (`autoreg`). Lui ajouter le
     * décalage le compterait deux fois : la charge réelle, plus l'écart entre
     * cette charge réelle et un plan qui n'existe pas.
     */
    const hist: Occurrence[] = [
      {
        exerciseId: 'hip-thrust',
        week: 7,
        day: 5,
        kg: 120,
        plannedKg: 100,
        rpe: 8,
        failed: false,
        targetRPE: null,
        completed: true,
      },
    ];
    const s = getSession(9, 5, {
      ...EMPTY_CONTEXT,
      settings: SETTINGS,
      history: { 'hip-thrust': hist },
    });
    const ex = s!.exercises.find((e) => e.id === 'hip-thrust')!;
    expect(ex.load.source).toBe('historique');
    expect(ex.load.kg).toBe(120);
    expect(ex.adjustments.filter((a) => a.source === 'reel')).toHaveLength(0);
  });

  it('un exercice au poids du corps n’a rien à recaler', () => {
    const s = getSession(9, 0, ctx(REEL))!;
    const ab = s.exercises.find((e) => e.id === 'ab-wheel')!;
    expect(ab.load.kg).toBeNull();
    expect(ab.adjustments.filter((a) => a.source === 'reel')).toHaveLength(0);
  });
});

describe('un lest n’est pas une charge', () => {
  it('les tractions lestées gardent le deload du tableau', () => {
    /*
     * 80 % de 35 kg de lest, c'est 28 kg — et 78,5 + 28 ne retire que 6 % de
     * l'effort réel, là où le tableau descend à 15 kg de lest. Une proportion
     * ne s'applique qu'à ce qui porte toute la charge.
     */
    const hist: Occurrence[] = [
      {
        exerciseId: 'weighted-pullup',
        week: 7,
        day: 2,
        kg: 35,
        plannedKg: 35,
        rpe: 8,
        failed: false,
        targetRPE: null,
        completed: true,
      },
    ];
    const ex = getSession(8, 2, {
      ...EMPTY_CONTEXT,
      settings: SETTINGS,
      history: { 'weighted-pullup': hist },
    })!.exercises.find((e) => e.id === 'weighted-pullup')!;

    expect(ex.load.shape).toBe('added');
    expect(ex.load.kg).toBe(15);
    expect(ex.adjustments.filter((a) => a.source === 'deload')).toHaveLength(0);
  });

  it('mais le décalage, lui, s’applique au lest : c’est une différence, pas une proportion', () => {
    const hist: Occurrence[] = [
      {
        exerciseId: 'weighted-pullup',
        week: 7,
        day: 2,
        kg: 45,
        plannedKg: 35,
        rpe: 7,
        failed: false,
        targetRPE: null,
        completed: true,
      },
    ];
    const ex = getSession(9, 2, {
      ...EMPTY_CONTEXT,
      settings: SETTINGS,
      history: { 'weighted-pullup': hist },
    })!.exercises.find((e) => e.id === 'weighted-pullup')!;
    // +10 kg de lest en plus que prévu, reportés sur le plan de la semaine 9.
    expect(ex.load.kg).toBe(ex.planKg! + 10);
  });
});

describe('le deload sur le réel ne vaut QUE là où le programme l’écrit', () => {
  /** Le même scénario que le RDL, appliqué à un autre mouvement. */
  const histoireDe = (exId: string, week: number, reel: number, prevu: number): Occurrence[] => [
    {
      exerciseId: exId,
      week,
      day: 0,
      kg: reel,
      plannedKg: prevu,
      rpe: 8,
      failed: false,
      targetRPE: null,
      completed: true,
    },
  ];

  const chargeDe = (exId: string, week: number, day: number, hist: Occurrence[]) =>
    getSession(week as WeekIndex, day as never, {
      ...EMPTY_CONTEXT,
      settings: SETTINGS,
      history: { [exId]: hist },
    })!.exercises.find((e) => e.id === exId)!;

  it('le RDL l’écrit : « 80 % de la semaine 7 » — il est recalculé', () => {
    expect(chargeDe('rdl', 8, 0, histoireDe('rdl', 7, 130, 95)).load.kg).toBe(105);
  });

  it('le Speed Squat ne l’écrit PAS : « volume divisé, intention conservée »', () => {
    /*
     * Sa consigne de deload porte sur le VOLUME, pas sur la charge. Lui
     * appliquer 80 % contredirait le programme en toutes lettres — c'est le
     * défaut qu'avait ma première version, trouvé en comparant les 444 charges
     * des douze semaines avant et après.
     */
    const ex = chargeDe('speed-squat', 8, 4, histoireDe('speed-squat', 7, 65, 65));
    // 50 % du squat, et le squat de ce jeu d'essai vaut 140 : la case du
    // deload reste celle du tableau, elle n'est pas recalculée sur le réel.
    expect(ex.load.kg).toBe(70);
    expect(ex.adjustments.filter((a) => a.source === 'deload')).toHaveLength(0);
  });

  it('le Bench ne l’écrit pas non plus : il descend à 65-70 % du 1RM testé', () => {
    // 80 % de sa charge de travail le ferait passer sous la fourchette de §8.
    const ex = chargeDe('bench-press', 8, 2, histoireDe('bench-press', 7, 102.5, 102.5));
    expect(ex.load.kg).toBe(82.5);
    expect(ex.adjustments.filter((a) => a.source === 'deload')).toHaveLength(0);
  });

  it('le Push Press non plus — un deload ne doit pas alourdir la barre', () => {
    const ex = chargeDe('push-press', 8, 4, histoireDe('push-press', 7, 60, 60));
    expect(ex.load.kg).toBe(45);
  });
});
