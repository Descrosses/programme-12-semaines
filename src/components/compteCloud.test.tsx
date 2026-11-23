/**
 * « Mon compte » : facultatif, absent sans configuration, branché aux deux
 * « Séance terminée » de l'appli.
 */
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vitest';
import { utiliserService } from '../cloud/sauvegarde';
import type { ServiceCloud } from '../cloud/service';
import { CompteCloud, TEXTE_CONSENTEMENT, phraseEnvoi } from './CompteCloud';

const rien = () => {};
afterEach(() => utiliserService(null));

describe('la carte « Mon compte »', () => {
  it('sans projet configuré, elle n’existe pas : l’appli reste 100 % locale', () => {
    expect(renderToStaticMarkup(<CompteCloud onRestaurer={rien} />)).toBe('');
  });

  it('avec un projet, elle se présente comme facultative', () => {
    utiliserService({} as ServiceCloud);
    const html = renderToStaticMarkup(<CompteCloud onRestaurer={rien} />);
    expect(html).toContain('Mon compte');
    expect(html).toContain('Facultatif.');
    expect(html).toContain('Sans compte, tout reste sur ce téléphone');
  });

  it('le consentement dit ce qui part, où, ce qui reste, et comment tout effacer', () => {
    expect(TEXTE_CONSENTEMENT).toMatch(/poids/);
    expect(TEXTE_CONSENTEMENT).toMatch(/réponses de sécurité/);
    expect(TEXTE_CONSENTEMENT).toMatch(/en Europe/);
    expect(TEXTE_CONSENTEMENT).toMatch(/photos et vidéos restent sur ce téléphone/);
    expect(TEXTE_CONSENTEMENT).toMatch(/tout supprimer/);
  });

  it('chaque issue d’un envoi a sa phrase', () => {
    expect(phraseEnvoi({ statut: 'envoyee', resume: {} as never })?.ok).toBe(true);
    expect(phraseEnvoi({ statut: 'base-vierge' })?.texte).toMatch(/restaure-la/);
    expect(phraseEnvoi({ statut: 'erreur', message: 'X' })).toEqual({ texte: 'X', ok: false });
  });
});

describe('« Séance terminée » déclenche la sauvegarde', () => {
  const source = (chemin: string) => readFileSync(new URL(chemin, import.meta.url), 'utf8');

  it('POWER, MASS et programmes importés : en terminant, pas en décochant', () => {
    expect(source('../screens/SessionScreen.tsx')).toMatch(
      /if \(finishing\) \{[^}]*sauvegardeAuto\(\);[^}]*onBack\(\);/,
    );
  });

  it('FEMMES : après avoir terminé la séance', () => {
    expect(source('../screens/femmes/EcransFemmes.tsx')).toMatch(
      /onTerminer: async \(\) => \{[^}]*await terminer\(\);[^}]*sauvegardeAuto\(\);/,
    );
  });

  it('à l’ouverture de l’appli', () => {
    expect(source('../main.tsx')).toContain('demarrerSauvegardeAuto();');
  });

  it('Réglages : la carte du compte, avant celle du fichier', () => {
    const r = source('../screens/SettingsScreen.tsx');
    expect(r.indexOf('<CompteCloud')).toBeGreaterThan(-1);
    expect(r.indexOf('<CompteCloud')).toBeLessThan(r.indexOf('>Sauvegarde</h2>'));
  });
});
