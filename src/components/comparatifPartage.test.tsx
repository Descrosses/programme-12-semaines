/**
 * La carte « Mon avant · après » de l'écran Combine.
 */
import 'fake-indexeddb/auto';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ComparatifPartage } from './ComparatifPartage';

const ligne = (phase: 'initial' | 'final', metrics: Record<string, number | null>) => ({
  cycleId: 1,
  phase,
  date: '2026-09-07',
  metrics,
  notes: '',
});

describe('« Mon avant · après »', () => {
  it('avant les tests de la semaine 12 : la carte l’annonce, sans image ni bouton', () => {
    const h = renderToStaticMarkup(
      <ComparatifPartage rows={[ligne('initial', { 'test-squat-1rm': 140 })]} />,
    );
    expect(h).toContain('Disponible après les tests de la semaine 12');
    expect(h).not.toContain('<canvas');
    expect(h).not.toContain('Partager');
  });

  it('avec une mesure de la semaine 12 : aperçu, choix des deux photos, partage', () => {
    const h = renderToStaticMarkup(
      <ComparatifPartage
        rows={[
          ligne('initial', { 'test-squat-1rm': 140 }),
          ligne('final', { 'test-squat-1rm': 150 }),
        ]}
      />,
    );
    expect(h).toContain('<canvas');
    expect(h).toContain('Photo d’avant');
    expect(h).toContain('Photo d’après');
    expect(h).toContain('Partager l’image');
    expect(h).toContain('ne sont enregistrées nulle part');
  });

  it('rien n’est écrit : ni photo, ni combine, ni réglage', () => {
    const src = readFileSync(new URL('./ComparatifPartage.tsx', import.meta.url), 'utf8');
    expect(src).not.toMatch(/savePhoto|saveCombine|saveSettings|db\./);
  });
});
