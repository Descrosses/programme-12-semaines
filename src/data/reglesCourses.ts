/**
 * Transcription de `regles-courses.md` — aucune logique.
 * Relu tableau par tableau par `reglesCourses.test.ts`.
 */

import type { FoodCategory } from './nutrition';

/**
 * §1 — ce qu'on achète pour un aliment pesé cuit, et son facteur de
 * rendement (poids cuit ÷ poids cru). Un aliment absent garde son poids.
 */
export const RENDEMENTS: Readonly<Record<string, { achat: string; facteur: number }>> = {
  riz: { achat: 'Riz blanc (cru)', facteur: 2.98 },
  pates: { achat: 'Pâtes (crues)', facteur: 2.1 },
  semoule: { achat: 'Semoule (crue)', facteur: 2.93 },
  pommesDeTerre: { achat: 'Pommes de terre (crues, épluchées)', facteur: 1 },
  lentilles: { achat: 'Lentilles (sèches)', facteur: 2.73 },
  haricotsRouges: { achat: 'Haricots rouges (secs)', facteur: 2.5 },
  poulet: { achat: 'Blanc de poulet (cru)', facteur: 0.8 },
  dinde: { achat: 'Escalope de dinde (crue)', facteur: 0.74 },
  boeuf: { achat: 'Bœuf maigre (cru)', facteur: 0.73 },
  poissonBlanc: { achat: 'Filet de poisson blanc (cru)', facteur: 0.8 },
  saumon: { achat: 'Pavé de saumon (cru)', facteur: 0.8 },
  brocolisCuits: { achat: 'Brocolis (crus)', facteur: 1.11 },
  haricotsVerts: { achat: 'Haricots verts (crus)', facteur: 0.93 },
  carottes: { achat: 'Carottes (crues)', facteur: 0.94 },
  courgettes: { achat: 'Courgettes (crues)', facteur: 0.73 },
  aubergine: { achat: 'Aubergine (crue)', facteur: 0.8 },
};

/** §1 — les légumineuses, qui existent aussi en conserve (poids égoutté ≈ cuit). */
export const EN_CONSERVE: readonly string[] = ['lentilles', 'haricotsRouges'];

/** §2 — arrondis vers le haut. */
export const ARRONDI_COURSES = { seuil: 1000, petit: 10, grand: 50 } as const;

/** §3 — les rayons, dans l'ordre de l'écran. */
export const RAYONS = [
  { id: 'viandes', nom: 'Viandes et poissons' },
  { id: 'cremerie', nom: 'Crèmerie et œufs' },
  { id: 'fruitsLegumes', nom: 'Fruits et légumes' },
  { id: 'epicerie', nom: 'Épicerie' },
  { id: 'boulangerie', nom: 'Boulangerie' },
] as const;

export type RayonId = (typeof RAYONS)[number]['id'];

/** §3 — le rayon d'une famille du catalogue. */
export const RAYON_DE_FAMILLE: Readonly<Record<FoodCategory, RayonId>> = {
  proteine: 'viandes',
  laitier: 'cremerie',
  fruit: 'fruitsLegumes',
  legume: 'fruitsLegumes',
  feculent: 'epicerie',
  legumineuse: 'epicerie',
  gras: 'epicerie',
  autre: 'epicerie',
};

/** §3 — les deux exceptions : les œufs à la crèmerie, le pain à la boulangerie. */
export const RAYON_D_ALIMENT: Readonly<Record<string, RayonId>> = {
  oeuf: 'cremerie',
  pain: 'boulangerie',
};
