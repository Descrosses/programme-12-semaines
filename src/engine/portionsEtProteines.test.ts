/**
 * `regles-repas-automatiques.md` §2 (portions maximales, « go plafonds ») et
 * §6 (l'encadré quand la semaine manque ses protéines). Le .md fait foi.
 */
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import type { ExclusionId } from '../data/exclusionsRepas';
import { FOOD_LIBRARY } from '../data/foodLibrary';
import { ALERTE_PROTEINES, PORTION_MAXIMALE } from '../data/reglesRepasAutomatiques';
import { SemaineRepasSection } from '../components/SemaineRepasSection';
import { alimentsExclus } from './exclusionsRepas';
import { macrosDeJournee } from './planPersoTotaux';
import {
  alerteProteines,
  composerSemaine,
  phraseAlerteProteines,
  type SemaineRepas,
} from './semaineRepas';

const md = readFileSync(new URL('../../regles-repas-automatiques.md', import.meta.url), 'utf8');
const nombre = (t: string) => Number(t.replace(/[^\d,]/g, '').replace(',', '.'));

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

const VEGETALIEN: ExclusionId[] = ['viande', 'poisson', 'oeufs', 'laitiers'];
const VEGETARIEN: ExclusionId[] = ['viande', 'poisson'];
const PROFILS: ExclusionId[][] = [[], VEGETARIEN, VEGETALIEN, ['laitiers'], ['gluten']];
const CIBLES = [
  { kcal: 1200, proteinG: 100 },
  { kcal: 1800, proteinG: 140 },
  { kcal: 2150, proteinG: 180 },
  { kcal: 3200, proteinG: 200 },
  { kcal: 3800, proteinG: 220 },
];
const semaine = (ex: ExclusionId[], n: 4 | 5 | 6 = 4, cible = { kcal: 2150, proteinG: 180 }) =>
  composerSemaine(cible, [], FOOD_LIBRARY, '2026-11-27', alimentsExclus(ex), n);

describe('§2 — portions maximales par repas', () => {
  it('le tableau du .md = le code, ligne par ligne', () => {
    const t = tableau('Aliment | Maximum par repas');
    expect(t).toHaveLength(Object.keys(PORTION_MAXIMALE).length);
    for (const [nom, max] of t) {
      const id = Object.keys(FOOD_LIBRARY).find((k) => FOOD_LIBRARY[k]!.label === nom);
      expect(id, nom).toBeDefined();
      expect(PORTION_MAXIMALE[id!], nom).toBe(nombre(max!));
    }
  });

  it('aucune portion au-dessus de son maximum : 5 profils × 5 cibles × 4, 5 et 6 repas', () => {
    for (const ex of PROFILS)
      for (const cible of CIBLES)
        for (const n of [4, 5, 6] as const)
          for (const j of semaine(ex, n, cible).jours)
            for (const lignes of Object.values(j))
              for (const l of lignes!) {
                const max = PORTION_MAXIMALE[l.foodId];
                if (max !== undefined)
                  expect(
                    l.qty,
                    `${l.foodId} ${ex.join('+')} ${String(cible.kcal)}`,
                  ).toBeLessThanOrEqual(max);
              }
  });

  it('les calories tiennent quand même : chaque jour à ± 6 % (le reste du repas rattrape)', () => {
    for (const ex of PROFILS)
      for (const cible of CIBLES.filter((c) => c.kcal >= 1800))
        for (const j of semaine(ex, 4, cible).jours)
          expect(
            Math.abs(macrosDeJournee(j, FOOD_LIBRARY).kcal / cible.kcal - 1),
            `${ex.join('+')} ${String(cible.kcal)}`,
          ).toBeLessThanOrEqual(0.06);
  });
});

describe('§6 — l’encadré quand la semaine manque ses protéines', () => {
  it('le .md écrit le seuil, le gain et les deux phrases', () => {
    expect(ALERTE_PROTEINES).toEqual({ seuil: 0.9, gainMinimalG: 5 });
    expect(md).toContain('**sous 90 %**');
    expect(md).toContain('**au\n  moins 5 g de plus par jour**');
    const a = {
      moyenneG: 120,
      cibleG: 180,
      nombre: 4 as const,
      mieux: { nombre: 6 as const, moyenneG: 136 },
    };
    const aplat = md.replace(/\s+/g, ' ');
    const modele = (p: string) =>
      p
        .replace('120 g par jour', '{moyenne} g par jour')
        .replace('180 g visés', '{cible} g visés')
        .replace('Avec 4 repas', 'Avec {n} repas')
        .replace('Avec 6 repas', 'Avec {n2} repas')
        .replace('environ 136 g', 'environ {moyenne2} g');
    expect(aplat).toContain(`« ${modele(phraseAlerteProteines(a))} »`);
    expect(aplat).toContain(`« ${modele(phraseAlerteProteines({ ...a, mieux: null }))} »`);
  });

  it('qui mange de tout : rien à dire', () => {
    expect(alerteProteines(semaine([]), [], FOOD_LIBRARY)).toBeNull();
  });

  it('végétarien à 4 repas : 6 repas sont proposés, chiffres à l’appui', () => {
    const a = alerteProteines(semaine(VEGETARIEN), [], FOOD_LIBRARY, alimentsExclus(VEGETARIEN))!;
    expect(a.nombre).toBe(4);
    expect(a.moyenneG).toBeLessThan(180 * 0.9);
    expect(a.mieux).not.toBeNull();
    expect(a.mieux!.moyenneG - a.moyenneG).toBeGreaterThanOrEqual(5);
  });

  it('végétalien à 6 repas : plus rien à gagner, l’encadré le dit sans promettre', () => {
    const a = alerteProteines(
      semaine(VEGETALIEN, 6),
      [],
      FOOD_LIBRARY,
      alimentsExclus(VEGETALIEN),
    )!;
    expect(a.mieux).toBeNull();
    expect(phraseAlerteProteines(a)).toContain('ne peut pas monter plus haut');
  });

  it('sans protéines dans la cible : rien', () => {
    const s: SemaineRepas = { ...semaine(VEGETALIEN), cible: { kcal: 2150, proteinG: null } };
    expect(alerteProteines(s, [], FOOD_LIBRARY)).toBeNull();
  });

  it('à l’écran : l’encadré au-dessus de « + Ajouter un repas », et rien quand la cible a changé', () => {
    const s = semaine(VEGETARIEN);
    const rendu = (cibleActuelle: { kcal: number; proteinG: number }) =>
      renderToStaticMarkup(
        createElement(SemaineRepasSection, {
          semaine: s,
          cibleActuelle,
          jourInitial: 4,
          aujourdhui: '2026-11-27',
          cible: null,
          preferes: [],
          catalogue: FOOD_LIBRARY,
          customs: [],
          onCreateCustom: () => {},
          onChange: () => {},
          onRecomposer: () => {},
          onQuitter: () => {},
          exclusions: VEGETARIEN,
        }),
      );
    const h = rendu({ kcal: 2150, proteinG: 180 });
    expect(h).toContain('data-alerte-proteines="repas"');
    expect(h.indexOf('data-alerte-proteines')).toBeLessThan(h.indexOf('data-ajouter-repas'));
    expect(h).toContain('C’est toi qui décides.');
    expect(rendu({ kcal: 2500, proteinG: 180 })).not.toContain('data-alerte-proteines');
  });
});
