/**
 * MASS FORCE — les fourchettes de charge (lot 5).
 *
 * ── Les paramètres ────────────────────────────────────────────────────────
 *
 * Propres à MASS FORCE, rangés par exercice-matériel (l'identifiant de
 * l'option). Depuis le lot 6, la fourchette est le COULOIR de la progression
 * S1 → S4 : la première séance part du bas, la progression (`progression.ts`)
 * ne dépasse jamais le haut.
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
 * Charge = 1RM × % — la fourchette, et la cible de la séance dedans (lot 6),
 * SANS arrondi : les paliers de disques ne sont pas connus. Seul un 1RM MESURÉ
 * (test direct) au même exercice ET au même matériel est exploitable : aucune
 * formule d'estimation n'est validée, et rien n'est transposé d'un matériel à
 * l'autre. S'il y en a plusieurs, le plus récent ; un test sous-maximal plus
 * récent ne l'efface pas (il reste enregistré, simplement non utilisé).
 */
import type { ReferenceForceRow, SetRow } from '../../db/db';
import { VARIANTES } from '../../data/combineMass';
import type { ChargeCible } from '../../engine/getSession';
import { historiqueReferences } from '../../engine/references';
import { etatForce, passagesDe, repsPrescrites } from './progression';
import type { FourchettePct, LigneForce, OptionForce } from './types';

export type { FourchettePct } from './types';

export const FOURCHETTES_FORCE: Readonly<Record<string, FourchettePct>> = {
  'mf-developpe-couche-barre': { min: 75, max: 82.5 },
  'mf-developpe-couche-smith': { min: 75, max: 82.5 },
  'mf-tirage-vertical-poulie': { min: 75, max: 82.5 },
  'mf-tirage-vertical-machine': { min: 75, max: 82.5 },
  'mf-squat-smith': { min: 70, max: 80 },
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
 * La charge d'une ligne pour une séance de la semaine `semaine`. `null` :
 * charge libre, rien à afficher (lignes sans test de référence).
 *
 * `series` : les séries brutes du cycle. Seules celles d'AVANT cette semaine
 * comptent — une séance ne se prescrit jamais à partir d'elle-même.
 */
export function chargePour(
  ligne: LigneForce,
  option: OptionForce,
  references: readonly ReferenceForceRow[],
  semaine: number,
  series: readonly SetRow[] = [],
): ChargeCible | null {
  if (ligne.charge === 'libre') return null;
  const f = FOURCHETTES_FORCE[option.id];
  if (f === undefined || option.test === undefined) return { kind: 'a-determiner' };

  const materiel = VARIANTES[option.test.variante];
  const etat = etatForce({
    passages: passagesDe(series, option.id, semaine),
    fourchette: f,
    references,
    exercice: option.test.exercice,
    variante: option.test.variante,
    prescrit: { series: ligne.series, reps: repsPrescrites(ligne) },
  });
  if (etat.kind === 'sans-reference') {
    return { kind: 'a-completer', pctMin: f.min, pctMax: f.max, materiel };
  }
  if (etat.kind === 'suspendu') {
    return { kind: 'suspendue', pctMin: f.min, pctMax: f.max, materiel, motif: etat.motif };
  }
  return {
    kind: 'calculee',
    pctMin: f.min,
    pctMax: f.max,
    kgMin: (etat.ancre * f.min) / 100,
    kgMax: (etat.ancre * f.max) / 100,
    pctCible: etat.pct,
    kgCible: (etat.ancre * etat.pct) / 100,
    motif: etat.motif,
    materiel,
    date: etat.reference?.date ?? '',
    type: 'mesure',
  };
}
