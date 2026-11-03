/**
 * Les types propres à MASS 4.
 *
 * ── Pourquoi MASS 4 ne réutilise pas les types de POWER 12 ─────────────────
 *
 * `MovementFn` et `ExerciseRole` sont les taxonomies de POWER : un rôle
 * `main` y désigne les mouvements pilotés par le tableau du §9, et `power`
 * les mouvements qu'on arrête dès que la performance baisse. Rien de tout
 * cela n'existe dans MASS 4, qui ne prescrit aucune charge et ne cherche
 * aucune force maximale.
 *
 * Forcer MASS dans ces unions reviendrait à lui faire dire des choses
 * fausses pour éviter d'écrire trente lignes de types. L'architecture dit
 * l'inverse : socle commun, règles sportives séparées.
 *
 * ── Ce que MASS 4 a, et que POWER n'a pas ──────────────────────────────────
 *
 * Des TECHNIQUES D'INTENSITÉ, qui sont la matière même du programme : trois
 * séries différentes, série lourde suivie d'une dégressive, superset, tempo
 * imposé, alternance unilatéral / bilatéral. Elles ne modifient pas une
 * charge, elles décrivent comment exécuter la série — et c'est ce que
 * l'écran doit afficher.
 */

import type { DayIndex } from '../../data/types';

/** Les quatre jours du programme : lundi, mardi, jeudi, samedi. */
export const JOURS_MASS4: readonly DayIndex[] = [0, 1, 3, 5];

/** Les quatre semaines. MASS 4 n'a pas de semaine 0 : aucun combine initial. */
export const SEMAINES_MASS4: readonly number[] = [1, 2, 3, 4];

/**
 * Comment une série s'exécute, au-delà du nombre de répétitions.
 *
 * Transcrit du tableau « Techniques d'intensité utilisées » du document.
 */
export type Technique =
  /** Trois séries construites différemment : voir `TECHNIQUES` pour le détail. */
  | 'trois-series'
  /** 6 reps lourdes, puis aussitôt 10-12 reps à ≈ 60 % de la charge. */
  | 'lourde-degressive'
  /** 10 reps avec 2 en réserve, puis aussitôt le max de reps à ≈ 60 %. */
  | 'degressive-max'
  /** Deux mouvements enchaînés sans repos, repos après le duo. */
  | 'superset'
  /** Aucune technique particulière : séries droites, tempo indiqué. */
  | 'droite';

export interface ExerciceMass4 {
  id: string;
  nom: string;
  /** Ce que le document écrit sur l'exécution. Jamais inventé. */
  consigne?: string;
  /** Matériel attendu, quand le document le précise. */
  materiel?: string;
}

/**
 * Une ligne de séance.
 *
 * `series` est le nombre de séries DE BASE. La quatrième série optionnelle
 * des semaines 2 à 4 n'est pas écrite ici : elle dépend de la semaine et de
 * l'état de la personne, donc elle appartient à la progression.
 */
export interface LigneMass4 {
  exerciceId: string;
  series: number;
  /** Tel que le document l'écrit : « 8-10 », « 15 / bras », « 30 s / côté ». */
  reps: string;
  /** Repos entre les séries, en secondes. `null` quand le document n'en donne pas. */
  reposSec: number | null;
  /**
   * Repos après la DERNIÈRE série, quand le document en donne un différent.
   *
   * Plusieurs lignes écrivent « 45 s, puis 3 min » : le repos long précède
   * l'exercice suivant, pas les séries entre elles. Les confondre ferait
   * perdre dix minutes par séance, ou en ajouterait dix.
   */
  reposFinSec?: number;
  technique: Technique;
  /** Identifiant du duo, pour les deux lignes qui s'enchaînent. */
  superset?: string;
  /** L'exercice porte-t-il la 4e série optionnelle des semaines 2 à 4 ? */
  serieOptionnelle?: boolean;
  /**
   * Alternance unilatéral / bilatéral une semaine sur deux.
   *
   * `unilateral-impair` : une jambe en semaines 1 et 3, les deux en 2 et 4.
   * `bilateral-impair` : l'inverse. Les deux existent dans le document, et
   * sur deux exercices voisins — les intervertir serait invisible à la
   * lecture du code et faux à la salle.
   */
  alternance?: 'unilateral-impair' | 'bilateral-impair';
}

export interface SeanceMass4 {
  jour: DayIndex;
  titre: string;
  lignes: readonly LigneMass4[];
}
