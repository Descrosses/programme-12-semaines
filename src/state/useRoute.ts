/**
 * Routage minimal par ancre d'URL.
 *
 * Pas de bibliothèque de routage : l'appli a six écrans et aucun besoin de
 * chargement différé ni de navigation imbriquée. Utiliser l'ancre (`#/…`)
 * plutôt qu'un état interne donne gratuitement le bouton Retour du téléphone,
 * qui est le geste naturel pour sortir d'une séance.
 */

import { useCallback, useEffect, useState } from 'react';
import type { DayIndex, WeekIndex } from '../data/types';

export type Route =
  | { name: 'today' }
  | { name: 'week'; week: WeekIndex }
  | { name: 'session'; week: WeekIndex; day: DayIndex }
  | { name: 'progress' }
  | { name: 'nutrition' }
  | { name: 'combine' }
  | { name: 'settings' };

export function parseRoute(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  switch (parts[0]) {
    case 'week':
      return { name: 'week', week: clampWeek(parts[1]) };
    case 'session':
      return { name: 'session', week: clampWeek(parts[1]), day: clampDay(parts[2]) };
    case 'progress':
      return { name: 'progress' };
    case 'nutrition':
      return { name: 'nutrition' };
    case 'combine':
      return { name: 'combine' };
    case 'settings':
      return { name: 'settings' };
    default:
      return { name: 'today' };
  }
}

export function routeToHash(route: Route): string {
  switch (route.name) {
    case 'week':
      return `#/week/${route.week}`;
    case 'session':
      return `#/session/${route.week}/${route.day}`;
    case 'today':
      return '#/today';
    default:
      return `#/${route.name}`;
  }
}

export function useRoute(): [Route, (route: Route, replace?: boolean) => void] {
  const [route, setRoute] = useState<Route>(() => parseRoute(window.location.hash));

  useEffect(() => {
    const onHash = () => setRoute(parseRoute(window.location.hash));
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const navigate = useCallback((next: Route, replace = false) => {
    const hash = routeToHash(next);
    if (window.location.hash === hash) return;
    if (replace) window.history.replaceState(null, '', hash);
    else window.location.hash = hash;
    setRoute(next);
  }, []);

  return [route, navigate];
}

function clampWeek(raw: string | undefined): WeekIndex {
  const n = Number(raw);
  return (Number.isInteger(n) && n >= 0 && n <= 12 ? n : 1) as WeekIndex;
}

/**
 * Borne haute = 6, les sept jours de la semaine.
 *
 * Elle était à 4 du temps où `DayIndex` ne comptait que cinq jours. Après
 * l'élargissement, samedi (5) et dimanche (6) sortaient de la borne et
 * retombaient silencieusement sur 0 : appuyer sur la séance du samedi ouvrait
 * celle du lundi, dans toutes les semaines. La borne d'un garde-fou se lit
 * désormais dans le type lui-même.
 */
const LAST_DAY = 6;

function clampDay(raw: string | undefined): DayIndex {
  const n = Number(raw);
  return (Number.isInteger(n) && n >= 0 && n <= LAST_DAY ? n : 0) as DayIndex;
}
