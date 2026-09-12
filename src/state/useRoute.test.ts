/**
 * Régression : après l'élargissement de `DayIndex` aux sept jours, le
 * garde-fou du routage plafonnait encore à 4. Appuyer sur la séance du samedi
 * ouvrait celle du lundi — silencieusement, dans toutes les semaines.
 */

import { describe, expect, it } from 'vitest';
import { parseRoute, routeToHash } from './useRoute';
import type { DayIndex } from '../data/types';

describe('routage des séances', () => {
  it('ouvre le bon jour, samedi et dimanche compris', () => {
    for (const day of [0, 1, 2, 3, 4, 5, 6] as DayIndex[]) {
      expect(parseRoute(`#/session/3/${day}`)).toEqual({ name: 'session', week: 3, day });
    }
  });

  it('le samedi du combine ouvre bien le samedi du combine', () => {
    expect(parseRoute('#/session/0/5')).toEqual({ name: 'session', week: 0, day: 5 });
  });

  it('un jour hors bornes retombe sur le lundi plutôt que de planter', () => {
    for (const hash of ['#/session/3/7', '#/session/3/-1', '#/session/3/abc']) {
      const route = parseRoute(hash);
      expect(route.name).toBe('session');
      if (route.name === 'session') expect(route.day, hash).toBe(0);
    }
  });

  it('l’aller-retour ancre → route → ancre est stable', () => {
    for (const day of [0, 1, 2, 3, 4, 5, 6] as DayIndex[]) {
      const route = { name: 'session', week: 12, day } as const;
      expect(parseRoute(routeToHash(route))).toEqual(route);
    }
  });

  it('les autres écrans sont inchangés', () => {
    expect(parseRoute('#/nutrition')).toEqual({ name: 'nutrition' });
    expect(parseRoute('#/week/0')).toEqual({ name: 'week', week: 0 });
    expect(parseRoute('#/')).toEqual({ name: 'today' });
  });
});
