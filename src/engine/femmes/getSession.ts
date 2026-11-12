/**
 * Construction d'une séance.
 *
 * Entrée : une case du calendrier (semaine, jour), une version, et le contexte
 * (réglages + historique). Sortie : la séance telle qu'elle doit s'afficher,
 * contre-indications déjà appliquées et charges déjà proposées.
 *
 * Fonction pure : pas de base, pas de React, pas de `Date.now()`.
 */

import { NIVEAU_PAR_DEFAUT, niveauDef, type Niveau } from '../../data/femmes/niveaux';
import { ECHAUFFEMENT, phaseOf } from '../../data/femmes/phases';
import type { DayIndex, ResolvedSlot, Session, Version, WeekIndex } from '../../data/femmes/types';
import { restForWeek, suggestLoad, toursForWeek } from './progression';
import { resolveExercise } from './safety';
import type { SessionContext } from './types';

export function getSession(
  week: WeekIndex,
  day: DayIndex,
  version: Version,
  ctx: SessionContext,
  niveau: Niveau = NIVEAU_PAR_DEFAUT,
): Session {
  const phase = phaseOf(week);
  const def = niveauDef(niveau);

  /*
   * Le niveau RETIRE une ligne, il n'en réécrit aucune.
   *
   * Le circuit reste celui de `phases.ts` : même ordre, mêmes exercices,
   * mêmes répétitions. Une débutante et une confirmée font le même
   * programme — l'une en fait une ligne de moins.
   *
   * On filtre sur le `slotId` et non sur la position : si quelqu'un
   * réordonne un jour le circuit, on continue de retirer le bon exercice,
   * et si l'identifiant disparaît, le test de `niveaux.test.ts` le dit.
   */
  const retire = def.retire[phase.id];
  const circuit =
    retire === null ? phase.circuit : phase.circuit.filter((s) => s.slotId !== retire);

  const slots: ResolvedSlot[] = circuit.map((slot) => {
    const requestedId = version === 'maison' ? slot.maison : slot.salle;
    const { exercise, substitutedFor } = resolveExercise(requestedId, ctx.settings.safety);
    const load = slot.load[version];

    // La charge suit l'exercice réellement retenu : après substitution, c'est
    // l'historique du REPLI qui compte, pas celui de l'exercice écarté.
    const suggestion = suggestLoad(load, ctx.history, exercise.id);

    const resolved: ResolvedSlot = {
      slotId: slot.slotId,
      exercise,
      work: slot.work,
      load,
      kg: suggestion.kg,
    };
    if (slot.note) resolved.note = slot.note;
    if (substitutedFor) resolved.substitutedFor = substitutedFor;
    return resolved;
  });

  return {
    week,
    day,
    version,
    phase: phase.id,
    phaseName: phase.name,
    title: `Semaine ${week} · Séance ${indexInWeek(week, day) + 1}`,
    durationLabel: phase.durationLabel,
    /*
     * Les tours du niveau priment sur ceux de la phase. `null` rend la main
     * à la rampe d'origine — c'est le cas de l'intermédiaire, dont la phase
     * 2 monte de 3 à 4 tours au fil des semaines.
     */
    tours: def.tours[phase.id] ?? toursForWeek(week),
    restSec: restForWeek(week),
    /*
     * L'échauffement est servi à TOUTES les phases. La base d'origine le
     * réservait à la première (c'était une intro respiratoire post-partum) ;
     * on ne commence pas une séance à froid en semaine 8 sous prétexte
     * qu'on est entraînée.
     */
    intro: ECHAUFFEMENT,
    slots,
    niveau,
    /*
     * L'intention du niveau est posée EN TÊTE des notes : c'est la première
     * chose à lire avant d'attaquer, et c'est le seul endroit où le niveau
     * se dit en toutes lettres pendant la séance.
     */
    notes: [def.intention, ...phase.notes],
  };
}

/** Rang de la séance dans sa semaine, pour l'intituler « Séance 2 ». */
export function indexInWeek(week: WeekIndex, day: DayIndex): number {
  const sessions = phaseOf(week).sessionsPerWeek;
  const days: DayIndex[] = sessions === 3 ? [0, 1, 2] : [0, 1, 2, 3];
  return Math.max(0, days.indexOf(day));
}

/** Le raccourci de l'écran séance : combien de lignes, combien de tours. */
export function sessionVolume(session: Session): string {
  return `${session.tours} tours × ${session.slots.length} exercices`;
}

/** Les substitutions actives, pour les annoncer en haut de la séance. */
export function substitutions(session: Session): ResolvedSlot[] {
  return session.slots.filter((s) => s.substitutedFor !== undefined);
}
