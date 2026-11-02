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
 * `source !== 'historique'`, et rien d'autre.
 *
 * Il s'est écrit `source === 'programme'` tant que le §9 était en kilos : les
 * deux voulaient dire la même chose. Depuis que le tableau donne des
 * pourcentages, une case du §9 se résout en `'1rm'` — et la condition
 * d'origine a cessé en silence de recaler les quatre lifts principaux, c'est
 * à dire précisément ceux pour qui le décalage compte le plus.
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
  /**
   * `refKg / refPlannedKg` — le même écart, exprimé en PROPORTION.
   *
   * Les deux formes du même fait, et il faut les deux parce que le §9 mêle
   * deux unités. Une case en pourcentage du 1RM se recale en proportion ; une
   * case en kilos (Push Press, RDL) et un LEST se recalent en kilos.
   *
   * `1` quand le plan de l'époque est inconnu : on ne décale alors rien.
   */
  facteur: number;
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
      facteur: o.plannedKg === null || o.plannedKg <= 0 ? 1 : o.kg / o.plannedKg,
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
  /*
   * Plancher à zéro — aucune charge n'est négative.
   *
   * Le cas qui l'a révélé : un écart NÉGATIF reporté sur un lest. Quelqu'un
   * qui tire ses tractions à +10 kg là où le plan en annonce 35 traîne un
   * décalage de −25 ; appliqué à la semaine 8, dont le plan est +15, il
   * donnait « +−10 kg » à l'écran. Une ceinture ne porte pas −10 kg, et le
   * signe doublé disait assez que personne n'avait prévu ce chemin.
   *
   * Zéro est ici une vraie valeur, pas une absence : c'est la traction au
   * poids du corps, et `loadLabel` l'écrit comme telle. En dessous, il
   * faudrait de l'assistance — le programme n'en parle pas, et l'application
   * ne va pas l'inventer.
   */
  const plancher = (v: number) => Math.max(0, roundToStep(v, load.step));
  return {
    ...load,
    kg: plancher(load.kg + offsetKg),
    ...(load.kgMax !== undefined ? { kgMax: plancher(load.kgMax + offsetKg) } : {}),
    source: 'historique',
  };
}

/**
 * Le plan, recalé en PROPORTION — pour les cases écrites en pourcentage.
 *
 * ── Pourquoi un décalage en kilos ne marche pas sur un pourcentage ─────────
 *
 * Le §9 donne une intensité : 89 % en semaine 7, 70 % en semaine 8. Soulever
 * 107,5 kg là où le plan annonçait 97,5 (89 % de 110) ne dit pas « +10 kg »,
 * ça dit « ton maximum vaut 120, pas 110 ». Reporter les +10 kg tels quels sur
 * la semaine 8 donne 87,5 kg, soit 72,4 % de 120 — alors que le programme
 * demande 70 %, et qu'une semaine de deload est exactement celle où on ne veut
 * PAS de charge en trop.
 *
 * L'erreur vaut `(pct_référence − pct_semaine) × (facteur − 1) / facteur` :
 * nulle quand les deux semaines partagent la même intensité, maximale sur les
 * deloads. Elle était invisible dans le bloc de force, où toutes les semaines
 * tournent autour de 85 %, et grossissait là où ça compte.
 *
 * La proportion, elle, revient à relire le tableau sur le maximum que la
 * performance implique : `plan × (réel / prévu)` = `pct × 1RM_impliqué`. Les
 * deux calculs sont le même, et c'est pour ça que celui-ci est le bon.
 *
 * ── Ce qui reste en kilos ──────────────────────────────────────────────────
 *
 * Un LEST n'est pas une charge : +10 kg à la ceinture restent +10 kg, que la
 * semaine demande 44 % ou 78 %, parce que le corps porte le reste. Et une case
 * que le programme écrit en kilos (Push Press, RDL) n'a pas de pourcentage à
 * mettre à l'échelle — sa progression est en paliers de 2,5 kg.
 */
export function scaleToReal(load: ResolvedLoad, facteur: number): ResolvedLoad {
  if (load.kg === null || facteur === 1) return load;
  return {
    ...load,
    kg: roundToStep(load.kg * facteur, load.step),
    ...(load.kgMax !== undefined ? { kgMax: roundToStep(load.kgMax * facteur, load.step) } : {}),
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
