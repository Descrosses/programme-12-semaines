/**
 * Qui a accès à quel programme.
 *
 * ── La filière POWER, décidée par Guillaume ────────────────────────────────
 *
 * POWER 12 1.0 est ouvert à tous. TRANSITION 4 s'ouvre quand 1.0 est
 * terminé. POWER 12 2.0 s'ouvre en deux temps : sa SEMAINE 1 dès la fin de
 * 1.0, en avant-goût, et tout le reste seulement après TRANSITION 4. Sauter
 * la transition, c'est arriver sur 2.0 sans les points faibles retravaillés
 * et sans la technique de ses nouveaux exercices.
 *
 * « Terminé » veut dire un cycle au statut `termine`, pas un cycle commencé.
 *
 * Fonction pure : elle lit le catalogue et la liste des cycles.
 */

import { programmeParId, type ProgrammeDefinition } from '../data/catalogue';

export type NiveauAcces = 'ouvert' | 'premiere-semaine' | 'verrouille';

export interface Acces {
  niveau: NiveauAcces;
  /** La phrase à afficher, ou `null` quand tout est ouvert. */
  raison: string | null;
}

interface CycleMinimal {
  programmeId: string;
  statut: string;
}

const nomDe = (id: string) => programmeParId(id)?.nom ?? id;

function termine(id: string, cycles: readonly CycleMinimal[]): boolean {
  return cycles.some((c) => c.programmeId === id && c.statut === 'termine');
}

export function accesProgramme(
  programme: ProgrammeDefinition,
  cycles: readonly CycleMinimal[],
): Acces {
  const regle = programme.deblocage;
  if (!regle) return { niveau: 'ouvert', raison: null };

  if (termine(regle.complet, cycles)) return { niveau: 'ouvert', raison: null };

  if (regle.premiereSemaine !== undefined && termine(regle.premiereSemaine, cycles)) {
    return {
      niveau: 'premiere-semaine',
      raison: `Semaine 1 ouverte. La suite se débloque à la fin de ${nomDe(regle.complet)}.`,
    };
  }

  return {
    niveau: 'verrouille',
    raison:
      regle.premiereSemaine !== undefined
        ? `Semaine 1 à la fin de ${nomDe(regle.premiereSemaine)}, la suite à la fin de ${nomDe(regle.complet)}.`
        : `Se débloque à la fin de ${nomDe(regle.complet)}.`,
  };
}

/** La semaine demandée est-elle jouable avec cet accès ? */
export function semaineAccessible(acces: Acces, semaine: number): boolean {
  if (acces.niveau === 'ouvert') return true;
  if (acces.niveau === 'premiere-semaine') return semaine <= 1;
  return false;
}
