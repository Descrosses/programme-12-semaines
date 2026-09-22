/**
 * Résolution d'un `LoadSpec` en kilos affichables.
 *
 * Trois sources possibles, dans cet ordre :
 *   1. une valeur écrite dans le programme (tableau §9, trames §7) ;
 *   2. un pourcentage d'un 1RM testé (ajustement ROUGE de §4) ;
 *   3. l'historique réel, pour les charges autorégulées que le programme ne
 *      chiffre nulle part (Bulgarian, Hip Thrust).
 */

import type { LoadSpec, LoadStep } from '../data/types';
import { roundToStep } from './rounding';
import type { HistoryIndex, Settings } from './types';
import { lastCompleted } from './progression';

export type LoadShape =
  | 'barbell'
  | 'added'
  | 'dbPair'
  | 'dbSingle'
  /** Poulie : le programme ne chiffre rien, la charge vient de la machine. */
  | 'cable'
  | 'bodyweight'
  | 'text'
  | 'none';

export interface ResolvedLoad {
  kg: number | null;
  shape: LoadShape;
  step: LoadStep;
  /** Plafond assumé (RDL S9-11 à 95 kg). */
  kgMax?: number;
  /** Texte brut quand le programme ne chiffre pas (« 2 × 6-8 kg »). */
  text?: string;
  /** D'où vient le chiffre — sert à expliquer l'affichage à l'utilisateur. */
  source: 'programme' | '1rm' | 'historique' | 'aucune';
}

export interface ResolveContext {
  settings: Settings;
  history: HistoryIndex;
  exerciseId: string;
}

const NONE: ResolvedLoad = { kg: null, shape: 'none', step: 2.5, source: 'aucune' };

export function resolveLoad(load: LoadSpec, ctx: ResolveContext): ResolvedLoad {
  switch (load.kind) {
    case 'barbell':
      return {
        kg: load.kg,
        shape: 'barbell',
        step: load.step,
        source: 'programme',
        ...(load.kgMax !== undefined ? { kgMax: load.kgMax } : {}),
      };

    case 'added':
      return { kg: load.kg, shape: 'added', step: load.step, source: 'programme' };

    case 'dbPair':
      return { kg: load.kg, shape: 'dbPair', step: load.step, source: 'programme' };

    case 'dbSingle':
      return { kg: load.kg, shape: 'dbSingle', step: load.step, source: 'programme' };

    case 'pct1RM': {
      const oneRM = ctx.settings.oneRM[load.lift as keyof Settings['oneRM']];
      if (oneRM === undefined) return { ...NONE, step: load.step, shape: 'barbell' };
      return {
        kg: roundToStep(oneRM * load.pct, load.step),
        shape: load.lift === 'weighted-pullup' ? 'added' : 'barbell',
        step: load.step,
        source: '1rm',
      };
    }

    case 'autoreg': {
      const shape: LoadShape = load.as;
      const last = lastCompleted(ctx.history[ctx.exerciseId] ?? []);
      if (last?.kg != null) {
        return { kg: last.kg, shape, step: load.step, source: 'historique' };
      }
      if (load.seed !== undefined) {
        return { kg: load.seed, shape, step: load.step, source: 'programme' };
      }
      return { ...NONE, shape, step: load.step };
    }

    case 'bodyweight':
      return { kg: null, shape: 'bodyweight', step: 2.5, source: 'programme' };

    case 'text':
      return { kg: null, shape: 'text', step: 2.5, text: load.label, source: 'programme' };

    case 'none':
      return { ...NONE };
  }
}

/** Applique un facteur (deload −20 %, orange −5 %) en respectant le pas d'arrondi. */
export function scaleLoad(load: ResolvedLoad, factor: number): ResolvedLoad {
  if (load.kg === null) return load;
  return { ...load, kg: roundToStep(load.kg * factor, load.step) };
}

/** Remplace la charge par une valeur explicite (rouge : 65 % du 1RM). */
export function withKg(load: ResolvedLoad, kg: number | null): ResolvedLoad {
  return { ...load, kg };
}
