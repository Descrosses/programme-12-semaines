/**
 * La charge de référence des mouvements autorégulés.
 *
 * Deux défauts réels, trouvés sur les captures de la semaine 5 de Guillaume,
 * et verrouillés ici. Le Hip Thrust sert de cas d'école : il est autorégulé,
 * il a un historique propre, et le programme ne le chiffre nulle part.
 *
 *   Semaine 1 :  90 kg × 8, RPE 8
 *   Semaine 2 : 100 kg × 8, RPE 8
 *   Semaine 3 : 110 kg × 8, RPE 8
 *   Semaine 4 :  90 kg × 8, RPE 6   ← deload, réduction DÉCIDÉE
 *
 * Ce que l'application proposait en semaine 5 : 90 kg. Vingt kilos sous ce
 * qu'il venait de soulever, parce que la charge de deload était devenue la
 * nouvelle base.
 */

import { describe, expect, it } from 'vitest';
import { getSession, referenceOccurrences } from './getSession';
import { EMPTY_CONTEXT, type Occurrence, type SessionContext } from './types';
import type { DayIndex, WeekIndex } from '../data/types';

const occ = (week: number, kg: number, rpe: number, day: DayIndex = 5): Occurrence => ({
  exerciseId: 'hip-thrust',
  week,
  day,
  kg,
  plannedKg: kg,
  rpe,
  failed: false,
  targetRPE: null,
  completed: true,
  measure: null,
});

/** Ce que Guillaume a réellement fait, semaines 1 à 4. */
const VECU = [occ(1, 90, 8), occ(2, 100, 8), occ(3, 110, 8), occ(4, 90, 6)];

const ctx = (history: Occurrence[]): SessionContext => ({
  ...EMPTY_CONTEXT,
  settings: {
    startDate: '2026-01-03',
    broadJumpBaselineCm: 240,
    oneRM: { 'back-squat': 110, 'bench-press': 115, deadlift: 140, 'weighted-pullup': 45 },
  },
  history: { 'hip-thrust': history },
});

const hipThrust = (week: number, history: Occurrence[]) => {
  const s = getSession(week as WeekIndex, 5 as DayIndex, ctx(history));
  const ex = s?.exercises.find((e) => e.id === 'hip-thrust');
  if (!ex) throw new Error(`Hip Thrust absent de S${week}`);
  return ex;
};

// ---------------------------------------------------------------------------

describe('une semaine de deload ne redéfinit pas le niveau', () => {
  it('la semaine 5 repart des 110 kg, pas des 90 du deload', () => {
    // 110 (dernière semaine pleine) + 10 % d'entrée de bloc = 120.
    // Ce qui compte ici : la base est 110 et non 90, qui aurait donné 100.
    const ex = hipThrust(5, VECU);
    expect(ex.load.kg).toBe(120);
    expect(ex.load.kg!).toBeGreaterThan(110);
  });

  it('et la semaine 6 non plus, même longtemps après', () => {
    expect(hipThrust(6, VECU).load.kg).toBe(120);
  });

  it('le deload lui-même part bien de la dernière semaine PLEINE', () => {
    // 110 × 0,8 = 88 → 87,5 au pas de 2,5. Et surtout pas 110 × 0,8 × 0,8.
    expect(hipThrust(4, VECU.slice(0, 3)).loadLine).toBe('2 × 8 × 87,5 kg');
  });

  it('un historique entièrement en deload reste utilisable', () => {
    // Mieux vaut un repère imparfait qu'aucun : sinon la carte n'affiche
    // plus de charge du tout et le champ s'ouvre à vide. 90 × 1,1 = 99 → 100.
    expect(hipThrust(5, [occ(4, 90, 6)]).loadLine).toBe('4 × 6 × 100 kg');
  });

  it('sans aucun historique, la valeur d’amorce du programme reprend la main', () => {
    expect(hipThrust(5, []).loadLine).toBe('4 × 6 × 100 kg');
  });
});

describe('une séance passée garde le plan qu’elle avait', () => {
  it('rouvrir la semaine 3 affiche 100 kg, pas 90', () => {
    // Le plan du jour venait de la semaine 2. Le recalculer sur
    // l'historique d'aujourd'hui en faisait une reconstitution.
    expect(hipThrust(3, VECU).loadLine).toBe('4 × 8 × 100 kg');
  });

  it('la semaine 2 garde les 90 kg de la semaine 1', () => {
    expect(hipThrust(2, VECU).loadLine).toBe('4 × 8 × 90 kg');
  });

  it('valider une série ne déplace pas le plan de la séance en cours', () => {
    // L'occurrence du jour existe dès la première série enregistrée. Si elle
    // servait de référence, saisir 100 kg ferait basculer la ligne de plan
    // à 100 au milieu de la séance.
    const enCours = [...VECU, occ(5, 100, 8)];
    expect(hipThrust(5, enCours).loadLine).toBe('4 × 6 × 120 kg');
  });
});

describe('ce que le tri retient, mouvement par mouvement', () => {
  it('il ne garde que ce qui précède strictement la séance', () => {
    const ref = referenceOccurrences(VECU, 3 as WeekIndex, 5 as DayIndex);
    expect(ref.map((o) => o.week)).toEqual([1, 2]);
  });

  it('il écarte les semaines 4 et 8, les deux deloads', () => {
    const avec = [...VECU, occ(5, 115, 8), occ(8, 95, 6), occ(9, 120, 8)];
    const ref = referenceOccurrences(avec, 10 as WeekIndex, 5 as DayIndex);
    expect(ref.map((o) => o.week)).toEqual([1, 2, 3, 5, 9]);
  });

  it('le même jour mais un exercice plus tôt reste dans le passé', () => {
    // Le Broad Jump passe deux fois par semaine : vendredi puis samedi.
    const vendredi = occ(3, 110, 8, 4);
    expect(referenceOccurrences([vendredi], 3 as WeekIndex, 5 as DayIndex)).toHaveLength(1);
    expect(referenceOccurrences([vendredi], 3 as WeekIndex, 4 as DayIndex)).toHaveLength(0);
  });
});

describe('ce qui ne doit PAS changer', () => {
  it('les lifts du tableau §9 ignorent l’historique — ils sont chiffrés', () => {
    // Le deadlift de la semaine 5 vaut 117,5 kg quoi qu'il arrive.
    const s = getSession(5 as WeekIndex, 5 as DayIndex, ctx(VECU));
    expect(s!.exercises.find((e) => e.id === 'deadlift')!.loadLine).toBe('4 × 3 × 117,5 kg');
  });

  it('la suggestion §11 part de la charge de référence, pas du deload', () => {
    // RPE 8 atteint pour RPE 8 prévu : cas 1, aucune suggestion. Si la
    // référence était le deload à RPE 6, l'appli proposerait une hausse
    // depuis 90 kg — une progression vers une charge déjà dépassée.
    const ex = hipThrust(5, VECU);
    expect(ex.suggestion?.suggestedKg ?? null).not.toBe(100);
    expect(ex.lastKg).toBe(110);
  });
});

/**
 * La hausse d'entrée de bloc (§8).
 *
 * Le défaut, trouvé par Guillaume en comptant son tonnage : le passage en
 * force max faisait tomber le Hip Thrust de 4 × 8 à 4 × 6 avec 30 s de repos
 * en plus, sans toucher à la charge. 3 520 kg devenaient 2 640 kg à intensité
 * identique — moins de travail, mieux récupéré, dans le bloc censé charger.
 */
describe('entrée en bloc force max — la charge monte avec la baisse de reps', () => {
  it('le Hip Thrust passe de 110 à 120 kg en semaine 5', () => {
    expect(hipThrust(5, VECU).loadLine).toBe('4 × 6 × 120 kg');
  });

  it('le volume baisse et l’intensité monte — c’est ça, un bloc de force', () => {
    const s3 = hipThrust(3, VECU);
    const s5 = hipThrust(5, VECU);
    const tonnage = (ex: { sets: number; load: { kg: number | null } }, reps: number) =>
      ex.sets * reps * (ex.load.kg ?? 0);
    expect(tonnage(s3, 8)).toBe(3200); // 4 × 8 × 100
    expect(tonnage(s5, 6)).toBe(2880); // 4 × 6 × 120
    expect(tonnage(s5, 6)).toBeLessThan(tonnage(s3, 8));
    expect(s5.load.kg!).toBeGreaterThan(s3.load.kg!);
    expect(s5.restSec).toBeGreaterThan(s3.restSec);
  });

  it('la hausse ne s’applique qu’UNE fois — sinon elle composerait', () => {
    // 110 → 121 → 133 → 146 en trois semaines si le facteur revenait chaque
    // semaine sur une charge autorégulée, qui le contient déjà.
    const avecS5 = [...VECU, occ(5, 120, 8)];
    expect(hipThrust(6, avecS5).loadLine).toBe('4 × 6 × 120 kg');
    const avecS6 = [...avecS5, occ(6, 120, 8)];
    expect(hipThrust(7, avecS6).loadLine).toBe('4 × 6 × 120 kg');
  });

  it('la séance dit pourquoi la charge a bougé', () => {
    const why = hipThrust(5, VECU).adjustments.map((a) => a.why).join(' ');
    expect(why).toMatch(/moins de reps, plus de repos/i);
    expect(why).toMatch(/10 % de charge en plus/);
  });

  it('elle ne touche ni le deload ni le bloc puissance', () => {
    // Semaine 4 : base = la semaine 3 pleine, −20 %, pas +10 %.
    expect(hipThrust(4, VECU.slice(0, 3)).loadLine).toBe('2 × 8 × 87,5 kg');
    // Semaine 9 : §8 n'y demande aucune hausse, l'exercice y est explosif.
    const jusquA7 = [...VECU, occ(5, 120, 8), occ(6, 120, 8), occ(7, 120, 8)];
    expect(hipThrust(9, jusquA7).loadLine).toBe('4 × 5 × 120 kg');
  });

  it('sans historique, la valeur d’amorce n’est pas corrigée', () => {
    // 100 kg est déjà le point de départ choisi par le programme : le monter
    // de 10 % reviendrait à décider à la place de Guillaume.
    expect(hipThrust(5, []).loadLine).toBe('4 × 6 × 100 kg');
  });
});
