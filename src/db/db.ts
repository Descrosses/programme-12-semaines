/**
 * Base locale (IndexedDB via Dexie).
 *
 * Tout reste sur le téléphone : pas de compte, pas de serveur. Chaque série
 * validée est écrite immédiatement — l'appli ne doit jamais perdre une saisie.
 */

import Dexie, { type Table } from 'dexie';
import { LEGACY_DAY_MAP, type DayIndex } from '../data/types';

export type SessionStatus = 'planned' | 'done' | 'skipped';

export interface SessionRow {
  id?: number;
  week: number;
  day: DayIndex;
  /** `YYYY-MM-DD`. */
  date: string;
  status: SessionStatus;
  /** Ids des items d'échauffement cochés (§6). */
  warmupChecked: string[];
  /** Douleur, sommeil, remarque — défaut n°9 du prototype. */
  notes: string;
  /**
   * Charge retenue par Guillaume quand il accepte une suggestion de §11, ou
   * qu'il en saisit une autre. Clé = id d'exercice. Le plan reste intact.
   */
  loadOverrides?: Record<string, number>;
  startedAt?: number;
  finishedAt?: number;
}

export interface SetRow {
  id?: number;
  sessionId: number;
  exerciseId: string;
  week: number;
  day: DayIndex;
  date: string;
  setIndex: number;

  plannedKg: number | null;
  plannedReps: number | null;
  /** Cible de RPE du jour, figée au moment de la saisie. */
  targetRpeMin: number | null;
  targetRpeMax: number | null;
  targetRpeLabel: string | null;

  actualKg: number | null;
  actualReps: number | null;
  actualRpe: number | null;
  /**
   * Mesure d'un exercice qui ne se compte ni en reps ni en kilos : distance de
   * saut en cm, temps de sprint en s, distance de carry en m.
   */
  measureValue: number | null;
  /**
   * L'unité de `measureValue`, telle qu'elle a été CHOISIE au moment de la
   * saisie : « m », « pas », « cm », « s ».
   *
   * Pourquoi la stocker plutôt que la déduire de l'exercice : un Zercher March
   * se fait en mètres quand il y a de la place, en pas sur place quand il n'y
   * en a pas. Déduire l'unité de l'exercice rendrait les deux séances
   * comparables alors qu'elles ne le sont pas, et douze pas ne valent pas
   * douze mètres.
   *
   * Absente des lignes écrites avant ce champ : `undefined` veut dire
   * « l'unité par défaut du mouvement », jamais « pas d'unité ». Et rien, ici
   * ni ailleurs, ne convertit une unité en une autre.
   */
  measureUnit?: string | null;
  /** §11 cas 5. */
  failed: boolean;

  doneAt: number;
}

export interface ReadinessRow {
  id?: number;
  date: string;
  week: number;
  day: DayIndex;
  /** Les 3 essais, pour l'historique. */
  attempts: Array<number | null>;
  /** Meilleur des 3, celui qui sert au verdict. */
  jumpCm: number;
  level: 'vert' | 'orange' | 'rouge';
  pctDelta: number;
}

/**
 * Une ligne par jour de relevé — poids du matin, tour de taille quand il y en a.
 *
 * Table séparée et non un champ de plus dans `settings` : le plan alimentaire
 * ne décide rien sur une pesée isolée, il lui faut un historique. `date` est
 * unique, donc se repeser deux fois le même jour corrige la ligne au lieu d'en
 * créer une deuxième qui fausserait la moyenne.
 */
/**
 * Une ligne de suivi de douleur, pour un exercice et une date.
 *
 * Les trois moments sont séparés parce qu'ils ne disent pas la même chose :
 * une gêne qui disparaît en sortant de la salle n'est pas une gêne qu'on
 * retrouve au réveil. Chacun peut rester `null` — « pas encore noté » n'est
 * pas « zéro ».
 */
export interface PainLogRow {
  id?: number;
  /** `YYYY-MM-DD`. */
  date: string;
  /** Id de l'exercice concerné. */
  exId: string;
  /** 0 à 10 pendant l'exercice. */
  during: number | null;
  /** 0 à 10 après la séance. */
  after: number | null;
  /** 0 à 10 le lendemain. */
  nextDay: number | null;
  /** Charge réellement tolérée, en kg. */
  toleratedKg: number | null;
  /** Amplitude tolérée, telle que Guillaume la qualifie. */
  rom: 'complete' | 'partielle' | 'reduite' | null;
}

/**
 * Un aliment mangé en plus de ce que le plan prévoyait.
 *
 * Il ne modifie pas le plan : le plan dit ce qui était prévu, cette ligne dit
 * ce qui a réellement été avalé en plus. Les deux doivent rester lisibles
 * séparément, sinon « j'ai mangé un kiwi » devient « le programme prévoyait un
 * kiwi », et au bout de trois semaines plus personne ne sait ce qui était la
 * consigne.
 *
 * ── La composition est RECOPIÉE, pas référencée ────────────────────────────
 *
 * C'est la différence de fond avec une ligne du plan. Le plan est une
 * consigne : corriger l'étiquette du skyr doit corriger ce qu'il prescrit,
 * aujourd'hui et demain. Un ajout est un FAIT DATÉ : le 12 octobre, 200 g de
 * ce skyr-là valaient ces calories-là.
 *
 * Toutes les marques de skyr n'ont pas les mêmes macros. Si la ligne pointait
 * seulement la bibliothèque, changer de marque en novembre réécrirait toutes
 * les journées d'octobre avec des valeurs que Guillaume n'a jamais mangées.
 * Un historique qui bouge quand on corrige une étiquette ne vaut rien.
 *
 * Conséquence assumée : une faute de frappe sur un ajout ne se rattrape pas
 * en corrigeant l'étiquette. On retire la ligne et on la refait — deux appuis,
 * et aucune ambiguïté sur ce qui a été compté.
 */
export interface ExtraFoodRow {
  id?: number;
  /** `YYYY-MM-DD`. */
  date: string;
  /** Le repas auquel il se rattache, pour l'afficher au bon endroit. */
  mealId: string;
  /** D'où venait l'aliment. Mémoire seulement : aucun calcul ne le relit. */
  foodId: string;
  /** Quantité, dans l'unité ci-dessous. */
  qty: number;

  // --- La composition au moment où l'aliment a été mangé -------------------
  /** Nom affiché, figé lui aussi : un aliment personnalisé supprimé reste lisible. */
  label: string;
  unit: 'g' | 'ml' | 'unité';
  /** Base de la composition : 100 pour ce qui se pèse, 1 pour ce qui se compte. */
  per: number;
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export interface MeasurementRow {
  id?: number;
  /** `YYYY-MM-DD`. */
  date: string;
  weightKg: number | null;
  waistCm: number | null;
}

/**
 * Photo hebdomadaire du suivi visuel.
 *
 * `week` est unique : une photo par semaine, et en reprendre une remplace la
 * précédente. Douze semaines de photos doivent rester comparables entre elles,
 * pas devenir un album.
 *
 * La photo est stockée en `Blob` déjà compressé (voir `src/media/photo.ts`),
 * jamais en base64 : une chaîne base64 pèse un tiers de plus et doit être
 * décodée à chaque affichage.
 */
export interface ProgressPhotoRow {
  id?: number;
  week: number;
  /** `YYYY-MM-DD` du jour de la prise. */
  date: string;
  blob: Blob;
  /** Taille après compression, pour afficher l'encombrement sans tout relire. */
  bytes: number;
  width: number;
  height: number;
}

/** Photo d'exécution d'un mouvement, prise depuis la fiche d'exercice. */
export interface ExerciseMediaRow {
  id?: number;
  exerciseId: string;
  week: number;
  day: DayIndex;
  date: string;
  blob: Blob;
  bytes: number;
  width: number;
  height: number;
}

/**
 * Fiche technique d'un mouvement — une image, pour toujours.
 *
 * À ne pas confondre avec `exerciseMedia`, et c'est pour ça que ce sont deux
 * tables : celle-ci porte une infographie d'exécution, la même quelle que soit
 * la semaine, donc clé unique sur `exerciseId` et AUCUNE date. L'autre porte
 * des photos de Guillaume à une séance précise, donc datées.
 *
 * Les mélanger obligeait à réattacher la même image à chacune des dix
 * occurrences du back squat sur douze semaines — dix copies du même fichier en
 * base, et neuf gestes inutiles.
 */
export interface ExerciseReferenceRow {
  id?: number;
  exerciseId: string;
  blob: Blob;
  bytes: number;
  width: number;
  height: number;
  /** `YYYY-MM-DD` d'ajout, pour savoir de quand date la fiche. */
  addedAt: string;
}

/**
 * Trace d'une vidéo — et rien d'autre.
 *
 * Le fichier vidéo reste dans la pellicule de l'iPhone. Sur iOS, le stockage
 * d'une PWA peut être vidé par le système quand la place manque ; y mettre des
 * dizaines de vidéos serait une perte de données annoncée. On ne garde donc
 * que la date, de quoi dire « tu as filmé ton squat le 14 septembre ».
 */
export interface ExerciseVideoLogRow {
  id?: number;
  exerciseId: string;
  week: number;
  day: DayIndex;
  date: string;
  /** Note libre : « vue de profil », « 3e série ». */
  note: string;
}

/**
 * Remarque libre sur UN exercice d'UNE séance.
 *
 * À ne pas confondre avec `sessions.notes`, la remarque de fin de séance, qui
 * parle de la séance entière — douleur, sommeil, sensation générale. Celle-ci
 * parle d'un mouvement précis un jour précis : « le squat m'a paru très lourd
 * dès la deuxième série ». C'est le signal qui aurait fait remarquer, dès la
 * semaine 1, que la charge de squat ne correspondait pas au vrai niveau.
 *
 * La clé est `[exerciseId+week+day]`, donc une remarque par exercice et par
 * OCCURRENCE — ni par série (trop fin : on ne se souvient pas série par série),
 * ni par exercice tout court (trop grossier : la remarque de la semaine 3
 * écraserait celle de la semaine 1, qu'on veut justement pouvoir relire).
 */
export interface ExerciseNoteRow {
  id?: number;
  exerciseId: string;
  week: number;
  day: DayIndex;
  /** `YYYY-MM-DD` de la séance, pour dater la remarque à la relecture. */
  date: string;
  text: string;
  /** ms epoch de la dernière frappe. */
  updatedAt: number;
}

export type CombinePhase = 'initial' | 's8' | 'final';

export interface CombineRow {
  id?: number;
  phase: CombinePhase;
  date: string;
  /** Clé = id d'exercice de test, valeur = mesure. */
  metrics: Record<string, number | null>;
  notes: string;
}

export interface SettingsRow {
  id: 1;
  startDate: string;
  broadJumpBaselineCm: number | null;
  oneRM: Record<string, number>;
  /**
   * §12 — « moyenne de 3 matinées, à jeun ». Relevé à la maison sur plusieurs
   * jours, jamais pendant une séance : il vit ici et se saisit à tout moment.
   */
  bodyweightKg: number | null;
  /** Date `YYYY-MM-DD` du dernier relevé de poids, pour dater le rappel. */
  bodyweightDate: string;
  /**
   * Les deux bornes du poids que l'utilisateur VISE, en kilos.
   *
   * Elles ne viennent pas du programme. Le §13 a longtemps affiché
   * « 77-80 kg » pour tout le monde : c'était le but personnel de l'auteur, et
   * le genre de chiffre qui n'a aucun sens transposé à quelqu'un d'autre — un
   * pratiquant de 95 kg qui ouvre l'écran Poids n'a pas à lire qu'il doit en
   * perdre quinze.
   *
   * `null` des deux côtés est l'état normal, pas un trou à combler : le
   * graphique trace alors la courbe sans bande, et aucun objectif n'est
   * suggéré. Une seule borne renseignée est un objectif en cours de saisie —
   * `bandePoids` (engine/ciblePoids) décide de ce qui s'affiche.
   */
  ciblePoidsBasKg: number | null;
  ciblePoidsHautKg: number | null;
  /**
   * Date `YYYY-MM-DD` du dernier recalage des charges sur les 1RM testés.
   *
   * Vide = les charges tournent encore sur les estimations d'avant le combine.
   * Sert à dire à Guillaume à partir de quand le plan affiché repose sur ses
   * vrais maxima — les séances validées avant, elles, restent telles quelles :
   * elles enregistrent ce qu'il a réellement soulevé, pas ce qui était prévu.
   */
  oneRMCalibratedAt: string;
  /**
   * Cette installation garde le tableau §9 tel qu'il a été écrit, en kilos.
   *
   * Posé à `true` par la migration v16 sur toute base qui portait déjà une
   * date de début : elle avait un plan en cours, écrit sur les maxima de
   * l'auteur, et la mise à jour n'a pas à le réécrire au milieu des douze
   * semaines. `false` partout ailleurs — une installation neuve reçoit le
   * tableau en pourcentages de SES propres maxima.
   */
  tableauOrigine: boolean;
  /** Son et vibration en fin de repos. */
  soundEnabled: boolean;
  vibrationEnabled: boolean;
}

export class ProgrammeDB extends Dexie {
  sessions!: Table<SessionRow, number>;
  sets!: Table<SetRow, number>;
  readiness!: Table<ReadinessRow, number>;
  combines!: Table<CombineRow, number>;
  measurements!: Table<MeasurementRow, number>;
  progressPhotos!: Table<ProgressPhotoRow, number>;
  exerciseMedia!: Table<ExerciseMediaRow, number>;
  exerciseReference!: Table<ExerciseReferenceRow, number>;
  foodOverrides!: Table<FoodOverrideRow, number>;
  exerciseVideoLog!: Table<ExerciseVideoLogRow, number>;
  exerciseNotes!: Table<ExerciseNoteRow, number>;
  customFoods!: Table<CustomFoodRow, number>;
  mealLog!: Table<MealLogRow, number>;
  painLog!: Table<PainLogRow, number>;
  extraFoods!: Table<ExtraFoodRow, number>;
  dayKind!: Table<DayKindRow, number>;
  notes!: Table<NoteRow, number>;
  noteDrafts!: Table<NoteDraftRow, number>;
  sessionExercises!: Table<SessionExerciseRow, number>;
  settings!: Table<SettingsRow, number>;

  /**
   * `name` n'existe que pour les tests de migration : ils doivent pouvoir
   * monter une base jetable au schéma d'avant, la remplir, puis l'ouvrir avec
   * ce schéma-ci pour voir la migration se jouer en vrai. L'appli, elle,
   * n'appelle jamais ce constructeur avec un argument.
   */
  constructor(name = 'programme-12-semaines') {
    super(name);
    this.version(1).stores({
      sessions: '++id, &[week+day], date, status',
      sets: '++id, sessionId, [sessionId+exerciseId], exerciseId, [exerciseId+week], date',
      readiness: '++id, date, [week+day], week',
      combines: '++id, &phase, date',
      settings: 'id',
    });

    /*
     * v2 — le 3e jour du combine initial était rangé en (semaine 1, lundi).
     * Il appartient au combine, donc à la semaine 0 : l'onglet « T » doit le
     * montrer avec ses deux frères, et la semaine 1 ne garder que ses séances.
     * Tout ce qui a déjà été saisi ce jour-là suit le déménagement — sinon la
     * séance rouvrirait vide.
     */
    this.version(2)
      .stores({})
      .upgrade(async (tx) => {
        await tx.table('sessions').where('[week+day]').equals([1, 0]).modify({ week: 0 });
        await tx.table('readiness').where('[week+day]').equals([1, 0]).modify({ week: 0 });
        // `sets` n'a pas d'index sur `week` seul : un parcours complet, une fois.
        await tx
          .table('sets')
          .toCollection()
          .modify((r: { week: number; day: number }) => {
            if (r.week === 1 && r.day === 0) r.week = 0;
          });
      });

    /*
     * v3 — journal de poids et de tour de taille, pour l'onglet Nutrition.
     * Ajout pur : aucune table existante n'est touchée, donc tout l'historique
     * d'entraînement traverse la migration sans y toucher.
     */
    this.version(3).stores({ measurements: '++id, &date' });

    /*
     * v4 — suivi visuel. Trois tables, toujours en ajout pur.
     *
     * Les photos sont dans des tables à part et non dans `sessions` ou
     * `measurements` : ce sont les seules lignes lourdes de la base, et les
     * isoler permet de les exporter, de les compter et au besoin de les
     * effacer sans toucher à une seule série d'entraînement.
     */
    this.version(4).stores({
      progressPhotos: '++id, &week, date',
      exerciseMedia: '++id, exerciseId, [exerciseId+date], week, date',
      exerciseVideoLog: '++id, exerciseId, [exerciseId+date], week, date',
    });

    /*
     * v5 — `DayIndex` passe de cinq jours (lun, mer, ven, sam, dim) aux sept
     * jours réels, pour que le combine initial puisse occuper un mardi et un
     * jeudi. Toutes les lignes déjà enregistrées portent l'ancienne
     * numérotation et doivent être traduites : 0→0, 1→2, 2→4, 3→5, 4→6.
     *
     * L'ordre DÉCROISSANT n'est pas décoratif. `sessions` a un index unique
     * sur `[week+day]` : traduire 1→2 avant d'avoir libéré le 2 ferait entrer
     * deux lignes en collision au milieu du parcours. En partant du jour le
     * plus élevé, la place visée est toujours déjà vide.
     *
     * L'ancre du calendrier change de sens au passage — elle désignait le
     * samedi du combine, elle désigne maintenant son lundi — donc on avance la
     * date enregistrée jusqu'au lundi suivant.
     */
    this.version(5).upgrade(async (tx) => {
      for (const table of ['sessions', 'sets', 'readiness', 'exerciseMedia', 'exerciseVideoLog']) {
        for (const oldDay of [4, 3, 2, 1]) {
          const nouveau = LEGACY_DAY_MAP[oldDay]!;
          await tx
            .table(table)
            .toCollection()
            .modify((row: { day?: number }) => {
              if (row.day === oldDay) row.day = nouveau;
            });
        }
      }

      const settings = await tx.table('settings').get(1);
      if (settings?.startDate) {
        await tx.table('settings').update(1, {
          startDate: mondayOnOrAfter(settings.startDate as string),
        });
      }
    });

    /*
     * v6 — répare un effet de bord de la v5.
     *
     * La v5 traduit les numéros de jour, ce qui est juste pour une semaine
     * d'entraînement : le lundi reste le lundi, la séance est la même avant et
     * après. Mais la semaine 0 a été entièrement redessinée au même moment —
     * trois séances sont devenues cinq, et leur contenu a changé. Traduire un
     * numéro n'y avait donc aucun sens : un « fait » posé sur l'ancien jour 3
     * (deadlift, lundi) se retrouvait sur la nouvelle séance sauts + squat.
     *
     * Les lignes de la semaine 0 ne décrivent plus rien : on les efface, ainsi
     * que leurs séries. Les résultats du combine, eux, vivent dans la table
     * `combines` (onglet Combine) et ne sont pas touchés — rien d'irremplaçable
     * ne part.
     */
    this.version(6).upgrade(async (tx) => {
      const sessions = (await tx.table('sessions').toArray()) as SessionRow[];
      const week0 = sessions.filter((s) => s.week === 0);
      const ids = new Set(week0.map((s) => s.id));

      await tx
        .table('sets')
        .toCollection()
        .filter((r: SetRow) => r.week === 0 || ids.has(r.sessionId))
        .delete();
      await tx
        .table('readiness')
        .toCollection()
        .filter((r: ReadinessRow) => r.week === 0)
        .delete();
      await tx
        .table('sessions')
        .toCollection()
        .filter((r: SessionRow) => r.week === 0)
        .delete();
    });

    /*
     * v7 — fiche technique par mouvement. Ajout pur, une table de plus.
     *
     * `&exerciseId` est unique : une seule fiche par mouvement. En reprendre
     * une remplace la précédente au lieu d'empiler, ce qui est exactement le
     * comportement attendu d'une fiche de référence.
     */
    this.version(7).stores({ exerciseReference: '++id, &exerciseId' });

    /*
     * v8 — valeurs d'aliment modifiées par Guillaume.
     *
     * Une ligne par aliment MODIFIÉ, pas par aliment du plan : tant qu'il ne
     * touche à rien, la table est vide et c'est le .md qui parle. Supprimer la
     * ligne suffit donc à revenir aux valeurs d'origine, sans avoir à stocker
     * quelque part ce qu'étaient ces valeurs.
     *
     * Chaque champ est optionnel : changer la seule quantité ne fige pas la
     * composition, qui continue de suivre le .md.
     */
    this.version(8).stores({ foodOverrides: '++id, &foodId' });

    /*
     * v9 — remarque par exercice et par séance. Ajout pur, une table de plus :
     * aucune ligne existante n'est lue ni modifiée, tout l'historique traverse
     * la migration sans y toucher.
     *
     * `&[exerciseId+week+day]` est unique — c'est ce qui fait qu'écrire au fil
     * de la frappe corrige la remarque du jour au lieu d'en empiler une par
     * caractère tapé. L'index `exerciseId` sert à relire, à la semaine 7, ce
     * qui avait été noté sur ce mouvement en semaine 1.
     */
    this.version(9).stores({
      exerciseNotes: '++id, &[exerciseId+week+day], exerciseId, [exerciseId+week], date',
    });

    /*
     * v10 — aliments personnalisés. Ajout pur, une table de plus : aucune ligne
     * existante n'est lue ni modifiée.
     *
     * `&foodId` est unique — un aliment saisi deux fois sous le même nom
     * corrige le premier au lieu d'en créer un doublon dans la liste de choix.
     *
     * Le champ `productId` des remplacements, lui, n'a demandé AUCUNE
     * migration : Dexie stocke l'objet entier et seuls les index sont au
     * schéma. Une ligne écrite avant la v10 n'a simplement pas ce champ.
     */
    /*
     * `addedAt` est indexé parce qu'on trie dessus : Dexie lève une
     * `SchemaError` sur un `orderBy` d'un champ qui n'est pas un index, et
     * l'erreur ne dit pas lequel.
     */
    this.version(10).stores({
      customFoods: '++id, &foodId, category, addedAt',
    });

    /*
     * v11 — repas réellement pris. Ajout pur, une table de plus : aucune ligne
     * existante n'est lue ni modifiée.
     *
     * `&[date+mealId]` est unique : cocher puis décocher le même repas corrige
     * la ligne au lieu d'en empiler une par appui. `date` est indexé parce
     * qu'on relit toujours une journée entière d'un coup.
     *
     * Ce qui n'est PAS stocké ici : les macros. Elles se recalculent depuis le
     * plan et les corrections de Guillaume, qui sont déjà la vérité de ce qu'il
     * a mangé. Les figer ici en ferait une troisième copie, qui divergerait à
     * la première étiquette recopiée.
     */
    this.version(11).stores({ mealLog: '++id, &[date+mealId], date' });

    /*
     * v12 — le palier choisi pour une journée, quand il diffère du programme.
     *
     * Le programme dit « mardi et jeudi, repos ». La vie dit parfois le
     * contraire : une séance déplacée, un chantier annulé. Sans ce choix,
     * s'entraîner un jeudi obligeait à manger le plan d'un jour de repos — ou à
     * consulter l'autre palier sans pouvoir y cocher quoi que ce soit.
     *
     * Une ligne n'existe que pour une journée DÉTOURNÉE : l'absence veut dire
     * « le programme fait foi ». Revenir au programme supprime la ligne.
     */
    this.version(12).stores({ dayKind: '++id, &date' });

    /*
     * v13 — suivi de douleur, exercice par exercice et séance par séance.
     *
     * Ajout pur, une table de plus : aucune ligne existante n'est lue ni
     * modifiée, tout l'historique traverse la migration sans y toucher.
     *
     * `&[date+exId]` est unique : on corrige la note du jour au lieu d'en
     * empiler une par appui sur le curseur. `date` et `exId` sont indexés
     * séparément parce qu'on relit soit une séance entière, soit la série
     * d'un exercice dans le temps.
     *
     * Ce que cette table n'est pas : un dossier médical. Elle enregistre ce
     * que Guillaume ressent et ce qu'il a réellement toléré. Elle ne nomme
     * aucune structure et ne pose aucun diagnostic.
     */
    this.version(13).stores({ painLog: '++id, &[date+exId], date, exId' });

    /*
     * v14 — les aliments mangés EN PLUS du plan.
     *
     * Ajout pur, une table de plus : aucune ligne existante n'est lue ni
     * modifiée.
     *
     * Index non unique, contrairement aux autres : un kiwi et 30 g de
     * confiture au même petit-déjeuner sont deux lignes distinctes, et rien
     * n'interdit d'ajouter deux fois le même aliment dans la journée.
     *
     * La composition voyage DANS la ligne (voir `ExtraFoodRow`), elle n'est
     * donc pas indexée : on relit toujours une journée entière d'un coup.
     */
    this.version(14).stores({ extraFoods: '++id, [date+mealId], date' });

    /*
     * v15 — remarques APPENDUES, brouillons, et exercices de séance.
     *
     * ── Ce qui est recopié, et pourquoi rien n'est supprimé ────────────────
     *
     * La migration RECOPIE dans `notes` ce qui existait déjà : chaque ligne de
     * `exerciseNotes` et chaque remarque de séance non vide de `sessions`.
     * Les sources restent en place, intactes. C'est volontairement redondant :
     * une migration qui déplace n'a pas de seconde chance si elle se trompe,
     * une migration qui recopie se relit.
     *
     * Les brouillons partent donc VIDES : l'historique porte déjà tout ce qui
     * avait été écrit, et pré-remplir le champ avec la dernière remarque la
     * ferait apparaître deux fois — une fois dans l'historique, une fois dans
     * le champ de saisie.
     *
     * `at` est reconstruit depuis `updatedAt` quand il existe, sinon depuis la
     * date de la séance à midi. Il ne sert qu'à départager deux remarques de
     * la même séance : un à-peu-près d'horodatage sur des lignes d'avant la
     * migration ne change aucun ordre d'affichage, qui se fait par semaine.
     *
     * Les deux autres tables sont de l'ajout pur : aucune ligne existante
     * n'est lue ni modifiée.
     */
    this.version(15)
      .stores({
        notes: '++id, exerciseId, [exerciseId+week], [week+day], week, date',
        noteDrafts: '++id, &[slot+week+day], [week+day]',
        sessionExercises:
          '++id, sessionId, [sessionId+originalExerciseId], [week+day], exerciseId, originalExerciseId',
      })
      .upgrade(async (tx) => {
        const reprises: NoteRow[] = [];

        const anciennes = (await tx.table('exerciseNotes').toArray()) as ExerciseNoteRow[];
        for (const n of anciennes) {
          const texte = (n.text ?? '').trim();
          if (texte === '') continue;
          reprises.push({
            exerciseId: n.exerciseId,
            week: n.week,
            day: n.day,
            date: n.date ?? '',
            text: texte,
            at: n.updatedAt ?? midi(n.date),
          });
        }

        const seances = (await tx.table('sessions').toArray()) as SessionRow[];
        for (const s of seances) {
          const texte = (s.notes ?? '').trim();
          if (texte === '') continue;
          reprises.push({
            exerciseId: null,
            week: s.week,
            day: s.day,
            date: s.date ?? '',
            text: texte,
            at: midi(s.date),
          });
        }

        if (reprises.length > 0) await tx.table('notes').bulkAdd(reprises);
      });

    /*
     * v16 — le §9 passe des kilos aux pourcentages, et les plans en cours
     * ne bougent pas.
     *
     * Le tableau des charges était écrit en kilos absolus, calés sur les
     * maxima de l'auteur du programme : une installation neuve servait donc
     * ses charges à quelqu'un dont elle ne savait rien. Il est désormais écrit
     * en pourcentages du maximum de chacun.
     *
     * Mais une base qui porte déjà une date de début suit un plan commencé sur
     * l'ancien tableau. Le réécrire au milieu des douze semaines changerait
     * des charges que personne n'a demandé à changer — on pose donc le drapeau
     * qui lui laisse le tableau d'origine, en kilos.
     *
     * Aucun champ indexé n'est ajouté : le `stores` reste le même, seule la
     * ligne de réglages est modifiée.
     */
    this.version(16).upgrade(async (tx) => {
      const reglages = (await tx.table('settings').get(1)) as SettingsRow | undefined;
      if (reglages === undefined) return;
      await tx.table('settings').put({
        ...reglages,
        tableauOrigine: (reglages.startDate ?? '') !== '',
      });
    });
  }
}

/**
 * Valeurs d'un aliment telles que Guillaume les a corrigées.
 *
 * `foodId` est l'identifiant stable de `FoodItem`, jamais son libellé : un
 * libellé peut être reformulé sans rien casser, un identifiant non.
 */
export interface FoodOverrideRow {
  id?: number;
  foodId: string;
  qty?: number;
  kcal?: number;
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
  /**
   * Remplacement : l'aliment réellement mangé à la place de celui du plan.
   *
   * Aucune migration n'a été nécessaire pour ce champ — Dexie stocke l'objet
   * entier, et seuls les index figurent au schéma. Les lignes écrites avant
   * n'ont simplement pas ce champ, ce qui veut dire « pas de remplacement ».
   */
  productId?: string;
}

/**
 * Un aliment saisi par Guillaume, réutilisable dans n'importe quel repas.
 *
 * Même forme qu'un aliment de la bibliothèque, à `isCustom` près : c'est ce qui
 * permet au remplacement de les traiter indifféremment. Le jour où l'un d'eux
 * mérite d'entrer dans la bibliothèque livrée, il suffit de le recopier.
 */
export interface CustomFoodRow {
  id?: number;
  /** Identifiant stable, préfixé « custom. » pour ne jamais heurter la bibliothèque. */
  foodId: string;
  label: string;
  unit: 'g' | 'ml' | 'unité';
  per: number;
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  referenceState: 'cru' | 'cuit' | 'na';
  category: string;
  /** `YYYY-MM-DD` de création, pour trier les plus récents en tête. */
  addedAt: string;
}

/**
 * Un repas coché comme pris, un jour donné.
 *
 * Une ligne n'existe que pour un repas coché : l'absence vaut « pas pris », et
 * décocher supprime la ligne. On ne garde donc jamais de « false » qui
 * encombrerait la base sans rien dire de plus.
 */
export interface MealLogRow {
  id?: number;
  /** `YYYY-MM-DD`. */
  date: string;
  /** L'identifiant stable du repas (`Meal.id`), jamais son libellé. */
  mealId: string;
  /** Horodatage de la coche, pour départager deux appareils un jour. */
  at: string;
}

/**
 * Le palier choisi pour une journée, contre l'avis du programme.
 *
 * `kind` est le palier RETENU, pas celui du programme : c'est lui qui pilote le
 * plan affiché, les repas qu'on peut cocher et la référence du suivi.
 */
export interface DayKindRow {
  id?: number;
  /** `YYYY-MM-DD`. */
  date: string;
  kind: 'train' | 'rest';
}

/**
 * Minuit + 12 h d'une date `YYYY-MM-DD`, en ms epoch — ou maintenant si la
 * date manque.
 *
 * Midi et non minuit : une remarque reconstruite doit tomber le bon jour quel
 * que soit le décalage horaire de l'appareil qui la relit.
 */
function midi(iso: string | undefined): number {
  if (!iso) return Date.now();
  const t = Date.parse(`${iso}T12:00:00Z`);
  return Number.isNaN(t) ? Date.now() : t;
}

/** Premier lundi à partir d'une date incluse — conversion d'ancre de la v5. */
function mondayOnOrAfter(iso: string): string {
  const d = new Date(`${iso}T12:00:00Z`);
  const shift = (8 - d.getUTCDay()) % 7; // 0 si déjà lundi
  return new Date(d.getTime() + shift * 86_400_000).toISOString().slice(0, 10);
}

export const db = new ProgrammeDB();

export const DEFAULT_SETTINGS_ROW: SettingsRow = {
  id: 1,
  startDate: '',
  broadJumpBaselineCm: null,
  oneRM: {},
  bodyweightKg: null,
  bodyweightDate: '',
  ciblePoidsBasKg: null,
  ciblePoidsHautKg: null,
  tableauOrigine: false,
  oneRMCalibratedAt: '',
  soundEnabled: true,
  vibrationEnabled: true,
};

/**
 * Une remarque, APPENDUE — jamais corrigée, jamais écrasée.
 *
 * ── Pourquoi une table de plus alors que `exerciseNotes` existait ──────────
 *
 * `exerciseNotes` portait un index UNIQUE sur `[exerciseId+week+day]`. C'était
 * voulu au départ : un seul champ par mouvement et par séance, corrigé au fil
 * de la frappe. Mais ça décidait aussi qu'un mouvement ne reçoit qu'UNE
 * remarque par séance. Noter « épaule gauche tire » à la deuxième série puis
 * « c'est passé en 3e » à la quatrième écrasait la première — et c'est
 * précisément la succession des deux qui dit quelque chose.
 *
 * Ici, rien n'est unique et rien ne se met à jour : on ajoute. Une remarque
 * entrée en semaine 3 reste lisible telle quelle en semaine 11.
 *
 * `exerciseId` à `null` veut dire « remarque de séance » — celle du bas de
 * l'écran, qui parle de la séance entière et pas d'un mouvement. IndexedDB
 * n'indexe pas `null` : ces lignes sortent naturellement de l'index
 * `exerciseId`, ce qui est exactement le tri voulu. On les relit par
 * `[week+day]`.
 */
export interface NoteRow {
  id?: number;
  /** Id du mouvement, ou `null` pour une remarque de séance. */
  exerciseId: string | null;
  week: number;
  day: DayIndex;
  /** `YYYY-MM-DD` de la séance. */
  date: string;
  text: string;
  /** ms epoch de l'ajout. Départage deux remarques de la même séance. */
  at: number;
}

/**
 * Le texte en cours de frappe, pas encore ajouté à l'historique.
 *
 * Une table à part, et c'est le cœur du compromis. La règle de l'appli est
 * qu'une saisie n'attend jamais : chaque frappe est écrite. Mais une table
 * append-only ne peut pas recevoir chaque frappe, sinon elle empile une ligne
 * par caractère. Le brouillon reçoit donc les frappes, et le bouton
 * « Ajouter » en fait une ligne d'historique.
 *
 * Conséquence : un téléphone qui se verrouille au milieu d'une phrase ne perd
 * rien — le brouillon est en base. Et une phrase oubliée dans le champ est
 * ajoutée automatiquement au moment où la séance est marquée terminée, ce qui
 * ferme le seul trou que le bouton ouvrait.
 *
 * `slot` est l'id du mouvement, ou `SESSION_NOTE_SLOT` pour la remarque de
 * séance : un champ texte, parce qu'IndexedDB n'indexe pas `null` et qu'ici
 * l'unicité est justement ce qu'on veut.
 */
export interface NoteDraftRow {
  id?: number;
  slot: string;
  week: number;
  day: DayIndex;
  date: string;
  text: string;
  updatedAt: number;
}

/** `slot` du brouillon de la remarque de séance. */
export const SESSION_NOTE_SLOT = '__seance__';

/**
 * Un exercice que Guillaume a mis dans SA séance — en remplacement d'un
 * exercice prévu, ou en plus.
 *
 * ── Ce que cette table ne fait pas ─────────────────────────────────────────
 *
 * Elle ne modifie pas le programme. Le plan continue de prescrire ce qu'il
 * prescrivait : la semaine suivante, le même créneau affiche de nouveau
 * l'exercice d'origine. Un remplacement est un FAIT de séance, pas une
 * correction du programme — c'est la même distinction qu'entre un aliment
 * ajouté et une ligne du plan alimentaire.
 *
 * ── Pourquoi les séries ne sont pas ici ────────────────────────────────────
 *
 * Elles vont dans `sets`, avec `exerciseId` = celui du remplacement. C'est ce
 * qui fait que §11 ne les voit jamais sous le lift d'origine : la progression
 * lit l'historique par identifiant d'exercice, donc un Hack Squat fait à la
 * place du Back Squat n'influence pas la charge de squat de la semaine
 * suivante. Et si le même Hack Squat revient trois semaines plus tard, il
 * retrouve son propre historique.
 */
export interface SessionExerciseRow {
  id?: number;
  sessionId: number;
  week: number;
  day: DayIndex;
  date: string;
  /** `replace` = à la place d'un exercice prévu. `add` = en plus. */
  kind: 'replace' | 'add';
  /** L'exercice prévu qu'il remplace, ou `null` pour un ajout. */
  originalExerciseId: string | null;
  /**
   * Identifiant de l'exercice retenu : un id du catalogue, ou `libre:<slug>`
   * pour un nom tapé à la main. Préfixé pour qu'un nom libre ne puisse jamais
   * heurter un id du programme.
   */
  exerciseId: string;
  /** Nom affiché, figé : un nom libre reste lisible sans dictionnaire. */
  name: string;
  sets: number;
  reps: number;
  kg: number | null;
  restSec: number;
  /** ms epoch de l'enregistrement. */
  at: number;
}
