/**
 * Lot 1 de la nutrition (Guillaume, 23 novembre) : un objectif en CALORIES
 * suffit. Protéines, glucides et lipides sont facultatifs, un par un.
 *
 * Ce que ces tests figent :
 * - une cible = des calories dans les bornes ; une macro absente reste
 *   `null`, jamais 0 ; une macro hors bornes rend la journée inutilisable ;
 * - le reste à manger et l'écart du plan ne parlent que des macros posées ;
 *   avec les quatre chiffres, la phrase est IDENTIQUE à celle d'avant ;
 * - la fiche écrit « - » pour une macro absente (jamais une case vide, que
 *   l'ancienne lecture prenait pour 0), relit l'ancien format tel quel ;
 * - l'encart des Réglages ne réclame plus que les calories.
 */
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { cibleSaisie, ciblesValides, macrosPosees } from '../data/ciblesNutrition';
import { FOOD_LIBRARY } from '../data/foodLibrary';
import { PlanPerso } from '../components/PlanPerso';
import { ecartCible, messageCibles, phraseReste } from './cibleDuJour';
import { genererFiche, lireFiche } from './fiche';

const VIDE = { kcal: null, proteinG: null, carbsG: null, fatG: null };

describe('une cible en calories seules', () => {
  it('est utilisable ; ses macros restent absentes, jamais 0', () => {
    expect(cibleSaisie({ ...VIDE, kcal: 2400 })).toEqual({
      kcal: 2400,
      proteinG: null,
      carbsG: null,
      fatG: null,
    });
    expect(macrosPosees(cibleSaisie({ ...VIDE, kcal: 2400 })!)).toBe(false);
  });

  it('une macro posée est gardée, une macro hors bornes rend la journée inutilisable', () => {
    expect(cibleSaisie({ ...VIDE, kcal: 2400, proteinG: 170 })?.proteinG).toBe(170);
    expect(cibleSaisie({ ...VIDE, kcal: 2400, proteinG: 900 })).toBeNull();
  });

  it('sans calories, ou des calories hors bornes : pas de cible', () => {
    expect(cibleSaisie({ kcal: null, proteinG: 150, carbsG: 260, fatG: 80 })).toBeNull();
    expect(cibleSaisie({ ...VIDE, kcal: 300 })).toBeNull();
  });

  it('les deux journées en calories seules forment des cibles valides', () => {
    expect(ciblesValides({ train: { ...VIDE, kcal: 2400 }, rest: { ...VIDE, kcal: 2100 } })).toBe(
      true,
    );
  });
});

describe('ce qu’il reste à manger', () => {
  const mange = { kcal: 1240, proteinG: 96, carbsG: 132, fatG: 40 };

  it('avec les quatre chiffres : la phrase d’avant, mot pour mot', () => {
    const e = ecartCible({ kcal: 2400, proteinG: 170, carbsG: 260, fatG: 80 }, mange);
    expect(phraseReste(e)).toBe(
      'Il reste 1 160 kcal, 74 g de protéines, 128 g de glucides et 40 g de lipides pour atteindre ta cible.',
    );
  });

  it('calories seules : seulement les calories', () => {
    const e = ecartCible({ kcal: 2400, proteinG: null, carbsG: null, fatG: null }, mange);
    expect(e).toEqual({ kcal: 1160, proteinG: null, carbsG: null, fatG: null });
    expect(phraseReste(e)).toBe('Il reste 1 160 kcal pour atteindre ta cible.');
  });

  it('calories et protéines : les deux, rien d’autre', () => {
    const e = ecartCible({ kcal: 2400, proteinG: 170, carbsG: null, fatG: null }, mange);
    expect(phraseReste(e)).toBe(
      'Il reste 1 160 kcal et 74 g de protéines pour atteindre ta cible.',
    );
  });

  it('au-delà : on le dit en calories', () => {
    const e = ecartCible({ kcal: 1000, proteinG: null, carbsG: null, fatG: null }, mange);
    expect(phraseReste(e)).toBe('Tu dépasses ta cible de 240 kcal.');
  });
});

describe('« Mon plan » face à une cible en calories seules', () => {
  const l = (foodId: string, qty: number) => ({ foodId, qty });
  const rendu = (cible: Parameters<typeof PlanPerso>[0]['cible']) =>
    renderToStaticMarkup(
      <PlanPerso
        kind="train"
        journee={{ pdej: [l('skyr', 200), l('avoine', 50)] }}
        preferes={['skyr', 'avoine']}
        catalogue={FOOD_LIBRARY}
        customs={[]}
        onCreateCustom={() => {}}
        cible={cible}
        onChange={() => {}}
        onCopier={null}
      />,
    );

  /** La phrase d'écart seule : le total du plan, plus haut, a ses propres « g P ». */
  const manque = (h: string) => /Il manque [^<]*/.exec(h)?.[0] ?? '';

  it('dit ce qui manque en calories, sans inventer de macros', () => {
    const m = manque(rendu({ kcal: 2400, proteinG: null, carbsG: null, fatG: null }));
    expect(m).toMatch(/^Il manque [\d\s\u202f]+ kcal à ton plan$/);
  });

  it('avec les protéines posées, les dit, elles seules', () => {
    const m = manque(rendu({ kcal: 2400, proteinG: 170, carbsG: null, fatG: null }));
    expect(m).toMatch(/kcal à ton plan · \d+ g P$/);
  });
});

describe('la fiche', () => {
  const C = { train: { ...VIDE, kcal: 2400, proteinG: 170 }, rest: { ...VIDE, kcal: 2100 } };

  it('écrit « - » pour une macro absente, jamais une case vide', () => {
    const t = genererFiche({ cibles: C, aliments: [] });
    expect(t).toBe('MAJK1 C=2400,170,-,- R=2100,-,-,-');
    expect(t).not.toMatch(/,,|,\s|,$/);
  });

  it('aller-retour : relue telle quelle', () => {
    const lu = lireFiche(genererFiche({ cibles: C, aliments: [] }));
    expect(lu.problemes).toEqual([]);
    expect(lu.cibles).toEqual(C);
  });

  it('l’ancien format à quatre nombres se relit comme avant', () => {
    expect(lireFiche('MAJK1 C=2400,150,260,80 R=2100,150,200,70').cibles).toEqual({
      train: { kcal: 2400, proteinG: 150, carbsG: 260, fatG: 80 },
      rest: { kcal: 2100, proteinG: 150, carbsG: 200, fatG: 70 },
    });
  });

  it('sans calories, la journée est refusée et le message le dit', () => {
    const lu = lireFiche('MAJK1 C=-,150,260,80 R=2100,-,-,-');
    expect(lu.cibles).toBeNull();
    expect(lu.problemes.join(' ')).toContain('Jour d’entraînement');
  });
});

describe('l’encart des Réglages', () => {
  it('ne réclame plus que les calories', () => {
    expect(messageCibles(VIDE)).toBe('Rien de posé pour cette journée.');
    expect(messageCibles({ ...VIDE, proteinG: 150 })).toBe(
      'Il manque les calories : c’est le seul chiffre nécessaire pour afficher une cible.',
    );
    expect(messageCibles({ ...VIDE, kcal: 2400 })).toBe(
      'Calories posées : la cible s’affiche. Les macros sont facultatives.',
    );
    expect(messageCibles({ kcal: 2400, proteinG: 1, carbsG: 1, fatG: 1 })).toBeNull();
  });
});
