/**
 * Progression.
 *
 * Le .md donne des intervalles par phase (« 3-4 tours », « repos 45-60 s »,
 * « planche 20-30 s ») sans dire quelle semaine prend quelle valeur. C'est ICI
 * que le choix est fait, pour qu'il soit visible, testable et discutable — et
 * pas dilué dans un composant d'affichage.
 *
 * La règle retenue : la valeur monte (ou descend, pour le repos) linéairement
 * de la première à la dernière semaine de la phase. Première semaine = borne
 * la plus facile, dernière = borne la plus dure.
 *
 * Deuxième rôle du module : la charge en salle. À la maison le matériel est
 * fixe, il n'y a rien à progresser ; en salle tout est réglable et la charge
 * doit venir de ce qui a réellement été fait, pas d'un tableau.
 */

import { phaseOf } from '../../data/femmes/phases';
import type { Amount, LoadSpec, WeekIndex, Work } from '../../data/femmes/types';
import type { ExerciseRecord, HistoryIndex } from './types';

/** Position de la semaine dans sa phase : 0 pour la première, 1 pour la dernière. */
function positionInPhase(week: WeekIndex): number {
  const weeks = phaseOf(week).weeks;
  const i = weeks.indexOf(week);
  return weeks.length <= 1 ? 1 : i / (weeks.length - 1);
}

/** Interpole dans un intervalle selon la position dans la phase. */
function ramp(amount: Amount, week: WeekIndex, from: 'min' | 'max', roundTo: number): number {
  if (typeof amount === 'number') return amount;
  const t = positionInPhase(week);
  const start = from === 'min' ? amount.min : amount.max;
  const end = from === 'min' ? amount.max : amount.min;
  const raw = start + (end - start) * t;
  return Math.round(raw / roundTo) * roundTo;
}

/** Nombre de tours de la semaine. Monte vers la borne haute. */
export function toursForWeek(week: WeekIndex): number {
  return ramp(phaseOf(week).tours, week, 'min', 1);
}

/** Repos entre deux tours. Descend vers la borne basse : la densité monte. */
export function restForWeek(week: WeekIndex): number {
  return ramp(phaseOf(week).restSec, week, 'max', 5);
}

/**
 * Cible de travail de la semaine pour une ligne du circuit.
 *
 * Les répétitions sont fixes au programme ; seul le gainage est écrit en
 * intervalle, et c'est lui qui monte au fil de la phase.
 */
export function targetForWeek(work: Work, week: WeekIndex): number {
  switch (work.kind) {
    case 'reps':
      return typeof work.reps === 'number' ? work.reps : ramp(work.reps, week, 'min', 1);
    case 'time':
      return ramp(work.seconds, week, 'min', 5);
    case 'minutes':
      return ramp(work.minutes, week, 'min', 1);
  }
}

// ---------------------------------------------------------------------------
// Charge (salle)
// ---------------------------------------------------------------------------

export interface LoadSuggestion {
  kg: number | null;
  /** Phrase affichée sous la ligne de charge. Vide quand il n'y a rien à dire. */
  reason: string;
}

/** Les occurrences les plus récentes d'un exercice, la dernière en premier. */
function recent(history: HistoryIndex, exerciseId: string, n: number): ExerciseRecord[] {
  const all = (history[exerciseId] ?? []).filter((r) => r.kg !== null);
  return all.slice(-n).reverse();
}

/**
 * Charge proposée aujourd'hui.
 *
 * Monter uniquement après DEUX séances faciles d'affilée, cible atteinte. Une
 * seule bonne séance ne prouve rien, et à 5 mois post-partum le coût d'une
 * charge trop lourde est plus élevé que celui d'une semaine de trop en dessous.
 */
export function suggestLoad(
  load: LoadSpec,
  history: HistoryIndex,
  exerciseId: string,
): LoadSuggestion {
  if (load.kind !== 'adjustable') return { kg: null, reason: '' };

  const last = recent(history, exerciseId, 2);
  if (last.length === 0) {
    return {
      kg: load.seed,
      reason:
        load.seed === null
          ? 'Première fois : règle la machine sur une charge où la dernière répétition reste propre.'
          : 'Première fois : point de départ, ajuste dès le premier tour si besoin.',
    };
  }

  const [dernier, avant] = last;
  const kg = dernier!.kg!;

  if (dernier!.ressenti === 'dur') {
    const lower = Math.max(load.step, round(kg - load.step, load.step));
    return { kg: lower, reason: 'Dernière séance jugée dure : on redescend d’un cran.' };
  }

  const atteinte = (r: ExerciseRecord) =>
    r.planned === null || r.actual === null || r.actual >= r.planned;

  const deuxFaciles =
    dernier!.ressenti === 'facile' &&
    avant?.ressenti === 'facile' &&
    atteinte(dernier!) &&
    atteinte(avant);

  if (deuxFaciles) {
    return { kg: round(kg + load.step, load.step), reason: 'Deux séances faciles : +1 cran.' };
  }

  return { kg, reason: 'Même charge que la dernière fois.' };
}

/** Évite les flottants sales du genre 6.000000000000001. */
function round(kg: number, step: number): number {
  return Math.round(kg / step) * step;
}

// ---------------------------------------------------------------------------
// Progression sans charge (maison)
// ---------------------------------------------------------------------------

/**
 * À la maison, la kettlebell fait 8 kg et ne fera jamais 9. Ce qui progresse,
 * c'est le nombre de tours, la durée du gainage et le repos qui raccourcit —
 * tout est déjà porté par `toursForWeek` / `restForWeek` / `targetForWeek`.
 * Cette fonction ne sert qu'à l'expliquer à l'écran.
 */
export function progressionNote(week: WeekIndex): string {
  const phase = phaseOf(week);
  const t = toursForWeek(week);
  const r = restForWeek(week);
  const first = phase.weeks[0] === week;
  // Les tours et le repos sont déjà affichés juste à côté : ici on annonce
  // seulement ce qui change, sinon la même information est écrite deux fois.
  if (first) return `Phase ${phase.id} — ${phase.name} : première semaine.`;
  const prevWeek = phase.weeks[phase.weeks.indexOf(week) - 1]!;
  const dTours = t - toursForWeek(prevWeek);
  const dRest = r - restForWeek(prevWeek);
  const bits: string[] = [];
  if (dTours > 0) bits.push(`+${dTours} tour`);
  if (dRest < 0) bits.push(`repos −${-dRest} s`);
  return bits.length > 0
    ? `Cette semaine : ${bits.join(', ')}.`
    : 'Même volume que la semaine dernière : on consolide.';
}
