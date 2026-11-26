/**
 * La liste de courses de la semaine de repas (`regles-courses.md`) — lot 3
 * de la nutrition automatique. Pur : aucune base, aucun React.
 *
 * Elle additionne les 7 jours TELS QU'ILS SONT (changements à la main
 * compris), convertit le pesé-cuit en poids cru d'achat (§1), arrondit vers
 * le haut (§2) et range par rayon (§3).
 */

import {
  ARRONDI_COURSES,
  EN_CONSERVE,
  RAYONS,
  RAYON_DE_FAMILLE,
  RAYON_D_ALIMENT,
  RENDEMENTS,
  type RayonId,
} from '../data/reglesCourses';
import type { Catalogue } from './planPersoTotaux';
import type { SemaineRepas } from './semaineRepas';

export interface ArticleCourses {
  foodId: string;
  /** Ce qu'on achète : « Riz blanc (cru) », ou le nom du catalogue. */
  nom: string;
  /** Arrondie vers le haut (§2), dans `unite`. */
  quantite: number;
  unite: 'g' | 'ml' | 'unité';
  /** Converti du poids cuit au poids cru (§1). */
  converti: boolean;
  /** Légumineuse : le poids en conserve égouttée (≈ cuit), arrondi. */
  conserve?: number;
}

export interface RayonCourses {
  id: RayonId;
  nom: string;
  articles: ArticleCourses[];
}

export interface ListeCourses {
  rayons: RayonCourses[];
  /** Les lignes de la semaine sans quantité posée : elles ne sont pas comptées. */
  sansQuantite: number;
}

/** §2 — vers le haut : 10 en dessous de 1 000, 50 au-delà ; la pièce, exacte. */
export function arrondirCourses(q: number, unite: string): number {
  if (unite === 'unité') return Math.ceil(q - 1e-9);
  const pas = q >= ARRONDI_COURSES.seuil ? ARRONDI_COURSES.grand : ARRONDI_COURSES.petit;
  return Math.ceil(q / pas - 1e-9) * pas;
}

/** §2 — « 480 g », « 1,25 kg », « 310 ml », « 1,5 L », « 7 ». */
export function afficherQuantite(q: number, unite: string): string {
  if (unite === 'unité') return String(q);
  if (q >= ARRONDI_COURSES.seuil) {
    const grand = (q / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 2 });
    return `${grand} ${unite === 'ml' ? 'L' : 'kg'}`;
  }
  return `${q} ${unite}`;
}

export function rayonDe(foodId: string, catalogue: Catalogue): RayonId {
  const f = catalogue[foodId];
  return RAYON_D_ALIMENT[foodId] ?? (f ? RAYON_DE_FAMILLE[f.category] : 'epicerie');
}

export function listeDeCourses(semaine: SemaineRepas, catalogue: Catalogue): ListeCourses {
  const totaux = new Map<string, number>();
  let sansQuantite = 0;
  for (const jour of semaine.jours) {
    for (const lignes of Object.values(jour)) {
      for (const l of lignes ?? []) {
        if (catalogue[l.foodId] === undefined) continue;
        if (l.qty === null || !(l.qty > 0)) {
          sansQuantite++;
          continue;
        }
        totaux.set(l.foodId, (totaux.get(l.foodId) ?? 0) + l.qty);
      }
    }
  }

  const parRayon = new Map<RayonId, ArticleCourses[]>();
  for (const [foodId, total] of totaux) {
    const f = catalogue[foodId]!;
    const r = RENDEMENTS[foodId];
    const unite = f.unit === 'unité' ? 'unité' : f.unit === 'ml' ? 'ml' : 'g';
    const article: ArticleCourses = {
      foodId,
      nom: r?.achat ?? f.label,
      quantite: arrondirCourses(r ? total / r.facteur : total, unite),
      unite,
      converti: r !== undefined,
      ...(EN_CONSERVE.includes(foodId) ? { conserve: arrondirCourses(total, unite) } : {}),
    };
    const rayon = rayonDe(foodId, catalogue);
    parRayon.set(rayon, [...(parRayon.get(rayon) ?? []), article]);
  }

  return {
    rayons: RAYONS.filter((r) => parRayon.has(r.id)).map((r) => ({
      id: r.id,
      nom: r.nom,
      articles: parRayon.get(r.id)!.sort((a, b) => a.nom.localeCompare(b.nom, 'fr')),
    })),
    sansQuantite,
  };
}

/** Le texte partagé : un rayon par bloc, « – Riz blanc (cru) : 1,1 kg ». */
export function texteDeLaListe(liste: ListeCourses, titre: string): string {
  const blocs = liste.rayons.map(
    (r) =>
      `${r.nom}\n${r.articles
        .map((a) => `– ${a.nom} : ${afficherQuantite(a.quantite, a.unite)}`)
        .join('\n')}`,
  );
  return [titre, ...blocs].join('\n\n');
}
