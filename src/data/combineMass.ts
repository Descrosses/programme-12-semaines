/**
 * Le combiné d'évaluation de MASS FORCE — sa composition, et rien d'autre.
 *
 * Quatre tests, dans l'ordre donné par Guillaume : développé couché, tirage
 * vertical, squat, push press. Chacun se fait avec un matériel choisi dans une
 * LISTE FERMÉE (décision de Guillaume) : pas de champ libre.
 *
 * Ce fichier ne contient AUCUN protocole, AUCUNE formule, AUCUN critère
 * d'éligibilité : rien de tout cela n'est validé. Il dit quels tests existent
 * et avec quel matériel ils peuvent se faire.
 */

/** La liste fermée des matériels. L'ordre est celui de l'affichage. */
export const VARIANTES = {
  barre: 'Barre libre',
  smith: 'Smith machine',
  halteres: 'Haltères',
  poulie: 'Poulie',
  machine: 'Machine guidée',
} as const;

export type Variante = keyof typeof VARIANTES;

export const estVariante = (v: string): v is Variante => Object.hasOwn(VARIANTES, v);

export interface TestCombine {
  /** L'identifiant sous lequel la référence est rangée (`referencesForce.exercice`). */
  exercice: string;
  nom: string;
  /**
   * Les matériels proposés POUR CE TEST, pris dans la liste fermée. Un
   * tirage vertical ne se fait pas à la barre libre : on ne le propose pas.
   * Le push press : Smith ou barre libre, au choix (décision de Guillaume).
   */
  variantes: readonly Variante[];
}

export const COMBINE_MASS_FORCE: readonly TestCombine[] = [
  {
    exercice: 'developpe-couche',
    nom: 'Développé couché',
    variantes: ['barre', 'smith', 'halteres'],
  },
  { exercice: 'tirage-vertical', nom: 'Tirage vertical', variantes: ['poulie', 'machine'] },
  { exercice: 'squat', nom: 'Squat', variantes: ['barre', 'smith'] },
  { exercice: 'push-press', nom: 'Push press', variantes: ['smith', 'barre'] },
];
