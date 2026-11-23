/**
 * L'onglet Nutrition de FEMMES et ses bandeaux photo (Guillaume, 23 novembre).
 *
 * - la Nutrition FEMMES est l'écran « Mon plan » de l'appli, JAMAIS le plan
 *   historique de Guillaume ;
 * - FEMMES n'a pas de calendrier : « entraînement » seulement si une séance
 *   a été terminée ce jour-là ;
 * - chaque bandeau FEMMES reste dans FEMMES (règle de Guillaume : une image
 *   ne passe jamais d'un programme à l'autre).
 */
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { FemmesSeanceRow } from '../../db/db';
import { VISUELS, type VisuelNom } from '../../data/visuels';
import { parseRoute, routeToHash } from '../../state/useRoute';
import { paliersFemmes } from './NutritionFemmes';

const lire = (chemin: string) => readFileSync(new URL(chemin, import.meta.url), 'utf8');

const ligne = (date: string, terminee: boolean): FemmesSeanceRow =>
  ({ cycleId: 1, semaine: 1, jour: 0, version: 'maison', date, terminee }) as FemmesSeanceRow;

const FEMMES: VisuelNom[] = [
  'femmesAujourdhui',
  'femmesSemaine',
  'femmesNutrition',
  'femmesMesures',
  'femmesReglages',
];

describe('Nutrition FEMMES', () => {
  it('a sa route : #/femmes/nutrition', () => {
    expect(parseRoute('#/femmes/nutrition')).toEqual({ name: 'femmes', vue: 'nutrition' });
    expect(routeToHash({ name: 'femmes', vue: 'nutrition' })).toBe('#/femmes/nutrition');
  });

  it('l’onglet du bas y mène (il ramenait à Aujourd’hui)', () => {
    expect(lire('./EcransFemmes.tsx')).toMatch(/o === 'nutrition'\) onNaviguer\('nutrition'\)/);
  });

  it('entraînement seulement si une séance FEMMES a été TERMINÉE ce jour-là', () => {
    expect(paliersFemmes([], '2026-11-23')).toBe('rest');
    expect(paliersFemmes([ligne('2026-11-23', false)], '2026-11-23')).toBe('rest');
    expect(paliersFemmes([ligne('2026-11-22', true)], '2026-11-23')).toBe('rest');
    expect(paliersFemmes([ligne('2026-11-23', true)], '2026-11-23')).toBe('train');
  });

  it('jamais le plan historique de Guillaume, même s’il est allumé dans les réglages', () => {
    expect(lire('./NutritionFemmes.tsx')).toMatch(/<NutritionScreen[\s\S]*sansPlanHistorique/);
    expect(lire('../NutritionScreen.tsx')).toContain(
      'setLegacyPlan(sansPlanHistorique ? false : settings.legacyNutritionPlan)',
    );
  });

  it('les cibles et la fiche se règlent dans les Réglages FEMMES, sans la phrase du plan historique', () => {
    expect(lire('./FemmesScreens.tsx')).toMatch(
      /<CartesNutrition[\s\S]*avecPlanHistorique=\{false\}/,
    );
  });

  it('le retour du questionnaire alimentaire mène à la Nutrition FEMMES', () => {
    expect(lire('../../App.tsx')).toContain(
      "vue: route.name === 'nutrition' ? 'nutrition' : 'aujourdhui'",
    );
  });
});

describe('bandeaux FEMMES', () => {
  it('les deux tailles de chacun existent', () => {
    for (const nom of FEMMES) {
      for (const f of [VISUELS[nom].display, VISUELS[nom].mobile]) {
        expect(existsSync(new URL(`../../../public/visuels/${f}`, import.meta.url)), f).toBe(true);
      }
    }
  });

  it('chaque écran FEMMES montre le sien', () => {
    const ecrans = lire('./FemmesScreens.tsx');
    for (const nom of ['femmesAujourdhui', 'femmesSemaine', 'femmesReglages']) {
      expect(ecrans).toContain(`photo="${nom}"`);
    }
    expect(lire('./NutritionFemmes.tsx')).toContain('photo="femmesNutrition"');
  });

  it('les titres sont ceux de la planche des six bandeaux de Guillaume', () => {
    const ecrans = lire('./FemmesScreens.tsx').replace(/\s+/g, ' ');
    expect(ecrans).toContain('titre="Aujourd’hui" taille="xl" sousTitre="Ma séance du jour"');
    expect(ecrans).toContain(
      'titre="Semaine" taille="xl" sousTitre={[\'Mon programme\', \'semaine par semaine\']}',
    );
    expect(ecrans).toContain("['Mon compte, mes préférences', 'et mon programme']");
    expect(lire('./NutritionFemmes.tsx').replace(/\s+/g, ' ')).toContain(
      'titre="Nutrition" taille="xl" sousTitre="Mon suivi nutritionnel"',
    );
  });

  it('le bandeau remonte sous l’heure, la photo nette commence dessous', () => {
    const css = lire('./Femmes.module.css');
    // `.app` réserve déjà l'encoche : la marge négative l'annule (sinon un
    // vide doublait l'encoche au-dessus de la photo, vu sur iPhone).
    expect(css).toMatch(/\.hero \{[^}]*margin-top: calc\(-1 \* var\(--haut\)\);/);
    expect(css).toMatch(/\.hero img \{[^}]*top: var\(--haut\);/);
    expect(lire('../../styles/global.css')).toMatch(
      /\[data-bandeau-photo\]:not\(\[data-defile\]\) body::before \{\s*background: transparent;/,
    );
  });

  it('le bandeau Nutrition est le bol, sous un nom NEUF (cache de 180 jours)', () => {
    // Remplacé sous son ancien nom, le bol ne remplaçait rien sur l'iPhone :
    // les images sont en CacheFirst. Ce nom ne doit jamais revenir.
    expect(VISUELS.femmesNutrition.display).toBe('55_femmes_nutrition_bol_display.webp');
    expect(Object.values(VISUELS).some((v) => v.display?.startsWith('52_'))).toBe(false);
  });

  it('les têtes restent entières : photo calée en haut, fondu de 10 px au plus', () => {
    // Retour de Guillaume (iPhone) : recadrée par le haut et fondue sur
    // 26 px, la photo effaçait la tête des athlètes.
    // Nutrition n'a pas d'athlète (bol et smoothie) : calé vers le bas.
    for (const nom of FEMMES.filter((n) => n !== 'femmesNutrition')) {
      expect(VISUELS[nom].focus).toMatch(/ 0%$/);
    }
    const fondu = /\.hero img \{[^}]*#000 (\d+)px\)/.exec(lire('./Femmes.module.css'));
    expect(Number(fondu?.[1])).toBeLessThanOrEqual(10);
  });

  it('aucun bandeau FEMMES hors des écrans FEMMES', () => {
    for (const f of [
      '../NutritionScreen.tsx',
      '../SettingsScreen.tsx',
      '../WeekScreen.tsx',
      '../CombineScreen.tsx',
      '../../data/famillesVisuel.ts',
    ]) {
      const source = lire(f);
      for (const nom of FEMMES)
        expect({ f, nom, present: source.includes(nom) }).toEqual({
          f,
          nom,
          present: false,
        });
    }
  });
});
