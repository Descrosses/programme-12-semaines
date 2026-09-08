/**
 * Types du programme.
 *
 * Règle absolue : ce dossier ne contient QUE des données transcrites depuis
 * `programme-final-12-semaines.md`. Aucune logique, aucun calcul, aucun React.
 * Tout ce qui décide se trouve dans `src/engine/`.
 */

// ---------------------------------------------------------------------------
// Vocabulaire
// ---------------------------------------------------------------------------

/** Fonction du mouvement (§1, utilisée pour les graphiques et les filtres). */
export type MovementFn =
  | 'squat'
  | 'hinge'
  | 'push'
  | 'pull'
  | 'jump'
  | 'core'
  | 'carry'
  | 'conditioning'
  | 'mobility'
  | 'test';

/** Blocs de périodisation (§2). */
export type Block = 'test' | 'accumulation' | 'deload' | 'maxforce' | 'power' | 'taper';

/** 0 = lundi, 1 = mercredi, 2 = vendredi, 3 = samedi, 4 = dimanche (§3). */
export type DayIndex = 0 | 1 | 2 | 3 | 4;

/** Semaine 0 = combine initial (§12), semaines 1 à 12 = le programme. */
export type WeekIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export const DAY_LABELS: Record<DayIndex, string> = {
  0: 'Lundi',
  1: 'Mercredi',
  2: 'Vendredi',
  3: 'Samedi',
  4: 'Dimanche',
};

export const DAY_LABELS_SHORT: Record<DayIndex, string> = {
  0: 'Lun',
  1: 'Mer',
  2: 'Ven',
  3: 'Sam',
  4: 'Dim',
};

/** Jour de la semaine ISO (1 = lundi … 7 = dimanche) pour chaque DayIndex. */
export const DAY_ISO: Record<DayIndex, number> = { 0: 1, 1: 3, 2: 5, 3: 6, 4: 7 };

// ---------------------------------------------------------------------------
// Répétitions et travail
// ---------------------------------------------------------------------------

/** `5`, `{min:1,max:2}` pour « 1-2 », `'max'` pour une série max. */
export type Reps = number | { min: number; max: number } | 'max';

/** Ce qu'on fait à l'intérieur d'une série. */
export type Work =
  /** `sideLabel` : le programme écrit « / jambe » pour le Bulgarian, « / côté » ailleurs. */
  | { kind: 'reps'; reps: Reps; perSide?: boolean; sideLabel?: 'côté' | 'jambe' }
  | { kind: 'distance'; meters: number; perSide?: boolean }
  | { kind: 'time'; seconds: number }
  | { kind: 'intervals'; rounds: number; workSec: number; easySec: number }
  /** Tests : « 3 essais », « 5 essais ». */
  | { kind: 'attempts'; attempts: number }
  /** « 1 série max ». */
  | { kind: 'maxSet' };

export const reps = (r: Reps, perSide = false, sideLabel: 'côté' | 'jambe' = 'côté'): Work => ({
  kind: 'reps',
  reps: r,
  perSide,
  sideLabel,
});
export const meters = (m: number, perSide = false): Work => ({
  kind: 'distance',
  meters: m,
  perSide,
});
export const attempts = (n: number): Work => ({ kind: 'attempts', attempts: n });
export const maxSet = (): Work => ({ kind: 'maxSet' });

// ---------------------------------------------------------------------------
// Charge
// ---------------------------------------------------------------------------

/**
 * `step` pilote TOUS les arrondis de l'application : orange (−5 %), rouge
 * (65 % du 1RM), deload (80 %) et progression (§11). 2,5 kg pour la barre,
 * 2 kg pour les haltères — décidé avec Guillaume.
 */
export type LoadStep = 2.5 | 2;

export type LoadSpec =
  /** Barre chargée. `kgMax` = plafond assumé (RDL S9-11 : 90-95 kg). */
  | { kind: 'barbell'; kg: number; kgMax?: number; step: 2.5 }
  /** Paire d'haltères, `kg` = poids d'UN haltère (« haltères 2 × 18 kg »). */
  | { kind: 'dbPair'; kg: number; step: 2 }
  /** Un seul haltère (Single-Leg RDL, Suitcase Carry). */
  | { kind: 'dbSingle'; kg: number; step: 2 }
  /** Lest ajouté au poids du corps (tractions lestées « +17,5 »). */
  | { kind: 'added'; kg: number; step: 2.5 }
  /** Pourcentage d'un 1RM testé (utilisé par l'ajustement ROUGE, §4). */
  | { kind: 'pct1RM'; pct: number; lift: MainLiftId; step: 2.5 }
  /**
   * Charge autorégulée : aucune valeur fixe au programme, elle sort de
   * l'historique réel (Bulgarian, Hip Thrust). `seed` = point de départ
   * s'il n'y a encore aucun historique.
   */
  | { kind: 'autoreg'; seed?: number; step: LoadStep; as: 'barbell' | 'dbPair' | 'dbSingle' }
  | { kind: 'bodyweight' }
  /** Charge non chiffrable, on affiche le texte du programme tel quel. */
  | { kind: 'text'; label: string }
  | { kind: 'none' };

export const bb = (kg: number, kgMax?: number): LoadSpec =>
  kgMax === undefined ? { kind: 'barbell', kg, step: 2.5 } : { kind: 'barbell', kg, kgMax, step: 2.5 };
export const dbPair = (kg: number): LoadSpec => ({ kind: 'dbPair', kg, step: 2 });
export const dbSingle = (kg: number): LoadSpec => ({ kind: 'dbSingle', kg, step: 2 });
export const added = (kg: number): LoadSpec => ({ kind: 'added', kg, step: 2.5 });
export const autoreg = (
  seed: number | undefined,
  step: LoadStep,
  as: 'barbell' | 'dbPair' | 'dbSingle',
): LoadSpec =>
  seed === undefined ? { kind: 'autoreg', step, as } : { kind: 'autoreg', seed, step, as };
export const bodyweight = (): LoadSpec => ({ kind: 'bodyweight' });
export const textLoad = (label: string): LoadSpec => ({ kind: 'text', label });
export const noLoad = (): LoadSpec => ({ kind: 'none' });

// ---------------------------------------------------------------------------
// RPE
// ---------------------------------------------------------------------------

/**
 * Cible de RPE sous forme d'intervalle, pour que « RPE 7 », « RPE 7-8 » et
 * « RPE ≤ 7 » se comparent de la même façon dans `applyProgression`.
 * En dessous de `min` → trop facile ; au-dessus de `max` → trop dur.
 */
export interface RPETarget {
  min: number;
  max: number;
  label: string;
}

export const rpe = (v: number): RPETarget => ({ min: v, max: v, label: `RPE ${fr(v)}` });
export const rpeRange = (a: number, b: number): RPETarget => ({
  min: a,
  max: b,
  label: `RPE ${fr(a)}-${fr(b)}`,
});
export const rpeAtMost = (v: number): RPETarget => ({ min: 0, max: v, label: `RPE ≤ ${fr(v)}` });

/** 7.5 → « 7,5 » (le programme est en français, la virgule est la norme). */
function fr(n: number): string {
  return String(n).replace('.', ',');
}

// ---------------------------------------------------------------------------
// Exercices
// ---------------------------------------------------------------------------

export type ExerciseRole =
  | 'main' // les lifts du tableau §9 : ce que le feu tricolore ajuste en priorité
  | 'accessory' // ce qu'ORANGE ampute d'une série (§4)
  | 'power' // règle §5 : on arrête dès que la performance baisse
  | 'core'
  | 'carry'
  | 'conditioning'
  | 'test';

/** Les 7 colonnes du tableau §9, plus le RDL dont les charges sont fixées ailleurs. */
export type MainLiftId =
  | 'back-squat'
  | 'bench-press'
  | 'deadlift'
  | 'weighted-pullup'
  | 'push-press'
  | 'front-squat'
  | 'speed-squat'
  | 'rdl';

/** Les 7 colonnes du tableau §9, dans l'ordre du tableau. */
export const TABLE_LIFTS = [
  'back-squat',
  'bench-press',
  'deadlift',
  'weighted-pullup',
  'push-press',
  'front-squat',
  'speed-squat',
] as const satisfies readonly MainLiftId[];

/**
 * Fiche d'identité d'un exercice. `id` est GELÉ : c'est la clé de l'historique
 * sur 12 semaines. Renommer `name` est sans conséquence, changer `id` efface
 * l'historique.
 */
export interface ExerciseDef {
  id: string;
  name: string;
  fn: MovementFn;
  role: ExerciseRole;
  /** Intention d'exécution, transcrite du .md. */
  intent: string;
  /** Critère de progression écrit dans le programme (§7). */
  progressionRule?: string;
  /** Repli quand le matériel Basic-Fit ne suit pas. */
  altBasicFit?: string;
  /** Consignes dépliables. */
  cues?: string[];
  /** Règle §5 : chaque rep est une tentative de performance, on arrête si ça ralentit. */
  explosive?: boolean;
  /** Unité mesurée lors d'un test ou d'un saut. */
  measure?: 'cm' | 'kg' | 'reps' | 'm' | 's';
  /** Présent si l'exercice est piloté par le tableau §9 (ou la ligne RDL). */
  liftId?: MainLiftId;
}

/** Un exercice tel qu'il apparaît réellement dans une séance donnée. */
export interface Exercise extends ExerciseDef {
  sets: number;
  work: Work;
  load: LoadSpec;
  targetRPE: RPETarget | null;
  restSec: number;
  /** S9-11 : id de l'exercice explosif intercalé entre les séries (§8). */
  contrastWith?: string;
  /** Précision affichée sous la ligne de charge. */
  note?: string;
  /** Paliers affichés pour un test 1RM (§12). */
  ramp?: RampStep[];
}

// ---------------------------------------------------------------------------
// Tableau §9
// ---------------------------------------------------------------------------

/**
 * Une case du tableau §9 pour une semaine.
 *
 * `targetRPE` est FIXE : même si la charge dérive semaine après semaine
 * (progression cumulative, décision de Guillaume), la cible de RPE de la
 * semaine reste celle du tableau.
 */
export interface WeekPrescription {
  sets: number;
  work: Work;
  /** `null` = semaine de test, ou charge non prescrite. */
  load: LoadSpec | null;
  targetRPE: RPETarget | null;
  /** Semaine de test 1RM (§8 semaine 12). */
  isTest?: boolean;
  /** S9-11 : « + contraste » dans le tableau. */
  contrast?: boolean;
  /**
   * Le tableau §9 prescrit cette charge mais la section 8 ne lui attribue
   * aucune séance (Bench 3×2×85 et Push Press 3×2×50 en semaine 12).
   * Signalé à Guillaume, en attente de sa décision.
   */
  unscheduled?: boolean;
  note?: string;
}

/** Index 0 = semaine 1 … index 11 = semaine 12. `null` = absent cette semaine. */
export type LiftSchedule = (WeekPrescription | null)[];
export type MainLiftTable = Record<MainLiftId, LiftSchedule>;

// ---------------------------------------------------------------------------
// Échauffements (§6)
// ---------------------------------------------------------------------------

export interface WarmupItem {
  id: string;
  label: string;
  detail?: string;
}

export interface Warmup {
  id: 'lower' | 'upper';
  durationLabel: string;
  items: WarmupItem[];
}

// ---------------------------------------------------------------------------
// Séances
// ---------------------------------------------------------------------------

export type Intensity = 'DUR' | 'RAPIDE' | 'MODÉRÉ' | 'LÉGER' | 'TEST' | 'REPOS';

/**
 * Trame d'une séance, telle qu'écrite en §7 (forme du bloc accumulation).
 * Les blocs 4/5-7/8/9-11/12 sont obtenus en appliquant les règles de
 * `blockRules.ts`, jamais en recopiant la séance douze fois.
 */
export interface SessionBlueprint {
  day: DayIndex;
  title: string;
  durationLabel: string;
  intensity: Intensity;
  warmup: 'lower' | 'upper' | null;
  /** Readiness test avant chaque séance jambes : lundi, vendredi, samedi (§4). */
  readinessTest: boolean;
  notes: string[];
  slots: Slot[];
}

/** Un palier de montée de charge d'un protocole de test (§12). */
export interface RampStep {
  kg: number;
  reps: number;
  /** Lest ajouté au poids du corps (tractions). */
  added?: boolean;
  /** Tentative de 1RM, par opposition à un palier d'échauffement. */
  attempt?: boolean;
  /** « si rapide », « selon vitesse » : à ne tenter que si le précédent est propre. */
  optional?: boolean;
}

/**
 * Un exercice dans une trame. Quand `liftId` est présent, `sets` / `work` /
 * `load` / `targetRPE` sont ignorés et lus dans le tableau §9.
 */
export interface Slot {
  exId: string;
  sets: number;
  work: Work;
  load: LoadSpec;
  targetRPE: RPETarget | null;
  restSec: number;
  liftId?: MainLiftId;
  note?: string;
  /** Paliers affichés pour un test 1RM (§12). */
  ramp?: RampStep[];
}

/** Une séance entièrement résolue pour une semaine donnée (sortie de l'engine). */
export interface Session {
  week: WeekIndex;
  day: DayIndex;
  block: Block;
  title: string;
  durationLabel: string;
  intensity: Intensity;
  warmup: Warmup | null;
  readinessTest: boolean;
  notes: string[];
  exercises: Exercise[];
}
