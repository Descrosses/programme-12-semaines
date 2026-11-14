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

import { familleParId, programmeParId, type FamilleId } from './catalogue';
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
  /**
   * Les photos d'en-tête de la famille, écran par écran. Absent : les écrans
   * gardent leur comportement d'origine (POWER choisit les siennes lui-même).
   */
  readonly entetes?: Readonly<Record<EcranEntete, VisuelNom>>;
  /** Le nom de la famille s'affiche en très gros sur l'Accueil (maquette MASS). */
  readonly marqueAccueil?: true;
}

/** Les quatre écrans d'un cycle qui portent une photo d'en-tête. */
export type EcranEntete = 'accueil' | 'semaine' | 'seance' | 'combine';

export const HABILLAGE: Record<FamilleId, HabillageFamille> = {
  power: { photo: 'sprint', teinte: '#2f7fd0' },
  /*
   * Les quatre en-têtes viennent des maquettes de Guillaume (14 novembre),
   * pour toute la famille MASS : FORCE comme CONGESTION.
   */
  mass: {
    photo: 'force',
    teinte: '#da1d28',
    marqueAccueil: true,
    entetes: {
      accueil: 'massAthlete',
      semaine: 'massDisque',
      seance: 'massSalle',
      combine: 'massDisques',
    },
  },
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

/** La photo d'en-tête d'un écran pour ce programme, si sa famille en a une. */
export function enteteDe(programmeId: string, ecran: EcranEntete): VisuelNom | undefined {
  const def = programmeParId(programmeId);
  return def === null ? undefined : HABILLAGE[def.familleId]?.entetes?.[ecran];
}

/** Le nom de famille à afficher en marque sur l'Accueil, lu au catalogue. */
export function marqueDe(programmeId: string): string | undefined {
  const def = programmeParId(programmeId);
  if (def === null || HABILLAGE[def.familleId]?.marqueAccueil !== true) return undefined;
  return familleParId(def.familleId)?.nom;
}

/**
 * L'en-tête PERMANENT de l'Accueil, pour une famille qui pose sa marque
 * (MASS) : la marque, le nom exact du cycle tel qu'au catalogue, puis
 * « Semaine X / Y ». `null` ailleurs : POWER garde son en-tête du jour.
 *
 * Décision de Guillaume : « Ça commence bientôt » est un état temporaire, pas
 * l'identité du programme. Le titre du jour descend sous l'en-tête.
 */
export function enteteAccueilFixe(
  programmeId: string,
  dureeSemaines: number,
  semaine: number | null,
): { marque: string; titre: string; sous: string | undefined } | null {
  const marque = marqueDe(programmeId);
  if (marque === undefined) return null;
  return {
    marque,
    titre: programmeParId(programmeId)?.nom ?? marque,
    sous: semaine === null ? undefined : `Semaine ${semaine} / ${dureeSemaines}`,
  };
}
