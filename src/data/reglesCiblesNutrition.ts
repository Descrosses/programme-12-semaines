/**
 * Les règles de calcul des cibles nutritionnelles, transcrites de
 * `regles-cibles-nutrition.md` (validées par Guillaume le 23 novembre).
 *
 * Aucune logique ici : le calcul vit dans `engine/calculCibles.ts`.
 * `reglesCiblesNutrition.test.ts` relit le .md et compare chaque tableau et
 * chaque valeur. Pour changer une règle : changer le .md ET ce fichier.
 *
 * Les clés reprennent les VALEURS du questionnaire « Votre plan
 * alimentaire » (`assis`, `5000-8000`, `45-75`, `perte`, `modere`…) : une
 * réponse s'y branche sans traduction.
 */

export type Travail = 'assis' | 'debout' | 'physique';
export type Pas = '<5000' | '5000-8000' | '8000-12000' | '>12000' | 'nsp';
export type DureeSeance = '<45' | '45-75' | '>75';
export type Objectif = 'perte' | 'maintien' | 'prise';
export type Rythme = 'progressif' | 'modere' | 'rapide';

/** §3a — activité quotidienne, travail × pas. */
export const ACTIVITE_QUOTIDIENNE: Readonly<Record<Travail, Readonly<Record<Pas, number>>>> = {
  assis: { '<5000': 1.25, '5000-8000': 1.35, '8000-12000': 1.45, '>12000': 1.55, nsp: 1.3 },
  debout: { '<5000': 1.35, '5000-8000': 1.45, '8000-12000': 1.55, '>12000': 1.6, nsp: 1.4 },
  physique: { '<5000': 1.45, '5000-8000': 1.55, '8000-12000': 1.65, '>12000': 1.7, nsp: 1.5 },
};

/** §3b — ajout par séance hebdomadaire, selon la durée moyenne. */
export const PAR_SEANCE: Readonly<Record<DureeSeance, number>> = {
  '<45': 0.025,
  '45-75': 0.035,
  '>75': 0.05,
};

/** « 6 ou plus » compte pour 6. */
export const SEANCES_MAX = 6;
/** Plafond du coefficient total. */
export const COEFFICIENT_MAX = 1.95;

/** §4 — ajustement de la dépense totale selon l'objectif et le rythme. */
export const AJUSTEMENT: Readonly<
  Record<Exclude<Objectif, 'maintien'>, Readonly<Record<Rythme, number>>>
> = {
  perte: { progressif: -0.15, modere: -0.2, rapide: -0.25 },
  prise: { progressif: 0.05, modere: 0.1, rapide: 0.15 },
};

/** §5 — protéines, en g par kg de poids (de référence au-delà de l'IMC seuil). */
export const PROTEINES_G_KG = { defaut: 1.8, perte: 2.2 } as const;

/** §5 — au-delà de cet IMC, le calcul se fait sur le poids d'un IMC de référence. */
export const IMC_POIDS_REFERENCE = { seuil: 30, reference: 25 } as const;

/** §5 — lipides : part des calories, et plancher en g/kg. */
export const LIPIDES = { part: 0.25, minGKg: 0.6 } as const;

/** §5 — sous ce seuil de glucides (g/kg), l'écran le signale. */
export const GLUCIDES_ALERTE_G_KG = 2;

/** §5 — arrondis : calories, puis chaque macro. */
export const ARRONDI = { kcal: 50, macroG: 5 } as const;

/** §6 — planchers de prudence de l'appli (jamais proposer moins). */
export const PLANCHERS_KCAL = { homme: 1500, femme: 1200 } as const;

/** §6 — une perte demandée sous cet IMC n'est pas calculée. */
export const IMC_MIN_PERTE = 18.5;

/** §6 — âge minimum (le questionnaire le refuse déjà). */
export const AGE_MIN = 18;

/** §7 — réajustement toutes les deux semaines. Rythmes en fraction du poids par semaine. */
export const REAJUSTEMENT = {
  palierKcal: 100,
  /** En dessous du minimum : − 100 ; au-dessus du maximum : + 100. */
  perte: { min: 0.005, max: 0.01 },
  /** En dessous du minimum : + 100 ; au-dessus du maximum : − 100. */
  prise: { min: 0.0025, max: 0.005 },
  /** Maintien : écart toléré entre les deux moyennes. */
  maintienEcart: 0.01,
  /** Pesées nécessaires dans chacune des deux semaines. */
  peseesMin: 4,
  /** Jours entre deux points. */
  joursEntrePoints: 14,
} as const;
