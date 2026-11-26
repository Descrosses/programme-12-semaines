/**
 * « Ma liste de courses » à l'écran (lot 3 de la nutrition automatique).
 *
 * Ce que ces tests figent :
 * - la limite honnête est dite en tête (poids prêt à cuire, épluchures en
 *   plus) dès qu'un article est converti ;
 * - un article coché est barré, pas retiré ; la conserve est proposée sous
 *   les légumineuses ; ce qui n'est pas compté est dit ;
 * - les coches vivent sur le téléphone, pour UNE semaine composée ;
 * - le bouton est sous les repas de la semaine, et la fiche d'un plat dit
 *   « quantités de ton repas » en mode semaine.
 */
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FOOD_LIBRARY } from '../data/foodLibrary';
import { listeDeCourses } from '../engine/courses';
import { ecrireCoches, lireCoches } from '../state/coursesCochees';
import { ContenuCourses } from './ListeCourses';

const semaine = {
  jours: [
    {
      dejeuner: [
        { foodId: 'riz', qty: 298 },
        { foodId: 'lentilles', qty: 273 },
        { foodId: 'avoine', qty: null },
      ],
    },
  ],
  cible: { kcal: 2000, proteinG: 150 },
  creeLe: '2026-11-26',
};
const texte = (h: string) => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

beforeEach(() => {
  const store = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  });
});

describe('la liste à l’écran', () => {
  const rendu = (coches: string[]) =>
    renderToStaticMarkup(
      <ContenuCourses
        liste={listeDeCourses(semaine, FOOD_LIBRARY)}
        coches={new Set(coches)}
        onBasculer={() => {}}
      />,
    );

  it('la limite dite en tête, la conserve sous les légumineuses, le non-compté', () => {
    const t = texte(rendu([]));
    expect(t).toContain('poids prêt à cuire, prévois les épluchures et les parures en plus');
    expect(t).toContain('Riz blanc (cru) 100 g');
    expect(t).toContain('ou 280 g en conserve, égouttées');
    expect(t).toContain('1 aliment sans quantité n’est pas compté.');
  });

  it('coché = barré, pas retiré', () => {
    const h = rendu(['riz']);
    expect(h).toMatch(/<li[^>]*data-coche="true"[^>]*>.*Riz blanc \(cru\)/);
    expect(texte(h)).toContain('Riz blanc (cru)');
    expect(h.match(/type="checkbox"/g)).toHaveLength(2);
  });
});

describe('les coches, sur ce téléphone', () => {
  it('relues pour la même semaine, vierges pour une autre', () => {
    ecrireCoches('2026-11-26', new Set(['riz', 'poulet']));
    expect([...lireCoches('2026-11-26')].sort()).toEqual(['poulet', 'riz']);
    expect(lireCoches('2026-11-27').size).toBe(0);
  });

  it('un stockage illisible = rien de coché', () => {
    localStorage.setItem('p12s:courses-cochees', '{pas du json');
    expect(lireCoches('2026-11-26').size).toBe(0);
  });
});

describe('le câblage', () => {
  it('« Ma liste de courses » sous les repas de la semaine', () => {
    const src = readFileSync(new URL('./SemaineRepasSection.tsx', import.meta.url), 'utf8');
    expect(src).toContain('Ma liste de courses');
    expect(src).toContain('<ListeCourses semaine={semaine} catalogue={catalogue}');
  });

  it('en mode semaine, la fiche d’un plat montre les quantités du repas', () => {
    const src = readFileSync(new URL('./PlanPerso.tsx', import.meta.url), 'utf8');
    expect(src).toContain('setFiche(semaine ? { ...plat, lignes } : plat)');
    expect(src).toContain("legende: 'Ingrédients · quantités de ton repas'");
  });
});
