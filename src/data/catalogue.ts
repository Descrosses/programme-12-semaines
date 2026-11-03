/**
 * Le catalogue Dcross-fit : les familles, les programmes, et leur état réel.
 *
 * ── Pourquoi ce fichier existe ─────────────────────────────────────────────
 *
 * Jusqu'ici l'application ÉTAIT le programme. Il n'y avait rien à choisir,
 * donc rien à décrire : POWER 12 était partout, en dur, dans le moteur comme
 * dans les écrans. Dès qu'une seconde famille existe, il faut un endroit qui
 * dise ce qui existe, ce qui est prêt, et ce qui ne l'est pas.
 *
 * ── La règle qui prime sur toutes les autres ───────────────────────────────
 *
 * Un programme n'est `disponible` que s'il est RÉELLEMENT jouable dans cette
 * application, de la première séance à la dernière. Tout le reste est
 * `a-venir`, et un programme `a-venir` ne se démarre pas : le bouton n'existe
 * pas, il n'est pas seulement grisé.
 *
 * À ce jour, un seul programme est disponible : POWER 12. MASS 4 est conçu et
 * tourne dans sa propre application, mais il n'est pas encore intégré ici —
 * l'annoncer disponible serait un mensonge que le premier appui révélerait.
 *
 * ── Ce que ce fichier ne contient pas ──────────────────────────────────────
 *
 * Aucune séance, aucune charge, aucune règle de progression. Ce sont des
 * fiches de présentation : un nom, une durée, des objectifs, des prérequis.
 * La logique sportive reste dans le module de chaque programme.
 */

/** Les trois familles prévues. Aucune autre n'est au catalogue de lancement. */
export type FamilleId = 'power' | 'mass' | 'femmes';

/**
 * `disponible` = jouable de bout en bout, maintenant, dans cette application.
 * `a-venir` = la place est prête, le contenu non.
 */
export type StatutProgramme = 'disponible' | 'a-venir';

export interface ProgrammeDefinition {
  /** Identifiant stable, jamais le nom affiché : il voyage dans les cycles. */
  id: string;
  familleId: FamilleId;
  nom: string;
  /** Version publiée, figée dans chaque cycle au démarrage. */
  version: string;
  /** Semaines d'entraînement, hors combine initial. */
  dureeSemaines: number;
  statut: StatutProgramme;
  resume: string;
  objectifs: readonly string[];
  prerequis: readonly string[];
}

export interface Famille {
  id: FamilleId;
  /** Le nom commercial court : POWER, MASS. */
  nom: string;
  sousTitre: string;
  resume: string;
  programmes: readonly ProgrammeDefinition[];
}

export const FAMILLES: readonly Famille[] = [
  {
    id: 'power',
    nom: 'POWER',
    sousTitre: 'Force & explosivité',
    resume:
      'Force maximale, explosivité et puissance sur les mouvements fondamentaux. Pour pratiquants intermédiaires confirmés et avancés.',
    programmes: [
      {
        id: 'power12',
        familleId: 'power',
        nom: 'POWER 12',
        version: '1.2',
        dureeSemaines: 12,
        statut: 'disponible',
        resume:
          'Douze semaines de force et d’explosivité, précédées d’un combine initial qui fixe les repères.',
        objectifs: [
          'Force maximale sur squat, bench, deadlift et tractions lestées',
          'Explosivité : sauts, sprints, travail en contraste',
          'Rattraper l’écart entre la chaîne postérieure et le squat',
        ],
        prerequis: [
          'Technique maîtrisée sur les trois barres',
          'Quatre à cinq séances par semaine',
          'Un combine initial pour mesurer le point de départ',
        ],
      },
      {
        id: 'power28',
        familleId: 'power',
        nom: 'POWER 28',
        version: '0.1',
        dureeSemaines: 28,
        statut: 'a-venir',
        /*
         * Structure envisagée : 12 semaines de force, 4 de transition, 12 de
         * force. Elle n'a pas été testée. Le §4 est explicite — elle ne doit
         * pas être présentée comme validée, et les 28 semaines ne sont pas
         * créées. Seule la place existe.
         */
        resume: 'Structure longue en trois blocs, encore à l’essai. Non testée, non disponible.',
        objectifs: [],
        prerequis: [],
      },
    ],
  },
  {
    id: 'mass',
    nom: 'MASS',
    sousTitre: 'Prise de masse & congestion',
    resume:
      'Hypertrophie, volume d’entraînement et congestion. Les charges sont autorégulées : tu les choisis et tu les notes.',
    programmes: [
      {
        id: 'mass4',
        familleId: 'mass',
        nom: 'MASS 4',
        version: '1.0',
        dureeSemaines: 4,
        statut: 'disponible',
        resume:
          'Quatre semaines de volume et de congestion, quatre séances par semaine. La même séance chaque semaine, et des charges que tu choisis toi-même.',
        objectifs: [
          'Prise de masse musculaire et congestion',
          'Progression par le volume, sans recherche de force maximale',
          'Techniques d’intensité : séries dégressives, supersets, tempo imposé',
        ],
        prerequis: [
          'Niveau débutant avancé ou intermédiaire, déjà entraîné',
          'Quatre séances par semaine, environ 60 minutes',
          'Une salle avec Smith machine, poulies, machines guidées et haltères',
        ],
      },
      {
        id: 'mass8',
        familleId: 'mass',
        nom: 'MASS 8',
        version: '0.1',
        dureeSemaines: 8,
        statut: 'a-venir',
        resume: 'Huit semaines, avec une périodisation propre à cette durée. À écrire.',
        objectifs: [],
        prerequis: [],
      },
      {
        id: 'mass12',
        familleId: 'mass',
        nom: 'MASS 12',
        version: '0.1',
        dureeSemaines: 12,
        statut: 'a-venir',
        resume: 'Douze semaines, avec une périodisation propre à cette durée. À écrire.',
        objectifs: [],
        prerequis: [],
      },
    ],
  },
  {
    id: 'femmes',
    nom: 'FEMMES',
    sousTitre: 'À définir',
    /*
     * Aucun programme, et c'est volontaire. Le §4 interdit d'en inventer les
     * objectifs, les exercices ou les durées, et le §15 dit que son identité
     * visuelle sera choisie plus tard. La famille existe pour que la place
     * soit prête, pas pour remplir le catalogue.
     */
    resume: 'Contenu en préparation. Les programmes de cette famille restent à définir.',
    programmes: [],
  },
];

/** Tous les programmes, familles confondues, dans l'ordre du catalogue. */
export function tousLesProgrammes(): ProgrammeDefinition[] {
  return FAMILLES.flatMap((f) => [...f.programmes]);
}

export function programmeParId(id: string): ProgrammeDefinition | null {
  return tousLesProgrammes().find((p) => p.id === id) ?? null;
}

export function familleParId(id: FamilleId): Famille | null {
  return FAMILLES.find((f) => f.id === id) ?? null;
}

/** Ceux qu'on peut réellement commencer aujourd'hui. */
export function programmesDisponibles(): ProgrammeDefinition[] {
  return tousLesProgrammes().filter((p) => p.statut === 'disponible');
}

/** Le programme que cette application sait jouer de bout en bout. */
export const PROGRAMME_PAR_DEFAUT = 'power12';
