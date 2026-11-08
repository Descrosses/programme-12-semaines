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
}

const l = (foodId: string, qty: number): LignePerso => ({ foodId, qty });

/** Les créneaux les plus fréquents, pour alléger la liste. */
const MATIN: readonly RepasId[] = ['pdej', 'collation1', 'collation2'];
const EN_CAS: readonly RepasId[] = ['collation1', 'collation2', 'pdej'];
const PLAT: readonly RepasId[] = ['dejeuner', 'diner'];

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
    lignes: [l('poulet', 150), l('riz', 250), l('brocolis', 150), l('huile', 10)],
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
      l('brocolis', 80),
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
    lignes: [l('dinde', 150), l('pates', 250), l('brocolis', 150), l('huile', 10)],
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
];

/** Le chemin de la photo d'un repas, relatif à la base du site. */
export function photoDe(id: string): string {
  return `repas/${id}.webp`;
}

/** Les repas proposables pour un créneau, dans l'ordre de la bibliothèque. */
export function repasPourCreneau(creneau: RepasId): RepasBibliotheque[] {
  return BIBLIOTHEQUE_REPAS.filter((r) => r.creneaux.includes(creneau));
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
