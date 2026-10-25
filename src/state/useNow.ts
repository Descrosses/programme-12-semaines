import { useEffect, useState } from 'react';

/**
 * L'heure courante, rafraîchie à intervalle régulier — et seulement si on en a
 * besoin.
 *
 * Le chrono de séance s'affiche à la minute. Rafraîchir toutes les vingt
 * secondes suffit donc largement à ce que le chiffre ne soit jamais faux de
 * plus d'une minute, sans faire tourner un timer à la seconde dans une appli
 * qui reste ouverte une heure et demie.
 *
 * `actif` à `false` arrête l'intervalle : une séance terminée a une durée
 * figée, il n'y a plus rien à recalculer.
 */
export function useNow(actif: boolean, periodeMs = 20_000): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!actif) return;
    /*
     * On relit l'heure AUSSI au retour au premier plan. Un téléphone en veille
     * suspend les intervalles : sans ça, rouvrir l'appli après vingt minutes
     * affichait la durée d'avant la veille jusqu'au prochain tic.
     */
    const tic = () => setNow(Date.now());
    tic();
    const id = window.setInterval(tic, periodeMs);
    const reveil = () => {
      if (document.visibilityState === 'visible') tic();
    };
    document.addEventListener('visibilitychange', reveil);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', reveil);
    };
  }, [actif, periodeMs]);

  return now;
}
