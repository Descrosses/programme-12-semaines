/**
 * Application des contre-indications de la §1.
 *
 * C'est le module le plus important de l'appli. Le reste fait gagner du temps ;
 * celui-ci évite d'aggraver un diastasis ou de charger un périnée qui n'est pas
 * prêt. Deux principes :
 *
 * 1. **Par défaut, on protège.** Une question sans réponse est traitée comme
 *    un « non ». Tant qu'elle n'a pas répondu, elle est du côté prudent.
 * 2. **On ne retire jamais sans remplacer.** Chaque exercice écarté a un repli
 *    pris dans le programme lui-même — l'appli n'invente aucun mouvement.
 */

import { getExercise } from '../../data/femmes/exercises';
import { RESTRICTION_GATE, type ExerciseDef, type Restriction } from '../../data/femmes/types';
import type { SafetyAnswers } from './types';

/** Une question sans réponse compte comme « non ». */
function levee(answers: SafetyAnswers, restriction: Restriction): boolean {
  return answers[RESTRICTION_GATE[restriction]] === true;
}

/** Première restriction non levée qui s'applique à cet exercice, sinon `null`. */
export function blockingRestriction(
  exercise: ExerciseDef,
  answers: SafetyAnswers,
): Restriction | null {
  for (const r of exercise.restrictions ?? []) {
    if (!levee(answers, r)) return r;
  }
  return null;
}

export interface SafetyResolution {
  exercise: ExerciseDef;
  /** Renseigné quand une substitution a eu lieu. */
  substitutedFor?: { exercise: ExerciseDef; reason: Restriction };
}

/**
 * Remplace l'exercice par son repli tant qu'une contre-indication s'applique.
 *
 * La substitution est elle-même vérifiée : si le repli était lui aussi
 * contre-indiqué, on continuerait de descendre la chaîne. En pratique les
 * replis du programme sont tous des mouvements sans restriction, mais la
 * boucle garde l'invariant vrai si le catalogue évolue.
 */
export function resolveExercise(id: string, answers: SafetyAnswers): SafetyResolution {
  const original = getExercise(id);
  let current = original;
  let reason: Restriction | null = null;
  const seen = new Set<string>([current.id]);

  for (;;) {
    const blocked = blockingRestriction(current, answers);
    if (!blocked) break;
    const fallbackId = current.fallbackId;
    // Pas de repli déclaré, ou boucle : on garde l'exercice mais on le signale.
    if (!fallbackId || seen.has(fallbackId)) {
      return { exercise: current, substitutedFor: { exercise: original, reason: blocked } };
    }
    reason = blocked;
    current = getExercise(fallbackId);
    seen.add(current.id);
  }

  if (current.id === original.id) return { exercise: current };
  return { exercise: current, substitutedFor: { exercise: original, reason: reason! } };
}

/*
 * PLUS DE PORTE BLOQUANTE, et c'est une décision de Guillaume.
 *
 * La base d'origine exigeait le feu vert d'une visite post-natale avant
 * d'ouvrir la moindre séance. Un programme ouvert à toutes ne peut pas
 * conditionner l'accès à un accouchement.
 *
 * La sécurité n'est pas perdue pour autant : elle a changé de nature. Au
 * lieu d'interdire TOUT tant qu'une case n'est pas cochée, elle écarte
 * précisément les exercices concernés et les remplace — ce que fait
 * `resolveExercise` au-dessus. Une question sans réponse est traitée comme
 * un « non », donc le défaut est toujours le choix prudent.
 */

/** Reste-t-il des questions sans réponse ? */

/** Reste-t-il des questions sans réponse ? */
export function hasUnanswered(answers: SafetyAnswers): boolean {
  return Object.values(answers).some((v) => v === null);
}
