/**
 * La cible PROPOSÉE à la personne, à la fin du questionnaire « Votre plan
 * alimentaire » (`regles-cibles-nutrition.md` §0 et §6 ; lot 1 de la
 * nutrition automatique, Guillaume, 26 novembre : « go lot 1 »).
 *
 * Le calcul est celui du coach, à l'identique : les réponses passent par le
 * résumé envoyé (`resume`) puis par sa relecture (`lireResume`), dont
 * l'aller-retour est vérifié sur 400 profils. Une seule lecture des
 * réponses, donc un seul chiffre possible pour une même personne.
 *
 * Quatre issues, et une seule montre des chiffres :
 * - `sans-objet` : la famille n'est pas concernée (§0 : POWER, FEMMES et
 *   programmes importés ; MASS garde ses principes sans chiffres) ;
 * - `incomplet` : une donnée manque, rien n'est deviné ;
 * - `coach` : un cas du §6 (exclusion ou plancher) — « Ta cible sera posée
 *   par Guillaume », SANS aucun chiffre ;
 * - `proposee` : la cible et le détail du calcul.
 *
 * Pur : aucune base, aucun React.
 */

import type { FamilleId } from '../data/catalogue';
import type { MacrosCompletes } from '../data/ciblesNutrition';
import { calculerCibles, type ResultatCibles } from './calculCibles';
import { lireResume } from './lireResumeQuestionnaire';
import { resume, type EtatQuestionnaire } from './questionnairePlanAlimentaire';

export type PropositionCible =
  | { cas: 'sans-objet' }
  | { cas: 'incomplet'; manquants: string[] }
  | { cas: 'coach' }
  | { cas: 'proposee'; resultat: ResultatCibles };

/** §0 — les familles à qui l'appli propose une cible calculée. */
export const FAMILLES_AVEC_CALCUL: readonly FamilleId[] = ['power', 'femmes', 'perso'];

export function proposerCible(
  etat: EtatQuestionnaire,
  famille: FamilleId | null,
): PropositionCible {
  if (famille === null || !FAMILLES_AVEC_CALCUL.includes(famille)) return { cas: 'sans-objet' };
  const lecture = lireResume(resume(etat));
  if (lecture.profil === null) return { cas: 'incomplet', manquants: lecture.manquants };
  const resultat = calculerCibles(lecture.profil);
  // §6 : exclusion ou sous un plancher → c'est Guillaume qui pose la cible.
  if (!resultat.proposable) return { cas: 'coach' };
  return { cas: 'proposee', resultat };
}

/** Les quatre nombres à enregistrer : la MÊME cible les deux jours (§5). */
export function macrosDe(r: ResultatCibles): MacrosCompletes {
  return { kcal: r.kcal, proteinG: r.proteinG, carbsG: r.carbsG, fatG: r.fatG };
}
