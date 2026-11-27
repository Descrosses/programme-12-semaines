/**
 * §5 de `regles-repas-automatiques.md` — la grille de la bibliothèque.
 *
 * Chaque exclusion seule laisse au moins 7 repas par type, chaque paire au
 * moins 5. Le .md fait foi : ses deux tableaux (la grille, les quatre
 * aliments NEVO) sont relus ici.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { alimentsExclus, lireAllergies, repasExclu } from '../engine/exclusionsRepas';
import { BIBLIOTHEQUE_REPAS } from './bibliothequeRepas';
import { EXCLUSIONS, type ExclusionId } from './exclusionsRepas';
import { FOOD_LIBRARY } from './foodLibrary';
import { GRILLE_BIBLIOTHEQUE } from './reglesRepasAutomatiques';

const md = readFileSync(new URL('../../regles-repas-automatiques.md', import.meta.url), 'utf8');
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

const TYPES = [
  { nom: 'petit-déjeuner', creneau: 'pdej' },
  { nom: 'collation', creneau: 'collation1' },
  { nom: 'plat', creneau: 'dejeuner' },
] as const;

/** Les repas possibles de chaque type, ces exclusions cochées. */
function possibles(ex: readonly ExclusionId[]): Record<string, number> {
  const exclus = alimentsExclus(ex);
  return Object.fromEntries(
    TYPES.map(({ nom, creneau }) => [
      nom,
      BIBLIOTHEQUE_REPAS.filter(
        (r) => (r.creneaux as readonly string[]).includes(creneau) && !repasExclu(r, exclus),
      ).length,
    ]),
  );
}

const ids = EXCLUSIONS.map((e) => e.id);
const paires = ids.flatMap((a, i) => ids.slice(i + 1).map((b) => [a, b] as const));

describe('§5 — la grille de la bibliothèque', () => {
  it('le tableau du .md = le code', () => {
    const t = tableau('Exclusions cochées');
    expect(t.map(([qui, n]) => [qui, nombre(n!)])).toEqual([
      ['une seule (chacune des 7)', GRILLE_BIBLIOTHEQUE.seule],
      ['deux (chacune des 21 paires)', GRILLE_BIBLIOTHEQUE.paire],
    ]);
    expect(ids).toHaveLength(7);
    expect(paires).toHaveLength(21);
  });

  it('chaque exclusion seule laisse au moins 7 repas par type', () => {
    for (const e of ids)
      for (const [type, n] of Object.entries(possibles([e])))
        expect(n, `sans ${e} : ${type}`).toBeGreaterThanOrEqual(GRILLE_BIBLIOTHEQUE.seule);
  });

  it('chaque paire d’exclusions laisse au moins 5 repas par type', () => {
    for (const p of paires)
      for (const [type, n] of Object.entries(possibles(p)))
        expect(n, `sans ${p.join(' ni ')} : ${type}`).toBeGreaterThanOrEqual(
          GRILLE_BIBLIOTHEQUE.paire,
        );
  });

  it('les quatre aliments de la grille : les valeurs NEVO du .md, au dixième près', () => {
    const t = tableau('Aliment | kcal');
    expect(t).toHaveLength(4);
    for (const [nom, kcal, p, g, l] of t) {
      const f = Object.values(FOOD_LIBRARY).find((x) => x.label === nom);
      expect(f, nom).toBeDefined();
      expect([f!.kcal, f!.proteinG, f!.carbsG, f!.fatG], nom).toEqual(
        [kcal, p, g, l].map((x) => nombre(x!)),
      );
    }
  });

  it('pas d’exclusion « soja » : décision écrite, et le mot reste non reconnu', () => {
    expect(md).toContain("**Pas d'exclusion « soja »** (décision de Guillaume)");
    expect(EXCLUSIONS.some((e) => /soja/i.test(e.nom))).toBe(false);
    expect(lireAllergies('soja')).toEqual({ exclusions: [], nonReconnus: ['soja'] });
  });
});
