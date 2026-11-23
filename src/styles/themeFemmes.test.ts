/**
 * Le thème FEMMES « Rosée Sculptée » (planche de Guillaume, 23 novembre) :
 * CLAIR, rose poudré, et LISIBLE. Ce test relit `tokens.css` et mesure les
 * contrastes WCAG, vérifie que les polices de la planche sont embarquées
 * (hors ligne) et qu'aucune couleur de l'ancienne identité synthwave ne
 * revient.
 */
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const lire = (chemin: string) => readFileSync(new URL(chemin, import.meta.url), 'utf8');
const css = lire('./tokens.css');
const bloc = (() => {
  const debut = css.indexOf("[data-theme='femmes'] {");
  return css.slice(debut, css.indexOf('\n}\n', debut));
})();
const jeton = (nom: string) => {
  const m = new RegExp(`--${nom}:\\s*(#[0-9a-f]{6})`, 'i').exec(bloc);
  if (!m) throw new Error(`--${nom} absent du thème FEMMES`);
  return m[1]!;
};
const lum = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
};
const contraste = (a: string, b: string) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x! + 0.05) / (y! + 0.05);
};

describe('thème FEMMES — Rosée Sculptée', () => {
  it('est clair, comme la planche', () => {
    expect(lum(jeton('bg'))).toBeGreaterThan(0.9);
    expect(lum(jeton('ink'))).toBeLessThan(0.03);
  });

  // Le texte courant se pose sur le fond et sur les cartes.
  const fonds = ['bg', 'surface'];
  for (const encre of [
    'ink',
    'ink-2',
    'ink-3',
    'accent-ink',
    'vert',
    'orange',
    'rouge',
    'bleu-ink',
  ]) {
    it(`--${encre} tient 4,5:1 sur le fond et les cartes`, () => {
      for (const f of fonds) {
        expect({ f, ok: contraste(jeton(encre), jeton(f)) >= 4.5 }).toEqual({ f, ok: true });
      }
    });
  }

  it('le texte blanc des boutons tient 4,5:1 sur le rose d’action', () => {
    expect(contraste(jeton('ink-on-accent'), jeton('accent'))).toBeGreaterThanOrEqual(4.5);
  });

  it('le texte vert des pastilles « faite » tient 4,5:1 sur leur fond', () => {
    expect(contraste(jeton('vert'), jeton('vert-fond'))).toBeGreaterThanOrEqual(4.5);
  });

  it('redéfinit les couleurs d’état (celles de POWER sont faites pour un fond sombre)', () => {
    for (const nom of ['orange', 'rouge', 'bleu', 'bleu-ink', 'bloc-test']) {
      expect(() => jeton(nom)).not.toThrow();
    }
  });

  it('passe les commandes natives en clair', () => {
    expect(lire('./global.css')).toMatch(
      /html\[data-theme='femmes'\]\s*\{\s*color-scheme:\s*light;/,
    );
  });

  it('tient l’heure de l’iPhone lisible : bande fixe derrière la barre d’état', () => {
    // L'heure est BLANCHE (black-translucent) : sans fond foncé, elle
    // disparaît sur un écran clair.
    expect(readFileSync(new URL('../../index.html', import.meta.url), 'utf8')).toContain(
      'content="black-translucent"',
    );
    const g = lire('./global.css');
    expect(g).toMatch(
      /html\[data-theme='femmes'\] body::before \{[^}]*position: fixed;[^}]*height: env\(safe-area-inset-top, 0px\);[^}]*background: var\(--barre-etat\);/,
    );
    expect(contraste('#ffffff', jeton('barre-etat'))).toBeGreaterThanOrEqual(4.5);
  });

  it('embarque Oswald et Inter (aucune police chargée en ligne)', () => {
    const polices = lire('./fonts.css');
    expect(bloc).toContain("'Inter Femmes'");
    expect(bloc).toContain("'Oswald Femmes'");
    for (const f of [
      'oswald-latin-600-normal.woff2',
      'oswald-latin-700-normal.woff2',
      'inter-latin-400-normal.woff2',
      'inter-latin-500-normal.woff2',
      'inter-latin-600-normal.woff2',
    ]) {
      expect(polices).toContain(f);
      expect(existsSync(new URL(`../assets/fonts/${f}`, import.meta.url))).toBe(true);
    }
    expect(polices).not.toMatch(/fonts\.googleapis|https?:\/\//);
  });

  it('ne garde rien de l’identité synthwave', () => {
    const femmes = lire('../screens/femmes/Femmes.module.css');
    for (const ancien of ['#160a26', '#ff2d95', '#d1006e']) {
      expect(bloc.toLowerCase()).not.toContain(ancien);
      expect(femmes.toLowerCase()).not.toContain(ancien);
    }
  });
});
