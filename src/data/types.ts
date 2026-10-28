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
  | 'test'
  /**
   * Un mouvement que le PROGRAMME ne connaît pas : un exercice choisi en
   * séance, remplacement ou ajout, éventuellement tapé à la main.
   *
   * Aucun exercice du .md ne porte cette valeur, et un test le vérifie. Elle
   * existe pour ne pas avoir à ranger un mouvement inconnu dans une catégorie
   * qui déciderait des choses à sa place : `squat`, `hinge`, `jump` et `carry`
   * valent « bas du corps » pour les incréments de §11, et classer de travers
   * un exercice qu'on vient de taper reviendrait à lui appliquer une règle
   * qu'on n'a pas les moyens de justifier.
   */
  | 'libre';

/** Blocs de périodisation (§2). */
export type Block = 'test' | 'accumulation' | 'deload' | 'maxforce' | 'power' | 'taper';

/**
 * Jour de la semaine, 0 = lundi … 6 = dimanche.
 *
 * Les sept jours réels, et non les cinq jours d'entraînement du §3. La semaine
 * type n'en occupe que cinq (lundi, mercredi, vendredi, samedi, dimanche) mais
 * le combine initial, lui, s'étale sur mardi et jeudi : sans ces deux jours
 * dans le type, il n'y avait aucun moyen de placer un test un mardi.
 *
 * Quels jours porte réellement une semaine se lit dans `WEEK_DAYS`, jamais
 * dans ce type.
 */
export type DayIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** Semaine 0 = combine initial (§12), semaines 1 à 12 = le programme. */
export type WeekIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export const DAY_LABELS: Record<DayIndex, string> = {
  0: 'Lundi',
  1: 'Mardi',
  2: 'Mercredi',
  3: 'Jeudi',
  4: 'Vendredi',
  5: 'Samedi',
  6: 'Dimanche',
};

export const DAY_LABELS_SHORT: Record<DayIndex, string> = {
  0: 'Lun',
  1: 'Mar',
  2: 'Mer',
  3: 'Jeu',
  4: 'Ven',
  5: 'Sam',
  6: 'Dim',
};

/** Jour de la semaine ISO (1 = lundi … 7 = dimanche) pour chaque DayIndex. */
export const DAY_ISO: Record<DayIndex, number> = { 0: 1, 1: 2, 2: 3, 3: 4, 4: 5, 5: 6, 6: 7 };

/** §3 — les cinq jours d'entraînement d'une semaine type. */
export const TRAINING_DAYS = [0, 2, 4, 5, 6] as const satisfies readonly DayIndex[];

/**
 * Correspondance des anciens index (5 jours) vers les nouveaux (7 jours).
 *
 * Utilisée une seule fois, par la migration v5 de la base. Elle est ici et non
 * dans `db.ts` pour rester à côté de la définition qu'elle traduit.
 */
export const LEGACY_DAY_MAP: Record<number, DayIndex> = { 0: 0, 1: 2, 2: 4, 3: 5, 4: 6 };

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
  /** `perSide` : une tenue se compte par côté, un conditioning non. */
  | { kind: 'time'; seconds: number; perSide?: boolean }
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
/** Une tenue isométrique : « 3 × 25 s / côté ». */
export const hold = (seconds: number, perSide = false): Work => ({
  kind: 'time',
  seconds,
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
/**
 * Pas du stepper de charge. 1 kg pour les poulies : leurs plaques montent de
 * 1 à 2,5 kg selon la machine, et un pas de 2,5 empêcherait de saisir la
 * charge réelle.
 */
export type LoadStep = 2.5 | 2 | 1;

export type LoadSpec =
  /** Barre chargée. `kgMax` = plafond assumé (RDL S9-11 : 90-95 kg). */
  | { kind: 'barbell'; kg: number; kgMax?: number; step: 2.5 }
  /** Paire d'haltères, `kg` = poids d'UN haltère (« haltères 2 × 18 kg »). */
  | { kind: 'dbPair'; kg: number; step: 2 }
  /** Un seul haltère (Single-Leg RDL, Suitcase Carry). */
  | { kind: 'dbSingle'; kg: number; step: 2 }
  /** Lest ajouté au poids du corps (tractions lestées « +17,5 »). */
  | { kind: 'added'; kg: number; step: 2.5 }
  /**
   * Pourcentage d'un 1RM testé.
   *
   * C'est la forme NORMALE des charges du §9 : le tableau donne une intensité,
   * pas un kilo, et le kilo se calcule sur le maximum de celui qui s'entraîne.
   * Sert aussi à l'ajustement ROUGE (§4 — 65 % du 1RM).
   *
   * `kgOrigine` est le kilo que le tableau §9 portait quand il était écrit en
   * valeurs absolues, sur les maxima de son auteur. Il ne sert qu'aux
   * installations qui tournaient déjà sur ce tableau-là (`tableauOrigine`),
   * pour que mettre l'application à jour ne change pas leur plan en cours. Une
   * installation neuve ne le lit jamais.
   */
  | { kind: 'pct1RM'; pct: number; lift: MainLiftId; step: 2.5; kgOrigine?: number }
  /**
   * Charge autorégulée : aucune valeur fixe au programme, elle sort de
   * l'historique réel (Bulgarian, Hip Thrust). `seed` = point de départ
   * s'il n'y a encore aucun historique.
   */
  | {
      kind: 'autoreg';
      seed?: number;
      step: LoadStep;
      as: 'barbell' | 'dbPair' | 'dbSingle' | 'cable';
    }
  | { kind: 'bodyweight' }
  /** Charge non chiffrable, on affiche le texte du programme tel quel. */
  | { kind: 'text'; label: string }
  | { kind: 'none' };

export const bb = (kg: number, kgMax?: number): LoadSpec =>
  kgMax === undefined
    ? { kind: 'barbell', kg, step: 2.5 }
    : { kind: 'barbell', kg, kgMax, step: 2.5 };
export const dbPair = (kg: number): LoadSpec => ({ kind: 'dbPair', kg, step: 2 });
export const dbSingle = (kg: number): LoadSpec => ({ kind: 'dbSingle', kg, step: 2 });
export const added = (kg: number): LoadSpec => ({ kind: 'added', kg, step: 2.5 });
/**
 * Une case du §9 : une intensité, et le kilo que le tableau d'origine portait.
 *
 * `pct` est en POURCENT (82), pas en fraction (0,82) : c'est ce que le
 * programme écrit, et une case doit se relire telle qu'elle est au §9.
 */
export const pct = (pct: number, lift: MainLiftId, kgOrigine?: number): LoadSpec =>
  kgOrigine === undefined
    ? { kind: 'pct1RM', pct, lift, step: 2.5 }
    : { kind: 'pct1RM', pct, lift, step: 2.5, kgOrigine };
export const autoreg = (
  seed: number | undefined,
  step: LoadStep,
  as: 'barbell' | 'dbPair' | 'dbSingle' | 'cable',
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
  /**
   * Intention d'exécution, transcrite du .md — absente quand le .md n'écrit
   * rien sur ce mouvement. Deux exercices sont dans ce cas (Incline Dumbbell
   * Press, One-Arm Cable Row) : le programme n'y donne que les séries, la
   * charge et le repos. Leur inventer une consigne serait parler à la place du
   * programme.
   */
  intent?: string;
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
  /**
   * Exercice retiré des séances SANS être retiré du catalogue.
   *
   * Supprimer la fiche effacerait l'historique — `id` est la clé de douze
   * semaines de séries enregistrées. L'exercice reste donc là, visible, avec
   * la raison de sa mise à l'écart ; il n'est simplement plus prescrit.
   *
   * Aucune date de reprise : une suspension pour douleur se lève sur des
   * symptômes et un avis professionnel, pas sur un numéro de semaine.
   */
  suspended?: { reason: string };
  /**
   * Suivi de douleur attaché à cet exercice (§14).
   *
   * Le texte dit QUOI surveiller. Il ne dit jamais ce qu'est la douleur : ce
   * n'est pas un diagnostic, et l'application n'en pose aucun.
   */
  painWatch?: string;
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
  /**
   * Cette semaine de deload est une PROPORTION de ce qui a été réellement
   * soulevé la dernière semaine non-deload, et non le kilo écrit ici.
   *
   * À ne poser que là où le programme le dit lui-même. Le RDL l'écrit :
   * « S4 / S8 : 80 % de la dernière semaine non-deload ». Les kilos du tableau
   * sont alors 80 % d'un PRÉVISIONNEL, et ils ne descendent de rien dès que le
   * réel s'en écarte.
   *
   * Les autres deloads du programme ne suivent PAS cette règle, et c'est
   * pourquoi ce champ est explicite plutôt que global :
   *   — les lifts principaux descendent à 65-70 % du 1RM TESTÉ (§8), qui est
   *     déjà une valeur réelle ;
   *   — le Speed Squat garde sa charge et divise son volume (« intention
   *     conservée ») : lui appliquer 80 % contredirait sa consigne ;
   *   — les accessoires passent par `DELOAD_POLICY`, qui applique déjà 80 %
   *     à leur dernière charge réelle.
   */
  deloadFromRealFactor?: number;
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
  /**
   * Deux mouvements menés ENSEMBLE, dans un seul encadré.
   *
   * Même identifiant sur deux créneaux CONSÉCUTIFS de la séance. L'écran les
   * réunit alors : un tour = une série de chaque, dans l'ordre où ils se font.
   *
   * Ce champ ne dit pas le RYTHME, et c'est voulu : les repos écrits sur les
   * deux créneaux le disent déjà. `restSec: 0` sur le premier veut dire
   * « enchaîné sans repos » ; un repos non nul des deux côtés veut dire
   * « en alternance, ce repos entre chaque station ». Un champ de plus pour
   * redire ce que les repos disent déjà aurait fait deux vérités, et un jour
   * elles se seraient contredites.
   */
  superset?: string;
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
