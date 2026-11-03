/**
 * Quel univers graphique afficher, et quand.
 *
 * ── La règle ───────────────────────────────────────────────────────────────
 *
 * Deux niveaux, deux identités :
 *
 * - Dans un PROGRAMME, c'est l'univers de sa famille. POWER est bleu nuit et
 *   rouge, MASS est crème et noir. C'est ce qui donne le sentiment de changer
 *   de programme, et pas seulement de changer de contenu.
 * - Dans la PLATEFORME — accueil, catalogue, parcours — c'est l'identité
 *   Dcross-fit, commune à tout le monde. Elle ne peut pas prendre les couleurs
 *   d'un programme : le catalogue montre les trois familles à la fois, et
 *   l'habiller aux couleurs de l'une d'elles ferait croire à un classement.
 *
 * C'est exactement ce que montrent les deux visuels de référence : un
 * catalogue sombre, et un écran de semaine MASS en crème.
 *
 * ── Pourquoi une fonction et pas trois lignes dans le composant ────────────
 *
 * Parce qu'elle se teste. Une bascule de thème qui se trompe ne plante pas :
 * elle affiche simplement les mauvaises couleurs, ce qu'aucune erreur ne
 * signale et qu'on ne remarque qu'en ouvrant l'écran concerné.
 */

import { programmeParId, type FamilleId } from '../data/catalogue';

/** Le thème par défaut : celui de l'application telle qu'elle est née. */
export const THEME_PLATEFORME: FamilleId = 'power';

/**
 * Le thème à poser sur la racine du document.
 *
 * `programmeId` est celui du cycle courant, ou `null` quand il n'y en a pas.
 * Un programme inconnu — une vieille ligne, un identifiant qui ne figure plus
 * au catalogue — retombe sur le thème de la plateforme plutôt que de laisser
 * l'écran sans couleurs.
 */
export function themePour(programmeId: string | null, dansPlateforme: boolean): FamilleId {
  if (dansPlateforme) return THEME_PLATEFORME;
  if (programmeId === null) return THEME_PLATEFORME;
  return programmeParId(programmeId)?.familleId ?? THEME_PLATEFORME;
}
