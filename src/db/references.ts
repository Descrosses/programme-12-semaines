/**
 * Les références de force en base : on AJOUTE et on LIT, jamais rien d'autre.
 *
 * Volontairement sans fonction de modification ni de suppression : un test
 * fait est un fait daté. Une erreur de saisie se corrige par un nouveau test,
 * et l'historique garde les deux.
 */

import { db, type ReferenceForceRow } from './db';
import { erreurReference, type SaisieReference } from '../engine/references';

/** Enregistre une évaluation. Refuse une saisie invalide (charge nulle, etc.). */
export async function ajouterReference(saisie: SaisieReference): Promise<number> {
  const erreur = erreurReference(saisie);
  if (erreur !== null) throw new Error(erreur);
  return db.referencesForce.add({ ...saisie, creeLe: Date.now() });
}

/** Toutes les références, tous exercices et tous matériels confondus. */
export async function toutesLesReferences(): Promise<ReferenceForceRow[]> {
  return db.referencesForce.toArray();
}

/** Les références d'un exercice — tous matériels — dans l'ordre de la table. */
export async function referencesDe(exercice: string): Promise<ReferenceForceRow[]> {
  return db.referencesForce.where('exercice').equals(exercice).toArray();
}
