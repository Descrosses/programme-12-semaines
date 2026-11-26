/**
 * Les choix visuels du 23 novembre (planches de variantes, Guillaume) :
 * - N3 : l'onglet actif du menu du bas porte une pastille IVOIRE, encre
 *   sombre ; plus de rouge ni de trait au-dessus ;
 * - M2 : l'encadré « Montée en charge » a un filet rouge à gauche, plus de
 *   contour rouge foncé sur le bleu.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const lire = (f: string) => readFileSync(new URL(f, import.meta.url), 'utf8');
const regle = (css: string, sel: string) => {
  const i = css.indexOf(`\n${sel} {`);
  expect(i, sel).toBeGreaterThan(-1);
  return css.slice(i, css.indexOf('}', i));
};

describe('la touche de clair', () => {
  it('les deux jetons existent, sur :root', () => {
    const t = lire('./tokens.css');
    expect(t).toMatch(/--ivoire: #f4f1ea;/);
    expect(t).toMatch(/--encre: #151a22;/);
  });

  it('N3 — l’onglet actif : pastille ivoire, encre sombre, libellé ivoire', () => {
    const css = lire('../App.module.css');
    const icone = regle(css, '.tabOn .tabIcon');
    expect(icone).toContain('background: var(--ivoire)');
    expect(icone).toContain('color: var(--encre)');
    expect(regle(css, '.tabOn')).toContain('color: var(--ivoire)');
    expect(css).not.toContain('.tabOn::before');
  });

  it('M2 — la montée en charge : filet rouge à gauche, plus de contour rouge foncé', () => {
    const m = regle(lire('../screens/Session.module.css'), '.montee');
    expect(m).toContain('border-left: 4px solid var(--accent)');
    expect(m).not.toContain('--accent-dim');
  });
});

/** Rapport de contraste WCAG entre deux couleurs #rrggbb. */
const contraste = (a: string, b: string) => {
  const lum = (h: string) => {
    const c = [1, 3, 5].map((i) => {
      const v = parseInt(h.slice(i, i + 2), 16) / 255;
      return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!;
  };
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x! + 0.05) / (y! + 0.05);
};

describe('D — les sélecteurs de POWER en ivoire (Guillaume, 26 novembre)', () => {
  const css = lire('../components/Stepper.module.css');
  const P = ":global([data-theme='power'])";

  it('valeur sur l’ivoire, boutons − / + en ivoire doux, à l’encre', () => {
    expect(regle(css, `${P} .controls`)).toContain('background: var(--ivoire)');
    const bouton = regle(css, `${P} .button`);
    expect(bouton).toContain('background: var(--ivoire-doux)');
    expect(bouton).toContain('color: var(--encre)');
    expect(css).toMatch(
      /:global\(\[data-theme='power'\]\) \.accent \.value,[^{]*\{\s*color: var\(--encre\)/,
    );
    // L'appui garde le rouge de POWER.
    expect(regle(css, `${P} .button:active`)).toContain('background: var(--accent)');
  });

  it('lisible : encre sur ivoire et sur ivoire doux, unité et crayon', () => {
    const t = lire('./tokens.css');
    const jeton = (n: string) => new RegExp(`--${n}: (#[0-9a-f]{6});`).exec(t)![1]!;
    const [ivoire, doux, encre] = [jeton('ivoire'), jeton('ivoire-doux'), jeton('encre')];
    expect(contraste(encre, ivoire)).toBeGreaterThan(15);
    expect(contraste(encre, doux)).toBeGreaterThan(10);
    const unite =
      /\.unit,\s*:global\(\[data-theme='power'\]\) \.pencil \{\s*color: (#[0-9a-f]{6})/.exec(
        css,
      )![1]!;
    expect(contraste(unite, ivoire)).toBeGreaterThan(4.5);
  });

  it('POWER seulement : aucune règle ivoire du fichier hors de son thème', () => {
    for (const bloc of css.replace(/\/\*[\s\S]*?\*\//g, '').split('}')) {
      if (!/var\(--ivoire/.test(bloc)) continue;
      const selecteurs = bloc
        .slice(0, bloc.indexOf('{'))
        .split(',')
        .map((x) => x.trim());
      for (const s of selecteurs.filter(Boolean))
        expect(
          s
            .slice(s.lastIndexOf('\n') + 1)
            .trim()
            .startsWith(P),
          s,
        ).toBe(true);
    }
  });
});
