/**
 * Un maximum inconnu est une absence, jamais un zéro.
 *
 * C'est la règle qui tient tout le reste : les jours de readiness rouge
 * prescrivent 65 % du 1RM. Un zéro rangé comme une mesure donnerait une barre
 * vide présentée comme un plan, et un `null` ferait croire au moteur qu'une
 * mesure existe.
 */

import { describe, expect, it } from 'vitest';
import { poseMaximum } from './maxima';

describe('poseMaximum', () => {
  it('range une mesure', () => {
    expect(poseMaximum({}, 'back-squat', 110)).toEqual({ 'back-squat': 110 });
  });

  it('retire la clé quand le champ est vidé', () => {
    expect(poseMaximum({ 'back-squat': 110 }, 'back-squat', null)).toEqual({});
  });

  it('refuse le zéro au lieu de le ranger', () => {
    expect(poseMaximum({ 'back-squat': 110 }, 'back-squat', 0)).toEqual({});
    expect(poseMaximum({}, 'bench-press', 0)).toEqual({});
  });

  it('refuse ce qui n’est pas un nombre', () => {
    expect(poseMaximum({}, 'deadlift', Number.NaN)).toEqual({});
    expect(poseMaximum({}, 'deadlift', Number.POSITIVE_INFINITY)).toEqual({});
  });

  it('ne touche pas aux autres mouvements', () => {
    expect(poseMaximum({ 'back-squat': 110, deadlift: 140 }, 'back-squat', null)).toEqual({
      deadlift: 140,
    });
  });

  it('ne modifie pas l’objet reçu', () => {
    const avant = { 'back-squat': 110 };
    poseMaximum(avant, 'back-squat', 120);
    expect(avant).toEqual({ 'back-squat': 110 });
  });
});
