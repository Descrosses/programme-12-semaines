/**
 * Ce qu'un programme doit savoir faire pour que Dcross-fit sache le jouer.
 *
 * ── Pourquoi une interface, et pas une refonte du moteur ───────────────────
 *
 * Le moteur de POWER 12 importe ses données en dur : la trame des séances,
 * les règles de bloc, le tableau du §9, les tests du combine. C'est très bien
 * ainsi — ces quatre fichiers SONT POWER 12, et les paramétrer reviendrait à
 * dissoudre un programme éprouvé dans une abstraction.
 *
 * La couture est donc posée AU-DESSUS. L'application ne demande plus une
 * séance à « le moteur », elle la demande à « un module de programme ». POWER
 * 12 en est un, qui enveloppe le moteur existant sans en changer une ligne.
 * MASS 4 en sera un autre, avec ses propres règles.
 *
 * ── Ce que l'interface porte, et ce qu'elle ne porte pas ───────────────────
 *
 * Elle porte la STRUCTURE : combien de semaines, quels jours, quel bloc, et
 * comment construire une séance. Elle ne porte aucune notion de charge, de
 * pourcentage ni de progression : ce sont des détails internes à chaque
 * programme, et deux programmes n'ont aucune raison de les partager.
 *
 * C'est ce qui permet à MASS 4 de n'avoir presque aucun moteur — ses charges
 * sont autorégulées, et sa progression tient en une série optionnelle à
 * partir de la semaine 2.
 */

import type { DayIndex } from '../data/types';
import type { ResolvedSession } from '../engine/getSession';
import type { SessionContext } from '../engine/types';

export interface ModuleProgramme {
  /** Identifiant du catalogue : `power12`, `mass4`. */
  readonly id: string;

  /** Semaines d'entraînement, hors semaine 0. */
  readonly dureeSemaines: number;

  /**
   * Toutes les semaines du programme, semaine 0 comprise quand elle existe.
   *
   * POWER 12 commence par un combine initial, donc 0 à 12. Un programme qui
   * n'en a pas commencera à 1. L'interface ne tranche pas pour eux.
   */
  readonly semaines: readonly number[];

  /** Les jours portés par une semaine. Vide hors programme, jamais `undefined`. */
  joursDeLaSemaine(week: number): readonly DayIndex[];

  /** Le bloc de périodisation d'une semaine, ou `null` hors programme. */
  blocDeLaSemaine(week: number): string | null;

  /** La couleur du bloc, pour les bandeaux et les pastilles. */
  couleurDuBloc(week: number): string;

  /**
   * La séance d'une case du calendrier, entièrement résolue.
   *
   * `null` quand la case ne porte pas de séance — un jour de repos, une
   * semaine hors programme. C'est la même règle que dans POWER 12 : refuser
   * plutôt qu'inventer une séance.
   */
  getSession(week: number, day: DayIndex, ctx: SessionContext): ResolvedSession | null;
}

/**
 * La partie de l'interface dont le calendrier a besoin, et rien de plus.
 *
 * `schedule` et `locateToday` ne construisent aucune séance : ils posent des
 * dates sur une structure. Leur demander le module entier les lierait au
 * moteur pour rien, et créerait un cycle d'imports entre `engine/calendar` et
 * `programmes/power12`, qui dépend lui-même du moteur.
 */
export interface StructureProgramme {
  readonly semaines: readonly number[];
  joursDeLaSemaine(week: number): readonly DayIndex[];
}
