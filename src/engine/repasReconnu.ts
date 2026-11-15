/**
 * QUEL PLAT DE LA BIBLIOTHÈQUE CE REPAS EST-IL ENCORE ?
 *
 * Pur : aucun React, aucune base.
 *
 * Le plan ne retient pas « tu as choisi la carte X » : il retient des lignes
 * (aliment, quantité). On RECONNAÎT donc le plat à ses ingrédients, sans rien
 * écrire en base — pas de champ neuf, pas de migration, un export inchangé.
 *
 * ── La règle ──────────────────────────────────────────────────────────────
 *
 * Un plat est reconnu tant que TOUS ses ingrédients sont dans le repas.
 *
 * - Les quantités ne comptent pas : 250 g de skyr au lieu de 200, c'est
 *   toujours le même bol.
 * - Un aliment AJOUTÉ ne l'efface pas : le bol avec une banane en plus reste
 *   ce bol.
 * - Un ingrédient REMPLACÉ ou RETIRÉ l'efface. La photo montrerait du skyr
 *   dans une assiette qui n'en contient plus — et la bibliothèque a une
 *   règle : une photo décrit ce qu'elle montre.
 *
 * Seuls les plats proposés pour ce créneau sont candidats. Si plusieurs
 * conviennent, le plus complet gagne (le plus d'ingrédients), puis le premier
 * de la bibliothèque.
 */

import { repasPourCreneau, type RepasBibliotheque } from '../data/bibliothequeRepas';
import type { LignePerso, RepasId } from '../data/planPerso';

export function repasReconnu(
  creneau: RepasId,
  lignes: readonly LignePerso[],
): RepasBibliotheque | null {
  if (lignes.length === 0) return null;
  const presents = new Set(lignes.map((l) => l.foodId));
  let meilleur: RepasBibliotheque | null = null;
  for (const r of repasPourCreneau(creneau)) {
    if (r.lignes.length === 0) continue;
    if (!r.lignes.every((l) => presents.has(l.foodId))) continue;
    if (meilleur === null || r.lignes.length > meilleur.lignes.length) meilleur = r;
  }
  return meilleur;
}
