/**
 * Orienter vers un programme à partir des réponses du bilan sportif
 * (`regles-orientation-programmes.md`). Pur : aucun React, aucune base.
 *
 * Une INDICATION : rien n'est démarré ni verrouillé. Un programme n'est
 * suggéré que si TOUTES ses conditions passent et s'il est disponible au
 * catalogue ; chaque condition remplie devient une raison affichée.
 */

import { programmeParId } from '../data/catalogue';
import {
  MASS_POINT_DE_DEPART,
  MAX_SUGGESTIONS,
  REGLES_ORIENTATION,
  type RegleOrientation,
} from '../data/orientationProgrammes';
import { arret, vigilance, type EtatBilan, type Reponses } from './questionnaireBilanSportif';

export interface Suggestion {
  programme: string;
  famille: RegleOrientation['famille'];
  nom: string;
  raisons: string[];
}

export type Orientation =
  /** Rouge ou hors périmètre : le questionnaire s'est arrêté, rien à montrer. */
  | { type: 'arret' }
  /** Vigilance orange : aucune suggestion (réponse A). */
  | { type: 'orange' }
  /** Vert : les suggestions (éventuellement aucune) et la mention « bientôt ». */
  | { type: 'suggestions'; suggestions: Suggestion[]; bientot: boolean };

const nombre = (v: unknown) => parseFloat(String(v ?? '').replace(',', '.'));
const fr = (n: number) => String(n).replace('.', ',');

/** Les raisons d'une règle, ou `null` si une seule condition manque. */
export function raisonsDe(r: RegleOrientation, A: Reponses): string[] | null {
  const q3 = typeof A.q3 === 'string' ? A.q3 : '';
  const q9 = typeof A.q9 === 'string' ? A.q9 : '';
  const q11 = Array.isArray(A.q11) ? (A.q11 as string[]) : [];
  const q14 = typeof A.q14 === 'string' ? A.q14 : '';
  const sexe =
    A.q2 !== null && typeof A.q2 === 'object' ? (A.q2 as Record<string, string>).sexe : '';
  const seances = nombre(A.q12);
  const dispo = A.q13 !== null && typeof A.q13 === 'object' ? Object.values(A.q13 as object) : [];
  const jours = dispo.filter((m) => nombre(m) >= r.minutes).length;

  if (!r.objectifs.includes(q3)) return null;
  if (r.niveaux !== null && !r.niveaux.includes(q9)) return null;
  if (!r.exercices.every((e) => q11.includes(e))) return null;
  if (!(seances >= r.seancesMin)) return null;
  if (jours < r.jours) return null;
  if (r.lieux !== null && !r.lieux.includes(q14)) return null;
  if (r.sexe !== null && sexe !== r.sexe) return null;

  const raisons = [`objectif : ${q3.charAt(0).toLowerCase()}${q3.slice(1)}`];
  if (r.niveaux !== null) raisons.push(`niveau : ${q9.charAt(0).toLowerCase()}${q9.slice(1)}`);
  if (r.exercices.length) raisons.push('squat, développé couché et soulevé de terre maîtrisés');
  raisons.push(`${fr(seances)} séances par semaine`);
  raisons.push(`${jours} jours à ${r.minutes} min ou plus`);
  if (r.lieux !== null) raisons.push(`lieu : ${q14.toLowerCase()}`);
  return raisons;
}

export function orienter(etat: EtatBilan): Orientation {
  if (arret(etat) !== null) return { type: 'arret' };
  if (vigilance(etat).level === 'ORANGE') return { type: 'orange' };
  const suggestions: Suggestion[] = [];
  let bientot = false;
  for (const r of REGLES_ORIENTATION) {
    const raisons = raisonsDe(r, etat.A);
    if (raisons === null) continue;
    if (r.famille === MASS_POINT_DE_DEPART.famille) {
      const depart = programmeParId(MASS_POINT_DE_DEPART.programme);
      bientot = depart !== null && depart.statut !== 'disponible';
    }
    const p = programmeParId(r.programme);
    if (p === null || p.statut !== 'disponible') continue;
    suggestions.push({ programme: r.programme, famille: r.famille, nom: p.nom, raisons });
  }
  return { type: 'suggestions', suggestions: suggestions.slice(0, MAX_SUGGESTIONS), bientot };
}
