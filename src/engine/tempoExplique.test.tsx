/**
 * Le tempo chiffré s'explique (Guillaume, 23 novembre : « détailler à
 * l'endroit propice la signification du tempo 31x1 par exemple »).
 */
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { TempoChip } from '../components/TempoChip';
import { EXERCISES } from '../data/exercises';
import { expliquerTempo, phasesTempo } from './tempo';

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

describe('à l’écran : quatre cases (variante TB)', () => {
  it('le tempo chiffré : quatre cases, la case X à part, la phrase complète pour le lecteur d’écran', () => {
    const h = renderToStaticMarkup(<TempoChip tempo="Tempo 2-1-X-0" />);
    expect(phasesTempo('Tempo 2-1-X-0')).toEqual([
      { valeur: '2', libelle: 'descente', explosif: false },
      { valeur: '1', libelle: 'en bas', explosif: false },
      { valeur: 'X', libelle: 'montée', explosif: true },
      { valeur: '0', libelle: 'en haut', explosif: false },
    ]);
    expect(h.match(/tempoCase_/g)?.length).toBe(4);
    expect(h.match(/tempoCaseX/g)?.length).toBe(1);
    expect(h).toContain('aria-label="Tempo 2-1-X-0 : 2 s pour descendre, 1 s d’arrêt en bas');
    expect(h).not.toContain('<button');
  });

  it('trois chiffres : trois cases', () => {
    expect(
      renderToStaticMarkup(<TempoChip tempo="Tempo 3-0-X" />).match(/tempoCase_/g)?.length,
    ).toBe(3);
  });

  it('un tempo en mots reste une pastille', () => {
    const mots = renderToStaticMarkup(<TempoChip tempo="Descente 2 s" />);
    expect(mots).not.toContain('tempoCase');
    expect(mots).toContain('Descente 2 s');
  });

  it('ivoire DOUX, pas l’ivoire du menu (« pas un blanc trop blanc »)', () => {
    const css = readFileSync(new URL('../screens/Session.module.css', import.meta.url), 'utf8');
    const r = css.slice(
      css.indexOf('\n.tempoCase {'),
      css.indexOf('}', css.indexOf('\n.tempoCase {')),
    );
    expect(r).toContain('background: var(--ivoire-doux)');
  });
});
