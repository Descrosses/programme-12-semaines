/** Suivi des séances partielles : ne modifie aucune règle sportive. */
export function shouldRemindSession(input: {
  startedAt?: number; finishedAt?: number; now: number; plannedMin: number;
  addedExercise: boolean; dismissed: boolean;
}): boolean {
  const { startedAt, finishedAt, now, plannedMin, addedExercise, dismissed } = input;
  return startedAt !== undefined && finishedAt === undefined && !addedExercise && !dismissed &&
    Number.isFinite(plannedMin) && plannedMin > 0 && now >= startedAt &&
    now - startedAt >= plannedMin * 1.5 * 60_000;
}

/** Une ligne précréée sans effort saisi ne constitue pas une série effectuée. */
export function hasRecordedEffort(row: {
  actualReps?: number | null; measureValue?: number | null;
  actualKg?: number | null; failed?: boolean;
}): boolean {
  return row.actualReps != null || row.measureValue != null || row.failed === true;
}

export function missingPrescribedSets(
  exercises: readonly { id: string; sets: number }[],
  saved: Record<string, readonly {
    setIndex: number; actualReps?: number | null; measureValue?: number | null;
    actualKg?: number | null; failed?: boolean;
  }[]>,
): string[] {
  return exercises.filter(ex => {
    const completed = new Set((saved[ex.id] ?? [])
      .filter(hasRecordedEffort)
      .filter(s => s.setIndex >= 0 && s.setIndex < ex.sets)
      .map(s => s.setIndex));
    return completed.size < ex.sets;
  }).map(ex => ex.id);
}

/** Aucune reprise de charge aveugle : on ne propose qu'une valeur unique réellement observée. */
export function previousUniformLoad(
  rows: readonly { setIndex: number; actualKg: number | null; actualReps: number | null; measureValue: number | null; failed: boolean }[],
): number | null {
  const performed = rows.filter(hasRecordedEffort);
  if (performed.length === 0 || performed.some(s => s.actualKg === null)) return null;
  const kg = performed[0]?.actualKg ?? null;
  return kg !== null && performed.every(s => s.actualKg === kg) ? kg : null;
}

/** Un changement de bloc ou un deload interdit une reprise automatique. */
export function canResumePreviousLoad(input: {
  previousBlock: string; currentBlock: string; currentKg: number | null;
  previousKg: number | null; previousFailed?: boolean; hasVariablePrescriptions?: boolean;
}): boolean {
  const { previousBlock, currentBlock, currentKg, previousKg, previousFailed, hasVariablePrescriptions } = input;
  return !previousFailed && !hasVariablePrescriptions &&
    previousBlock === currentBlock && currentBlock !== 'deload' && currentBlock !== 'taper' && currentBlock !== 'test' &&
    currentKg !== null && previousKg !== null && Number.isFinite(previousKg) && previousKg > 0;
}
