/**
 * Mise en forme. Aucune décision métier ici — uniquement des chaînes.
 *
 * La « ligne de travail » est l'élément le plus visible de l'écran séance :
 * elle doit être lisible à un mètre, téléphone posé par terre à côté du tapis.
 */

import type { Amount, LoadSpec, Work } from '../../data/femmes/types';

/** 97.5 → « 97,5 ». Le programme est en français. */
export function fr(n: number): string {
  return String(Math.round(n * 100) / 100).replace('.', ',');
}

/** 210 → « 3:30 » — pour le chrono. */
export function mmss(totalSec: number): string {
  const s = Math.max(0, Math.round(totalSec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** 45 → « 45 s », 90 → « 1 min 30 » — pour l'étiquette de repos. */
export function restLabel(sec: number): string {
  if (sec <= 0) return '—';
  if (sec < 60) return `${sec} s`;
  const min = Math.floor(sec / 60);
  const rest = sec % 60;
  return rest === 0 ? `${min} min` : `${min} min ${rest}`;
}

/** `12` → « 12 », `{min:20,max:30}` → « 20-30 ». */
export function amountLabel(a: Amount): string {
  return typeof a === 'number' ? fr(a) : `${fr(a.min)}-${fr(a.max)}`;
}

/** Valeur haute d'un intervalle — la cible, quand il faut un seul nombre. */
export function amountMax(a: Amount): number {
  return typeof a === 'number' ? a : a.max;
}

export function amountMin(a: Amount): number {
  return typeof a === 'number' ? a : a.min;
}

/** « 12 », « 10 / jambe », « 20-30 s », « 15-20 min ». */
export function workLabel(work: Work): string {
  switch (work.kind) {
    case 'reps': {
      const side = work.perSide ? ` / ${work.sideLabel ?? 'côté'}` : '';
      return `${amountLabel(work.reps)}${side}`;
    }
    case 'time':
      return `${amountLabel(work.seconds)} s`;
    case 'minutes':
      return `${amountLabel(work.minutes)} min`;
  }
}

/**
 * La dose du JOUR.
 *
 * Le programme écrit « 20-30 s » pour toute une phase ; à l'écran, pendant la
 * séance, il faut un seul nombre — l'intervalle ne dit pas quoi faire
 * maintenant. La valeur vient de `targetForWeek`, l'intervalle reste affiché
 * en dessous pour qui veut savoir d'où elle sort.
 */
export function weekWorkLabel(work: Work, target: number): string {
  switch (work.kind) {
    case 'reps': {
      const side = work.perSide ? ` / ${work.sideLabel ?? 'côté'}` : '';
      return `${fr(target)}${side}`;
    }
    case 'time':
      return `${fr(target)} s`;
    case 'minutes':
      return `${fr(target)} min`;
  }
}

/** L'exercice est-il prescrit en intervalle, donc progressif sur la phase ? */
export function isRange(work: Work): boolean {
  const amount = work.kind === 'reps' ? work.reps : work.kind === 'time' ? work.seconds : work.minutes;
  return typeof amount !== 'number';
}

/**
 * « kettlebell 8 kg », « 2 × 6 kg », « 25 kg », « poids du corps ».
 * `kg` est la charge retenue pour aujourd'hui (historique ou valeur de départ).
 */
export function loadLabel(load: LoadSpec, kg: number | null): string {
  switch (load.kind) {
    case 'bodyweight':
      return 'poids du corps';
    case 'fixed':
      return load.label;
    case 'text':
      return load.label;
    case 'none':
      return '';
    case 'adjustable':
      if (kg === null) return 'charge à régler';
      return load.shape === 'pair' ? `2 × ${fr(kg)} kg` : `${fr(kg)} kg`;
  }
}

/** −2.4 → « −2,4 kg », 0 → « stable ». */
export function deltaKg(delta: number): string {
  const rounded = Math.round(delta * 10) / 10;
  if (rounded === 0) return 'stable';
  return `${rounded > 0 ? '+' : '−'}${fr(Math.abs(rounded))} kg`;
}
