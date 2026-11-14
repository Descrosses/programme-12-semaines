/**
 * La Séance MASS (référence de Guillaume, 14 novembre) est écrite dans
 * `Session.module.css`, que partagent la séance POWER, la séance FEMMES et le
 * combiné MASS.
 *
 * Le risque est réel et a été vu : une première version, préfixée par le
 * seul thème MASS, repeignait aussi la carte du combiné (mêmes classes
 * `.exercise`, `.exName`, `.steppersLigne`). D'où cette règle : chaque
 * sélecteur du bloc « SÉANCE MASS » est confiné au thème MASS ET à l'écran
 * de séance (`.ecranSeance`).
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('./Session.module.css', import.meta.url), 'utf8');
const debut = css.indexOf(' * SÉANCE MASS');
// Depuis l'ouverture du commentaire qui annonce le bloc.
const bloc = css.slice(css.lastIndexOf('/*', debut)).replace(/\/\*[\s\S]*?\*\//g, '');
const PREFIXE = ":global([data-theme='mass']) .ecranSeance ";

/** Les sélecteurs de premier niveau du bloc, un par entrée de liste. */
const selecteurs = [...bloc.matchAll(/(^|})\s*([^{}]+?)\s*{/g)]
  .flatMap((m) => m[2]!.split(','))
  .map((s) => s.trim())
  .filter((s) => s.length > 0);

describe('la Séance MASS reste dans la Séance MASS', () => {
  it('le bloc existe et porte ses règles', () => {
    expect(debut).toBeGreaterThan(0);
    expect(selecteurs.length).toBeGreaterThan(30);
  });

  it('chaque sélecteur est confiné au thème MASS et à l’écran de séance', () => {
    const fuites = selecteurs.filter((s) => !s.startsWith(PREFIXE));
    expect(fuites).toEqual([]);
  });
});
