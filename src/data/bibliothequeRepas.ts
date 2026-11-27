/**
 * LA BIBLIOTHÈQUE DE REPAS — vingt-sept assiettes, photographiées.
 *
 * ── Ce qu'elle résout ─────────────────────────────────────────────────────
 *
 * Une cible — 2 800 kcal, 160 g de protéines — ne dit pas quoi mettre dans
 * l'assiette. Composer cinq repas depuis une liste d'aliments demandait une
 * trentaine de gestes avant le premier repas. Une carte en demande un.
 *
 * ── Ce qu'une entrée est, et ce qu'elle n'est pas ─────────────────────────
 *
 * C'est un POINT DE DÉPART, pas un plat imposé. Ses quantités sont une
 * assiette de référence — ce qu'on sert habituellement, pas ce que la
 * personne doit manger. Elle ajuste, elle remplace, elle retire.
 *
 * C'est aussi ce qui rend la bibliothèque bien plus large qu'elle n'en a
 * l'air : dinde à la place du poulet, quinoa à la place de la semoule, et
 * vingt-sept cartes couvrent des centaines de repas sans une photo de plus.
 *
 * ── Les photos décrivent ce qu'elles montrent ─────────────────────────────
 *
 * Chaque composition a été relue sur la photo, pas sur l'intention. Quatre
 * repas ont été RENOMMÉS pour coller à l'image : le saumon est servi avec
 * des haricots verts et non des courgettes, le skyr avec de la confiture et
 * non une pomme, et le bol de yaourt-banane-amandes porte un filet de miel
 * que personne n'avait demandé. Mentir d'un ingrédient sur une vignette,
 * c'est apprendre au lecteur à ne plus croire les autres.
 *
 * ── Les quantités ─────────────────────────────────────────────────────────
 *
 * Toutes dans l'unité du catalogue, et à l'état qu'il déclare : le riz, les
 * pâtes et les pommes de terre se pèsent CUITS, les flocons d'avoine CRUS
 * (on les pèse secs, avant de les tremper). Confondre les deux triple ou
 * divise par trois l'apport compté.
 */

import type { LignePerso, RepasId } from './planPerso';

export interface RepasBibliotheque {
  /** Identifiant stable. Il nomme aussi le fichier de la photo. */
  id: string;
  nom: string;
  /**
   * Les créneaux où ce repas a du sens.
   *
   * Un déjeuner et un dîner sont la même assiette — protéine, féculent,
   * légume — et le programme le dit lui-même : « les repas doivent rester
   * interchangeables entre catégories ». Les ranger dans un seul créneau
   * aurait divisé la bibliothèque par deux pour rien.
   */
  creneaux: readonly RepasId[];
  /** L'assiette de référence. Un point de départ, jamais une prescription. */
  lignes: readonly LignePerso[];
  /**
   * La photo n'existe pas encore : l'écran montre une vignette neutre
   * (`VignetteRepas`). À retirer le jour où le fichier est déposé — le test
   * refuse un repas marqué ainsi qui aurait sa photo, et l'inverse.
   */
  photoAVenir?: true;
}

const l = (foodId: string, qty: number): LignePerso => ({ foodId, qty });

/** Les créneaux les plus fréquents, pour alléger la liste. */
const MATIN: readonly RepasId[] = ['pdej', 'collation1', 'collation2'];
const EN_CAS: readonly RepasId[] = ['collation1', 'collation2', 'pdej'];
const PLAT: readonly RepasId[] = ['dejeuner', 'diner'];
/** Les collations seulement : ni petit-déjeuner, ni plat. */
const COLLATION: readonly RepasId[] = ['collation1', 'collation2'];

export const BIBLIOTHEQUE_REPAS: readonly RepasBibliotheque[] = [
  // ------------------------------------------------- matin et collations --
  {
    id: 'skyr-fruits-rouges-amandes',
    nom: 'Skyr, flocons d’avoine, fruits rouges, amandes',
    creneaux: MATIN,
    lignes: [l('skyr', 200), l('avoine', 50), l('fruitsRouges', 100), l('amandes', 20)],
  },
  {
    id: 'porridge-banane-cacahuete',
    nom: 'Porridge, banane, beurre de cacahuète',
    creneaux: MATIN,
    lignes: [l('avoine', 60), l('lait', 250), l('banane', 1), l('beurreCacahuete', 20)],
  },
  {
    id: 'fromage-blanc-banane-avoine',
    nom: 'Fromage blanc, banane, flocons d’avoine',
    creneaux: MATIN,
    lignes: [l('fromageBlanc', 200), l('banane', 1), l('avoine', 40)],
  },
  {
    id: 'oeufs-pain-fromage-frais-pomme',
    nom: 'Œufs, pain complet, fromage frais, pomme',
    creneaux: MATIN,
    lignes: [l('oeuf', 3), l('pain', 60), l('fromageFrais', 30), l('pomme', 1)],
  },
  {
    id: 'pancakes-avoine-fruits',
    nom: 'Pancakes à l’avoine, fromage blanc, banane, fruits rouges',
    creneaux: ['pdej'],
    /* Le seul repas de la bibliothèque qui demande de cuisiner. Les œufs
       sont dans la pâte : ils comptent, même s'ils ne se voient pas. */
    lignes: [
      l('avoine', 60),
      l('oeuf', 2),
      l('fromageBlanc', 150),
      l('banane', 1),
      l('fruitsRouges', 80),
    ],
  },
  {
    id: 'oeufs-flocons-fruits-rouges',
    nom: 'Œufs, flocons croustillants, fruits rouges, lait',
    creneaux: ['pdej'],
    lignes: [l('oeuf', 3), l('floconsCroustillants', 50), l('lait', 200), l('fruitsRouges', 80)],
  },
  {
    id: 'pain-confiture-yaourt-banane',
    nom: 'Pain complet, confiture, yaourt, banane',
    creneaux: MATIN,
    lignes: [l('pain', 60), l('confiture', 25), l('yaourtGrec', 150), l('banane', 1)],
  },
  {
    /* RENOMMÉ : la photo montre de la confiture, pas la pomme que la liste
       d'origine annonçait. On décrit l'assiette, pas l'intention. */
    id: 'skyr-confiture-amandes',
    nom: 'Skyr, confiture, amandes',
    creneaux: EN_CAS,
    lignes: [l('skyr', 200), l('confiture', 20), l('amandes', 20)],
  },
  {
    id: 'pain-cacahuete-confiture',
    nom: 'Pain complet, beurre de cacahuète, confiture, fruits',
    creneaux: EN_CAS,
    lignes: [
      l('pain', 60),
      l('beurreCacahuete', 20),
      l('confiture', 20),
      l('pomme', 1),
      l('banane', 1),
    ],
  },

  // -------------------------------------------------- déjeuners et dîners --
  {
    id: 'poulet-riz-brocolis',
    nom: 'Poulet, riz, brocolis',
    creneaux: PLAT,
    lignes: [l('poulet', 150), l('riz', 250), l('brocolisCuits', 150), l('huile', 10)],
  },
  {
    id: 'boeuf-riz-haricots-verts',
    nom: 'Bœuf maigre, riz, haricots verts',
    creneaux: PLAT,
    lignes: [l('boeuf', 150), l('riz', 250), l('haricotsVerts', 150)],
  },
  {
    /* RENOMMÉ : haricots verts sur la photo, courgettes dans la liste. */
    id: 'saumon-pates-haricots-verts',
    nom: 'Saumon, pâtes, haricots verts',
    creneaux: PLAT,
    lignes: [l('saumon', 150), l('pates', 250), l('haricotsVerts', 150)],
  },
  {
    /* RENOMMÉ : haricots verts sur la photo, brocolis dans la liste. */
    id: 'saumon-riz-haricots-verts',
    nom: 'Saumon, riz, haricots verts',
    creneaux: PLAT,
    lignes: [l('saumon', 150), l('riz', 250), l('haricotsVerts', 150)],
  },
  {
    id: 'poulet-pdt-haricots-verts',
    nom: 'Poulet, pommes de terre, haricots verts',
    creneaux: PLAT,
    lignes: [l('poulet', 150), l('pommesDeTerre', 250), l('haricotsVerts', 150)],
  },
  {
    id: 'boeuf-pdt-courgettes',
    nom: 'Bœuf maigre, pommes de terre, courgettes et haricots verts',
    creneaux: PLAT,
    lignes: [
      l('boeuf', 150),
      l('pommesDeTerre', 250),
      l('courgettes', 100),
      l('haricotsVerts', 100),
    ],
  },
  {
    id: 'poisson-blanc-riz-ratatouille',
    nom: 'Poisson blanc, riz, ratatouille',
    creneaux: PLAT,
    lignes: [
      l('poissonBlanc', 180),
      l('riz', 250),
      l('courgettes', 80),
      l('aubergine', 80),
      l('poivrons', 60),
      l('tomates', 60),
    ],
  },
  {
    /* Premier plat sans viande ni poisson de la bibliothèque. */
    id: 'haricots-rouges-riz-haricots-verts',
    nom: 'Haricots rouges, riz, haricots verts',
    creneaux: PLAT,
    lignes: [l('haricotsRouges', 200), l('riz', 200), l('haricotsVerts', 150)],
  },
  {
    id: 'lentilles-riz-legumes',
    nom: 'Lentilles, riz, légumes',
    creneaux: PLAT,
    lignes: [
      l('lentilles', 200),
      l('riz', 200),
      l('courgettes', 80),
      l('poivrons', 60),
      l('brocolisCuits', 80),
    ],
  },
  {
    id: 'skyr-banane-cacahuete',
    nom: 'Skyr, banane, beurre de cacahuète',
    creneaux: EN_CAS,
    lignes: [l('skyr', 200), l('banane', 1), l('beurreCacahuete', 20)],
  },
  {
    /* RENOMMÉ : la photo porte un filet de miel que la demande ne
       mentionnait pas. On décrit l'assiette, pas la commande. */
    id: 'yaourt-banane-amandes-miel',
    nom: 'Yaourt, banane, amandes, miel',
    creneaux: EN_CAS,
    lignes: [l('yaourtGrec', 200), l('banane', 1), l('amandes', 20), l('confiture', 15)],
  },
  {
    id: 'pain-oeufs-pomme',
    nom: 'Œufs brouillés, pain complet, pomme',
    creneaux: MATIN,
    lignes: [l('oeuf', 3), l('pain', 60), l('pomme', 1)],
  },
  {
    /* Le seul repas de la bibliothèque qui met l'avocat au travail. */
    id: 'avocat-oeufs-pain',
    nom: 'Avocat, œufs brouillés, pain complet',
    creneaux: MATIN,
    lignes: [l('avocat', 80), l('oeuf', 3), l('pain', 60)],
  },
  {
    id: 'poulet-pdt-carottes',
    nom: 'Poulet, pommes de terre, carottes',
    creneaux: PLAT,
    lignes: [l('poulet', 150), l('pommesDeTerre', 250), l('carottes', 150)],
  },
  {
    id: 'dinde-pates-brocolis',
    nom: 'Dinde, pâtes, brocolis',
    creneaux: PLAT,
    lignes: [l('dinde', 150), l('pates', 250), l('brocolisCuits', 150), l('huile', 10)],
  },
  {
    id: 'thon-pates-tomates',
    nom: 'Thon au naturel, pâtes, tomates',
    creneaux: PLAT,
    lignes: [l('thon', 150), l('pates', 250), l('tomates', 100), l('huile', 10)],
  },
  {
    /* Le seul qui sert de la semoule. Boulgour et quinoa s'obtiennent
       ensuite par remplacement : même famille, même geste. */
    id: 'boeuf-semoule-poivrons',
    nom: 'Bœuf maigre, semoule, poivrons',
    creneaux: PLAT,
    lignes: [l('boeuf', 150), l('semoule', 250), l('poivrons', 120), l('huile', 10)],
  },
  {
    id: 'omelette-pdt-salade',
    nom: 'Omelette, pommes de terre, salade',
    creneaux: PLAT,
    lignes: [
      l('oeuf', 4),
      l('pommesDeTerre', 250),
      l('salade', 50),
      l('tomates', 80),
      l('concombre', 60),
      l('huile', 10),
    ],
  },
  // ------------------------------------------------- collations à boire --
  /*
   * COLLATIONS À BOIRE (`regles-nutrition-mass.md`, §6 ; Guillaume, 27
   * novembre : « oui », deux avec whey et deux sans, pour tous les
   * programmes). Elles servent aux grosses cibles, où manger toutes ses
   * calories devient difficile : tout se mixe ou se secoue. Recettes et
   * quantités sont celles de l'appli ; le moteur les ajuste comme n'importe
   * quel repas. Les flocons d'avoine se mixent crus.
   *
   * Photos générées par Guillaume (27 novembre), même cadrage que les autres.
   */
  {
    id: 'shaker-avoine-whey-banane',
    nom: 'À boire : flocons d’avoine, whey, banane',
    creneaux: COLLATION,
    lignes: [l('avoine', 60), l('whey', 30), l('banane', 1)],
  },
  {
    id: 'shaker-avoine-whey-cacahuete-lait',
    nom: 'À boire : flocons d’avoine, whey, lait, beurre de cacahuète',
    creneaux: COLLATION,
    lignes: [l('avoine', 50), l('whey', 30), l('lait', 250), l('beurreCacahuete', 15)],
  },
  {
    id: 'smoothie-skyr-lait-avoine-fruits-rouges',
    nom: 'À boire : skyr, lait, flocons d’avoine, fruits rouges',
    creneaux: COLLATION,
    lignes: [l('skyr', 200), l('lait', 200), l('avoine', 50), l('fruitsRouges', 100)],
  },
  {
    id: 'smoothie-lait-banane-avoine-amandes',
    nom: 'À boire : lait, banane, flocons d’avoine, amandes',
    creneaux: COLLATION,
    lignes: [l('lait', 300), l('banane', 1), l('avoine', 50), l('amandes', 20)],
  },
  // ============================================ grille du 27 novembre ==
  /*
   * LA GRILLE DE LA BIBLIOTHÈQUE (`regles-repas-automatiques.md`, §5 ;
   * Guillaume, 27 novembre : « go grille bibliothèque, pas d'exclusion
   * soja »). Trente-trois repas pour que chaque personne trouve au moins 7
   * repas par type, quelle que soit son exclusion : sans laitiers, sans
   * gluten, végétarien, et pour les petites cibles (collations légères).
   * Assiettes de référence de l'appli ; le moteur les ajuste.
   *
   * Photos À VENIR (générées par Guillaume) : vignette neutre en attendant.
   */
  // --------------------------------------------------- petits-déjeuners --
  {
    id: 'tofu-brouille-pain-tomates-avocat',
    nom: 'Tofu brouillé, pain complet, tomates, avocat',
    creneaux: ['pdej'],
    lignes: [l('tofu', 150), l('pain', 60), l('tomates', 100), l('avocat', 50)],
  },
  {
    id: 'tofu-brouille-pdt-epinards',
    nom: 'Tofu brouillé, pommes de terre, épinards',
    creneaux: ['pdej'],
    lignes: [l('tofu', 150), l('pommesDeTerre', 200), l('epinards', 100), l('huile', 5)],
  },
  {
    id: 'porridge-soja-banane-noix',
    nom: 'Porridge au soja, banane, noix',
    creneaux: MATIN,
    lignes: [l('avoine', 60), l('boissonSoja', 250), l('banane', 1), l('noix', 15)],
  },
  {
    id: 'yaourt-soja-avoine-fruits-rouges',
    nom: 'Yaourt au soja, flocons d’avoine, fruits rouges',
    creneaux: MATIN,
    lignes: [l('yaourtSoja', 250), l('avoine', 40), l('fruitsRouges', 100), l('confiture', 15)],
  },
  {
    id: 'yaourt-soja-banane-galettes-cacahuete',
    nom: 'Yaourt au soja, banane, galettes de riz, beurre de cacahuète',
    creneaux: MATIN,
    lignes: [l('yaourtSoja', 200), l('banane', 1), l('galettesRiz', 30), l('beurreCacahuete', 15)],
  },
  {
    id: 'quinoa-soja-banane-fruits-rouges',
    nom: 'Bol de quinoa au soja, banane, fruits rouges',
    creneaux: ['pdej'],
    lignes: [l('quinoa', 200), l('boissonSoja', 200), l('banane', 1), l('fruitsRouges', 80)],
  },
  {
    id: 'omelette-patate-douce-epinards',
    nom: 'Omelette, patate douce, épinards',
    creneaux: ['pdej'],
    lignes: [l('oeuf', 3), l('pataeDouce', 200), l('epinards', 100), l('huile', 5)],
  },
  {
    id: 'oeufs-galettes-avocat-orange',
    nom: 'Œufs, galettes de riz, avocat, orange',
    creneaux: MATIN,
    lignes: [l('oeuf', 3), l('galettesRiz', 30), l('avocat', 60), l('orange', 1)],
  },
  {
    id: 'skyr-banane-noix',
    nom: 'Skyr, banane, noix',
    creneaux: MATIN,
    lignes: [l('skyr', 250), l('banane', 1), l('noix', 15), l('confiture', 10)],
  },
  {
    id: 'fromage-blanc-fruits-rouges-kiwi-galettes',
    nom: 'Fromage blanc, fruits rouges, kiwi, galettes de riz',
    creneaux: MATIN,
    lignes: [l('fromageBlanc', 250), l('fruitsRouges', 100), l('kiwi', 1), l('galettesRiz', 30)],
  },
  {
    id: 'oeufs-jambon-pdt-tomates',
    nom: 'Œufs, jambon blanc, pommes de terre, tomates',
    creneaux: ['pdej'],
    lignes: [l('oeuf', 2), l('jambonBlanc', 60), l('pommesDeTerre', 200), l('tomates', 80)],
  },
  {
    id: 'pain-cacahuete-banane-soja',
    nom: 'Pain complet, beurre de cacahuète, banane, boisson au soja',
    creneaux: MATIN,
    lignes: [l('pain', 60), l('beurreCacahuete', 20), l('banane', 1), l('boissonSoja', 200)],
  },
  {
    id: 'yaourt-soja-banane-fruits-rouges-galettes',
    nom: 'Yaourt au soja, banane, fruits rouges, galettes de riz',
    creneaux: MATIN,
    lignes: [l('yaourtSoja', 250), l('banane', 1), l('fruitsRouges', 100), l('galettesRiz', 30)],
    photoAVenir: true,
  },
  {
    id: 'tofu-avocat-tomates-galettes',
    nom: 'Tofu, avocat, tomates, galettes de riz',
    creneaux: ['pdej'],
    lignes: [l('tofu', 120), l('avocat', 60), l('tomates', 100), l('galettesRiz', 40)],
  },
  // --------------------------------------------------------- collations --
  {
    id: 'yaourt-soja-fruits-rouges-noix',
    nom: 'Yaourt au soja, fruits rouges, noix',
    creneaux: COLLATION,
    lignes: [l('yaourtSoja', 200), l('fruitsRouges', 100), l('noix', 10)],
  },
  {
    id: 'yaourt-soja-kiwi-galettes',
    nom: 'Yaourt au soja, kiwi, galettes de riz',
    creneaux: COLLATION,
    lignes: [l('yaourtSoja', 200), l('kiwi', 1), l('galettesRiz', 20)],
  },
  {
    id: 'galettes-cacahuete-pomme',
    nom: 'Galettes de riz, beurre de cacahuète, pomme',
    creneaux: COLLATION,
    lignes: [l('galettesRiz', 30), l('beurreCacahuete', 15), l('pomme', 1)],
    photoAVenir: true,
  },
  {
    id: 'pois-chiches-tomates-concombre',
    nom: 'Pois chiches, tomates, concombre, huile d’olive',
    creneaux: COLLATION,
    lignes: [l('poisChiches', 120), l('concombre', 100), l('tomates', 100), l('huile', 5)],
    photoAVenir: true,
  },
  {
    id: 'tofu-tomates-galettes',
    nom: 'Tofu, tomates, galettes de riz',
    creneaux: COLLATION,
    lignes: [l('tofu', 100), l('tomates', 100), l('galettesRiz', 20)],
    photoAVenir: true,
  },
  {
    id: 'skyr-fruits-rouges',
    nom: 'Skyr, fruits rouges',
    creneaux: COLLATION,
    lignes: [l('skyr', 200), l('fruitsRouges', 100)],
    photoAVenir: true,
  },
  {
    id: 'fromage-blanc-pomme',
    nom: 'Fromage blanc, pomme',
    creneaux: COLLATION,
    lignes: [l('fromageBlanc', 200), l('pomme', 1)],
    photoAVenir: true,
  },
  {
    id: 'oeufs-durs-tomates-galettes',
    nom: 'Œufs durs, tomates, galettes de riz',
    creneaux: COLLATION,
    lignes: [l('oeuf', 2), l('tomates', 100), l('galettesRiz', 20)],
    photoAVenir: true,
  },
  {
    id: 'jambon-galettes-concombre',
    nom: 'Jambon blanc, galettes de riz, concombre',
    creneaux: COLLATION,
    lignes: [l('jambonBlanc', 80), l('galettesRiz', 30), l('concombre', 100)],
    photoAVenir: true,
  },
  {
    id: 'thon-galettes-tomates',
    nom: 'Thon, galettes de riz, tomates',
    creneaux: COLLATION,
    lignes: [l('thon', 80), l('galettesRiz', 30), l('tomates', 100)],
    photoAVenir: true,
  },
  {
    id: 'boisson-soja-banane-avoine',
    nom: 'À boire : boisson au soja, banane, flocons d’avoine',
    creneaux: COLLATION,
    lignes: [l('boissonSoja', 250), l('banane', 1), l('avoine', 20)],
    photoAVenir: true,
  },
  // ----------------------------------------------------- plats (midi, soir) --
  {
    id: 'tofu-riz-brocolis',
    nom: 'Tofu, riz, brocolis',
    creneaux: PLAT,
    lignes: [l('tofu', 200), l('riz', 250), l('brocolisCuits', 150), l('huile', 10)],
    photoAVenir: true,
  },
  {
    id: 'tofu-quinoa-poivrons-courgettes',
    nom: 'Tofu, quinoa, poivrons, courgettes',
    creneaux: PLAT,
    lignes: [
      l('tofu', 200),
      l('quinoa', 250),
      l('poivrons', 100),
      l('courgettes', 100),
      l('huile', 10),
    ],
    photoAVenir: true,
  },
  {
    id: 'pois-chiches-semoule-courgettes-carottes',
    nom: 'Pois chiches, semoule, courgettes, carottes',
    creneaux: PLAT,
    lignes: [
      l('poisChiches', 200),
      l('semoule', 250),
      l('courgettes', 100),
      l('carottes', 100),
      l('huile', 10),
    ],
    photoAVenir: true,
  },
  {
    id: 'lentilles-patate-douce-epinards',
    nom: 'Lentilles, patate douce, épinards',
    creneaux: PLAT,
    lignes: [l('lentilles', 250), l('pataeDouce', 250), l('epinards', 100), l('huile', 10)],
    photoAVenir: true,
  },
  {
    id: 'pois-chiches-quinoa-crudites-avocat',
    nom: 'Pois chiches, quinoa, tomates, concombre, avocat',
    creneaux: PLAT,
    lignes: [
      l('poisChiches', 200),
      l('quinoa', 200),
      l('tomates', 100),
      l('concombre', 100),
      l('avocat', 60),
    ],
    photoAVenir: true,
  },
  {
    id: 'haricots-rouges-patate-douce-poivrons',
    nom: 'Haricots rouges, patate douce, poivrons, tomates',
    creneaux: PLAT,
    lignes: [
      l('haricotsRouges', 250),
      l('pataeDouce', 250),
      l('poivrons', 100),
      l('tomates', 100),
      l('huile', 5),
    ],
    photoAVenir: true,
  },
  {
    id: 'tofu-pates-tomates-champignons',
    nom: 'Tofu, pâtes, tomates, champignons',
    creneaux: PLAT,
    lignes: [
      l('tofu', 200),
      l('pates', 250),
      l('tomates', 150),
      l('champignons', 100),
      l('huile', 10),
    ],
    photoAVenir: true,
  },
  {
    id: 'oeufs-riz-epinards',
    nom: 'Œufs au plat, riz, épinards',
    creneaux: PLAT,
    lignes: [l('oeuf', 4), l('riz', 250), l('epinards', 150), l('huile', 5)],
    photoAVenir: true,
  },
];

/** Le chemin de la photo d'un repas, relatif à la base du site. */
export function photoDe(id: string): string {
  return `repas/${id}.webp`;
}

/** Les repas proposables pour un créneau, dans l'ordre de la bibliothèque. */
export function repasPourCreneau(creneau: RepasId): RepasBibliotheque[] {
  // La collation du soir (6e repas de la semaine automatique) puise dans les
  // repas de la collation de l'après-midi : `regles-repas-automatiques.md`, §1.
  const lu = creneau === 'collation3' ? 'collation2' : creneau;
  return BIBLIOTHEQUE_REPAS.filter((r) => r.creneaux.includes(lu));
}

/**
 * Les aliments d'un repas que la personne n'a pas déclarés.
 *
 * ON NE FILTRE PAS LA BIBLIOTHÈQUE AVEC ÇA. Mesuré sur un profil réel de
 * trente-six aliments, un filtre strict n'aurait laissé que neuf cartes sur
 * vingt — et une page presque vide à quelqu'un de plus sélectif. La carte
 * s'affiche donc toujours ; cette liste sert à le DIRE, et à mener au
 * remplacement en un geste.
 */
export function alimentsNonDeclares(
  repas: RepasBibliotheque,
  preferes: readonly string[],
): string[] {
  if (preferes.length === 0) return [];
  const connus = new Set(preferes);
  return repas.lignes.map((x) => x.foodId).filter((id) => !connus.has(id));
}
