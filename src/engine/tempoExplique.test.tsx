/**
 * Le tempo chiffré s'explique (Guillaume, 23 novembre : « détailler à
 * l'endroit propice la signification du tempo 31x1 par exemple »).
 */
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { TempoChip } from '../components/TempoChip';
import { EXERCISES } from '../data/exercises';
import { expliquerTempo } from './tempo';

describe('ce que dit un tempo', () => {
  it('3-1-X-1 : descente, arrêt en bas, montée explosive, arrêt en haut', () => {
    expect(expliquerTempo('Tempo 3-1-X-1')).toEqual([
      '3 s pour descendre',
      '1 s d’arrêt en bas',
      'remonte le plus vite possible (X)',
      '1 s d’arrêt en haut',
    ]);
  });

  it('2-1-X-0 et 3-0-X (sans quatrième chiffre)', () => {
    expect(expliquerTempo('Tempo 2-1-X-0')!.at(-1)).toBe('pas d’arrêt en haut : enchaîne');
    expect(expliquerTempo('Tempo 3-0-X')).toEqual([
      '3 s pour descendre',
      'pas d’arrêt en bas',
      'remonte le plus vite possible (X)',
    ]);
  });

  it('un tempo écrit en mots ne s’explique pas : il se lit déjà', () => {
    expect(expliquerTempo('Descente contrôlée 2 s')).toBeNull();
    expect(expliquerTempo(null)).toBeNull();
  });

  it('chaque tempo chiffré du programme POWER s’explique', () => {
    const chiffres = Object.values(EXERCISES)
      .flatMap((e) => e.tempo ?? [])
      .map((t) => t.texte)
      .filter((t) => t.startsWith('Tempo '));
    expect(chiffres.length).toBeGreaterThan(0);
    for (const t of chiffres) expect(expliquerTempo(t), t).not.toBeNull();
  });
});

describe('à l’écran', () => {
  it('le tempo chiffré est un bouton fermé, marqué « ? » ; le tempo en mots reste une pastille', () => {
    const chiffre = renderToStaticMarkup(<TempoChip tempo="Tempo 3-1-X-1" />);
    expect(chiffre).toContain('aria-expanded="false"');
    expect(chiffre).toContain('?');
    expect(chiffre).not.toContain('pour descendre');
    const mots = renderToStaticMarkup(<TempoChip tempo="Descente 2 s" />);
    expect(mots).not.toContain('<button');
  });
});
