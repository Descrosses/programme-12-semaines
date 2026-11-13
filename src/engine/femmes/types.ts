/**
 * Types de l'engine : tout ce qui vient d'elle (réglages, historique) par
 * opposition à ce qui vient du programme (`src/data`).
 */

import type { DayIndex, SafetyKey, Version, WeekIndex } from '../../data/femmes/types';

/** Les deux réponses de sécurité. `null` = pas encore répondu. */
export type SafetyAnswers = Record<SafetyKey, boolean | null>;

export const EMPTY_SAFETY: SafetyAnswers = {
  plancherPelvienOk: null,
  sansDouleurLimitante: null,
};

export interface Settings {
  /** Lundi de la semaine 1, format `YYYY-MM-DD`. Tout le calendrier en découle. */
  startDate: string;
  /** Version proposée par défaut à l'ouverture d'une séance. */
  defaultVersion: Version;
  safety: SafetyAnswers;
  /** Poids de départ, en kg. Sert de référence à tout le suivi. */
  poidsDepartKg: number | null;
  /** Jour de la pesée hebdomadaire, 1 = lundi … 7 = dimanche (§4). */
  jourPesee: number;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  startDate: '',
  defaultVersion: 'maison',
  safety: EMPTY_SAFETY,
  poidsDepartKg: null,
  jourPesee: 1,
  soundEnabled: true,
  vibrationEnabled: true,
};

/**
 * Ce qui a réellement été fait sur un exercice, un jour donné. C'est la
 * matière première de la progression de charge en salle.
 */
export interface ExerciseRecord {
  exerciseId: string;
  week: number;
  day: DayIndex;
  date: string;
  version: Version;
  /** Cible du jour : répétitions, ou secondes de gainage. */
  planned: number | null;
  /** Ce qu'elle a fait. */
  actual: number | null;
  /** Charge utilisée, quand elle est réglable. */
  kg: number | null;
  ressenti: Ressenti | null;
  /** Remarque libre sur cet exercice ce jour-là, `null` si elle n'a rien noté. */
  remarque: string | null;
  /**
   * Le détail tour par tour, quand la séance se saisit comme POWER — une
   * ligne par tour validé, `null` pour un tour pas encore fait. `actual` et
   * `kg` en sont tirés (voir `appliquerTour`) : la progression des charges
   * continue de lire ces deux champs-là, sans rien savoir des tours.
   */
  tours?: (TourFait | null)[];
}

export interface TourFait {
  reps: number;
  kg: number | null;
}

/**
 * Le ressenti remplace le RPE du programme 12 semaines.
 *
 * Trois niveaux et pas dix : à 5 mois post-partum, ce qu'on veut savoir c'est
 * « est-ce que c'était trop », pas graduer une échelle. Une échelle fine donne
 * l'illusion de la précision et se remplit au hasard.
 */
export type Ressenti = 'facile' | 'ok' | 'dur';

export const RESSENTI_LABELS: Record<Ressenti, string> = {
  facile: 'Facile',
  ok: 'Correct',
  dur: 'Dur',
};

/** Historique indexé par exercice, occurrences triées du plus ancien au plus récent. */
export type HistoryIndex = Record<string, ExerciseRecord[]>;

/** Une pesée hebdomadaire (§4). */
export interface WeightRecord {
  date: string;
  week: number;
  kg: number;
}

/** Contexte complet nécessaire pour construire une séance. */
export interface SessionContext {
  settings: Settings;
  history: HistoryIndex;
}

export const EMPTY_CONTEXT: SessionContext = {
  settings: DEFAULT_SETTINGS,
  history: {},
};

/** Repère dans le calendrier. */
export interface Slot {
  week: WeekIndex;
  day: DayIndex;
}
