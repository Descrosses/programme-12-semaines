/**
 * Le registre des programmes jouables.
 *
 * ── La règle, et pourquoi elle tient ici ───────────────────────────────────
 *
 * Le catalogue (`data/catalogue.ts`) dit ce qui EXISTE : POWER CYCLE 1, ses transitions,
 * MASS CONGESTION, MASS FORCE, MASS HYPERTROPHIE. Le registre dit ce qui se JOUE. Les deux ne
 * coïncident pas, et c'est voulu : un programme peut figurer au catalogue
 * comme « à venir » longtemps avant d'avoir un module.
 *
 * Un test vérifie que les deux listes restent cohérentes dans le seul sens
 * qui compte : tout programme annoncé `disponible` au catalogue DOIT avoir un
 * module ici. L'inverse est permis — un module peut exister avant d'être
 * annoncé, le temps de le vérifier.
 */

import { PROGRAMME_PAR_DEFAUT } from '../data/catalogue';
import { MASS4 } from './mass4/module';
import { MASS_FORCE } from './massforce/module';
import { POWER12 } from './power12';
import type { ModuleProgramme } from './types';

/** Tous les modules réellement jouables, dans l'ordre du catalogue. */
export const MODULES: readonly ModuleProgramme[] = [POWER12, MASS4, MASS_FORCE];

/**
 * Le module d'un programme, ou `null`.
 *
 * `null` n'est pas une erreur : c'est la réponse pour un programme annoncé
 * mais pas encore écrit. L'appelant décide quoi en faire — l'écran de
 * catalogue n'affiche pas de bouton, l'application retombe sur le programme
 * par défaut.
 */
export function moduleParId(id: string | null): ModuleProgramme | null {
  if (id === null) return null;
  return MODULES.find((m) => m.id === id) ?? null;
}

/**
 * Le module à utiliser pour un cycle, avec un repli sûr.
 *
 * Une base peut porter un cycle dont le programme n'a plus de module — un
 * identifiant renommé, un import d'un fichier plus ancien. Laisser
 * l'application sans programme afficherait un écran vide sans rien expliquer.
 * Elle retombe donc sur POWER 12, qui est le programme historique de cette
 * installation.
 */
export function modulePourCycle(programmeId: string | null): ModuleProgramme {
  return moduleParId(programmeId) ?? moduleParId(PROGRAMME_PAR_DEFAUT) ?? POWER12;
}

/**
 * Ce programme chiffre-t-il son plan alimentaire ?
 *
 * `true` pour POWER 12, dont l'écran Nutrition porte un objectif de calories,
 * des macronutriments et un journal de repas. `false` pour MASS 4, dont le
 * document l'interdit en une phrase : « pas de calories, pas de macros
 * chiffrées, pas de grammes ».
 *
 * Lu depuis les onglets plutôt que déclaré à part : un programme qui ouvre
 * l'écran Nutrition de POWER chiffre forcément, et un qui ouvre les principes
 * ne chiffre forcément pas. Deux sources diraient un jour deux choses
 * différentes.
 *
 * Sert hors de cet écran — la carte de raccourci de l'écran Aujourd'hui
 * annonçait « 3 226 kcal · 190 g de protéines » sous un cycle MASS, alors que
 * l'onglet Nutrition, lui, n'affichait plus aucun chiffre.
 */
export function nutritionChiffree(programme: ModuleProgramme): boolean {
  return programme.onglets.some((o) => o.vue === 'nutrition');
}
