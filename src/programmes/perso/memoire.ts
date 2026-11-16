/**
 * ME, MYSELF & I — la mémoire des programmes importés (lot 3 de l'ADR).
 *
 * ── Le problème qu'elle résout ────────────────────────────────────────────
 *
 * Le catalogue et le registre sont des listes compilées, lues de façon
 * SYNCHRONE à une vingtaine d'endroits. Les programmes importés, eux, vivent
 * en base, qui répond en différé. Rendre les vingt lecteurs asynchrones
 * aurait réécrit l'application ; on garde donc une copie en mémoire, remplie
 * une fois avant le premier écran, que les lectures synchrones consultent.
 *
 * ── Pourquoi c'est sûr ────────────────────────────────────────────────────
 *
 * Une version importée ne change plus (seul `archive` bouge), et une version
 * qu'un cycle utilise ne se supprime pas. Un écran qui a lu la mémoire ne
 * peut donc pas tenir un programme périmé. Les écrans qui LISTENT les
 * programmes (la page ME, MYSELF & I) s'abonnent aux changements.
 *
 * Aucun React, aucune base : le remplissage est fait par
 * `db/programmesImportes.ts`.
 */

import type { ProgrammeImporteRow } from '../../db/db';

/** `chargement` jusqu'à la première lecture de la base ; `erreur` si elle a échoué. */
export type EtatMemoire = 'chargement' | 'pret' | 'erreur';

export interface InstantaneMemoire {
  readonly etat: EtatMemoire;
  readonly programmes: readonly ProgrammeImporteRow[];
}

const VIDE: InstantaneMemoire = { etat: 'chargement', programmes: [] };

/*
 * Un objet REMPLACÉ à chaque changement, jamais modifié en place : un
 * abonné React (useSyncExternalStore) compare les références pour savoir
 * s'il doit se redessiner.
 */
let instantane: InstantaneMemoire = VIDE;
const abonnes = new Set<() => void>();

function publier(suivant: InstantaneMemoire): void {
  instantane = suivant;
  for (const f of abonnes) f();
}

export function remplirMemoire(programmes: readonly ProgrammeImporteRow[]): void {
  publier({ etat: 'pret', programmes: [...programmes] });
}

/** La lecture a échoué : POWER, MASS et FEMMES continuent ; les importés sont indisponibles. */
export function memoireEnErreur(): void {
  publier({ etat: 'erreur', programmes: [] });
}

export function lireMemoire(): InstantaneMemoire {
  return instantane;
}

export function programmeEnMemoire(cle: string): ProgrammeImporteRow | null {
  return instantane.programmes.find((p) => p.cle === cle) ?? null;
}

/** Renvoie la fonction de désabonnement. */
export function abonnerMemoire(f: () => void): () => void {
  abonnes.add(f);
  return () => abonnes.delete(f);
}

/** Pour les tests : l'état d'une application qui vient de démarrer. */
export function viderMemoire(): void {
  publier(VIDE);
}
