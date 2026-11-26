/**
 * Le thème proposé juste après l'import (Guillaume, 26 novembre :
 * « annoncer la possibilité de choisir son thème dès le début, juste après
 * avoir importé son programme »).
 *
 * Ces tests figent :
 * - rien avant l'import : le panneau ne montre pas le choix de thème ;
 * - après un import réussi (et lui seul), le choix apparaît pour CE
 *   programme, sur son thème actuel (celui d'une version précédente, sinon
 *   ME, MYSELF & I) ;
 * - choisir un autre fichier le retire.
 * Le geste lui-même est vérifié au navigateur (pas de DOM ici).
 */
import 'fake-indexeddb/auto';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ImportProgramme } from './ImportProgramme';

const source = readFileSync(new URL('./ImportProgramme.tsx', import.meta.url), 'utf8').replace(
  /\s+/g,
  ' ',
);

describe('le thème, juste après l’import', () => {
  it('avant tout import, pas de choix de thème', () => {
    const html = renderToStaticMarkup(<ImportProgramme onImporte={() => {}} />);
    expect(html).not.toContain('Thème de ce programme');
    expect(html).not.toContain('Choisis dès maintenant son thème');
  });

  it('un import réussi, et lui seul, propose le thème de CE programme', () => {
    const bloc = source.slice(source.indexOf("if (r.statut === 'importe') {"));
    const suite = bloc.slice(0, bloc.indexOf("} else if (r.statut === 'deja-importe')"));
    expect(suite).toContain(
      'setImporte({ cle: r.cle, theme: programmeEnMemoire(r.cle)?.theme ?? THEME_IMPORTE_DEFAUT, });',
    );
    expect(source.match(/setImporte\(\{/g)).toHaveLength(2); // l'import, puis un choix
    expect(source).toContain('<ThemeProgramme cle={importe.cle} actuel={importe.theme}');
  });

  it('il s’annonce : changeable ensuite dans ses Réglages', () => {
    expect(source).toContain('Tu pourras le changer quand tu veux dans ses Réglages.');
  });

  it('choisir un autre fichier le retire', () => {
    expect(source).toMatch(/e\.target\.value = ''; setImporte\(null\);/);
  });
});
