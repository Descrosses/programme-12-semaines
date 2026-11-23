/**
 * L'accueil vu par n'importe qui (Guillaume, 23 novembre) :
 * - aucun prénom : « Bonjour Guillaume » s'affichait à tout le monde ;
 * - la tuile ME, MYSELF & I n'est jamais « À venir » (l'import marche
 *   depuis le lot 5) ; les familles réellement à venir gardent leur badge.
 */
import 'fake-indexeddb/auto';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AccueilScreen } from './AccueilScreen';

const html = renderToStaticMarkup(
  <AccueilScreen
    onReprendre={() => {}}
    onCatalogue={() => {}}
    onFamille={() => {}}
    onParcours={() => {}}
  />,
);

/** Le bloc HTML d'une tuile de famille, repérée par son nom. */
function tuile(nom: string): string {
  const i = html.indexOf(nom);
  const debut = html.lastIndexOf('<button', i);
  return html.slice(debut, html.indexOf('</button>', i));
}

describe('l’accueil', () => {
  it('ne nomme personne', () => {
    expect(html).toContain('Bonjour');
    expect(html).not.toContain('Guillaume');
  });

  it('ME, MYSELF &amp; I n’est jamais « À venir »', () => {
    expect(tuile('ME, MYSELF &amp; I')).not.toContain('À venir');
  });

  it('le badge reste là où il dit vrai : la règle ne vise que ME, MYSELF & I', () => {
    const src = readFileSync(new URL('./AccueilScreen.tsx', import.meta.url), 'utf8');
    expect(src).toMatch(/famille\.id !== 'perso' &&\s*\(famille\.programmes\.length === 0 \|\|/);
  });
});
