/**
 * Recaler le plan sur ce qui a RÉELLEMENT été soulevé.
 *
 * ── Le défaut que ce fichier corrige ───────────────────────────────────────
 *
 * Le tableau §9 est un PRÉVISIONNEL : des kilos écrits avant le combine, à
 * partir d'estimations. Le RDL y monte de 80 à 95 kg sur sept semaines.
 * Guillaume, lui, en tire 130 depuis la semaine 5.
 *
 * Le décalage cumulé — « ce que j'ai fait moins ce que le plan annonçait » —
 * existait déjà dans `applyProgression`, et il était juste : +35 kg. Mais il
 * n'arrivait jamais à l'écran. La carte affichait le chiffre du tableau, et le
 * vrai chiffre restait dans une suggestion que personne ne voyait, parce que
 * `requiresConfirm` vaut `false` quand le décalage est la seule chose qui
 * change. Résultat en semaine 8 : « Deload : 80 % de la semaine 7 » et 75 kg
 * affichés — 80 % de 95, le prévisionnel, au lieu de 80 % de 130, le réel.
 *
 * ── La règle retenue ───────────────────────────────────────────────────────
 *
 * Un DÉCALAGE est un fait : il s'applique. Un AJUSTEMENT §11 (+2,5 kg parce
 * que le RPE était bas, −5 % après deux séances trop dures) est un jugement :
 * il se propose et s'accepte. La distinction est nette, et c'est elle qui
 * décide de ce qui s'affiche sans rien demander.
 *
 * ── Ce qui n'est jamais recalé ─────────────────────────────────────────────
 *
 * Une charge qui vient DÉJÀ de l'historique — un Hip Thrust autorégulé, un
 * Bulgarian — n'a aucun décalage à recevoir : elle EST la dernière charge
 * réelle. Lui ajouter le décalage le compterait deux fois. Le garde-fou est
 * `source === 'programme'`, et rien d'autre.
 *
 * Pur : aucun React, aucune base.
 */

import type { LoadStep } from '../data/types';
import type { ResolvedLoad } from './loadResolver';
import { roundToStep } from './rounding';
import type { Occurrence } from './types';

/** La dernière occurrence réelle qui sert de référence, et son écart au plan. */
export interface Recalage {
  /** Charge réellement soulevée ce jour-là. */
  refKg: number;
  /** Semaine de cette occurrence, pour pouvoir le dire à l'écran. */
  refWeek: number;
  /** Charge que le plan annonçait ce jour-là, ou `null` si on ne l'a pas. */
  refPlannedKg: number | null;
  /** `refKg − refPlannedKg`, arrondi. 0 quand le plan de l'époque est inconnu. */
  offsetKg: number;
}

/**
 * Ce que l'historique dit, prêt à recaler le plan — ou `null`.
 *
 * `null` quand il n'y a rien de chiffré : première occurrence du mouvement, ou
 * séances enregistrées sans charge. Le plan s'affiche alors tel quel, ce qui
 * est la seule chose honnête à faire.
 *
 * On lit la DERNIÈRE occurrence, pas une moyenne : une moyenne de sept
 * semaines traînerait les charges du début de programme pendant tout le bloc
 * de force.
 */
export function recalageFor(reference: Occurrence[]): Recalage | null {
  for (let i = reference.length - 1; i >= 0; i--) {
    const o = reference[i]!;
    if (o.kg === null || o.kg === undefined) continue;
    return {
      refKg: o.kg,
      refWeek: o.week,
      refPlannedKg: o.plannedKg,
      offsetKg: o.plannedKg === null ? 0 : arrondi(o.kg - o.plannedKg),
    };
  }
  return null;
}

/**
 * Le plan, décalé de l'écart réel — plafond compris.
 *
 * Le plafond suit, et ce n'est pas un détail. Le RDL porte « plafond assumé à
 * 95 kg » pour les semaines 9 à 11 : un plafond écrit en kilos absolus, à une
 * époque où le plan partait de 90. Appliqué tel quel à quelqu'un qui en tire
 * 130, il ferait redescendre de 35 kg au nom d'une limite qui ne parlait pas
 * de lui. Le tableau donne la FORME de la montée — plancher, plafond, écart
 * entre les deux — et le décalage déplace la forme entière.
 */
export function shiftLoad(load: ResolvedLoad, offsetKg: number): ResolvedLoad {
  if (load.kg === null || offsetKg === 0) return load;
  return {
    ...load,
    kg: roundToStep(load.kg + offsetKg, load.step),
    ...(load.kgMax !== undefined ? { kgMax: roundToStep(load.kgMax + offsetKg, load.step) } : {}),
    source: 'historique',
  };
}

/**
 * La charge de deload, calculée sur le RÉEL.
 *
 * C'est la règle que le programme écrit déjà pour les accessoires — « 80 % de
 * la dernière charge réelle » — appliquée aussi aux mouvements dont le tableau
 * chiffre la semaine de deload en kilos absolus. Ces kilos-là sont 80 % d'un
 * prévisionnel ; les recalculer sur le réel leur rend leur sens.
 *
 * Pourquoi pas « plan + décalage » ici : un deload est défini par une
 * PROPORTION de ce qu'on soulève, pas par une soustraction. 75 + 35 donnerait
 * 110, soit 85 % des 130 réels — un deload plus lourd que ce que le programme
 * demande, et d'autant plus lourd que le décalage est grand.
 */
export function deloadFromReal(refKg: number, factor: number, step: LoadStep): number {
  return roundToStep(refKg * factor, step);
}

function arrondi(n: number): number {
  return Math.round(n * 100) / 100;
}
