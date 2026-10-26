/**
 * Accès à la base. Aucune logique de programme ici : seulement lire, écrire,
 * et transformer les lignes en structures que l'engine sait consommer.
 */

import type { DayIndex, RPETarget } from '../data/types';
import type { HistoryIndex, Occurrence, ReadinessRecord, Settings } from '../engine/types';
import type { FoodOverride, FoodOverrides } from '../engine/nutrition';
import { normalizeNote } from '../engine/exerciseNotes';
import type { WeekIndex } from '../data/types';
import { dateFor } from '../engine/calendar';
import { lowerIsBetter } from '../engine/lastPerformance';
import { isUnitId, unitOf } from '../engine/measureUnit';
import {
  DEFAULT_SETTINGS_ROW,
  db,
  type CombinePhase,
  type CombineRow,
  type ExerciseMediaRow,
  type CustomFoodRow,
  type DayKindRow,
  type MealLogRow,
  type ExerciseNoteRow,
  type ExerciseReferenceRow,
  type ExerciseVideoLogRow,
  type ExtraFoodRow,
  type NoteDraftRow,
  type NoteRow,
  type SessionExerciseRow,
  SESSION_NOTE_SLOT,
  type FoodOverrideRow,
  type MeasurementRow,
  type PainLogRow,
  type ProgressPhotoRow,
  type ReadinessRow,
  type SessionRow,
  type SetRow,
  type SettingsRow,
} from './db';

// --------------------------------------------------------------- réglages --

export async function getSettingsRow(): Promise<SettingsRow> {
  // Fusion avec les valeurs par défaut : une base créée par une version
  // antérieure ne connaît pas les champs ajoutés depuis (poids de corps…).
  return { ...DEFAULT_SETTINGS_ROW, ...(await db.settings.get(1)) };
}

export async function saveSettings(patch: Partial<SettingsRow>): Promise<SettingsRow> {
  const current = await getSettingsRow();
  const next = { ...current, ...patch, id: 1 as const };
  await db.settings.put(next);
  if (next.startDate !== current.startDate && next.startDate !== '') {
    await realignScheduleDates(next.startDate);
  }
  return next;
}

/**
 * Recale sur la nouvelle ancre les dates qui DÉCOULENT du calendrier.
 *
 * Décaler la date de début ne change aucune performance : une série est rangée
 * sous `[semaine, jour]`, jamais sous sa date. Mais les lignes déjà écrites
 * portent une copie de leur date, calculée avec l'ancienne ancre. Sans ce
 * passage, l'écran Semaine afficherait la bonne date (il la recalcule) pendant
 * que l'historique en garderait une périmée — deux vérités pour la même séance.
 *
 * Ce qui est recalé : les séances, leurs séries, et les tests de détente, parce
 * que leur date n'est qu'une conséquence de la case du calendrier.
 *
 * Ce qui ne l'est JAMAIS : les pesées, les photos, les vidéos notées et les
 * résultats du combine. Ces dates-là sont des faits — le jour où Guillaume
 * s'est pesé, le jour où il a pris la photo. Les décaler falsifierait
 * l'historique au lieu de le corriger.
 */
export async function realignScheduleDates(startDate: string): Promise<number> {
  let recalees = 0;

  for (const row of await db.sessions.toArray()) {
    const attendue = dateFor(startDate, row.week as WeekIndex, row.day);
    if (row.date === attendue || row.id === undefined) continue;
    await db.sessions.update(row.id, { date: attendue });
    await db.sets.where('sessionId').equals(row.id).modify({ date: attendue });
    recalees += 1;
  }

  for (const row of await db.readiness.toArray()) {
    const attendue = dateFor(startDate, row.week as WeekIndex, row.day);
    if (row.date === attendue || row.id === undefined) continue;
    await db.readiness.update(row.id, { date: attendue });
    recalees += 1;
  }

  return recalees;
}

export function toEngineSettings(row: SettingsRow): Settings {
  return {
    startDate: row.startDate,
    broadJumpBaselineCm: row.broadJumpBaselineCm,
    oneRM: row.oneRM as Settings['oneRM'],
  };
}

// ---------------------------------------------------------------- séances --

/**
 * Crée la ligne de séance si elle n'existe pas encore.
 *
 * `date` est toujours recalculée depuis l'ancre des Réglages. Si Guillaume
 * corrige sa date de début, les lignes déjà créées portaient l'ancienne date :
 * on les réaligne ici, sinon l'écran Semaine et l'historique resteraient sur un
 * calendrier périmé jusqu'à une remise à zéro.
 */
export async function ensureSession(
  week: number,
  day: DayIndex,
  date: string,
): Promise<SessionRow> {
  /*
   * DANS UNE TRANSACTION — et c'était un vrai défaut, vu dans le navigateur.
   *
   * `sessions` porte un index UNIQUE sur `[week+day]`. Deux appels concurrents
   * — et il y en a : l'écran recharge après chaque série validée, et React
   * monte ses effets deux fois en développement — voyaient tous les deux
   * « aucune séance », et inséraient tous les deux. Le second partait en
   * `ConstraintError`, donc SANS ligne de séance : l'écran n'avait plus de
   * `row`, et plus aucune série ne pouvait s'enregistrer.
   *
   * IndexedDB sérialise les transactions `readwrite` de portée commune : la
   * seconde lit ce que la première a écrit, et trouve la séance.
   */
  return db.transaction('rw', db.sessions, db.sets, async () => {
    const existing = await db.sessions.where('[week+day]').equals([week, day]).first();
    if (existing) {
      const patch: Partial<SessionRow> = {};
      if (existing.date !== date) patch.date = date;
      /*
       * Démarrage du chrono — à la PREMIÈRE ouverture, et jamais ensuite.
       *
       * Les lignes créées avant le chrono n'ont pas d'heure de début. On la
       * pose ici, mais seulement sur une séance encore à faire : poser
       * « commencée maintenant » sur une séance déjà terminée en semaine 3
       * inventerait une durée de plusieurs semaines. Une séance passée reste
       * donc sans chrono, ce qui est la vérité — on ne l'a pas mesurée.
       */
      if (existing.startedAt === undefined && existing.status !== 'done') {
        patch.startedAt = Date.now();
      }
      if (Object.keys(patch).length > 0 && existing.id !== undefined) {
        await db.sessions.update(existing.id, patch);
        if (patch.date !== undefined) {
          await db.sets.where('sessionId').equals(existing.id).modify({ date });
        }
        return { ...existing, ...patch };
      }
      return existing;
    }
    const row: SessionRow = {
      week,
      day,
      date,
      status: 'planned',
      warmupChecked: [],
      notes: '',
      startedAt: Date.now(),
    };
    const id = await db.sessions.add(row);
    return { ...row, id };
  });
}

export async function getSession(week: number, day: DayIndex): Promise<SessionRow | undefined> {
  return db.sessions.where('[week+day]').equals([week, day]).first();
}

export async function allSessions(): Promise<SessionRow[]> {
  return db.sessions.toArray();
}

export async function updateSession(id: number, patch: Partial<SessionRow>): Promise<void> {
  await db.sessions.update(id, patch);
}

/**
 * Remet le chrono à zéro : la séance recommence maintenant.
 *
 * Le seul moyen de réécrire `startedAt`, et il passe par une confirmation à
 * l'écran. Sans ce bouton, une séance ouverte la veille par curiosité affichait
 * « 14 h » le lendemain, et le chiffre était indéboulonnable.
 *
 * La fin repart elle aussi : une séance dont on relance le chrono n'est plus
 * terminée, sinon la durée affichée serait l'écart entre un début d'aujourd'hui
 * et une fin d'hier — négatif.
 */
export async function resetSessionClock(id: number): Promise<void> {
  await db.sessions.update(id, {
    startedAt: Date.now(),
    finishedAt: undefined,
  });
}

export async function toggleWarmupItem(sessionId: number, itemId: string): Promise<string[]> {
  const row = await db.sessions.get(sessionId);
  if (!row) return [];
  const checked = row.warmupChecked.includes(itemId)
    ? row.warmupChecked.filter((i) => i !== itemId)
    : [...row.warmupChecked, itemId];
  await db.sessions.update(sessionId, { warmupChecked: checked });
  return checked;
}

// ----------------------------------------------------------------- séries --

export interface SetInput {
  sessionId: number;
  exerciseId: string;
  week: number;
  day: DayIndex;
  date: string;
  setIndex: number;
  plannedKg: number | null;
  plannedReps: number | null;
  targetRPE: RPETarget | null;
  actualKg: number | null;
  actualReps: number | null;
  actualRpe: number | null;
  measureValue?: number | null;
  /** « m » ou « pas ». Voyage avec la série, jamais converti. */
  measureUnit?: string | null;
  failed: boolean;
}

/**
 * Écrit une série. Appelée au moment exact où Guillaume valide : rien n'est
 * gardé en mémoire en attendant la fin de la séance.
 */
export async function saveSet(input: SetInput): Promise<number> {
  const row: SetRow = {
    sessionId: input.sessionId,
    exerciseId: input.exerciseId,
    week: input.week,
    day: input.day,
    date: input.date,
    setIndex: input.setIndex,
    plannedKg: input.plannedKg,
    plannedReps: input.plannedReps,
    targetRpeMin: input.targetRPE?.min ?? null,
    targetRpeMax: input.targetRPE?.max ?? null,
    targetRpeLabel: input.targetRPE?.label ?? null,
    actualKg: input.actualKg,
    actualReps: input.actualReps,
    actualRpe: input.actualRpe,
    measureValue: input.measureValue ?? null,
    measureUnit: input.measureUnit ?? null,
    failed: input.failed,
    doneAt: Date.now(),
  };

  const existing = await db.sets
    .where('[sessionId+exerciseId]')
    .equals([input.sessionId, input.exerciseId])
    .and((s) => s.setIndex === input.setIndex)
    .first();

  if (existing?.id !== undefined) {
    await db.sets.update(existing.id, row);
    return existing.id;
  }
  return db.sets.add(row);
}

export async function deleteSet(id: number): Promise<void> {
  await db.sets.delete(id);
}

export async function setsForSession(sessionId: number): Promise<SetRow[]> {
  return db.sets.where('sessionId').equals(sessionId).sortBy('setIndex');
}

export async function allSets(): Promise<SetRow[]> {
  return db.sets.toArray();
}

// -------------------------------------------------------------- readiness --

export async function saveReadiness(row: ReadinessRow): Promise<void> {
  const existing = await db.readiness.where('[week+day]').equals([row.week, row.day]).first();
  // `put` plutôt que `update` : on remplace la ligne entière, y compris le
  // tableau des 3 essais.
  await db.readiness.put(existing?.id === undefined ? row : { ...row, id: existing.id });
}

export async function getReadiness(week: number, day: DayIndex): Promise<ReadinessRow | undefined> {
  return db.readiness.where('[week+day]').equals([week, day]).first();
}

export async function allReadiness(): Promise<ReadinessRow[]> {
  return db.readiness.orderBy('date').toArray();
}

export function toReadinessRecords(rows: ReadinessRow[]): ReadinessRecord[] {
  return rows.map((r) => ({
    date: r.date,
    week: r.week,
    day: r.day,
    jumpCm: r.jumpCm,
  }));
}

// --------------------------------------------------------------- combines --

export async function saveCombine(
  phase: CombinePhase,
  patch: Partial<Omit<CombineRow, 'id' | 'phase'>>,
): Promise<CombineRow> {
  const existing = await db.combines.where('phase').equals(phase).first();
  const next: CombineRow = {
    phase,
    date: patch.date ?? existing?.date ?? new Date().toISOString().slice(0, 10),
    metrics: { ...(existing?.metrics ?? {}), ...(patch.metrics ?? {}) },
    notes: patch.notes ?? existing?.notes ?? '',
  };
  if (existing?.id !== undefined) {
    await db.combines.put({ ...next, id: existing.id });
    return { ...next, id: existing.id };
  }
  const id = await db.combines.add(next);
  return { ...next, id };
}

export async function allCombines(): Promise<CombineRow[]> {
  return db.combines.toArray();
}

// ----------------------------------------------------------- mesures corps --

/**
 * Écrit la pesée (et/ou le tour de taille) d'un jour.
 *
 * Une seule ligne par date : se repeser deux fois le même matin corrige la
 * valeur, ça n'ajoute pas un second point qui pèserait double dans la moyenne.
 * Les champs laissés à `undefined` ne sont pas écrasés — on peut saisir le
 * tour de taille sans retaper le poids.
 */
export async function saveMeasurement(
  date: string,
  patch: { weightKg?: number | null; waistCm?: number | null },
): Promise<MeasurementRow> {
  // Transaction pour la même raison qu'au-dessus : `&date` est unique, et
  // deux appuis rapprochés sur le stepper de poids se croiseraient.
  return db.transaction('rw', db.measurements, async () => {
    const existing = await db.measurements.where('date').equals(date).first();
    const next: MeasurementRow = {
      date,
      weightKg: patch.weightKg !== undefined ? patch.weightKg : (existing?.weightKg ?? null),
      waistCm: patch.waistCm !== undefined ? patch.waistCm : (existing?.waistCm ?? null),
    };

    // Une ligne entièrement vide n'a rien à faire en base : elle diluerait les
    // moyennes en se faisant passer pour un jour relevé.
    if (next.weightKg === null && next.waistCm === null) {
      if (existing?.id !== undefined) await db.measurements.delete(existing.id);
      return next;
    }

    if (existing?.id !== undefined) {
      await db.measurements.put({ ...next, id: existing.id });
      return { ...next, id: existing.id };
    }
    const id = await db.measurements.add(next);
    return { ...next, id };
  });
}

export async function getMeasurement(date: string): Promise<MeasurementRow | undefined> {
  return db.measurements.where('date').equals(date).first();
}

export async function allMeasurements(): Promise<MeasurementRow[]> {
  return db.measurements.orderBy('date').toArray();
}

// ----------------------------------------------------------- suivi visuel --

/** Enregistre la photo de la semaine. Une seule par semaine : la reprise remplace. */
export async function savePhoto(row: Omit<ProgressPhotoRow, 'id'>): Promise<ProgressPhotoRow> {
  const existing = await db.progressPhotos.where('week').equals(row.week).first();
  if (existing?.id !== undefined) {
    await db.progressPhotos.put({ ...row, id: existing.id });
    return { ...row, id: existing.id };
  }
  const id = await db.progressPhotos.add(row);
  return { ...row, id };
}

export async function allPhotos(): Promise<ProgressPhotoRow[]> {
  return db.progressPhotos.orderBy('week').toArray();
}

export async function deletePhoto(id: number): Promise<void> {
  await db.progressPhotos.delete(id);
}

/**
 * Photo d'exécution d'un mouvement. Plusieurs dates par exercice — c'est le
 * but : comparer le squat de la semaine 1 à celui de la semaine 9.
 */
export async function saveExerciseMedia(
  row: Omit<ExerciseMediaRow, 'id'>,
): Promise<ExerciseMediaRow> {
  const existing = await db.exerciseMedia
    .where('[exerciseId+date]')
    .equals([row.exerciseId, row.date])
    .first();
  if (existing?.id !== undefined) {
    await db.exerciseMedia.put({ ...row, id: existing.id });
    return { ...row, id: existing.id };
  }
  const id = await db.exerciseMedia.add(row);
  return { ...row, id };
}

export async function mediaForExercise(exerciseId: string): Promise<ExerciseMediaRow[]> {
  return db.exerciseMedia.where('exerciseId').equals(exerciseId).sortBy('date');
}

export async function allExerciseMedia(): Promise<ExerciseMediaRow[]> {
  return db.exerciseMedia.orderBy('date').toArray();
}

export async function deleteExerciseMedia(id: number): Promise<void> {
  await db.exerciseMedia.delete(id);
}

/**
 * Fiche technique d'un mouvement. Une seule par exercice : en poser une
 * nouvelle remplace l'ancienne, sans laisser de doublon en base.
 */
export async function saveExerciseReference(
  row: Omit<ExerciseReferenceRow, 'id'>,
): Promise<ExerciseReferenceRow> {
  const existing = await db.exerciseReference.where('exerciseId').equals(row.exerciseId).first();
  if (existing?.id !== undefined) {
    await db.exerciseReference.put({ ...row, id: existing.id });
    return { ...row, id: existing.id };
  }
  const id = await db.exerciseReference.add(row);
  return { ...row, id };
}

export async function referenceForExercise(
  exerciseId: string,
): Promise<ExerciseReferenceRow | undefined> {
  return db.exerciseReference.where('exerciseId').equals(exerciseId).first();
}

export async function allExerciseReferences(): Promise<ExerciseReferenceRow[]> {
  return db.exerciseReference.orderBy('exerciseId').toArray();
}

export async function deleteExerciseReference(id: number): Promise<void> {
  await db.exerciseReference.delete(id);
}

/** Trace de vidéo : la date, pas le fichier. */
export async function logVideo(row: Omit<ExerciseVideoLogRow, 'id'>): Promise<void> {
  const existing = await db.exerciseVideoLog
    .where('[exerciseId+date]')
    .equals([row.exerciseId, row.date])
    .first();
  if (existing?.id !== undefined) await db.exerciseVideoLog.put({ ...row, id: existing.id });
  else await db.exerciseVideoLog.add(row);
}

export async function videoLogForExercise(exerciseId: string): Promise<ExerciseVideoLogRow[]> {
  return db.exerciseVideoLog.where('exerciseId').equals(exerciseId).sortBy('date');
}

export async function allVideoLog(): Promise<ExerciseVideoLogRow[]> {
  return db.exerciseVideoLog.orderBy('date').toArray();
}

export async function deleteVideoLog(id: number): Promise<void> {
  await db.exerciseVideoLog.delete(id);
}

// ---------------------------------------------------------------------------
// Remarques par exercice
// ---------------------------------------------------------------------------

/**
 * Écrit la remarque du jour sur un exercice, à chaque frappe.
 *
 * Pas de bouton « enregistrer » : c'est la règle de toute l'appli, une saisie
 * n'est jamais en attente. La clé unique `[exerciseId+week+day]` fait que la
 * ligne est corrigée, pas empilée.
 *
 * Un champ vidé SUPPRIME la ligne plutôt que d'écrire une chaîne vide, sans
 * quoi le badge de relecture s'allumerait sur des remarques sans contenu.
 */
export async function saveExerciseNote(input: {
  exerciseId: string;
  week: number;
  day: DayIndex;
  date: string;
  text: string;
}): Promise<void> {
  const existing = await db.exerciseNotes
    .where('[exerciseId+week+day]')
    .equals([input.exerciseId, input.week, input.day])
    .first();

  const texte = normalizeNote(input.text);
  if (texte === null) {
    if (existing?.id !== undefined) await db.exerciseNotes.delete(existing.id);
    return;
  }

  const row: ExerciseNoteRow = {
    exerciseId: input.exerciseId,
    week: input.week,
    day: input.day,
    date: input.date,
    text: texte,
    updatedAt: Date.now(),
    ...(existing?.id !== undefined ? { id: existing.id } : {}),
  };
  await db.exerciseNotes.put(row);
}

/** Toutes les remarques laissées sur un mouvement, sur les 12 semaines. */
export async function notesForExercise(exerciseId: string): Promise<ExerciseNoteRow[]> {
  return db.exerciseNotes.where('exerciseId').equals(exerciseId).toArray();
}

export async function allExerciseNotes(): Promise<ExerciseNoteRow[]> {
  return db.exerciseNotes.toArray();
}

// ------------------------------------------- remarques appendues (v15) --

/**
 * Ajoute une remarque. Rien n'est jamais corrigé, rien n'est jamais écrasé.
 *
 * C'est la différence de fond avec `saveExerciseNote`, qui existe encore
 * au-dessus mais que plus personne n'appelle : celle-ci ne cherche pas de
 * ligne existante, elle en crée une. Deux remarques sur le même mouvement la
 * même séance font donc deux lignes — et c'est exactement ce qu'on veut, parce
 * que « épaule gauche tire » puis « c'est passé en 3e série » ne disent pas la
 * même chose que la seconde seule.
 *
 * Une remarque vide n'est pas ajoutée : `null` rendu, rien écrit.
 */
export async function addNote(input: {
  exerciseId: string | null;
  week: number;
  day: DayIndex;
  date: string;
  text: string;
}): Promise<NoteRow | null> {
  const texte = normalizeNote(input.text);
  if (texte === null) return null;
  const row: NoteRow = {
    exerciseId: input.exerciseId,
    week: input.week,
    day: input.day,
    date: input.date,
    text: texte,
    at: Date.now(),
  };
  const id = await db.notes.add(row);
  return { ...row, id };
}

/** Toutes les remarques laissées sur un mouvement, sur les 12 semaines. */
export async function notesFor(exerciseId: string): Promise<NoteRow[]> {
  return db.notes.where('exerciseId').equals(exerciseId).toArray();
}

/**
 * Les remarques de SÉANCE — celles dont `exerciseId` vaut `null`.
 *
 * Elles ne passent pas par l'index `exerciseId` : IndexedDB n'indexe pas
 * `null`, donc ces lignes en sont absentes. Un parcours complet, et c'est
 * sans conséquence — on parle de quelques dizaines de lignes sur douze
 * semaines.
 */
export async function sessionNotes(): Promise<NoteRow[]> {
  const toutes = await db.notes.toArray();
  return toutes.filter((n) => n.exerciseId === null);
}

export async function allNotes(): Promise<NoteRow[]> {
  return db.notes.toArray();
}

/**
 * Retire UNE remarque, celle-là et pas une autre.
 *
 * Append-only ne veut pas dire indélébile : une remarque tapée sur le mauvais
 * exercice doit pouvoir partir. C'est la même règle que pour un aliment
 * ajouté — on retire la ligne et on la refait, deux appuis, et aucune
 * ambiguïté sur ce qui reste écrit. Ce qui est interdit, c'est qu'une
 * remarque disparaisse SANS qu'on l'ait demandé.
 */
export async function deleteNote(id: number): Promise<void> {
  await db.notes.delete(id);
}

// --------------------------------- exercices de séance (v15) --

/**
 * Enregistre un remplacement ou un ajout — tout de suite.
 *
 * Même règle que partout : une saisie n'attend pas. Guillaume valide le
 * panneau, la ligne est en base, et fermer l'appli ne perd rien.
 *
 * Rien n'est écrasé : remplacer deux fois le même créneau dans la même séance
 * laisse deux lignes, et c'est la plus récente qui s'affiche (voir
 * `applyCustom`). Garder la première permet de savoir ce qui a été essayé.
 */
export async function addSessionExercise(input: {
  sessionId: number;
  week: number;
  day: DayIndex;
  date: string;
  kind: 'replace' | 'add';
  originalExerciseId: string | null;
  exerciseId: string;
  name: string;
  sets: number;
  reps: number;
  kg: number | null;
  restSec: number;
}): Promise<SessionExerciseRow> {
  const row: SessionExerciseRow = { ...input, at: Date.now() };
  const id = await db.sessionExercises.add(row);
  return { ...row, id };
}

/** Les lignes d'UNE séance. */
export async function sessionExercisesFor(sessionId: number): Promise<SessionExerciseRow[]> {
  return db.sessionExercises.where('sessionId').equals(sessionId).toArray();
}

/**
 * Toutes les lignes, sur les douze semaines.
 *
 * Lues en entier parce que les puces « remplacé par » et « ajouté la semaine
 * dernière » regardent les séances PASSÉES du même jour. On parle de quelques
 * dizaines de lignes : un index par jour n'achèterait rien.
 */
export async function allSessionExercises(): Promise<SessionExerciseRow[]> {
  return db.sessionExercises.toArray();
}

/**
 * Annule un remplacement ou un ajout, et retire les séries qui s'y
 * rattachaient.
 *
 * Les deux ensemble, et c'est le point délicat. Retirer la ligne seule
 * laisserait en base des séries rattachées à un exercice qui n'est plus dans
 * la séance : invisibles à l'écran, mais bien présentes dans l'historique et
 * dans la progression du mouvement remplaçant. L'écran demande donc
 * confirmation en disant combien de séries partent.
 *
 * Rend le nombre de séries supprimées, pour que l'écran puisse le dire.
 */
export async function cancelSessionExercise(id: number): Promise<number> {
  const row = await db.sessionExercises.get(id);
  if (!row) return 0;
  const series = await db.sets
    .where('[sessionId+exerciseId]')
    .equals([row.sessionId, row.exerciseId])
    .toArray();
  for (const s of series) if (s.id !== undefined) await db.sets.delete(s.id);
  await db.sessionExercises.delete(id);
  return series.length;
}

/** Combien de séries sont déjà saisies sur cet exercice de séance. */
export async function setsOnSessionExercise(
  sessionId: number,
  exerciseId: string,
): Promise<number> {
  return db.sets.where('[sessionId+exerciseId]').equals([sessionId, exerciseId]).count();
}

// --------------------------------------------------- brouillons (v15) --

/**
 * Le brouillon en cours de frappe pour ce créneau, ou `undefined`.
 *
 * `slot` est l'id du mouvement, ou `SESSION_NOTE_SLOT` pour la remarque de
 * séance.
 */
export async function noteDraft(
  slot: string,
  week: number,
  day: DayIndex,
): Promise<NoteDraftRow | undefined> {
  return db.noteDrafts.where('[slot+week+day]').equals([slot, week, day]).first();
}

/**
 * Écrit le brouillon à chaque frappe — ou le supprime s'il ne reste rien.
 *
 * La règle de l'appli vaut toujours : une saisie n'attend jamais. Ce qui
 * attend, c'est seulement son passage dans l'historique, et c'est le bouton
 * « Ajouter » qui le déclenche. Un téléphone verrouillé au milieu d'une phrase
 * ne perd donc rien.
 */
export async function saveNoteDraft(input: {
  slot: string;
  week: number;
  day: DayIndex;
  date: string;
  text: string;
}): Promise<void> {
  /*
   * DANS UNE TRANSACTION, et ce n'est pas une précaution de style.
   *
   * Chaque frappe lance une écriture sans attendre la précédente — c'est le
   * comportement voulu, une saisie n'attend pas. Mais « lire la ligne puis
   * l'écrire » hors transaction laisse deux appels voir « rien en base » et
   * insérer tous les deux : l'index unique rejette le second avec une
   * `ConstraintError`, et la frappe est perdue. Reproduit en test, et vu dans
   * le navigateur avant d'être corrigé.
   *
   * IndexedDB sérialise les transactions `readwrite` dont la portée se
   * recoupe : la seconde ne démarre qu'une fois la première validée, donc la
   * lecture voit toujours ce que l'écriture précédente a posé.
   */
  await db.transaction('rw', db.noteDrafts, async () => {
    const existing = await noteDraft(input.slot, input.week, input.day);
    if (input.text.trim() === '') {
      if (existing?.id !== undefined) await db.noteDrafts.delete(existing.id);
      return;
    }
    const row: NoteDraftRow = {
      slot: input.slot,
      week: input.week,
      day: input.day,
      date: input.date,
      text: input.text,
      updatedAt: Date.now(),
      ...(existing?.id !== undefined ? { id: existing.id } : {}),
    };
    await db.noteDrafts.put(row);
  });
}

/**
 * Transforme le brouillon en remarque, et vide le champ.
 *
 * Rend la remarque créée, ou `null` si le brouillon était vide — ce qui
 * permet d'appeler cette fonction sans savoir s'il y avait quelque chose à
 * ajouter. C'est ce qui rend possible la reprise automatique à la fin de la
 * séance : on la demande pour chaque créneau, et seuls ceux qui portaient une
 * phrase produisent une ligne.
 */
export async function commitNoteDraft(
  slot: string,
  week: number,
  day: DayIndex,
  exerciseId: string | null,
): Promise<NoteRow | null> {
  const brouillon = await noteDraft(slot, week, day);
  if (!brouillon) return null;
  const ajoutee = await addNote({
    exerciseId,
    week,
    day,
    date: brouillon.date,
    text: brouillon.text,
  });
  if (brouillon.id !== undefined) await db.noteDrafts.delete(brouillon.id);
  return ajoutee;
}

/**
 * Ajoute tous les brouillons restants d'une séance.
 *
 * Appelée au moment où Guillaume marque la séance terminée. C'est le filet du
 * bouton « Ajouter » : une phrase oubliée dans un champ serait sinon la seule
 * chose que ce découpage brouillon / historique pourrait faire perdre.
 *
 * Rend le nombre de remarques ajoutées, pour que l'écran puisse le dire.
 */
export async function commitAllDrafts(week: number, day: DayIndex): Promise<number> {
  const brouillons = await db.noteDrafts.where('[week+day]').equals([week, day]).toArray();
  let n = 0;
  for (const b of brouillons) {
    const exerciseId = b.slot === SESSION_NOTE_SLOT ? null : b.slot;
    const ajoutee = await commitNoteDraft(b.slot, week, day, exerciseId);
    if (ajoutee) n += 1;
  }
  return n;
}

export interface PhotoUsage {
  count: number;
  bytes: number;
  /** Place réellement disponible d'après le navigateur, si elle est connue. */
  quotaBytes: number | null;
  usedBytes: number | null;
}

/**
 * Encombrement des photos, pour le dire avant qu'il devienne un problème.
 *
 * On somme les tailles déjà mémorisées à l'écriture plutôt que de relire les
 * blobs : compter 200 photos ne doit pas coûter 50 Mo de lecture.
 */
export async function photoUsage(): Promise<PhotoUsage> {
  const [photos, media, references] = await Promise.all([
    allPhotos(),
    allExerciseMedia(),
    allExerciseReferences(),
  ]);
  const rows = [...photos, ...media, ...references];
  let quotaBytes: number | null = null;
  let usedBytes: number | null = null;
  if (typeof navigator !== 'undefined' && navigator.storage?.estimate) {
    try {
      const est = await navigator.storage.estimate();
      quotaBytes = est.quota ?? null;
      usedBytes = est.usage ?? null;
    } catch {
      // Estimation indisponible : on affichera seulement notre propre total.
    }
  }
  return {
    count: rows.length,
    bytes: rows.reduce((n, r) => n + r.bytes, 0),
    quotaBytes,
    usedBytes,
  };
}

// -------------------------------------------------- historique pour l'engine --

/**
 * Transforme les séries enregistrées en index d'occurrences, la matière
 * première de `applyProgression`.
 *
 * Pour une semaine donnée : on retient la charge la plus lourde travaillée, le
 * RPE le plus élevé ressenti (la dernière série est la plus représentative de
 * la difficulté réelle) et le moindre échec.
 */
export function buildHistoryIndex(sets: SetRow[]): HistoryIndex {
  /*
   * Groupé par SÉANCE — semaine ET jour — et non par semaine seule.
   *
   * Un seul mouvement du programme revient deux fois dans la même semaine : le
   * Broad Jump, vendredi puis samedi. Groupées par semaine, ces deux séances
   * n'en faisaient qu'une, et le saut du vendredi devenait invisible depuis le
   * samedi. Pour les quarante autres exercices, qui n'apparaissent qu'un jour
   * par semaine, le regroupement est identique au précédent — un test le
   * vérifie plutôt que de le supposer.
   */
  const parSeance = new Map<string, Map<string, SetRow[]>>();

  for (const s of sets) {
    if (
      s.actualReps === null &&
      s.actualKg === null &&
      s.actualRpe === null &&
      s.measureValue == null
    )
      continue;
    let seances = parSeance.get(s.exerciseId);
    if (!seances) parSeance.set(s.exerciseId, (seances = new Map()));
    const cle = `${s.week}/${s.day}`;
    const list = seances.get(cle);
    if (list) list.push(s);
    else seances.set(cle, [s]);
  }

  const index: HistoryIndex = {};
  for (const [exerciseId, seances] of parSeance) {
    const occurrences: Occurrence[] = [];
    const triees = [...seances.values()].sort((a, b) =>
      a[0]!.week !== b[0]!.week ? a[0]!.week - b[0]!.week : a[0]!.day - b[0]!.day,
    );
    for (const rows of triees) {
      const week = rows[0]!.week;
      const kgs = rows.map((r) => r.actualKg).filter((k): k is number => k !== null);
      const rpes = rows.map((r) => r.actualRpe).filter((r): r is number => r !== null);
      /*
       * Les mesures viennent des MÊMES lignes que les kilos : un seul passage,
       * une seule source. Le meilleur essai de la semaine, comme pour la
       * charge — un saut se juge à sa meilleure distance, pas à sa moyenne.
       * Un sprint aussi se juge à son meilleur essai, donc au plus COURT : le
       * sens est décidé par `LOWER_IS_BETTER`, pas ici.
       */
      /*
       * L'unité de la séance : celle de la PREMIÈRE série mesurée, dans
       * l'ordre des séries.
       *
       * Il faut bien en choisir une, parce qu'un « meilleur essai » n'a pas de
       * sens si on mélange des mètres et des pas. La première est celle sur
       * laquelle Guillaume a ouvert la séance, donc celle qui décrit ce qu'il
       * a fait ; les séries d'une autre unité ne sont pas converties, elles
       * sortent simplement de l'agrégat — leur chiffre reste intact dans
       * `sets`, et le format de la séance les affiche telles quelles.
       */
      const ordonnees = [...rows].sort((a, b) => a.setIndex - b.setIndex);
      const premiereMesuree = ordonnees.find(
        (r) => r.measureValue !== null && r.measureValue !== undefined,
      );
      /*
       * L'unité n'est RETENUE que si la série en portait vraiment une. Sans
       * cette nuance, un Broad Jump — mesuré en centimètres, donc sans unité
       * m/pas — aurait reçu le repli « m » de `unitOf`, et la puce aurait
       * annoncé « 232 m » au lieu de « 232 cm ». Le repli sert à COMPARER, pas
       * à étiqueter.
       */
      const unite =
        premiereMesuree && isUnitId(premiereMesuree.measureUnit)
          ? premiereMesuree.measureUnit
          : null;
      const reference = premiereMesuree ? unitOf(premiereMesuree) : null;
      const mesures = ordonnees
        .filter((r) => reference === null || unitOf(r) === reference)
        .map((r) => r.measureValue)
        .filter((m): m is number => m !== null && m !== undefined);
      const first = rows[0]!;
      const target: RPETarget | null =
        first.targetRpeMin !== null && first.targetRpeMax !== null
          ? {
              min: first.targetRpeMin,
              max: first.targetRpeMax,
              label: first.targetRpeLabel ?? '',
            }
          : null;

      occurrences.push({
        exerciseId,
        week,
        day: first.day,
        kg: kgs.length ? Math.max(...kgs) : null,
        plannedKg: first.plannedKg,
        rpe: rpes.length ? Math.max(...rpes) : null,
        failed: rows.some((r) => r.failed),
        targetRPE: target,
        completed: rows.some((r) => r.actualReps !== null),
        measure: mesures.length
          ? lowerIsBetter(exerciseId)
            ? Math.min(...mesures)
            : Math.max(...mesures)
          : null,
        measureUnit: unite,
        /*
         * Le détail série par série, dans l'ordre où elles ont été faites.
         *
         * Trié sur `setIndex` et non sur l'ordre d'écriture : corriger la
         * deuxième série après avoir validé la quatrième réécrit la ligne, et
         * la relire dans l'ordre de la base donnerait « 2e, 3e, 4e, 2e ».
         */
        sets: ordonnees.map((r) => ({
          reps: r.actualReps,
          kg: r.actualKg,
          measure: r.measureValue,
          measureUnit: r.measureUnit ?? null,
        })),
      });
    }
    index[exerciseId] = occurrences;
  }

  return index;
}

export async function loadHistoryIndex(): Promise<HistoryIndex> {
  return buildHistoryIndex(await allSets());
}

// ------------------------------------------------- aliments personnalisés --

/**
 * Les valeurs d'aliment corrigées, prêtes pour l'engine.
 *
 * Une ligne absente n'est pas une valeur à zéro : c'est un aliment auquel
 * Guillaume n'a pas touché, donc celui du .md. `undefined` est donc conservé
 * champ par champ, jamais remplacé par 0.
 */
export async function allFoodOverrides(): Promise<FoodOverrides> {
  const out: FoodOverrides = {};
  for (const r of await db.foodOverrides.toArray()) {
    out[r.foodId] = {
      qty: r.qty,
      kcal: r.kcal,
      proteinG: r.proteinG,
      carbsG: r.carbsG,
      fatG: r.fatG,
      productId: r.productId,
    };
  }
  return out;
}

/** Écrit les valeurs corrigées d'un aliment, ou efface la ligne si elle redevient vide. */
export async function saveFoodOverride(foodId: string, patch: FoodOverride): Promise<void> {
  const vide = Object.values(patch).every((v) => v === undefined);
  const existing = await db.foodOverrides.where('foodId').equals(foodId).first();
  if (vide) {
    if (existing?.id !== undefined) await db.foodOverrides.delete(existing.id);
    return;
  }
  /*
   * On REMPLACE la ligne, champ par champ, en repartant de ce qui y était.
   *
   * Sans ça, enregistrer une quantité effacerait le remplacement enregistré
   * juste avant : les deux vivent sous la même clé de ligne, et l'écran ne les
   * saisit pas en même temps. Un champ absent du patch veut dire « n'y touche
   * pas », pas « efface-le ».
   */
  const row: FoodOverrideRow = { ...existing, foodId, ...sansIndefinis(patch) };
  if (existing?.id !== undefined) await db.foodOverrides.update(existing.id, row);
  else await db.foodOverrides.add(row);
}

/** Les seules clés réellement renseignées — `undefined` ne doit rien écraser. */
function sansIndefinis(patch: FoodOverride): Partial<FoodOverride> {
  return Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));
}

// ------------------------------------------------- aliments personnalisés --

/**
 * Enregistre un aliment saisi par Guillaume, réutilisable ensuite partout.
 *
 * `foodId` est unique : ressaisir le même aliment corrige le premier au lieu
 * d'empiler des doublons dans la liste de choix.
 */
export async function saveCustomFood(row: Omit<CustomFoodRow, 'id'>): Promise<void> {
  const existing = await db.customFoods.where('foodId').equals(row.foodId).first();
  if (existing?.id !== undefined) await db.customFoods.update(existing.id, row);
  else await db.customFoods.add(row);
}

export async function allCustomFoods(): Promise<CustomFoodRow[]> {
  return db.customFoods.orderBy('addedAt').reverse().toArray();
}

export async function deleteCustomFood(foodId: string): Promise<void> {
  const existing = await db.customFoods.where('foodId').equals(foodId).first();
  if (existing?.id !== undefined) await db.customFoods.delete(existing.id);
}

/** Revient au .md pour un aliment, ou pour tous quand `foodId` est omis. */
export async function resetFoodOverrides(foodId?: string): Promise<void> {
  if (foodId === undefined) {
    await db.foodOverrides.clear();
    return;
  }
  const existing = await db.foodOverrides.where('foodId').equals(foodId).first();
  if (existing?.id !== undefined) await db.foodOverrides.delete(existing.id);
}

// ------------------------------------------------------- repas réellement pris --

/**
 * Les repas cochés ce jour-là, par identifiant.
 *
 * Un `Set` et non une liste : l'écran ne demande jamais « lesquels » mais
 * « celui-ci, l'ai-je pris ? », et c'est la seule question qu'il pose par repas.
 */
export async function mealsEatenOn(date: string): Promise<Set<string>> {
  const rows = await db.mealLog.where('date').equals(date).toArray();
  return new Set(rows.map((r) => r.mealId));
}

/**
 * Coche ou décoche un repas.
 *
 * Décocher SUPPRIME la ligne plutôt que d'y écrire un « false » : l'absence
 * veut déjà dire « pas pris », et deux façons d'exprimer la même chose finissent
 * toujours par se contredire.
 */
export async function setMealEaten(date: string, mealId: string, eaten: boolean): Promise<void> {
  const existing = await db.mealLog.where('[date+mealId]').equals([date, mealId]).first();
  if (!eaten) {
    if (existing?.id !== undefined) await db.mealLog.delete(existing.id);
    return;
  }
  if (existing) return;
  const row: Omit<MealLogRow, 'id'> = {
    date,
    mealId,
    at: new Date().toISOString(),
  };
  await db.mealLog.add(row as MealLogRow);
}

/** Efface les coches d'une journée — le bouton « j'ai mal coché, je recommence ». */
export async function clearMealsEatenOn(date: string): Promise<void> {
  const rows = await db.mealLog.where('date').equals(date).toArray();
  await db.mealLog.bulkDelete(rows.map((r) => r.id!).filter((id) => id !== undefined));
}

// ------------------------------------------- palier choisi pour une journée --

/**
 * Le palier retenu pour cette journée, ou `null` si le programme fait foi.
 *
 * `null` et non une valeur par défaut : l'appelant seul sait ce que le
 * programme prévoit ce jour-là, et lui rendre « rest » ici reviendrait à
 * décider à sa place.
 */
export async function dayKindOverride(date: string): Promise<DayKindRow['kind'] | null> {
  const row = await db.dayKind.where('date').equals(date).first();
  return row?.kind ?? null;
}

/**
 * Détourne une journée vers l'autre palier, ou la rend au programme.
 *
 * `null` SUPPRIME la ligne plutôt que d'y écrire le palier du programme : une
 * ligne qui dirait la même chose que le programme deviendrait fausse le jour où
 * le programme change, et on ne saurait plus si c'était un choix ou un reste.
 */
export async function setDayKindOverride(
  date: string,
  kind: DayKindRow['kind'] | null,
): Promise<void> {
  const existing = await db.dayKind.where('date').equals(date).first();
  if (kind === null) {
    if (existing?.id !== undefined) await db.dayKind.delete(existing.id);
    return;
  }
  if (existing?.id !== undefined) await db.dayKind.update(existing.id, { kind });
  else await db.dayKind.add({ date, kind } as DayKindRow);
}

// --------------------------------------------------- suivi de douleur (§14) --

/**
 * Les lignes de suivi d'une journée, par exercice.
 *
 * Une `Map` et non une liste : l'écran pose toujours la question exercice par
 * exercice — « celui-là, qu'est-ce que j'avais noté ? ».
 */
export async function painLogOn(date: string): Promise<Map<string, PainLogRow>> {
  const rows = await db.painLog.where('date').equals(date).toArray();
  return new Map(rows.map((r) => [r.exId, r]));
}

/** L'historique d'un exercice, de la note la plus ancienne à la plus récente. */
export async function painLogFor(exId: string): Promise<PainLogRow[]> {
  const rows = await db.painLog.where('exId').equals(exId).toArray();
  return rows.sort((a, b) => a.date.localeCompare(b.date));
}

export async function allPainLogs(): Promise<PainLogRow[]> {
  return db.painLog.orderBy('date').toArray();
}

/**
 * Écrit ou corrige la note du jour pour un exercice.
 *
 * Une ligne entièrement vide est SUPPRIMÉE plutôt que gardée à zéro : « rien
 * noté » et « zéro douleur » ne disent pas la même chose, et laisser traîner
 * des lignes vides ferait mentir la courbe.
 */
export async function savePain(
  date: string,
  exId: string,
  patch: Partial<Omit<PainLogRow, 'id' | 'date' | 'exId'>>,
): Promise<PainLogRow | null> {
  /*
   * Même transaction, même raison que pour les brouillons de remarque : deux
   * appuis rapprochés sur un curseur lancent deux « lire puis écrire » qui se
   * croisent, voient tous les deux « rien en base », et insèrent tous les deux
   * — l'index unique rejette alors le second et l'appui est perdu.
   *
   * Le défaut était là avant les remarques appendues ; il s'est vu en les
   * testant, et il se corrige de la même façon.
   */
  return db.transaction('rw', db.painLog, async () => {
    const existing = await db.painLog.where('[date+exId]').equals([date, exId]).first();
    const next: PainLogRow = {
      date,
      exId,
      during: null,
      after: null,
      nextDay: null,
      toleratedKg: null,
      rom: null,
      ...existing,
      ...patch,
    };

    const vide =
      next.during === null &&
      next.after === null &&
      next.nextDay === null &&
      next.toleratedKg === null &&
      next.rom === null;

    if (vide) {
      if (existing?.id !== undefined) await db.painLog.delete(existing.id);
      return null;
    }
    if (existing?.id !== undefined) {
      await db.painLog.put({ ...next, id: existing.id });
      return { ...next, id: existing.id };
    }
    const id = await db.painLog.add(next);
    return { ...next, id };
  });
}

// ------------------------------------------- aliments mangés en plus du plan --

/** Les aliments ajoutés ce jour-là, dans l'ordre où ils ont été saisis. */
export async function extrasOn(date: string): Promise<ExtraFoodRow[]> {
  const rows = await db.extraFoods.where('date').equals(date).toArray();
  return rows.sort((a, b) => (a.id ?? 0) - (b.id ?? 0));
}

/**
 * Ajoute un aliment à un repas de la journée.
 *
 * La composition est RECOPIÉE dans la ligne, pas référencée : un ajout est un
 * fait daté, et changer de marque de skyr en novembre ne doit pas réécrire les
 * journées d'octobre. Voir `ExtraFoodRow`.
 *
 * Rien n'est fusionné non plus : deux ajouts du même aliment font deux lignes.
 * Les additionner d'office empêcherait d'en retirer une seule, et sur un écran
 * où tout se corrige, ne pas pouvoir défaire est pire que répéter.
 */
export async function addExtra(
  date: string,
  mealId: string,
  qty: number,
  food: {
    id: string;
    label: string;
    unit: ExtraFoodRow['unit'];
    per: number;
    kcal: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
  },
): Promise<void> {
  await db.extraFoods.add({
    date,
    mealId,
    qty,
    foodId: food.id,
    label: food.label,
    unit: food.unit,
    per: food.per,
    kcal: food.kcal,
    proteinG: food.proteinG,
    carbsG: food.carbsG,
    fatG: food.fatG,
  } as ExtraFoodRow);
}

export async function removeExtra(id: number): Promise<void> {
  await db.extraFoods.delete(id);
}

export async function allExtras(): Promise<ExtraFoodRow[]> {
  return db.extraFoods.orderBy('date').toArray();
}
