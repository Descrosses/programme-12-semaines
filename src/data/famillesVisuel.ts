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
import { programmeEnMemoire } from '../programmes/perso/memoire';
import { THEME_IMPORTE_DEFAUT, type ThemeImporte } from './themesImportes';

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
  readonly entetes?: Readonly<Partial<Record<EcranEntete, VisuelNom>>>;
  /**
   * Les sous-titres de la planche de bandeaux de la famille, écran par écran
   * (ME, MYSELF & I, bandeaux de Guillaume du 25 novembre). Absent : chaque
   * écran garde le sien.
   */
  readonly sousTitres?: Readonly<Partial<Record<EcranEntete, string>>>;
  /** Le nom de la famille s'affiche devant la date de l'Accueil (MASS, ME, MYSELF & I). */
  readonly marqueAccueil?: true;
  /**
   * Le grand titre de l'Accueil. `cycle` (défaut, MASS) : le nom du cycle,
   * « Semaine X / Y » dessous. `onglet` (ME, MYSELF & I, maquette du
   * 25 novembre) : « Aujourd'hui », et le nom du programme importé passe
   * dans le sous-titre avec la semaine.
   */
  readonly titreAccueil?: 'cycle' | 'onglet';
}

/** Les quatre écrans d'un cycle qui portent une photo d'en-tête. */
export type EcranEntete =
  | 'accueil'
  | 'semaine'
  | 'seance'
  | 'combine'
  | 'nutrition'
  | 'progres'
  | 'mesures'
  | 'reglages';

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
      // Bandeaux du 14 novembre, pour toute la famille (FORCE et CONGESTION).
      nutrition: 'massNutrition',
      progres: 'massProgres',
      mesures: 'massMesures',
      reglages: 'massReglages',
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
  perso: {
    photo: 'cartePerso',
    teinte: '#c08b2c',
    marqueAccueil: true,
    titreAccueil: 'onglet',
    /*
     * Les quatre bandeaux de Guillaume (25 novembre). Ses fichiers portaient
     * le titre INCRUSTÉ : seule la partie photo est reprise, le titre est
     * écrit par l'appli. La séance n'a pas de bandeau (aucun fourni).
     */
    entetes: {
      accueil: 'persoAujourdhui',
      semaine: 'persoSemaine',
      progres: 'persoProgres',
      reglages: 'persoReglages',
    },
    // Mot pour mot ceux des bandeaux.
    sousTitres: {
      accueil: 'Ma séance du jour',
      semaine: 'Mon programme',
      progres: 'Mes évolutions',
      reglages: 'Mon programme',
    },
  },
};

/*
 * ME, MYSELF & I — les bandeaux d'un programme importé selon le THÈME choisi
 * (lot 1 du 26 novembre). C'est la SEULE exception à la règle « chaque image
 * reste dans son programme » : elle ne vaut que pour un programme importé,
 * et seulement sur le choix explicite de la personne. POWER et MASS, eux,
 * gardent exactement leurs photos (`HABILLAGE` n'est pas touché).
 *
 * POWER n'a pas de bandeaux de famille : ce sont ceux que POWER 12 affiche
 * (stade, semaine, sprint, athlète). La séance d'un programme importé n'a
 * pas de bandeau, quel que soit le thème.
 */
export const BANDEAUX_IMPORTES: Readonly<
  Record<ThemeImporte, Readonly<Partial<Record<EcranEntete, VisuelNom>>>>
> = {
  perso: HABILLAGE.perso.entetes ?? {},
  power: {
    accueil: 'stade',
    semaine: 'semainePower',
    progres: 'sprint',
    reglages: 'athlete',
  },
  mass: {
    accueil: 'massAthlete',
    semaine: 'massDisque',
    progres: 'massProgres',
    reglages: 'massReglages',
  },
  femmes: {
    accueil: 'femmesAujourdhui',
    semaine: 'femmesSemaine',
    reglages: 'femmesReglages',
  },
};

/** Le fond du bloc fiche d'un exercice sans fiche, selon le thème choisi. */
const AMBIANCE_IMPORTES: Readonly<Record<ThemeImporte, VisuelNom>> = {
  perso: 'cartePerso',
  power: 'sprint',
  mass: 'massSalle',
  femmes: 'carteFemmes',
};

/** Le thème choisi pour un programme importé ; `null` pour les autres programmes. */
export function themeImporteDe(programmeId: string): ThemeImporte | null {
  if (programmeParId(programmeId)?.familleId !== 'perso') return null;
  return programmeEnMemoire(programmeId)?.theme ?? THEME_IMPORTE_DEFAUT;
}

/**
 * La famille dont l'écran prend les COULEURS : la sienne, sauf pour un
 * programme importé, qui prend le thème choisi. Les textes (sur-titre
 * « ME, MYSELF & I », nom du programme) restent ceux de sa famille.
 */
export function familleVisuelle(programmeId: string): FamilleId | null {
  const def = programmeParId(programmeId);
  if (def === null) return null;
  return themeImporteDe(programmeId) ?? def.familleId;
}

/** La photo d'en-tête d'un écran pour ce programme, si sa famille en a une. */
export function enteteDe(programmeId: string, ecran: EcranEntete): VisuelNom | undefined {
  const def = programmeParId(programmeId);
  if (def === null) return undefined;
  const theme = themeImporteDe(programmeId);
  if (theme !== null) return BANDEAUX_IMPORTES[theme][ecran];
  return HABILLAGE[def.familleId]?.entetes?.[ecran];
}

/**
 * Le sur-titre et le sous-titre du bandeau d'un écran, pour une famille qui
 * a sa planche de bandeaux (ME, MYSELF & I) ; `null` ailleurs.
 */
export function titresBandeauDe(
  programmeId: string,
  ecran: EcranEntete,
): { marque: string; sous: string } | null {
  const def = programmeParId(programmeId);
  const sous = def === null ? undefined : HABILLAGE[def.familleId]?.sousTitres?.[ecran];
  const marque = def === null ? undefined : familleParId(def.familleId)?.nom;
  return sous === undefined || marque === undefined ? null : { marque, sous };
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
): {
  marque: string;
  titre: string;
  sous: string | undefined;
  /** Le nom du programme et la semaine, écrits SOUS l'en-tête (ME, MYSELF & I). */
  detail?: string;
} | null {
  const marque = marqueDe(programmeId);
  if (marque === undefined) return null;
  const def = programmeParId(programmeId);
  if (def !== null && HABILLAGE[def.familleId]?.titreAccueil === 'onglet') {
    // Le bandeau dit « Ma séance du jour » ; le nom du programme importé
    // (écrit tel quel, texte verbatim) et la semaine descendent dessous.
    const semaineTexte = semaine === null ? null : `semaine ${semaine} / ${dureeSemaines}`;
    return {
      marque,
      titre: 'Aujourd’hui',
      sous: HABILLAGE[def.familleId]?.sousTitres?.accueil,
      detail: [def.nom, semaineTexte].filter((x) => x !== null).join(' · '),
    };
  }
  return {
    marque,
    titre: programmeParId(programmeId)?.nom ?? marque,
    sous: semaine === null ? undefined : `Semaine ${semaine} / ${dureeSemaines}`,
  };
}

/*
 * Le fond du bloc « fiche technique » d'un exercice SANS fiche (lot F3, audit
 * des fiches MASS). Par défaut, la photo de la famille. MASS FORCE prend une
 * photo MASS déjà intégrée — la salle de son en-tête de séance — au lieu de
 * la photo de famille `force`, qui vient du pack de POWER (un joueur de
 * football américain au développé couché). Seul MASS FORCE change : POWER
 * et MASS CONGESTION gardent exactement leur fond.
 */
const AMBIANCE_FICHE: Readonly<Record<string, VisuelNom>> = {
  'mass-force': 'massSalle',
};

/** Le fond du bloc fiche technique pour ce programme, ou `null`. */
export function ambianceFicheDe(programmeId: string): VisuelNom | null {
  const propre = AMBIANCE_FICHE[programmeId];
  if (propre !== undefined) return propre;
  const theme = themeImporteDe(programmeId);
  if (theme !== null) return AMBIANCE_IMPORTES[theme];
  const def = programmeParId(programmeId);
  return def === null ? null : (HABILLAGE[def.familleId]?.photo ?? null);
}
