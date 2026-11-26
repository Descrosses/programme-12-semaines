/**
 * `regles-repas-automatiques.md` fait foi : ses tableaux sont relus ici et
 * comparés, case par case, aux valeurs du code.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { REPAS_JOURNEE } from './planPerso';
import {
  ARRONDIS,
  CIBLE_MINIMALE,
  CRENEAUX_AUTO,
  CRENEAUX_PAR_NOMBRE,
  LEVIERS,
  NOMBRE_DE_REPAS_PAR_DEFAUT,
  NOMBRES_DE_REPAS,
  TOLERANCE_PART,
} from './reglesRepasAutomatiques';

const md = readFileSync(new URL('../../regles-repas-automatiques.md', import.meta.url), 'utf8');
const nombre = (t: string) => Number(t.replace(/[×%\s]/g, '').replace(',', '.'));

/** Les lignes d'un tableau dont l'en-tête commence par `entete`. */
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

describe('regles-repas-automatiques.md ↔ le code', () => {
  it('§1 — les repas composés et leur part, pour 4, 5 et 6 repas', () => {
    const t = tableau('Repas |');
    const nomDe = (id: string) => REPAS_JOURNEE.find((r) => r.id === id)!.nom.replace('’', "'");
    // Les six repas de la journée, dans l'ordre : une ligne chacun.
    expect(t.map(([nom]) => nom)).toEqual(REPAS_JOURNEE.map((r) => nomDe(r.id)));
    NOMBRES_DE_REPAS.forEach((n, col) => {
      // « — » : le repas n'est pas composé pour ce nombre.
      const lus = t
        .filter((l) => l[col + 1] !== '—')
        .map((l) => ({ nom: l[0], part: nombre(l[col + 1]!) / 100 }));
      const code = CRENEAUX_PAR_NOMBRE[n];
      expect(lus, `${String(n)} repas`).toEqual(
        code.map((c) => ({ nom: nomDe(c.repas), part: c.part })),
      );
      expect(code, `${String(n)} repas`).toHaveLength(n);
      expect(
        code.reduce((a, c) => a + c.part, 0),
        `${String(n)} repas`,
      ).toBeCloseTo(1, 10);
    });
    expect(CRENEAUX_AUTO).toBe(CRENEAUX_PAR_NOMBRE[4]);
    expect(NOMBRE_DE_REPAS_PAR_DEFAUT).toBe(4);
    expect(md).toContain('(4 par défaut)');
  });

  it('§1 — la cible minimale pour 5 et 6 repas', () => {
    const t = tableau('Nombre de repas');
    expect(t.map(([n]) => Number(n))).toEqual([...NOMBRES_DE_REPAS]);
    expect(t.map(([, c]) => (c === 'aucune' ? 0 : nombre(c!.replace('kcal', ''))))).toEqual(
      NOMBRES_DE_REPAS.map((n) => CIBLE_MINIMALE[n]),
    );
  });

  it('§2 — les bornes des deux leviers', () => {
    const t = tableau('Levier');
    expect(t).toHaveLength(2);
    expect([nombre(t[0]![1]!), nombre(t[0]![2]!)]).toEqual([
      LEVIERS.proteines.min,
      LEVIERS.proteines.max,
    ]);
    expect([nombre(t[1]![1]!), nombre(t[1]![2]!)]).toEqual([LEVIERS.reste.min, LEVIERS.reste.max]);
  });

  it('§2 — arrondis et minimums', () => {
    const t = tableau('Unité');
    expect([nombre(t[0]![1]!), nombre(t[0]![2]!)]).toEqual([ARRONDIS.g!.pas, ARRONDIS.g!.min]);
    expect(ARRONDIS.ml).toEqual(ARRONDIS.g);
    expect([nombre(t[1]![1]!), nombre(t[1]![2]!)]).toEqual([
      ARRONDIS['unité']!.pas,
      ARRONDIS['unité']!.min,
    ]);
  });

  it('§3 — la tolérance de ± 10 %', () => {
    expect(md).toContain('qui tiennent leur part à ± 10 %');
    expect(TOLERANCE_PART).toBe(0.1);
  });
});
