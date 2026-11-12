/**
 * Types du programme 8 semaines.
 *
 * Règle absolue, reprise du projet 12 semaines : ce dossier ne contient QUE
 * des données transcrites depuis `programme-8-semaines-conjointe.md`. Aucune
 * logique, aucun calcul, aucun React. Tout ce qui décide est dans
 * `src/engine/`.
 *
 * Différence majeure avec le programme 12 semaines : ici une séance est un
 * CIRCUIT (« 3 tours, repos 45 s »), pas une liste de séries indépendantes, et
 * chaque séance existe en DEUX versions équivalentes — maison et Basic-Fit.
 */

// ---------------------------------------------------------------------------
// Vocabulaire
// ---------------------------------------------------------------------------

/**
 * Les deux versions de chaque séance (§2). Elle choisit au moment de
 * s'entraîner ; les deux comptent comme la même séance dans le suivi.
 */
export type Version = 'maison' | 'salle';

export const VERSIONS: readonly Version[] = ['maison', 'salle'] as const;

export const VERSION_LABELS: Record<Version, string> = {
  maison: 'Maison',
  salle: 'Basic-Fit',
};

export const VERSION_ICONS: Record<Version, string> = {
  maison: '🏠',
  salle: '🏋️',
};

/** Les 3 phases progressives (§2). */
export type PhaseId = 1 | 2 | 3;

/** Semaines 1 à 8. Pas de semaine 0 : ce programme ne teste rien au départ. */
export type WeekIndex = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export const WEEKS: readonly WeekIndex[] = [1, 2, 3, 4, 5, 6, 7, 8] as const;

/**
 * 0 = lundi, 1 = mercredi, 2 = vendredi, 3 = samedi.
 *
 * Le .md fixe le NOMBRE de séances par semaine (3 en phase 1, 4 ensuite) mais
 * pas les jours. Ce découpage laisse au moins un jour de récupération entre
 * deux séances, ce qui est le minimum à 5 mois post-partum. Les séances
 * restent ouvrables et validables n'importe quel jour : le calendrier propose,
 * il n'impose pas.
 */
export type DayIndex = 0 | 1 | 2 | 3;

export const DAY_LABELS: Record<DayIndex, string> = {
  0: 'Lundi',
  1: 'Mercredi',
  2: 'Vendredi',
  3: 'Samedi',
};

export const DAY_LABELS_SHORT: Record<DayIndex, string> = {
  0: 'Lun',
  1: 'Mer',
  2: 'Ven',
  3: 'Sam',
};

/** Décalage en jours depuis le lundi de la semaine. */
export const DAY_OFFSET: Record<DayIndex, number> = { 0: 0, 1: 2, 2: 4, 3: 5 };

/** Fonction du mouvement — sert aux filtres et aux couleurs, à rien d'autre. */
export type MovementFn =
  | 'breath'
  | 'squat'
  | 'hinge'
  | 'lunge'
  | 'push'
  | 'pull'
  | 'glute'
  | 'core'
  | 'cardio';

// ---------------------------------------------------------------------------
// Travail
// ---------------------------------------------------------------------------

/** `12`, ou `{min:20,max:30}` quand le programme écrit « 20-30 s ». */
export interface Range {
  min: number;
  max: number;
}

export type Amount = number | Range;

export type SideLabel = 'côté' | 'jambe' | 'bras';

export type Work =
  | { kind: 'reps'; reps: Amount; perSide?: boolean; sideLabel?: SideLabel }
  /** Gainage : « planche genoux 20-30 s ». */
  | { kind: 'time'; seconds: Amount }
  /** Cardio optionnel : « 15-20 min ». */
  | { kind: 'minutes'; minutes: Amount };

export const reps = (r: Amount, perSide = false, sideLabel: SideLabel = 'côté'): Work =>
  perSide ? { kind: 'reps', reps: r, perSide, sideLabel } : { kind: 'reps', reps: r };
export const secondsWork = (s: Amount): Work => ({ kind: 'time', seconds: s });
export const minutesWork = (m: Amount): Work => ({ kind: 'minutes', minutes: m });

// ---------------------------------------------------------------------------
// Charge
// ---------------------------------------------------------------------------

/** Comment la charge se lit : un engin, une paire, ou une pile de machine. */
export type LoadShape = 'single' | 'pair' | 'machine';

/**
 * Le matériel maison est FIXE (kettlebell 8 kg, haltères 2 kg) : la charge n'y
 * progresse pas, c'est le volume et le tempo qui montent. En salle au
 * contraire tout est réglable, donc la charge se règle à l'usage et se retient
 * d'une séance à l'autre. D'où deux formes seulement.
 */
export type LoadSpec =
  | { kind: 'bodyweight' }
  /** Matériel imposé : `label` est ce qui s'affiche (« kettlebell 8 kg »). */
  | { kind: 'fixed'; kg: number; label: string }
  /**
   * Charge autorégulée : aucune valeur au programme, elle sort de l'historique
   * réel. `seed` = point de départ raisonnable tant qu'il n'y a rien.
   */
  | { kind: 'adjustable'; seed: number | null; step: number; shape: LoadShape }
  /** Charge non chiffrable (« charge légère ») : on affiche le texte du .md. */
  | { kind: 'text'; label: string }
  | { kind: 'none' };

export const bodyweight = (): LoadSpec => ({ kind: 'bodyweight' });
export const fixedLoad = (kg: number, label: string): LoadSpec => ({ kind: 'fixed', kg, label });
export const adjustable = (seed: number | null, step: number, shape: LoadShape): LoadSpec => ({
  kind: 'adjustable',
  seed,
  step,
  shape,
});
export const textLoad = (label: string): LoadSpec => ({ kind: 'text', label });
export const noLoad = (): LoadSpec => ({ kind: 'none' });

// ---------------------------------------------------------------------------
// Sécurité (§1)
// ---------------------------------------------------------------------------

/**
 * Les trois vérifications non négociables avant la séance 1.
 *
 * Ce ne sont pas des cases décoratives : deux d'entre elles retirent
 * réellement des exercices du circuit tant qu'elles ne sont pas levées.
 */
/*
 * ── Les deux questions de sécurité, et pourquoi elles ne sont plus trois ───
 *
 * La base d'origine posait trois questions DATÉES, propres au post-partum :
 * feu vert de la visite post-natale, diastasis des grands droits, fin de la
 * rééducation périnéale. Elles n'ont aucun sens pour une pratiquante qui n'a
 * jamais accouché, et le programme MAJK s'adresse à toutes.
 *
 * Elles n'étaient pourtant pas décoratives : ce sont elles qui déclenchent
 * les SUBSTITUTIONS d'exercices. Les supprimer sans rien mettre à la place
 * aurait laissé un programme dont les garde-fous ont disparu mais pas les
 * exercices qu'ils protégeaient.
 *
 * Elles sont donc remplacées par deux questions NON DATÉES, qui décrivent un
 * symptôme au lieu d'un événement de vie. Même mécanique de substitution,
 * sans supposer de grossesse.
 */
export type SafetyKey =
  /** Aucune gêne ni fuite urinaire à l'effort. */
  | 'plancherPelvienOk'
  /** Aucune douleur qui empêche un mouvement. */
  | 'sansDouleurLimitante';

/** Pourquoi un exercice peut être écarté, et par quoi on le remplace. */
export type Restriction =
  /** Flexion du tronc / planche classique — écarté tant que diastasis (§1). */
  | 'flexionTronc'
  /** Saut ou gainage dynamique intense — écarté tant que périnée en cours (§1). */
  | 'impact'
  /** Charge au-dessus de la tête — écarté tant que périnée en cours (§1). */
  | 'overhead';

/** Quelle réponse de sécurité lève quelle restriction. */
export const RESTRICTION_GATE: Record<Restriction, SafetyKey> = {
  /*
   * La flexion du tronc dépend désormais de la DOULEUR déclarée, et l'impact
   * comme le travail bras au-dessus de la tête du plancher pelvien. Les trois
   * restrictions et leurs replis sont inchangés : seule la question qui les
   * lève a changé de formulation.
   */
  flexionTronc: 'sansDouleurLimitante',
  impact: 'plancherPelvienOk',
  overhead: 'plancherPelvienOk',
};

export const RESTRICTION_REASON: Record<Restriction, string> = {
  flexionTronc: 'douleur signalée — pas de flexion du tronc',
  impact: 'gêne ou fuite à l’effort — pas d’impact',
  overhead: 'gêne ou fuite à l’effort — pas de charge au-dessus de la tête',
};

// ---------------------------------------------------------------------------
// Exercices
// ---------------------------------------------------------------------------

/**
 * Fiche d'identité d'un exercice. `id` est GELÉ : c'est la clé de l'historique
 * sur 8 semaines. Renommer `name` est sans conséquence, changer `id` efface
 * l'historique.
 */
export interface ExerciseDef {
  id: string;
  name: string;
  fn: MovementFn;
  /** Dans quelle version il apparaît. */
  version: Version;
  /** Intention d'exécution, en une phrase. */
  intent: string;
  cues?: string[];
  /** Contre-indications qui s'appliquent à CET exercice (§1). */
  restrictions?: Restriction[];
  /**
   * Exercice de repli quand une contre-indication s'applique. Toujours un
   * exercice déjà présent au programme : l'appli n'invente aucun mouvement.
   */
  fallbackId?: string;
  /** Variante admise par le .md (« squat sauté ou squat tempo »). */
  variant?: string;
}

/**
 * Une ligne du circuit, dans les deux versions à la fois. C'est ce qui garantit
 * que « les deux versions comptent comme la même séance » (§2) : une ligne,
 * deux exercices, une seule cible de répétitions.
 */
export interface CircuitSlot {
  /** Identifie la ligne dans le circuit, indépendamment de la version. */
  slotId: string;
  maison: string;
  salle: string;
  work: Work;
  /** Charge par version : le matériel n'est pas le même. */
  load: Record<Version, LoadSpec>;
  note?: string;
}

/** Une ligne résolue pour une version et une semaine données (sortie engine). */
export interface ResolvedSlot {
  slotId: string;
  exercise: ExerciseDef;
  work: Work;
  load: LoadSpec;
  /** Charge chiffrée retenue pour aujourd'hui, `null` si non chiffrable. */
  kg: number | null;
  note?: string;
  /** Renseigné quand une contre-indication a fait basculer sur le repli. */
  substitutedFor?: { exercise: ExerciseDef; reason: Restriction };
}

// ---------------------------------------------------------------------------
// Intro respiratoire (§2)
// ---------------------------------------------------------------------------

export interface IntroItem {
  id: string;
  label: string;
  detail: string;
}

// ---------------------------------------------------------------------------
// Phases et séances
// ---------------------------------------------------------------------------

/**
 * Une phase telle qu'écrite en §2. Les valeurs en intervalle (« 3-4 tours »,
 * « repos 45-60 s ») restent des intervalles ICI ; c'est `engine/progression`
 * qui décide de la valeur d'une semaine donnée.
 */
export interface Phase {
  id: PhaseId;
  name: string;
  weeks: WeekIndex[];
  objective: string;
  sessionsPerWeek: number;
  durationLabel: string;
  tours: Amount;
  restSec: Amount;
  /*
   * Plus de champ `intro`.
   *
   * La base d'origine réservait son intro respiratoire à la phase 1 : c'était
   * une remise en route post-partum, pas un échauffement. L'ÉCHAUFFEMENT qui
   * l'a remplacée vaut pour les trois phases — on ne commence pas une séance
   * à froid en semaine 8 sous prétexte qu'on est entraînée. Un booléen
   * toujours vrai n'aurait servi qu'à laisser croire le contraire.
   */
  circuit: CircuitSlot[];
  notes: string[];
}

/** Une séance entièrement résolue (sortie de l'engine). */
export interface Session {
  week: WeekIndex;
  day: DayIndex;
  version: Version;
  phase: PhaseId;
  phaseName: string;
  title: string;
  durationLabel: string;
  /** Nombre de tours de cette semaine. */
  tours: number;
  /** Repos entre deux tours, en secondes. */
  restSec: number;
  intro: IntroItem[];
  slots: ResolvedSlot[];
  notes: string[];
}
