/**
 * Le point des deux semaines à l'écran (lot 4 de la nutrition automatique).
 *
 * Ce que ces tests figent :
 * - pas dû : UNE ligne, la date du prochain point, « 4 matins par semaine » ;
 * - pesées manquantes : les deux compteurs, aucun bouton, « rien n'est
 *   deviné » ;
 * - proposition : le constat AVANT la proposition, la raison avec la borne
 *   du .md, les deux boutons, « jamais une obligation » ;
 * - coach (§6) : aucun chiffre ;
 * - le câblage : profil enregistré à l'acceptation de la cible calculée,
 *   coupé par une fiche du coach ou par « Effacer mes cibles ».
 */
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { patchDeFiche } from '../engine/fiche';
import type { PointDeuxSemaines as Point } from '../engine/reajustement';
import { PointDeuxSemaines, raisonDe, rythmeEnMots } from './PointDeuxSemaines';

const rendu = (point: Point, objectif: 'perte' | 'maintien' | 'prise' = 'perte') =>
  renderToStaticMarkup(
    <PointDeuxSemaines
      point={point}
      objectif={objectif}
      kcalActuelles={2150}
      onAccepter={() => {}}
      onGarder={() => {}}
    />,
  );
const texte = (h: string) => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

describe('le point des deux semaines, à l’écran', () => {
  it('pas dû : une ligne, la date, le geste utile', () => {
    const h = rendu({ cas: 'pas-du', prochainLe: '2026-12-10' });
    expect(h).toMatch(/^<p[^>]*data-point="pas-du"/);
    expect(texte(h)).toContain('Prochain point sur ta cible : le 10 décembre');
    expect(texte(h)).toContain('au moins 4 matins par semaine');
    expect(h).not.toContain('<button');
  });

  it('pesées manquantes : les compteurs, aucun bouton, rien de deviné', () => {
    const h = rendu({ cas: 'pesees', recentes: 3, precedentes: 1 });
    const t = texte(h);
    expect(t).toContain('3 sur les 7 derniers jours, 1 la semaine d’avant');
    expect(t).toContain('Il en faut au moins 4 par semaine');
    expect(t).toContain('Rien n’est deviné');
    expect(h).not.toContain('<button');
    expect(t).not.toContain('kcal');
  });

  it('proposition : le constat, la raison, la cible, deux boutons', () => {
    const h = rendu({
      cas: 'proposition',
      delta: -100,
      cible: { kcal: 2050, proteinG: 180, carbsG: 210, fatG: 55 },
      rythme: -0.0024,
      moyenneKg: 82.3,
    });
    const t = texte(h);
    expect(t).toContain('Point des 2 semaines : − 100 kcal ?');
    expect(t).toContain('Ton poids moyen sur 7 jours : 82,3 kg (− 0,2 % par semaine)');
    expect(t).toContain('Tu perds moins vite que prévu (moins de 0,5 % par semaine).');
    expect(t).toContain('2 050 kcal 180 g P · 210 g G · 55 g L au lieu de 2 150 kcal');
    expect(t.indexOf('Ton poids moyen')).toBeLessThan(t.indexOf('2 050 kcal'));
    expect(h).toContain('>Accepter cette cible<');
    expect(h).toContain('>Garder ma cible<');
    expect(t).toContain('jamais une obligation');
  });

  it('dans le rythme : on ne change rien, un bouton', () => {
    const h = rendu({ cas: 'stable', rythme: -0.007, moyenneKg: 81.9 });
    expect(texte(h)).toContain('on ne change rien');
    expect(texte(h)).toContain('ta cible reste à 2 150 kcal');
    expect(h.match(/<button/g)).toHaveLength(1);
    expect(h).not.toContain('Accepter');
  });

  it('coach (§6) : aucun chiffre', () => {
    const h = rendu({ cas: 'coach' });
    expect(texte(h)).toContain('Ton ajustement sera vu avec Guillaume');
    expect(texte(h)).not.toMatch(/\d/);
    expect(h).not.toContain('Accepter');
  });

  it('les raisons reprennent les bornes du .md, les rythmes se lisent', () => {
    expect(raisonDe('perte', 100)).toContain('plus de 1 % par semaine');
    expect(raisonDe('prise', 100)).toContain('moins de 0,25 % par semaine');
    expect(raisonDe('prise', -100)).toContain('plus de 0,5 % par semaine');
    expect(raisonDe('maintien', -100)).toBe('Ton poids est monté de plus de 1 %.');
    expect(raisonDe('maintien', 100)).toBe('Ton poids est descendu de plus de 1 %.');
    expect(rythmeEnMots(0.0031)).toBe('+ 0,3 % par semaine');
    expect(rythmeEnMots(-0.0001)).toBe('stable');
  });
});

describe('le câblage', () => {
  const lire = (f: string) => readFileSync(new URL(f, import.meta.url), 'utf8');

  it('le profil est enregistré quand la cible calculée est acceptée', () => {
    const src = lire('./CibleCalculee.tsx');
    expect(src).toContain('profilAGarder(proposition.profil, aujourdhui)');
    expect(src).toContain('...(profil !== null ? { profilNutrition: profil } : {})');
    // Une cible acceptée avant le lot 4 : le suivi s'active d'un bouton.
    expect(src).toContain('Activer le point des 2 semaines');
  });

  it('Nutrition : le point seulement avec un profil ET une cible', () => {
    const src = lire('../screens/NutritionScreen.tsx');
    expect(src).toMatch(
      /profil !== null && cibleSemaine !== null && rows !== null\s*\?\s*pointDesDeuxSemaines\(/,
    );
    // Accepter écrit la même cible les deux jours ET referme le point.
    expect(src).toContain('const c = { train: { ...nouvelle }, rest: { ...nouvelle } };');
    expect(src).toContain('await saveSettings({ profilNutrition: suivant, ciblesNutrition: c });');
  });

  it('une fiche du coach avec des cibles, ou « Effacer mes cibles », coupe le point', () => {
    const m = { kcal: 2400, proteinG: 150, carbsG: 300, fatG: 70 };
    const avec = patchDeFiche({
      cibles: { train: m, rest: m },
      aliments: [],
      inconnus: [],
      problemes: [],
    } as never);
    expect(avec.profilNutrition).toBeNull();
    const sans = patchDeFiche({
      cibles: null,
      aliments: ['riz'],
      inconnus: [],
      problemes: [],
    } as never);
    expect('profilNutrition' in sans).toBe(false);
    expect(lire('../screens/SettingsScreen.tsx')).toContain(
      'patch({ ciblesNutrition: null, profilNutrition: null })',
    );
  });
});
