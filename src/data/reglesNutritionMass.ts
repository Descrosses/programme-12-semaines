/**
 * Transcription de `regles-nutrition-mass.md` — aucune logique.
 * Relu tableau par tableau par `reglesNutritionMass.test.ts`.
 *
 * Le « regard MASS » n'est pas un second calcul : ce sont les quelques
 * valeurs qui diffèrent des règles communes (`reglesCiblesNutrition.ts`)
 * quand la personne suit un programme MASS ET vise une prise de masse.
 */

import type { NombreRepas } from './reglesRepasAutomatiques';

/** Le regard porté sur le calcul : les règles communes, ou celles de MASS. */
export type Regard = 'commun' | 'mass';

/** §3 — protéines en prise de masse sous MASS, en g par kg. */
export const PROTEINES_G_KG_MASS_PRISE = 2.0;

/** §5 — seuil d'alerte des glucides en prise de masse sous MASS, en g par kg. */
export const GLUCIDES_ALERTE_G_KG_MASS_PRISE = 3;

/**
 * §6 — le nombre de repas par défaut d'une semaine composée en prise de
 * masse, par programme MASS. MASS CONGESTION reste à 4 : son propre document
 * écrit « 4 prises par jour » (premier de ses six principes).
 */
export const REPAS_PAR_DEFAUT_MASS: Readonly<Record<string, NombreRepas>> = {
  'mass-force': 5,
  mass8: 5,
  mass4: 4,
};

/**
 * §6 — le nombre de repas CONSEILLÉ sous MASS en prise de masse (Guillaume,
 * 27 novembre : « 4 repas, conseillé 5 pour une meilleure répartition des
 * macros mais 4 est possible »). Un conseil affiché, jamais une contrainte.
 */
export const REPAS_CONSEILLES_MASS_PRISE: NombreRepas = 5;

/** §6 — le conseil, mot pour mot. */
export const CONSEIL_REPAS_MASS =
  '5 repas par jour sont conseillés pour mieux répartir tes protéines, tes glucides et tes lipides. 4 restent possibles.';
