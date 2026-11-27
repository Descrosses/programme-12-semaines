/**
 * Remplacer un aliment À APPORT ÉGAL (`regles-nutrition-mass.md`, §7 ;
 * Guillaume, 27 novembre : « pour tous les programmes »).
 *
 * Quand un aliment est remplacé par un autre DU MÊME GROUPE, la quantité
 * proposée garde ce pour quoi on le mange : les protéines d'une source de
 * protéines, les glucides d'un féculent, les lipides d'une matière grasse.
 * Les fruits et légumes gardent leur quantité.
 *
 * Ce n'est pas une prescription : la quantité de départ est celle que la
 * personne (ou la semaine composée) avait déjà. On la CONVERTIT, et elle
 * reste modifiable. Pur : aucune base, aucun React.
 */

import { groupeDeFamille } from '../data/planPerso';
import { MACRO_CONSERVEE } from '../data/reglesNutritionMass';
import { ARRONDIS } from '../data/reglesRepasAutomatiques';
import type { Catalogue } from './planPersoTotaux';

export interface Equivalence {
  /** La quantité proposée du nouvel aliment, arrondie (§2 des règles des repas). */
  qty: number;
  /** Ce que la conversion conserve. */
  conserve: 'protéines' | 'glucides' | 'lipides';
}

const NOM: Record<'proteinG' | 'carbsG' | 'fatG', Equivalence['conserve']> = {
  proteinG: 'protéines',
  carbsG: 'glucides',
  fatG: 'lipides',
};

/**
 * La quantité de `nouveau` qui apporte autant que `qty` de `ancien`, ou
 * `null` quand il n'y a rien à convertir : quantité non posée, aliment
 * inconnu, groupes différents, fruits et légumes, ou un aliment qui ne
 * contient pas la macro du groupe (jamais de division par zéro, jamais de
 * quantité inventée).
 */
export function quantiteEquivalente(
  ancien: string,
  qty: number | null,
  nouveau: string,
  catalogue: Catalogue,
): Equivalence | null {
  const [a, n] = [catalogue[ancien], catalogue[nouveau]];
  if (a === undefined || n === undefined || qty === null || qty <= 0 || ancien === nouveau) {
    return null;
  }
  const groupe = groupeDeFamille(a.category);
  if (groupe === null || groupe !== groupeDeFamille(n.category)) return null;
  const macro = MACRO_CONSERVEE[groupe];
  if (macro === null) return null;
  const [parUniteA, parUniteN] = [a[macro] / a.per, n[macro] / n.per];
  if (!(parUniteA > 0) || !(parUniteN > 0)) return null;

  const arrondi = ARRONDIS[n.unit] ?? ARRONDIS.g!;
  const brut = (qty * parUniteA) / parUniteN;
  return {
    qty: Math.max(arrondi.min, Math.round(brut / arrondi.pas) * arrondi.pas),
    conserve: NOM[macro],
  };
}

/** « 210 g », « 250 ml », « 3 unités » — pour dire la conversion à l'écran. */
export function quantiteEnMots(qty: number, unite: string): string {
  if (unite === 'unité') return `${String(qty)} ${qty > 1 ? 'unités' : 'unité'}`;
  return `${String(qty)} ${unite}`;
}
