/**
 * Ce qu'un programme doit savoir faire pour que Dcross-fit sache le jouer.
 *
 * ── Pourquoi une interface, et pas une refonte du moteur ───────────────────
 *
 * Le moteur de POWER 12 importe ses données en dur : la trame des séances,
 * les règles de bloc, le tableau du §9, les tests du combine. C'est très bien
 * ainsi — ces quatre fichiers SONT POWER 12, et les paramétrer reviendrait à
 * dissoudre un programme éprouvé dans une abstraction.
 *
 * La couture est donc posée AU-DESSUS. L'application ne demande plus une
 * séance à « le moteur », elle la demande à « un module de programme ». POWER
 * 12 en est un, qui enveloppe le moteur existant sans en changer une ligne.
 * MASS 4 en sera un autre, avec ses propres règles.
 *
 * ── Ce que l'interface porte, et ce qu'elle ne porte pas ───────────────────
 *
 * Elle porte la STRUCTURE : combien de semaines, quels jours, quel bloc, et
 * comment construire une séance. Elle ne porte aucune notion de charge, de
 * pourcentage ni de progression : ce sont des détails internes à chaque
 * programme, et deux programmes n'ont aucune raison de les partager.
 *
 * C'est ce qui permet à MASS 4 de n'avoir presque aucun moteur — ses charges
 * sont autorégulées, et sa progression tient en une série optionnelle à
 * partir de la semaine 2.
 */

import type { IconName } from '../components/Icon';
import type { VisuelNom } from '../data/visuels';
import type { DayIndex } from '../data/types';
import type { ResolvedSession } from '../engine/getSession';
import type { SessionContext } from '../engine/types';

/**
 * Les routes que la barre du bas peut viser.
 *
 * C'est ce qui s'écrit dans l'URL, et ça ne change pas d'un programme à
 * l'autre : `#/nutrition` reste `#/nutrition` en MASS comme en POWER, même si
 * l'écran qui répond n'est pas le même. Un lien gardé en favori continue donc
 * de fonctionner après un changement de programme.
 */
export type RouteOnglet =
  | 'today'
  | 'week'
  | 'nutrition'
  | 'progress'
  | 'combine'
  | 'mesures'
  | 'settings';

/**
 * Quel écran répond à un onglet.
 *
 * Distinct de la route, et c'est tout l'intérêt : deux programmes peuvent
 * avoir un onglet « Nutrition » à la même adresse et deux écrans différents
 * derrière. POWER y met son plan au gramme près, MASS ses principes — parce
 * que le document de MASS ne chiffre AUCUNE calorie, et qu'afficher celles de
 * POWER sous un programme MASS était précisément le défaut à corriger.
 */
export type VueProgramme =
  | 'today'
  | 'week'
  | 'nutrition'
  | 'nutrition-principes'
  | 'progress'
  | 'progress-volume'
  | 'combine'
  | 'mesures'
  | 'settings';

/** Ce qu'un programme pose sur l'écran Réglages, qu'il partage avec les autres. */
export interface ReglagesProgramme {
  /** Au-dessus du titre, en petites capitales : « Programme 12 semaines ». */
  readonly eyebrow: string;
  /**
   * La photo d'ambiance, quand le programme en a une.
   *
   * `undefined` n'est pas un oubli : un programme sans jeu de photos n'affiche
   * AUCUNE photo, il n'emprunte pas celle d'un autre. MASS 4 est dans ce cas
   * — ses visuels restent à produire — et montrer l'athlète de POWER à sa
   * place donnait une image de football américain dans un programme de
   * bodybuilding.
   */
  readonly visuel?: VisuelNom;
  /**
   * La référence du document pour le relevé de poids, ex. « §12 ».
   *
   * `null` quand le document du programme ne numérote pas ses sections. La
   * consigne, elle, reste affichée : c'est la référence qui disparaît, pas la
   * règle.
   */
  readonly refPoids: string | null;
  /**
   * Les maximums testés et la référence de broad jump ont-ils un sens ici ?
   *
   * `false` pour MASS 4, dont les charges sont autorégulées : ces deux blocs
   * n'ont alors rien à régler, et les afficher laissait croire que le
   * programme s'en servait. Les valeurs restent en base, simplement masquées.
   */
  readonly force: boolean;
}

/** Une entrée de la barre du bas, telle que le programme la déclare. */
export interface OngletProgramme {
  readonly route: RouteOnglet;
  readonly label: string;
  readonly icon: IconName;
  readonly vue: VueProgramme;
}

export interface ModuleProgramme {
  /** Identifiant du catalogue : `power12`, `mass4`. */
  readonly id: string;

  /**
   * Les onglets de la barre du bas, dans l'ordre d'affichage.
   *
   * ── Pourquoi c'est le programme qui les déclare ─────────────────────────
   *
   * Parce que sinon c'est l'application qui le fait, en dur, et elle ne peut
   * les écrire qu'une seule fois. C'est ce qui s'est passé : la barre portait
   * les six onglets de POWER 12, et un cycle MASS affichait donc un onglet
   * Combine qui demande des 1RM à un programme qui n'en prescrit aucun, et un
   * onglet Progrès qui trace une courbe de développé couché dans un programme
   * où le développé couché ne figure pas.
   *
   * Déclarer les onglets ici rend ce défaut impossible à reproduire : un
   * programme ne peut plus hériter d'un écran qu'il n'a pas demandé.
   */
  readonly onglets: readonly OngletProgramme[];

  /**
   * Ce que le programme met dans l'écran Réglages.
   *
   * ── Pourquoi un groupe, et pas quatre drapeaux ──────────────────────────
   *
   * Réglages est le seul écran que deux programmes PARTAGENT réellement : la
   * date de début, le poids de corps, la sauvegarde et la remise à zéro n'ont
   * rien de spécifique à l'un ou à l'autre. Tout le reste de l'écran, en
   * revanche, était écrit pour POWER 12 et se voyait sous MASS : une photo de
   * joueur de football américain, un bandeau « Programme 12 semaines » au-
   * dessus d'un programme de quatre semaines, et un récapitulatif annonçant
   * « squat le lundi, deadlift le jeudi, bench le vendredi » pour un
   * programme qui ne contient aucun des trois.
   *
   * Chaque programme écrit donc ses propres mots sur cet écran, au lieu
   * d'hériter de ceux du premier arrivé.
   */
  readonly reglages: ReglagesProgramme;

  /** Semaines d'entraînement, hors semaine 0. */
  readonly dureeSemaines: number;

  /**
   * Toutes les semaines du programme, semaine 0 comprise quand elle existe.
   *
   * POWER 12 commence par un combine initial, donc 0 à 12. Un programme qui
   * n'en a pas commencera à 1. L'interface ne tranche pas pour eux.
   */
  readonly semaines: readonly number[];

  /** Les jours portés par une semaine. Vide hors programme, jamais `undefined`. */
  joursDeLaSemaine(week: number): readonly DayIndex[];

  /** Le bloc de périodisation d'une semaine, ou `null` hors programme. */
  blocDeLaSemaine(week: number): string | null;

  /** La couleur du bloc, pour les bandeaux et les pastilles. */
  couleurDuBloc(week: number): string;

  /**
   * La séance d'une case du calendrier, entièrement résolue.
   *
   * `null` quand la case ne porte pas de séance — un jour de repos, une
   * semaine hors programme. C'est la même règle que dans POWER 12 : refuser
   * plutôt qu'inventer une séance.
   */
  getSession(week: number, day: DayIndex, ctx: SessionContext): ResolvedSession | null;
}

/**
 * La partie de l'interface dont le calendrier a besoin, et rien de plus.
 *
 * `schedule` et `locateToday` ne construisent aucune séance : ils posent des
 * dates sur une structure. Leur demander le module entier les lierait au
 * moteur pour rien, et créerait un cycle d'imports entre `engine/calendar` et
 * `programmes/power12`, qui dépend lui-même du moteur.
 */
export interface StructureProgramme {
  readonly semaines: readonly number[];
  joursDeLaSemaine(week: number): readonly DayIndex[];
}
