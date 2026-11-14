/**
 * Les mots de l'écran Aujourd'hui qui dépendent du programme, hors séance.
 *
 * Ils étaient ceux de POWER 12 pour tous : un cycle MASS FORCE annonçait le
 * « combine initial » de POWER, et « 12 semaines bouclées » à la fin d'un
 * cycle de quatre. Seul un programme qui commence par une semaine 0 a un
 * combine initial.
 */
import type { ModuleProgramme } from './types';

export interface TextesCycle {
  /** Sous-titre avant le départ : « Combine initial » ou « Semaine 1 ». */
  sousAvant: string;
  /** Début de la phrase d'attente : « Premier jour du combine initial ». */
  attente: string;
  /** Titre de fin : « 12 semaines bouclées ». */
  fin: string;
  /** Le renvoi vers la comparaison des combines n'a de sens que pour POWER. */
  comparerCombines: boolean;
  /** Un onglet Nutrition « à venir » n'a rien à résumer : pas de raccourci. */
  raccourciNutrition: boolean;
}

export function textesCycle(programme: ModuleProgramme | null): TextesCycle {
  const combine = programme === null || programme.semaines.includes(0);
  return {
    sousAvant: combine ? 'Combine initial' : 'Semaine 1',
    attente: combine ? 'Premier jour du combine initial' : 'Première séance',
    fin: `${programme?.dureeSemaines ?? 12} semaines bouclées`,
    comparerCombines: combine,
    raccourciNutrition: programme?.onglets.find((o) => o.route === 'nutrition')?.vue !== 'a-venir',
  };
}
