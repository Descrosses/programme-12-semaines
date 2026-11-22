/**
 * Le rappel de sauvegarde du dernier jour d'entraînement de la semaine, et
 * l'outil de coach sorti des Réglages (décisions de Guillaume, 22 novembre).
 *
 * Ce que ces tests figent :
 * - le rappel ne paraît que le DERNIER jour qui porte une séance, selon le
 *   programme (dimanche pour POWER, samedi pour MASS CONGESTION, dernier jour
 *   de la semaine FEMMES) ;
 * - il se tait dès qu'un export a été fait le jour même ;
 * - la date est LOCALE (à 23 h 30, on est toujours aujourd'hui) ;
 * - « Préparer une fiche pour quelqu'un » n'est plus dans les Réglages, et vit
 *   sur l'écran admin, que seule son adresse ouvre.
 */
import 'fake-indexeddb/auto';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { WEEK_DAYS } from '../data/femmes/programme';
import { moduleParId } from '../programmes/registre';
import { AdminScreen } from '../screens/AdminScreen';
import { aujourdhuiLocal } from '../state/dernierExport';
import { parseRoute } from '../state/useRoute';
import { estDernierJourDEntrainement, etatRappelSauvegarde } from './rappelSauvegarde';

const etat = (jours: readonly number[], jour: number, dernierExport: string | null) =>
  etatRappelSauvegarde({ joursDeLaSemaine: jours, jour, dernierExport, aujourdhui: '2026-11-22' });

describe('le rappel de sauvegarde', () => {
  it('seulement le dernier jour qui porte une séance', () => {
    expect(estDernierJourDEntrainement([0, 2, 4, 5, 6], 6)).toBe(true);
    expect(estDernierJourDEntrainement([0, 2, 4, 5, 6], 5)).toBe(false);
    expect(estDernierJourDEntrainement([], 0)).toBe(false);
    expect(etat([0, 1, 3, 5], 3, null)).toBeNull();
  });

  it('conseille l’export, puis se tait une fois l’export du jour fait', () => {
    expect(etat([0, 1, 3, 5], 5, null)).toBe('conseiller');
    expect(etat([0, 1, 3, 5], 5, '2026-11-15')).toBe('conseiller');
    expect(etat([0, 1, 3, 5], 5, '2026-11-22')).toBe('fait');
  });

  it('le dernier jour est celui de chaque programme', () => {
    const dernier = (id: string, semaine: number) =>
      Math.max(...moduleParId(id)!.joursDeLaSemaine(semaine));
    expect(dernier('power12', 1)).toBe(6); // dimanche
    expect(dernier('mass4', 1)).toBe(5); // samedi
    for (const jours of Object.values(WEEK_DAYS)) {
      expect(estDernierJourDEntrainement(jours, Math.max(...jours))).toBe(true);
    }
  });

  it('la date du jour est locale, pas UTC', () => {
    expect(aujourdhuiLocal(new Date(2026, 10, 22, 23, 30))).toBe('2026-11-22');
    expect(aujourdhuiLocal(new Date(2026, 0, 5, 0, 10))).toBe('2026-01-05');
  });
});

describe('« Préparer une fiche pour quelqu’un » : outil de coach, pas de l’utilisateur', () => {
  it('n’est plus rendu par les Réglages', () => {
    const reglages = readFileSync(
      new URL('../screens/SettingsScreen.tsx', import.meta.url),
      'utf8',
    );
    expect(reglages).not.toMatch(/<CarteFichePour\s*\/>/);
  });

  it('vit sur l’écran admin, ouvert par sa seule adresse', () => {
    expect(parseRoute('#/admin')).toEqual({ name: 'admin' });
    expect(renderToStaticMarkup(<AdminScreen onRetour={() => {}} />)).toContain(
      'Préparer une fiche pour quelqu’un',
    );
  });

  it('aucun lien vers l’écran admin dans l’application', () => {
    const app = readFileSync(new URL('../App.tsx', import.meta.url), 'utf8');
    // Seule la route le rend ; aucune navigation ne mène à `admin`.
    expect(app).not.toMatch(/navigate\(\{ name: 'admin' \}\)/);
  });
});
