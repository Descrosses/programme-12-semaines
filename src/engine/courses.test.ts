/**
 * La liste de courses (`regles-courses.md`).
 *
 * Ce que ces tests figent :
 * - §1 : le pesé-cuit devient du poids cru (÷ facteur), le reste garde son
 *   poids ; les légumineuses donnent aussi leur poids en conserve ;
 * - §2 : toujours arrondi VERS LE HAUT (10, puis 50 dès 1 000) ;
 * - §3 : rayons dans l'ordre, articles par ordre alphabétique, œufs à la
 *   crèmerie, pain à la boulangerie ;
 * - une ligne sans quantité n'est pas comptée, et c'est dit ;
 * - la liste suit la semaine TELLE QU'ELLE EST (changements compris).
 */
import { describe, expect, it } from 'vitest';
import { FOOD_LIBRARY, type LibraryFood } from '../data/foodLibrary';
import type { JourneePerso } from '../data/planPerso';
import { RENDEMENTS } from '../data/reglesCourses';
import {
  afficherQuantite,
  arrondirCourses,
  listeDeCourses,
  texteDeLaListe,
  type ListeCourses,
} from './courses';
import { composerSemaine, type SemaineRepas } from './semaineRepas';

const semaineDe = (jours: JourneePerso[]): SemaineRepas => ({
  jours,
  cible: { kcal: 2000, proteinG: 150 },
  creeLe: '2026-11-26',
});
const article = (l: ListeCourses, id: string) =>
  l.rayons.flatMap((r) => r.articles).find((a) => a.foodId === id);

describe('arrondis et affichage (§2)', () => {
  it('toujours vers le haut', () => {
    expect(arrondirCourses(470, 'g')).toBe(470);
    expect(arrondirCourses(470.2, 'g')).toBe(480);
    expect(arrondirCourses(999.5, 'g')).toBe(1000);
    expect(arrondirCourses(1000, 'g')).toBe(1000);
    expect(arrondirCourses(1001, 'ml')).toBe(1050);
    expect(arrondirCourses(4.2, 'unité')).toBe(5);
    expect(arrondirCourses(5, 'unité')).toBe(5);
  });

  it('g, kg, ml, L, pièces', () => {
    expect(afficherQuantite(480, 'g')).toBe('480 g');
    expect(afficherQuantite(1250, 'g')).toBe('1,25 kg');
    expect(afficherQuantite(1500, 'ml')).toBe('1,5 L');
    expect(afficherQuantite(310, 'ml')).toBe('310 ml');
    expect(afficherQuantite(7, 'unité')).toBe('7');
  });
});

describe('la liste de la semaine', () => {
  const s = semaineDe([
    {
      dejeuner: [
        { foodId: 'riz', qty: 298 },
        { foodId: 'poulet', qty: 80 },
        { foodId: 'huile', qty: 10 },
      ],
      diner: [
        { foodId: 'lentilles', qty: 273 },
        { foodId: 'oeuf', qty: 2 },
        { foodId: 'pain', qty: 50 },
      ],
    },
    {
      pdej: [
        { foodId: 'skyr', qty: 200 },
        { foodId: 'banane', qty: 1 },
        { foodId: 'avoine', qty: null },
      ],
      diner: [
        { foodId: 'riz', qty: 298 },
        { foodId: 'inconnu', qty: 100 },
      ],
    },
  ]);
  const l = listeDeCourses(s, FOOD_LIBRARY);

  it('§1 — le cuit devient cru, le reste garde son poids', () => {
    expect(article(l, 'riz')).toMatchObject({
      nom: 'Riz blanc (cru)',
      quantite: 200,
      converti: true,
    });
    expect(article(l, 'poulet')).toMatchObject({ nom: 'Blanc de poulet (cru)', quantite: 100 });
    expect(article(l, 'skyr')).toMatchObject({
      nom: 'Skyr nature',
      quantite: 200,
      converti: false,
    });
    expect(article(l, 'banane')).toMatchObject({ quantite: 1, unite: 'unité' });
  });

  it('§1 — légumineuses : sèches, ou en conserve (≈ cuit)', () => {
    expect(article(l, 'lentilles')).toMatchObject({
      nom: 'Lentilles (sèches)',
      quantite: 100,
      conserve: 280,
    });
    expect(article(l, 'riz')?.conserve).toBeUndefined();
  });

  it('§3 — rayons dans l’ordre, alphabétique dedans, œufs et pain à leur place', () => {
    expect(l.rayons.map((r) => r.id)).toEqual([
      'viandes',
      'cremerie',
      'fruitsLegumes',
      'epicerie',
      'boulangerie',
    ]);
    expect(l.rayons.find((r) => r.id === 'cremerie')!.articles.map((a) => a.foodId)).toEqual([
      'oeuf', // « Œuf entier » : Œ se range comme OE, avant S
      'skyr',
    ]);
    expect(l.rayons.find((r) => r.id === 'boulangerie')!.articles.map((a) => a.foodId)).toEqual([
      'pain',
    ]);
    const epicerie = l.rayons.find((r) => r.id === 'epicerie')!.articles.map((a) => a.nom);
    expect(epicerie).toEqual([...epicerie].sort((a, b) => a.localeCompare(b, 'fr')));
  });

  it('une ligne sans quantité n’est pas comptée, et c’est dit ; un inconnu est ignoré', () => {
    expect(l.sansQuantite).toBe(1);
    expect(article(l, 'avoine')).toBeUndefined();
    expect(article(l, 'inconnu')).toBeUndefined();
  });

  it('un aliment ajouté à la main garde son poids, dans le rayon de sa famille', () => {
    const perso: LibraryFood = {
      ...FOOD_LIBRARY.poulet!,
      id: 'custom-1',
      label: 'Steak de soja',
      isCustom: true,
    };
    const l2 = listeDeCourses(semaineDe([{ diner: [{ foodId: 'custom-1', qty: 150 }] }]), {
      ...FOOD_LIBRARY,
      'custom-1': perso,
    });
    expect(article(l2, 'custom-1')).toMatchObject({ nom: 'Steak de soja', quantite: 150 });
    expect(l2.rayons[0]!.id).toBe('viandes');
  });

  it('le texte partagé', () => {
    const t = texteDeLaListe(l, 'Mes courses');
    expect(
      t.startsWith('Mes courses\n\nViandes et poissons\n– Blanc de poulet (cru) : 100 g'),
    ).toBe(true);
    expect(t).toContain('Épicerie\n');
    expect(t).toContain('– Riz blanc (cru) : 200 g');
  });

  it('une vraie semaine : chaque article converti = total cuit ÷ facteur, arrondi au-dessus', () => {
    const vraie = composerSemaine({ kcal: 2150, proteinG: 180 }, [], FOOD_LIBRARY, '2026-11-26');
    const cuit = new Map<string, number>();
    for (const j of vraie.jours) {
      for (const lignes of Object.values(j)) {
        for (const x of lignes!) cuit.set(x.foodId, (cuit.get(x.foodId) ?? 0) + x.qty!);
      }
    }
    const lv = listeDeCourses(vraie, FOOD_LIBRARY);
    for (const a of lv.rayons.flatMap((r) => r.articles)) {
      const brut = cuit.get(a.foodId)! / (RENDEMENTS[a.foodId]?.facteur ?? 1);
      expect(a.quantite, a.foodId).toBeGreaterThanOrEqual(brut - 1e-6);
      expect(a.quantite - brut, a.foodId).toBeLessThan(a.quantite >= 1000 ? 50 : 10);
    }
  });
});
