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
