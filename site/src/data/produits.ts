/**
 * Fonctions utilitaires autour des produits.
 * Rien à modifier ici : les produits se gèrent dans src/content/produits/.
 */
import { getCollection, type CollectionEntry } from 'astro:content';

export type Produit = CollectionEntry<'produits'>;

export const CATEGORIES = {
  musculation: 'Musculation',
  diete: 'Diète',
  pack: 'Packs',
} as const;

/** Tous les produits publiés, triés par `ordre`. */
export async function getProduits(): Promise<Produit[]> {
  const tous = await getCollection('produits', ({ data }) => data.publie);
  return tous.sort((a, b) => a.data.ordre - b.data.ordre);
}

/** Vrai tant que le prix n'a pas été renseigné. */
export function prixADefinir(p: Produit): boolean {
  return p.data.prix === 'PRIX_A_DEFINIR';
}

/** Vrai tant que le lien Stripe est un placeholder. */
export function lienStripeADefinir(p: Produit): boolean {
  return p.data.lienStripe.includes('REMPLACER');
}

/** 49 → « 49 € », 49.9 → « 49,90 € ». */
export function formatPrix(prix: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: Number.isInteger(prix) ? 0 : 2,
  }).format(prix);
}

/** Libellé affiché : prix formaté, ou « Prix à venir ». */
export function libellePrix(p: Produit): string {
  return typeof p.data.prix === 'number' ? formatPrix(p.data.prix) : 'Prix à venir';
}

/**
 * Pour un pack : somme des prix des produits inclus, achetés séparément.
 * Renvoie null si un des prix n'est pas encore défini ou si le pack
 * n'est pas moins cher (on n'affiche jamais une « économie » fausse).
 */
export function prixSepares(pack: Produit, tous: Produit[]): number | null {
  if (pack.data.contient.length === 0 || typeof pack.data.prix !== 'number') return null;
  let total = 0;
  for (const id of pack.data.contient) {
    const p = tous.find((x) => x.id === id);
    if (!p) throw new Error(`Le pack « ${pack.id} » contient « ${id} », qui n'existe pas dans src/content/produits/.`);
    if (typeof p.data.prix !== 'number') return null;
    total += p.data.prix;
  }
  return total > pack.data.prix ? total : null;
}
