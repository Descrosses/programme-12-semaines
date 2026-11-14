/**
 * MASS FORCE — les fourchettes de charge (lot 5).
 *
 * ── Les paramètres ────────────────────────────────────────────────────────
 *
 * Propres à MASS FORCE, rangés PAR SEMAINE puis par exercice-matériel
 * (l'identifiant de l'option). Seule la semaine 1 est écrite : les
 * fourchettes sont validées pour la S1, pas comme une progression. Une
 * semaine absente n'a AUCUNE fourchette — elle n'hérite pas de la S1.
 *
 * Décisions de Guillaume (lot 5) :
 * - développé couché et tirage vertical : la même fourchette pour les deux
 *   matériels proposés, chacun calculé sur SON propre 1RM ;
 * - squat : la fourchette vise la Smith seulement — la barre libre n'en a pas ;
 * - push press : aucune fourchette (rien n'est déduit du développé couché).
 *
 * Source scientifique de cadrage, pas de calcul : méta-régression Sports
 * Medicine 2024 (PMC10933212). Les fourchettes sont des choix de
 * programmation, pas des moyennes tirées de l'article.
 *
 * ── Le calcul ─────────────────────────────────────────────────────────────
 *
 * Charge = 1RM × % — une fourchette, jamais une charge unique, et SANS
 * arrondi : les paliers de disques ne sont pas connus. Seul un 1RM MESURÉ
 * (test direct) au même exercice ET au même matériel est exploitable : aucune
 * formule d'estimation n'est validée, et rien n'est transposé d'un matériel à
 * l'autre. S'il y en a plusieurs, le plus récent ; un test sous-maximal plus
 * récent ne l'efface pas (il reste enregistré, simplement non utilisé).
 */
import type { ReferenceForceRow } from '../../db/db';
import { VARIANTES } from '../../data/combineMass';
import type { ChargeCible } from '../../engine/getSession';
import { historiqueReferences } from '../../engine/references';
import type { LigneForce, OptionForce } from './types';

/** En pour cent : 82,5 s'écrit 82.5, pour que 100 × 82,5 % tombe juste. */
export interface FourchettePct {
  readonly min: number;
  readonly max: number;
}

export const FOURCHETTES_FORCE: Readonly<Record<number, Readonly<Record<string, FourchettePct>>>> =
  {
    1: {
      'mf-developpe-couche-barre': { min: 75, max: 82.5 },
      'mf-developpe-couche-smith': { min: 75, max: 82.5 },
      'mf-tirage-vertical-poulie': { min: 75, max: 82.5 },
      'mf-tirage-vertical-machine': { min: 75, max: 82.5 },
      'mf-squat-smith': { min: 70, max: 80 },
    },
  };

/** Le 1RM mesuré le plus récent, même exercice, même matériel — ou rien. */
export function unRMMesure(
  references: readonly ReferenceForceRow[],
  exercice: string,
  variante: string,
): ReferenceForceRow | null {
  return (
    historiqueReferences(references, exercice, variante).find((r) => r.modalite === 'direct') ??
    null
  );
}

/**
 * La charge d'une ligne pour une semaine. `null` : charge libre, rien à
 * afficher (les lignes sans test de référence).
 */
export function chargePour(
  ligne: LigneForce,
  option: OptionForce,
  references: readonly ReferenceForceRow[],
  semaine: number,
): ChargeCible | null {
  if (ligne.charge === 'libre') return null;
  const pct = FOURCHETTES_FORCE[semaine]?.[option.id];
  if (pct === undefined || option.test === undefined) return { kind: 'a-determiner' };

  const materiel = VARIANTES[option.test.variante];
  const ref = unRMMesure(references, option.test.exercice, option.test.variante);
  if (ref === null) return { kind: 'a-completer', pctMin: pct.min, pctMax: pct.max, materiel };

  return {
    kind: 'calculee',
    pctMin: pct.min,
    pctMax: pct.max,
    kgMin: (ref.chargeKg * pct.min) / 100,
    kgMax: (ref.chargeKg * pct.max) / 100,
    materiel,
    date: ref.date,
    type: 'mesure',
  };
}
