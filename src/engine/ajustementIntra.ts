/**
 * §11 cas 10 — l'ajustement en cours d'exercice, après la 1re série.
 *
 * Décision de Guillaume : la question « on monte ou on baisse ? » arrivait
 * trop tard, après toutes les séries. Ici, dès la 1re série notée, on compare
 * son RPE à la cible et on propose une charge pour les séries RESTANTES :
 *
 * - RPE ≥ 1,5 point sous le bas de la cible → +5 kg bas du corps, +2,5 kg
 *   haut du corps (incréments du cas 2), arrondi au pas, plafond respecté ;
 * - RPE ≥ 1 point au-dessus du haut de la cible → −5 %, arrondi au pas
 *   inférieur ;
 * - rep ratée → cas 5 tout de suite : −7,5 %, arrondi au pas inférieur ;
 * - sinon → rien.
 *
 * Une proposition, jamais un changement silencieux : l'écran demande. Pur :
 * ni base, ni React.
 */
import { PROGRESSION_RULES } from '../data/program';
import type { LoadStep, RPETarget } from '../data/types';
import { capKg, floorToStep, roundToStep } from './rounding';

/** Ce que le moteur de séance sait de l'exercice, posé seulement s'il est éligible. */
export interface ParametresIntra {
  isLowerBody: boolean;
  step: LoadStep;
  kgMax?: number;
}

export interface PremiereSerie {
  kg: number | null;
  rpe: number | null;
  failed: boolean;
}

export interface PropositionIntra {
  sens: 'monter' | 'baisser';
  kg: number;
  raison: string;
}

const EPS = 1e-9;
const fr = (n: number) => String(n).replace('.', ',');

export function propositionApresPremiereSerie(
  p: ParametresIntra,
  cible: RPETarget | null,
  serie: PremiereSerie,
): PropositionIntra | null {
  const kg = serie.kg;
  if (kg === null || kg <= 0) return null;
  const regles = PROGRESSION_RULES.apresPremiereSerie;

  if (serie.failed) {
    const nouvelle = floorToStep(kg * PROGRESSION_RULES.missedRep.loadFactor, p.step);
    if (nouvelle >= kg || nouvelle <= 0) return null;
    return {
      sens: 'baisser',
      kg: nouvelle,
      raison: `Rep ratée à la 1re série (cas 5) : on ne retente pas. −7,5 % sur les séries restantes, à RPE 8 au plus.`,
    };
  }

  if (cible === null || serie.rpe === null) return null;

  if (cible.min - serie.rpe >= regles.rpeSousCibleAuMoins - EPS) {
    const bump = p.isLowerBody
      ? PROGRESSION_RULES.wayTooEasy.lowerBodyKg
      : PROGRESSION_RULES.wayTooEasy.upperBodyKg;
    const { kg: nouvelle } = capKg(roundToStep(kg + bump, p.step), p.kgMax);
    if (nouvelle <= kg) return null; // plafond déjà atteint : rien à proposer
    return {
      sens: 'monter',
      kg: nouvelle,
      raison: `RPE ${fr(serie.rpe)} à la 1re série pour ${cible.label} : beaucoup trop facile. +${fr(bump)} kg sur les séries restantes.`,
    };
  }

  if (serie.rpe - cible.max >= regles.rpeAuDessusAuMoins - EPS) {
    const nouvelle = floorToStep(kg * regles.baisseFacteur, p.step);
    if (nouvelle >= kg || nouvelle <= 0) return null;
    return {
      sens: 'baisser',
      kg: nouvelle,
      raison: `RPE ${fr(serie.rpe)} à la 1re série pour ${cible.label} : trop dur. −5 % sur les séries restantes.`,
    };
  }

  return null;
}
