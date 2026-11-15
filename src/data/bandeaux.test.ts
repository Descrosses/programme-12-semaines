/**
 * Les bandeaux du 14 novembre : trois pour POWER, quatre pour la famille MASS.
 *
 * Règle absolue de Guillaume : chaque image reste dans son programme. Ces
 * tests empêchent un bandeau MASS d'apparaître dans POWER (ou l'inverse),
 * une image absente du disque, et un retour aux anciennes photos.
 */
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { enteteDe, HABILLAGE } from './famillesVisuel';
import { VISUELS, type VisuelNom } from './visuels';

const fichier = (nom: string) => new URL(`../../public/visuels/${nom}`, import.meta.url);
const source = (f: string) => readFileSync(new URL(`../screens/${f}`, import.meta.url), 'utf8');

const POWER: VisuelNom[] = ['nutritionPower', 'combinePower', 'semainePower'];
const MASS: VisuelNom[] = ['massNutrition', 'massReglages', 'massMesures', 'massProgres'];

describe('les sept bandeaux', () => {
  it('les deux tailles de chacun existent', () => {
    for (const nom of [...POWER, ...MASS]) {
      for (const f of [VISUELS[nom].display, VISUELS[nom].mobile]) {
        expect(existsSync(fichier(f)), f).toBe(true);
      }
    }
  });

  it('POWER : Nutrition, Combine et Semaine montrent les nouveaux bandeaux', () => {
    expect(source('NutritionScreen.tsx').match(/visuel="nutritionPower"/g)).toHaveLength(2);
    expect(source('CombineScreen.tsx')).toContain('visuel="combinePower"');
    expect(source('WeekScreen.tsx')).toContain("visuel: 'semainePower'");
  });

  it('les bandeaux MASS ne servent qu’à la famille MASS', () => {
    for (const ecran of ['nutrition', 'progres', 'mesures', 'reglages'] as const) {
      expect(enteteDe('mass-force', ecran)).toBe(enteteDe('mass4', ecran));
      expect(MASS).toContain(enteteDe('mass4', ecran));
      expect(enteteDe('power12', ecran)).toBeUndefined();
      expect(enteteDe('femmes8', ecran)).toBeUndefined();
    }
  });

  it('aucun bandeau POWER dans MASS, aucun bandeau MASS dans les écrans POWER', () => {
    const mass = Object.values(HABILLAGE.mass.entetes!);
    for (const nom of POWER) expect(mass).not.toContain(nom);
    for (const f of ['NutritionScreen.tsx', 'CombineScreen.tsx']) {
      for (const nom of MASS) expect(source(f)).not.toContain(nom);
    }
  });
});
