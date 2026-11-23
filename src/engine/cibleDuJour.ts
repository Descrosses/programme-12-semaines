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

import type { CiblesMacros, CiblesNutrition, CibleSaisie } from '../data/ciblesNutrition';
import { cibleSaisie } from '../data/ciblesNutrition';
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

/** La cible posée par la personne : les calories, et les macros qu'elle a posées. */
export interface CibleSaisieDuJour extends CibleSaisie {
  kind: DayKind;
  label: string;
}

export type CibleResolue =
  | { cible: NutritionTarget; origine: 'menus' }
  | { cible: CibleSaisieDuJour; origine: 'saisie' };

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
  // Les calories suffisent (décision du 23 novembre) ; les macros sont facultatives.
  const saisie = cibleSaisie(source.cibles?.[kind]);
  if (saisie === null) return null;
  return { cible: { kind, label: LIBELLES[kind], ...saisie }, origine: 'saisie' };
}

// ------------------------------------------------------- ce qu'il reste --

export interface Ecart {
  kcal: number;
  /** `null` quand la macro n'est pas posée : rien à comparer, rien à dire. */
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
}

interface MacrosMangees {
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

/** Cible moins ce qui est compté, arrondi. Une macro non posée reste `null`. */
export function ecartCible(cible: CibleSaisie, compte: MacrosMangees): Ecart {
  const d = (c: number | null, m: number) => (c === null ? null : Math.round(c - m));
  return {
    kcal: Math.round(cible.kcal - compte.kcal),
    proteinG: d(cible.proteinG, compte.proteinG),
    carbsG: d(cible.carbsG, compte.carbsG),
    fatG: d(cible.fatG, compte.fatG),
  };
}

/** « a », « a et b », « a, b et c ». */
export function listeFr(items: readonly string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} et ${items[items.length - 1]}`;
}

/** Le journal du jour : « Il reste 1 160 kcal, 74 g de protéines… pour atteindre ta cible. » */
export function phraseReste(e: Ecart): string {
  if (e.kcal <= 0)
    return `Tu dépasses ta cible de ${Math.abs(e.kcal).toLocaleString('fr-FR')} kcal.`;
  const items = [`${e.kcal.toLocaleString('fr-FR')} kcal`];
  if (e.proteinG !== null) items.push(`${String(e.proteinG)} g de protéines`);
  if (e.carbsG !== null) items.push(`${String(e.carbsG)} g de glucides`);
  if (e.fatG !== null) items.push(`${String(e.fatG)} g de lipides`);
  return `Il reste ${listeFr(items)} pour atteindre ta cible.`;
}

/**
 * Ce que l'encart des Réglages dit d'une journée en cours de saisie, ou
 * `null` quand il n'y a rien à dire (tout est posé).
 */
export function messageCibles(v: CiblesMacros): string | null {
  const macrosManquantes = [v.proteinG, v.carbsG, v.fatG].filter((x) => x === null).length;
  if (v.kcal === null) {
    return macrosManquantes === 3
      ? 'Rien de posé pour cette journée.'
      : 'Il manque les calories : c’est le seul chiffre nécessaire pour afficher une cible.';
  }
  if (macrosManquantes > 0) {
    return 'Calories posées : la cible s’affiche. Les macros sont facultatives.';
  }
  return null;
}
