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

describe('M — les sélecteurs de POWER à l’aspect MASS, en bleu (Guillaume, 26 novembre)', () => {
  const css = lire('../components/Stepper.module.css');
  const t = lire('./tokens.css');
  const P = ":global([data-theme='power'])";
  const sansCommentaires = css.replace(/\/\*[\s\S]*?\*\//g, '');

  it('cadre fin, fond en dégradé, grand chiffre blanc en italique extra-gras', () => {
    const cadre = regle(css, `${P} .controls`);
    expect(cadre).toContain('border: 1px solid var(--power-curseur-bord)');
    expect(cadre).toContain('background: var(--power-curseur-fond)');
    expect(regle(css, `${P} .button`)).toContain('background: var(--power-curseur-bouton)');
    const chiffre = /:global\(\[data-theme='power'\]\) \.accent \.input \{([^}]*)\}/.exec(css)![1]!;
    expect(chiffre).toContain('color: #fff');
    expect(chiffre).toContain("font-family: 'Barlow Mass', var(--font-cond)");
    expect(chiffre).toContain('font-style: italic');
    // L'appui garde le rouge de POWER.
    expect(regle(css, `${P} .button:active`)).toContain('background: var(--accent)');
  });

  it('lisible : blanc sur le dégradé bleu, du haut jusqu’en bas', () => {
    const fond =
      /--power-curseur-fond: linear-gradient\(180deg, (#[0-9a-f]{6}) 0%, (#[0-9a-f]{6}) 100%\)/.exec(
        t,
      )!;
    expect(contraste('#ffffff', fond[1]!)).toBeGreaterThan(10);
    expect(contraste('#ffffff', fond[2]!)).toBeGreaterThan(10);
    const bouton = /--power-curseur-bouton: (#[0-9a-f]{6});/.exec(t)![1]!;
    expect(contraste('#ffffff', bouton)).toBeGreaterThan(10);
  });

  it('l’essai ivoire « D » n’est pas revenu : aucun ivoire dans les sélecteurs', () => {
    expect(sansCommentaires).not.toMatch(/--ivoire|--encre/);
  });

  it('POWER seulement : les jetons POWER ne servent que sous son thème', () => {
    for (const bloc of sansCommentaires.split('}')) {
      if (!/var\(--power-/.test(bloc)) continue;
      for (const s of bloc
        .slice(0, bloc.indexOf('{'))
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean))
        expect(s.startsWith(P), s).toBe(true);
    }
  });
});

describe('POWER — boutons d’action en relief : la forme de MASS, le rouge de POWER', () => {
  const t = lire('./tokens.css');
  const P = ":global([data-theme='power'])";
  const FICHIERS: Array<[fichier: string, boutons: string[]]> = [
    ['../screens/Session.module.css', ['.validate', '.ficheBouton', '.demarrer']],
    ['../screens/Screens.module.css', ['.primary']],
    ['../screens/Today.module.css', ['.primary']],
    ['../screens/Week.module.css', ['.cta']],
    ['../components/PhotoCapture.module.css', ['.primary']],
    ['../components/FicheMouvement.module.css', ['.fermer', '.compris']],
  ];

  it('blanc lisible sur tout le dégradé (4,5:1 au plus clair)', () => {
    const d =
      /--power-degrade-action: linear-gradient\(180deg, (#[0-9a-f]{6}) 0%, (#[0-9a-f]{6}) 52%, (#[0-9a-f]{6}) 100%\)/.exec(
        t,
      )!;
    for (const couleur of d.slice(1)) expect(contraste('#ffffff', couleur)).toBeGreaterThan(4.5);
  });

  it('le rouge de POWER, pas le bordeaux de MASS ; police droite', () => {
    const bloc = t.slice(t.indexOf('--power-rouge-bord'), t.indexOf('--power-curseur-bouton'));
    expect(bloc).toContain('rgb(213 10 32 / 38%)');
    expect(bloc).not.toMatch(/#a5313f|#561520|#7c2130/);
    for (const [fichier] of FICHIERS) {
      const css = lire(fichier).replace(/\/\*[\s\S]*?\*\//g, '');
      for (const b of css.split('}').filter((x) => x.includes('--power-degrade-action')))
        expect(b, fichier).not.toMatch(/italic|Barlow Mass/);
    }
  });

  for (const [fichier, boutons] of FICHIERS) {
    it(`${fichier} : ${boutons.join(', ')} — bord, dégradé, liseré, sous POWER seulement`, () => {
      const css = lire(fichier).replace(/\/\*[\s\S]*?\*\//g, '');
      const blocs = css.split('}').filter((x) => /var\(--power-/.test(x));
      expect(blocs.length).toBeGreaterThan(0);
      const tous = blocs.flatMap((b) =>
        b
          .slice(0, b.indexOf('{'))
          .split(',')
          .map((x) => x.trim())
          .filter(Boolean),
      );
      for (const s of tous) expect(s.startsWith(P), s).toBe(true);
      for (const b of boutons) expect(tous, b).toContain(`${P} ${b}`);
      const corps = blocs.find((x) => x.includes('--power-degrade-action'))!;
      expect(corps).toContain('border: 1px solid var(--power-rouge-bord)');
      expect(corps).toContain('var(--power-liseret-action), var(--power-halo-action)');
    });
  }
});
