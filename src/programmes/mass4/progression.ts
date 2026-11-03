/**
 * La progression de MASS 4 — et c'est tout ce qu'il y a.
 *
 * Source : `MODELE_4_SEMAINES_MASSE_CONGESTION.md`, section « Progression sur
 * 4 semaines ».
 *
 * ── Pourquoi ce fichier est si court ───────────────────────────────────────
 *
 * MASS 4 ne prescrit AUCUNE charge : « la personne les gère elle-même, sans
 * suggestion automatique. L'appli montre seulement la dernière performance. »
 * Il n'y a donc ni tableau de pourcentages, ni recalage, ni 1RM, ni
 * progression de charge à calculer.
 *
 * La progression se fait uniquement par le VOLUME : une quatrième série
 * optionnelle sur cinq mouvements, à partir de la semaine 2. Plus
 * l'alternance unilatéral / bilatéral sur deux mouvements de jambes.
 *
 * C'est la différence de fond avec POWER 12, dont le moteur de progression
 * fait quatre cents lignes. Les deux programmes n'ont pas besoin du même
 * outillage, et c'est exactement pour cela que l'architecture leur laisse
 * chacun le leur.
 */

import type { LigneMass4 } from './types';

/** La semaine 1 sert à trouver ses charges : aucune série optionnelle. */
export const PREMIERE_SEMAINE_OPTIONNELLE = 2;

/**
 * Les deux conditions, telles que le document les écrit.
 *
 * Elles ne sont pas évaluées par l'application : elles ne peuvent pas l'être.
 * La durée de la séance précédente, oui — l'application la chronomètre. Mais
 * « pas d'épuisement, pas de courbatures 48 h après » n'est connu que de la
 * personne. L'application pose donc la question au lieu de deviner.
 */
export const CONDITIONS_SERIE_OPTIONNELLE = [
  'La même séance la semaine dernière a tenu en 60 min ou moins.',
  'Pas d’épuisement, et pas de courbatures sur ces muscles 48 h après.',
] as const;

/** La séance allégée, disponible chaque jour en cas de mauvaise forme. */
export const SEANCE_ALLEGEE = {
  seriesMax: 2,
  repsEnReserve: 4,
  phrase: 'Jour sans : 2 séries maximum par exercice, et 4 répétitions en réserve.',
} as const;

/**
 * Combien de séries sur cette ligne, cette semaine.
 *
 * `optionnellePrise` est la réponse de la personne aux deux conditions. Sans
 * réponse, on reste au nombre de base : une série en trop est une séance qui
 * déborde, et le document fait de la durée l'une des deux conditions.
 */
export function seriesPour(ligne: LigneMass4, semaine: number, optionnellePrise = false): number {
  if (ligne.serieOptionnelle !== true) return ligne.series;
  if (semaine < PREMIERE_SEMAINE_OPTIONNELLE) return ligne.series;
  return optionnellePrise ? ligne.series + 1 : ligne.series;
}

/** La ligne porte-t-elle une série optionnelle, cette semaine ? */
export function proposeSerieOptionnelle(ligne: LigneMass4, semaine: number): boolean {
  return ligne.serieOptionnelle === true && semaine >= PREMIERE_SEMAINE_OPTIONNELLE;
}

export type ModeExecution = 'unilateral' | 'bilateral';

/**
 * Une jambe ou les deux, cette semaine.
 *
 * `null` quand le mouvement n'alterne pas. Les deux sens existent dans le
 * document, sur deux exercices voisins : le leg extension se fait à une jambe
 * en semaines 1 et 3, le leg curl à deux jambes aux mêmes semaines. Les
 * intervertir serait invisible en lisant le code, et faux à la salle.
 */
export function modePour(ligne: LigneMass4, semaine: number): ModeExecution | null {
  if (ligne.alternance === undefined) return null;
  const impaire = semaine % 2 === 1;
  if (ligne.alternance === 'unilateral-impair') return impaire ? 'unilateral' : 'bilateral';
  return impaire ? 'bilateral' : 'unilateral';
}

/** Les répétitions telles qu'elles s'affichent, une fois le mode connu. */
export function repsAffichees(ligne: LigneMass4, semaine: number): string {
  const mode = modePour(ligne, semaine);
  if (mode === null) return ligne.reps;
  return mode === 'unilateral' ? `${ligne.reps} / jambe` : ligne.reps;
}
