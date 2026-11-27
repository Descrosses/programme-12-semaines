/**
 * Le point des deux semaines (`regles-cibles-nutrition.md` §7 et ses
 * « Précisions de calcul ») — lot 4 de la nutrition automatique.
 * Pur : aucune base, aucun React.
 *
 * Il compare la moyenne des pesées des 7 derniers jours à celle des 7 jours
 * d'avant, et rend UNE issue :
 * - `pas-du` : moins de 14 jours depuis le dernier point ;
 * - `pesees` : moins de 4 pesées dans l'une des deux semaines — aucune
 *   proposition, jamais un rythme deviné ;
 * - `stable` : le rythme est dans la fourchette, on ne change rien ;
 * - `proposition` : ± 100 kcal, macros refaites (§5) sur le poids moyen de
 *   la semaine récente ;
 * - `coach` : la nouvelle cible passerait sous un plancher (§6), ou une
 *   exclusion est apparue — « vu avec Guillaume », sans chiffre.
 *
 * Toujours une proposition : rien n'est appliqué ici.
 */

import type { MacrosCompletes } from '../data/ciblesNutrition';
import {
  PLANCHERS_KCAL,
  REAJUSTEMENT,
  type DureeSeance,
  type Objectif,
  type Pas,
  type Rythme,
  type Travail,
} from '../data/reglesCiblesNutrition';
import {
  depenseAuRepos,
  exclusions,
  poidsDeReference,
  repartir,
  type ProfilCalcul,
} from './calculCibles';
import type { Regard } from '../data/reglesNutritionMass';

/** Le profil gardé en base (§1) — jamais les réponses de sécurité. */
export interface ProfilNutrition {
  sexe: 'homme' | 'femme';
  /** L'âge donné au questionnaire, et le jour où il a été donné. */
  age: number;
  ageLe: string;
  tailleCm: number;
  travail: Travail;
  pas: Pas;
  seances: string;
  duree: DureeSeance | null;
  objectif: Objectif;
  rythme: Rythme | null;
  /** AAAA-MM-JJ : la cible acceptée, ou le dernier point. */
  pointLe: string;
  /**
   * `regles-nutrition-mass.md` — la cible a été calculée avec le regard MASS :
   * le point des deux semaines refait la répartition avec les mêmes règles.
   * Absent : les règles communes (tous les profils d'avant le 27 novembre).
   */
  regard?: 'mass';
}

export interface Pesee {
  date: string;
  weightKg: number | null;
}

export type PointDeuxSemaines =
  | { cas: 'pas-du'; prochainLe: string }
  | { cas: 'pesees'; recentes: number; precedentes: number }
  | { cas: 'stable'; rythme: number; moyenneKg: number }
  | {
      cas: 'proposition';
      delta: number;
      cible: MacrosCompletes;
      rythme: number;
      moyenneKg: number;
    }
  | { cas: 'coach' };

/** AAAA-MM-JJ + n jours (calendrier, sans fuseau). */
export function ajouterJours(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y!, m! - 1, d! + n)).toISOString().slice(0, 10);
}

/** Le profil à garder, à partir du profil du calcul. */
export function profilAGarder(
  p: ProfilCalcul,
  aujourdhui: string,
  regard: Regard = 'commun',
): ProfilNutrition {
  return {
    // Les règles communes : le champ reste absent, le profil garde sa forme.
    ...(regard === 'mass' ? { regard } : {}),
    sexe: p.sexe,
    age: p.age,
    ageLe: aujourdhui,
    tailleCm: p.tailleCm,
    travail: p.travail,
    pas: p.pas,
    seances: p.seances,
    duree: p.duree,
    objectif: p.objectif,
    rythme: p.rythme,
    pointLe: aujourdhui,
  };
}

/** L'âge aujourd'hui : celui du questionnaire, plus les années pleines écoulées. */
export function ageAujourdhui(p: ProfilNutrition, aujourdhui: string): number {
  const jours = (Date.parse(aujourdhui) - Date.parse(p.ageLe)) / 86_400_000;
  return p.age + Math.max(0, Math.floor(jours / 365.25));
}

/** Les pesées d'une fenêtre [debut, fin], bornes comprises. */
function fenetre(pesees: readonly Pesee[], debut: string, fin: string): number[] {
  return pesees
    .filter((p) => p.date >= debut && p.date <= fin && p.weightKg !== null && p.weightKg > 0)
    .map((p) => p.weightKg!);
}

const moyenne = (v: readonly number[]) => v.reduce((a, b) => a + b, 0) / v.length;

/** §7 — le sens du palier : − 1, 0 ou + 1, selon l'objectif et le rythme mesuré. */
export function sensDuPalier(objectif: Objectif, rythme: number): -1 | 0 | 1 {
  if (objectif === 'perte') {
    const perte = -rythme;
    if (perte < REAJUSTEMENT.perte.min) return -1;
    if (perte > REAJUSTEMENT.perte.max) return 1;
    return 0;
  }
  if (objectif === 'prise') {
    if (rythme < REAJUSTEMENT.prise.min) return 1;
    if (rythme > REAJUSTEMENT.prise.max) return -1;
    return 0;
  }
  if (rythme > REAJUSTEMENT.maintienEcart) return -1;
  if (rythme < -REAJUSTEMENT.maintienEcart) return 1;
  return 0;
}

export function pointDesDeuxSemaines(
  profil: ProfilNutrition,
  kcalActuelles: number,
  pesees: readonly Pesee[],
  aujourdhui: string,
): PointDeuxSemaines {
  const prochainLe = ajouterJours(profil.pointLe, REAJUSTEMENT.joursEntrePoints);
  if (aujourdhui < prochainLe) return { cas: 'pas-du', prochainLe };

  const recentes = fenetre(pesees, ajouterJours(aujourdhui, -6), aujourdhui);
  const precedentes = fenetre(pesees, ajouterJours(aujourdhui, -13), ajouterJours(aujourdhui, -7));
  if (recentes.length < REAJUSTEMENT.peseesMin || precedentes.length < REAJUSTEMENT.peseesMin) {
    return { cas: 'pesees', recentes: recentes.length, precedentes: precedentes.length };
  }

  const moyenneKg = moyenne(recentes);
  const rythme = (moyenneKg - moyenne(precedentes)) / moyenne(precedentes);

  // §6 — une exclusion apparue depuis (perte avec un IMC passé sous 18,5).
  const calcul: ProfilCalcul = {
    sexe: profil.sexe,
    age: ageAujourdhui(profil, aujourdhui),
    tailleCm: profil.tailleCm,
    poidsKg: moyenneKg,
    travail: profil.travail,
    pas: profil.pas,
    seances: profil.seances,
    duree: profil.duree,
    objectif: profil.objectif,
    rythme: profil.rythme,
    grossesse: null,
    maladie: null,
    relation: null,
  };
  if (exclusions(calcul).length > 0) return { cas: 'coach' };

  const sens = sensDuPalier(profil.objectif, rythme);
  if (sens === 0) return { cas: 'stable', rythme, moyenneKg };

  const delta = sens * REAJUSTEMENT.palierKcal;
  const kcal = kcalActuelles + delta;
  // §6 — jamais PROPOSER sous un plancher (ni sous la dépense au repos).
  const plancher = Math.max(PLANCHERS_KCAL[profil.sexe], depenseAuRepos(calcul));
  if (delta < 0 && kcal < plancher) return { cas: 'coach' };

  const r = repartir(kcal, poidsDeReference(calcul), profil.objectif, profil.regard ?? 'commun');
  return {
    cas: 'proposition',
    delta,
    cible: { kcal, proteinG: r.proteinG, carbsG: r.carbsG, fatG: r.fatG },
    rythme,
    moyenneKg,
  };
}
