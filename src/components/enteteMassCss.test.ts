/**
 * Les règles MASS ajoutées à `ScreenHeader.module.css` (en-têtes sans photo,
 * Accueil sous la barre d'état) vivent dans un fichier que POWER et FEMMES
 * partagent. Chaque sélecteur du bloc doit donc commencer par le thème MASS :
 * sans lui, le titre argent et l'en-tête compact passeraient sur POWER.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('./ScreenHeader.module.css', import.meta.url), 'utf8');
const debut = css.indexOf(' * MASS — en-têtes SANS photo');
const bloc = css.slice(css.lastIndexOf('/*', debut)).replace(/\/\*[\s\S]*?\*\//g, '');
const selecteurs = [...bloc.matchAll(/(^|})\s*([^{}]+?)\s*{/g)]
  .flatMap((m) => m[2]!.split(','))
  .map((s) => s.trim())
  .filter((s) => s.length > 0);

describe('les en-têtes MASS ne débordent pas sur POWER ni FEMMES', () => {
  it('le bloc existe', () => {
    expect(debut).toBeGreaterThan(0);
    expect(selecteurs.length).toBeGreaterThanOrEqual(7);
  });

  it('chaque sélecteur est sous le thème MASS', () => {
    expect(selecteurs.filter((s) => !s.startsWith(":global([data-theme='mass'])"))).toEqual([]);
  });
});
