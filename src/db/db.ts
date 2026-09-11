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

/**
 * Une ligne par jour de relevé — poids du matin, tour de taille quand il y en a.
 *
 * Table séparée et non un champ de plus dans `settings` : le plan alimentaire
 * ne décide rien sur une pesée isolée, il lui faut un historique. `date` est
 * unique, donc se repeser deux fois le même jour corrige la ligne au lieu d'en
 * créer une deuxième qui fausserait la moyenne.
 */
export interface MeasurementRow {
  id?: number;
  /** `YYYY-MM-DD`. */
  date: string;
  weightKg: number | null;
  waistCm: number | null;
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
  }
}

export const db = new ProgrammeDB();

export const DEFAULT_SETTINGS_ROW: SettingsRow = {
  id: 1,
  startDate: '',
  broadJumpBaselineCm: null,
  oneRM: {},
  bodyweightKg: null,
  bodyweightDate: '',
  soundEnabled: true,
  vibrationEnabled: true,
};
