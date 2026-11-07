/**
 * L'écart entre deux combines : de combien, et est-ce un progrès ?
 *
 * ── Pourquoi c'est un module et pas trois lignes dans l'écran ─────────────
 *
 * Parce que la règle est lue à DEUX endroits — le tableau de comparaison en
 * haut de l'écran Combine, et le rappel posé au-dessus de chaque champ de
 * saisie — et que les deux doivent dire la même chose. Quand la règle vivait
 * dans l'écran, le tableau colorait déjà une prise de poids en vert sans que
 * personne ne l'ait décidé.
 */

/**
 * Les mesures où un chiffre PLUS BAS est meilleur.
 *
 * Les chronos, et eux seuls. Un sprint plus court est un sprint plus rapide,
 * et une flèche qui monterait à côté d'un nombre qui descend mentirait.
 */
export const LOWER_IS_BETTER: ReadonlySet<string> = new Set(['test-sprint-10m', 'test-sprint-20m']);

/**
 * Les mesures où monter ou descendre n'est PAS un jugement.
 *
 * Le poids de corps, et lui seul. Pour tout le reste, le programme dit dans
 * quel sens va le progrès. Pour le poids, non : le §13 ne lui donne aucune
 * cible, et il l'écrit — une bande de kilos est l'objectif personnel de
 * quelqu'un, pas une recommandation de santé qu'on impose à un inconnu.
 *
 * Afficher « +1 kg » en vert, c'est pourtant exactement ça : l'application
 * féliciterait une prise de poids et sanctionnerait une perte, sans rien
 * savoir de qui la lit. L'écart reste affiché, c'est une information ; c'est
 * la couleur qui part.
 */
export const SANS_JUGEMENT: ReadonlySet<string> = new Set(['test-bodyweight']);

export interface EcartCombine {
  /** La différence brute, dans l'unité de la mesure. */
  ecart: number;
  /** La même, en pourcentage du départ — l'unité du §13. */
  pct: number;
  /** `true` progrès, `false` recul, `null` quand ça ne se juge pas. */
  mieux: boolean | null;
}

/**
 * L'écart depuis une mesure de départ, ou `null` s'il n'y a rien à comparer.
 *
 * LE DÉPART EST TOUJOURS LE COMBINE INITIAL, jamais la mesure précédente.
 * C'est le repère du §13 : les cibles sont des progressions sur douze
 * semaines, pas sur quatre. Un écart lu depuis la semaine 8 dirait autre
 * chose que l'objectif affiché dans le même écran.
 *
 * Un zéro ou un négatif en entrée vaut « pas de mesure » : on ne calcule pas
 * un pourcentage sur un départ qui n'existe pas, et aucune de ces mesures ne
 * peut valoir zéro pour de bon.
 */
export function ecartCombine(
  id: string,
  depart: number | null | undefined,
  actuel: number | null | undefined,
): EcartCombine | null {
  if (typeof depart !== 'number' || !Number.isFinite(depart) || depart <= 0) return null;
  if (typeof actuel !== 'number' || !Number.isFinite(actuel) || actuel <= 0) return null;

  const ecart = actuel - depart;
  const pct = (ecart / depart) * 100;
  const mieux =
    ecart === 0 || SANS_JUGEMENT.has(id) ? null : LOWER_IS_BETTER.has(id) ? ecart < 0 : ecart > 0;

  return { ecart, pct, mieux };
}
