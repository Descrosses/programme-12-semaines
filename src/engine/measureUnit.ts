/**
 * Mètres ou pas sur place — et jamais l'un converti en l'autre.
 *
 * ── Le problème réel ───────────────────────────────────────────────────────
 *
 * Le Zercher March est prescrit en mètres : 2 × 12 m. Dans une salle pleine,
 * douze mètres en ligne droite n'existent pas. Guillaume marche alors sur
 * place, et compte ses pas. C'est le même exercice, la même intention, la même
 * contrainte sur le tronc — mais ce n'est pas la même mesure.
 *
 * ── Pourquoi aucune conversion ─────────────────────────────────────────────
 *
 * Il serait tentant d'écrire « 1 pas ≈ 0,65 m » et de tout ramener en mètres.
 * Ce serait faux de deux façons. D'abord la longueur de pas n'est pas une
 * constante : elle change avec la charge, la fatigue et la surface — c'est
 * d'ailleurs ce qu'on cherche à stabiliser. Ensuite et surtout, un pas sur
 * place n'est PAS un pas en avant : il n'y a ni élan, ni demi-tour, ni
 * décélération. Convertir fabriquerait un historique de mètres que Guillaume
 * n'a jamais parcourus, et le ferait progresser sur un chiffre inventé.
 *
 * Donc : l'unité voyage avec chaque série, et deux unités ne se comparent
 * jamais. La règle de progression ne regarde de toute façon que des kilos.
 *
 * Le programme, lui, ne change pas : il prescrit toujours des mètres. Le
 * choix est une façon de FAIRE la séance, pas une modification du plan.
 */

/** Les deux façons de chiffrer un porté. */
export type MeasureUnitId = 'm' | 'pas';

export interface UnitOption {
  id: MeasureUnitId;
  /** Ce qui s'affiche sur le bouton et à côté du chiffre. */
  label: string;
  /**
   * L'intitulé du champ de saisie.
   *
   * Le curseur affiche « <intitulé> · <unité> ». « Distance · m » va de soi ;
   * « Distance · pas » se lisait de travers, puisque compter ses pas sur place
   * n'est pas mesurer une distance — et « Pas · pas » encore plus mal. D'où
   * « Nombre · pas ».
   */
  fieldLabel: string;
  /** Pas du stepper +/−. */
  step: number;
  min: number;
  max: number;
}

/**
 * Les pas montent plus haut que les mètres, parce qu'ils comptent autrement :
 * dix-huit pas valent une douzaine de mètres, et quarante pas sur place
 * restent une série raisonnable là où quarante mètres sont déjà longs.
 *
 * Même pas de curseur pour les deux : cinq. La saisie au clavier reste
 * ouverte sur le chiffre pour les valeurs qui tombent entre deux crans — on
 * ne compte pas ses pas de cinq en cinq.
 */
export const DISTANCE_UNITS: Record<MeasureUnitId, UnitOption> = {
  m: { id: 'm', label: 'm', fieldLabel: 'Distance', step: 5, min: 5, max: 200 },
  pas: { id: 'pas', label: 'pas', fieldLabel: 'Nombre', step: 5, min: 5, max: 300 },
};

export const UNIT_CHOICE: UnitOption[] = [DISTANCE_UNITS.m, DISTANCE_UNITS.pas];

/** L'unité par défaut d'un porté : celle que le programme prescrit. */
export const UNIT_DEFAULT: MeasureUnitId = 'm';

/** Est-ce une unité connue ? Une ligne ancienne porte `undefined`, pas « pas ». */
export function isUnitId(u: string | null | undefined): u is MeasureUnitId {
  return u === 'm' || u === 'pas';
}

/**
 * L'unité d'une série, avec son repli.
 *
 * `undefined` sur une ligne écrite avant que le champ n'existe : elle était
 * forcément en mètres, puisque c'était la seule possibilité. On le dit
 * explicitement plutôt que de laisser un `null` se promener — un `null`
 * finirait par être affiché, ou comparé à autre chose.
 */
export function unitOf(row: { measureUnit?: string | null }): MeasureUnitId {
  return isUnitId(row.measureUnit) ? row.measureUnit : UNIT_DEFAULT;
}

/** La configuration du stepper pour cette unité. */
export function unitConfig(u: MeasureUnitId): UnitOption {
  return DISTANCE_UNITS[u];
}

/**
 * Le choix m/pas est-il proposé sur ce mouvement ?
 *
 * Sur les mouvements mesurés en MÈTRES, et eux seuls. Un saut se mesure en
 * centimètres et un sprint en secondes : « pas » n'y veut rien dire. Une tenue
 * isométrique non plus.
 *
 * Tous les portés en bénéficient, pas seulement le Zercher March : la raison
 * du choix — ne pas avoir la place de marcher en ligne droite — vaut
 * identiquement pour le Farmer Carry, le Suitcase Carry et le Bear Crawl.
 * Réserver l'option à un seul exercice aurait obligé à la rouvrir au premier
 * jour où la salle est pleine.
 */
export function hasUnitChoice(measureUnit: string | null | undefined): boolean {
  return measureUnit === 'm';
}

/**
 * L'unité à présélectionner : la dernière réellement utilisée sur ce
 * mouvement.
 *
 * On remonte l'historique à l'envers et on s'arrête à la première série qui
 * portait une mesure. S'il n'y en a aucune, le programme fait foi : mètres.
 *
 * Mémoriser le choix dans un réglage aurait été un deuxième endroit où vit la
 * même information — et le jour où les deux divergent, l'écran propose une
 * unité que l'historique contredit.
 */
export function lastUnitUsed(
  occurrences: Array<{ measureUnit?: string | null; measure?: number | null }> | undefined,
): MeasureUnitId {
  for (let i = (occurrences?.length ?? 0) - 1; i >= 0; i--) {
    const o = occurrences![i]!;
    if (o.measure === null || o.measure === undefined) continue;
    return unitOf(o);
  }
  return UNIT_DEFAULT;
}

/**
 * Deux mesures sont-elles comparables ?
 *
 * La seule question que pose ce fichier, et la seule réponse acceptable :
 * uniquement si elles portent la même unité. Il n'y a pas de « à peu près ».
 */
export function comparable(
  a: { measureUnit?: string | null },
  b: { measureUnit?: string | null },
): boolean {
  return unitOf(a) === unitOf(b);
}

/**
 * La valeur sur laquelle ouvrir le champ quand on change d'unité.
 *
 * Surtout PAS la valeur courante : passer de 12 m à 12 pas en changeant
 * seulement l'étiquette écrirait un chiffre que personne n'a fait. On repart
 * donc de ce qui a du sens dans la NOUVELLE unité — la dernière valeur
 * enregistrée dans cette unité, à défaut ce que le plan prescrit quand on
 * revient aux mètres, à défaut le minimum du curseur.
 */
export function valueForUnit(
  u: MeasureUnitId,
  opts: {
    /** Dernière mesure enregistrée dans CETTE unité, si elle existe. */
    lastInUnit?: number | null;
    /** Ce que le plan prescrit — toujours en mètres. */
    plannedMeters?: number | null;
  },
): number {
  if (opts.lastInUnit !== null && opts.lastInUnit !== undefined) return opts.lastInUnit;
  if (u === 'm' && opts.plannedMeters !== null && opts.plannedMeters !== undefined) {
    return opts.plannedMeters;
  }
  return DISTANCE_UNITS[u].min;
}

/**
 * La dernière mesure enregistrée dans une unité donnée, ou `null`.
 *
 * Sert au repli ci-dessus et à la pré-saisie du champ. Aucune série d'une
 * autre unité n'est regardée, même pour « approcher » : il n'y a pas
 * d'approximation acceptable entre un mètre et un pas.
 */
export function lastMeasureIn(
  occurrences: Array<{ measureUnit?: string | null; measure?: number | null }> | undefined,
  u: MeasureUnitId,
): number | null {
  for (let i = (occurrences?.length ?? 0) - 1; i >= 0; i--) {
    const o = occurrences![i]!;
    if (o.measure === null || o.measure === undefined) continue;
    if (unitOf(o) === u) return o.measure;
  }
  return null;
}
