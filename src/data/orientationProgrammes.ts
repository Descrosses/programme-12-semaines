/**
 * Orienter vers un programme à partir du bilan sportif — transcription de
 * `regles-orientation-programmes.md` (validé par Guillaume le 23 novembre).
 *
 * Aucune logique ici : le calcul vit dans `engine/orientation.ts`.
 * `orientationProgrammes.test.ts` relit le .md, tableau par tableau, et
 * compare chaque condition et chaque phrase. Pour changer une règle :
 * changer le .md ET ce fichier.
 *
 * Les valeurs sont les libellés EXACTS du bilan (`questionnaireBilanSportif.ts`),
 * pour qu'une réponse se compare sans traduction.
 */

import type { FamilleId } from './catalogue';

export interface RegleOrientation {
  /** Le programme suggéré (identifiant du catalogue). */
  programme: string;
  famille: FamilleId;
  /** Objectif principal (question 3) : l'un de ceux-ci. */
  objectifs: readonly string[];
  /** Niveau (question 9) : l'un de ceux-ci ; `null` = n'importe lequel. */
  niveaux: readonly string[] | null;
  /** Exercices maîtrisés (question 11) : TOUS ceux-ci. */
  exercices: readonly string[];
  /** Séances par semaine (question 12), au moins. */
  seancesMin: number;
  /** Disponibilités (question 13) : au moins `jours` jours à `minutes` min ou plus. */
  jours: number;
  minutes: number;
  /** Lieu (question 14) : l'un de ceux-ci ; `null` = n'importe lequel. */
  lieux: readonly string[] | null;
  /** Sexe (question 2) exigé ; `null` = jamais utilisé. */
  sexe: 'Femme' | null;
}

const NIVEAUX = {
  jamais: 'Jamais pratiqué',
  debutant: "Débutant (moins d'1 an)",
  intermediaire: 'Intermédiaire (1 à 3 ans)',
  confirme: 'Confirmé (3 à 5 ans)',
  avance: 'Avancé (plus de 5 ans)',
} as const;

/** Dans l'ordre du §3 : POWER, MASS, FEMMES. Au plus deux suggestions. */
export const REGLES_ORIENTATION: readonly RegleOrientation[] = [
  {
    programme: 'power12',
    famille: 'power',
    objectifs: [
      'Devenir plus fort',
      'Améliorer explosivité / vitesse / qualités athlétiques',
      'Préparation à un sport ou une épreuve',
    ],
    niveaux: [NIVEAUX.intermediaire, NIVEAUX.confirme, NIVEAUX.avance],
    exercices: ['Squat avec barre', 'Développé couché', 'Soulevé de terre'],
    seancesMin: 5,
    jours: 5,
    minutes: 60,
    lieux: ['Salle', 'Plusieurs lieux'],
    sexe: null,
  },
  {
    // Conditions de la FAMILLE MASS ; MASS FORCE en attendant HYPERTROPHIE (réponse H).
    programme: 'mass-force',
    famille: 'mass',
    objectifs: ['Prendre du muscle'],
    niveaux: [NIVEAUX.debutant, NIVEAUX.intermediaire, NIVEAUX.confirme, NIVEAUX.avance],
    exercices: [],
    seancesMin: 4,
    jours: 4,
    minutes: 60,
    lieux: ['Salle', 'Plusieurs lieux'],
    sexe: null,
  },
  {
    programme: 'femmes8',
    famille: 'femmes',
    objectifs: [
      'Me renforcer musculairement (sans viser la prise de masse)',
      'Reprendre le sport',
      'Santé / bien-être',
      'Améliorer condition physique / endurance',
      'Prendre du muscle',
    ],
    niveaux: null,
    exercices: [],
    seancesMin: 3,
    jours: 3,
    minutes: 20,
    lieux: null,
    sexe: 'Femme',
  },
];

export const MAX_SUGGESTIONS = 2;

/** La mention de la famille MASS tant qu'HYPERTROPHIE n'existe pas (réponse H). */
export const MASS_POINT_DE_DEPART = { programme: 'mass8', famille: 'mass' } as const;

/** Les phrases de l'écran, mot pour mot. */
export const TEXTES_ORIENTATION = {
  titre: 'Les programmes qui te correspondent',
  phrase: 'Selon tes réponses. Guillaume confirme après avoir lu ton bilan.',
  voir: 'Voir le programme',
  orange:
    "Une de tes réponses demande l'avis de Guillaume avant de choisir un programme. Il te répondra après avoir lu ton bilan.",
  aucune:
    "Aucun programme de l'appli ne correspond encore à tes réponses. Guillaume te proposera un programme adapté après avoir lu ton bilan.",
  bientot: 'MASS HYPERTROPHIE — le point de départ conseillé, bientôt disponible',
} as const;
