/**
 * §3 de `regles-repas-automatiques.md` — au plus un repas au tofu par jour
 * (Guillaume, 27 novembre : « go limite tofu »). Seule exception à « le même
 * aliment plusieurs fois dans la journée est accepté ».
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { BIBLIOTHEQUE_REPAS } from '../data/bibliothequeRepas';
import type { ExclusionId } from '../data/exclusionsRepas';
import { FOOD_LIBRARY } from '../data/foodLibrary';
import { NOMBRES_DE_REPAS, UN_REPAS_PAR_JOUR } from '../data/reglesRepasAutomatiques';
import { alimentsExclus } from './exclusionsRepas';
import { macrosDeJournee } from './planPersoTotaux';
import { choisirRepasSemaine, composerSemaine, creneauxDe } from './semaineRepas';

const md = readFileSync(new URL('../../regles-repas-automatiques.md', import.meta.url), 'utf8');
const parId = new Map(BIBLIOTHEQUE_REPAS.map((r) => [r.id, r]));
const auTofu = (id: string | undefined) =>
  id !== undefined && parId.get(id)!.lignes.some((l) => l.foodId === 'tofu');

const PROFILS: [string, ExclusionId[]][] = [
  ['tout', []],
  ['végétarien', ['viande', 'poisson']],
  ['végétalien', ['viande', 'poisson', 'oeufs', 'laitiers']],
  ['sans laitiers', ['laitiers']],
  ['sans gluten', ['gluten']],
];
const CIBLES = [
  { kcal: 1200, proteinG: 100 },
  { kcal: 1500, proteinG: 110 },
  { kcal: 2150, proteinG: 180 },
  { kcal: 2600, proteinG: 150 },
  { kcal: 3200, proteinG: 200 },
];

describe('§3 — au plus un repas au tofu par jour', () => {
  it('le .md l’écrit, le code ne limite que le tofu', () => {
    expect(md).toContain('**au plus un repas au\n   tofu par jour**');
    expect(md).toContain('**Une seule exception : au plus un repas au tofu par jour**');
    expect(md).toContain('et en tout dernier la limite du tofu');
    expect(UN_REPAS_PAR_JOUR).toEqual(['tofu']);
  });

  it('jamais deux repas au tofu le même jour : 5 profils × 5 cibles × 4, 5 et 6 repas', () => {
    for (const [nom, ex] of PROFILS)
      for (const cible of CIBLES)
        for (const n of NOMBRES_DE_REPAS) {
          const jours = choisirRepasSemaine(
            [],
            cible,
            FOOD_LIBRARY,
            alimentsExclus(ex),
            creneauxDe(n),
          );
          for (const [i, j] of jours.entries()) {
            const nb = Object.values(j).filter(auTofu).length;
            expect(
              nb,
              `${nom}, ${String(cible.kcal)} kcal, ${String(n)} repas, jour ${String(i)}`,
            ).toBeLessThanOrEqual(1);
          }
        }
  });

  it('le tofu reste servi : la limite n’est pas une exclusion', () => {
    const jours = choisirRepasSemaine(
      [],
      { kcal: 2150, proteinG: 180 },
      FOOD_LIBRARY,
      alimentsExclus(['viande', 'poisson', 'oeufs', 'laitiers']),
    );
    expect(jours.filter((j) => Object.values(j).some(auTofu)).length).toBe(7);
  });

  it('végétalien à 180 g : au moins 110 g de protéines chaque jour (mesuré avec les portions maximales du §2 : 116 à 124)', () => {
    const s = composerSemaine(
      { kcal: 2150, proteinG: 180 },
      [],
      FOOD_LIBRARY,
      '2026-11-27',
      alimentsExclus(['viande', 'poisson', 'oeufs', 'laitiers']),
    );
    for (const j of s.jours) {
      expect(macrosDeJournee(j, FOOD_LIBRARY).proteinG).toBeGreaterThanOrEqual(110);
      const tofu = Object.values(j)
        .flatMap((l) => l!)
        .filter((x) => x.foodId === 'tofu')
        .reduce((a, x) => a + (x.qty ?? 0), 0);
      expect(tofu).toBeLessThanOrEqual(400);
    }
  });

  it('relâchée en tout dernier : un créneau n’est jamais laissé vide pour elle', () => {
    // Fabriqué : seuls les aliments des repas au tofu restent permis. Les
    // créneaux n'ont presque plus que des repas au tofu : la limite cède,
    // aucun créneau ne reste vide.
    const permis = new Set(
      BIBLIOTHEQUE_REPAS.filter((r) => auTofu(r.id)).flatMap((r) => r.lignes.map((l) => l.foodId)),
    );
    const exclus = new Set(Object.keys(FOOD_LIBRARY).filter((id) => !permis.has(id)));
    const jours = choisirRepasSemaine([], { kcal: 2150, proteinG: 150 }, FOOD_LIBRARY, exclus);
    for (const j of jours) expect(Object.keys(j)).toHaveLength(4);
    expect(Math.max(...jours.map((j) => Object.values(j).filter(auTofu).length))).toBeGreaterThan(
      1,
    );
  });
});
