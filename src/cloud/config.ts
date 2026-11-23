/**
 * Où vit le compte en ligne (lot 1 : compte facultatif et sauvegarde
 * automatique).
 *
 * Deux valeurs, toutes deux PUBLIQUES par conception : l'adresse du projet
 * Supabase et sa clé « publishable ». Elles finissent de toute façon dans le
 * JavaScript livré au téléphone. Ce qui protège les données, ce n'est pas
 * leur secret, ce sont les règles d'accès du projet (`supabase/setup.sql` :
 * chacun ne lit et n'écrit QUE son propre dossier).
 *
 * Vides = pas de compte : la carte « Mon compte » n'apparaît pas, aucune
 * requête ne part, l'appli reste celle d'avant, 100 % locale. Les variables
 * d'environnement `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY`
 * l'emportent sur les constantes (tests, essais).
 */

const URL_PROJET = '';
const CLE_PUBLIQUE = '';

export interface ConfigCloud {
  url: string;
  cle: string;
}

export function configCloud(): ConfigCloud | null {
  const env = import.meta.env as Record<string, string | undefined>;
  const url = env.VITE_SUPABASE_URL ?? URL_PROJET;
  const cle = env.VITE_SUPABASE_PUBLISHABLE_KEY ?? CLE_PUBLIQUE;
  return url !== '' && cle !== '' ? { url, cle } : null;
}
