/**
 * Les CIBLES nutritionnelles, séparées des MENUS.
 *
 * ── Pourquoi les séparer ───────────────────────────────────────────────────
 *
 * L'onglet Nutrition mélangeait deux choses de nature très différente, dans
 * le même fichier et dans le même objet :
 *
 *   LES CIBLES — huit nombres : kcal, protéines, glucides, lipides, pour un
 *   jour d'entraînement et pour un jour de repos. N'importe qui peut les
 *   poser en deux minutes, et quiconque a déjà un diététicien les connaît.
 *
 *   LES MENUS — neuf prises nommées, avec leurs horaires et leurs aliments
 *   exacts. Ça, personne ne peut l'inventer à la place de la personne : c'est
 *   du contenu de coach, pas une fonction d'application.
 *
 * Soudés, ils ne laissaient que deux états possibles : tout le plan de
 * Guillaume, ou rien. Une installation neuve tombait sur « rien » — un onglet
 * vide, sans aucun moyen d'y poser ses propres chiffres.
 *
 * ── La règle d'arbitrage, et pourquoi elle est dans ce sens ────────────────
 *
 * QUAND DES MENUS EXISTENT, CE SONT EUX QUI FONT FOI. Les cibles saisies ne
 * les remplacent pas : elles contrediraient la somme des repas affichés juste
 * en dessous. Ce dépôt a déjà payé ce prix — un écart de 830 kcal entre deux
 * nombres censés dire la même chose — et le commentaire de `Meal.items` le
 * rappelle. Deux vérités valent toujours moins qu'une.
 *
 * Sans menus, les cibles saisies sont la seule vérité, et elles suffisent :
 * barres de macros, écart du jour, suivi des aliments ajoutés.
 */

import type { DayKind } from './types';

/**
 * Les quatre nombres d'une journée, chacun pouvant manquer.
 *
 * `null` est nécessaire : on saisit ces chiffres un par un, et une journée à
 * moitié remplie doit survivre à un changement d'écran. Tant que les quatre
 * n'y sont pas, la journée n'est simplement pas utilisable — voir
 * `macrosValides`, qui est le seul endroit où l'on en décide.
 */
export interface CiblesMacros {
  kcal: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
}

/** Une journée dont les quatre nombres sont là et tiennent dans les bornes. */
export interface MacrosCompletes {
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

/** Les deux journées : entraînement et repos. */
export type CiblesNutrition = Record<DayKind, CiblesMacros>;

/**
 * Bornes de saisie.
 *
 * Larges à dessein : ce ne sont pas des recommandations, seulement le garde-
 * fou contre la faute de frappe — un zéro en trop, une virgule oubliée.
 * L'application ne dit pas à quelqu'un combien il doit manger.
 */
export const BORNES = {
  kcal: { min: 800, max: 8000 },
  proteinG: { min: 0, max: 500 },
  carbsG: { min: 0, max: 1200 },
  fatG: { min: 0, max: 400 },
} as const;

export const CIBLES_VIERGES: CiblesMacros = {
  kcal: null,
  proteinG: null,
  carbsG: null,
  fatG: null,
};

export const CIBLES_NUTRITION_VIERGES: CiblesNutrition = {
  train: CIBLES_VIERGES,
  rest: CIBLES_VIERGES,
};

function nombreValide(v: unknown, bornes: { min: number; max: number }): boolean {
  return typeof v === 'number' && Number.isFinite(v) && v >= bornes.min && v <= bornes.max;
}

/** Les quatre nombres d'une journée tiennent dans les bornes (la barre de macros en a besoin). */
export function macrosValides(m: CiblesMacros | null | undefined): m is MacrosCompletes {
  if (m === null || m === undefined) return false;
  return (
    nombreValide(m.kcal, BORNES.kcal) &&
    nombreValide(m.proteinG, BORNES.proteinG) &&
    nombreValide(m.carbsG, BORNES.carbsG) &&
    nombreValide(m.fatG, BORNES.fatG)
  );
}

/**
 * Une cible UTILISABLE : les calories, et les macros posées.
 *
 * Décision de Guillaume (23 novembre, lot 1 de la nutrition) : seul le
 * chiffre des calories est obligatoire. Les protéines, glucides et lipides
 * sont facultatifs, un par un. Une macro absente reste `null` — jamais 0 :
 * « 0 g de protéines » serait une cible, et fausse.
 */
export interface CibleSaisie {
  kcal: number;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
}

const MACROS = ['proteinG', 'carbsG', 'fatG'] as const;

/**
 * La cible utilisable d'une journée, ou `null` : calories dans les bornes,
 * et chaque macro soit absente, soit dans ses bornes. Une macro hors bornes
 * rend la journée inutilisable : on ne l'efface pas en silence.
 */
export function cibleSaisie(m: CiblesMacros | null | undefined): CibleSaisie | null {
  if (m === null || m === undefined || !nombreValide(m.kcal, BORNES.kcal)) return null;
  const out: CibleSaisie = { kcal: m.kcal as number, proteinG: null, carbsG: null, fatG: null };
  for (const k of MACROS) {
    const v = m[k];
    if (v === null || v === undefined) continue;
    if (!nombreValide(v, BORNES[k])) return null;
    out[k] = v;
  }
  return out;
}

/** Les trois macros sont-elles posées ? (la barre de répartition n'a de sens qu'alors) */
export function macrosPosees(c: CibleSaisie): c is MacrosCompletes {
  return c.proteinG !== null && c.carbsG !== null && c.fatG !== null;
}

export function ciblesValides(c: unknown): c is CiblesNutrition {
  if (typeof c !== 'object' || c === null) return false;
  const v = c as Partial<CiblesNutrition>;
  return cibleSaisie(v.train) !== null && cibleSaisie(v.rest) !== null;
}

/**
 * Les kcal que pèsent les trois macros : 4 / 4 / 9.
 *
 * Sert à SIGNALER un écart, jamais à corriger la saisie. Quelqu'un peut très
 * bien avoir reçu de son diététicien des chiffres qui ne tombent pas juste à
 * l'unité ; lui réécrire ses nombres sous les doigts serait pire que de le
 * laisser tranquille. On montre, on n'impose pas.
 */
export function kcalDesMacros(m: MacrosCompletes): number {
  return Math.round(m.proteinG * 4 + m.carbsG * 4 + m.fatG * 9);
}

/** L'écart entre les kcal annoncées et celles des macros, en pourcentage. */
export function ecartKcal(m: MacrosCompletes): number {
  if (m.kcal <= 0) return 0;
  return Math.abs(kcalDesMacros(m) - m.kcal) / m.kcal;
}

/** Au-delà, l'écran le signale : ce n'est plus un arrondi, c'est une erreur. */
export const ECART_TOLERE = 0.1;
