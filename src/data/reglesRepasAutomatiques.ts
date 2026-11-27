/**
 * Transcription de `regles-repas-automatiques.md` — aucune logique.
 * Relu tableau par tableau par `reglesRepasAutomatiques.test.ts`.
 */

import type { RepasId } from './planPerso';

/** §1 — le nombre de repas par jour que la semaine sait composer. */
export const NOMBRES_DE_REPAS = [4, 5, 6] as const;
export type NombreRepas = (typeof NOMBRES_DE_REPAS)[number];
export const NOMBRE_DE_REPAS_PAR_DEFAUT: NombreRepas = 4;

export type Creneau = { repas: RepasId; part: number };

/** §1 — les repas composés, dans l'ordre de la journée, et leur part. */
export const CRENEAUX_PAR_NOMBRE: Readonly<Record<NombreRepas, readonly Creneau[]>> = {
  4: [
    { repas: 'pdej', part: 0.25 },
    { repas: 'dejeuner', part: 0.3 },
    { repas: 'collation2', part: 0.15 },
    { repas: 'diner', part: 0.3 },
  ],
  5: [
    { repas: 'pdej', part: 0.2 },
    { repas: 'collation1', part: 0.15 },
    { repas: 'dejeuner', part: 0.25 },
    { repas: 'collation2', part: 0.15 },
    { repas: 'diner', part: 0.25 },
  ],
  6: [
    { repas: 'pdej', part: 0.175 },
    { repas: 'collation1', part: 0.125 },
    { repas: 'dejeuner', part: 0.225 },
    { repas: 'collation2', part: 0.125 },
    { repas: 'diner', part: 0.225 },
    { repas: 'collation3', part: 0.125 },
  ],
};

/**
 * §1 — la cible (kcal) sous laquelle un nombre de repas n'est pas proposé :
 * les collations de la bibliothèque dépasseraient leur part (re-mesuré le
 * 27 novembre avec la grille de la bibliothèque).
 */
export const CIBLE_MINIMALE: Readonly<Record<NombreRepas, number>> = { 4: 0, 5: 1200, 6: 1200 };

/** Les 4 repas par défaut (les semaines composées avant le choix du nombre). */
export const CRENEAUX_AUTO = CRENEAUX_PAR_NOMBRE[NOMBRE_DE_REPAS_PAR_DEFAUT];

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

/**
 * §5 — la grille de la bibliothèque : le nombre de repas possibles, par type
 * (petit-déjeuner, collation, plat), qu'une exclusion seule ou une paire
 * d'exclusions doit laisser.
 */
export const GRILLE_BIBLIOTHEQUE = { seule: 7, paire: 5 } as const;
