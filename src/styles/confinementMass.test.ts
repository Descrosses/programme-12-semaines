/**
 * Lots C et D de l'harmonisation MASS : des règles ajoutées à des fichiers de
 * styles que POWER partage (écrans communs, Progrès, Aujourd'hui, boutons
 * photo, barre de repos, visionneuse de fiche). Chaque sélecteur
 * de ces blocs doit commencer par le thème MASS — sinon les cartes, boutons et
 * onglets de POWER changeraient avec.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const BLOCS: Array<[fichier: string, repere: string, minimum: number]> = [
  ['../screens/Screens.module.css', 'MASS — cartes, boutons, champs et sélecteurs', 20],
  ['../screens/Progress.module.css', 'MASS — puces de mouvement', 10],
  ['../screens/Today.module.css', 'MASS — la carte Nutrition', 2],
  ['../components/PhotoCapture.module.css', 'MASS (lot D)', 2],
  ['../components/RestBar.module.css', 'MASS (lot D)', 4],
  ['../components/FicheMouvement.module.css', 'MASS (lot D)', 1],
];

function selecteurs(fichier: string, repere: string): string[] {
  const css = readFileSync(new URL(fichier, import.meta.url), 'utf8');
  const i = css.indexOf(repere);
  if (i < 0) return [];
  const bloc = css.slice(css.lastIndexOf('/*', i)).replace(/\/\*[\s\S]*?\*\//g, '');
  return [...bloc.matchAll(/(^|})\s*([^{}]+?)\s*{/g)]
    .flatMap((m) => m[2]!.split(/,(?![^(]*\))/))
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

describe('les règles MASS des lots C et D restent sous le thème MASS', () => {
  for (const [fichier, repere, minimum] of BLOCS) {
    it(fichier, () => {
      const liste = selecteurs(fichier, repere);
      expect(liste.length).toBeGreaterThanOrEqual(minimum);
      expect(liste.filter((s) => !s.startsWith(":global([data-theme='mass'])"))).toEqual([]);
    });
  }
});
