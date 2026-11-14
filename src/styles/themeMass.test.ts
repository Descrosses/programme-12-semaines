/**
 * Le thème MASS (maquettes de Guillaume, 14 novembre) : sombre, rouge, et
 * LISIBLE. Ce test relit `tokens.css` et mesure les contrastes WCAG : un
 * réglage de palette qui passerait sous 4,5:1 fait tomber le déploiement.
 */
import { readFileSync } from 'node:fs';
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

  it('le texte blanc des boutons tient 4,5:1 sur le rouge d’action', () => {
    expect(contraste(jeton('ink-on-accent'), jeton('accent'))).toBeGreaterThanOrEqual(4.5);
  });
});
