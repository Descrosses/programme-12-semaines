/**
 * « Garder la charge » après la proposition de la 1re série (§11 cas 10).
 *
 * Un état de confort, le temps de la séance : il évite que la proposition
 * refusée revienne si l'écran se recharge entre la 1re et la 2e série. Dès la
 * 2e série notée, la proposition disparaît d'elle-même ; le perdre ne coûte
 * donc qu'une question de trop. `sessionStorage`, jamais la base.
 */

const cle = (week: number, day: number, exId: string) => `p12s:intra-garde:${week}-${day}-${exId}`;

export function chargeGardee(week: number, day: number, exId: string): boolean {
  try {
    return sessionStorage.getItem(cle(week, day, exId)) === '1';
  } catch {
    return false;
  }
}

export function noterChargeGardee(week: number, day: number, exId: string): void {
  try {
    sessionStorage.setItem(cle(week, day, exId), '1');
  } catch {
    // Stockage refusé : la proposition pourra revenir, rien de grave.
  }
}
