/**
 * Le parcours d'accueil dépend du programme.
 *
 * Régression signalée par Guillaume : démarrer MASS FORCE ouvrait le parcours
 * de POWER 12 — « Lundi du combine initial », puis « Tes maxima » avec les
 * 1RM du combine POWER de septembre, et un bouton capable de les effacer.
 */
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS_ROW } from '../db/db';
import { moduleParId } from '../programmes/registre';
import { OnboardingScreen } from './OnboardingScreen';

const rendu = (id: string) =>
  renderToStaticMarkup(
    <OnboardingScreen row={DEFAULT_SETTINGS_ROW} programme={moduleParId(id)!} onFini={() => {}} />,
  );

describe('parcours d’accueil', () => {
  it('POWER 12 garde ses trois étapes et son combine initial', () => {
    const html = rendu('power12');
    expect(html).toContain('Étape 1 sur 3');
    expect(html).toContain('Lundi du combine initial');
    expect(html).toContain('Six jours de tests');
    expect(html).toContain('Continuer');
  });

  for (const id of ['mass-force', 'mass4']) {
    it(`${id} ne pose que la date : ni combine POWER, ni maxima`, () => {
      const html = rendu(id);
      expect(html).toContain('Étape 1 sur 1');
      expect(html).toContain('Lundi de la semaine 1');
      expect(html).not.toMatch(/combine|Six jours de tests|Back Squat|Tractions/i);
      expect(html).toContain('C’est parti');
    });
  }
});
