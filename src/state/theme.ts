/**
 * Quel univers graphique afficher, et quand.
 *
 * ── La règle ───────────────────────────────────────────────────────────────
 *
 * Deux niveaux, deux identités :
 *
 * - Dans un PROGRAMME, c'est l'univers de sa famille. POWER est bleu nuit et
 *   rouge, MASS est ardoise claire, blanc et rouge. C'est ce qui donne le
 *   sentiment de changer de programme, et pas seulement de contenu.
 * - Dans la PLATEFORME — accueil, catalogue, parcours — c'est l'identité
 *   Dcross-fit : graphite, blanc et rouge sportif. Elle ne peut pas prendre
 *   les couleurs d'un programme — le catalogue montre les trois familles à la
 *   fois, et l'habiller aux couleurs de l'une d'elles ferait croire à un
 *   classement.
 *
 * C'est exactement ce que montrent les références : un catalogue sombre, et
 * l'application MASS existante, en ardoise claire.
 *
 * ── Pourquoi une fonction et pas trois lignes dans le composant ────────────
 *
 * Parce qu'elle se teste. Une bascule de thème qui se trompe ne plante pas :
 * elle affiche simplement les mauvaises couleurs, ce qu'aucune erreur ne
 * signale et qu'on ne remarque qu'en ouvrant l'écran concerné.
 */

import { programmeParId, type FamilleId } from '../data/catalogue';

/**
 * Les univers graphiques possibles : les trois familles, plus celui de la
 * plateforme elle-même.
 */
export type ThemeId = FamilleId | 'dcross';

/**
 * Le thème de la plateforme : graphite, blanc et rouge sportif.
 *
 * Il valait 'power' tant que la plateforme n'avait pas d'identité propre, et
 * l'accueil portait donc le bleu nuit, le rouge et le stade de POWER 12 — on
 * ne distinguait plus la plateforme du programme qu'elle héberge. Dcross-fit
 * a maintenant ses propres couleurs, et POWER 12 garde les siennes intactes.
 */
export const THEME_PLATEFORME: ThemeId = 'dcross';

/**
 * Le thème à poser sur la racine du document.
 *
 * `programmeId` est celui du cycle courant, ou `null` quand il n'y en a pas.
 * Un programme inconnu — une vieille ligne, un identifiant qui ne figure plus
 * au catalogue — retombe sur le thème de la plateforme plutôt que de laisser
 * l'écran sans couleurs.
 */
export function themePour(
  programmeId: string | null,
  dansPlateforme: boolean,
  /*
   * La famille que l'ÉCRAN impose, quel que soit le cycle actif.
   *
   * Les écrans FEMMES 8 n'ont pas de cycle : ils s'ouvrent en aperçu, depuis
   * le catalogue, pendant qu'un cycle POWER tourne. Sans ce paramètre, le
   * thème suivait le cycle et FEMMES s'affichait en bleu nuit et rouge —
   * bug vu en production le 12 novembre, invisible en test parce que les
   * captures forçaient le thème à la main.
   */
  familleDeLEcran?: FamilleId,
): ThemeId {
  if (familleDeLEcran !== undefined) return familleDeLEcran;
  if (dansPlateforme) return THEME_PLATEFORME;
  if (programmeId === null) return THEME_PLATEFORME;
  return programmeParId(programmeId)?.familleId ?? THEME_PLATEFORME;
}
