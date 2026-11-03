/**
 * MASS 4 comme module de programme : la séance, prête à afficher.
 *
 * ── Ce que ce fichier fait, et pourquoi il est si direct ───────────────────
 *
 * Il assemble une séance à partir des données transcrites. Pas de résolution
 * de charge, pas de recalage, pas d'adaptation à la forme : MASS 4 ne
 * prescrit aucun kilo, et la seule chose qui varie d'une semaine à l'autre
 * est le nombre de séries sur cinq mouvements et le mode d'exécution sur deux
 * autres.
 *
 * Comparer avec `engine/getSession.ts`, qui fait huit cents lignes pour
 * POWER 12, donne la mesure de ce que l'architecture a permis : deux
 * programmes, deux logiques sportives, aucune n'ayant à se plier à l'autre.
 *
 * ── Les deux champs empruntés à POWER ──────────────────────────────────────
 *
 * `fn` et `role` viennent de la taxonomie de POWER 12. Ils ne pilotent rien
 * ici : MASS ne passe jamais par le moteur de POWER, où ces champs décident
 * des adaptations du §4 et du §11. Ils servent uniquement d'étiquettes à
 * l'écran — quel gabarit de carte, quel libellé de mesure. Le jour où la
 * bibliothèque commune du §10 existera, c'est elle qui les portera.
 */

import type { DayIndex, ExerciseDef, ExerciseRole, MovementFn } from '../../data/types';
import type { ResolvedExercise, ResolvedSession } from '../../engine/getSession';
import type { SessionContext } from '../../engine/types';
import type { ModuleProgramme } from '../types';
import { EXERCICES_MASS4, TECHNIQUES } from './exercices';
import { modePour, proposeSerieOptionnelle, repsAffichees, seriesPour } from './progression';
import { seancePour } from './seances';
import { travailPour } from './travail';
import { JOURS_MASS4, SEMAINES_MASS4, type LigneMass4 } from './types';

/**
 * À quelle famille de mouvement chaque exercice appartient, pour l'affichage.
 *
 * Écrit à la main et non déduit du nom : « pull over » est un mouvement de
 * tirage pour le dos et un mouvement de poussée pour les pecs selon la
 * variante, et aucune heuristique ne le saurait.
 */
const FAMILLE: Record<string, MovementFn> = {
  'oiseau-machine': 'pull',
  'developpe-militaire-smith': 'push',
  'elevations-laterales': 'push',
  'elevations-frontales-unilat': 'push',
  'oiseau-banc-halteres': 'pull',
  'barre-au-front': 'push',
  'curl-barre-ez': 'pull',
  'curl-halteres-alterne': 'pull',
  'curl-machine': 'pull',
  'extension-triceps-corde': 'push',
  'dips-banc': 'push',
  'tirage-vertical-supination': 'pull',
  'tirage-vertical-unilateral': 'pull',
  'tirage-horizontal-serre': 'pull',
  'pull-over-poulie': 'pull',
  'rowing-bucheron': 'pull',
  'shrugs-halteres': 'pull',
  'ecarte-poulie-basse': 'push',
  'developpe-incline-smith': 'push',
  'developpe-couche-halteres': 'push',
  'ecarte-couche-halteres': 'push',
  'pull-over-haltere': 'push',
  'squat-smith': 'squat',
  'leg-extension': 'squat',
  'leg-curl-allonge': 'hinge',
  'fentes-halteres': 'squat',
  'gainage-debout-valise': 'core',
  'ab-wheel': 'core',
  'roman-side-bench': 'core',
  'releve-de-buste': 'core',
};

const TRONC = new Set(['gainage-debout-valise', 'ab-wheel', 'roman-side-bench', 'releve-de-buste']);

function definition(id: string): ExerciseDef {
  const e = EXERCICES_MASS4[id];
  const role: ExerciseRole = TRONC.has(id) ? 'core' : 'accessory';
  return {
    id,
    name: e?.nom ?? id,
    fn: FAMILLE[id] ?? 'push',
    role,
    ...(e?.consigne === undefined ? {} : { intent: e.consigne }),
  };
}

/** Ce qui s'écrit sous le nom du mouvement : la technique, puis le matériel. */
function notesPour(ligne: LigneMass4, semaine: number): string[] {
  const out: string[] = [];
  const technique = TECHNIQUES[ligne.technique];
  if (technique !== undefined && ligne.technique !== 'droite') out.push(technique);

  const mode = modePour(ligne, semaine);
  if (mode === 'unilateral') out.push('Cette semaine : une jambe à la fois.');
  if (mode === 'bilateral') out.push('Cette semaine : les deux jambes.');

  if (proposeSerieOptionnelle(ligne, semaine)) {
    out.push(
      'Quatrième série possible, si la séance de la semaine dernière a tenu en 60 min ou moins et qu’il n’y a eu ni épuisement ni courbatures 48 h après.',
    );
  }

  const materiel = EXERCICES_MASS4[ligne.exerciceId]?.materiel;
  if (materiel !== undefined) out.push(materiel);
  return out;
}

function exercicePour(ligne: LigneMass4, semaine: number): ResolvedExercise {
  const series = seriesPour(ligne, semaine);
  const texteReps = repsAffichees(ligne, semaine);
  const travail = travailPour(ligne.reps);

  return {
    def: definition(ligne.exerciceId),
    id: ligne.exerciceId,
    name: EXERCICES_MASS4[ligne.exerciceId]?.nom ?? ligne.exerciceId,
    sets: series,
    // Une forme que l'analyseur ne reconnaît pas reste affichée telle quelle,
    // plutôt que d'être remplacée par un chiffre inventé.
    work: travail ?? { kind: 'maxSet' },
    load: { kg: null, shape: 'none', step: 2.5, source: 'aucune' },
    targetRPE: null,
    restSec: ligne.reposSec ?? 0,
    loadLine: `${series} × ${texteReps}`,
    notes: notesPour(ligne, semaine),
    ...(ligne.superset === undefined ? {} : { superset: ligne.superset }),
    lastKg: null,
    lastMeasure: null,
    planKg: null,
    suggestion: null,
    adjustments: [],
  };
}

/**
 * L'échauffement, que le document compte dans la durée annoncée.
 *
 * « Format : 4 séances par semaine, 60 min environ, échauffement compris. »
 * Le calcul ci-dessous ne mesure que les séries et les repos ; sans cette
 * allocation il annonçait 47 minutes pour une séance que le document estime à
 * 60. Dix minutes est la valeur qui recolle à la fourchette écrite — « la
 * durée réelle va de 60 à 66 min » — sans rien inventer d'autre.
 */
const ECHAUFFEMENT_MIN = 10;

/** Durée estimée : les séries, les repos, et l'échauffement du document. */
function dureeMinutes(lignes: readonly LigneMass4[], semaine: number): number {
  let secondes = 0;
  for (const ligne of lignes) {
    const series = seriesPour(ligne, semaine);
    secondes += series * 60;
    secondes += (ligne.reposSec ?? 0) * Math.max(0, series - 1);
    secondes += ligne.reposFinSec ?? 0;
  }
  return ECHAUFFEMENT_MIN + Math.round(secondes / 60);
}

export const MASS4: ModuleProgramme = {
  id: 'mass4',
  dureeSemaines: 4,
  semaines: SEMAINES_MASS4,

  joursDeLaSemaine(week: number) {
    return SEMAINES_MASS4.includes(week) ? JOURS_MASS4 : [];
  },

  /*
   * Aucun bloc : « la même séance chaque semaine, de la semaine 1 à la
   * semaine 4 ». Les écrans qui affichent un bandeau de périodisation doivent
   * donc savoir se taire, et c'est `null` qui le leur dit.
   */
  blocDeLaSemaine() {
    return null;
  },

  couleurDuBloc() {
    return 'transparent';
  },

  getSession(week: number, day: DayIndex, _ctx: SessionContext): ResolvedSession | null {
    if (!SEMAINES_MASS4.includes(week)) return null;
    const seance = seancePour(day);
    if (seance === null) return null;

    const minutes = dureeMinutes(seance.lignes, week);
    return {
      week,
      day,
      block: 'accumulation',
      blockName: 'Volume',
      blockColor: 'transparent',
      title: seance.titre,
      durationLabel: `≈ ${minutes} min`,
      plannedMin: minutes,
      intensity: 'MODÉRÉ',
      warmup: null,
      readinessTest: false,
      notes: [],
      exercises: seance.lignes.map((l) => exercicePour(l, week)),
      suspended: [],
      adjustments: [],
    };
  },
};

/** Exporté pour les tests : le détail d'une ligne, sans passer par la séance. */
export const _exercicePour = exercicePour;
