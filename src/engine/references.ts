/**
 * Les références de force — fonctions pures, sans base ni React.
 *
 * Trois règles, toutes décidées par Guillaume :
 *
 * 1. **Aucune conversion de matériel.** La référence d'un exercice se cherche
 *    sur le MÊME exercice ET la MÊME variante. Un développé couché évalué à la
 *    barre ne donne aucune référence pour la Smith : la réponse est « rien »,
 *    pas une valeur devinée.
 * 2. **Aucune formule.** Un test sous-maximal reste une charge et un nombre de
 *    répétitions. Ce fichier n'estime aucun 1RM.
 * 3. **Rien ne s'efface.** La référence en cours est la plus récente ; les
 *    précédentes restent dans l'historique, avec leur date.
 */

import type { ReferenceForceRow } from '../db/db';

export type SaisieReference = Omit<ReferenceForceRow, 'id' | 'creeLe'>;

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Ce qui ne va pas dans une saisie, ou `null` si elle est enregistrable.
 *
 * Refuser plutôt que corriger : une charge à 0 passerait pour un test fait à
 * vide, une date mal formée rangerait le test n'importe où dans l'historique.
 */
export function erreurReference(s: SaisieReference): string | null {
  if (s.exercice.trim() === '') return 'Exercice manquant.';
  if (s.variante.trim() === '') return 'Matériel manquant.';
  if (!Number.isFinite(s.chargeKg) || s.chargeKg <= 0) return 'La charge doit être positive.';
  if (!Number.isInteger(s.reps) || s.reps < 1) return 'Au moins une répétition.';
  if (s.modalite === 'direct' && s.reps !== 1) {
    return 'Un test direct est un 1RM : une seule répétition.';
  }
  if (!DATE.test(s.date) || Number.isNaN(Date.parse(`${s.date}T00:00:00Z`))) {
    return 'Date invalide.';
  }
  return null;
}

/** Du plus récent au plus ancien : par date, puis par heure d'écriture. */
function plusRecentDabord(a: ReferenceForceRow, b: ReferenceForceRow): number {
  return b.date.localeCompare(a.date) || b.creeLe - a.creeLe;
}

/**
 * Toutes les évaluations d'un exercice, de la plus récente à la plus
 * ancienne. Avec `variante`, celles de ce matériel seulement.
 */
export function historiqueReferences(
  lignes: readonly ReferenceForceRow[],
  exercice: string,
  variante?: string,
): ReferenceForceRow[] {
  return lignes
    .filter((r) => r.exercice === exercice && (variante === undefined || r.variante === variante))
    .sort(plusRecentDabord);
}

/**
 * La référence en cours pour CET exercice avec CE matériel — la plus récente
 * — ou `null`. Jamais celle d'un autre matériel.
 */
export function referenceCourante(
  lignes: readonly ReferenceForceRow[],
  exercice: string,
  variante: string,
): ReferenceForceRow | null {
  return historiqueReferences(lignes, exercice, variante)[0] ?? null;
}

/**
 * Les matériels avec lesquels cet exercice a DÉJÀ été évalué.
 *
 * Sert à dire « tu as une référence à la barre, pas à la Smith : une nouvelle
 * évaluation est recommandée » — sans jamais transposer la première.
 */
export function variantesEvaluees(
  lignes: readonly ReferenceForceRow[],
  exercice: string,
): string[] {
  return [...new Set(historiqueReferences(lignes, exercice).map((r) => r.variante))];
}
