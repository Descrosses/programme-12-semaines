/**
 * Routage minimal par ancre d'URL.
 *
 * Pas de bibliothèque de routage : l'appli a une poignée d'écrans et aucun
 * besoin de chargement différé ni de navigation imbriquée. Utiliser l'ancre
 * (`#/…`) plutôt qu'un état interne donne gratuitement le bouton Retour du
 * téléphone, qui est le geste naturel pour sortir d'une séance.
 */

import { useCallback, useEffect, useState } from 'react';
import type { DayIndex, WeekIndex } from '../data/types';
import type { FamilleId } from '../data/catalogue';

/** Les familles qu'une ancre `#/catalogue/<famille>` peut désigner. */
const FAMILLES_ROUTE: readonly FamilleId[] = ['power', 'mass', 'femmes', 'perso'];

export type Route =
  | { name: 'accueil' }
  /*
   * `famille` : la famille à ouvrir directement. Depuis une tuile de
   * l'accueil, on arrive sur SES cycles, pas sur les quatre bannières qu'on
   * vient de voir.
   */
  | { name: 'catalogue'; famille?: FamilleId }
  | { name: 'parcours' }
  | { name: 'today' }
  | { name: 'week'; week: WeekIndex }
  | { name: 'session'; week: WeekIndex; day: DayIndex }
  | { name: 'progress' }
  | { name: 'nutrition' }
  | { name: 'combine' }
  | { name: 'mesures' }
  | { name: 'settings' }
  /*
   * Les écrans FEMMES 8, sous un préfixe à eux.
   *
   * `femmes` et non `today`/`week`/`session` : ces routes-là sont câblées
   * sur POWER 12 et sur son cycle actif. FEMMES 8 n'a pas de cycle — le
   * programme est `a-venir` — et ses écrans affichent un circuit en tours,
   * pas des séries. Partager les routes aurait obligé chaque écran de POWER
   * à se demander de quel programme il parle.
   *
   * `vue` dit lequel des écrans afficher ; le reste (semaine, jour, version,
   * niveau) vit dans l'état de l'application, pas dans l'URL.
   */
  | { name: 'femmes'; vue: 'aujourdhui' | 'semaine' | 'seance' | 'exercice' | 'securite' };

export function parseRoute(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  switch (parts[0]) {
    case 'accueil':
      return { name: 'accueil' };
    case 'catalogue': {
      const f = FAMILLES_ROUTE.find((x) => x === parts[1]);
      return f ? { name: 'catalogue', famille: f } : { name: 'catalogue' };
    }
    case 'parcours':
      return { name: 'parcours' };
    case 'today':
      return { name: 'today' };
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
    case 'mesures':
      return { name: 'mesures' };
    case 'femmes': {
      const v = parts[1];
      const vue =
        v === 'semaine' || v === 'seance' || v === 'exercice' || v === 'securite'
          ? v
          : ('aujourdhui' as const);
      return { name: 'femmes', vue };
    }
    case 'settings':
      return { name: 'settings' };
    default:
      /*
       * L'ancre vide ouvre la plateforme, plus la séance du jour.
       *
       * C'est le seul changement visible de cette étape : avec un catalogue et
       * plusieurs cycles possibles, ouvrir directement sur une séance ne dit
       * plus DE QUEL programme elle vient. L'accueil le dit, et met l'action
       * du jour en premier pour que le détour coûte un appui, pas plus.
       */
      return { name: 'accueil' };
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
    case 'accueil':
      return '#/accueil';
    case 'femmes':
      return `#/femmes/${route.vue}`;
    case 'catalogue':
      return route.famille ? `#/catalogue/${route.famille}` : '#/catalogue';
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
