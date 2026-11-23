/**
 * Le tempo du jour d'un exercice — fonction pure.
 *
 * Le premier tempo prescrit dont la semaine et le jour conviennent, ou
 * `null` : pas de tempo écrit pour ce jour-là, rien à afficher.
 */
import type { TempoPrescrit } from '../data/types';

export function tempoDuJour(
  tempo: readonly TempoPrescrit[] | undefined,
  semaine: number,
  jour: number,
): string | null {
  const t = tempo?.find(
    (p) =>
      (p.semaines === undefined || p.semaines.includes(semaine)) &&
      (p.jours === undefined || p.jours.includes(jour)),
  );
  return t?.texte ?? null;
}

/**
 * Ce que dit un tempo chiffré (« Tempo 3-1-X-1 »), phase par phase, pour
 * quelqu'un qui n'a jamais lu cette notation (Guillaume, 23 novembre).
 *
 * Ordre usuel de la notation : descente, arrêt en bas, montée, arrêt en
 * haut ; « X » = le plus vite possible. `null` quand le texte n'est pas un
 * tempo chiffré (« Descente 2 s » se lit déjà tel quel).
 */
export function expliquerTempo(texte: string | null): string[] | null {
  if (texte === null) return null;
  const m = /\b([0-9X])-([0-9X])-([0-9X])(?:-([0-9X]))?\b/i.exec(texte);
  if (!m) return null;
  const [, d, b, mo, h] = m.map((x) => x?.toUpperCase());
  const s = (n: string) => `${n} s`;
  const out = [
    d === 'X' ? 'descends le plus vite possible' : `${s(d!)} pour descendre`,
    b === '0'
      ? 'pas d’arrêt en bas'
      : b === 'X'
        ? 'repars aussitôt en bas'
        : `${s(b!)} d’arrêt en bas`,
    mo === 'X' ? 'remonte le plus vite possible (X)' : `${s(mo!)} pour remonter`,
  ];
  if (h !== undefined)
    out.push(h === '0' ? 'pas d’arrêt en haut : enchaîne' : `${s(h)} d’arrêt en haut`);
  return out;
}

export interface PhaseTempo {
  /** Le chiffre du programme, ou « X ». */
  valeur: string;
  libelle: 'descente' | 'en bas' | 'montée' | 'en haut';
  /** « X » : le plus vite possible. */
  explosif: boolean;
}

/**
 * Les phases d'un tempo chiffré, dans l'ordre de la notation, pour les
 * quatre cases de la carte (variante TB, Guillaume, 23 novembre). `null`
 * quand le texte n'est pas un tempo chiffré.
 */
export function phasesTempo(texte: string | null): PhaseTempo[] | null {
  if (texte === null) return null;
  const m = /\b([0-9X])-([0-9X])-([0-9X])(?:-([0-9X]))?\b/i.exec(texte);
  if (!m) return null;
  const libelles = ['descente', 'en bas', 'montée', 'en haut'] as const;
  return m
    .slice(1)
    .map((v, i) => ({ v, l: libelles[i]! }))
    .filter((x): x is { v: string; l: PhaseTempo['libelle'] } => x.v !== undefined)
    .map(({ v, l }) => ({
      valeur: v.toUpperCase(),
      libelle: l,
      explosif: v.toUpperCase() === 'X',
    }));
}
