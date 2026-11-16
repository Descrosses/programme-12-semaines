/**
 * La forme canonique d'un programme normalisé (ADR §3).
 *
 * Sert à une seule chose : reconnaître qu'un fichier réimporté est
 * EXACTEMENT un programme déjà stocké, pour ne pas en créer une copie. Deux
 * fichiers qui ne diffèrent que par l'ordre de leurs clés ou leur mise en
 * page donnent la même forme ; un seul caractère d'une consigne, une seule
 * répétition, et elles diffèrent.
 *
 * L'ordre des LISTES, lui, est conservé : l'ordre des exercices d'une séance
 * fait partie de la prescription.
 *
 * Pur : aucun React, aucune base.
 */

import type { ProgrammeNormalise } from './types';

function trier(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(trier);
  if (typeof v === 'object' && v !== null) {
    return Object.fromEntries(
      Object.keys(v)
        .sort()
        .map((k) => [k, trier((v as Record<string, unknown>)[k])]),
    );
  }
  return v;
}

export function formeCanonique(programme: ProgrammeNormalise): string {
  return JSON.stringify(trier(programme));
}
