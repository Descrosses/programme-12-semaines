/**
 * Ce que la personne ne mange pas (`regles-repas-automatiques.md` §4).
 *
 * Ce que ces tests figent :
 * - les allergies écrites PRÉ-COCHENT ce qu'elles nomment, et rendent le
 *   reste mot pour mot (« kiwi ») — rien n'est deviné ;
 * - un repas avec UN SEUL aliment écarté n'entre jamais dans la semaine,
 *   même pour remplir un créneau (le créneau reste vide) ;
 * - le bandeau sait quels aliments écartés restent dans une semaine.
 */
import { describe, expect, it } from 'vitest';
import { BIBLIOTHEQUE_REPAS } from '../data/bibliothequeRepas';
import { EXCLUSIONS, type ExclusionId } from '../data/exclusionsRepas';
import { FOOD_LIBRARY } from '../data/foodLibrary';
import {
  alimentsExclus,
  exclusDansSemaine,
  lireAllergies,
  normaliser,
  repasExclu,
} from './exclusionsRepas';
import { composerSemaine } from './semaineRepas';

const semaine = (ex: readonly ExclusionId[]) =>
  composerSemaine(
    { kcal: 2150, proteinG: 180 },
    [],
    FOOD_LIBRARY,
    '2026-11-26',
    alimentsExclus(ex),
  );
const aliments = (s: ReturnType<typeof semaine>) =>
  new Set(s.jours.flatMap((j) => Object.values(j).flatMap((l) => l!.map((x) => x.foodId))));

describe('lire les allergies écrites', () => {
  it('ce qui est nommé est reconnu, casse et accents ignorés', () => {
    expect(lireAllergies('Arachide').exclusions).toEqual(['arachide']);
    expect(lireAllergies('CACAHUETES').exclusions).toEqual(['arachide']);
    expect(lireAllergies('intolérance au lactose').exclusions).toEqual(['laitiers']);
    expect(lireAllergies('maladie cœliaque et noix').exclusions).toEqual(['fruitsCoque', 'gluten']);
    expect(lireAllergies('Je suis végétarien').exclusions).toEqual(['viande', 'poisson']);
    expect(lireAllergies('vegan').exclusions).toEqual(['viande', 'poisson', 'oeufs', 'laitiers']);
  });

  it('le reste est rendu mot pour mot, jamais deviné', () => {
    expect(lireAllergies('Lactose, kiwi ; moutarde')).toEqual({
      exclusions: ['laitiers'],
      nonReconnus: ['kiwi', 'moutarde'],
    });
  });

  it('« aucune », « rien », vide : aucune exclusion, rien de non reconnu', () => {
    for (const t of ['aucune', 'Rien', 'RAS', '', null, undefined]) {
      expect(lireAllergies(t)).toEqual({ exclusions: [], nonReconnus: [] });
    }
  });

  it('« œ » se lit « oe »', () => {
    expect(normaliser('Œufs')).toBe('oeufs');
    expect(lireAllergies('œufs').exclusions).toEqual(['oeufs']);
  });
});

describe('la semaine sans ce que la personne ne mange pas', () => {
  it('chaque exclusion, seule : aucun aliment écarté dans les 7 jours', () => {
    for (const e of EXCLUSIONS) {
      const vus = aliments(semaine([e.id]));
      for (const id of e.aliments) expect(vus.has(id), `${e.nom} → ${id}`).toBe(false);
    }
  });

  it('un seul aliment écarté suffit à écarter le repas', () => {
    const r = BIBLIOTHEQUE_REPAS.find((x) => x.id === 'porridge-banane-cacahuete')!;
    expect(repasExclu(r, alimentsExclus(['arachide']))).toBe(true);
    expect(repasExclu(r, alimentsExclus(['viande']))).toBe(false);
  });

  it('un créneau sans repas possible reste VIDE, jamais rempli par un repas écarté', () => {
    // Depuis la grille du 27 novembre, AUCUNE combinaison des 7 familles ne
    // vide un créneau (voir regles-repas-automatiques.md §5). Le cas est
    // donc FABRIQUÉ : tout aliment d'un petit-déjeuner ou d'une collation est
    // écarté, sauf ceux d'un plat, qui reste possible.
    const plat = BIBLIOTHEQUE_REPAS.find((r) => r.id === 'poulet-riz-brocolis')!;
    const garde = new Set(plat.lignes.map((l) => l.foodId));
    const exclus = new Set(
      BIBLIOTHEQUE_REPAS.filter((r) => r.creneaux.some((c) => c !== 'dejeuner' && c !== 'diner'))
        .flatMap((r) => r.lignes.map((l) => l.foodId))
        .filter((id) => !garde.has(id)),
    );
    // Précondition : plus aucun petit-déjeuner ni collation possible.
    const possibles = BIBLIOTHEQUE_REPAS.filter(
      (r) => r.creneaux.includes('pdej') || r.creneaux.includes('collation2'),
    ).filter((r) => !repasExclu(r, exclus));
    expect(possibles.map((r) => r.id)).toEqual([]);
    const s = composerSemaine(
      { kcal: 2150, proteinG: 180 },
      [],
      FOOD_LIBRARY,
      '2026-11-26',
      exclus,
    );
    for (const j of s.jours) {
      expect(j.pdej).toBeUndefined();
      expect(j.collation2).toBeUndefined();
      expect(j.dejeuner).toBeDefined();
    }
    for (const id of exclus) expect(aliments(s).has(id), id).toBe(false);
  });

  it('sans exclusion : la semaine d’avant, à l’identique', () => {
    expect(semaine([])).toEqual(
      composerSemaine({ kcal: 2150, proteinG: 180 }, [], FOOD_LIBRARY, '2026-11-26'),
    );
  });

  it('le bandeau : les aliments écartés encore dans une semaine composée avant', () => {
    const avant = semaine([]);
    expect(exclusDansSemaine(avant, alimentsExclus(['arachide']))).toEqual(['beurreCacahuete']);
    expect(exclusDansSemaine(semaine(['arachide']), alimentsExclus(['arachide']))).toEqual([]);
  });
});
