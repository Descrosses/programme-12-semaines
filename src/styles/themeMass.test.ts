/**
 * Le thème MASS « SCULPTED » (maquette de Guillaume, 25 novembre, qui
 * remplace celles du 14) : sombre, BORDEAUX et non plus rouge vif, et
 * LISIBLE. Ce test relit `tokens.css` et mesure les contrastes WCAG : un
 * réglage de palette qui passerait sous 4,5:1 fait tomber le déploiement.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('./tokens.css', import.meta.url), 'utf8');
const bloc = (() => {
  const debut = css.indexOf("[data-theme='mass'] {");
  return css.slice(debut, css.indexOf('\n}\n', debut));
})();
const jeton = (nom: string) => {
  const m = new RegExp(`--${nom}:\\s*(#[0-9a-f]{6})`, 'i').exec(bloc);
  if (!m) throw new Error(`--${nom} absent du thème MASS`);
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

describe('thème MASS', () => {
  it('est sombre, comme les maquettes', () => {
    expect(lum(jeton('bg'))).toBeLessThan(0.02);
    expect(lum(jeton('ink'))).toBeGreaterThan(0.8);
  });

  const fonds = ['bg', 'surface', 'surface-2', 'surface-3'];
  for (const encre of ['ink', 'ink-2', 'ink-3', 'accent-ink', 'rouge', 'vert', 'orange']) {
    it(`--${encre} tient 4,5:1 sur tous les fonds`, () => {
      for (const f of fonds) {
        expect({ f, ok: contraste(jeton(encre), jeton(f)) >= 4.5 }).toEqual({ f, ok: true });
      }
    });
  }

  it('SCULPTED : l’accent est un bordeaux, plus le rouge vif du 14 novembre', () => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(jeton('accent').slice(i, i + 2), 16));
    // Bordeaux : rouge dominant mais retenu, et plus de bleu que de vert.
    expect(r!).toBeLessThan(190);
    expect(r!).toBeGreaterThan(g! * 2);
    expect(b!).toBeGreaterThan(g!);
  });

  it('SCULPTED : aucun rouge vif écrit en dur, aucun « // », dans les styles', () => {
    const racine = new URL('../', import.meta.url);
    const fichiers = (readdirSync(racine, { recursive: true }) as string[]).filter((f) =>
      f.endsWith('.css'),
    );
    expect(fichiers.length).toBeGreaterThan(20);
    const vifs =
      /#e3141c|#d71f26|#ff2b33|#ff3b42|#e0121c|#d90215|#d0111a|rgb\((226 10 17|227 20 28|217 2 21)/i;
    for (const f of fichiers) {
      // Les commentaires racontent l'histoire : seul le CSS actif compte.
      const actif = readFileSync(new URL(f, racine), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
      expect({ f, vif: vifs.test(actif) }).toEqual({ f, vif: false });
      expect({ f, slash: /content:\s*'[^']*\/\//.test(actif) }).toEqual({ f, slash: false });
    }
  });

  it('SCULPTED : une carte par séance, trait collé au sous-titre', () => {
    const semaine = readFileSync(new URL('../screens/Week.module.css', import.meta.url), 'utf8');
    expect(semaine).toMatch(
      /:global\(\[data-theme='mass'\]\) \.dayRow \{[^}]*border: 1px solid var\(--mass-carte-bord\);[^}]*border-radius: 14px;/,
    );
    const entete = readFileSync(
      new URL('../components/ScreenHeader.module.css', import.meta.url),
      'utf8',
    );
    expect(entete).toMatch(
      /:global\(\[data-theme='mass'\]\) \.header:not\(\.argent\) \.subtitleRow \{\s*flex-direction: row;/,
    );
  });

  it('le texte blanc des boutons tient 4,5:1 sur le rouge d’action', () => {
    expect(contraste(jeton('ink-on-accent'), jeton('accent'))).toBeGreaterThanOrEqual(4.5);
  });
});
