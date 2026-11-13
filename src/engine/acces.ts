/**
 * Qui a accès à quelle étape du parcours.
 *
 * ── Le parcours POWER, d'après le schéma de Guillaume ──────────────────────
 *
 * Six étapes : cycle 1, transition 1, cycle 2, transition 2, cycle 3,
 * transition finale. Le cycle 1 est ouvert dès l'inscription ; chaque
 * étape suivante s'ouvre quand la précédente est TERMINÉE. Linéaire et
 * complet : pas de saut, pas d'avant-goût.
 *
 * « Terminé » veut dire un cycle au statut `termine`, pas un cycle commencé.
 *
 * Fonction pure : elle lit le catalogue et la liste des cycles.
 */

import { programmeParId, type ProgrammeDefinition } from '../data/catalogue';

export interface Acces {
  ouvert: boolean;
  /** La phrase du badge : « Disponible dès l'inscription », « Se débloque après… ». */
  badge: string;
}

interface CycleMinimal {
  programmeId: string;
  statut: string;
}

/**
 * « le cycle 1 », « la transition 2 » — les mots du schéma. Le préfixe
 * POWER est retiré : on est déjà dans la famille.
 */
export function designation(id: string): string {
  const nom = (programmeParId(id)?.nom ?? id).replace(/^POWER\s+/i, '').toLowerCase();
  if (nom.startsWith('cycle')) return `le ${nom}`;
  if (nom.startsWith('transition')) return `la ${nom}`;
  return nom;
}

export function accesProgramme(
  programme: ProgrammeDefinition,
  cycles: readonly CycleMinimal[],
): Acces {
  const regle = programme.deblocage;
  if (!regle) return { ouvert: true, badge: 'Disponible dès l’inscription' };
  const fait = cycles.some((c) => c.programmeId === regle.apres && c.statut === 'termine');
  return fait
    ? { ouvert: true, badge: `Débloqué : ${designation(regle.apres)} est terminé` }
    : { ouvert: false, badge: `Se débloque après ${designation(regle.apres)}` };
}
