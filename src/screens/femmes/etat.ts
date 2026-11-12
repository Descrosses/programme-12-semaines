/** Un changement partiel de l'état des écrans FEMMES, sans muter l'ancien. */
import type { EtatFemmes } from './FemmesScreens';

export function applique(etat: EtatFemmes, modif: Partial<EtatFemmes>): EtatFemmes {
  return { ...etat, ...modif };
}
