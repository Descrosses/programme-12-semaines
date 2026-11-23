/**
 * Le questionnaire alimentaire dans l'appli : la route, l'écran d'ouverture,
 * l'entrée depuis « Mon plan » et la relecture des réponses gardées sur le
 * téléphone. Le contenu lui-même est vérifié contre le site d'origine par
 * `engine/questionnairePlanAlimentaire.test.ts`.
 */
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TEXTES } from '../data/questionnairePlanAlimentaire';
import { etatVide } from '../engine/questionnairePlanAlimentaire';
import { ecrireQuestionnaire, lireQuestionnaire } from '../state/questionnairePlan';
import { parseRoute, routeToHash } from '../state/useRoute';
import { QuestionnairePlanScreen } from './QuestionnairePlanScreen';

beforeEach(() => {
  const store = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  });
});

describe('le questionnaire alimentaire dans l’appli', () => {
  it('a sa route', () => {
    expect(parseRoute('#/questionnaire')).toEqual({ name: 'questionnaire' });
    expect(routeToHash({ name: 'questionnaire' })).toBe('#/questionnaire');
  });

  it('s’ouvre sur l’introduction du site', () => {
    const html = renderToStaticMarkup(<QuestionnairePlanScreen onRetour={() => {}} />);
    expect(html).toContain(TEXTES.introTitre);
    expect(html).toContain(TEXTES.commencer);
  });

  it('« Mon plan » sans aliments et Réglages y mènent', () => {
    const lien = 'href="#/questionnaire"';
    for (const f of ['../components/PlanPerso.tsx', './SettingsScreen.tsx']) {
      expect(readFileSync(new URL(f, import.meta.url), 'utf8'), f).toContain(lien);
    }
  });

  it('les réponses se relisent, et ce qui n’est pas reconnu est écarté', () => {
    const e = etatVide();
    e.step = 2;
    e.selected = ['riz', 'inconnu', 'riz'];
    e.profile.sex = 'homme';
    ecrireQuestionnaire(e);
    const relu = lireQuestionnaire();
    expect(relu.step).toBe(2);
    expect(relu.selected).toEqual(['riz']);
    expect(relu.profile.sex).toBe('homme');
  });

  it('un stockage illisible repart d’un questionnaire vierge', () => {
    localStorage.setItem('p12s:questionnaire-plan-alimentaire', '{pas du json');
    expect(lireQuestionnaire()).toEqual(etatVide());
  });
});
