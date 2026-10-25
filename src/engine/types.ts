/**
 * Types de l'engine : tout ce qui vient de l'utilisateur (réglages, historique)
 * par opposition à ce qui vient du programme (`src/data`).
 */

import type { DayIndex, MainLiftId, RPETarget, WeekIndex } from '../data/types';
import type { PerformedSet } from './setFormat';

/** Les 1RM réellement testés. Mis à jour par le combine initial et le final. */
export type OneRMKey = 'back-squat' | 'bench-press' | 'deadlift' | 'weighted-pullup';

export interface Settings {
  /**
   * Date du samedi du combine initial, au format `YYYY-MM-DD`.
   * Tout le calendrier en découle.
   */
  startDate: string;
  /** §4 — meilleur des 3 broad jumps du combine initial, en cm. Figée. */
  broadJumpBaselineCm: number | null;
  /** 1RM les plus récemment TESTÉS (le combine de S8 n'en teste aucun). */
  oneRM: Partial<Record<OneRMKey, number>>;
}

export const DEFAULT_SETTINGS: Settings = {
  startDate: '',
  broadJumpBaselineCm: null,
  oneRM: {},
};

/** Une série réellement effectuée, telle que stockée en base. */
export interface SetRecord {
  exerciseId: string;
  week: number;
  day: DayIndex;
  /** `YYYY-MM-DD`. */
  date: string;
  setIndex: number;
  plannedKg: number | null;
  plannedReps: number | null;
  actualKg: number | null;
  actualReps: number | null;
  actualRpe: number | null;
  /** §11 cas 5 — rep ratée. */
  failed: boolean;
}

/**
 * Ce que l'engine retient d'un exercice pour une semaine donnée : la charge la
 * plus lourde réellement travaillée, le RPE le plus élevé ressenti, et s'il y a
 * eu un échec. C'est la matière première de `applyProgression`.
 */
export interface Occurrence {
  exerciseId: string;
  week: number;
  /**
   * Jour de la séance.
   *
   * Une occurrence est une SÉANCE, pas une semaine. La nuance n'a l'air de
   * rien parce qu'un seul mouvement du programme revient deux fois dans la
   * même semaine — le Broad Jump, vendredi puis samedi. Sans le jour, ces deux
   * séances se confondaient en une seule ligne, et le saut du vendredi
   * devenait invisible depuis le samedi.
   *
   * Pour les quarante autres exercices, qui n'apparaissent qu'un jour par
   * semaine, ce champ ne change strictement rien : une semaine = une séance.
   */
  day: DayIndex;
  kg: number | null;
  /**
   * Charge que le plan annonçait ce jour-là. La différence `kg − plannedKg`
   * est le décalage cumulé de l'exercice : c'est lui qu'on reporte de semaine
   * en semaine (progression cumulative, décision de Guillaume).
   */
  plannedKg: number | null;
  rpe: number | null;
  failed: boolean;
  /** Cible de RPE qui s'appliquait ce jour-là. */
  targetRPE: RPETarget | null;
  /** Au moins une série validée. Une séance sautée ne produit pas d'occurrence. */
  completed: boolean;
  /**
   * Meilleure mesure de la semaine pour un mouvement qui ne se compte pas en
   * kilos : distance d'un saut en cm, d'un porté en m, temps d'un sprint en s.
   *
   * Absent sur les mouvements chargés, et absent des anciennes données : c'est
   * `buildHistoryIndex` qui le remplit, depuis les mêmes séries que le reste.
   * `applyProgression` l'ignore — §11 ne parle que de kilos.
   */
  measure?: number | null;
  /**
   * L'unité de `measure` pour cette séance-là : « m » ou « pas ».
   *
   * Portée par l'occurrence et non déduite de l'exercice, parce qu'un porté
   * peut se faire en mètres une semaine et en pas sur place la suivante selon
   * la place disponible. Absente des données d'avant ce champ, ce qui veut
   * dire « mètres » — c'était la seule possibilité.
   *
   * Rien ne convertit l'une en l'autre, et deux unités ne se comparent
   * jamais : voir `measureUnit.ts`.
   */
  measureUnit?: string | null;
  /**
   * Le détail série par série de cette séance-là.
   *
   * Pourquoi en plus des agrégats : « 115 kg · RPE 8 » ne dit pas combien de
   * séries ni de combien de reps, et c'est précisément ce qu'il faut savoir
   * avant de charger la barre. 5 × 3 à 115 kg et 2 × 3 à 115 kg sont deux
   * séances différentes.
   *
   * Absent des données construites avant ce champ, donc toujours optionnel.
   * `applyProgression` ne le lit pas : §11 raisonne sur la charge la plus
   * lourde et le RPE le plus élevé, pas sur la forme de la séance.
   */
  sets?: PerformedSet[];
}

/** Historique indexé par exercice, occurrences triées par semaine croissante. */
export type HistoryIndex = Record<string, Occurrence[]>;

/** Un relevé de readiness (§4). */
export interface ReadinessRecord {
  date: string;
  week: number;
  day: DayIndex;
  jumpCm: number;
}

export type ReadinessLevel = 'vert' | 'orange' | 'rouge';

export interface ReadinessResult {
  level: ReadinessLevel;
  /** Écart en % par rapport à la référence. −3.2 = 3,2 % en dessous. */
  pctDelta: number;
  jumpCm: number;
  baselineCm: number;
  /** Phrase affichée sous le feu tricolore. */
  label: string;
  /** Ce que l'application va concrètement changer dans la séance. */
  effect: string;
}

/** Contexte complet nécessaire pour construire une séance. */
export interface SessionContext {
  settings: Settings;
  history: HistoryIndex;
  readiness: ReadinessResult | null;
  /** §11 cas 7 — performances explosives en baisse 2 semaines de suite. */
  explosiveDecline: boolean;
}

export const EMPTY_CONTEXT: SessionContext = {
  settings: DEFAULT_SETTINGS,
  history: {},
  readiness: null,
  explosiveDecline: false,
};

/** Repère dans le calendrier du programme. */
export interface Slot {
  week: WeekIndex;
  day: DayIndex;
}

export type { DayIndex, MainLiftId, WeekIndex };
