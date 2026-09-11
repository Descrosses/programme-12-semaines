/**
 * La règle centrale du plan alimentaire : « on ne regarde jamais une pesée
 * isolée ». Ces tests vérifient d'abord ça, puis les seuils d'ajustement.
 */

import { describe, expect, it } from 'vitest';
import {
  ADJUST_RULES,
  latestWaist,
  nutritionAdvice,
  weeklyAverages,
  weightTrend,
  windowAverage,
  type Measurement,
} from './nutrition';

const AUJOURDHUI = '2026-03-01';

/** Fabrique une pesée par jour, en remontant depuis `AUJOURDHUI`. */
function serie(poids: Array<number | null>, waist: Record<number, number> = {}): Measurement[] {
  return poids.map((kg, i) => ({
    date: new Date(Date.parse(`${AUJOURDHUI}T12:00:00Z`) - i * 86_400_000)
      .toISOString()
      .slice(0, 10),
    weightKg: kg,
    waistCm: waist[i] ?? null,
  }));
}

/** Une pesée hebdomadaire unique, `weeks` semaines de suite, à partir de `kg`. */
function hebdo(kg: number[], waistParSemaine: Record<number, number> = {}): Measurement[] {
  return kg.map((w, i) => ({
    date: new Date(Date.parse(`${AUJOURDHUI}T12:00:00Z`) - i * 7 * 86_400_000)
      .toISOString()
      .slice(0, 10),
    weightKg: w,
    waistCm: waistParSemaine[i] ?? null,
  }));
}

describe('moyenne glissante', () => {
  it('moyenne les 7 derniers jours, pas davantage', () => {
    // 7 jours à 80 kg, puis 7 jours à 70 kg : la fenêtre ne doit voir que 80.
    const e = serie([80, 80, 80, 80, 80, 80, 80, 70, 70, 70, 70, 70, 70, 70]);
    expect(windowAverage(e, AUJOURDHUI, 7)).toBe(80);
  });

  it('une seule pesée dans la semaine suffit — le .md prévoit ce cas', () => {
    const e = serie([79.4, null, null, null, null, null, null]);
    expect(windowAverage(e, AUJOURDHUI, 7)).toBe(79.4);
  });

  it('rend null quand la fenêtre est vide, au lieu d’inventer un 0', () => {
    expect(windowAverage([], AUJOURDHUI, 7)).toBeNull();
    expect(windowAverage(serie([null, null]), AUJOURDHUI, 7)).toBeNull();
  });

  it('compare la semaine à la précédente', () => {
    const e = serie([80, 80, 80, 80, 80, 80, 80, 79, 79, 79, 79, 79, 79, 79]);
    const t = weightTrend(e, AUJOURDHUI);
    expect(t.average7).toBe(80);
    expect(t.previous7).toBe(79);
    expect(t.deltaKg).toBe(1);
    expect(t.countThisWeek).toBe(7);
  });

  it('signale une progression dans la fourchette visée, +0,15 à +0,30 kg', () => {
    const e = serie([79.2, 79.2, 79.2, 79.2, 79.2, 79.2, 79.2, 79, 79, 79, 79, 79, 79, 79]);
    expect(weightTrend(e, AUJOURDHUI).onTarget).toBe(true);
    const trop = serie([80, 80, 80, 80, 80, 80, 80, 79, 79, 79, 79, 79, 79, 79]);
    expect(weightTrend(trop, AUJOURDHUI).onTarget).toBe(false);
  });

  it('découpe l’historique en fenêtres hebdomadaires', () => {
    const points = weeklyAverages(hebdo([80, 79.5, 79, 78.5]), AUJOURDHUI, 4);
    expect(points.map((p) => p.average)).toEqual([80, 79.5, 79, 78.5]);
    expect(points[0]!.endDate).toBe(AUJOURDHUI);
  });
});

describe('suggestion d’ajustement', () => {
  it('ne dit rien sans historique', () => {
    expect(nutritionAdvice([], AUJOURDHUI).kind).toBe('none');
  });

  it('ne dit rien sur une seule pesée, même spectaculaire', () => {
    const e: Measurement[] = [{ date: AUJOURDHUI, weightKg: 85, waistCm: null }];
    expect(nutritionAdvice(e, AUJOURDHUI).kind).toBe('none');
  });

  it('poids stable 3 semaines → ajoute 50 g de féculent', () => {
    const e = hebdo([79.0, 79.05, 78.95, 79.0]);
    const a = nutritionAdvice(e, AUJOURDHUI);
    expect(a.kind).toBe('add');
    expect(a.weeks).toBe(3);
    expect(a.action).toContain('Ajoute 50 g');
  });

  it('deux semaines stables ne suffisent pas : la 3e tranche', () => {
    // Semaine −3 en nette hausse : la série stable ne fait que 2 semaines.
    const e = hebdo([79.0, 79.05, 78.95, 78.0]);
    expect(nutritionAdvice(e, AUJOURDHUI).kind).toBe('none');
  });

  it('une variation à 200 g n’est pas « stable » : on retient le bord prudent', () => {
    const e = hebdo([79.2, 79.0, 78.8, 78.6]);
    expect(nutritionAdvice(e, AUJOURDHUI).kind).toBe('none');
  });

  it('prise de plus de 400 g/semaine sur 2 semaines → retire 50 g', () => {
    const e = hebdo([80.0, 79.4, 78.8, 78.2]);
    const a = nutritionAdvice(e, AUJOURDHUI);
    expect(a.kind).toBe('remove');
    expect(a.weeks).toBe(2);
    expect(a.action).toBe('Retire 50 g de féculent au dîner.');
  });

  it('si le tour de taille monte aussi, le message le dit', () => {
    const e = hebdo([80.0, 79.4, 78.8, 78.2], { 0: 88, 2: 86 });
    const a = nutritionAdvice(e, AUJOURDHUI);
    expect(a.kind).toBe('remove');
    expect(a.action).toContain('pas uniquement musculaire');
  });

  it('tour de taille stable pendant une prise rapide → message simple', () => {
    const e = hebdo([80.0, 79.4, 78.8, 78.2], { 0: 86, 2: 86 });
    expect(nutritionAdvice(e, AUJOURDHUI).action).not.toContain('musculaire');
  });

  it('une prise rapide n’est jamais lue comme un plateau', () => {
    const e = hebdo([80.0, 79.4, 78.8, 78.2]);
    expect(nutritionAdvice(e, AUJOURDHUI).kind).not.toBe('add');
  });

  it('un trou dans l’historique fait taire la suggestion au lieu de deviner', () => {
    const e = hebdo([79.0, 79.05, 78.95]);
    // La 4e fenêtre est vide : la 3e variation est inconnue.
    expect(nutritionAdvice(e, AUJOURDHUI).kind).toBe('none');
  });

  it('les seuils codés sont bien les bords prudents du .md', () => {
    expect(ADJUST_RULES.stableKg).toBe(0.15); // et non 0,2
    expect(ADJUST_RULES.stableWeeks).toBe(3); // et non 2
    expect(ADJUST_RULES.fastGainKg).toBe(0.4); // et non 0,5
    expect(ADJUST_RULES.fastGainWeeks).toBe(2); // on corrige tôt
  });
});

describe('tour de taille', () => {
  it('retient la mesure la plus récente, pas la première venue', () => {
    const e = serie([80, 80, 80], { 0: 86, 2: 88 });
    expect(latestWaist(e)).toBe(86);
  });

  it('sait remonter à une date donnée', () => {
    const e = serie([80, 80, 80], { 0: 86, 2: 88 });
    expect(latestWaist(e, '2026-02-28')).toBe(88);
  });

  it('rend null s’il n’y en a aucune', () => {
    expect(latestWaist(serie([80, 80]))).toBeNull();
  });
});
