/**
 * MASS FORCE — la forme d'une ligne de séance.
 *
 * Source : `programme-mass-force.md` (semaine type S1, seule validée).
 */
import type { DayIndex } from '../../data/types';
import type { Variante } from '../../data/combineMass';

/**
 * Une possibilité pour une ligne : un matériel (« développé couché à la
 * Smith ») ou une variante d'exercice (« fentes bulgares »).
 *
 * Chaque possibilité est un EXERCICE À PART, avec son identifiant donc son
 * propre historique (décision de Guillaume) : un développé à la Smith ne se
 * compare pas à un développé à la barre, des fentes bulgares pas à des
 * fentes avant.
 */
export interface OptionForce {
  id: string;
  nom: string;
  /**
   * Le test du combiné qui servira de référence, avec SON matériel. Présent
   * seulement sur les quatre mouvements évalués ; rien n'est transposé d'un
   * matériel à l'autre.
   */
  test?: { exercice: string; variante: Variante };
}

/** En pour cent : 82,5 s'écrit 82.5, pour que 100 × 82,5 % tombe juste. */
export interface FourchettePct {
  readonly min: number;
  readonly max: number;
}

export type ModeProgression = 'pourcentage' | 'plage' | 'fixe' | 'push-press';

export interface LigneForce {
  /** Clé stable de la ligne : c'est sous elle que le choix du cycle est rangé. */
  cle: string;
  /** Une seule option : pas de choix. Plusieurs : choix au démarrage du cycle. */
  options: readonly OptionForce[];
  /** La colonne « Exercice » du .md, mot pour mot. */
  libelle: string;
  /** La colonne « Matériel autorisé » du .md, mot pour mot. */
  materiel: string;
  /** La colonne « Test de référence » du .md, mot pour mot. */
  testLibelle: string;
  series: number;
  /** « 5 », « 12 / jambe ». */
  reps: string;
  /**
   * `a-definir` : la fourchette %1RM n'est PAS validée — charge libre en
   * attendant, et l'écran le dit. `libre` : charge choisie par l'utilisateur.
   */
  charge: 'a-definir' | 'libre';
  /**
   * Comment la charge évolue de S1 à S4 (§1 ter du .md) :
   * `pourcentage` (fourchette de %1RM), `plage` (répétitions prescrites à +2),
   * `fixe` (RPE prescrit ou superset), `push-press` (RIR 2 ou plus exigé).
   */
  progression: ModeProgression;
  reposSec: number;
  superset?: string;
  /** La ligne du tableau « Consignes techniques et vigilance » du .md. */
  consigneCle: string;
  consigne: string;
  vigilance: string;
}

export interface SeanceForce {
  jour: DayIndex;
  /** « Pecs / Triceps » — la partie après le tiret de la colonne « Séance ». */
  titre: string;
  lignes: readonly LigneForce[];
}

/** Lundi, mardi, jeudi, vendredi. */
export const JOURS_FORCE: readonly DayIndex[] = [0, 1, 3, 4];

/**
 * Quatre semaines à prescription identique (§1 ter, lot 6) : ce n'est pas une
 * recopie faute de mieux, c'est la décision — la CHARGE évolue selon ce qui a
 * été fait (`progression.ts`), pas les séries ni les répétitions.
 */
export const SEMAINES_FORCE: readonly number[] = [1, 2, 3, 4];
