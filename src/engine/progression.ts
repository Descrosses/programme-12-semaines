/**
 * §11 — Règles de progression.
 *
 * Modèle retenu (décision de Guillaume) : **progression cumulative par
 * décalage**. Le tableau §9 garde la forme de la montée en charge semaine
 * après semaine ; l'historique réel y ajoute un décalage qui persiste.
 *
 *     décalage   = dernière charge réelle − charge que le plan annonçait ce jour-là
 *     suggestion = charge du plan cette semaine + décalage + ajustement §11
 *
 * C'est ce qui permet à la fois de ne jamais « revenir au tableau » après une
 * déviation, et de continuer à progresser quand tout se passe comme prévu
 * (cas 1 : le tableau monte, le décalage suit).
 *
 * La colonne RPE du tableau, elle, ne bouge jamais : c'est la référence à
 * laquelle on compare le ressenti.
 *
 * Rien n'est appliqué en silence : l'appli propose, Guillaume accepte ou
 * refuse et saisit sa propre charge.
 */

import { PROGRESSION_RULES } from '../data/program';
import type { LoadStep, RPETarget } from '../data/types';
import { capKg, roundIntoRange, roundToStep } from './rounding';
import type { Occurrence } from './types';

/** Les cas de §11 que cette fonction peut émettre. */
export type ProgressionCase = 1 | 2 | 3 | 4 | 5;

export interface ProgressionResult {
  /** `null` = aucune règle applicable, on affiche le plan tel quel. */
  case: ProgressionCase | null;
  /** Charge proposée, ou `null` si l'exercice n'est pas chargé. */
  suggestedKg: number | null;
  /** Ce que le plan annonçait, avant décalage et ajustement. */
  plannedKg: number | null;
  /** Décalage cumulé reporté depuis la dernière occurrence. */
  offsetKg: number;
  source: 'plan' | 'historique';
  /** Phrase affichée à côté du bouton « accepter ». Vide si rien à proposer. */
  reason: string;
  /** Une suggestion n'est jamais appliquée sans un geste de Guillaume. */
  requiresConfirm: boolean;
  /** La suggestion a été bloquée par un plafond (RDL à 95 kg). */
  capped: boolean;
}

export interface ProgressionInput {
  /** Occurrences passées de CET exercice, triées par semaine croissante. */
  history: Occurrence[];
  /** Charge annoncée par le plan pour la semaine à venir. */
  plannedKg: number | null;
  /** Cible de RPE de la semaine à venir. `null` → aucune progression automatique. */
  targetRPE: RPETarget | null;
  step: LoadStep;
  /** §11 cas 2 : +5 kg bas du corps, +2,5 kg haut du corps. */
  isLowerBody: boolean;
  /**
   * La case de la semaine est écrite en POURCENTAGE du 1RM.
   *
   * Change la façon de reporter l'écart au plan, et rien d'autre : en
   * proportion plutôt qu'en kilos. Soulever 107,5 là où le plan annonçait
   * 97,5 ne dit pas « +10 kg », ça dit « ton maximum vaut 10,3 % de plus » —
   * et sur une semaine de deload à 70 %, les deux ne donnent pas le même
   * chiffre. Voir `scaleToReal` dans `realLoad.ts`.
   *
   * Faux par défaut : Push Press, RDL et accessoires sont en kilos, et un
   * LEST reste une différence, jamais une proportion.
   */
  enPourcentage?: boolean;
  /** Plafond assumé (RDL S9-11). */
  kgMax?: number;
  /**
   * La semaine à venir est un DELOAD.
   *
   * §11 ne s'y applique pas. Ses règles disent quoi faire d'une séance trop
   * facile ou trop dure ; une semaine de deload, elle, est prescrite par §8 —
   * « zéro série au-dessus de RPE 6 », « tu dois sortir en te disant j'aurais
   * pu en faire plus ». Proposer +5 kg parce que la semaine 7 était facile,
   * c'est contredire la seule semaine dont le but est de dissiper la fatigue.
   *
   * Rien n'est perdu pour autant : le recalage porte déjà le niveau réel sur
   * toutes les semaines, deload compris. §11 n'est que l'ajustement fin
   * par-dessus, et il reprend la semaine suivante.
   */
  isDeload?: boolean;
}

const EPS = 1e-9;

/** `1.103` → « 110,3 % » — en français, la virgule est la décimale. */
function signedPct(facteur: number): string {
  return `${String(Math.round(facteur * 1000) / 10).replace('.', ',')} %`;
}

const NOTHING: ProgressionResult = {
  case: null,
  suggestedKg: null,
  plannedKg: null,
  offsetKg: 0,
  source: 'plan',
  reason: '',
  requiresConfirm: false,
  capped: false,
};

/**
 * Charge suggérée pour la prochaine occurrence d'un exercice.
 *
 * Cas 6 (mauvaise journée) n'est pas traité ici : c'est le feu tricolore de
 * §4, appliqué par `getSession`. Cas 7 (sauts en baisse) est global à la
 * séance, il vit dans `trends.ts`.
 */
export function applyProgression(input: ProgressionInput): ProgressionResult {
  const { history, plannedKg, targetRPE, step, isLowerBody, kgMax, enPourcentage, isDeload } =
    input;

  if (plannedKg === null) return { ...NOTHING };

  const base: ProgressionResult = { ...NOTHING, plannedKg, suggestedKg: plannedKg };

  // Pas d'historique, ou dernière séance sautée : on affiche le plan, sans
  // mention de cas (règle explicite de Guillaume).
  const last = lastCompleted(history);
  if (!last || last.kg === null) return base;

  const offsetKg = last.plannedKg === null ? 0 : round2(last.kg - last.plannedKg);
  /*
   * Le plan recalé sur le réel — dans l'unité de la case.
   *
   * `withOffset` sert de base à tout §11 : c'est « ce que le plan annonce,
   * compte tenu de ce que tu soulèves vraiment ». En pourcentage du 1RM, cette
   * base est le plan MULTIPLIÉ par le rapport réel/prévu ; en kilos, c'est le
   * plan augmenté de l'écart. Les deux coïncident quand les deux semaines
   * partagent la même intensité, et divergent sur les deloads.
   */
  const facteur = last.plannedKg === null || last.plannedKg <= 0 ? 1 : last.kg / last.plannedKg;
  const withOffset =
    enPourcentage === true ? round2(plannedKg * facteur) : round2(plannedKg + offsetKg);

  /*
   * Deload : on affiche le plan recalé, et aucune règle §11 par-dessus.
   *
   * §11 dit quoi faire d'une séance trop facile ou trop dure. Une semaine de
   * deload, elle, est prescrite par §8 — « zéro série au-dessus de RPE 6 ».
   * Proposer +5 kg parce que la semaine d'avant était facile contredirait la
   * seule semaine dont le but est de dissiper la fatigue.
   *
   * Rien n'est perdu : le recalage porte déjà le niveau réel sur toutes les
   * semaines, deload compris. §11 reprend la semaine suivante.
   *
   * Même branche que le bloc contraste ci-dessous — dans les deux cas on
   * reporte l'écart et on ne propose rien.
   */
  // Bloc contraste ou taper : la colonne RPE est vide, la vitesse de barre
  // pilote. On reporte le décalage mais on ne propose aucune règle.
  if (isDeload === true || targetRPE === null || last.targetRPE === null || last.rpe === null) {
    const { kg, capped } = capKg(roundToStep(withOffset, step), kgMax);
    return {
      ...base,
      offsetKg,
      suggestedKg: kg,
      capped,
      source: offsetKg === 0 ? 'plan' : 'historique',
      reason:
        isDeload === true || offsetKg === 0
          ? ''
          : enPourcentage === true
            ? `Pas de RPE cible cette semaine : on garde ton écart au plan, ` +
              `${signedPct(facteur)} de ce qu'il annonce.`
            : `Pas de RPE cible cette semaine : on garde ton décalage de ${signed(offsetKg)} kg.`,
    };
  }

  const verdict = classify(last, history);
  const result = suggest(verdict, {
    last,
    plannedKg,
    offsetKg,
    withOffset,
    step,
    isLowerBody,
    kgMax,
  });
  return { ...base, ...result, offsetKg };
}

// ---------------------------------------------------------------------------
// Classement §11
// ---------------------------------------------------------------------------

type Verdict =
  | { case: 1 }
  | { case: 2; gap: number }
  | { case: 3; gap: number }
  | { case: 4; consecutive: number }
  | { case: 5 };

/**
 * Exception narrative du deadlift, semaine 1 — §7 :
 * « Ton 130 est très probablement sous-estimé : si la semaine 1 sort à
 *   RPE ≤ 6, applique la règle "trop facile" dès la semaine 2. »
 *
 * Le programme nomme la règle (cas 2, +5 kg) au lieu de passer par l'écart de
 * points, qui donnerait ici le cas 3 (+2,5 kg). C'est volontaire : le deadlift
 * est la priorité n°1 et Guillaume veut une réaction franche si le soupçon se
 * confirme.
 *
 * Volontairement une exception isolée : ne PAS généraliser en modifiant les
 * seuils de §11, ça fausserait la progression de tous les autres mouvements.
 */
function deadliftWeek1Override(last: Occurrence): boolean {
  return last.exerciseId === 'deadlift' && last.week === 1 && last.rpe !== null && last.rpe <= 6;
}

function classify(last: Occurrence, history: Occurrence[]): Verdict {
  // Cas 5 — rep ratée. Prioritaire sur tout le reste : « ne retente pas ».
  if (last.failed) return { case: 5 };

  if (deadliftWeek1Override(last)) {
    return { case: 2, gap: round2(last.targetRPE!.min - last.rpe!) };
  }

  const target = last.targetRPE!;
  const rpe = last.rpe!;

  // Cas 4 — plus dur que prévu.
  if (rpe > target.max + EPS) {
    return { case: 4, consecutive: countTrailingTooHard(history) };
  }

  // Cas 2 et 3 — plus facile que prévu. `min` est la borne basse de la cible :
  // avec « RPE ≤ 7 » (min 0) rien n'est jamais « trop facile », ce qui est le
  // sens de la consigne.
  const gap = round2(target.min - rpe);
  if (gap >= PROGRESSION_RULES.wayTooEasy.rpeGapAtLeast - EPS) return { case: 2, gap };
  if (gap >= PROGRESSION_RULES.slightlyTooEasy.rpeGapAtLeast - EPS) return { case: 3, gap };

  // Cas 1 — conforme.
  return { case: 1 };
}

/** Nombre d'occurrences consécutives, en partant de la fin, au-dessus de la cible. */
function countTrailingTooHard(history: Occurrence[]): number {
  let n = 0;
  for (let i = history.length - 1; i >= 0; i--) {
    const o = history[i]!;
    if (!o.completed || o.rpe === null || o.targetRPE === null) break;
    if (o.rpe > o.targetRPE.max + EPS) n++;
    else break;
  }
  return n;
}

// ---------------------------------------------------------------------------
// Suggestion chiffrée
// ---------------------------------------------------------------------------

interface SuggestCtx {
  last: Occurrence;
  plannedKg: number;
  offsetKg: number;
  withOffset: number;
  step: LoadStep;
  isLowerBody: boolean;
  kgMax?: number;
}

function suggest(v: Verdict, c: SuggestCtx): Partial<ProgressionResult> {
  const lastKg = c.last.kg!;
  const rpe = c.last.rpe;
  const cible = c.last.targetRPE!.label;

  switch (v.case) {
    // ---- Cas 1 : conforme. On suit la montée du tableau, décalage inclus.
    case 1: {
      const { kg, capped } = capKg(roundToStep(c.withOffset, c.step), c.kgMax);
      return {
        case: 1,
        suggestedKg: kg,
        capped,
        source: c.offsetKg === 0 ? 'plan' : 'historique',
        reason: capped
          ? `RPE conforme la dernière fois. Plafond atteint : on reste à ${fr(kg)} kg.`
          : c.offsetKg === 0
            ? ''
            : `RPE conforme. On garde ton décalage de ${signed(c.offsetKg)} kg sur le plan.`,
        requiresConfirm: false,
      };
    }

    // ---- Cas 2 : beaucoup trop facile. +5 kg bas, +2,5 kg haut. Pas plus.
    case 2: {
      const bump = c.isLowerBody
        ? PROGRESSION_RULES.wayTooEasy.lowerBodyKg
        : PROGRESSION_RULES.wayTooEasy.upperBodyKg;
      const { kg, capped } = capKg(roundToStep(c.withOffset + bump, c.step), c.kgMax);
      return {
        case: 2,
        suggestedKg: kg,
        capped,
        source: 'historique',
        reason: capped
          ? `RPE ${fr(rpe!)} pour ${cible} : plafond de ${fr(c.kgMax!)} kg atteint, on n’ira pas plus haut sur ce bloc.`
          : `RPE ${fr(rpe!)} pour ${cible} — beaucoup trop facile (cas 2) : +${fr(bump)} kg.`,
        requiresConfirm: true,
      };
    }

    // ---- Cas 3 : légèrement trop facile. +2,5 kg.
    case 3: {
      const bump = PROGRESSION_RULES.slightlyTooEasy.kg;
      const { kg, capped } = capKg(roundToStep(c.withOffset + bump, c.step), c.kgMax);
      return {
        case: 3,
        suggestedKg: kg,
        capped,
        source: 'historique',
        reason: capped
          ? `RPE ${fr(rpe!)} pour ${cible} : plafond de ${fr(c.kgMax!)} kg atteint.`
          : `RPE ${fr(rpe!)} pour ${cible} — un peu trop facile (cas 3) : +${fr(bump)} kg.`,
        requiresConfirm: true,
      };
    }

    // ---- Cas 4 : plus dur que prévu. Même charge. Deux fois de suite : −5 %.
    case 4: {
      if (v.consecutive >= PROGRESSION_RULES.tooHard.recalcAfterOccurrences) {
        const kg = roundToStep(lastKg * PROGRESSION_RULES.tooHard.recalcFactor, c.step);
        return {
          case: 4,
          suggestedKg: kg,
          capped: false,
          source: 'historique',
          reason: `RPE ${fr(rpe!)} pour ${cible}, deux fois de suite (cas 4) : le tableau est recalculé à −5 %, soit ${fr(kg)} kg.`,
          requiresConfirm: true,
        };
      }
      return {
        case: 4,
        suggestedKg: lastKg,
        capped: false,
        source: 'historique',
        reason: `RPE ${fr(rpe!)} pour ${cible} — trop dur (cas 4) : on répète ${fr(lastKg)} kg cette semaine.`,
        requiresConfirm: true,
      };
    }

    // ---- Cas 5 : rep ratée. −5 à −7,5 %, on ne retente pas.
    case 5: {
      const kg = roundIntoRange(
        lastKg * PROGRESSION_RULES.missedRep.loadFactor,
        lastKg * 0.95,
        c.step,
      );
      return {
        case: 5,
        suggestedKg: kg,
        capped: false,
        source: 'historique',
        reason: `Rep ratée à ${fr(lastKg)} kg (cas 5) : on redescend à ${fr(kg)} kg et on reconstruit sur 2 semaines. Ne retente pas.`,
        requiresConfirm: true,
      };
    }
  }
}

// ---------------------------------------------------------------------------

/** Dernière occurrence réellement effectuée. Une séance sautée est ignorée. */
export function lastCompleted(history: Occurrence[]): Occurrence | null {
  for (let i = history.length - 1; i >= 0; i--) {
    const o = history[i]!;
    if (o.completed) return o;
  }
  return null;
}

/** Texte court du cas, pour l'historique et l'écran Progression. */
export const CASE_LABELS: Record<ProgressionCase, string> = {
  1: 'Cas 1 — conforme',
  2: 'Cas 2 — beaucoup trop facile',
  3: 'Cas 3 — un peu trop facile',
  4: 'Cas 4 — trop dur',
  5: 'Cas 5 — rep ratée',
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function fr(n: number): string {
  return String(n).replace('.', ',');
}

function signed(n: number): string {
  return n > 0 ? `+${fr(n)}` : fr(n);
}
