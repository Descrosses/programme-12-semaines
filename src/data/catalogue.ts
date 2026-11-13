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
export type FamilleId = 'power' | 'mass' | 'femmes' | 'perso';

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
  /*
   * Une ancre qui ouvre un APERÇU en lecture seule, pour un programme
   * `a-venir` dont les écrans existent déjà. Ce n'est PAS un démarrage :
   * l'aperçu ne crée aucun cycle et n'écrit rien. Absent par défaut ; le
   * test du catalogue dit où il a le droit d'exister.
   */
  apercu?: string;
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
    sousTitre: '8 semaines en circuits',
    /*
     * Aucun programme, et c'est volontaire. Le §4 interdit d'en inventer les
     * objectifs, les exercices ou les durées, et le §15 dit que son identité
     * visuelle sera choisie plus tard. La famille existe pour que la place
     * soit prête, pas pour remplir le catalogue.
     */
    resume:
      'Huit semaines en circuits, à la maison ou en salle, avec un échauffement et deux questions de sécurité qui adaptent la séance.',
    programmes: [
      {
        id: 'femmes8',
        familleId: 'femmes',
        nom: 'FEMMES 8',
        version: '0.1',
        dureeSemaines: 8,
        /*
         * `a-venir`, et ce n'est pas une précaution de façade.
         *
         * La règle en tête de ce fichier est explicite : un programme n'est
         * `disponible` que s'il est jouable de bout en bout. Les données
         * sont là — 3 phases, 30 séances, 39 exercices — mais aucun écran ne
         * sait encore afficher un circuit en tours, et le cycle ne se
         * démarre pas. L'annoncer disponible serait le mensonge que le
         * premier appui révélerait.
         */
        statut: 'a-venir',
        apercu: '#/femmes/aujourdhui',
        resume:
          'Trois phases — Réactivation, Construction, Intensification — en circuits de 20 à 45 minutes, trois à quatre fois par semaine.',
        objectifs: [
          'Reprendre ou construire une base de force complète, sans matériel lourd',
          'Progresser par le volume et la maîtrise avant la charge',
          'Tenir huit semaines avec trois séances courtes plutôt que cinq longues',
        ],
        prerequis: [
          'Un tapis, une paire d’haltères légers et un kettlebell — ou une salle de sport',
          'Trois créneaux de 20 à 45 minutes par semaine',
        ],
      },
    ],
  },
  {
    id: 'perso',
    /* Le nom choisi par Guillaume pour la rubrique personnalisée. */
    nom: 'ME, MYSELF & I',
    sousTitre: 'Ton programme dans MAJK',
    /*
     * Une famille qui n'aura JAMAIS de programme écrit ici.
     *
     * Les trois autres portent des programmes conçus d'avance : leur contenu
     * est dans le code, et le catalogue ne fait que l'annoncer. Celle-ci est
     * l'inverse — elle accueille le programme que la personne apporte, et
     * reste vide tant qu'elle n'a rien apporté. `programmes: []` n'est donc
     * pas un contenu « à venir » qu'on finira par écrire : c'est l'état
     * normal de cette famille, et il le restera.
     *
     * Elle existe dès maintenant pour que la place soit prise, et surtout
     * pour que le reste du code apprenne tout de suite qu'un programme peut
     * ne venir de nulle part.
     */
    resume:
      'Ton propre programme, suivi avec le chrono, l’historique et les courbes de MAJK. Rien n’est prescrit ici : le contenu vient de toi.',
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
