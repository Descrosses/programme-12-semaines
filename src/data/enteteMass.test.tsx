/**
 * Les en-têtes MASS (maquettes de Guillaume, 14 novembre).
 *
 * 1. Les quatre photos d'en-tête existent et ne servent qu'à MASS.
 * 2. L'Accueil MASS a un en-tête PERMANENT : « MASS », le nom exact du cycle,
 *    « Semaine X / Y ». Jamais l'état du jour (« Ça commence bientôt »).
 * 3. POWER et FEMMES ne reçoivent rien de tout cela.
 */
import { existsSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ScreenHeader } from '../components/ScreenHeader';
import { enteteAccueilFixe, enteteDe, HABILLAGE, marqueDe } from './famillesVisuel';
import { VISUELS } from './visuels';

const fichier = (nom: string) => new URL(`../../public/visuels/${nom}`, import.meta.url);

describe('les quatre photos d’en-tête MASS', () => {
  it('chaque écran a la sienne, et les deux tailles existent', () => {
    expect(HABILLAGE.mass.entetes).toEqual({
      accueil: 'massAthlete',
      semaine: 'massDisque',
      seance: 'massSalle',
      combine: 'massDisques',
    });
    for (const nom of Object.values(HABILLAGE.mass.entetes!)) {
      for (const f of [VISUELS[nom].display, VISUELS[nom].mobile]) {
        expect(existsSync(fichier(f)), f).toBe(true);
      }
    }
  });

  it('FORCE et CONGESTION les reçoivent ; POWER et FEMMES, non', () => {
    expect(enteteDe('mass-force', 'semaine')).toBe('massDisque');
    expect(enteteDe('mass4', 'accueil')).toBe('massAthlete');
    for (const id of ['power12', 'femmes8']) {
      for (const ecran of ['accueil', 'semaine', 'seance', 'combine'] as const) {
        expect(enteteDe(id, ecran)).toBeUndefined();
      }
    }
  });
});

describe('l’en-tête permanent de l’Accueil MASS', () => {
  it('MASS FORCE : marque, nom exact du cycle, semaine X / Y', () => {
    expect(enteteAccueilFixe('mass-force', 4, 1)).toEqual({
      marque: 'MASS',
      titre: 'MASS FORCE',
      sous: 'Semaine 1 / 4',
    });
    expect(enteteAccueilFixe('mass-force', 4, 3)?.sous).toBe('Semaine 3 / 4');
  });

  it('MASS CONGESTION porte son propre nom', () => {
    expect(enteteAccueilFixe('mass4', 4, 2)?.titre).toBe('MASS CONGESTION');
  });

  it('POWER et FEMMES gardent leur en-tête du jour', () => {
    expect(marqueDe('power12')).toBeUndefined();
    expect(marqueDe('femmes8')).toBeUndefined();
    expect(enteteAccueilFixe('power12', 12, 4)).toBeNull();
    expect(enteteAccueilFixe('femmes8', 8, 1)).toBeNull();
  });

  it('le rendu : la marque en tête, le nom du cycle en titre, aucun état du jour', () => {
    const e = enteteAccueilFixe('mass-force', 4, 1)!;
    const html = renderToStaticMarkup(
      <ScreenHeader
        eyebrow="samedi 14 novembre"
        title={e.titre}
        subtitle={e.sous}
        marque={e.marque}
      />,
    );
    expect(html).toMatch(/<p class="[^"]*marque[^"]*">MASS<\/p>/);
    expect(html).toMatch(/<h1[^>]*>MASS FORCE<\/h1>/);
    expect(html).toContain('Semaine 1 / 4');
    expect(html).not.toMatch(/bientôt/i);
  });

  it('sans marque, l’en-tête est celui d’avant (POWER)', () => {
    const html = renderToStaticMarkup(<ScreenHeader title="Back Squat" />);
    expect(html).not.toContain('marque');
  });
});
