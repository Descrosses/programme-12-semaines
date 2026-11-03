/**
 * POWER 12 vu comme un module de programme.
 *
 * Ce fichier n'ajoute AUCUNE logique. Il enveloppe ce qui existait déjà et le
 * présente sous l'interface commune, pour que l'application puisse demander
 * une séance sans savoir à quel programme elle parle.
 *
 * C'est délibérément mince. Tout ce qui fait POWER 12 — la trame des séances,
 * les règles de bloc, le tableau du §9, le recalage, le feu tricolore —
 * continue de vivre exactement où il vivait, et n'a pas été touché. C'est la
 * raison pour laquelle l'empreinte du programme est restée identique après
 * cette étape : il n'y avait rien à changer pour qu'elle le reste.
 */

import {
  DUREE_SEMAINES,
  SEMAINES,
  blocDeLaSemaine,
  couleurDuBloc,
  joursDeLaSemaine,
} from '../data/program';
import type { DayIndex } from '../data/types';
import { getSession } from '../engine/getSession';
import type { SessionContext } from '../engine/types';
import type { ModuleProgramme } from './types';

export const POWER12: ModuleProgramme = {
  id: 'power12',

  /*
   * Exactement la barre que l'application a toujours eue, déplacée ici sans
   * rien y changer : mêmes libellés, mêmes pictogrammes, même ordre. Elle
   * vivait dans `App.tsx`, en dur, ce qui l'imposait à tous les programmes.
   */
  onglets: [
    { route: 'today', label: 'Aujourd’hui', icon: 'play', vue: 'today' },
    { route: 'week', label: 'Semaine', icon: 'calendar', vue: 'week' },
    { route: 'nutrition', label: 'Nutrition', icon: 'meal', vue: 'nutrition' },
    { route: 'progress', label: 'Progrès', icon: 'chart', vue: 'progress' },
    { route: 'combine', label: 'Combine', icon: 'stopwatch', vue: 'combine' },
    { route: 'settings', label: 'Réglages', icon: 'settings', vue: 'settings' },
  ],

  /*
   * Mot pour mot ce que l'écran Réglages affichait avant que ces textes
   * appartiennent au programme : un test le verrouille, parce que « ne perdre
   * aucune fonctionnalité existante » vaut aussi pour les libellés.
   */
  reglages: {
    eyebrow: 'Programme 12 semaines',
    visuel: 'athlete',
    refPoids: '§12',
    // Les 1RM et la référence de broad jump pilotent le §9 et le feu tricolore.
    force: true,
  },

  dureeSemaines: DUREE_SEMAINES,
  semaines: SEMAINES,
  joursDeLaSemaine,
  blocDeLaSemaine,
  couleurDuBloc,
  getSession(week: number, day: DayIndex, ctx: SessionContext) {
    return getSession(week, day, ctx);
  },
};
