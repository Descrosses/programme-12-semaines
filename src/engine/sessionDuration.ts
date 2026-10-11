/**
 * Durée estimée d'une séance, calculée au lieu d'être écrite à la main.
 *
 * ── Pourquoi calculer ───────────────────────────────────────────────────────
 *
 * Les étiquettes du §3 — « 60 min » le vendredi, « 65 min » le mercredi —
 * ont été écrites une fois, au début du programme, et jamais recalculées.
 * Trois cycles de modifications plus tard, le vendredi durait quatre-vingts
 * minutes sous une étiquette de soixante, et personne ne pouvait le voir :
 * un chiffre figé dans un fichier ne se contredit jamais tout seul.
 *
 * Une estimation calculée, elle, suit les séries, les repos et les
 * ajustements de bloc. Elle se trompe peut-être de cinq minutes, mais jamais
 * de vingt, et elle ne ment plus quand le programme change.
 *
 * ── Le modèle, et ses limites ──────────────────────────────────────────────
 *
 * Volontairement simple et plutôt généreux : mieux vaut annoncer cinq minutes
 * de trop que faire rater un coucher.
 *
 *   - Une répétition coûte 4 s, avec un plancher de 12 s par série : une
 *     série de 2 reps ne se fait pas en huit secondes, on s'installe.
 *   - Un exercice « par côté » compte double, parce qu'il se fait deux fois.
 *   - Une distance coûte 1,6 s par mètre, plancher 20 s — un porté chargé se
 *     parcourt lentement.
 *   - Le repos prescrit est compté après CHAQUE série, y compris la dernière.
 *     Il absorbe à peu près le temps de montage de l'exercice suivant, qui
 *     n'est compté nulle part ailleurs.
 *   - L'échauffement vaut sa durée écrite, le readiness test 4 minutes.
 *   - Les montées de charge d'un test 1RM comptent : 20 s par palier, plus le
 *     repos de l'exercice. Sans elles, un test de deadlift tombait à seize
 *     minutes — alors que les cinq paliers à cinq minutes de repos font à eux
 *     seuls une demi-heure.
 *   - Un essai maximal récupère au moins trois minutes, même quand la trame
 *     n'écrit aucun repos. Les tests de fin de combine sont enchaînés sur le
 *     papier ; personne ne fait un max de tractions puis un max de leg raise
 *     dans la foulée.
 *
 * Ce que le modèle ignore : les montées de charge entre deux exercices
 * lourds, et le temps de discuter avec le voisin de rack.
 */

import type { Work } from '../data/types';

const SEC_PAR_REP = 4;
const SEC_MIN_PAR_SERIE = 12;
const SEC_PAR_METRE = 1.6;
const SEC_MIN_PAR_PORTE = 20;
/** §4 — 3 broad jumps, 1 min de repos entre chaque. */
const SEC_READINESS = 4 * 60;

/** Temps de travail d'UNE série, en secondes. */
export function secondesParSerie(work: Work): number {
  switch (work.kind) {
    case 'reps': {
      const n = work.reps === 'max' ? 12 : typeof work.reps === 'number' ? work.reps : work.reps.max;
      const un = Math.max(SEC_MIN_PAR_SERIE, n * SEC_PAR_REP);
      return work.perSide ? un * 2 : un;
    }
    case 'distance': {
      const un = Math.max(SEC_MIN_PAR_PORTE, work.meters * SEC_PAR_METRE);
      return work.perSide ? un * 2 : un;
    }
    case 'time':
      return work.perSide ? work.seconds * 2 : work.seconds;
    case 'intervals':
      return work.rounds * (work.workSec + work.easySec);
    case 'attempts':
      return work.attempts * SEC_MIN_PAR_SERIE;
    case 'maxSet':
      return 60;
  }
}

/** La durée d'échauffement écrite dans §6, en minutes. « 8-10 min » → 10. */
export function minutesEchauffement(label: string | undefined): number {
  if (!label) return 0;
  const nombres = [...label.matchAll(/\d+/g)].map((m) => Number(m[0]));
  return nombres.length > 0 ? Math.max(...nombres) : 0;
}

/**
 * De quoi estimer une séance : volontairement structurel plutôt que lié à
 * `ResolvedSession`, pour que `getSession` puisse appeler la fonction avant
 * d'avoir fini de construire son objet.
 */
export interface SeanceMesurable {
  warmupDurationLabel?: string | undefined;
  readinessTest: boolean;
  exercises: {
    sets: number;
    work: Work;
    restSec: number;
    /** Paliers d'un test 1RM (§12) : du travail qui ne figure dans aucune série. */
    ramp?: readonly unknown[] | undefined;
  }[];
}

/** Temps d'un palier de montée de charge : le soulever, puis récupérer. */
const SEC_PAR_PALIER = 20;
/** Récupération plancher après un effort maximal, repos écrit ou non. */
const SEC_RECUP_MAX = 180;

/** Durée estimée de la séance, en minutes entières. */
export function dureeEstimeeMin(s: SeanceMesurable): number {
  let sec = minutesEchauffement(s.warmupDurationLabel) * 60;
  if (s.readinessTest) sec += SEC_READINESS;
  for (const ex of s.exercises) {
    const maximal = ex.work.kind === 'maxSet' || ex.work.kind === 'attempts';
    const repos = maximal ? Math.max(ex.restSec, SEC_RECUP_MAX) : ex.restSec;
    sec += ex.sets * (secondesParSerie(ex.work) + repos);
    if (ex.ramp) sec += ex.ramp.length * (SEC_PAR_PALIER + ex.restSec);
  }
  return Math.round(sec / 60);
}

/** « ≈ 74 min » — ce qui s'affiche en tête de séance. */
export function dureeLabel(s: SeanceMesurable): string {
  return `≈ ${dureeEstimeeMin(s)} min`;
}
