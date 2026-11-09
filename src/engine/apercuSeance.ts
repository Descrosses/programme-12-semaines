import type { ExerciseRole } from '../data/types';
import { fr } from './format';
import type { ResolvedExercise } from './getSession';

/**
 * Ce que l'écran Aujourd'hui annonce d'une séance, et ce que le Résumé en
 * retient à la fin.
 *
 * Deux fonctions pures, communes à TOUS les programmes : elles ne lisent que
 * ce que `ModuleProgramme.getSession` rend, donc POWER 12, MASS et tout
 * programme ajouté plus tard passent par elles sans rien déclarer de plus.
 *
 * Elles n'inventent rien. L'étiquette d'un exercice vient du `role` que les
 * données portent déjà ; la prescription, de la `loadLine` que le moteur a
 * déjà calculée ; un ajustement, de ce que le moteur a déjà décidé ou de ce
 * que la personne a réellement choisi.
 */

/**
 * L'étiquette affichée à côté d'un exercice, tirée de son rôle.
 *
 * `accessory` n'en a VOLONTAIREMENT pas. MASS range tout ce qui n'est pas du
 * tronc dans `accessory` — le champ n'y pilote rien, il est emprunté à la
 * taxonomie de POWER (voir `programmes/mass4/module.ts`). Écrire
 * « Accessoire » sous le squat d'un cycle MASS affirmerait une hiérarchie que
 * ce programme ne prescrit pas. Pas d'étiquette vaut mieux qu'une fausse.
 */
const ETIQUETTE: Record<ExerciseRole, string | null> = {
  main: 'Principal',
  power: 'Explosif',
  core: 'Tronc',
  carry: 'Porté',
  conditioning: 'Cardio',
  test: 'Test',
  accessory: null,
};

export function etiquetteRole(role: ExerciseRole): string | null {
  return ETIQUETTE[role] ?? null;
}

export interface LigneApercu {
  /** « 01 », « 02 »… — la position dans la séance, telle que prescrite. */
  numero: string;
  nom: string;
  etiquette: string | null;
  /** La ligne de charge du moteur, sans retouche : « 5 × 3 × 100 kg ». */
  prescription: string;
}

/** La séance du jour, dans l'ordre où elle se fait. */
export function apercuSeance(exercises: readonly ResolvedExercise[]): LigneApercu[] {
  return exercises.map((ex, i) => ({
    numero: String(i + 1).padStart(2, '0'),
    nom: ex.name,
    etiquette: etiquetteRole(ex.def.role),
    prescription: ex.loadLine,
  }));
}

export interface LigneRecap {
  nom: string;
  /** Une phrase par ajustement, dans l'ordre où le moteur les a posés. */
  details: string[];
}

/**
 * Les ajustements de la séance, réunis en fin de séance.
 *
 * Deux sources, et seulement elles :
 *
 * 1. les ajustements que le moteur a appliqués à l'exercice (bloc, deload,
 *    feu tricolore, cas 7, plafond, recalage sur le réel) — repris par leur
 *    libellé `what`, tel que la carte de l'exercice l'affiche déjà ;
 * 2. la suggestion de charge §11 quand elle demandait une réponse : acceptée,
 *    remplacée par une autre charge, ou restée sans réponse. Une suggestion
 *    sans réponse n'est PAS dite refusée : l'appli ne sait pas si elle a été
 *    lue. Elle dit seulement que la charge du plan est restée.
 *
 * Un exercice sans rien de tout ça n'apparaît pas : le récap ne liste que ce
 * qui a bougé.
 */
export function recapAjustements(
  exercises: readonly ResolvedExercise[],
  overrides: Readonly<Record<string, number>>,
): LigneRecap[] {
  const lignes: LigneRecap[] = [];
  for (const ex of exercises) {
    const details = ex.adjustments.map((a) => a.what);
    const s = ex.suggestion;
    if (s?.requiresConfirm && s.suggestedKg !== null) {
      const choisi = overrides[ex.id];
      if (choisi === undefined) {
        details.push(`Suggestion ${fr(s.suggestedKg)} kg sans réponse — charge du plan gardée`);
      } else if (choisi === s.suggestedKg) {
        details.push(`Suggestion acceptée : ${fr(choisi)} kg`);
      } else {
        details.push(`Suggestion ${fr(s.suggestedKg)} kg remplacée par ${fr(choisi)} kg`);
      }
    }
    if (details.length > 0) lignes.push({ nom: ex.name, details });
  }
  return lignes;
}
