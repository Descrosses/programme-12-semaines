/**
 * §4 de `regles-repas-automatiques.md` (ce que la personne ne mange pas) :
 * le tableau du .md est relu ligne par ligne et comparé au code. Et aucun
 * aliment de la bibliothèque qui appartient à une famille écartable ne peut
 * échapper à son exclusion.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { BIBLIOTHEQUE_REPAS } from './bibliothequeRepas';
import { EXCLUSIONS } from './exclusionsRepas';
import { FOOD_LIBRARY } from './foodLibrary';

const md = readFileSync(new URL('../../regles-repas-automatiques.md', import.meta.url), 'utf8');
const s4 = md.slice(md.indexOf('## 4.'), md.indexOf('## 5.'));
const lignes = s4
  .split('\n')
  .filter((l) => l.startsWith('| ') && !l.startsWith('| Exclusion') && !l.startsWith('|---'))
  .map((l) =>
    l
      .split('|')
      .slice(1, -1)
      .map((c) => c.trim()),
  );
const liste = (c: string) => c.split(',').map((x) => x.trim().toLowerCase());
const libelle = (id: string) =>
  FOOD_LIBRARY[id]!.label.toLowerCase()
    .replace(/ cuit(e)?s?$/, '')
    .replace(/ maigre$/, '')
    .replace(/ nature$/, '')
    .replace(/ 3 %$/, '')
    .replace(/ entier$/, '')
    .replace(/ demi-écrémé$/, '')
    .replace(/ à tartiner$/, '')
    .replace(/ au naturel$/, '')
    .replace('’', "'");

describe('§4 — le tableau du .md = le code', () => {
  it('les mêmes exclusions, dans le même ordre', () => {
    expect(lignes.map(([nom]) => nom)).toEqual(EXCLUSIONS.map((e) => e.nom));
  });

  it('les aliments écartés, ligne par ligne', () => {
    EXCLUSIONS.forEach((e, i) => {
      expect(e.aliments.map(libelle).sort(), e.nom).toEqual(liste(lignes[i]![1]!).sort());
    });
  });

  it('les mots reconnus, ligne par ligne', () => {
    EXCLUSIONS.forEach((e, i) => {
      expect([...e.mots].sort(), e.nom).toEqual(liste(lignes[i]![2]!).sort());
    });
  });

  it('chaque aliment écarté existe au catalogue', () => {
    for (const e of EXCLUSIONS)
      for (const id of e.aliments) expect(FOOD_LIBRARY[id], id).toBeDefined();
  });

  it('aucune viande, aucun poisson, aucun laitier des repas n’échappe à son exclusion', () => {
    const utilises = new Set(BIBLIOTHEQUE_REPAS.flatMap((r) => r.lignes.map((l) => l.foodId)));
    const famille = (cat: string) =>
      [...utilises].filter((id) => FOOD_LIBRARY[id]?.category === cat);
    const ecartes = (id: string) =>
      EXCLUSIONS.find((e) => e.id === id)!.aliments as readonly string[];
    for (const id of famille('laitier')) expect(ecartes('laitiers'), id).toContain(id);
    for (const id of famille('proteine')) {
      // La whey est rangée « protéine » au catalogue, mais c'est du LAIT : une
      // personne qui écarte les laitiers ne doit jamais la recevoir.
      if (id === 'whey') {
        expect(ecartes('laitiers'), id).toContain(id);
        continue;
      }
      expect([...ecartes('viande'), ...ecartes('poisson'), ...ecartes('oeufs')], id).toContain(id);
    }
    // Garde-fou du 27 novembre : la whey est bien servie par la bibliothèque.
    expect(utilises.has('whey')).toBe(true);
    // Tout ce qui se fait avec de la farine de blé ou de l'avoine. Les
    // féculents SANS gluten sont nommés un par un : un nouveau féculent doit
    // être classé, jamais oublié.
    const sansGluten = ['riz', 'pommesDeTerre', 'pataeDouce', 'quinoa', 'galettesRiz'];
    for (const id of famille('feculent').filter((x) => !sansGluten.includes(x))) {
      expect(ecartes('gluten'), id).toContain(id);
    }
  });
});
