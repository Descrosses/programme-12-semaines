/**
 * Le comparatif « Avant · Après » à publier (Guillaume, 23 novembre :
 * variante B2, thème POWER). Pur : aucun React, aucune base, aucun canvas.
 *
 * Il compare le COMBINE INITIAL (semaine 0) aux TESTS FINAUX (semaine 12),
 * les deux combines du cycle : c'est là que l'appli mesure, pas en semaine 1.
 *
 * Règles :
 * - une mesure absente s'écrit « non mesuré S0 » ou « non mesuré S12 »
 *   (décision de Guillaume) — jamais 0, jamais une ligne qui disparaît ;
 * - vert = progrès, rouge = recul : le jugement est celui de l'écran Combine
 *   (`ecartCombine`) — un sprint plus court est un progrès ;
 * - rien n'est calculé au-delà de l'écart : ni estimation, ni projection.
 */

import { ecartCombine } from './combineEcart';
import { fr } from './format';

/** Les quatre barres puis les deux tuiles, dans l'ordre de la maquette validée. */
export const BARRES_COMPARATIF = [
  { id: 'test-squat-1rm', libelle: 'Back Squat', unite: 'kg', prefixe: '' },
  { id: 'test-bench-1rm', libelle: 'Bench Press', unite: 'kg', prefixe: '' },
  { id: 'test-deadlift-1rm', libelle: 'Deadlift', unite: 'kg', prefixe: '' },
  { id: 'test-weighted-pullup-1rm', libelle: 'Tractions lestées', unite: 'kg', prefixe: '+' },
] as const;

export const TUILES_COMPARATIF = [
  { id: 'test-broad-jump', libelle: 'Broad Jump', unite: 'cm', prefixe: '' },
  { id: 'test-sprint-10m', libelle: 'Sprint 10 m', unite: 's', prefixe: '' },
] as const;

type Mesure = (typeof BARRES_COMPARATIF)[number] | (typeof TUILES_COMPARATIF)[number];

export interface LigneComparatif {
  id: string;
  libelle: string;
  depart: number | null;
  arrivee: number | null;
  /** « 140 kg », ou « non mesuré S0 ». */
  departTexte: string;
  /** « 152,5 kg », ou « non mesuré S12 ». */
  arriveeTexte: string;
  /** « +9 % », « +10 kg », « +16 cm », « −0,08 s » ; `null` sans les deux mesures. */
  ecartTexte: string | null;
  /** `true` progrès (vert), `false` recul (rouge), `null` égal ou incomparable. */
  mieux: boolean | null;
  /** Barres seulement : longueurs relatives (0 à 1) du départ et de l'arrivée. */
  barre: { depart: number; arrivee: number } | null;
}

const valeur = (m: Record<string, number | null> | null, id: string): number | null => {
  const v = m?.[id];
  return typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : null;
};

const signe = (x: number) => (x > 0 ? '+' : x < 0 ? '−' : '±');

function ligne(
  mesure: Mesure,
  initial: Record<string, number | null> | null,
  final: Record<string, number | null> | null,
  avecBarre: boolean,
): LigneComparatif {
  const depart = valeur(initial, mesure.id);
  const arrivee = valeur(final, mesure.id);
  const texte = (v: number) => `${mesure.prefixe}${fr(v)} ${mesure.unite}`;
  const e = ecartCombine(mesure.id, depart, arrivee);
  let ecartTexte: string | null = null;
  if (e !== null) {
    // Les 1RM en % (l'unité du §13), sauf le lest des tractions, en kilos
    // (un % d'un lest n'a pas de sens) ; sauts et chronos dans leur unité.
    ecartTexte =
      mesure.unite === 'kg' && mesure.prefixe === ''
        ? `${signe(e.pct)}${fr(Math.abs(Math.round(e.pct)))} %`
        : `${signe(e.ecart)}${fr(Math.abs(e.ecart))} ${mesure.unite}`;
  }
  let barre: LigneComparatif['barre'] = null;
  if (avecBarre && depart !== null && arrivee !== null) {
    // La plus grande des deux occupe 82 % de la piste : l'écart reste lisible.
    const echelle = Math.max(depart, arrivee) / 0.82;
    barre = { depart: depart / echelle, arrivee: arrivee / echelle };
  }
  return {
    id: mesure.id,
    libelle: mesure.libelle,
    depart,
    arrivee,
    departTexte: depart === null ? 'non mesuré S0' : texte(depart),
    arriveeTexte: arrivee === null ? 'non mesuré S12' : texte(arrivee),
    ecartTexte,
    mieux: e?.mieux ?? null,
    barre,
  };
}

export interface Comparatif {
  barres: LigneComparatif[];
  tuiles: LigneComparatif[];
  /** Au moins une mesure du combine final : sans elle, rien à comparer. */
  pret: boolean;
}

export function comparatif(
  initial: Record<string, number | null> | null,
  final: Record<string, number | null> | null,
): Comparatif {
  const barres = BARRES_COMPARATIF.map((m) => ligne(m, initial, final, true));
  const tuiles = TUILES_COMPARATIF.map((m) => ligne(m, initial, final, false));
  const pret = [...barres, ...tuiles].some((l) => l.arrivee !== null);
  return { barres, tuiles, pret };
}
