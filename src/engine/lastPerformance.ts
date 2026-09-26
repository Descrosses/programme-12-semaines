/**
 * « La dernière fois, tu as fait ça. »
 *
 * Ce que ça résout : pour savoir ce qu'il avait soulevé la semaine d'avant,
 * Guillaume devait quitter la séance, ouvrir Progrès, retrouver le mouvement,
 * puis revenir. Entre deux séries, avec les mains pleines, personne ne le fait.
 * L'information vient donc à lui, sur la carte de l'exercice.
 *
 * ── D'où vient le chiffre ───────────────────────────────────────────────────
 *
 * De `HistoryIndex`, c'est-à-dire de ce que Guillaume a RÉELLEMENT saisi —
 * exactement la matière que `applyProgression` utilise déjà pour §11. Pas une
 * deuxième requête, pas une deuxième vérité : si les deux divergeaient un jour,
 * l'écran dirait une chose et la suggestion de charge en ferait une autre.
 *
 * La charge planifiée du tableau §9 n'entre jamais ici. Elle dit ce qui était
 * prévu ; cet encart dit ce qui a été fait, et c'est tout son intérêt.
 *
 * ── Ce qu'on ne fait pas ────────────────────────────────────────────────────
 *
 * Aucune flèche rouge, aucun jugement quand la valeur baisse. Une semaine de
 * deload EST une baisse de charge, un ajustement orange aussi : les peindre en
 * rouge apprendrait à Guillaume à ignorer la couleur. La baisse est affichée,
 * simplement, sans mise en forme alarmante.
 *
 * C'est de l'affichage en lecture seule. Rien ici ne touche à §11.
 */

import { fr } from './format';
import type { Occurrence } from './types';

/**
 * Mesures où un chiffre plus BAS est meilleur.
 *
 * Un sprint de 1,78 s après 1,84 s est une progression, pas une régression.
 * Sans ça la flèche pointerait à l'envers sur les deux seuls mouvements du
 * programme qui se mesurent au chrono.
 */
export const LOWER_IS_BETTER = new Set(['test-sprint-10m', 'test-sprint-20m']);

export function lowerIsBetter(exerciseId: string): boolean {
  return LOWER_IS_BETTER.has(exerciseId);
}

export type Trend = 'up' | 'flat' | 'down';

export interface LastPerformance {
  /** Semaine de la dernière occurrence réelle. */
  week: number;
  /** « 77,5 kg », « 235 cm », « 1,78 s ». */
  value: string;
  /** « RPE 7 », ou `null` quand aucun RPE n'a été saisi ce jour-là. */
  rpe: string | null;
  /** « +2,5 kg », ou `null` s'il n'y a rien à quoi comparer. */
  delta: string | null;
  trend: Trend;
}

/** Ce qu'on compare sur ce mouvement : des kilos, ou une mesure. */
interface Champ {
  lire: (o: Occurrence) => number | null;
  unit: string;
  /** Le RPE n'a de sens qu'en face d'une charge. */
  avecRPE: boolean;
}

/**
 * La dernière performance réelle, prête à afficher — ou `null`.
 *
 * `null` dans trois cas, et c'est voulu : aucune occurrence enregistrée, aucune
 * occurrence chiffrée (gainage, mobilité — il n'y a rien à comparer et inventer
 * une comparaison serait pire que se taire), ou un exercice qu'on fait pour la
 * première fois. Sur la semaine 1, les neuf exercices afficheraient sinon neuf
 * lignes identiques sans information, qui repousseraient les champs de saisie
 * hors de l'écran.
 */
export function lastPerformance(
  occurrences: Occurrence[] | undefined,
  opts: { exerciseId: string; measureUnit?: string | null; before: number },
): LastPerformance | null {
  /*
   * On s'arrête AVANT la semaine en cours. Sans ça, dès la première série
   * validée du jour, l'encart afficherait « Semaine 3 » en parlant de la série
   * que Guillaume vient de faire — il veut savoir ce qu'il avait fait LA
   * DERNIÈRE FOIS.
   *
   * Pas de filtre sur `completed` : ce champ vaut `false` sur les mouvements
   * mesurés, parce qu'un saut n'enregistre pas de reps. Le vrai critère est
   * qu'il y ait une valeur à montrer, et c'est celui qu'on applique plus bas.
   * Une séance sautée ne produit aucune ligne, donc aucune occurrence.
   */
  const faites = (occurrences ?? []).filter((o) => o.week < opts.before);
  if (faites.length === 0) return null;

  const derniere = faites[faites.length - 1]!;
  const champ = champDe(derniere, opts.measureUnit ?? null);
  if (champ === null) return null;

  const valeur = champ.lire(derniere);
  if (valeur === null) return null;

  /*
   * L'occurrence de référence est la dernière AVANT celle-ci qui portait le
   * même genre de valeur. On ne remonte pas plus loin qu'il ne faut : ce qui
   * intéresse Guillaume est « depuis la dernière fois », pas « depuis le
   * début ».
   */
  const precedente = faites
    .slice(0, -1)
    .reverse()
    .find((o) => champ.lire(o) !== null);
  const avant = precedente ? champ.lire(precedente) : null;

  const ecart = avant === null ? null : arrondi(valeur - avant);
  const trend = tendance(ecart, opts.exerciseId);

  return {
    week: derniere.week,
    value: `${fr(valeur)} ${champ.unit}`,
    rpe: champ.avecRPE && derniere.rpe !== null ? `RPE ${fr(derniere.rpe)}` : null,
    delta: ecart === null || ecart === 0 ? null : `${ecart > 0 ? '+' : '−'}${fr(Math.abs(ecart))} ${champ.unit}`,
    trend,
  };
}

/**
 * Kilos d'abord, mesure ensuite.
 *
 * Un Speed Squat se compte en kilos et n'a pas de RPE cible : il tombe donc
 * naturellement dans le premier cas, avec sa charge et sans RPE. Un Broad Jump
 * n'a pas de kilos mais une distance : c'est elle qui compte.
 */
function champDe(o: Occurrence, measureUnit: string | null): Champ | null {
  if (o.kg !== null) return { lire: (x) => x.kg, unit: 'kg', avecRPE: true };
  if (o.measure !== null && o.measure !== undefined && measureUnit) {
    return { lire: (x) => x.measure ?? null, unit: measureUnit, avecRPE: false };
  }
  return null;
}

/**
 * Monté, stable, ou descendu — du point de vue de la PERFORMANCE.
 *
 * Sur un sprint, les deux derniers sens sont inversés : perdre six centièmes
 * est une progression.
 */
function tendance(ecart: number | null, exerciseId: string): Trend {
  if (ecart === null || ecart === 0) return 'flat';
  const mieux = lowerIsBetter(exerciseId) ? ecart < 0 : ecart > 0;
  return mieux ? 'up' : 'down';
}

/** Deux décimales suffisent, et évitent les 2,4999999999 de la soustraction. */
function arrondi(n: number): number {
  return Math.round(n * 100) / 100;
}
