/**
 * QUI FAIT FOI pour la cible du jour : les menus, ou les chiffres saisis.
 *
 * Une seule règle, et elle va dans ce sens-là :
 *
 *   1. DES MENUS SONT AFFICHÉS → ce sont eux. Leur somme est écrite sous les
 *      yeux de la personne ; annoncer une cible qui la contredit créerait
 *      deux vérités, et ce dépôt sait ce que ça coûte (l'écart de 830 kcal
 *      rappelé dans `Meal.items`). Les chiffres saisis sont alors ignorés —
 *      pas effacés : ils ressortent intacts le jour où les menus s'en vont.
 *
 *   2. PAS DE MENUS, MAIS DES CHIFFRES SAISIS → ce sont eux, tels quels.
 *      Aucun ajustement de phase : l'allègement de deload se calcule en
 *      réduisant les quantités DES REPAS, et sans repas il n'y a rien à
 *      réduire. Inventer un pourcentage à la place serait prescrire.
 *
 *   3. NI L'UN NI L'AUTRE → `null`. L'écran invite à poser ses chiffres au
 *      lieu d'afficher des zéros qui ressembleraient à une cible.
 *
 * Pur : aucun React, aucune base.
 */

import type { CiblesNutrition } from '../data/ciblesNutrition';
import { macrosValides } from '../data/ciblesNutrition';
import {
  NUTRITION_TARGETS,
  type DayKind,
  type NutritionPhase,
  type NutritionTarget,
} from '../data/nutrition';
import { targetForPhase } from './nutrition';

export interface SourceCible {
  /** Le plan historique, avec ses neuf prises, est-il affiché ? */
  menus: boolean;
  /** Les chiffres saisis, ou `null`. */
  cibles: CiblesNutrition | null;
}

export type OrigineCible = 'menus' | 'saisie';

export interface CibleResolue {
  cible: NutritionTarget;
  origine: OrigineCible;
}

const LIBELLES: Record<DayKind, string> = {
  train: 'Jour d’entraînement',
  rest: 'Jour de repos',
};

export function cibleDuJour(
  kind: DayKind,
  source: SourceCible,
  phase: NutritionPhase = 'normal',
): CibleResolue | null {
  if (source.menus) {
    return { cible: targetForPhase(NUTRITION_TARGETS[kind], phase), origine: 'menus' };
  }
  const saisie = source.cibles?.[kind];
  if (!macrosValides(saisie)) return null;
  return {
    cible: {
      kind,
      label: LIBELLES[kind],
      kcal: saisie.kcal,
      proteinG: saisie.proteinG,
      carbsG: saisie.carbsG,
      fatG: saisie.fatG,
      // Pas de repas : c'est précisément ce qui distingue ce cas de l'autre.
      meals: [],
      note: '',
    },
    origine: 'saisie',
  };
}
