/**
 * `regles-repas-automatiques.md` fait foi : ses tableaux sont relus ici et
 * comparés, case par case, aux valeurs du code.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { REPAS_PERSO } from './planPerso';
import { ARRONDIS, CRENEAUX_AUTO, LEVIERS, TOLERANCE_PART } from './reglesRepasAutomatiques';

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
  it('§1 — les repas composés et leur part', () => {
    const t = tableau('Repas');
    const nomDe = (id: string) => REPAS_PERSO.find((r) => r.id === id)!.nom.replace('’', "'");
    expect(t.map(([nom]) => nom)).toEqual(CRENEAUX_AUTO.map((c) => nomDe(c.repas)));
    expect(t.map(([, part]) => nombre(part!) / 100)).toEqual(CRENEAUX_AUTO.map((c) => c.part));
    expect(CRENEAUX_AUTO.reduce((a, c) => a + c.part, 0)).toBeCloseTo(1, 10);
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
