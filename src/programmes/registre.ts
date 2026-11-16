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

import { PROGRAMME_PAR_DEFAUT, tousLesProgrammes } from '../data/catalogue';
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
 * L'identifiant de FEMMES 8, écrit ici en clair.
 *
 * Le registre ne peut pas importer `db/femmesRepo` (la base importe déjà le
 * registre) : un test vérifie que les deux valeurs restent égales.
 */
export const FEMMES_SANS_MODULE = 'femmes8';

export const ID_PROGRAMME_INDISPONIBLE = 'indisponible';

/**
 * Le module d'un programme que MAJK ne connaît pas : aucune semaine, aucune
 * séance, l'onglet Réglages seul (pour restaurer une sauvegarde). L'App
 * affiche à sa place l'écran « Programme indisponible ».
 */
export const MODULE_INDISPONIBLE: ModuleProgramme = {
  id: ID_PROGRAMME_INDISPONIBLE,
  onglets: [{ route: 'settings', label: 'Réglages', icon: 'settings', vue: 'settings' }],
  reglages: { eyebrow: 'Programme indisponible', refPoids: null, force: false },
  dureeSemaines: 0,
  semaines: [],
  joursDeLaSemaine: () => [],
  blocDeLaSemaine: () => null,
  couleurDuBloc: () => 'transparent',
  getSession: () => null,
};

/**
 * Le module à utiliser pour un cycle.
 *
 * ── Le repli sur POWER 12, et où il s'arrête (lot 3 de l'ADR perso) ───────
 *
 * Sans cycle (`null`), FEMMES 8 (qui a ses propres écrans mais dont l'App
 * calcule la semaine avec ce module), et tout programme inscrit au catalogue
 * compilé sans module : POWER 12, comme toujours. Rien ne change pour eux.
 *
 * Un identifiant que MAJK ne connaît PAS — absent du catalogue compilé, sans
 * module, pas FEMMES — n'ouvre plus POWER 12 en silence : ce serait jouer les
 * séances de POWER et enregistrer ses séries sous un cycle qui n'est pas le
 * sien (un programme importé disparu, par exemple). Il rend le module
 * « indisponible ». Décision de Guillaume, 16 novembre.
 */
export function modulePourCycle(programmeId: string | null): ModuleProgramme {
  const trouve = moduleParId(programmeId);
  if (trouve !== null) return trouve;
  const connu =
    programmeId === null ||
    programmeId === FEMMES_SANS_MODULE ||
    tousLesProgrammes().some((p) => p.id === programmeId);
  if (!connu) return MODULE_INDISPONIBLE;
  return moduleParId(PROGRAMME_PAR_DEFAUT) ?? POWER12;
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
