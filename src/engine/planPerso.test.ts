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
  choisirAliment,
  copierJournee,
  groupeDeFamille,
  journeeVide,
  poserQuantite,
  poserRepas,
  quantiteDe,
  remplacerAliment,
  retirerAliment,
  type JourneePerso,
} from '../data/planPerso';
import {
  alimentsParGroupe,
  ecartACible,
  macrosDeJournee,
  macrosDeLigne,
  macrosDeRepas,
  quantitesAPoser,
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
   * LE CHANGEMENT DU LOT 0, ET LA RAISON D'ÊTRE DE TOUT LE RESTE.
   *
   * Avant, vider un champ retirait l'aliment. C'était défendable tant que
   * la personne posait elle-même chaque ligne. Ça ne l'est plus : la
   * bibliothèque pose un repas entier d'un geste, et ces aliments-là ont
   * été DÉCIDÉS. Corriger une quantité ne doit pas pouvoir en jeter un.
   */
  it('vider une quantité ne retire pas l’aliment choisi', () => {
    let j = poserQuantite({}, 'dejeuner', 'riz', 200);
    j = poserQuantite(j, 'dejeuner', 'riz', null);
    expect(j.dejeuner).toHaveLength(1);
    expect(quantiteDe(j, 'dejeuner', 'riz')).toBeNull();
    expect(journeeVide(j)).toBe(false);
  });

  it('zéro vaut « pas de quantité », pas « pas d’aliment »', () => {
    const j = poserQuantite(poserQuantite({}, 'dejeuner', 'riz', 200), 'dejeuner', 'riz', 0);
    expect(j.dejeuner).toHaveLength(1);
    expect(quantiteDe(j, 'dejeuner', 'riz')).toBeNull();
  });

  it('retirer un aliment est le seul geste qui jette quelque chose', () => {
    let j = poserQuantite({}, 'dejeuner', 'riz', 200);
    j = retirerAliment(j, 'dejeuner', 'riz');
    expect(j.dejeuner).toBeUndefined();
    expect(journeeVide(j)).toBe(true);
  });

  it('choisir un aliment l’ajoute sans quantité', () => {
    const j = choisirAliment({}, 'pdej', 'avoine');
    expect(j.pdej).toEqual([{ foodId: 'avoine', qty: null }]);
  });

  /* Toucher deux fois la même pastille ne doit pas effacer ce qu'on a posé. */
  it('choisir deux fois le même aliment ne double rien et n’efface rien', () => {
    let j = poserQuantite({}, 'pdej', 'avoine', 70);
    j = choisirAliment(j, 'pdej', 'avoine');
    expect(j.pdej).toHaveLength(1);
    expect(quantiteDe(j, 'pdej', 'avoine')).toBe(70);
  });

  it('poser une quantité sur un aliment non choisi le choisit au passage', () => {
    const j = poserQuantite({}, 'diner', 'poulet', 150);
    expect(quantiteDe(j, 'diner', 'poulet')).toBe(150);
  });

  it('les autres repas ne bougent pas', () => {
    let j = poserQuantite({}, 'pdej', 'avoine', 70);
    j = poserQuantite(j, 'diner', 'poulet', 150);
    j = poserQuantite(j, 'pdej', 'avoine', null);
    expect(quantiteDe(j, 'diner', 'poulet')).toBe(150);
  });
});

describe('remplacer un aliment', () => {
  const repas = () =>
    poserRepas({}, 'dejeuner', [
      { foodId: 'poulet', qty: 150 },
      { foodId: 'riz', qty: 250 },
    ]);

  it('garde la quantité quand l’unité est la même', () => {
    const j = remplacerAliment(repas(), 'dejeuner', 'poulet', 'dinde', true);
    expect(quantiteDe(j, 'dejeuner', 'dinde')).toBe(150);
    expect(quantiteDe(j, 'dejeuner', 'poulet')).toBeNull();
    expect(j.dejeuner).toHaveLength(2);
  });

  /*
   * LE TEST QUI ÉVITE 250 ŒUFS. Le riz se pèse en grammes, l'œuf se compte
   * à l'unité : reporter le nombre d'un vers l'autre donnerait une ligne
   * absurde qui compterait dans le total du jour.
   */
  it('abandonne la quantité quand l’unité change', () => {
    const j = remplacerAliment(repas(), 'dejeuner', 'riz', 'oeuf', false);
    expect(quantiteDe(j, 'dejeuner', 'oeuf')).toBeNull();
    expect(j.dejeuner).toHaveLength(2);
  });

  it('garde la place de l’aliment dans le repas', () => {
    const j = remplacerAliment(repas(), 'dejeuner', 'poulet', 'dinde', true);
    expect(j.dejeuner!.map((l) => l.foodId)).toEqual(['dinde', 'riz']);
  });

  /* Remplacer le riz par des pâtes dans un repas qui en contient déjà veut
     dire « retire le riz », pas « mets deux fois des pâtes ». */
  it('ne crée pas de doublon si le nouvel aliment est déjà là', () => {
    const j0 = poserRepas({}, 'dejeuner', [
      { foodId: 'riz', qty: 250 },
      { foodId: 'pates', qty: 100 },
    ]);
    const j = remplacerAliment(j0, 'dejeuner', 'riz', 'pates', true);
    expect(j.dejeuner).toHaveLength(1);
    expect(quantiteDe(j, 'dejeuner', 'pates')).toBe(100);
  });

  it('un aliment absent du repas ne change rien', () => {
    const avant = repas();
    expect(remplacerAliment(avant, 'dejeuner', 'saumon', 'thon', true)).toBe(avant);
  });

  it('se remplacer par soi-même ne change rien', () => {
    const avant = repas();
    expect(remplacerAliment(avant, 'dejeuner', 'riz', 'riz', true)).toBe(avant);
  });

  it('les autres repas ne bougent pas', () => {
    let j = poserQuantite(repas(), 'pdej', 'avoine', 70);
    j = remplacerAliment(j, 'dejeuner', 'poulet', 'dinde', true);
    expect(quantiteDe(j, 'pdej', 'avoine')).toBe(70);
  });
});

describe('poser un repas entier', () => {
  /*
   * « Choisir ce repas » REMPLACE le créneau au lieu de s'y ajouter :
   * choisir un déjeuner quand on en avait déjà un veut dire changer de
   * déjeuner, pas manger les deux.
   */
  it('remplace le contenu du créneau', () => {
    let j = poserQuantite({}, 'dejeuner', 'riz', 999);
    j = poserRepas(j, 'dejeuner', [
      { foodId: 'poulet', qty: 150 },
      { foodId: 'riz', qty: 250 },
    ]);
    expect(j.dejeuner).toHaveLength(2);
    expect(quantiteDe(j, 'dejeuner', 'riz')).toBe(250);
  });

  it('ne touche pas aux autres repas', () => {
    let j = poserQuantite({}, 'pdej', 'avoine', 70);
    j = poserRepas(j, 'dejeuner', [{ foodId: 'poulet', qty: 150 }]);
    expect(quantiteDe(j, 'pdej', 'avoine')).toBe(70);
  });

  it('un repas vide efface le créneau', () => {
    const j = poserRepas(poserQuantite({}, 'dejeuner', 'riz', 200), 'dejeuner', []);
    expect(j.dejeuner).toBeUndefined();
  });
});

describe('les quantités qui restent à poser', () => {
  it('se comptent sur toute la journée', () => {
    let j = poserRepas({}, 'dejeuner', [
      { foodId: 'poulet', qty: 150 },
      { foodId: 'riz', qty: null },
      { foodId: 'brocolis', qty: null },
    ]);
    j = choisirAliment(j, 'pdej', 'avoine');
    expect(quantitesAPoser(j)).toBe(3);
  });

  it('tombent à zéro une fois tout posé', () => {
    const j = poserRepas({}, 'dejeuner', [{ foodId: 'poulet', qty: 150 }]);
    expect(quantitesAPoser(j)).toBe(0);
  });
});

describe('les totaux', () => {
  // 100 g de riz cuit, tel que le catalogue l'écrit.
  const riz = FOOD_LIBRARY['riz']!;

  it('une ligne vaut sa quantité rapportée à la base de la composition', () => {
    const m = macrosDeLigne({ foodId: 'riz', qty: 200 }, FOOD_LIBRARY);
    expect(m.kcal).toBeCloseTo((riz.kcal * 200) / riz.per, 6);
  });

  it('un aliment choisi sans quantité pèse zéro, et ce n’est pas une erreur', () => {
    expect(macrosDeLigne({ foodId: 'riz', qty: null }, FOOD_LIBRARY).kcal).toBe(0);
    const j = choisirAliment({}, 'dejeuner', 'riz');
    expect(macrosDeJournee(j, FOOD_LIBRARY).kcal).toBe(0);
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
