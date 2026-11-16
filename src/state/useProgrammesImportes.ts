/**
 * Les programmes importés, pour un écran qui les LISTE (ME, MYSELF & I).
 *
 * Un import, un archivage ou une suppression remplacent l'instantané de la
 * mémoire ; l'écran abonné se redessine. Les écrans qui résolvent seulement
 * le programme d'un cycle n'en ont pas besoin (ADR, D4).
 */

import { useSyncExternalStore } from 'react';
import { abonnerMemoire, lireMemoire, type InstantaneMemoire } from '../programmes/perso/memoire';

export function useProgrammesImportes(): InstantaneMemoire {
  return useSyncExternalStore(abonnerMemoire, lireMemoire, lireMemoire);
}
