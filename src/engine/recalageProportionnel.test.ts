/**
 * Un écart au plan se reporte dans l'UNITÉ de la case.
 *
 * ── Le défaut, trouvé par Guillaume en lisant ses propres chiffres ─────────
 *
 * Le §9 donne des intensités : 89 % en semaine 7, 70 % en semaine 8. Le
 * recalage sur le réel, lui, était resté en kilos — il datait de l'époque où
 * le tableau était écrit en kilos absolus, et personne ne l'a revisité quand
 * le tableau est passé en pourcentages.
 *
 * Résultat : soulever 107,5 kg là où le plan annonçait 97,5 (89 % de 110)
 * reportait « +10 kg » sur toutes les semaines. En semaine 8, le deload
 * passait de 77,5 à 87,5 kg — soit 72,4 % du maximum que la performance
 * implique (120,8), alors que le programme demande 70 %. Une semaine de
 * deload est exactement celle où on ne veut pas de charge en trop.
 *
 * L'erreur vaut `(pct_référence − pct_semaine) × (facteur − 1) / facteur` :
 * nulle quand les deux semaines partagent la même intensité — ce qui est le
 * cas dans tout le bloc de force, où elle était donc invisible — et maximale
 * sur les deloads.
 *
 * ── Ce qui reste en kilos, et pourquoi ─────────────────────────────────────
 *
 * Un LEST n'est pas une charge : +10 kg à la ceinture restent +10 kg que la
 * semaine demande 44 % ou 78 %, parce que le corps porte le reste. C'est la
 * même raison qui fait qu'un deload ne prend pas 80 % d'un lest.
 *
 * Et une case que le programme écrit en kilos — Push Press, RDL — n'a aucun
 * pourcentage à mettre à l'échelle : sa progression est en paliers de 2,5 kg.
 */

import { describe, expect, it } from 'vitest';
import { getSession } from './getSession';
import { prescriptionFor } from '../data/mainLiftTable';
import {
  DEFAULT_SETTINGS,
  EMPTY_CONTEXT,
  type Occurrence,
  type SessionContext,
  type WeekIndex,
} from './types';
import type { DayIndex } from '../data/types';

const SETTINGS = {
  ...DEFAULT_SETTINGS,
  startDate: '2026-08-24',
  oneRM: { 'back-squat': 110, 'bench-press': 115, deadlift: 140, 'weighted-pullup': 45 },
  tableauOrigine: false,
};

const occ = (ex: string, week: number, day: number, kg: number, plannedKg: number): Occurrence => ({
  exerciseId: ex,
  week,
  day: day as DayIndex,
  kg,
  plannedKg,
  rpe: 8,
  failed: false,
  targetRPE: null,
  completed: true,
});

function ctx(history: Record<string, Occurrence[]>): SessionContext {
  return { ...EMPTY_CONTEXT, settings: SETTINGS, history };
}

const charge = (ex: string, week: number, day: number, c: SessionContext) =>
  getSession(week as WeekIndex, day as DayIndex, c)!.exercises.find((e) => e.id === ex)!;

/** Le même, mais en cherchant le mouvement dans toute la semaine. */
const charge0 = (ex: string, week: number, c: SessionContext) => {
  for (const d of [0, 1, 2, 3, 4, 5, 6] as DayIndex[]) {
    const trouve = getSession(week as WeekIndex, d, c)?.exercises.find((e) => e.id === ex);
    if (trouve) return trouve;
  }
  return null;
};

/** Le pourcentage que le §9 demande cette semaine-là. */
const pctDe = (ex: string, week: number) => {
  const load = prescriptionFor(ex as never, week)?.load;
  return load && load.kind === 'pct1RM' ? load.pct : null;
};

describe('le scénario exact de Guillaume', () => {
  /*
   * Semaine 7 : 4 × 2 à 89 % de 110, soit 97,5 kg. Il en fait 107,5 — son
   * maximum vaut donc 120,8, pas 110.
   */
  const apresS7 = ctx({ 'back-squat': [occ('back-squat', 7, 0, 107.5, 97.5)] });
  const IMPLIQUE = 107.5 / 0.89;

  it('la semaine de deload reste à SON intensité, pas à +10 kg', () => {
    const ex = charge('back-squat', 8, 0, apresS7);
    // 70 % de 120,8 = 84,6 → 85 au disque de 2,5. L'ancien calcul donnait
    // 87,5, soit 72,4 % — deux points et demi de trop sur un deload.
    expect(ex.load.kg).toBe(85);
    expect(ex.load.kg).not.toBe(87.5);
  });

  it('chaque semaine retombe sur le pourcentage que le tableau demande', () => {
    for (const semaine of [8, 9, 10, 11, 12]) {
      const attendu = pctDe('back-squat', semaine);
      if (attendu === null) continue;
      const kg = charge('back-squat', semaine, 0, apresS7).load.kg!;
      const obtenu = (kg / IMPLIQUE) * 100;
      // Un disque de 2,5 kg vaut ~2 points sur 120 : on tolère l'arrondi,
      // pas la dérive. L'ancien calcul s'écartait de 2,4 points en S8.
      expect(
        Math.abs(obtenu - attendu),
        `S${semaine} — ${obtenu.toFixed(1)} % au lieu de ${attendu} %`,
      ).toBeLessThan(1.1);
    }
  });

  it('la semaine de référence se retrouve à l’identique', () => {
    // 89 % du maximum impliqué, c'est exactement ce qu'il a soulevé.
    expect(charge('back-squat', 11, 0, apresS7).load.kg).toBe(107.5);
  });

  it('et l’écran dit que l’écart suit une proportion', () => {
    const a = charge('back-squat', 8, 0, apresS7).adjustments.find((x) => x.source === 'reel')!;
    expect(a.why).toContain('POURCENTAGE');
    expect(a.why).toContain('107,5');
  });
});

describe('dans l’autre sens', () => {
  it('sous-performer allège aussi en proportion', () => {
    // 87,5 kg là où le plan annonçait 97,5 : maximum impliqué 98,3.
    const sous = ctx({ 'back-squat': [occ('back-squat', 7, 0, 87.5, 97.5)] });
    const implique = 87.5 / 0.89;
    const kg = charge('back-squat', 8, 0, sous).load.kg!;
    expect((kg / implique) * 100).toBeGreaterThan(68);
    expect((kg / implique) * 100).toBeLessThan(72);
  });

  it('un écart nul ne déplace rien', () => {
    const conforme = ctx({ 'back-squat': [occ('back-squat', 7, 0, 97.5, 97.5)] });
    expect(charge('back-squat', 8, 0, conforme).load.kg).toBe(77.5);
  });
});

describe('§11 ne s’applique pas en semaine de deload', () => {
  /*
   * Trouvé en balayant les douze semaines : l'appli affichait bien 85 kg en
   * semaine 8 (70 % recalé) mais SUGGÉRAIT 90 kg, parce que la semaine 7
   * était sortie trop facile. §11 dit quoi faire d'une séance trop facile ;
   * §8 dit ce qu'est un deload — « zéro série au-dessus de RPE 6 », « tu dois
   * sortir en te disant j'aurais pu en faire plus ». Proposer une
   * progression dans la seule semaine dont le but est de dissiper la fatigue,
   * c'est appliquer une règle hors de son domaine.
   */
  const facile: Occurrence = {
    ...occ('back-squat', 7, 0, 107.5, 97.5),
    rpe: 7,
    targetRPE: { min: 9, max: 9, label: 'RPE 9' },
  };
  const apres = ctx({ 'back-squat': [facile] });

  it('aucune progression n’est proposée en semaine 8', () => {
    const ex = charge('back-squat', 8, 0, apres);
    expect(ex.suggestion?.case, 'un cas §11 s’applique sur un deload').toBeNull();
    // `toBe(NaN)` passe contre `NaN` : on vérifie d'abord que c'est un vrai
    // nombre, sinon un calcul cassé ferait passer le test en silence.
    expect(Number.isFinite(ex.load.kg)).toBe(true);
    expect(ex.suggestion?.suggestedKg).toBe(ex.load.kg);
  });

  it('et la semaine suivante, §11 reprend normalement', () => {
    const ex = charge('back-squat', 9, 0, apres);
    expect(ex.load.kg).toBe(102.5);
    expect(ex.suggestion?.suggestedKg).toBe(102.5);
  });

  it('le niveau réel n’est pas perdu pour autant', () => {
    // C'est le recalage qui le porte, pas §11 : la semaine 8 reste à 70 %
    // du maximum impliqué, donc bien au-dessus des 77,5 kg du tableau brut.
    expect(charge('back-squat', 8, 0, apres).load.kg).toBe(85);
  });
});

describe('aucune charge ne devient négative', () => {
  /*
   * Trouvé en balayant les douze semaines avec un utilisateur qui sous-performe
   * systématiquement. Un écart NÉGATIF reporté sur un lest donnait des charges
   * en dessous de zéro, affichées « +−10 kg » — le signe doublé disait assez
   * que personne n'avait prévu ce chemin.
   *
   * Une ceinture ne porte pas −10 kg. Zéro est ici une vraie valeur, pas une
   * absence : c'est la traction au poids du corps.
   */
  const faible = ctx({ 'weighted-pullup': [occ('weighted-pullup', 7, 2, 10, 35)] });

  it('le lest s’arrête au poids du corps', () => {
    const ex = charge('weighted-pullup', 8, 2, faible);
    expect(ex.load.kg).toBe(0);
    expect(ex.load.kg).toBeGreaterThanOrEqual(0);
  });

  it('et l’écran le DIT, au lieu d’afficher « +0 kg »', () => {
    expect(charge('weighted-pullup', 8, 2, faible).loadLine).toContain('poids du corps');
    expect(charge('weighted-pullup', 8, 2, faible).loadLine).not.toContain('+0');
    expect(charge('weighted-pullup', 8, 2, faible).loadLine).not.toContain('+-');
  });

  it('les semaines plus chargées restent chiffrées', () => {
    // Le plancher ne mange que ce qui passerait sous zéro : la semaine 10,
    // dont le plan est plus lourd, garde un lest.
    expect(charge('weighted-pullup', 10, 2, faible).load.kg).toBe(7.5);
  });

  it('sur aucune semaine, sur aucun lift, une charge ne passe sous zéro', () => {
    const sous = ctx({
      'weighted-pullup': [occ('weighted-pullup', 7, 2, 5, 35)],
      'push-press': [occ('push-press', 7, 4, 20, 60)],
      rdl: [occ('rdl', 7, 0, 40, 95)],
    });
    for (const id of ['weighted-pullup', 'push-press', 'rdl']) {
      for (let w = 8; w <= 12; w++) {
        const ex = charge0(id, w, sous);
        if (!ex || ex.load.kg === null) continue;
        expect(ex.load.kg, `${id} S${w}`).toBeGreaterThanOrEqual(0);
        expect(ex.loadLine, `${id} S${w}`).not.toContain('+-');
      }
    }
  });
});

describe('ce qui NE se recale pas en proportion', () => {
  it('un lest reste une différence en kilos', () => {
    /*
     * +45 de lest là où le plan annonçait +35 : c'est +10 kg à la ceinture,
     * pas « 28 % de plus ». Le corps porte le reste, et une proportion
     * appliquée au seul lest ne veut rien dire.
     */
    const lest = ctx({ 'weighted-pullup': [occ('weighted-pullup', 7, 2, 45, 35)] });
    const s9 = charge('weighted-pullup', 9, 2, lest);
    expect(s9.load.kg).toBe(s9.planKg! + 10);
    const s8 = charge('weighted-pullup', 8, 2, lest);
    expect(s8.load.kg).toBe(s8.planKg! + 10);
  });

  it('une case écrite en kilos garde ses paliers de 2,5 kg', () => {
    // Le Push Press : aucune intensité à mettre à l'échelle, sa règle est
    // « +2,5 kg quand les reps sont rapides ».
    const pp = ctx({ 'push-press': [occ('push-press', 1, 4, 40, 50)] });
    const s3 = charge('push-press', 3, 4, pp);
    expect(s3.load.kg).toBe(s3.planKg! - 10);
  });
});
