/**
 * Le point des deux semaines (`regles-cibles-nutrition.md` §7).
 *
 * Ce que ces tests figent :
 * - pas de point avant 14 jours ; pas de proposition sous 4 pesées dans
 *   l'UNE des deux semaines (rien n'est deviné) ;
 * - le sens du palier pour les trois objectifs, bornes comprises ;
 * - la nouvelle cible : ± 100 kcal, macros du §5 refaites sur le poids
 *   moyen récent (poids de référence au-delà d'un IMC de 30) ;
 * - §6 : sous un plancher, ou perte avec un IMC passé sous 18,5 → « coach »,
 *   sans chiffre ; une hausse n'est jamais bloquée par le plancher ;
 * - le profil gardé ne porte aucune réponse de sécurité.
 */
import { describe, expect, it } from 'vitest';
import {
  ageAujourdhui,
  ajouterJours,
  pointDesDeuxSemaines,
  profilAGarder,
  sensDuPalier,
  type Pesee,
  type ProfilNutrition,
} from './reajustement';

const J = '2026-11-26';
const profil = (diff: Partial<ProfilNutrition> = {}): ProfilNutrition => ({
  sexe: 'homme',
  age: 34,
  ageLe: '2026-11-12',
  tailleCm: 180,
  travail: 'assis',
  pas: '5000-8000',
  seances: '4',
  duree: '45-75',
  objectif: 'perte',
  rythme: 'modere',
  pointLe: '2026-11-12',
  ...diff,
});

/** Des pesées : `precedentes` sur J−13…, `recentes` sur J−6… (une par jour). */
function pesees(precedentes: number[], recentes: number[]): Pesee[] {
  return [
    ...precedentes.map((weightKg, i) => ({ date: ajouterJours(J, -13 + i), weightKg })),
    ...recentes.map((weightKg, i) => ({ date: ajouterJours(J, -6 + i), weightKg })),
  ];
}
const quatre = (kg: number) => [kg, kg, kg, kg];

describe('quand le point se fait', () => {
  it('pas avant 14 jours', () => {
    expect(pointDesDeuxSemaines(profil(), 2150, [], '2026-11-25')).toEqual({
      cas: 'pas-du',
      prochainLe: '2026-11-26',
    });
    expect(pointDesDeuxSemaines(profil(), 2150, [], J).cas).toBe('pesees');
  });

  it('moins de 4 pesées dans une des deux semaines : aucune proposition', () => {
    expect(pointDesDeuxSemaines(profil(), 2150, pesees(quatre(82.5), [82, 82, 82]), J)).toEqual({
      cas: 'pesees',
      recentes: 3,
      precedentes: 4,
    });
    expect(pointDesDeuxSemaines(profil(), 2150, pesees([82.5], quatre(82)), J).cas).toBe('pesees');
  });

  it('une pesée sans poids, ou hors des 14 jours, ne compte pas', () => {
    const p = [
      ...pesees(quatre(82.5), [82, 82, 82]),
      { date: J, weightKg: null },
      { date: ajouterJours(J, -14), weightKg: 90 },
      { date: ajouterJours(J, 1), weightKg: 70 },
    ];
    expect(pointDesDeuxSemaines(profil(), 2150, p, J)).toMatchObject({
      cas: 'pesees',
      recentes: 3,
      precedentes: 4,
    });
  });
});

describe('le sens du palier (§7), bornes comprises', () => {
  it('perte : sous 0,5 % → −, au-dessus de 1 % → +', () => {
    expect(sensDuPalier('perte', -0.004)).toBe(-1);
    expect(sensDuPalier('perte', 0.003)).toBe(-1); // le poids monte
    expect(sensDuPalier('perte', -1 / 200)).toBe(0);
    expect(sensDuPalier('perte', -0.007)).toBe(0);
    expect(sensDuPalier('perte', -2 / 200)).toBe(0);
    expect(sensDuPalier('perte', -0.011)).toBe(1);
  });

  it('prise : sous 0,25 % → +, au-dessus de 0,5 % → −', () => {
    expect(sensDuPalier('prise', 0.002)).toBe(1);
    expect(sensDuPalier('prise', -0.01)).toBe(1); // le poids baisse
    expect(sensDuPalier('prise', 0.0025)).toBe(0);
    expect(sensDuPalier('prise', 0.005)).toBe(0);
    expect(sensDuPalier('prise', 0.006)).toBe(-1);
  });

  it('maintien : au-delà de 1 % d’écart, dans le sens qui ramène', () => {
    expect(sensDuPalier('maintien', 0.011)).toBe(-1);
    expect(sensDuPalier('maintien', -0.011)).toBe(1);
    expect(sensDuPalier('maintien', 0.01)).toBe(0);
    expect(sensDuPalier('maintien', -0.01)).toBe(0);
  });
});

describe('la proposition', () => {
  it('perte trop lente : − 100 kcal, macros refaites sur le poids moyen', () => {
    // 82,5 → 82,3 kg : − 0,24 % par semaine.
    const p = pointDesDeuxSemaines(profil(), 2150, pesees(quatre(82.5), quatre(82.3)), J);
    expect(p).toMatchObject({
      cas: 'proposition',
      delta: -100,
      // 2,2 × 82,3 = 181 → 180 ; 25 % × 2 050 / 9 = 56,9 → 55 ; le reste → 210.
      cible: { kcal: 2050, proteinG: 180, fatG: 55, carbsG: 210 },
    });
    if (p.cas === 'proposition') {
      expect(p.moyenneKg).toBeCloseTo(82.3, 6);
      expect(p.rythme).toBeCloseTo(-0.2 / 82.5, 9);
    }
  });

  it('perte trop rapide : + 100 kcal ; dans le rythme : on ne change rien', () => {
    expect(
      pointDesDeuxSemaines(profil(), 2150, pesees(quatre(82.5), quatre(81.2)), J),
    ).toMatchObject({ cas: 'proposition', delta: 100, cible: { kcal: 2250 } });
    expect(pointDesDeuxSemaines(profil(), 2150, pesees(quatre(82.5), quatre(81.9)), J).cas).toBe(
      'stable',
    );
  });

  it('la moyenne, pas la dernière pesée', () => {
    // Dernière pesée très basse, moyenne à − 0,24 % : toujours « trop lent ».
    const p = pesees(quatre(82.5), [82.7, 82.7, 82.7, 81.1]);
    expect(pointDesDeuxSemaines(profil(), 2150, p, J)).toMatchObject({ delta: -100 });
  });

  it('IMC ≥ 30 : les protéines sur le poids de référence', () => {
    // 100 kg, 180 cm : référence 81 kg → 2,2 × 81 = 178 → 180 g.
    const p = pointDesDeuxSemaines(profil(), 2500, pesees(quatre(100), quatre(100)), J);
    expect(p).toMatchObject({ cas: 'proposition', delta: -100, cible: { proteinG: 180 } });
  });

  it('prise et maintien suivent la même mécanique', () => {
    expect(
      pointDesDeuxSemaines(
        profil({ objectif: 'prise' }),
        3000,
        pesees(quatre(75), quatre(75.05)),
        J,
      ),
    ).toMatchObject({ cas: 'proposition', delta: 100, cible: { kcal: 3100, proteinG: 135 } });
    expect(
      pointDesDeuxSemaines(
        profil({ objectif: 'maintien', rythme: null }),
        2600,
        pesees(quatre(75), quatre(76)),
        J,
      ),
    ).toMatchObject({ cas: 'proposition', delta: -100 });
  });
});

describe('sécurité (§6)', () => {
  const femme = profil({ sexe: 'femme', age: 30, tailleCm: 165 });

  it('sous le plancher (ici la dépense au repos, 1 320 kcal) : coach, sans chiffre', () => {
    const p = pointDesDeuxSemaines(femme, 1350, pesees(quatre(60), quatre(60)), J);
    expect(p).toEqual({ cas: 'coach' });
  });

  it('le plancher ne bloque jamais une hausse', () => {
    const p = pointDesDeuxSemaines(femme, 1250, pesees(quatre(60), quatre(59)), J);
    expect(p).toMatchObject({ cas: 'proposition', delta: 100, cible: { kcal: 1350 } });
  });

  it('perte avec un IMC passé sous 18,5 : coach, même dans le rythme', () => {
    // 59 kg, 180 cm : IMC 18,2.
    const p = pointDesDeuxSemaines(profil(), 2150, pesees(quatre(59.4), quatre(59)), J);
    expect(p).toEqual({ cas: 'coach' });
  });
});

describe('le profil gardé', () => {
  it('aucune réponse de sécurité, la date du jour pour l’âge et le point', () => {
    const p = profilAGarder(
      {
        sexe: 'femme',
        age: 41,
        tailleCm: 165,
        poidsKg: 68,
        travail: 'debout',
        pas: 'nsp',
        seances: '0',
        duree: null,
        objectif: 'maintien',
        rythme: null,
        grossesse: 'non',
        maladie: 'non',
        relation: 'non',
      },
      J,
    );
    expect(Object.keys(p).sort()).toEqual(
      [
        'age',
        'ageLe',
        'duree',
        'objectif',
        'pas',
        'pointLe',
        'rythme',
        'seances',
        'sexe',
        'tailleCm',
        'travail',
      ].sort(),
    );
    expect(p.pointLe).toBe(J);
    expect(p.ageLe).toBe(J);
  });

  it('l’âge avance avec les années pleines', () => {
    const p = profil({ age: 34, ageLe: '2026-01-01' });
    expect(ageAujourdhui(p, '2026-12-31')).toBe(34);
    expect(ageAujourdhui(p, '2027-06-01')).toBe(35);
    expect(ageAujourdhui(p, '2025-06-01')).toBe(34);
  });

  it('les jours du calendrier, d’un mois à l’autre', () => {
    expect(ajouterJours('2026-11-26', 14)).toBe('2026-12-10');
    expect(ajouterJours('2026-03-01', -1)).toBe('2026-02-28');
  });
});
