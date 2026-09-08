import { describe, expect, it } from 'vitest';
import { capKg, ceilToStep, floorToStep, roundIntoRange, roundToStep } from './rounding';

describe('arrondis', () => {
  it('arrondit au 2,5 kg le plus proche', () => {
    expect(roundToStep(109.25, 2.5)).toBe(110);
    expect(roundToStep(111, 2.5)).toBe(111.25 - 1.25); // 110
    expect(roundToStep(91, 2.5)).toBe(90);
    expect(roundToStep(117.5, 2.5)).toBe(117.5);
  });

  it('arrondit au 2 kg pour les haltères', () => {
    expect(roundToStep(14.4, 2)).toBe(14);
    expect(roundToStep(19, 2)).toBe(20);
    expect(roundToStep(18, 2)).toBe(18);
  });

  it('reproduit les trois exemples de deload donnés par Guillaume', () => {
    // « 80 % de la dernière charge réelle, arrondi au 2,5 »
    expect(roundToStep(80 * 0.8, 2.5)).toBe(65); // front squat S4 : 64 → 65
    expect(roundToStep(90 * 0.8, 2.5)).toBe(72.5); // RDL S4 : 72 → 72,5
    expect(roundToStep(95 * 0.8, 2.5)).toBe(75); // RDL S8 : 76 → 75
  });

  it('ne produit jamais de flottant sale', () => {
    for (let kg = 40; kg <= 200; kg += 0.37) {
      const r = roundToStep(kg, 2.5);
      expect(Number.isInteger(r * 4), `${kg} → ${r}`).toBe(true);
    }
  });

  it('plancher et plafond', () => {
    expect(floorToStep(109.9, 2.5)).toBe(107.5);
    expect(ceilToStep(107.6, 2.5)).toBe(110);
    expect(floorToStep(110, 2.5)).toBe(110);
    expect(ceilToStep(110, 2.5)).toBe(110);
  });
});

describe('roundIntoRange — §11 cas 5, « −5 à −7,5 % »', () => {
  it('reste dans la fourchette du programme', () => {
    for (const kg of [100, 110, 115, 120, 125, 87.5, 102.5]) {
      const r = roundIntoRange(kg * 0.925, kg * 0.95, 2.5);
      expect(r, `${kg} kg`).toBeGreaterThanOrEqual(kg * 0.925 - 1e-9);
      expect(r, `${kg} kg`).toBeLessThanOrEqual(kg * 0.95 + 1e-9);
    }
  });

  it('choisit la valeur la plus prudente de la fourchette', () => {
    expect(roundIntoRange(120 * 0.925, 120 * 0.95, 2.5)).toBe(112.5); // [111 ; 114]
    expect(roundIntoRange(100 * 0.925, 100 * 0.95, 2.5)).toBe(92.5); // [92,5 ; 95]
  });
});

describe('plafond', () => {
  it('bloque au plafond et le signale', () => {
    expect(capKg(97.5, 95)).toEqual({ kg: 95, capped: true });
    expect(capKg(92.5, 95)).toEqual({ kg: 92.5, capped: false });
    expect(capKg(200)).toEqual({ kg: 200, capped: false });
  });
});
