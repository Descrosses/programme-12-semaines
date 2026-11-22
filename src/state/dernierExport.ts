/**
 * La date du dernier export de données, sur CET appareil.
 *
 * Un état de confort, pas une donnée d'entraînement : il ne sert qu'à faire
 * taire le rappel de sauvegarde du dernier jour de la semaine. Il vit donc
 * dans `localStorage`, comme la dernière semaine consultée — et surtout pas
 * en base : restaurer une vieille sauvegarde ne doit pas faire croire qu'un
 * export vient d'être fait. Le perdre ne coûte qu'un rappel de trop.
 */

const KEY = 'p12s:dernier-export';

/** La date locale du jour, `YYYY-MM-DD` (pas l'UTC : à 23 h, ce serait demain). */
export function aujourdhuiLocal(maintenant: Date = new Date()): string {
  const m = String(maintenant.getMonth() + 1).padStart(2, '0');
  const j = String(maintenant.getDate()).padStart(2, '0');
  return `${maintenant.getFullYear()}-${m}-${j}`;
}

export function lireDernierExport(): string | null {
  try {
    const v = localStorage.getItem(KEY);
    return v !== null && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
  } catch {
    return null;
  }
}

export function noterExport(maintenant: Date = new Date()): void {
  try {
    localStorage.setItem(KEY, aujourdhuiLocal(maintenant));
  } catch {
    // Stockage refusé (navigation privée) : le rappel reviendra, rien de grave.
  }
}
