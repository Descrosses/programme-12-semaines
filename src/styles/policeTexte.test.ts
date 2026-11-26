/**
 * La police du TEXTE : Barlow Semi Condensed (réglage « E — Serré », choisi
 * par Guillaume sur planche le 26 novembre : le texte, qui prenait la police
 * du téléphone, était « trop fade »).
 *
 * Ces tests figent :
 * - `--font` nomme la police embarquée, la police du téléphone en repli ;
 * - LADIES garde Inter (sa planche « Rosée Sculptée ») ;
 * - les trois réglages de la planche vivent dans `fonts.css` : pas de coupe
 *   400 (le texte courant sort en 500), 700 couvre jusqu'à 900, dessin
 *   agrandi de 7 % ;
 * - les fichiers sont embarqués (jamais chargés d'internet) et restent légers ;
 * - sous POWER, le texte courant est éclairci sans écraser la hiérarchie
 *   titre > texte > libellé.
 */
import { existsSync, readFileSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const lire = (f: string) => readFileSync(new URL(f, import.meta.url), 'utf8');
const tokens = lire('./tokens.css');
const fonts = lire('./fonts.css');

/** Le bloc d'un thème, de son sélecteur à sa première accolade fermante. */
const bloc = (selecteur: string) => {
  const debut = tokens.indexOf(selecteur);
  expect(debut, selecteur).toBeGreaterThan(-1);
  return tokens.slice(debut, tokens.indexOf('\n}', debut));
};

const faces = [...fonts.matchAll(/@font-face\s*\{[^}]*\}/g)]
  .map((m) => m[0])
  .filter((f) => f.includes("font-family: 'Barlow Semi Condensed'"));

const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contraste = (a: string, b: string) => {
  const [haut, bas] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (haut + 0.05) / (bas + 0.05);
};
const couleur = (source: string, nom: string) => {
  const m = new RegExp(`${nom}: (#[0-9a-f]{6});`).exec(source);
  expect(m, nom).not.toBeNull();
  return m![1]!;
};

describe('la police du texte', () => {
  it('`--font` : Barlow Semi Condensed, la police du téléphone en repli', () => {
    const racine = bloc(":root,\n[data-theme='power']");
    expect(racine).toMatch(/--font: 'Barlow Semi Condensed', system-ui, -apple-system,/);
    // Les titres ne bougent pas.
    expect(racine).toMatch(/--font-cond: 'Barlow Condensed',/);
  });

  it('LADIES garde Inter, MASS et ME, MYSELF & I prennent la police commune', () => {
    expect(bloc("[data-theme='femmes'] {")).toMatch(/--font: 'Inter Femmes',/);
    for (const theme of ['mass', 'perso', 'dcross']) {
      expect(bloc(`[data-theme='${theme}'] {`), theme).not.toMatch(/--font:/);
    }
  });

  it('trois coupes : 400-500, 600, 700-900 — pas de 400 seul, le texte sort en 500', () => {
    expect(faces).toHaveLength(3);
    const graisses = faces.map((f) => /font-weight: ([^;]+);/.exec(f)![1]);
    expect(graisses).toEqual(['400 500', '600', '700 900']);
    expect(faces[0]).toContain('barlow-semi-condensed-latin-500-normal.woff2');
    expect(faces[2]).toContain('barlow-semi-condensed-latin-700-normal.woff2');
  });

  it('dessin agrandi de 7 % sur chaque coupe, et affichage immédiat du repli', () => {
    for (const f of faces) {
      expect(f).toContain('size-adjust: 107%;');
      expect(f).toContain('font-display: swap;');
    }
  });

  it('les fichiers sont embarqués, et légers (moins de 30 Ko chacun)', () => {
    for (const f of faces) {
      const chemin = /url\('([^']+)'\)/.exec(f)![1]!;
      expect(chemin.startsWith('../assets/fonts/'), chemin).toBe(true);
      const url = new URL(chemin, import.meta.url);
      expect(existsSync(url), chemin).toBe(true);
      expect(statSync(url).size, chemin).toBeLessThan(30_000);
    }
    expect(fonts).not.toMatch(/https?:\/\//);
  });

  it('POWER : texte courant éclairci, hiérarchie titre > texte > libellé gardée', () => {
    const racine = bloc(":root,\n[data-theme='power']");
    const [ink, ink2, ink3, surface] = ['--ink', '--ink-2', '--ink-3', '--surface'].map((n) =>
      couleur(racine, n),
    ) as [string, string, string, string];
    expect(ink2).toBe('#cdd8e3');
    expect(contraste(ink2, surface)).toBeGreaterThan(9);
    expect(luminance(ink)).toBeGreaterThan(luminance(ink2));
    expect(luminance(ink2)).toBeGreaterThan(luminance(ink3));
  });
});
