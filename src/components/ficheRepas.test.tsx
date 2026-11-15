/**
 * La photo et la composition des plats (retour de Guillaume, 15 novembre).
 *
 * Avant : on choisissait un plat sans pouvoir agrandir sa photo ni lire sa
 * composition entière (la ligne d'ingrédients est coupée sur la carte), et le
 * repas posé dans « Mon plan » n'affichait plus aucune image.
 *
 * Ce que ces tests figent :
 * - chaque carte de choix est un bouton qui ouvre la fiche, et le dit ;
 * - la fiche montre la photo du plat, CHAQUE ingrédient avec sa quantité et
 *   ses kcal, et « Choisir ce repas » seulement quand on vient du choix ;
 * - dans « Mon plan », le repas reconnu porte la vignette de SON plat, et la
 *   perd dès qu'un ingrédient est remplacé.
 */
import 'fake-indexeddb/auto';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { BIBLIOTHEQUE_REPAS, photoDe, repasPourCreneau } from '../data/bibliothequeRepas';
import { FOOD_LIBRARY } from '../data/foodLibrary';
import { ChoixRepas } from './ChoixRepas';
import { FicheRepas } from './FicheRepas';
import { PlanPerso } from './PlanPerso';

const noop = () => {};
const bol = BIBLIOTHEQUE_REPAS.find((r) => r.id === 'skyr-fruits-rouges-amandes')!;

describe('la fiche d’un plat', () => {
  const fiche = (avecChoix: boolean) =>
    renderToStaticMarkup(
      <FicheRepas
        repas={bol}
        catalogue={FOOD_LIBRARY}
        preferes={['skyr', 'avoine', 'fruitsRouges']}
        onChoisir={avecChoix ? noop : undefined}
        onFermer={noop}
      />,
    );

  it('la photo en grand, et chaque ingrédient avec quantité et kcal', () => {
    const h = fiche(true);
    expect(h).toContain(photoDe(bol.id));
    expect(h).toContain('aria-modal="true"');
    for (const l of bol.lignes) expect(h).toContain(FOOD_LIBRARY[l.foodId]!.label);
    expect(h).toMatch(/200(<!-- -->)? (<!-- -->)?g/);
    expect((h.match(/kcal<\/span><\/li>/g) ?? []).length).toBe(bol.lignes.length);
  });

  it('l’ingrédient non déclaré est signalé', () => {
    // Les amandes ne sont pas dans la liste ci-dessus.
    expect((fiche(true).match(/Pas dans tes aliments déclarés/g) ?? []).length).toBe(1);
  });

  it('« Choisir ce repas » seulement depuis le choix', () => {
    expect(fiche(true)).toContain('Choisir ce repas');
    expect(fiche(false)).not.toContain('Choisir ce repas');
  });
});

describe('les cartes de choix', () => {
  it('chaque carte ouvre la fiche, et le dit', () => {
    const h = renderToStaticMarkup(
      <ChoixRepas
        creneau="pdej"
        nomCreneau="Petit-déjeuner"
        preferes={[]}
        catalogue={FOOD_LIBRARY}
        onChoisir={noop}
        onFermer={noop}
      />,
    );
    const n = repasPourCreneau('pdej').length;
    expect((h.match(/aria-label="Voir la composition : /g) ?? []).length).toBe(n);
    expect((h.match(/Voir la composition<!-- -->|Voir la composition</g) ?? []).length).toBe(n);
  });
});

describe('la vignette du plat dans « Mon plan »', () => {
  const rendu = (lignes: { foodId: string; qty: number }[]) =>
    renderToStaticMarkup(
      <PlanPerso
        kind="train"
        journee={{ pdej: lignes }}
        preferes={['skyr']}
        catalogue={FOOD_LIBRARY}
        customs={[]}
        onCreateCustom={noop}
        cible={null}
        onChange={noop}
        onCopier={null}
      />,
    );
  const lignes = bol.lignes.map((l) => ({ foodId: l.foodId, qty: l.qty ?? 0 }));

  it('le repas reconnu porte la photo de son plat, touchable', () => {
    const h = rendu(lignes);
    expect(h).toContain(photoDe(bol.id));
    expect(h).toContain(`Voir le plat en grand : ${bol.nom}`);
  });

  it('un ingrédient remplacé : plus de photo', () => {
    const h = rendu(
      lignes.map((l) => (l.foodId === 'skyr' ? { ...l, foodId: 'fromageBlanc' } : l)),
    );
    expect(h).not.toContain(photoDe(bol.id));
    expect(h).not.toContain('Voir le plat en grand');
  });
});
