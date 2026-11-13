/**
 * Ce que FEMMES écrit en base : le profil de départ et les séances faites.
 *
 * Tout est rattaché à un cycle, comme pour POWER et MASS : deux cycles FEMMES
 * successifs ne mélangent ni leurs séances ni leurs charges.
 */

import { db, type FemmesSeanceRow, type ProfilFemmes } from './db';
import { terminerCycle } from './repo';
import { avancement } from '../engine/femmes/avancement';
import type { DayIndex, Version } from '../data/femmes/types';
import type { ExerciseRecord } from '../engine/femmes/types';

/** L'identifiant du programme FEMMES jouable. Un seul endroit l'écrit. */
export const FEMMES_PROGRAMME_ID = 'femmes8';

const aujourdhui = () => new Date().toISOString().slice(0, 10);

/** Pose (ou corrige) le niveau et les réponses de sécurité d'un cycle FEMMES. */
export async function enregistrerProfilFemmes(
  cycleId: number,
  profil: ProfilFemmes,
): Promise<void> {
  await db.cycles.update(cycleId, { femmes: profil });
}

/** Où en est un cycle FEMMES : séances faites, prochaine, semaine courante. */
export async function avancementFemmes(cycleId: number) {
  return avancement(await seancesFemmes(cycleId));
}

/** Les séances enregistrées d'un cycle, dans l'ordre de la table. */
export async function seancesFemmes(cycleId: number): Promise<FemmesSeanceRow[]> {
  return db.femmesSeances.where('cycleId').equals(cycleId).toArray();
}

/**
 * Enregistre un exercice dans sa séance, en créant la séance au besoin.
 *
 * Un exercice déjà noté dans la séance est REMPLACÉ, jamais doublé : revenir
 * sur un exercice pour corriger une répétition ne doit pas compter deux
 * passages dans l'historique des charges.
 *
 * Dans une transaction : la création « lire, ne rien trouver, ajouter »
 * ferait deux lignes si deux validations arrivaient ensemble — l'index
 * unique la refuserait, et la seconde saisie serait perdue.
 */
export async function enregistrerExerciceFemmes(input: {
  cycleId: number;
  semaine: number;
  jour: DayIndex;
  version: Version;
  record: ExerciseRecord;
}): Promise<void> {
  await db.transaction('rw', db.femmesSeances, async () => {
    const existante = await db.femmesSeances
      .where('[cycleId+semaine+jour]')
      .equals([input.cycleId, input.semaine, input.jour])
      .first();
    const autres = (existante?.exercices ?? []).filter(
      (r) => r.exerciseId !== input.record.exerciseId,
    );
    const ligne: FemmesSeanceRow = {
      cycleId: input.cycleId,
      semaine: input.semaine,
      jour: input.jour,
      version: input.version,
      date: aujourdhui(),
      terminee: existante?.terminee ?? false,
      exercices: [...autres, input.record],
    };
    if (existante?.id !== undefined) await db.femmesSeances.put({ ...ligne, id: existante.id });
    else await db.femmesSeances.add(ligne);
  });
}

/**
 * « Séance non faite » : passe la séance sans la faire, ou annule ce choix.
 *
 * Rien n'est effacé : un exercice déjà noté reste noté. Si c'était la
 * dernière séance à passer, le cycle se clôt comme après une séance faite —
 * sinon il resterait ouvert indéfiniment sur une séance qu'on a choisi de
 * laisser. Renvoie `true` quand le cycle vient de se terminer.
 */
export async function marquerSeanceFemmesNonFaite(input: {
  cycleId: number;
  semaine: number;
  jour: DayIndex;
  version: Version;
  nonFaite: boolean;
}): Promise<boolean> {
  await db.transaction('rw', db.femmesSeances, async () => {
    const existante = await db.femmesSeances
      .where('[cycleId+semaine+jour]')
      .equals([input.cycleId, input.semaine, input.jour])
      .first();
    if (existante?.id !== undefined) {
      await db.femmesSeances.update(existante.id, { sautee: input.nonFaite, date: aujourdhui() });
    } else if (input.nonFaite) {
      await db.femmesSeances.add({
        cycleId: input.cycleId,
        semaine: input.semaine,
        jour: input.jour,
        version: input.version,
        date: aujourdhui(),
        terminee: false,
        sautee: true,
        exercices: [],
      });
    }
  });
  return clotSiFini(input.cycleId);
}

/** Clôt le cycle quand plus aucune séance n'attend. `true` s'il vient de se clore. */
async function clotSiFini(cycleId: number): Promise<boolean> {
  if (!avancement(await seancesFemmes(cycleId)).termine) return false;
  const cycle = await db.cycles.get(cycleId);
  if (cycle?.statut === 'termine') return false;
  await terminerCycle(cycleId);
  return true;
}

/**
 * Marque une séance terminée. Si c'était la dernière du programme, le cycle
 * se clôt — c'est ce qui ouvre, au catalogue, la transition 1 ET le cycle 2.
 *
 * Renvoie `true` quand le cycle vient de se terminer.
 */
export async function terminerSeanceFemmes(input: {
  cycleId: number;
  semaine: number;
  jour: DayIndex;
  version: Version;
}): Promise<boolean> {
  await db.transaction('rw', db.femmesSeances, async () => {
    const existante = await db.femmesSeances
      .where('[cycleId+semaine+jour]')
      .equals([input.cycleId, input.semaine, input.jour])
      .first();
    if (existante?.id !== undefined) {
      await db.femmesSeances.update(existante.id, {
        terminee: true,
        sautee: false,
        version: input.version,
        date: aujourdhui(),
      });
    } else {
      // Un circuit terminé sans rien saisir reste une séance faite.
      await db.femmesSeances.add({
        cycleId: input.cycleId,
        semaine: input.semaine,
        jour: input.jour,
        version: input.version,
        date: aujourdhui(),
        terminee: true,
        exercices: [],
      });
    }
  });

  return clotSiFini(input.cycleId);
}

/** La séance (cycle, semaine, jour), lue DANS une transaction déjà ouverte. */
async function ligne(cycleId: number, semaine: number, jour: DayIndex) {
  return db.femmesSeances.where('[cycleId+semaine+jour]').equals([cycleId, semaine, jour]).first();
}

/** Une séance vide, prête à recevoir sa première écriture. */
function neuve(
  cycleId: number,
  semaine: number,
  jour: DayIndex,
  version: Version,
): FemmesSeanceRow {
  return {
    cycleId,
    semaine,
    jour,
    version,
    date: aujourdhui(),
    terminee: false,
    exercices: [],
  };
}

/**
 * Réécrit UN exercice de la séance à partir de son état actuel — un tour
 * validé, un ressenti, une remarque.
 *
 * La lecture et l'écriture sont dans la même transaction : deux tours validés
 * coup sur coup partent tous les deux de la version la plus récente, et le
 * second n'efface jamais le premier.
 */
export async function modifierExerciceFemmes(input: {
  cycleId: number;
  semaine: number;
  jour: DayIndex;
  version: Version;
  exerciseId: string;
  modifier: (ancien: ExerciseRecord | null) => ExerciseRecord;
}): Promise<void> {
  await db.transaction('rw', db.femmesSeances, async () => {
    const existante = await ligne(input.cycleId, input.semaine, input.jour);
    const base = existante ?? neuve(input.cycleId, input.semaine, input.jour, input.version);
    const ancien = base.exercices.find((r) => r.exerciseId === input.exerciseId) ?? null;
    const exercices = [
      ...base.exercices.filter((r) => r.exerciseId !== input.exerciseId),
      input.modifier(ancien),
    ];
    const suite = { ...base, version: input.version, date: aujourdhui(), exercices };
    if (existante?.id !== undefined) await db.femmesSeances.put({ ...suite, id: existante.id });
    else await db.femmesSeances.add(suite);
  });
}

/** L'échauffement coché, ou le démarrage de la séance. */
export async function majSeanceFemmes(input: {
  cycleId: number;
  semaine: number;
  jour: DayIndex;
  version: Version;
  patch: Pick<FemmesSeanceRow, 'echauffement' | 'debut'>;
}): Promise<void> {
  await db.transaction('rw', db.femmesSeances, async () => {
    const existante = await ligne(input.cycleId, input.semaine, input.jour);
    if (existante?.id !== undefined) await db.femmesSeances.update(existante.id, input.patch);
    else
      await db.femmesSeances.add({
        ...neuve(input.cycleId, input.semaine, input.jour, input.version),
        ...input.patch,
      });
  });
}

/**
 * « Séance terminée — annuler » : la séance redevient à faire, sa saisie
 * reste. Comme côté POWER. Le statut du cycle n'est pas touché : rouvrir une
 * séance d'un cycle déjà clos ne le rouvre pas.
 */
export async function rouvrirSeanceFemmes(input: {
  cycleId: number;
  semaine: number;
  jour: DayIndex;
}): Promise<void> {
  await db.transaction('rw', db.femmesSeances, async () => {
    const existante = await ligne(input.cycleId, input.semaine, input.jour);
    if (existante?.id !== undefined)
      await db.femmesSeances.update(existante.id, { terminee: false });
  });
}
