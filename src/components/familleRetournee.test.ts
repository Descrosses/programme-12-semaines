/**
 * Accueil — la carte d'une famille qui se retourne (Guillaume, 26 novembre).
 *
 * Ces tests figent :
 * - le verso ne dit QUE ce que le catalogue dit (résumé, objectifs écrits) :
 *   aucun texte inventé, et un programme sans objectifs n'en reçoit pas ;
 * - toucher une tuile la retourne ; « Voir les programmes » mène, comme
 *   avant, au catalogue sur cette famille ;
 * - la carte passe devant tout (rendue dans `body`), se ferme par Échap, et
 *   respecte le mouvement réduit ;
 * - le bouton reste lisible pour les quatre familles.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { FAMILLES } from '../data/catalogue';
import { HABILLAGE } from '../data/famillesVisuel';
import { qualitesDe, rectangleOuvert } from './FamilleRetournee';

const lire = (f: string) => readFileSync(new URL(f, import.meta.url), 'utf8');
const famille = (id: string) => FAMILLES.find((f) => f.id === id)!;

describe('le verso : le catalogue, mot pour mot', () => {
  it('POWER : les objectifs écrits de POWER CYCLE 1, et rien d’autre', () => {
    const power12 = famille('power').programmes.find((p) => p.id === 'power12')!;
    expect(qualitesDe(famille('power'))).toEqual([
      { nom: 'POWER CYCLE 1', objectifs: power12.objectifs },
    ]);
    expect(power12.objectifs.length).toBeGreaterThan(0);
  });

  it('MASS : MASS FORCE n’a pas d’objectifs écrits, il n’en reçoit pas', () => {
    const q = qualitesDe(famille('mass'));
    expect(q.map((x) => x.nom)).toEqual(['MASS CONGESTION']);
    expect(famille('mass').programmes.find((p) => p.id === 'mass-force')!.objectifs).toEqual([]);
  });

  it('LADIES : LADIES CYCLE 1 ; ME, MYSELF & I : son résumé seul', () => {
    expect(qualitesDe(famille('femmes')).map((x) => x.nom)).toEqual(['LADIES CYCLE 1']);
    expect(qualitesDe(famille('perso'))).toEqual([]);
  });

  it('le composant n’écrit aucun texte de programme à la main', () => {
    const src = lire('./FamilleRetournee.tsx');
    expect(src).toContain('{famille.resume}');
    expect(src).toContain('{famille.sousTitre}');
    // Les seuls mots propres à la carte : la rubrique, le bouton, « Fermer ».
    const textes = [...src.matchAll(/>\s*([A-ZÀ-Ý][^<>{}]{3,})\s*</g)].map((m) => m[1]!.trim());
    expect(textes.sort()).toEqual(['Ce que tu développes', 'Voir les programmes']);
  });
});

describe('le geste', () => {
  it('la carte ouverte occupe presque tout l’écran, sous l’encoche', () => {
    expect(rectangleOuvert(402, 874, 0)).toEqual({ top: 14, left: 14, width: 374, height: 846 });
    expect(rectangleOuvert(402, 874, 47)).toEqual({ top: 61, left: 14, width: 374, height: 799 });
  });

  it('toucher une tuile la retourne ; le verso mène au catalogue de la famille', () => {
    const accueil = lire('../screens/AccueilScreen.tsx');
    expect(accueil).not.toMatch(/onClick=\{\(\) => onFamille\(famille\.id\)\}/);
    expect(accueil).toMatch(/setRetournee\(\{\s*famille,/);
    expect(accueil).toContain('onVoir={() => onFamille(retournee.famille.id)}');
  });

  it('devant tout, fermée par Échap, focus sur « Fermer », mouvement réduit respecté', () => {
    const src = lire('./FamilleRetournee.tsx');
    expect(src).toContain('createPortal(');
    expect(src).toContain('document.body');
    expect(src).toContain("e.key === 'Escape'");
    expect(src).toContain('fermer.current?.focus');
    expect(src).toContain('aria-modal="true"');
    const css = lire('./FamilleRetournee.module.css');
    expect(css).toMatch(/backface-visibility: hidden/);
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)[\s\S]*transition: none/);
  });
});

describe('le bouton « Voir les programmes » se lit pour les quatre familles', () => {
  const lum = (r: number, g: number, b: number) => {
    const c = [r, g, b].map((v) => {
      const x = v / 255;
      return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!;
  };
  it('blanc sur la teinte assombrie de 22 % : 4,5:1 au moins', () => {
    const css = lire('./FamilleRetournee.module.css');
    expect(css).toContain('color-mix(in srgb, var(--teinte) 78%, #000 22%) 50%');
    for (const id of ['power', 'mass', 'femmes', 'perso'] as const) {
      const h = HABILLAGE[id].teinte;
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) * 0.78);
      const contraste = 1.05 / (lum(r!, g!, b!) + 0.05);
      expect(contraste, `${id} ${h}`).toBeGreaterThan(4.5);
    }
  });
});
