/*
 * Le plan que la personne compose elle-même : la structure, les quantités et
 * les totaux.
 *
 * Ce qui est vérifié ici n'est pas « est-ce que l'addition marche » mais les
 * décisions : zéro retire une ligne, les légumineuses sont des protéines, un
 * aliment inconnu est sauté plutôt que compté à zéro, et le total du jour
 * n'est pas la somme de cinq arrondis.
 */
import { describe, expect, it } from 'vitest';
import {
  GROUPES_REPAS,
  PLAN_PERSO_VIDE,
  REPAS_PERSO,
  copierJournee,
  groupeDeFamille,
  journeeVide,
  poserQuantite,
  quantiteDe,
  type JourneePerso,
} from '../data/planPerso';
import {
  alimentsParGroupe,
  ecartACible,
  macrosDeJournee,
  macrosDeLigne,
  macrosDeRepas,
} from './planPersoTotaux';
import { FOOD_LIBRARY } from '../data/foodLibrary';

describe('la structure', () => {
  it('cinq repas, dans l’ordre de la journée', () => {
    expect(REPAS_PERSO).toHaveLength(5);
    expect(REPAS_PERSO.map((r) => r.id)).toEqual([
      'pdej',
      'collation1',
      'dejeuner',
      'collation2',
      'diner',
    ]);
  });

  it('quatre groupes, et chaque famille du catalogue sait où elle va', () => {
    expect(GROUPES_REPAS.map((g) => g.id)).toEqual([
      'glucides',
      'proteines',
      'lipides',
      'vegetaux',
    ]);
    /*
     * Les légumineuses et le skyr vont aux PROTÉINES. C'est pour leurs
     * protéines qu'on les met dans une assiette, et c'est là que le
     * questionnaire les range déjà.
     */
    expect(groupeDeFamille('legumineuse')).toBe('proteines');
    expect(groupeDeFamille('laitier')).toBe('proteines');
    expect(groupeDeFamille('feculent')).toBe('glucides');
    expect(groupeDeFamille('gras')).toBe('lipides');
    expect(groupeDeFamille('fruit')).toBe('vegetaux');
    expect(groupeDeFamille('legume')).toBe('vegetaux');
    // `autre` n'a pas de groupe : les condiments ne composent pas un repas.
    expect(groupeDeFamille('autre')).toBeNull();
  });

  it('aucune famille du catalogue n’est oubliée sans raison', () => {
    const familles = new Set(Object.values(FOOD_LIBRARY).map((f) => f.category));
    const sansGroupe = [...familles].filter((f) => groupeDeFamille(f) === null);
    expect(sansGroupe).toEqual(['autre']);
  });
});

describe('poser une quantité', () => {
  it('écrit, relit, et remplace sans doubler la ligne', () => {
    let j: JourneePerso = {};
    j = poserQuantite(j, 'dejeuner', 'riz', 200);
    expect(quantiteDe(j, 'dejeuner', 'riz')).toBe(200);
    j = poserQuantite(j, 'dejeuner', 'riz', 250);
    expect(j.dejeuner).toHaveLength(1);
    expect(quantiteDe(j, 'dejeuner', 'riz')).toBe(250);
  });

  /*
   * Zéro n'est pas une quantité, c'est l'absence de l'aliment. Garder une
   * ligne à 0 g laisserait traîner dans le plan des aliments qu'on a
   * retirés, et l'écran les afficherait comme s'ils comptaient.
   */
  it('zéro retire la ligne, et le repas vide disparaît', () => {
    let j = poserQuantite({}, 'dejeuner', 'riz', 200);
    j = poserQuantite(j, 'dejeuner', 'riz', 0);
    expect(j.dejeuner).toBeUndefined();
    expect(journeeVide(j)).toBe(true);
  });

  it('vider un champ fait la même chose que zéro', () => {
    let j = poserQuantite({}, 'pdej', 'avoine', 70);
    j = poserQuantite(j, 'pdej', 'avoine', null);
    expect(journeeVide(j)).toBe(true);
  });

  it('les autres repas ne bougent pas', () => {
    let j = poserQuantite({}, 'pdej', 'avoine', 70);
    j = poserQuantite(j, 'diner', 'poulet', 150);
    j = poserQuantite(j, 'pdej', 'avoine', null);
    expect(quantiteDe(j, 'diner', 'poulet')).toBe(150);
  });
});

describe('les totaux', () => {
  // 100 g de riz cuit, tel que le catalogue l'écrit.
  const riz = FOOD_LIBRARY['riz']!;

  it('une ligne vaut sa quantité rapportée à la base de la composition', () => {
    const m = macrosDeLigne({ foodId: 'riz', qty: 200 }, FOOD_LIBRARY);
    expect(m.kcal).toBeCloseTo((riz.kcal * 200) / riz.per, 6);
  });

  it('un aliment que le catalogue ne connaît pas vaut zéro, pas NaN', () => {
    expect(macrosDeLigne({ foodId: 'licorne', qty: 200 }, FOOD_LIBRARY)).toEqual({
      kcal: 0,
      proteinG: 0,
      carbsG: 0,
      fatG: 0,
    });
  });

  it('un repas est la somme de ses lignes', () => {
    let j = poserQuantite({}, 'dejeuner', 'riz', 200);
    j = poserQuantite(j, 'dejeuner', 'poulet', 150);
    const m = macrosDeRepas(j, 'dejeuner', FOOD_LIBRARY);
    const attendu =
      macrosDeLigne({ foodId: 'riz', qty: 200 }, FOOD_LIBRARY).kcal +
      macrosDeLigne({ foodId: 'poulet', qty: 150 }, FOOD_LIBRARY).kcal;
    expect(m.kcal).toBeCloseTo(attendu, 6);
  });

  /*
   * LE TEST QUI DIT POURQUOI ON N'ADDITIONNE PAS LES REPAS ARRONDIS.
   *
   * Cinq repas arrondis au kcal, c'est jusqu'à 2,5 kcal d'écart avec le vrai
   * total. Invisible — et suffisant pour qu'on lise « 2 800 » en haut et
   * « 2 798 » en bas, et qu'on perde confiance dans les deux.
   */
  it('la journée additionne les lignes, pas les repas arrondis', () => {
    let j: JourneePerso = {};
    for (const r of REPAS_PERSO) j = poserQuantite(j, r.id, 'riz', 33);
    const brut = REPAS_PERSO.reduce((a, r) => a + macrosDeRepas(j, r.id, FOOD_LIBRARY).kcal, 0);
    expect(macrosDeJournee(j, FOOD_LIBRARY).kcal).toBe(Math.round(brut));
  });

  it('une journée vide pèse zéro', () => {
    expect(macrosDeJournee({}, FOOD_LIBRARY)).toEqual({
      kcal: 0,
      proteinG: 0,
      carbsG: 0,
      fatG: 0,
    });
  });
});

describe('l’écart à la cible', () => {
  const cible = { kcal: 2800, proteinG: 160, carbsG: 360, fatG: 80 };

  it('positif tant qu’il reste à manger', () => {
    const e = ecartACible({ kcal: 2000, proteinG: 120, carbsG: 250, fatG: 60 }, cible)!;
    expect(e.kcal).toBe(800);
    expect(e.proteinG).toBe(40);
  });

  it('négatif quand on dépasse', () => {
    expect(ecartACible({ kcal: 3000, proteinG: 160, carbsG: 360, fatG: 80 }, cible)!.kcal).toBe(
      -200,
    );
  });

  /* Sans cible il n'y a pas d'écart — et un zéro se lirait « pile dessus ». */
  it('sans cible, il n’y a rien à dire', () => {
    expect(ecartACible({ kcal: 2000, proteinG: 0, carbsG: 0, fatG: 0 }, null)).toBeNull();
  });
});

describe('les aliments de la personne, rangés par groupe', () => {
  const PREFERES = [
    'riz',
    'pates',
    'poulet',
    'lentilles',
    'skyr',
    'amandes',
    'huile',
    'banane',
    'courgettes',
    'licorne', // inconnu du catalogue
  ];

  it('chacun tombe dans son groupe', () => {
    const g = alimentsParGroupe(PREFERES);
    expect(g.glucides.map((f) => f.id)).toEqual(['riz', 'pates']);
    expect(g.proteines.map((f) => f.id)).toEqual(['poulet', 'lentilles', 'skyr']);
    expect(g.lipides.map((f) => f.id)).toEqual(['amandes', 'huile']);
    expect(g.vegetaux.map((f) => f.id)).toEqual(['banane', 'courgettes']);
  });

  /* Sauté, pas affiché vide : une ligne sans nom ni composition ne sert à
     rien et fait douter du reste. */
  it('un identifiant que le catalogue ne connaît plus est sauté', () => {
    const tous = Object.values(alimentsParGroupe(PREFERES)).flat();
    expect(tous.map((f) => f.id)).not.toContain('licorne');
    expect(tous).toHaveLength(9);
  });

  /*
   * L'ORDRE DU QUESTIONNAIRE EST CONSERVÉ à l'intérieur de chaque groupe.
   * C'est l'ordre dans lequel la personne a pensé ses aliments, donc celui
   * où elle les retrouvera le plus vite — même raison que pour l'onglet
   * « Mes aliments » du sélecteur.
   */
  it('l’ordre reçu est conservé dans chaque groupe', () => {
    const g = alimentsParGroupe(['pates', 'riz', 'quinoa']);
    expect(g.glucides.map((f) => f.id)).toEqual(['pates', 'riz', 'quinoa']);
  });
});

describe('recopier une journée', () => {
  /*
   * À l'identique, et pas « avec les féculents baissés » : de combien,
   * l'application n'en sait rien, et le deviner serait prescrire. Elle
   * épargne la re-saisie, la décision reste à la personne.
   */
  it('copie à l’identique, sans rien baisser', () => {
    const train = poserQuantite({}, 'dejeuner', 'riz', 250);
    const plan = copierJournee({ ...PLAN_PERSO_VIDE, train }, 'train', 'rest');
    expect(quantiteDe(plan.rest, 'dejeuner', 'riz')).toBe(250);
  });

  it('les deux journées ne partagent pas le même objet', () => {
    const train = poserQuantite({}, 'dejeuner', 'riz', 250);
    const plan = copierJournee({ ...PLAN_PERSO_VIDE, train }, 'train', 'rest');
    const apres = { ...plan, rest: poserQuantite(plan.rest, 'dejeuner', 'riz', 150) };
    expect(quantiteDe(apres.train, 'dejeuner', 'riz')).toBe(250);
    expect(quantiteDe(apres.rest, 'dejeuner', 'riz')).toBe(150);
  });
});
