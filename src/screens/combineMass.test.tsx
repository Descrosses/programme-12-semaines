/**
 * L'en-tête du combiné MASS et la variante « argent » de l'écran Semaine,
 * d'après les références de Guillaume (14 novembre).
 *
 * Ce que ces tests figent :
 * - Dans le cycle, « MASS FORCE » est une ÉTIQUETTE au-dessus du titre, sans
 *   bouton : la navigation s'y fait par les onglets.
 * - Hors cycle (depuis le catalogue), le retour reste un bouton, libellé MASS.
 * - Les trois encadrés gardent leur texte et prennent chacun leur icône.
 * - La variante « argent » de l'en-tête n'existe que si on la demande, et
 *   l'écran Semaine ne la demande que pour une famille qui a une photo
 *   d'en-tête de semaine (MASS) — jamais pour POWER ni FEMMES.
 */
import 'fake-indexeddb/auto';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ScreenHeader } from '../components/ScreenHeader';
import { enteteDe } from '../data/famillesVisuel';
import { EvaluationScreen } from './EvaluationScreen';

const entete = (html: string) => html.slice(html.indexOf('<header'), html.indexOf('</header>'));

describe('l’en-tête du combiné MASS', () => {
  it('dans le cycle : « MASS FORCE » est une étiquette, pas un bouton', () => {
    const h = entete(renderToStaticMarkup(<EvaluationScreen />));
    expect(h).toMatch(/<p class="[^"]*surtitre[^"]*">MASS FORCE<\/p>/);
    expect(h).not.toContain('<button');
  });

  it('depuis le catalogue : le retour reste un bouton, sans étiquette', () => {
    const h = entete(renderToStaticMarkup(<EvaluationScreen onRetour={() => {}} />));
    expect(h).toMatch(/<button[^>]*>.*MASS<\/button>/);
    expect(h).not.toContain('surtitre');
  });

  it('les trois encadrés gardent leur texte et ont chacun une icône', () => {
    const h = entete(renderToStaticMarkup(<EvaluationScreen />));
    const encadres = h.split('encadre').slice(1);
    expect(encadres).toHaveLength(3);
    for (const e of encadres) expect(e).toContain('<svg');
    expect(h).toContain('Quatre tests avant MASS FORCE.');
    expect(h).toContain('Les séances s’ouvrent quand chaque mouvement évalué');
    expect(h).toContain('Seules la charge et les répétitions sont gardées.');
  });
});

describe('la variante « argent » (écran Semaine MASS)', () => {
  it('n’apparaît que sur demande', () => {
    expect(renderToStaticMarkup(<ScreenHeader title="Semaine 1" argent />)).toMatch(
      /<header class="[^"]*argent/,
    );
    expect(renderToStaticMarkup(<ScreenHeader title="Semaine 1" />)).not.toContain('argent');
  });

  it('l’écran Semaine ne la demande que pour MASS', () => {
    // Même condition que WeekScreen : une photo d'en-tête de semaine.
    expect(enteteDe('mass-force', 'semaine')).toBeDefined();
    expect(enteteDe('mass4', 'semaine')).toBeDefined();
    expect(enteteDe('power12', 'semaine')).toBeUndefined();
    expect(enteteDe('femmes8', 'semaine')).toBeUndefined();
  });
});
