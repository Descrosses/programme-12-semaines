/**
 * `regles-courses.md` fait foi : ses tableaux sont relus ici et comparés,
 * case par case, aux valeurs du code. Et aucun aliment pesé CUIT de la
 * bibliothèque de repas ne peut arriver dans la liste sans son facteur.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { BIBLIOTHEQUE_REPAS } from './bibliothequeRepas';
import { FOOD_LIBRARY } from './foodLibrary';
import { ARRONDI_COURSES, EN_CONSERVE, RAYONS, RENDEMENTS } from './reglesCourses';

const md = readFileSync(new URL('../../regles-courses.md', import.meta.url), 'utf8');
const nombre = (t: string) => Number(t.replace(/\s/g, '').replace(',', '.'));

function tableau(entete: string): string[][] {
  const lignes = md.split('\n');
  const i = lignes.findIndex((l) => l.startsWith(`| ${entete}`));
  expect(i, entete).toBeGreaterThan(-1);
  const out: string[][] = [];
  for (const l of lignes.slice(i + 2)) {
    if (!l.startsWith('|')) break;
    out.push(
      l
        .split('|')
        .slice(1, -1)
        .map((c) => c.trim()),
    );
  }
  return out;
}

const idDe = (label: string) =>
  Object.entries(FOOD_LIBRARY).find(([, f]) => f.label === label)?.[0];

describe('regles-courses.md ↔ le code', () => {
  it('§1 — chaque facteur et chaque nom d’achat, ligne par ligne', () => {
    const t = tableau('Aliment de l');
    expect(t).toHaveLength(Object.keys(RENDEMENTS).length);
    for (const [aliment, achat, facteur, source] of t) {
      const id = idDe(aliment!);
      expect(id, aliment).toBeDefined();
      expect(RENDEMENTS[id!], aliment).toEqual({ achat, facteur: nombre(facteur!) });
      expect(source, aliment).toBeTruthy();
    }
  });

  it('§1 — aucun aliment pesé cuit des repas sans son facteur', () => {
    const utilises = new Set(BIBLIOTHEQUE_REPAS.flatMap((r) => r.lignes.map((l) => l.foodId)));
    const cuits = [...utilises].filter((id) => FOOD_LIBRARY[id]?.referenceState === 'cuit');
    expect(cuits.length).toBeGreaterThan(0);
    for (const id of cuits) expect(RENDEMENTS[id], id).toBeDefined();
  });

  it('§1 — les légumineuses en conserve', () => {
    expect(md).toContain('existent aussi **en conserve**');
    expect([...EN_CONSERVE].sort()).toEqual(['haricotsRouges', 'lentilles']);
  });

  it('§2 — arrondis vers le haut : 10, puis 50 dès 1 000', () => {
    const t = tableau('Quantité');
    expect(t[0]![0]).toBe('moins de 1 000 g ou ml');
    expect(t[0]![1]).toBe(`${ARRONDI_COURSES.petit} supérieur`);
    expect(t[1]![0]).toBe('1 000 g ou ml et plus');
    expect(t[1]![1]).toBe(`${ARRONDI_COURSES.grand} supérieur`);
    expect(ARRONDI_COURSES.seuil).toBe(1000);
  });

  it('§3 — les rayons, dans l’ordre', () => {
    expect(tableau('Rayon').map(([nom]) => nom)).toEqual(RAYONS.map((r) => r.nom));
  });
});
