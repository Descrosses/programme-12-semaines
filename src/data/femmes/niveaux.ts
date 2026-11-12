/**
 * Les trois niveaux de FEMMES 8.
 *
 * ── Un programme, trois réglages. Jamais trois programmes ──────────────────
 *
 * C'est la décision qui tient tout ce fichier : le circuit, les exercices et
 * les répétitions sont écrits UNE fois, dans `phases.ts`. Un niveau n'est pas
 * une copie du programme avec d'autres chiffres, c'est un jeu de paramètres
 * que le moteur applique par-dessus. Dupliquer aurait voulu dire corriger
 * trois fois chaque faute de frappe, et les voir diverger au premier oubli.
 *
 * ── Pourquoi l'intermédiaire ne figure pas comme un écart ──────────────────
 *
 * Le niveau INTERMÉDIAIRE est la base telle qu'elle a été portée : zéro
 * exercice retiré, zéro tour ajouté. Ce n'est pas une facilité d'écriture,
 * c'est ce qui rend les deux autres lisibles — on voit immédiatement ce que
 * débutante enlève et ce que confirmée ajoute, par rapport à un programme qui
 * existe vraiment.
 *
 * ── Les trois leviers, et seulement eux ────────────────────────────────────
 *
 * Décision de Guillaume, validée le 12 novembre : un niveau change le NOMBRE
 * D'EXERCICES, le NOMBRE DE TOURS et l'INTENTION de série. Rien d'autre.
 *
 * En particulier, il ne change NI les charges, NI les répétitions, NI le
 * repos, NI les exercices eux-mêmes. Une débutante fait les mêmes mouvements
 * qu'une confirmée : elle en fait moins, et plus prudemment.
 */

import type { PhaseId } from './types';

export type Niveau = 'debutante' | 'intermediaire' | 'confirmee';

export const NIVEAUX: readonly Niveau[] = ['debutante', 'intermediaire', 'confirmee'];

export const NIVEAU_PAR_DEFAUT: Niveau = 'intermediaire';

export interface NiveauDefinition {
  id: Niveau;
  nom: string;
  /** Une phrase, à l'écran, pour que le choix ne soit pas un pari. */
  pourQui: string;
  /**
   * Tours de circuit par phase. C'est une valeur ABSOLUE et non un écart :
   * lire « 2, 3, 3 » dit tout de suite ce que fait la séance, là où « −1 »
   * oblige à aller chercher la base pour le savoir.
   *
   * La phase 2 de l'intermédiaire est le seul intervalle du programme (3 à
   * 4 tours) ; `null` y laisse la rampe d'origine décider, semaine après
   * semaine. Les autres niveaux la figent.
   */
  tours: Record<PhaseId, number | null>;
  /**
   * La ligne du circuit retirée, par phase. `null` = circuit complet.
   *
   * On désigne un `slotId`, PAS une position. Retirer « le dernier » aurait
   * marché tant que personne ne réordonne le circuit ; le jour où quelqu'un
   * le fait, on retirerait silencieusement un squat. Ici, si l'identifiant
   * disparaît, le test le dit.
   */
  retire: Record<PhaseId, string | null>;
  /** L'intention de série, affichée en tête de séance. */
  intention: string;
}

export const NIVEAU_DEFS: Record<Niveau, NiveauDefinition> = {
  debutante: {
    id: 'debutante',
    nom: 'Débutante',
    pourQui:
      'Tu reprends, ou tu démarres. On installe les mouvements avant d’en demander du volume.',
    tours: { 1: 2, 2: 3, 3: 3 },
    /*
     * Dans les trois phases, la ligne retirée est un exercice de tronc ou
     * d'extension — jamais un pattern fondamental. Squat, charnière, fente et
     * tirage restent intacts aux trois niveaux : c'est la condition pour que
     * débutante et confirmée fassent bien le MÊME programme.
     */
    retire: { 1: 'p1-core', 2: 'p2-fessier', 3: 'p3-dos' },
    intention:
      'Arrête-toi quatre répétitions avant que ça devienne dur. La technique passe avant le compte : une série écourtée proprement vaut mieux qu’une série finie de travers.',
  },
  intermediaire: {
    id: 'intermediaire',
    nom: 'Intermédiaire',
    pourQui: 'Tu connais les mouvements de base et tu t’entraînes déjà régulièrement.',
    tours: { 1: null, 2: null, 3: null },
    retire: { 1: null, 2: null, 3: null },
    intention:
      'Garde deux répétitions en réserve à la fin de chaque tour. Tu dois pouvoir enchaîner le tour suivant sans récupérer plus que le repos prévu.',
  },
  confirmee: {
    id: 'confirmee',
    nom: 'Confirmée',
    pourQui: 'Tu t’entraînes depuis longtemps et tu sais ce qu’est une série difficile.',
    /*
     * Ce niveau ne monte QUE par les tours, et c'est une limite assumée,
     * pas un oubli : ajouter un septième exercice aurait voulu dire en
     * inventer un, ce que le programme s'interdit. Le jour où Guillaume en
     * fournit un, c'est `retire` qui deviendra un `ajoute`.
     */
    tours: { 1: 4, 2: 4, 3: 5 },
    retire: { 1: null, 2: null, 3: null },
    intention:
      'Mène le dernier tour près de l’échec, sans jamais perdre la position. Le jour où la position lâche, la série est finie — même s’il reste des répétitions.',
  },
};

/** La définition d'un niveau, jamais `undefined`. */
export function niveauDef(niveau: Niveau): NiveauDefinition {
  return NIVEAU_DEFS[niveau];
}
