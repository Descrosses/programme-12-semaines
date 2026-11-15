/**
 * La présentation de « Mon plan » : celle des « Repas types » du plan
 * historique, pas une pile de curseurs.
 *
 * Régression visée (retour de Guillaume, 15 novembre) : un repas choisi dans la
 * bibliothèque s'affichait comme une longue liste de champs — un curseur, deux
 * liens et des pastilles par aliment. Il se lit désormais comme les « Repas
 * types » : une ligne par aliment (nom, quantité, kcal), le réglage n'apparaît
 * que sur la ligne touchée.
 *
 * Ce que ces tests figent :
 * - la ligne fermée montre nom, quantité et kcal, et PAS le curseur ;
 * - la ligne dépliée montre le curseur, « Remplacer » et « Retirer » ;
 * - un aliment sans quantité dit « à poser » et ne compte aucun kcal ;
 * - l'en-tête du repas donne ses kcal et sa part de la CIBLE du jour — pas du
 *   plan, qui n'est pas fini — avec la barre des macros.
 */
import 'fake-indexeddb/auto';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { FOOD_LIBRARY } from '../data/foodLibrary';
import { LigneAliment, PlanPerso } from './PlanPerso';

const noop = () => {};
const avoine = FOOD_LIBRARY['avoine']!;

function ligne(over: Partial<Parameters<typeof LigneAliment>[0]> = {}) {
  return renderToStaticMarkup(
    <ul>
      <LigneAliment
        food={avoine}
        qty={50}
        kcal={190}
        horsListe={false}
        ouverte={false}
        ouvertEnRemplacement={false}
        customs={[]}
        onToggle={noop}
        onQty={noop}
        onRetirer={noop}
        onRemplacer={noop}
        onChoisi={noop}
        onCreateCustom={noop}
        onFermerRemplacement={noop}
        {...over}
      />
    </ul>,
  );
}

describe('une ligne d’aliment', () => {
  it('fermée : nom, quantité et kcal, sans curseur ni actions', () => {
    const h = ligne();
    expect(h).toContain('Flocons d’avoine nature');
    expect(h).toMatch(/50(<!-- -->)? g/);
    expect(h).toContain('190 kcal');
    expect(h).toContain('aria-expanded="false"');
    expect(h).not.toContain('Remplacer');
    expect(h).not.toContain('Retirer');
    expect(h).not.toContain('role="spinbutton"');
  });

  it('dépliée : le curseur, « Remplacer » et « Retirer » apparaissent', () => {
    const h = ligne({ ouverte: true });
    expect(h).toContain('aria-expanded="true"');
    expect(h).toContain('Remplacer');
    expect(h).toContain('Retirer');
  });

  it('sans quantité : « à poser », et aucun kcal compté', () => {
    const h = ligne({ qty: null, kcal: 0 });
    expect(h).toContain('à poser');
    expect(h).toContain('—');
    expect(h).not.toContain(' kcal');
  });

  it('un aliment hors questionnaire le dit, sans disparaître', () => {
    expect(ligne({ horsListe: true })).toContain('Pas dans tes aliments déclarés');
    expect(ligne()).not.toContain('Pas dans tes aliments déclarés');
  });
});

describe('l’en-tête d’un repas', () => {
  const l = (foodId: string, qty: number) => ({ foodId, qty });
  const journee = {
    pdej: [l('skyr', 200), l('avoine', 50), l('fruitsRouges', 100), l('amandes', 20)],
  };
  const rendu = (cible: { kcal: number; proteinG: number; carbsG: number; fatG: number } | null) =>
    renderToStaticMarkup(
      <PlanPerso
        kind="train"
        journee={journee}
        preferes={['skyr', 'avoine', 'fruitsRouges', 'amandes']}
        catalogue={FOOD_LIBRARY}
        customs={[]}
        onCreateCustom={noop}
        cible={cible}
        onChange={noop}
        onCopier={null}
      />,
    );

  it('donne ses kcal, sa part de la CIBLE et la barre des macros', () => {
    const h = rendu({ kcal: 2800, proteinG: 160, carbsG: 360, fatG: 80 });
    expect(h).toContain('477 kcal');
    // 477 / 2 800 = 17 % — et non 100 % du plan, qui n'est qu'un repas.
    expect(h).toMatch(/17(<!-- -->)? %/);
    expect(h).toContain('role="img"');
  });

  it('sans cible posée, la part se compte sur le total du plan', () => {
    expect(rendu(null)).toMatch(/100(<!-- -->)? %/);
  });
});
