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
  /**
   * Le matériel à prévoir AVANT de démarrer, pour l'acheter à temps.
   *
   * Seulement ce que la salle ne fournit pas forcément : une ceinture de lest
   * ne se trouve pas au rack. Chaque objet cite les exercices qui l'exigent ;
   * un test vérifie qu'ils sont bien programmés, pour que la liste ne garde
   * pas un objet dont plus aucune séance ne se sert.
   */
  materiel?: readonly MaterielRequis[];
  /**
   * Ce qu'il faut avoir TERMINÉ pour accéder au programme.
   *
   * `apres` : le programme qu'il faut avoir TERMINÉ. Voir `engine/acces.ts`.
   * Absent : accessible dès l'inscription.
   */
  deblocage?: { apres: string };
}

export interface MaterielRequis {
  objet: string;
  /** À quoi il sert, en une phrase. */
  usage: string;
  /** Les exercices qui l'exigent (identifiants de `exercises.ts`). */
  exercices: readonly string[];
  /** Ce qui le remplace si on ne l'a pas — écrit dans le programme. */
  sinon?: string;
}

export interface Famille {
  id: FamilleId;
  /** Le nom commercial court : POWER, MASS. */
  nom: string;
  /**
   * Facultatif : une famille sans accroche juste n'en affiche aucune, plutôt
   * qu'une accroche fausse.
   */
  sousTitre?: string;
  resume: string;
  programmes: readonly ProgrammeDefinition[];
}

/** Le texte que l'organigramme donne aux trois premières transitions FEMMES. */
const TRANSITION = 'Travail des points faibles : renforcement, équilibres, mobilité.';

/** Une étape FEMMES encore à venir : rien d'écrit, sinon son résumé et sa règle d'ouverture. */
function etapeFemmes(
  id: string,
  nom: string,
  dureeSemaines: number,
  resume: string,
  apres: string,
): ProgrammeDefinition {
  return {
    id,
    familleId: 'femmes',
    nom,
    version: '0.1',
    dureeSemaines,
    statut: 'a-venir',
    resume,
    objectifs: [],
    prerequis: [],
    deblocage: { apres },
  };
}

export const FAMILLES: readonly Famille[] = [
  {
    id: 'power',
    nom: 'POWER',
    sousTitre: 'Force & explosivité',
    resume:
      'Un parcours sur un an : trois cycles de 12 semaines de force et d’explosivité, séparés par trois transitions de 4 semaines (points faibles, core, mobilité, unilatéral). Chaque étape s’ouvre quand la précédente est terminée.',
    programmes: [
      {
        id: 'power12',
        familleId: 'power',
        /*
         * Le premier des six temps du parcours POWER (schéma de Guillaume).
         * L'identifiant `power12` ne change pas : les cycles déjà commencés
         * le portent. `version` reste sa révision technique (1.2).
         */
        nom: 'POWER CYCLE 1',
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
        /*
         * Tiré du programme, objet par objet — rien d'ajouté. Ce que la salle
         * fournit (barres, câbles, landmine) n'y est pas.
         */
        materiel: [
          {
            objet: 'Ceinture de lest',
            usage: 'Tractions lestées (de +20 à +45 kg) et tractions prise neutre à +5-10 kg.',
            exercices: ['weighted-pullup', 'neutral-grip-pullup', 'test-weighted-pullup-1rm'],
          },
          {
            objet: 'Roue abdominale',
            usage: 'Ab Wheel en séance et Ab Wheel max aux combines.',
            exercices: ['ab-wheel', 'test-ab-wheel-max'],
            sinon: 'Rollout avec une barre chargée de deux disques.',
          },
          {
            objet: 'Box de 60 à 75 cm',
            usage: 'Box Jump, dont le contraste squat → box jump des semaines 9 à 11.',
            exercices: ['box-jump'],
            sinon: 'Box de la zone fonctionnelle Basic-Fit ; sinon Vertical Jump sur cible murale.',
          },
          {
            objet: 'Mètre ruban',
            usage:
              'Broad Jump mesuré en cm : test de readiness avant chaque séance jambes, et combines.',
            exercices: ['broad-jump', 'test-broad-jump', 'test-vertical-jump'],
          },
          {
            objet: 'Téléphone pour filmer + 20 m de surface adaptée',
            usage: 'Sprints 10 et 20 m des combines, chronométrés à la vidéo, jamais sur tapis.',
            exercices: ['test-sprint-10m', 'test-sprint-20m'],
            sinon: 'Sans surface adaptée, le sprint se saute : il est facultatif.',
          },
        ],
      },
      /*
       * Le reste du parcours POWER, d'après le schéma de Guillaume : trois
       * cycles de 12 séparés par trois transitions de 4 (48 semaines — le
       * schéma écrit 52, écart signalé).
       *
       * Linéaire et complet : chaque étape s'ouvre quand la précédente est
       * TERMINÉE. Les cinq sont `a-venir` — aucune séance n'est écrite ; les
       * résumés reprennent ses mots, rien n'est inventé.
       */
      {
        id: 'power-transition1',
        familleId: 'power',
        nom: 'POWER TRANSITION 1',
        version: '0.1',
        dureeSemaines: 4,
        statut: 'a-venir',
        resume: 'Travail des points faibles : renforcement, core, mobilité, unilatéral.',
        objectifs: [],
        prerequis: [],
        deblocage: { apres: 'power12' },
      },
      {
        id: 'power-cycle2',
        familleId: 'power',
        nom: 'POWER CYCLE 2',
        version: '0.1',
        dureeSemaines: 12,
        statut: 'a-venir',
        resume: 'Développement de la force et de la puissance.',
        objectifs: [],
        prerequis: [],
        deblocage: { apres: 'power-transition1' },
      },
      {
        id: 'power-transition2',
        familleId: 'power',
        nom: 'POWER TRANSITION 2',
        version: '0.1',
        dureeSemaines: 4,
        statut: 'a-venir',
        resume: 'Travail des points faibles : renforcement, core, mobilité, unilatéral.',
        objectifs: [],
        prerequis: [],
        deblocage: { apres: 'power-cycle2' },
      },
      {
        id: 'power-cycle3',
        familleId: 'power',
        nom: 'POWER CYCLE 3',
        version: '0.1',
        dureeSemaines: 12,
        statut: 'a-venir',
        resume: 'Phase finale de développement de la force, de la puissance et de l’explosivité.',
        objectifs: [],
        prerequis: [],
        deblocage: { apres: 'power-transition2' },
      },
      {
        id: 'power-transition-finale',
        familleId: 'power',
        nom: 'POWER TRANSITION FINALE',
        version: '0.1',
        dureeSemaines: 4,
        statut: 'a-venir',
        resume:
          'Bilan, consolidation et travail global des points faibles : core, mobilité, unilatéral.',
        objectifs: [],
        prerequis: [],
        deblocage: { apres: 'power-cycle3' },
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
    /* Choisi par Guillaume, à la place de « 8 semaines en circuits ». */
    sousTitre: 'Galbe & renforcement',
    /*
     * Un parcours en huit étapes, d'après l'organigramme de Guillaume :
     * quatre cycles de 8 semaines, chacun suivi d'une transition de 4.
     *
     * UNE différence avec POWER, voulue par Guillaume : terminer un cycle
     * ouvre la transition qui le suit ET le cycle suivant. La transition
     * n'est donc jamais un passage obligé pour avancer. Le mécanisme est le
     * même (`deblocage.apres`) : seul ce qu'on désigne comme « avant » change.
     */
    resume:
      'Un parcours en huit étapes : quatre cycles de 8 semaines (prise de masse, congestion, perte de poids, prise de masse), chacun suivi d’une transition de 4 semaines pour travailler les points faibles. Terminer un cycle ouvre à la fois la transition qui le suit et le cycle suivant.',
    programmes: [
      {
        id: 'femmes8',
        familleId: 'femmes',
        /*
         * Première étape du parcours FEMMES. L'identifiant `femmes8` ne
         * change pas : ses écrans d'aperçu et ses données le portent.
         */
        nom: 'FEMMES CYCLE 1',
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
          'Prise de masse : développement de la masse musculaire. Trois phases — Réactivation, Construction, Intensification — en circuits de 20 à 45 minutes, trois à quatre fois par semaine.',
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
      /*
       * Les sept étapes suivantes, mot pour mot depuis l'organigramme. Toutes
       * `a-venir` : aucune séance n'est écrite, donc ni objectifs ni
       * prérequis.
       *
       *   cycle N      → s'ouvre après le cycle N-1 (pas après la transition)
       *   transition N → s'ouvre après le cycle N
       */
      etapeFemmes('femmes-transition1', 'FEMMES TRANSITION 1', 4, TRANSITION, 'femmes8'),
      etapeFemmes(
        'femmes-cycle2',
        'FEMMES CYCLE 2',
        8,
        'Congestion : galbe, volume et définition musculaire.',
        'femmes8',
      ),
      etapeFemmes('femmes-transition2', 'FEMMES TRANSITION 2', 4, TRANSITION, 'femmes-cycle2'),
      etapeFemmes(
        'femmes-cycle3',
        'FEMMES CYCLE 3',
        8,
        'Perte de poids : déficit contrôlé et maintien de la masse musculaire.',
        'femmes-cycle2',
      ),
      etapeFemmes('femmes-transition3', 'FEMMES TRANSITION 3', 4, TRANSITION, 'femmes-cycle3'),
      etapeFemmes(
        'femmes-cycle4',
        'FEMMES CYCLE 4',
        8,
        'Prise de masse : nouvelle phase de développement musculaire.',
        'femmes-cycle3',
      ),
      etapeFemmes(
        'femmes-transition4',
        'FEMMES TRANSITION 4',
        4,
        'Bilan, consolidation et travail final des points faibles.',
        'femmes-cycle4',
      ),
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
