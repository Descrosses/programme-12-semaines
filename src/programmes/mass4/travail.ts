/**
 * Des répétitions écrites en toutes lettres vers la structure que l'écran sait
 * afficher.
 *
 * ── Pourquoi un analyseur, et pas des données déjà structurées ─────────────
 *
 * Parce que le document écrit des choses qu'aucune structure simple ne porte :
 * « 6 + 10-12 » pour une série lourde suivie d'une dégressive, « 10 + max »
 * pour une dégressive au maximum. Forcer ces lignes dans un `{min, max}`
 * perdrait la moitié de l'information, et inventer un type par technique en
 * ferait quatre.
 *
 * Le texte du document reste donc la vérité affichée, et cette fonction en
 * extrait seulement ce dont le chronomètre et la saisie ont besoin : combien
 * de répétitions viser, et si l'exercice se compte par côté.
 *
 * ── Ce qu'elle ne fait pas ─────────────────────────────────────────────────
 *
 * Elle ne devine rien. Une forme qu'elle ne reconnaît pas rend `null`, et
 * l'appelant affiche le texte tel quel plutôt qu'un chiffre faux.
 */

import type { Work } from '../../data/types';

/** « / bras », « / côté », « / jambe » — le document n'en utilise pas d'autres. */
const COTES: Record<string, 'côté' | 'jambe'> = {
  bras: 'côté',
  côté: 'côté',
  jambe: 'jambe',
};

interface Lu {
  /** Le texte sans le suffixe de côté. */
  corps: string;
  perSide: boolean;
  sideLabel: 'côté' | 'jambe';
}

function detacherLeCote(texte: string): Lu {
  const m = /^(.*?)\s*\/\s*(bras|côté|jambe)\s*$/u.exec(texte);
  if (m === null) return { corps: texte.trim(), perSide: false, sideLabel: 'côté' };
  return {
    corps: (m[1] ?? '').trim(),
    perSide: true,
    sideLabel: COTES[m[2] ?? 'côté'] ?? 'côté',
  };
}

/**
 * La structure de travail d'une ligne, ou `null` si la forme est inconnue.
 *
 * Les formes reconnues, toutes présentes dans le document :
 *   « 12 »            → 12 répétitions
 *   « 8-10 »          → de 8 à 10
 *   « 30 s / côté »   → 30 secondes par côté
 *   « 15 / bras »     → 15 répétitions par bras
 *   « 6 + 10-12 »     → la PREMIÈRE partie, 6 ; le reste est une technique
 *   « 10 + max »      → la première partie, 10
 */
export function travailPour(reps: string): Work | null {
  const { corps, perSide, sideLabel } = detacherLeCote(reps);

  // Une durée : « 30 s ».
  const secondes = /^(\d+)\s*s$/u.exec(corps);
  if (secondes !== null) {
    return { kind: 'time', seconds: Number(secondes[1]), perSide };
  }

  /*
   * Une technique en deux temps : seule la première partie est un nombre de
   * répétitions à viser. La seconde — « 10-12 à 60 % », « max » — est décrite
   * par la technique, et s'affiche telle quelle.
   */
  const premier = corps.split('+')[0]?.trim() ?? '';

  const fourchette = /^(\d+)\s*-\s*(\d+)$/u.exec(premier);
  if (fourchette !== null) {
    return {
      kind: 'reps',
      reps: { min: Number(fourchette[1]), max: Number(fourchette[2]) },
      perSide,
      sideLabel,
    };
  }

  const simple = /^(\d+)$/u.exec(premier);
  if (simple !== null) {
    return { kind: 'reps', reps: Number(simple[1]), perSide, sideLabel };
  }

  return null;
}
