/**
 * Le compte à rebours d'un bloc minuté, côté React.
 *
 * Comme pour le repos, le composant ne fait que réafficher : la vérité est
 * l'horodatage de fin rangé dans `localStorage`. Revenir sur l'écran après
 * huit minutes d'écran éteint montre « 2:00 », pas « 10:00 ».
 *
 * L'intervalle ne tourne QUE pendant qu'un bloc court. Un écran de séance
 * ouvert sans bloc lancé ne réveille rien.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  arreterBloc,
  blocFini,
  demarrerBloc,
  depassementSec,
  lireBloc,
  ratioBloc,
  restantSec,
  type BlocMinute,
} from '../timer/blocMinute';

export interface BlocMinuteVue {
  actif: boolean;
  restant: number;
  depassement: number;
  ratio: number;
  fini: boolean;
  demarrer: () => void;
  arreter: () => void;
}

export function useBlocMinute(cle: string, minutes: number | null): BlocMinuteVue {
  const [bloc, setBloc] = useState<BlocMinute | null>(() =>
    minutes === null ? null : lireBloc(cle),
  );
  const [, tick] = useState(0);

  // Un changement de bloc (on passe à un autre circuit) relit le bon état.
  useEffect(() => {
    setBloc(minutes === null ? null : lireBloc(cle));
  }, [cle, minutes]);

  useEffect(() => {
    if (bloc === null) return;
    const id = window.setInterval(() => tick((n) => n + 1), 500);
    return () => window.clearInterval(id);
  }, [bloc]);

  // Retour au premier plan : on relit avant de redessiner, sinon l'écran
  // repart de la dernière valeur connue — c'est-à-dire d'il y a huit minutes.
  useEffect(() => {
    if (minutes === null) return;
    const resync = () => {
      setBloc(lireBloc(cle));
      tick((n) => n + 1);
    };
    document.addEventListener('visibilitychange', resync);
    window.addEventListener('focus', resync);
    return () => {
      document.removeEventListener('visibilitychange', resync);
      window.removeEventListener('focus', resync);
    };
  }, [cle, minutes]);

  const demarrer = useCallback(() => {
    if (minutes === null) return;
    setBloc(demarrerBloc(cle, minutes));
  }, [cle, minutes]);

  const arreter = useCallback(() => {
    arreterBloc(cle);
    setBloc(null);
  }, [cle]);

  const maintenant = Date.now();
  return {
    actif: bloc !== null,
    restant: bloc === null ? Math.round((minutes ?? 0) * 60) : restantSec(bloc, maintenant),
    depassement: bloc === null ? 0 : depassementSec(bloc, maintenant),
    ratio: bloc === null ? 0 : ratioBloc(bloc, maintenant),
    fini: bloc !== null && blocFini(bloc, maintenant),
    demarrer,
    arreter,
  };
}
