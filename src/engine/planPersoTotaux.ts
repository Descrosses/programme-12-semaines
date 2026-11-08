/**
 * Ce que pèse un plan composé par la personne elle-même.
 *
 * Pur : aucun React, aucune base. On lui donne une journée, un catalogue, et
 * il rend des nombres — par repas, par groupe, et pour la journée entière.
 *
 * ── Pourquoi il additionne, et rien d'autre ──────────────────────────────
 *
 * Il serait tentant de lui faire proposer des quantités : « il te manque 400
 * kcal, ajoute 110 g de riz ». C'est exactement ce que ce dépôt refuse. Les
 * quantités appartiennent à la personne ; l'application dit où elle en est,
 * elle ne dit pas quoi faire.
 */

import { FOOD_LIBRARY, type LibraryFood } from '../data/foodLibrary';
import {
  GROUPES_REPAS,
  REPAS_PERSO,
  groupeDeFamille,
  type GroupeId,
  type JourneePerso,
  type LignePerso,
  type RepasId,
} from '../data/planPerso';
import type { Macros } from './nutrition';

const ZERO: Macros = { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 };

const somme = (a: Macros, b: Macros): Macros => ({
  kcal: a.kcal + b.kcal,
  proteinG: a.proteinG + b.proteinG,
  carbsG: a.carbsG + b.carbsG,
  fatG: a.fatG + b.fatG,
});

export const arrondirMacros = (m: Macros): Macros => ({
  kcal: Math.round(m.kcal),
  proteinG: Math.round(m.proteinG),
  carbsG: Math.round(m.carbsG),
  fatG: Math.round(m.fatG),
});

/** Le catalogue vu par ce module : la bibliothèque, plus les aliments saisis. */
export type Catalogue = Readonly<Record<string, LibraryFood>>;

/**
 * Ce que pèse une ligne.
 *
 * `per` dit sur quelle base la composition est écrite : 100 pour ce qui se
 * pèse, 1 pour ce qui se compte. Un `per` nul ou absurde ne peut venir que
 * d'une donnée abîmée — on rend zéro plutôt qu'un infini qui ferait exploser
 * le total de la journée.
 */
export function macrosDeLigne(ligne: LignePerso, catalogue: Catalogue): Macros {
  const f = catalogue[ligne.foodId];
  if (!f || !Number.isFinite(f.per) || f.per <= 0) return ZERO;
  /*
   * Une quantité absente pèse zéro, elle n'est pas une erreur : depuis le
   * lot 0, un aliment peut être CHOISI sans que sa quantité soit posée. La
   * ligne existe, elle s'affiche, et elle ne compte pas encore.
   */
  if (ligne.qty === null || !Number.isFinite(ligne.qty) || ligne.qty <= 0) return ZERO;
  const k = ligne.qty / f.per;
  return { kcal: f.kcal * k, proteinG: f.proteinG * k, carbsG: f.carbsG * k, fatG: f.fatG * k };
}

/** Ce que pèse un repas. Non arrondi : c'est une somme intermédiaire. */
export function macrosDeRepas(journee: JourneePerso, repas: RepasId, catalogue: Catalogue): Macros {
  return (journee[repas] ?? []).reduce((acc, l) => somme(acc, macrosDeLigne(l, catalogue)), ZERO);
}

/**
 * Ce que pèse la journée entière.
 *
 * ON ADDITIONNE LES LIGNES, PAS LES REPAS ARRONDIS. Cinq repas arrondis au
 * kcal, c'est jusqu'à 2,5 kcal d'écart avec le vrai total — invisible, et
 * suffisant pour qu'un utilisateur voie « 2 800 » en haut et « 2 798 » en
 * bas et perde confiance dans les deux.
 */
export function macrosDeJournee(journee: JourneePerso, catalogue: Catalogue): Macros {
  return arrondirMacros(
    REPAS_PERSO.reduce((acc, r) => somme(acc, macrosDeRepas(journee, r.id, catalogue)), ZERO),
  );
}

/** Les aliments d'une personne, rangés par groupe de repas. */
export function alimentsParGroupe(
  preferes: readonly string[],
  catalogue: Catalogue = FOOD_LIBRARY,
): Record<GroupeId, LibraryFood[]> {
  const vide = Object.fromEntries(GROUPES_REPAS.map((g) => [g.id, [] as LibraryFood[]])) as Record<
    GroupeId,
    LibraryFood[]
  >;
  for (const id of preferes) {
    const f = catalogue[id];
    if (!f) continue; // un identifiant que le catalogue ne connaît plus
    const g = groupeDeFamille(f.category);
    /*
     * `autre` n'a pas de groupe, et c'est voulu : condiments et
     * hors-catégories n'ont rien à faire dans la construction d'un repas.
     * Ils restent accessibles par « Ajouter un aliment », en bas de l'écran.
     */
    if (g !== null) vide[g].push(f);
  }
  return vide;
}

/**
 * L'écart à la cible. Positif = il reste à manger, négatif = dépassé.
 *
 * `null` quand il n'y a pas de cible : sans elle il n'y a pas d'écart, et un
 * zéro se lirait comme « pile dessus ».
 */
export function ecartACible(total: Macros, cible: Macros | null): Macros | null {
  if (cible === null) return null;
  return arrondirMacros({
    kcal: cible.kcal - total.kcal,
    proteinG: cible.proteinG - total.proteinG,
    carbsG: cible.carbsG - total.carbsG,
    fatG: cible.fatG - total.fatG,
  });
}

/**
 * Les aliments choisis dont la quantité reste à poser, dans toute la journée.
 *
 * L'écran s'en sert pour le dire une fois en haut plutôt que cinq fois dans
 * les repas : « 4 quantités à poser » se lit d'un coup d'œil, et c'est la
 * seule chose qui sépare un plan posé par la bibliothèque d'un plan fini.
 */
export function quantitesAPoser(journee: JourneePerso): number {
  return REPAS_PERSO.reduce(
    (n, r) => n + (journee[r.id] ?? []).filter((l) => l.qty === null).length,
    0,
  );
}
