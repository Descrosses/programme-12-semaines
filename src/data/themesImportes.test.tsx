/**
 * ME, MYSELF & I — le thème d'un programme importé (lot 1, Guillaume,
 * 26 novembre : « choisir le thème de leur programme »).
 *
 * Ces tests figent :
 * - par défaut, rien ne change : le thème de ME, MYSELF & I ;
 * - POWER ou MASS choisi : les couleurs (`data-theme`) ET les bandeaux de ce
 *   thème ; les textes (« ME, MYSELF & I », sous-titres) restent ;
 * - POWER, MASS et LADIES gardent exactement leurs photos : l'exception ne
 *   vaut que pour un programme importé ;
 * - le choix est enregistré sur le programme, suit une nouvelle version,
 *   part dans la sauvegarde et revient à la restauration (un thème inconnu
 *   est ignoré) ;
 * - la carte des Réglages dit le choix par un mot, pas seulement une couleur ;
 * - les illustrations d'un programme importé gardent leur fond blanc sous
 *   tous les thèmes.
 */
import 'fake-indexeddb/auto';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ThemeProgramme } from '../components/perso/ThemeProgramme';
import { ProgrammeDB, type ProgrammeImporteRow } from '../db/db';
import { deleteDB } from '../db/testSchemas';
import { validerProgramme } from '../engine/perso/valider';
import { remplirMemoire, viderMemoire } from '../programmes/perso/memoire';
import { themePour } from '../state/theme';
import {
  ambianceFicheDe,
  BANDEAUX_IMPORTES,
  enteteDe,
  familleVisuelle,
  HABILLAGE,
  themeImporteDe,
  titresBandeauDe,
} from './famillesVisuel';
import { lireThemeImporte, THEMES_IMPORTES } from './themesImportes';

const TRAINING1 = readFileSync(
  new URL('../engine/perso/__fixtures__/training1.json', import.meta.url),
  'utf8',
);
const UID = 'training1guillaume201005';
const CLE = `perso-${UID}-1`;
const VALIDE = (() => {
  const v = validerProgramme(TRAINING1);
  if (!v.ok) throw new Error('Training 1 invalide');
  return v;
})();
const lire = (f: string) => readFileSync(new URL(f, import.meta.url), 'utf8');

/** Une ligne de programme importé, telle que la mémoire la garde. */
function ligne(theme?: 'power' | 'mass'): ProgrammeImporteRow {
  return {
    cle: CLE,
    uid: UID,
    rev: 1,
    nom: 'Training 1',
    importeLe: '2026-11-26',
    archive: false,
    texte: TRAINING1,
    document: VALIDE.programme,
    reponses: { dureeSemaines: 8 },
    ...(theme === undefined ? {} : { theme }),
  };
}

afterEach(() => viderMemoire());

describe('les couleurs et les bandeaux suivent le thème choisi', () => {
  it('par défaut : ME, MYSELF & I, exactement comme avant', () => {
    remplirMemoire([ligne()]);
    expect(themeImporteDe(CLE)).toBe('perso');
    expect(familleVisuelle(CLE)).toBe('perso');
    expect(themePour(CLE, false)).toBe('perso');
    for (const ecran of ['accueil', 'semaine', 'progres', 'reglages'] as const)
      expect(enteteDe(CLE, ecran)).toBe(HABILLAGE.perso.entetes![ecran]);
    expect(ambianceFicheDe(CLE)).toBe('cartePerso');
  });

  it('POWER choisi : couleurs et bandeaux de POWER, textes de ME, MYSELF & I', () => {
    remplirMemoire([ligne('power')]);
    expect(themePour(CLE, false)).toBe('power');
    expect(enteteDe(CLE, 'accueil')).toBe('stade');
    expect(enteteDe(CLE, 'semaine')).toBe('semainePower');
    expect(enteteDe(CLE, 'reglages')).toBe('athlete');
    expect(enteteDe(CLE, 'progres')).toBe('sprint');
    expect(titresBandeauDe(CLE, 'reglages')).toEqual({
      marque: 'ME, MYSELF & I',
      sous: 'Mon programme',
    });
  });

  it('MASS choisi : couleurs et bandeaux de MASS', () => {
    remplirMemoire([ligne('mass')]);
    expect(themePour(CLE, false)).toBe('mass');
    for (const ecran of ['accueil', 'semaine', 'progres', 'reglages'] as const)
      expect(enteteDe(CLE, ecran)).toBe(HABILLAGE.mass.entetes![ecran]);
    expect(ambianceFicheDe(CLE)).toBe('massSalle');
  });

  it('la plateforme et les écrans LADIES gardent leur thème, quel que soit le choix', () => {
    remplirMemoire([ligne('mass')]);
    expect(themePour(CLE, true)).toBe('dcross');
    expect(themePour(CLE, false, 'femmes')).toBe('femmes');
  });

  it('POWER, MASS et LADIES : leurs photos ne bougent pas (exception = programme importé)', () => {
    remplirMemoire([ligne('mass')]);
    expect(themeImporteDe('power12')).toBeNull();
    expect(themeImporteDe('mass4')).toBeNull();
    expect(themeImporteDe('femmes8')).toBeNull();
    expect(themePour('power12', false)).toBe('power');
    expect(themePour('mass-force', false)).toBe('mass');
    for (const ecran of ['accueil', 'semaine', 'progres', 'reglages'] as const) {
      expect(enteteDe('power12', ecran)).toBeUndefined();
      expect(enteteDe('femmes8', ecran)).toBeUndefined();
      expect(enteteDe('mass4', ecran)).toBe(HABILLAGE.mass.entetes![ecran]);
    }
    // Les bandeaux POWER ne servent qu'à POWER 12 et aux programmes importés.
    expect(Object.values(HABILLAGE.mass.entetes!)).not.toContain('semainePower');
  });

  it('un programme importé n’a jamais de bandeau en séance, quel que soit le thème', () => {
    for (const t of THEMES_IMPORTES) expect(BANDEAUX_IMPORTES[t.id].seance).toBeUndefined();
  });
});

describe('le choix, en base et dans la sauvegarde', () => {
  const NOM = 'themes-importes-test';
  async function base(): Promise<ProgrammeDB> {
    await deleteDB(NOM);
    const jetable = new ProgrammeDB(NOM);
    await jetable.open();
    const mod = await import('../db/db');
    Object.defineProperty(mod, 'db', { value: jetable, configurable: true, writable: true });
    return jetable;
  }
  beforeEach(async () => {
    await deleteDB(NOM);
  });

  it('choisir POWER puis revenir : l’absence EST le thème par défaut', async () => {
    const b = await base();
    const { importerProgramme, choisirTheme, programmeImporte } =
      await import('../db/programmesImportes');
    await importerProgramme(TRAINING1, { dureeSemaines: 8 });
    expect((await programmeImporte(CLE))?.theme).toBeUndefined();
    expect(await choisirTheme(CLE, 'power')).toBe(true);
    expect((await programmeImporte(CLE))?.theme).toBe('power');
    // La mémoire synchrone suit : l'appli se repeint sans redémarrer.
    expect(themePour(CLE, false)).toBe('power');
    expect(await choisirTheme(CLE, 'perso')).toBe(true);
    const r = await programmeImporte(CLE);
    expect(r).not.toHaveProperty('theme');
    expect(themePour(CLE, false)).toBe('perso');
    expect(await choisirTheme('perso-inconnu-1', 'mass')).toBe(false);
    b.close();
  });

  it('une nouvelle version du même programme reprend le thème', async () => {
    const b = await base();
    const { importerProgramme, choisirTheme, programmeImporte } =
      await import('../db/programmesImportes');
    await importerProgramme(TRAINING1, { dureeSemaines: 8 });
    await choisirTheme(CLE, 'mass');
    await importerProgramme(TRAINING1, { dureeSemaines: 6, confirmerNouvelleVersion: true });
    expect((await programmeImporte(`perso-${UID}-2`))?.theme).toBe('mass');
    b.close();
  });

  it('la restauration garde un thème connu et ignore un thème inconnu', async () => {
    const { programmesDeSauvegarde } = await import('../db/programmesImportes');
    const avec = (theme: unknown) => [{ ...ligne(), theme }];
    expect(programmesDeSauvegarde(avec('mass'), [])[0]?.theme).toBe('mass');
    expect(programmesDeSauvegarde(avec('femmes'), [])[0]).not.toHaveProperty('theme');
    expect(programmesDeSauvegarde(avec('perso'), [])[0]).not.toHaveProperty('theme');
    expect(programmesDeSauvegarde([ligne()], [])[0]).not.toHaveProperty('theme');
    expect(lireThemeImporte('<script>')).toBeUndefined();
  });
});

describe('la carte « Thème de ce programme »', () => {
  it('trois choix, celui en cours dit par un mot et `aria-checked`', () => {
    const html = renderToStaticMarkup(
      <ThemeProgramme cle={CLE} actuel="power" onChange={() => {}} />,
    );
    expect(html.match(/role="radio"/g)).toHaveLength(3);
    for (const t of ['ME, MYSELF &amp; I', 'POWER', 'MASS']) expect(html).toContain(`<b>${t}</b>`);
    expect(html.match(/aria-checked="true"/g)).toHaveLength(1);
    expect(html).toMatch(/aria-checked="true"[^>]*>(?:(?!role="radio").)*<b>POWER<\/b>/);
    expect(html.match(/>Choisi</g)).toHaveLength(1);
    expect(html).toContain('Tes séances ne changent pas.');
  });

  it('elle n’apparaît que pour un programme importé', () => {
    expect(lire('../screens/SettingsScreen.tsx')).toMatch(
      /themeImporte !== null && \(\s*<ThemeProgramme/,
    );
  });
});

describe('les illustrations d’un programme importé restent sur fond blanc, sous tout thème', () => {
  it('l’appli pose un repère sur la page pour un programme importé, et l’enlève ailleurs', () => {
    const app = lire('../App.tsx');
    expect(app).toContain("document.documentElement.dataset.importe = ''");
    expect(app).toContain('delete document.documentElement.dataset.importe');
  });

  it('fond blanc, aucun voile sur une image, plus fort que la séance MASS', () => {
    const css = lire('../screens/Session.module.css');
    expect(css).toMatch(
      /:global\(\[data-importe\]\[data-theme\]\) \.ecranSeance \.ficheImage,[^{]*\{\s*background: #fff;/,
    );
    expect(css).toMatch(
      /:global\(\[data-importe\]\[data-theme\]\) \.ecranSeance \.fiche:has\(> \.ficheImage\) \.ficheVoile,[^{]*\{\s*background: none;/,
    );
  });
});
