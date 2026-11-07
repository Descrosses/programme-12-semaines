/*
 * Ce que ces tests empêchent : une flèche qui ne pointe nulle part, ou qui
 * pointe au mauvais endroit. Ni l'un ni l'autre ne plante — l'appli
 * n'afficherait simplement pas l'aliment, ou compterait les calories d'un
 * autre. On ne s'en apercevrait qu'en relisant une journée, trop tard.
 *
 * Le même filet que pour les fiches de mouvement de MASS, qui y avait déjà
 * attrapé deux erreurs de recopie.
 */
import { describe, expect, it } from 'vitest';
import { ALIMENTS_QUESTIONNAIRE, alimentPour, alimentsInconnus } from './questionnaireAliments';
import { FOOD_LIBRARY } from './foodLibrary';

/** Les vingt-sept identifiants, recopiés du questionnaire tels quels. */
const DU_QUESTIONNAIRE = [
  'riz',
  'pates',
  'pomme-de-terre',
  'patate',
  'flocons',
  'pain',
  'banane',
  'pomme',
  'fruits-rouges',
  'kiwi',
  'poulet',
  'dinde',
  'boeuf',
  'oeufs',
  'saumon',
  'haricots-rouges',
  'skyr',
  'fromage-blanc',
  'whey',
  'amandes',
  'chocolat-noir',
  'cacahuete',
  'haricots-verts',
  'courgettes',
  'poivrons',
  'tomates',
  'petits-pois',
];

describe('la table des aliments du questionnaire', () => {
  it('couvre les vingt-sept, et aucun de plus', () => {
    expect(Object.keys(ALIMENTS_QUESTIONNAIRE).sort()).toEqual([...DU_QUESTIONNAIRE].sort());
  });

  it('fait pointer chaque flèche vers un aliment qui existe', () => {
    for (const id of DU_QUESTIONNAIRE) {
      expect({ id, trouve: alimentPour(id) !== undefined }).toEqual({ id, trouve: true });
    }
  });

  it('ne fait pas pointer deux aliments vers le même', () => {
    // Une correspondance dupliquée ne peut être qu'une erreur de copie : deux
    // aliments distincts du questionnaire sont deux aliments distincts ici.
    const cibles = Object.values(ALIMENTS_QUESTIONNAIRE);
    expect(new Set(cibles).size).toBe(cibles.length);
  });

  it('rend undefined pour un aliment libre, plutôt que le plus ressemblant', () => {
    // Le questionnaire laisse ajouter ses propres aliments : ils n'ont pas
    // d'équivalent, et leur en inventer un compterait un autre aliment.
    expect(alimentPour('tofu-fume')).toBeUndefined();
    expect(alimentsInconnus(['riz', 'tofu-fume', 'kiwi'])).toEqual(['tofu-fume']);
  });
});

/*
 * Les trois aliments ajoutés au catalogue pour ce questionnaire. Leurs valeurs
 * viennent de lui ; la règle 4/4/9 est ce qui permet de dire qu'elles tiennent.
 */
describe('les trois aliments ajoutés', () => {
  const kcalDesMacros = (f: { proteinG: number; carbsG: number; fatG: number }) =>
    f.proteinG * 4 + f.carbsG * 4 + f.fatG * 9;

  it('chocolat noir, poivrons et tomates existent', () => {
    for (const id of ['chocolatNoir', 'poivrons', 'tomates']) {
      expect({ id, present: id in FOOD_LIBRARY }).toEqual({ id, present: true });
    }
  });

  it('leurs macros pèsent à peu près les calories annoncées', () => {
    for (const id of ['chocolatNoir', 'poivrons']) {
      const f = FOOD_LIBRARY[id]!;
      expect(Math.abs(kcalDesMacros(f) - f.kcal) / f.kcal).toBeLessThan(0.05);
    }
    /*
     * La tomate est à part : 21 kcal calculées pour 18 annoncées, soit 17 %.
     * L'écart vient des fibres, comptées dans les glucides et pas dans les
     * calories. En valeur absolue il pèse TROIS kcal — le noter ici vaut mieux
     * que de corriger un chiffre pour faire tomber une règle juste.
     */
    const tomate = FOOD_LIBRARY.tomates!;
    expect(Math.abs(kcalDesMacros(tomate) - tomate.kcal)).toBeLessThan(4);
  });

  it('dit dans quel état ils se pèsent', () => {
    // Un poivron cru et un poivron cuit ne pèsent pas pareil : l'état est la
    // première chose qu'une ligne de catalogue doit dire.
    expect(FOOD_LIBRARY.poivrons?.referenceState).toBe('cru');
    expect(FOOD_LIBRARY.tomates?.referenceState).toBe('cru');
  });
});

/*
 * Les deux arbitrages de Guillaume, écrits noir sur blanc. Les changer doit
 * être une décision, pas une retouche discrète.
 */
describe('les arbitrages tranchés', () => {
  it('« flocons » désigne les flocons NATURE', () => {
    expect(alimentPour('flocons')).toBe('avoine');
    expect(FOOD_LIBRARY.avoine?.label).toContain('nature');
  });

  it('« riz » et « pates » désignent les versions CUITES', () => {
    // Le riz cru pèse 350 kcal aux 100 g, le cuit environ 120 : confondre les
    // deux triple l'apport compté, en silence.
    expect(alimentPour('riz')).toBe('riz');
    expect(alimentPour('pates')).toBe('pates');
    expect(FOOD_LIBRARY.riz!.kcal).toBeLessThan(200);
    expect(FOOD_LIBRARY.pates!.kcal).toBeLessThan(200);
  });
});
