/**
 * Empêche l'écran de se verrouiller pendant un repos.
 *
 * Pourquoi c'est là : iOS suspend le JavaScript d'une page passée en
 * arrière-plan. Ni `setTimeout`, ni le son, ni la vibration ne s'exécutent
 * pendant ce temps, et Safari ne propose aucune API de notification
 * programmée dans le futur. Une alerte de fin de repos écran verrouillé n'est
 * donc pas réalisable depuis une application web sur iPhone.
 *
 * La parade est de ne pas laisser l'écran se verrouiller : Screen Wake Lock
 * (Safari 16.4+, Chrome Android 84+). Le verrou est pris au démarrage du
 * repos, relâché à la fin, et repris automatiquement au retour au premier
 * plan — le système le libère dès que l'onglet passe en arrière-plan.
 *
 * Si l'API est absente, l'affichage reste juste au retour (horodatage de fin),
 * seule l'alerte sonore peut manquer.
 */

type Sentinel = { released: boolean; release: () => Promise<void> };

let sentinel: Sentinel | null = null;
let wanted = false;

export function isWakeLockSupported(): boolean {
  return typeof navigator !== 'undefined' && 'wakeLock' in navigator;
}

export async function acquireWakeLock(): Promise<boolean> {
  wanted = true;
  if (!isWakeLockSupported() || document.visibilityState !== 'visible') return false;
  if (sentinel && !sentinel.released) return true;
  try {
    const nav = navigator as Navigator & {
      wakeLock: { request: (type: 'screen') => Promise<Sentinel> };
    };
    sentinel = await nav.wakeLock.request('screen');
    return true;
  } catch {
    // Batterie faible, onglet non visible, permission refusée : on continue
    // sans verrou plutôt que de casser le chrono.
    sentinel = null;
    return false;
  }
}

export async function releaseWakeLock(): Promise<void> {
  wanted = false;
  const current = sentinel;
  sentinel = null;
  if (current && !current.released) {
    try {
      await current.release();
    } catch {
      /* déjà relâché par le système */
    }
  }
}

/**
 * Le système relâche le verrou dès que l'onglet n'est plus visible. On le
 * reprend au retour, tant qu'un repos est en cours.
 */
export function watchWakeLock(): () => void {
  const onVisible = () => {
    if (wanted && document.visibilityState === 'visible') void acquireWakeLock();
  };
  document.addEventListener('visibilitychange', onVisible);
  return () => document.removeEventListener('visibilitychange', onVisible);
}
