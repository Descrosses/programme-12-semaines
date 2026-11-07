/**
 * Les aliments du questionnaire « plan alimentaire » → ceux de MAJK.
 *
 * ── Pourquoi une table, et pas une règle ───────────────────────────────────
 *
 * Les deux catalogues nomment les mêmes aliments autrement : le questionnaire
 * écrit `pomme-de-terre`, MAJK écrit `pommesDeTerre` ; `haricots-rouges`
 * contre `haricotsRouges`. Sur les vingt-sept identifiants, PAS UN ne tombe
 * juste, alors que vingt-quatre des aliments existaient déjà.
 *
 * Une règle de transformation automatique — tirets vers casse chameau —
 * marcherait sur vingt et un et échouerait en silence sur les six autres :
 * `flocons` n'est pas `flocons`, `oeufs` n'est pas `oeufs`, `cacahuete` n'est
 * pas `cacahuete`. Une correspondance fausse ne plante pas : elle compte les
 * calories d'un autre aliment. On l'écrit donc à la main, une ligne par
 * aliment, et un test vérifie que chaque flèche pointe quelque part.
 *
 * ── Le questionnaire dit QUELS aliments, jamais leurs valeurs ──────────────
 *
 * Les deux catalogues ne s'accordent pas sur les chiffres : le questionnaire
 * compte les glucides TOTAUX, fibres comprises, MAJK les glucides
 * assimilables. Sur les amandes, 22 g contre 10 g. Le contrôle 4/4/9 départage
 * sans ambiguïté — 622 kcal calculées pour 579 annoncées côté questionnaire,
 * 574 pour 580 côté MAJK.
 *
 * C'est donc le catalogue de MAJK qui fait foi, et l'import ne transporte que
 * des identifiants. Qui veut corriger une étiquette le fait dans l'appli : la
 * table `foodOverrides` existe pour ça, et sa correction ne touche pas le
 * catalogue des autres.
 *
 * ── Deux arbitrages, tranchés par Guillaume ────────────────────────────────
 *
 * `flocons` → `avoine`, les flocons NATURE, et non les flocons croustillants
 * de son propre plan. Qui mange autre chose corrigera l'étiquette.
 *
 * `riz` et `pates` → les versions CUITES. C'était le piège le plus cher du
 * lot : le riz cru pèse 350 kcal aux 100 g, le cuit environ 120. Se tromper
 * d'état triple l'apport compté, sans que rien ne le signale.
 */

import { FOOD_LIBRARY } from './foodLibrary';

/**
 * Identifiant du questionnaire → identifiant du catalogue MAJK.
 *
 * Vingt-sept entrées, dans l'ordre des cinq étapes du questionnaire.
 */
export const ALIMENTS_QUESTIONNAIRE: Readonly<Record<string, string>> = {
  // --------------------------------------------------------- GLUCIDES (6) --
  riz: 'riz', // Riz CUIT
  pates: 'pates', // Pâtes CUITES
  'pomme-de-terre': 'pommesDeTerre',
  patate: 'pataeDouce', // la coquille de l'identifiant est d'origine : la corriger effacerait l'historique
  flocons: 'avoine', // flocons NATURE
  pain: 'pain',

  // ----------------------------------------------------------- FRUITS (4) --
  banane: 'banane',
  pomme: 'pomme',
  'fruits-rouges': 'fruitsRouges',
  kiwi: 'kiwi',

  // -------------------------------------------------------- PROTÉINES (9) --
  poulet: 'poulet',
  dinde: 'dinde',
  boeuf: 'boeuf',
  oeufs: 'oeuf', // pluriel côté questionnaire, singulier côté catalogue
  saumon: 'saumon',
  'haricots-rouges': 'haricotsRouges',
  skyr: 'skyr',
  'fromage-blanc': 'fromageBlanc',
  whey: 'whey',

  // ---------------------------------------------------------- LIPIDES (3) --
  amandes: 'amandes',
  'chocolat-noir': 'chocolatNoir',
  cacahuete: 'beurreCacahuete',

  // ---------------------------------------------------------- LÉGUMES (5) --
  'haricots-verts': 'haricotsVerts',
  courgettes: 'courgettes',
  poivrons: 'poivrons',
  tomates: 'tomates',
  'petits-pois': 'petitsPois',
};

/**
 * L'aliment de MAJK derrière un identifiant du questionnaire, ou `undefined`.
 *
 * `undefined` et non une approximation : un aliment inconnu doit se voir, pas
 * se faire remplacer par le plus ressemblant. Le questionnaire laisse d'ailleurs
 * ajouter des aliments libres, qui n'auront jamais d'équivalent ici.
 */
export function alimentPour(idQuestionnaire: string): string | undefined {
  const id = ALIMENTS_QUESTIONNAIRE[idQuestionnaire];
  return id !== undefined && id in FOOD_LIBRARY ? id : undefined;
}

/** Ce que le questionnaire a envoyé et que MAJK ne connaît pas. */
export function alimentsInconnus(ids: readonly string[]): string[] {
  return ids.filter((id) => alimentPour(id) === undefined);
}
