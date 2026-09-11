/**
 * Accès à la base. Aucune logique de programme ici : seulement lire, écrire,
 * et transformer les lignes en structures que l'engine sait consommer.
 */

import type { DayIndex, RPETarget } from '../data/types';
import type { HistoryIndex, Occurrence, ReadinessRecord, Settings } from '../engine/types';
import {
  DEFAULT_SETTINGS_ROW,
  db,
  type CombinePhase,
  type CombineRow,
  type MeasurementRow,
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
  return next;
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
export async function ensureSession(week: number, day: DayIndex, date: string): Promise<SessionRow> {
  const existing = await db.sessions.where('[week+day]').equals([week, day]).first();
  if (existing) {
    if (existing.date !== date && existing.id !== undefined) {
      await db.sessions.update(existing.id, { date });
      await db.sets.where('sessionId').equals(existing.id).modify({ date });
      return { ...existing, date };
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
  return rows.map((r) => ({ date: r.date, week: r.week, day: r.day, jumpCm: r.jumpCm }));
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
}

export async function getMeasurement(date: string): Promise<MeasurementRow | undefined> {
  return db.measurements.where('date').equals(date).first();
}

export async function allMeasurements(): Promise<MeasurementRow[]> {
  return db.measurements.orderBy('date').toArray();
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
  const byExerciseWeek = new Map<string, Map<number, SetRow[]>>();

  for (const s of sets) {
    if (s.actualReps === null && s.actualKg === null && s.actualRpe === null && s.measureValue == null)
      continue;
    let weeks = byExerciseWeek.get(s.exerciseId);
    if (!weeks) byExerciseWeek.set(s.exerciseId, (weeks = new Map()));
    const list = weeks.get(s.week);
    if (list) list.push(s);
    else weeks.set(s.week, [s]);
  }

  const index: HistoryIndex = {};
  for (const [exerciseId, weeks] of byExerciseWeek) {
    const occurrences: Occurrence[] = [];
    for (const [week, rows] of [...weeks.entries()].sort((a, b) => a[0] - b[0])) {
      const kgs = rows.map((r) => r.actualKg).filter((k): k is number => k !== null);
      const rpes = rows.map((r) => r.actualRpe).filter((r): r is number => r !== null);
      const first = rows[0]!;
      const target: RPETarget | null =
        first.targetRpeMin !== null && first.targetRpeMax !== null
          ? { min: first.targetRpeMin, max: first.targetRpeMax, label: first.targetRpeLabel ?? '' }
          : null;

      occurrences.push({
        exerciseId,
        week,
        kg: kgs.length ? Math.max(...kgs) : null,
        plannedKg: first.plannedKg,
        rpe: rpes.length ? Math.max(...rpes) : null,
        failed: rows.some((r) => r.failed),
        targetRPE: target,
        completed: rows.some((r) => r.actualReps !== null),
      });
    }
    index[exerciseId] = occurrences;
  }

  return index;
}

export async function loadHistoryIndex(): Promise<HistoryIndex> {
  return buildHistoryIndex(await allSets());
}
