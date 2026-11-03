/**
 * Le registre des programmes jouables.
 *
 * ── La règle, et pourquoi elle tient ici ───────────────────────────────────
 *
 * Le catalogue (`data/catalogue.ts`) dit ce qui EXISTE : POWER 12, POWER 28,
 * MASS 4, MASS 8, MASS 12. Le registre dit ce qui se JOUE. Les deux ne
 * coïncident pas, et c'est voulu : un programme peut figurer au catalogue
 * comme « à venir » longtemps avant d'avoir un module.
 *
 * Un test vérifie que les deux listes restent cohérentes dans le seul sens
 * qui compte : tout programme annoncé `disponible` au catalogue DOIT avoir un
 * module ici. L'inverse est permis — un module peut exister avant d'être
 * annoncé, le temps de le vérifier.
 */

import { PROGRAMME_PAR_DEFAUT } from '../data/catalogue';
import { POWER12 } from './power12';
import type { ModuleProgramme } from './types';

/** Tous les modules réellement jouables, dans l'ordre du catalogue. */
export const MODULES: readonly ModuleProgramme[] = [POWER12];

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
