/**
 * MASS FORCE comme module de programme (lot 4a) : la semaine type, et elle
 * seule.
 *
 * ── Ce que le module fait ─────────────────────────────────────────────────
 *
 * Il assemble les séances de `seances.ts` avec le matériel et les variantes
 * choisis pour le cycle (`ctx.choixCycle`). Chaque option est un exercice à
 * part : l'identifiant de l'exercice EST celui de l'option, et l'historique
 * suit donc le matériel — un développé à la Smith ne se compare jamais à un
 * développé à la barre.
 *
 * ── Ce qu'il ne fait PAS, volontairement ──────────────────────────────────
 *
 * - Aucune charge prescrite : la fourchette en %1RM n'est pas validée. Les
 *   quatre mouvements évalués le disent sous leur nom ; la charge est libre.
 * - Aucune semaine 2 à 4 : la progression n'est pas validée. Recopier la S1
 *   ferait passer une absence de progression pour une décision.
 * - Aucun champ RPE : « RPE 8 » est une consigne (décision de Guillaume).
 */

import type { DayIndex, ExerciseDef, MovementFn } from '../../data/types';
import type { ResolvedExercise, ResolvedSession } from '../../engine/getSession';
import type { SessionContext } from '../../engine/types';
import { travailPour } from '../mass4/travail';
import type { ModuleProgramme } from '../types';
import { optionChoisie, type ChoixForce } from './depart';
import { seanceForce } from './seances';
import { JOURS_FORCE, SEMAINES_FORCE, type LigneForce } from './types';

/** Étiquette d'affichage seulement : rien ne la lit pour calculer. */
const FAMILLE: Record<string, MovementFn> = {
  'lun-developpe': 'push',
  'lun-incline': 'push',
  'lun-ecarte': 'push',
  'lun-front': 'push',
  'lun-extension': 'push',
  'mar-tirage': 'pull',
  'mar-rowing': 'pull',
  'mar-supination': 'pull',
  'mar-pullover': 'pull',
  'mar-curl-w': 'pull',
  'mar-curl-halteres': 'pull',
  'jeu-squat': 'squat',
  'jeu-leg-extension': 'squat',
  'jeu-leg-curl': 'hinge',
  'jeu-fentes': 'squat',
  'ven-push-press': 'push',
  'ven-frontales': 'push',
  'ven-laterales': 'push',
  'ven-oiseau': 'pull',
};

/** La phrase sous les quatre mouvements évalués, tant que le % manque. */
export const NOTE_A_DEFINIR =
  'Charge libre en attendant : la fourchette en %1RM n’est pas encore validée.';

function notesPour(ligne: LigneForce): string[] {
  const out: string[] = [];
  if (ligne.charge === 'a-definir') out.push(NOTE_A_DEFINIR);
  // Le matériel, quand il n'est pas déjà dans le nom de l'option choisie.
  if (ligne.options.length === 1 && ligne.materiel !== 'À préciser') out.push(ligne.materiel);
  return out;
}

function exercicePour(ligne: LigneForce, choix: ChoixForce | undefined): ResolvedExercise {
  const option = optionChoisie(ligne, choix);
  const def: ExerciseDef = {
    id: option.id,
    name: option.nom,
    fn: FAMILLE[ligne.cle] ?? 'push',
    role: 'accessory',
    intent: ligne.consigne,
    vigilance: ligne.vigilance,
  };
  return {
    def,
    id: option.id,
    name: option.nom,
    sets: ligne.series,
    work: travailPour(ligne.reps) ?? { kind: 'maxSet' },
    load: { kg: null, shape: 'none', step: 2.5, source: 'aucune' },
    targetRPE: null,
    restSec: ligne.reposSec,
    loadLine: `${ligne.series} × ${ligne.reps}`,
    notes: notesPour(ligne),
    ...(ligne.superset === undefined ? {} : { superset: ligne.superset }),
    lastKg: null,
    lastMeasure: null,
    planKg: null,
    suggestion: null,
    adjustments: [],
  };
}

/**
 * Durée estimée des séries et des repos, à la même convention que MASS
 * CONGESTION (une minute par série). Le document de MASS FORCE ne donne
 * aucune durée d'échauffement : aucune n'est ajoutée.
 */
export function dureeMinutes(lignes: readonly LigneForce[]): number {
  let secondes = 0;
  for (const l of lignes) {
    secondes += l.series * 60;
    // En superset, la transition du premier mouvement revient à chaque tour.
    const pauses = l.superset !== undefined && l.reposSec < 60 ? l.series : l.series - 1;
    secondes += l.reposSec * Math.max(0, pauses);
  }
  return Math.round(secondes / 60);
}

export const MASS_FORCE: ModuleProgramme = {
  id: 'mass-force',

  /*
   * Combiné : l'écran d'évaluation de MASS (lot 3), pas le combine de POWER.
   * Progrès et Nutrition : places posées, contenu à venir (décision de
   * Guillaume — « à mettre en place quand même »).
   */
  onglets: [
    { route: 'today', label: 'Aujourd’hui', icon: 'play', vue: 'today' },
    { route: 'week', label: 'Semaine', icon: 'calendar', vue: 'week' },
    { route: 'combine', label: 'Combiné', icon: 'stopwatch', vue: 'evaluation' },
    { route: 'progress', label: 'Progrès', icon: 'chart', vue: 'a-venir' },
    { route: 'nutrition', label: 'Nutrition', icon: 'meal', vue: 'a-venir' },
    { route: 'settings', label: 'Réglages', icon: 'settings', vue: 'settings' },
  ],

  reglages: {
    eyebrow: 'Programme 4 semaines',
    refPoids: null,
    /*
     * Les références de MASS FORCE vivent dans `referencesForce`, jamais dans
     * `settings.oneRM` : le bloc « 1RM testés » de POWER n'a rien à régler.
     */
    force: false,
  },

  dureeSemaines: 4,
  semaines: SEMAINES_FORCE,

  joursDeLaSemaine(week: number) {
    return SEMAINES_FORCE.includes(week) ? JOURS_FORCE : [];
  },

  blocDeLaSemaine() {
    return null;
  },

  couleurDuBloc() {
    return 'transparent';
  },

  getSession(week: number, day: DayIndex, ctx: SessionContext): ResolvedSession | null {
    if (!SEMAINES_FORCE.includes(week)) return null;
    const seance = seanceForce(day);
    if (seance === null) return null;
    const minutes = dureeMinutes(seance.lignes);
    return {
      week,
      day,
      block: 'accumulation',
      blockName: 'Semaine type',
      blockColor: 'transparent',
      sansBloc: true,
      title: seance.titre,
      durationLabel: `≈ ${minutes} min`,
      plannedMin: minutes,
      intensity: 'DUR',
      warmup: null,
      readinessTest: false,
      notes: [],
      exercises: seance.lignes.map((l) => exercicePour(l, ctx.choixCycle)),
      suspended: [],
      adjustments: [],
    };
  },
};
