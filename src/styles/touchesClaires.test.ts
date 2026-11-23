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
