/**
 * La semaine de repas automatique (`regles-repas-automatiques.md`).
 *
 * Ce que ces tests figent :
 * - §2 : chaque jour tient sa cible (calories à ± 6 %, protéines à 90 % au
 *   moins) sur sept profils de 1 200 à 4 000 kcal — chiffres mesurés le 26
 *   novembre ; les quantités respectent leurs arrondis ;
 * - §3 : jamais deux fois le même repas le même jour, jamais le même que la
 *   veille au même créneau, aucun hasard, les aliments déclarés départagent ;
 * - la semaine ne se recompose jamais seule : `cibleAChange` le dit.
 */
import { describe, expect, it } from 'vitest';
import { BIBLIOTHEQUE_REPAS, repasPourCreneau } from '../data/bibliothequeRepas';
import { FOOD_LIBRARY } from '../data/foodLibrary';
import { CRENEAUX_AUTO, LEVIERS } from '../data/reglesRepasAutomatiques';
import { macrosDeJournee } from './planPersoTotaux';
import {
  ajusterRepas,
  choisirRepasSemaine,
  cleRepasFait,
  mangeDesRepas,
  repasFaits,
  cibleAChange,
  cibleDeSemaine,
  composerSemaine,
  jourDeSemaine,
  tientSaPart,
  type CibleRepas,
} from './semaineRepas';

const PROFILS: CibleRepas[] = [
  { kcal: 2150, proteinG: 180 },
  { kcal: 1600, proteinG: 150 },
  { kcal: 1200, proteinG: 110 },
  { kcal: 1500, proteinG: 120 },
  { kcal: 3200, proteinG: 145 },
  { kcal: 4000, proteinG: 180 },
  { kcal: 2000, proteinG: null },
];
const PREFERES = ['poulet', 'riz', 'skyr'];
const semaine = (c: CibleRepas, p = PREFERES) => composerSemaine(c, p, FOOD_LIBRARY, '2026-11-26');

describe('la semaine tient sa cible, chaque jour', () => {
  it('7 jours, 4 repas par jour, la cible retenue', () => {
    const s = semaine(PROFILS[0]!);
    expect(s.jours).toHaveLength(7);
    for (const j of s.jours)
      expect(Object.keys(j).sort()).toEqual(CRENEAUX_AUTO.map((c) => c.repas).sort());
    expect(s.cible).toEqual({ kcal: 2150, proteinG: 180 });
    expect(s.creeLe).toBe('2026-11-26');
  });

  it('calories à ± 6 %, protéines à 90 % au moins, sur sept profils', () => {
    for (const c of PROFILS) {
      semaine(c).jours.forEach((j, i) => {
        const m = macrosDeJournee(j, FOOD_LIBRARY);
        const ou = `${c.kcal} kcal, jour ${i}`;
        expect(Math.abs(m.kcal / c.kcal - 1), ou).toBeLessThanOrEqual(0.06);
        if (c.proteinG !== null) expect(m.proteinG / c.proteinG, ou).toBeGreaterThanOrEqual(0.9);
      });
    }
  });

  it('arrondis : 5 g ou 5 ml (5 au moins), pièces entières (1 au moins)', () => {
    for (const c of PROFILS) {
      for (const j of semaine(c).jours) {
        for (const lignes of Object.values(j)) {
          for (const l of lignes!) {
            const unite = FOOD_LIBRARY[l.foodId]!.unit;
            const pas = unite === 'unité' ? 1 : 5;
            expect(l.qty! % pas, l.foodId).toBe(0);
            expect(l.qty!, l.foodId).toBeGreaterThanOrEqual(pas);
          }
        }
      }
    }
  });

  it('les leviers restent dans leurs bornes (aliments pesés)', () => {
    const ref = new Map(BIBLIOTHEQUE_REPAS.map((r) => [r.id, r]));
    for (const c of PROFILS) {
      for (const { repas: creneau, part } of CRENEAUX_AUTO) {
        for (const r of BIBLIOTHEQUE_REPAS.filter((x) => x.creneaux.includes(creneau))) {
          const a = ajusterRepas(r, part, c, FOOD_LIBRARY);
          a.lignes.forEach((l, i) => {
            const f = FOOD_LIBRARY[l.foodId]!;
            if (f.unit === 'unité') return;
            const k = l.qty! / ref.get(r.id)!.lignes[i]!.qty!;
            // L'arrondi à 5 g peut sortir d'un pas de la borne, pas plus.
            const marge = 5 / ref.get(r.id)!.lignes[i]!.qty!;
            expect(k).toBeGreaterThanOrEqual(LEVIERS.reste.min - marge);
            expect(k).toBeLessThanOrEqual(LEVIERS.reste.max + marge);
          });
        }
      }
    }
  });
});

describe('le choix des repas (§3)', () => {
  it('jamais deux fois le même repas le même jour ; la veille seulement faute d’autre', () => {
    let repetitions = 0;
    for (const c of PROFILS) {
      const jours = choisirRepasSemaine(PREFERES, c, FOOD_LIBRARY);
      jours.forEach((j, i) => {
        const ids = Object.values(j);
        expect(new Set(ids).size, `${c.kcal}, jour ${i}`).toBe(ids.length);
        if (i === 0) return;
        for (const { repas, part } of CRENEAUX_AUTO) {
          if (j[repas] !== jours[i - 1]![repas]) continue;
          // Règle relâchée (§3) : aucun autre repas libre ne tenait sa part.
          repetitions++;
          const autres = repasPourCreneau(repas).filter(
            (r) =>
              r.id !== j[repas] &&
              !ids.includes(r.id) &&
              tientSaPart(ajusterRepas(r, part, c, FOOD_LIBRARY), part, c, FOOD_LIBRARY),
          );
          expect(
            autres.map((r) => r.id),
            `${c.kcal}, jour ${i}, ${repas}`,
          ).toEqual([]);
        }
      });
    }
    // Mesuré le 26 novembre : seule la collation à 1 200 kcal se répète
    // (5 fois) — un seul repas de la bibliothèque y tient 180 kcal.
    expect(repetitions).toBeLessThanOrEqual(5);
  });

  it('aucun hasard : les mêmes réponses donnent la même semaine', () => {
    expect(semaine(PROFILS[1]!)).toEqual(semaine(PROFILS[1]!));
  });

  it('les aliments déclarés départagent', () => {
    const sans = { kcal: 2000, proteinG: null };
    const legumineuses = ['lentilles', 'riz', 'courgettes', 'poivrons', 'brocolisCuits'];
    expect(choisirRepasSemaine(legumineuses, sans, FOOD_LIBRARY)[0]!.dejeuner).toBe(
      'lentilles-riz-legumes',
    );
    expect(choisirRepasSemaine([], sans, FOOD_LIBRARY)[0]!.dejeuner).not.toBe(
      'lentilles-riz-legumes',
    );
  });
});

describe('autour de la semaine', () => {
  it('la cible du jour d’entraînement, à défaut celle du repos', () => {
    const m = (kcal: number) => ({ kcal, proteinG: 150, carbsG: null, fatG: null });
    expect(cibleDeSemaine({ train: m(2400), rest: m(2100) })).toEqual({
      kcal: 2400,
      proteinG: 150,
    });
    const vide = { kcal: null, proteinG: null, carbsG: null, fatG: null };
    expect(cibleDeSemaine({ train: vide, rest: m(2100) })?.kcal).toBe(2100);
    expect(cibleDeSemaine(null)).toBeNull();
  });

  it('une cible changée est dite, jamais appliquée seule', () => {
    const s = semaine(PROFILS[0]!);
    expect(cibleAChange(s, { kcal: 2150, proteinG: 180 })).toBe(false);
    expect(cibleAChange(s, { kcal: 2400, proteinG: 180 })).toBe(true);
    expect(cibleAChange(s, { kcal: 2150, proteinG: 160 })).toBe(true);
    expect(cibleAChange(s, null)).toBe(false);
  });

  it('le jour de la semaine, lundi = 0', () => {
    expect(jourDeSemaine('2026-11-23')).toBe(0);
    expect(jourDeSemaine('2026-11-26')).toBe(3);
    expect(jourDeSemaine('2026-11-29')).toBe(6);
  });
});

describe('les repas cochés « mangé »', () => {
  const journee = {
    pdej: [{ foodId: 'skyr', qty: 200 }],
    dejeuner: [
      { foodId: 'riz', qty: 100 },
      { foodId: 'poulet', qty: 100 },
    ],
    diner: [{ foodId: 'riz', qty: 200 }],
  };

  it('une clé à part dans le journal : rien du plan historique ne s’y confond', () => {
    expect(cleRepasFait('pdej')).toBe('semaine:pdej');
    expect([...repasFaits(new Set(['semaine:pdej', 'pdej', 'reveil', 'semaine:diner']))]).toEqual([
      'pdej',
      'diner',
    ]);
    expect(repasFaits(new Set(['pdej', 'dejeuner'])).size).toBe(0);
  });

  it('le compte = les repas cochés seulement, tels qu’ils sont', () => {
    expect(mangeDesRepas(journee, new Set(), FOOD_LIBRARY).kcal).toBe(0);
    const m = mangeDesRepas(journee, new Set(['pdej', 'dejeuner'] as const), FOOD_LIBRARY);
    // Skyr 200 g (126) + riz 100 g (130) + poulet 100 g (165).
    expect(m.kcal).toBeCloseTo(126 + 130 + 165, 6);
    // Un créneau coché mais vide (repas retiré depuis) pèse zéro.
    expect(mangeDesRepas(journee, new Set(['collation1'] as const), FOOD_LIBRARY).kcal).toBe(0);
  });
});
