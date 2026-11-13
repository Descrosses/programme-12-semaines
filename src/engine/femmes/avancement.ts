/**
 * Où en est une pratiquante FEMMES — fonctions pures, sans base ni React.
 *
 * ── La séance du jour est la PREMIÈRE NON FAITE, pas une case de calendrier ─
 *
 * POWER cale ses séances sur une date de départ : le lundi de la semaine 3,
 * c'est la séance du lundi de la semaine 3, faite ou non. FEMMES ne fait pas
 * ça. Le programme vise des femmes qui jonglent avec un emploi du temps
 * imprévisible : une séance manquée ne doit pas être SAUTÉE parce que la date
 * est passée. On avance quand une séance est terminée, pas quand le
 * calendrier tourne.
 *
 * Une séance qu'on préfère laisser se marque « non faite » (`sautee`) : elle
 * est alors PASSÉE — la suivante devient la prochaine — mais ne compte pas
 * parmi les séances faites. C'est un choix de la pratiquante, jamais un
 * effet du calendrier.
 *
 * Conséquence assumée : rien n'oblige à respecter lundi / mercredi /
 * vendredi. Les noms de jour restent ceux du programme — ils disent l'ordre
 * et l'espacement conseillé, pas un rendez-vous.
 */

import { WEEK_DAYS } from '../../data/femmes/programme';
import { WEEKS, type DayIndex, type WeekIndex } from '../../data/femmes/types';
import type { ExerciseRecord, HistoryIndex } from './types';

export interface CaseFemmes {
  semaine: WeekIndex;
  jour: DayIndex;
}

/** Ce que l'avancement lit d'une séance enregistrée. */
export interface SeanceFaite {
  semaine: number;
  jour: DayIndex;
  terminee: boolean;
  sautee?: boolean;
  exercices?: readonly ExerciseRecord[];
}

/** Toutes les séances du programme, dans l'ordre où elles se font. */
export const ORDRE: readonly CaseFemmes[] = WEEKS.flatMap((semaine) =>
  WEEK_DAYS[semaine].map((jour) => ({ semaine, jour })),
);

const cle = (semaine: number, jour: number) => `${semaine}-${jour}`;

export interface Avancement {
  faites: number;
  /** Séances marquées « non faite » (et pas faites depuis). */
  sautees: number;
  total: number;
  /** La première séance non terminée, `null` quand tout est fait. */
  prochaine: CaseFemmes | null;
  /** La semaine où l'on se trouve : celle de la prochaine séance, la 8 à la fin. */
  semaine: WeekIndex;
  termine: boolean;
}

export function avancement(seances: readonly SeanceFaite[]): Avancement {
  const faites = new Set(seances.filter((s) => s.terminee).map((s) => cle(s.semaine, s.jour)));
  // Faite l'emporte : une séance sautée puis faite quand même est faite.
  const sautees = new Set(
    seances.filter((s) => s.sautee === true && !s.terminee).map((s) => cle(s.semaine, s.jour)),
  );
  // Ne compter que ce qui appartient au programme : une ligne égarée (semaine 9,
  // jour inexistant) ne doit pas gonfler le compteur.
  const nb = ORDRE.filter((c) => faites.has(cle(c.semaine, c.jour))).length;
  const nbSautees = ORDRE.filter((c) => sautees.has(cle(c.semaine, c.jour))).length;
  const passee = (c: CaseFemmes) =>
    faites.has(cle(c.semaine, c.jour)) || sautees.has(cle(c.semaine, c.jour));
  const prochaine = ORDRE.find((c) => !passee(c)) ?? null;
  return {
    faites: nb,
    sautees: nbSautees,
    total: ORDRE.length,
    prochaine,
    semaine: prochaine?.semaine ?? WEEKS[WEEKS.length - 1]!,
    termine: prochaine === null,
  };
}

/** Cette séance est-elle marquée « non faite » (et pas faite depuis) ? */
export function estSautee(seances: readonly SeanceFaite[], semaine: number, jour: number): boolean {
  return seances.some(
    (s) => s.sautee === true && !s.terminee && s.semaine === semaine && s.jour === jour,
  );
}

/** Cette séance est-elle terminée ? */
export function estFaite(seances: readonly SeanceFaite[], semaine: number, jour: number): boolean {
  return seances.some((s) => s.terminee && s.semaine === semaine && s.jour === jour);
}

/**
 * L'historique au format que lit la progression des charges.
 *
 * Trié dans l'ordre du PROGRAMME, pas dans l'ordre d'enregistrement :
 * `suggestLoad` prend les deux dernières entrées comme les deux dernières
 * séances. Une séance de semaine 2 rouverte et corrigée après la semaine 3 ne
 * doit pas passer pour la plus récente.
 */
export function historique(seances: readonly SeanceFaite[]): HistoryIndex {
  const rang = new Map(ORDRE.map((c, i) => [cle(c.semaine, c.jour), i]));
  const triees = [...seances].sort(
    (a, b) => (rang.get(cle(a.semaine, a.jour)) ?? 0) - (rang.get(cle(b.semaine, b.jour)) ?? 0),
  );
  const index: HistoryIndex = {};
  for (const s of triees) {
    for (const r of s.exercices ?? []) (index[r.exerciseId] ??= []).push(r);
  }
  return index;
}
