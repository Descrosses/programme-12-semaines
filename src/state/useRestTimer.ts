/**
 * Le chrono, côté React.
 *
 * Le composant ne fait que réafficher : la vérité est l'horodatage de fin, lu
 * à chaque tick et à chaque retour au premier plan.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  addSeconds,
  beep,
  isFinished,
  notifyRestOver,
  overtimeSec,
  primeAudio,
  progress,
  readTimer,
  remainingSec,
  startTimer,
  vibrate,
  writeTimer,
  type RestTimerState,
} from '../timer/restTimer';
import {
  acquireWakeLock,
  isWakeLockSupported,
  releaseWakeLock,
  watchWakeLock,
} from '../timer/wakeLock';

export interface RestTimer {
  state: RestTimerState | null;
  remaining: number;
  overtime: number;
  ratio: number;
  finished: boolean;
  start: (sec: number, label: string) => void;
  add30: () => void;
  skip: () => void;
  prime: () => void;
  /** L'écran est-il maintenu allumé pendant ce repos ? */
  screenHeld: boolean;
  wakeLockSupported: boolean;
}

export function useRestTimer(alerts = { sound: true, vibration: true }): RestTimer {
  const [state, setState] = useState<RestTimerState | null>(() => readTimer());
  const [, forceTick] = useState(0);
  const [screenHeld, setScreenHeld] = useState(false);
  const alertedFor = useRef<number | null>(null);

  // Le système relâche le verrou d'écran dès que l'onglet passe en
  // arrière-plan : on le reprend au retour tant qu'un repos court.
  useEffect(watchWakeLock, []);

  // Un seul intervalle, actif seulement quand un repos est en cours.
  useEffect(() => {
    if (!state) return;
    const id = window.setInterval(() => forceTick((n) => n + 1), 250);
    return () => window.clearInterval(id);
  }, [state]);

  // Retour au premier plan : on relit l'état et on redessine immédiatement.
  useEffect(() => {
    const resync = () => {
      setState(readTimer());
      forceTick((n) => n + 1);
    };
    document.addEventListener('visibilitychange', resync);
    window.addEventListener('focus', resync);
    window.addEventListener('pageshow', resync);
    return () => {
      document.removeEventListener('visibilitychange', resync);
      window.removeEventListener('focus', resync);
      window.removeEventListener('pageshow', resync);
    };
  }, []);

  const finished = state ? isFinished(state) : false;

  // Alerte de fin, une seule fois par repos.
  useEffect(() => {
    if (!state || !finished || alertedFor.current === state.endsAt) return;
    alertedFor.current = state.endsAt;
    if (alerts.vibration) vibrate();
    if (alerts.sound) beep();
    void notifyRestOver(state.label);
    writeTimer({ ...state, notified: true });
  }, [state, finished, alerts.sound, alerts.vibration]);

  // Repos terminé : on rend la main au verrouillage automatique de l'écran.
  useEffect(() => {
    if (finished && screenHeld) {
      void releaseWakeLock();
      setScreenHeld(false);
    }
  }, [finished, screenHeld]);

  const start = useCallback((sec: number, label: string) => {
    if (sec <= 0) return;
    primeAudio();
    setState(startTimer(sec, label));
    void acquireWakeLock().then(setScreenHeld);
  }, []);

  const add30 = useCallback(() => {
    setState((s) => (s ? addSeconds(s, 30) : s));
    void acquireWakeLock().then(setScreenHeld);
  }, []);

  const skip = useCallback(() => {
    writeTimer(null);
    alertedFor.current = null;
    setState(null);
    void releaseWakeLock();
    setScreenHeld(false);
  }, []);

  return {
    state,
    remaining: state ? remainingSec(state) : 0,
    overtime: state ? overtimeSec(state) : 0,
    ratio: state ? progress(state) : 0,
    finished,
    start,
    add30,
    skip,
    prime: primeAudio,
    screenHeld,
    wakeLockSupported: isWakeLockSupported(),
  };
}
