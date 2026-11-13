/**
 * L'habillage de chaque famille : sa photo et sa teinte.
 *
 * ── Pourquoi un fichier à part ────────────────────────────────────────────
 *
 * Trois écrans montrent les familles — l'accueil en vignettes, le catalogue
 * en grandes cartes, et demain d'autres. Si chacun déclare ses propres
 * couleurs, POWER finit bleu ici et gris là, et personne ne sait lequel fait
 * foi. Ce fichier est la réponse unique.
 *
 * ── Ce qu'il ne contient pas ──────────────────────────────────────────────
 *
 * Aucune logique, aucun programme, aucune donnée sportive. Uniquement de
 * l'habillage : le jour où les photos définitives arrivent, c'est la seule
 * ligne à changer par famille.
 *
 * ── Le rose de FEMMES ─────────────────────────────────────────────────────
 *
 * Il vient de la maquette de Guillaume, pas d'un réflexe. Le brief interdisait
 * explicitement de supposer que cette famille serait rose ; elle l'est parce
 * qu'il l'a dessinée ainsi, et c'est cette maquette qui fait foi.
 */

import type { FamilleId } from './catalogue';
import type { VisuelNom } from './visuels';

export interface HabillageFamille {
  /**
   * La photo de la famille, provisoire.
   *
   * `undefined` quand aucune photo du manifeste ne convient : la carte affiche
   * alors son dégradé seul, plutôt que d'emprunter l'image d'un autre univers.
   */
  readonly photo?: VisuelNom;
  /** La teinte posée sur la photo et portée par les trois barres obliques. */
  readonly teinte: string;
}

export const HABILLAGE: Record<FamilleId, HabillageFamille> = {
  power: { photo: 'sprint', teinte: '#2f7fd0' },
  mass: { photo: 'force', teinte: '#da1d28' },
  /*
   * Sa propre photo, fournie par Guillaume — jamais celle d'un autre
   * programme, qui donnerait une image fausse de ce qu'elle sera. Même
   * traitement que POWER et MASS : photo brute, voile en dégradé par le code.
   */
  femmes: { photo: 'carteFemmes', teinte: '#d4578f' },
  /*
   * Une famille sans style d'entraînement à montrer : elle représente CELUI
   * DE LA PERSONNE. D'où une photo qui ne montre aucun exercice — une
   * silhouette face à ses reflets — fournie par Guillaume. L'ambre la
   * distingue du bleu, du rouge et du rose, et répond à la lumière dorée de
   * la photo.
   */
  perso: { photo: 'cartePerso', teinte: '#c08b2c' },
};
