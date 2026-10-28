/**
 * L'objectif de poids de corps — celui de l'utilisateur, pas celui du programme.
 *
 * ── Pourquoi deux bornes séparées dans les réglages ────────────────────────
 *
 * Le graphique ne sait dessiner qu'une bande complète : deux traits et une
 * zone entre eux. Mais on saisit bien une borne après l'autre, et l'écran
 * Réglages se remonte à chaque enregistrement (il prévient son parent, qui
 * rafraîchit). Un brouillon gardé en mémoire d'écran disparaîtrait donc entre
 * les deux saisies — c'est exactement ce qui est arrivé.
 *
 * Les deux bornes vivent donc chacune dans les réglages, chacune pouvant être
 * absente. La bande, elle, se calcule : c'est une vue, pas une donnée.
 *
 * ── Ce que le programme n'impose pas ───────────────────────────────────────
 *
 * Rien. Le §13 a longtemps affiché « 77-80 kg » à tout le monde : c'était le
 * but personnel de l'auteur. Un objectif de poids dépend de la taille, du
 * poste et de ce qu'on cherche ; il n'y a aucune valeur par défaut, et
 * l'absence d'objectif est l'état normal.
 */

/**
 * La bande affichable, ou `null` tant qu'il n'y en a pas.
 *
 * Bornes égales : accepté — « je veux faire 78 kg » est un objectif. Bornes
 * inversées : refusé, on n'affiche rien plutôt que de les retourner dans le
 * dos de l'utilisateur. Zéro : refusé aussi — une valeur inconnue est une
 * absence, jamais un zéro, et un zéro serait ici une cible.
 */
export function bandePoids(
  bas: number | null,
  haut: number | null,
): { min: number; max: number } | null {
  if (bas === null || haut === null) return null;
  if (!Number.isFinite(bas) || !Number.isFinite(haut)) return null;
  if (bas <= 0 || haut <= 0 || bas > haut) return null;
  return { min: bas, max: haut };
}
