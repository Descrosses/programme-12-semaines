/**
 * Ce que CE téléphone sait de sa sauvegarde en ligne.
 *
 * En `localStorage`, jamais en base, pour la même raison que la date du
 * dernier export : restaurer une vieille sauvegarde ne doit pas faire croire
 * qu'un envoi vient d'avoir lieu. Le perdre ne coûte qu'un envoi de plus.
 */

const K_REUSSITE = 'p12s:cloud-derniere-reussite';
const K_ATTENTE = 'p12s:cloud-en-attente';
const K_CONFLIT = 'p12s:cloud-conflit';

function lire(k: string): string | null {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
}
function ecrire(k: string, v: string | null): void {
  try {
    if (v === null) localStorage.removeItem(k);
    else localStorage.setItem(k, v);
  } catch {
    // Stockage refusé (navigation privée) : on réessaiera, rien de grave.
  }
}

export interface EtatCloud {
  /** Date ISO de la dernière sauvegarde envoyée avec succès. */
  derniereReussite: string | null;
  /** Un envoi a échoué (réseau) et doit être retenté. */
  enAttente: boolean;
  /** L'envoi automatique a été retenu : le téléphone contient moins que le compte. */
  conflit: { local: number; enLigne: number } | null;
}

export function lireEtatCloud(): EtatCloud {
  let conflit: EtatCloud['conflit'] = null;
  try {
    const c = lire(K_CONFLIT);
    conflit = c === null ? null : (JSON.parse(c) as EtatCloud['conflit']);
  } catch {
    conflit = null;
  }
  return { derniereReussite: lire(K_REUSSITE), enAttente: lire(K_ATTENTE) === '1', conflit };
}

export function noterReussite(quand: Date): void {
  ecrire(K_REUSSITE, quand.toISOString());
  ecrire(K_ATTENTE, null);
  ecrire(K_CONFLIT, null);
}
export function noterAttente(): void {
  ecrire(K_ATTENTE, '1');
}
export function noterConflit(local: number, enLigne: number): void {
  ecrire(K_CONFLIT, JSON.stringify({ local, enLigne }));
  ecrire(K_ATTENTE, null);
}
export function oublierEtatCloud(): void {
  ecrire(K_REUSSITE, null);
  ecrire(K_ATTENTE, null);
  ecrire(K_CONFLIT, null);
}
