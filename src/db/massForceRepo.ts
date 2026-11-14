/**
 * MASS FORCE — l'enregistrement des choix du cycle.
 *
 * Un choix hors liste est refusé : chaque option est un exercice à part, avec
 * son historique, et une option inventée créerait un historique orphelin.
 */
import { erreurChoix } from '../programmes/massforce/depart';
import { db } from './db';

export const MASS_FORCE_PROGRAMME_ID = 'mass-force';

export async function enregistrerChoixForce(
  cycleId: number,
  choix: Record<string, string>,
): Promise<void> {
  const erreur = erreurChoix(choix);
  if (erreur !== null) throw new Error(erreur);
  await db.cycles.update(cycleId, { massForce: { choix: { ...choix } } });
}
