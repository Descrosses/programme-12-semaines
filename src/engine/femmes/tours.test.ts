/**
 * La saisie tour par tour : la progression des charges doit continuer de lire
 * `actual` et `kg` comme avant, tirés des tours.
 */
import { describe, expect, it } from 'vitest';
import { appliquerNote, appliquerTour, toursValides, type ContexteTour } from './tours';

const ctx: ContexteTour = {
  exerciseId: 'x',
  week: 1,
  day: 0,
  date: '2026-11-14',
  version: 'salle',
  planned: 12,
};

describe('saisie tour par tour', () => {
  it('actual = le PLUS PETIT des tours : la cible se juge sur le tour le plus dur', () => {
    let r = appliquerTour(null, ctx, 0, { reps: 12, kg: 10 });
    r = appliquerTour(r, ctx, 1, { reps: 10, kg: 10 });
    r = appliquerTour(r, ctx, 2, { reps: 11, kg: 10 });
    expect(r.actual).toBe(10);
  });

  it('kg = la charge du dernier tour validé', () => {
    let r = appliquerTour(null, ctx, 0, { reps: 12, kg: 10 });
    r = appliquerTour(r, ctx, 1, { reps: 12, kg: 12 });
    expect(r.kg).toBe(12);
  });

  it('corriger un tour le remplace, sans en ajouter', () => {
    let r = appliquerTour(null, ctx, 0, { reps: 8, kg: null });
    r = appliquerTour(r, ctx, 0, { reps: 12, kg: null });
    expect(r.tours).toEqual([{ reps: 12, kg: null }]);
    expect(r.actual).toBe(12);
  });

  it('un tour validé dans le désordre laisse un trou, pas un faux tour', () => {
    const r = appliquerTour(null, ctx, 2, { reps: 9, kg: null });
    expect(r.tours).toEqual([null, null, { reps: 9, kg: null }]);
    expect(toursValides(r, 3)).toBe(1);
  });

  it('un ressenti ne touche pas aux tours, un tour ne touche pas au ressenti', () => {
    let r = appliquerTour(null, ctx, 0, { reps: 12, kg: 8 });
    r = appliquerNote(r, ctx, { ressenti: 'facile' });
    expect(r.tours).toHaveLength(1);
    r = appliquerTour(r, ctx, 1, { reps: 12, kg: 8 });
    expect(r.ressenti).toBe('facile');
    expect(r.actual).toBe(12);
  });
});
