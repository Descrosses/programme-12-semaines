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
import { journeeVide, type JourneePerso } from '../data/planPerso';
import { CIBLE_MINIMALE, CRENEAUX_AUTO, LEVIERS } from '../data/reglesRepasAutomatiques';
import { listeDeCourses } from './courses';
import { macrosDeJournee } from './planPersoTotaux';
import {
  ajusterRepas,
  choisirRepasSemaine,
  cleRepasFait,
  creneauxDe,
  mangeDesRepas,
  nombreAdmis,
  nombreDeRepas,
  nombresPossibles,
  partDe,
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

/*
 * §1 — 4, 5 ou 6 repas par jour (Guillaume, 26 novembre : « la possibilité
 * d'ajouter un repas […] j'ai 5 repas, voire 6 »).
 */
describe('§1 — 5 et 6 repas par jour', () => {
  const kcalDe = (j: JourneePerso) => macrosDeJournee(j, FOOD_LIBRARY).kcal;

  it('4 repas : la semaine garde exactement sa forme d’avant (pas de champ en plus)', () => {
    const s = composerSemaine({ kcal: 2150, proteinG: 180 }, [], FOOD_LIBRARY, '2026-11-26');
    expect('repasParJour' in s).toBe(false);
    expect(nombreDeRepas(s)).toBe(4);
    expect(s).toEqual(
      composerSemaine({ kcal: 2150, proteinG: 180 }, [], FOOD_LIBRARY, '2026-11-26', new Set(), 4),
    );
    expect(nombreDeRepas(null)).toBe(4);
    // Une valeur inconnue (sauvegarde abîmée) retombe sur 4, jamais sur une erreur.
    expect(nombreDeRepas({ repasParJour: 9 as never })).toBe(4);
  });

  for (const n of [5, 6] as const) {
    it(`${String(n)} repas : chaque jour porte ses ${String(n)} créneaux, jamais deux fois le même plat`, () => {
      const s = composerSemaine(
        { kcal: 2600, proteinG: 170 },
        [],
        FOOD_LIBRARY,
        '2026-11-26',
        new Set(),
        n,
      );
      expect(s.repasParJour).toBe(n);
      expect(nombreDeRepas(s)).toBe(n);
      const choix = choisirRepasSemaine(
        [],
        { kcal: 2600, proteinG: 170 },
        FOOD_LIBRARY,
        new Set(),
        creneauxDe(n),
      );
      for (const [i, j] of s.jours.entries()) {
        expect(Object.keys(j).sort(), `jour ${String(i)}`).toEqual(
          creneauxDe(n)
            .map((c) => c.repas)
            .sort(),
        );
        const plats = Object.values(choix[i]!);
        expect(new Set(plats).size, `jour ${String(i)}`).toBe(plats.length);
      }
    });

    it(`${String(n)} repas : à partir du seuil, chaque jour tient entre − 5 % et + 5 % de ses calories`, () => {
      const seuil = CIBLE_MINIMALE[n];
      for (const kcal of [seuil, seuil + 100, 2150, 2600, 3200, 3770]) {
        for (const proteinG of [Math.round(kcal * 0.06), Math.round(kcal * 0.085)]) {
          const s = composerSemaine(
            { kcal, proteinG },
            [],
            FOOD_LIBRARY,
            '2026-11-26',
            new Set(),
            n,
          );
          for (const [i, j] of s.jours.entries()) {
            const ecart = kcalDe(j) / kcal - 1;
            expect(
              Math.abs(ecart),
              `${String(kcal)} kcal, ${String(proteinG)} g, jour ${String(i)}`,
            ).toBeLessThanOrEqual(0.05);
          }
        }
      }
    });

    it(`${String(n)} repas : sous le seuil, la journée dépasse — c’est pour ça qu’il n’est pas proposé`, () => {
      const s = composerSemaine(
        { kcal: 1200, proteinG: 100 },
        [],
        FOOD_LIBRARY,
        '2026-11-26',
        new Set(),
        n,
      );
      expect(Math.max(...s.jours.map((j) => kcalDe(j) / 1200 - 1))).toBeGreaterThan(0.1);
    });
  }

  it('le nombre proposé dépend de la cible ; un nombre refusé retombe sur le plus grand qui tient', () => {
    expect(nombresPossibles(1400)).toEqual([4]);
    expect(nombresPossibles(1499)).toEqual([4]);
    expect(nombresPossibles(1500)).toEqual([4, 5]);
    expect(nombresPossibles(1899)).toEqual([4, 5]);
    expect(nombresPossibles(1900)).toEqual([4, 5, 6]);
    expect(nombreAdmis(6, 2150)).toBe(6);
    expect(nombreAdmis(6, 1850)).toBe(5);
    expect(nombreAdmis(6, 1400)).toBe(4);
    expect(nombreAdmis(5, 1400)).toBe(4);
    expect(nombreAdmis(4, 1200)).toBe(4);
  });

  it('la part d’un repas se lit au nombre de repas de la semaine', () => {
    expect(partDe('pdej')).toBe(0.25);
    expect(partDe('pdej', 5)).toBe(0.2);
    expect(partDe('pdej', 6)).toBe(0.175);
    expect(partDe('collation1')).toBeNull();
    expect(partDe('collation1', 5)).toBe(0.15);
    expect(partDe('collation3', 5)).toBeNull();
    expect(partDe('collation3', 6)).toBe(0.125);
  });

  it('la collation du soir compte partout : total du jour, repas cochés, courses', () => {
    const s = composerSemaine(
      { kcal: 2600, proteinG: 170 },
      [],
      FOOD_LIBRARY,
      '2026-11-26',
      new Set(),
      6,
    );
    const jour = s.jours[0]!;
    const soir = jour.collation3!;
    expect(soir.length).toBeGreaterThan(0);
    const sans: JourneePerso = { ...jour, collation3: [] };
    const kcalSoir = kcalDe(jour) - kcalDe(sans);
    expect(kcalSoir).toBeGreaterThan(200);
    expect(mangeDesRepas(jour, new Set(['collation3'] as const), FOOD_LIBRARY).kcal).toBeCloseTo(
      kcalSoir,
      0,
    );
    expect(journeeVide({ collation3: soir })).toBe(false);
    // Les courses : retirer la collation du soir des 7 jours retire des grammes.
    const total = (x: typeof s) =>
      listeDeCourses(x, FOOD_LIBRARY)
        .rayons.flatMap((r) => r.articles)
        .reduce((a, l) => a + l.quantite, 0);
    expect(total(s)).toBeGreaterThan(
      total({ ...s, jours: s.jours.map((j) => ({ ...j, collation3: [] })) }),
    );
  });
});
