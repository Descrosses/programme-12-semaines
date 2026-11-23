/**
 * Le moteur des cibles (`regles-cibles-nutrition.md`) sur les cas limites :
 * poids de référence (IMC ≥ 30), plafond du coefficient, « 6 ou plus »,
 * maintien, plancher des lipides et des calories, exclusions du §6.
 */
import { describe, expect, it } from 'vitest';
import {
  arrondi,
  calculerCibles,
  coefficient,
  poidsDeReference,
  type ProfilCalcul,
} from './calculCibles';

const BASE: ProfilCalcul = {
  sexe: 'homme',
  age: 34,
  tailleCm: 180,
  poidsKg: 82.5,
  travail: 'assis',
  pas: '5000-8000',
  seances: '4',
  duree: '45-75',
  objectif: 'perte',
  rythme: 'modere',
  grossesse: null,
  maladie: 'non',
  relation: 'non',
};

describe('arrondis', () => {
  it('la moitié monte, même avec le bruit des flottants', () => {
    expect(arrondi(222.5, 5)).toBe(225);
    expect(arrondi(2125, 50)).toBe(2150);
    expect(arrondi(2124.9, 50)).toBe(2100);
    expect(arrondi(0.1 + 0.2, 0.05)).toBeCloseTo(0.3);
  });
});

describe('poids de référence', () => {
  it('sous un IMC de 30 : le poids réel', () => {
    expect(poidsDeReference({ poidsKg: 95, tailleCm: 180 })).toBe(95); // IMC 29,3
  });
  it('à 30 et au-delà : le poids d’un IMC de 25', () => {
    expect(poidsDeReference({ poidsKg: 110, tailleCm: 180 })).toBeCloseTo(81); // 1,8² × 25
  });
  it('les protéines et le plancher des lipides le suivent ; la dépense au repos, non', () => {
    const r = calculerCibles({ ...BASE, poidsKg: 110 });
    expect(r.proteinG).toBe(arrondi(2.2 * 81, 5)); // 178,2 → 180
    expect(r.etapes[0]!.calcul).toContain('10 × 110');
    expect(r.etapes[4]!.calcul).toContain('poids de référence');
  });
});

describe('coefficient', () => {
  it('« 6+ » compte pour 6', () => {
    expect(coefficient({ ...BASE, seances: '6+' }).entrainement).toBeCloseTo(6 * 0.035);
  });
  it('plafonné à 1,95', () => {
    const c = coefficient({ travail: 'physique', pas: '>12000', seances: '6+', duree: '>75' });
    expect(c.quotidien + c.entrainement).toBeCloseTo(2.0);
    expect(c.total).toBe(1.95);
  });
  it('aucune séance : l’activité quotidienne seule, la durée ignorée', () => {
    expect(coefficient({ ...BASE, seances: '0', duree: null }).total).toBe(1.35);
  });
});

describe('objectif', () => {
  it('maintien : ni déficit ni surplus, protéines à 1,8', () => {
    const r = calculerCibles({ ...BASE, objectif: 'maintien', rythme: null });
    expect(r.kcal).toBe(arrondi(1785 * 1.49, 50)); // 2 659,65 → 2 650
    expect(r.proteinG).toBe(arrondi(1.8 * 82.5, 5)); // 148,5 → 150
  });
  it('prise rapide : + 15 %', () => {
    expect(calculerCibles({ ...BASE, objectif: 'prise', rythme: 'rapide' }).kcal).toBe(
      arrondi(1785 * 1.49 * 1.15, 50),
    );
  });
  it('les lipides ne descendent jamais sous 0,6 g/kg', () => {
    // Petite femme, perte rapide : 25 % des calories < 0,6 g/kg.
    const r = calculerCibles({
      ...BASE,
      sexe: 'femme',
      age: 50,
      tailleCm: 150,
      poidsKg: 80,
      seances: '0',
      duree: null,
      rythme: 'rapide',
    });
    const ref = poidsDeReference({ poidsKg: 80, tailleCm: 150 });
    expect(r.fatG).toBeGreaterThanOrEqual(arrondi(0.6 * ref, 5));
  });
});

describe('§6 — sécurité', () => {
  it('l’exemple du .md est proposable, sans alerte', () => {
    const r = calculerCibles(BASE);
    expect(r).toMatchObject({ proposable: true, exclusions: [], alertes: [] });
  });

  it.each([
    [{ grossesse: 'oui' }, 'Grossesse'],
    [{ maladie: 'oui' }, 'Maladie'],
    [{ relation: 'oui' }, 'Relation'],
    [{ relation: 'oral' }, 'vive voix'],
    [{ poidsKg: 55 }, 'IMC'], // 180 cm : IMC 17
    [{ age: 17 }, '18 ans'],
  ] as const)('%o → exclu, jamais proposé', (diff, mot) => {
    const r = calculerCibles({ ...BASE, ...diff });
    expect(r.proposable).toBe(false);
    expect(r.exclusions.join(' ')).toContain(mot);
  });

  it('IMC bas sans perte demandée : calculé', () => {
    expect(calculerCibles({ ...BASE, poidsKg: 55, objectif: 'prise' }).exclusions).toEqual([]);
  });

  it('sous le plancher (1 200 kcal pour une femme, ou la dépense au repos) : pas proposé', () => {
    const r = calculerCibles({
      ...BASE,
      sexe: 'femme',
      age: 60,
      tailleCm: 150,
      poidsKg: 50,
      seances: '0',
      duree: null,
      rythme: 'rapide',
    });
    expect(r.kcal).toBeLessThan(1200);
    expect(r.proposable).toBe(false);
    expect(r.alertes.join(' ')).toContain('plancher');
  });

  it('les calories restent calculées, même exclues : le coach voit tout', () => {
    expect(calculerCibles({ ...BASE, maladie: 'oui' }).kcal).toBe(2150);
  });
});
