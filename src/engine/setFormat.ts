/**
 * Le format RÉELLEMENT fait, écrit comme on le dirait à voix haute.
 *
 * ── Ce que ça résout ───────────────────────────────────────────────────────
 *
 * L'encart « la dernière fois » donnait la charge la plus lourde de la séance
 * et le RPE le plus élevé : « 115 kg · RPE 8 ». Deux chiffres justes, et une
 * information manquante — combien de séries, de combien de reps. Or c'est
 * exactement ce qu'il faut savoir avant de charger la barre : 5 × 3 à 115 kg
 * et 2 × 3 à 115 kg sont deux séances différentes, et la seconde ne justifie
 * pas de monter la semaine suivante.
 *
 * ── Les séries hétérogènes ─────────────────────────────────────────────────
 *
 * Une séance ne se déroule pas toujours comme prévu : la quatrième série casse
 * à deux reps. Résumer ça par « 4 × 3 » serait un mensonge, et détailler
 * « 3 + 3 + 3 + 2 » noierait l'information. On regroupe donc les séries
 * identiques CONSÉCUTIVES : « 3 × 3 × 115 kg + 1 × 2 × 115 kg ».
 *
 * Au-delà de trois groupes, la forme change : une suite de « 1 × » n'est plus
 * lisible et on énumère les reps. C'est le seul endroit où l'affichage perd en
 * détail, et il concerne une séance dont aucune série ne ressemble à la
 * précédente — cas où le détail série par série se lit de toute façon
 * au-dessus, dans les lignes validées.
 *
 * Pur, sans React et sans base : les quinze cas se vérifient en une seconde.
 */

import { fr } from './format';

/** Une série telle qu'elle a été enregistrée. */
export interface PerformedSet {
  reps: number | null;
  kg: number | null;
  /** Distance, temps, nombre de pas — pour les mouvements qui ne comptent pas des reps. */
  measure?: number | null;
  /** Unité de la mesure (« m », « pas », « cm », « s »). */
  measureUnit?: string | null;
}

/** Au-delà, on énumère au lieu d'empiler des « 1 × ». */
const MAX_GROUPES = 3;

interface Groupe {
  count: number;
  reps: number | null;
  kg: number | null;
  measure: number | null;
  unit: string | null;
}

/**
 * « 5 × 3 × 115 kg », « 3 × 3 × 115 kg + 1 × 2 × 115 kg », « 2 × 12 m × 20 kg ».
 *
 * `null` quand il n'y a rien à dire : aucune série, ou des séries validées
 * sans le moindre chiffre. Mieux vaut ne rien afficher qu'un format vide.
 */
export function performedFormat(sets: PerformedSet[]): string | null {
  const chiffrees = sets.filter(
    (s) => s.reps !== null || (s.measure !== null && s.measure !== undefined),
  );
  if (chiffrees.length === 0) return null;

  const groupes = grouper(chiffrees);

  if (groupes.length <= MAX_GROUPES) {
    return groupes.map(labelGroupe).join(' + ');
  }

  /*
   * Trop de groupes : on énumère. La charge sort du lot si elle est la même
   * partout — sinon elle resterait collée à chaque valeur et la ligne
   * deviendrait illisible.
   */
  const kgs = new Set(chiffrees.map((s) => s.kg));
  const charge =
    kgs.size === 1 && chiffrees[0]!.kg !== null ? ` × ${fr(chiffrees[0]!.kg!)} kg` : '';
  const valeurs = groupes.map((g) => (g.measure !== null ? fr(g.measure) : String(g.reps ?? 0)));
  const unite = groupes[0]!.unit ? ` ${groupes[0]!.unit}` : '';
  return `${chiffrees.length} séries : ${valeurs.join(', ')}${unite}${charge}`;
}

/** Séries identiques consécutives, regroupées. */
function grouper(sets: PerformedSet[]): Groupe[] {
  const groupes: Groupe[] = [];
  for (const s of sets) {
    const measure = s.measure ?? null;
    const unit = s.measureUnit ?? null;
    const dernier = groupes[groupes.length - 1];
    if (
      dernier &&
      dernier.reps === s.reps &&
      dernier.kg === s.kg &&
      dernier.measure === measure &&
      dernier.unit === unit
    ) {
      dernier.count += 1;
    } else {
      groupes.push({ count: 1, reps: s.reps, kg: s.kg, measure, unit });
    }
  }
  return groupes;
}

function labelGroupe(g: Groupe): string {
  const travail =
    g.measure !== null ? `${fr(g.measure)}${g.unit ? ` ${g.unit}` : ''}` : String(g.reps ?? 0);
  const charge = g.kg !== null ? ` × ${fr(g.kg)} kg` : '';
  return `${g.count} × ${travail}${charge}`;
}
