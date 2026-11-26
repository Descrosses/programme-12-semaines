/**
 * Transcription de `regles-repas-automatiques.md` — aucune logique.
 * Relu tableau par tableau par `reglesRepasAutomatiques.test.ts`.
 */

import type { RepasId } from './planPerso';

/** §1 — les repas composés, dans l'ordre de la journée, et leur part. */
export const CRENEAUX_AUTO: readonly { repas: RepasId; part: number }[] = [
  { repas: 'pdej', part: 0.25 },
  { repas: 'dejeuner', part: 0.3 },
  { repas: 'collation2', part: 0.15 },
  { repas: 'diner', part: 0.3 },
];

/** §2 — les bornes des deux leviers. */
export const LEVIERS = {
  proteines: { min: 0.6, max: 2 },
  reste: { min: 0.4, max: 2 },
} as const;

/** §2 — arrondis et minimums, par unité du catalogue. */
export const ARRONDIS: Readonly<Record<string, { pas: number; min: number }>> = {
  g: { pas: 5, min: 5 },
  ml: { pas: 5, min: 5 },
  unité: { pas: 1, min: 1 },
};

/** §3 — l'écart toléré entre un repas ajusté et sa part de la cible. */
export const TOLERANCE_PART = 0.1;

export const JOURS_SEMAINE = [
  'Lundi',
  'Mardi',
  'Mercredi',
  'Jeudi',
  'Vendredi',
  'Samedi',
  'Dimanche',
] as const;
