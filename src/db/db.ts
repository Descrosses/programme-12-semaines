/**
 * Base locale (IndexedDB via Dexie).
 *
 * Tout reste sur le téléphone : pas de compte, pas de serveur. Chaque série
 * validée est écrite immédiatement — l'appli ne doit jamais perdre une saisie.
 */

import Dexie, { type Table } from 'dexie';
import type { DayIndex } from '../data/types';

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
  /** Son et vibration en fin de repos. */
  soundEnabled: boolean;
  vibrationEnabled: boolean;
}

export class ProgrammeDB extends Dexie {
  sessions!: Table<SessionRow, number>;
  sets!: Table<SetRow, number>;
  readiness!: Table<ReadinessRow, number>;
  combines!: Table<CombineRow, number>;
  settings!: Table<SettingsRow, number>;

  constructor() {
    super('programme-12-semaines');
    this.version(1).stores({
      sessions: '++id, &[week+day], date, status',
      sets: '++id, sessionId, [sessionId+exerciseId], exerciseId, [exerciseId+week], date',
      readiness: '++id, date, [week+day], week',
      combines: '++id, &phase, date',
      settings: 'id',
    });
  }
}

export const db = new ProgrammeDB();

export const DEFAULT_SETTINGS_ROW: SettingsRow = {
  id: 1,
  startDate: '',
  broadJumpBaselineCm: null,
  oneRM: {},
  soundEnabled: true,
  vibrationEnabled: true,
};
