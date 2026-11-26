/**
 * L'Accueil (Guillaume, 26 novembre : « les encadrements des programmes sont
 * trop sombres », capture de référence à l'appui).
 *
 * - les photos des cartes sont à PLEINE opacité (toute photo d'ambiance est à
 *   38 % ailleurs, et c'est ce qui les éteignait) ; le voile ne monte plus
 *   qu'à mi-hauteur ;
 * - chaque carte de famille porte un bord et un halo à sa couleur ;
 * - « Prochaine séance » et « Mon parcours » ont un dégradé ; le fond une
 *   fumée légère ;
 * - rien d'autre ne bouge : les autres écrans gardent leurs photos à 38 %.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const lire = (f: string) => readFileSync(new URL(f, import.meta.url), 'utf8');
const css = lire('../screens/Accueil.module.css');
const regle = (sel: string) => {
  const i = css.indexOf(`\n${sel} {`);
  expect(i, sel).toBeGreaterThan(-1);
  return css.slice(i, css.indexOf('}', i));
};

describe('l’Accueil ressort', () => {
  it('les photos des cartes sont pleines, les autres écrans gardent leurs 38 %', () => {
    expect(regle('.famillePhoto img')).toContain('opacity: 1;');
    expect(regle('.enCoursPhoto img')).toContain('opacity: 1;');
    expect(lire('../components/Decor.module.css')).toMatch(/\.visuelCover \{[^}]*opacity: 0\.38;/);
  });

  it('le voile des cartes laisse le haut de la photo net', () => {
    expect(regle('.familleVoile')).toMatch(/rgb\(var\(--voile\) \/ 0%\) 58%/);
    expect(regle('.enCoursVoile')).toMatch(/rgb\(var\(--voile\) \/ 0%\) 78%/);
  });

  it('bord et halo à la couleur de la famille', () => {
    const carte = regle('.famille');
    expect(carte).toContain('border: 1px solid color-mix(in srgb, var(--teinte) 75%, transparent)');
    expect(carte).toMatch(/0 0 14px color-mix\(in srgb, var\(--teinte\) 28%/);
  });

  it('dégradés sur « Prochaine séance », « Mon parcours » et le bouton de lecture', () => {
    expect(css).toMatch(
      /\.prochaine,\s*\.parcours \{[^}]*background: linear-gradient\(135deg, var\(--surface-3\)/,
    );
    expect(regle('.lecture')).toMatch(/linear-gradient\(\s*180deg,\s*var\(--accent-bright\)/);
  });

  it('une fumée légère sur le fond, sans image de plus', () => {
    const fumee = regle('.ecran::before');
    expect(fumee).toContain('feTurbulence');
    expect(fumee).toMatch(/opacity: 0\.1\d;/);
    expect(fumee).toContain('pointer-events: none');
  });
});
