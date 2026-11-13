/**
 * Le programme hors séances : profil, objectif, sécurité (§1), calendrier,
 * suivi (§4). Transcription seule.
 */

import { phaseOf } from './phases';
import type { DayIndex, SafetyKey, WeekIndex } from './types';
import { WEEKS } from './types';

// ---------------------------------------------------------------------------
// Objectif (§ en-tête)
// ---------------------------------------------------------------------------

export const OBJECTIF = {
  /** Ce qui a été demandé. */
  annonce: { deKg: 57, aKg: 51.5, label: '56-58 → 51-52 kg' },
  /**
   * Ce que le programme vise réellement. C'est CE chiffre que l'appli affiche
   * partout : « Une perte plus rapide en post-partum augmente le risque de
   * fonte musculaire, de fatigue et de rebond. »
   */
  realiste: { minKg: 3, maxKg: 4, label: '-3 à -4 kg sur 8 semaines' },
  rappel:
    'Le but des 8 semaines : reconstruire une base solide (gainage, force, énergie), pas atteindre un chiffre à tout prix.',
};

// ---------------------------------------------------------------------------
// Sécurité (§1) — non négociable
// ---------------------------------------------------------------------------

export interface SafetyCheck {
  key: SafetyKey;
  question: string;
  /** Ce que ça change concrètement dans l'appli tant que c'est « non ». */
  consequence: string;
  /** Détail dépliable, repris du .md. */
  detail: string;
  /** Une réponse « non » interdit-elle de s'entraîner du tout ? */
  blocking: boolean;
}

export const SAFETY_CHECKS: SafetyCheck[] = [
  /*
   * DEUX questions, non datées, et aucune n'est bloquante.
   *
   * La base d'origine en posait trois, propres au post-partum, dont une
   * bloquait l'accès à toute séance tant que la visite post-natale n'avait
   * pas eu lieu. Un programme ouvert à toutes ne peut pas exiger ça.
   *
   * Ce qui est conservé, et c'est l'essentiel : une réponse « non » ÉCARTE
   * des exercices et les remplace. Le programme ne se contente pas de
   * prévenir, il change.
   */
  {
    key: 'plancherPelvienOk',
    question: 'Tu t’entraînes sans gêne du périnée à l’effort ?',
    consequence:
      'Si non : pas de saut, pas de corde à sauter, pas de charge au-dessus de la tête. L’appli remplace ces exercices d’elle-même, elle ne les retire pas.',
    detail:
      'Une fuite à l’effort, même légère, même occasionnelle, n’est pas une fatalité et n’est pas liée à l’âge. Elle se rééduque. En attendant, les mouvements qui augmentent brutalement la pression abdominale attendent — le reste du programme est inchangé.',
    blocking: false,
  },
  {
    key: 'sansDouleurLimitante',
    question: 'Tu es sans douleur qui t’empêche un mouvement ?',
    consequence:
      'Si non : aucun exercice en flexion du tronc. Le gainage passe sur des variantes qui gardent le dos neutre.',
    detail:
      'Une gêne qui revient au même endroit, ou qui te fait modifier ta technique, mérite un avis avant d’être chargée. Ce questionnaire ne diagnostique rien : il écarte ce qui risque d’aggraver, le temps que tu saches.',
    blocking: false,
  },
];

// ---------------------------------------------------------------------------
// Calendrier
// ---------------------------------------------------------------------------

/**
 * Jours d'entraînement de chaque semaine.
 *
 * Le .md donne 3 séances en phase 1 et 4 ensuite, sans nommer les jours :
 * lundi / mercredi / vendredi, plus samedi à partir de la phase 2. Au moins un
 * jour de récupération sépare deux séances.
 */
export const WEEK_DAYS: Record<WeekIndex, DayIndex[]> = Object.fromEntries(
  WEEKS.map((w) => [w, phaseOf(w).sessionsPerWeek === 3 ? [0, 1, 2] : [0, 1, 2, 3]]),
) as Record<WeekIndex, DayIndex[]>;

export const TOTAL_SESSIONS = WEEKS.reduce((n, w) => n + WEEK_DAYS[w].length, 0);

// ---------------------------------------------------------------------------
// Suivi (§4)
// ---------------------------------------------------------------------------

export const SUIVI = {
  pesee:
    'Pesée 1×/semaine, même jour, même moment. Pas plus souvent : le poids post-partum fluctue beaucoup et une pesée quotidienne ne mesure que du bruit.',
  /** Semaine du point d'étape et seuil de déclenchement. */
  checkpointWeek: 4 as WeekIndex,
  checkpointSeuilKg: 1,
  checkpointAction:
    'Si à S4 la perte est inférieure à 1 kg : réduire légèrement les féculents du soir, jamais les protéines.',
  fatigueAction:
    'Si fatigue excessive ou baisse de forme : ne pas insister sur le déficit, remonter les calories de 100-150 kcal.',
  but: OBJECTIF.rappel,
};
