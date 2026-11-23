/**
 * Le bilan sportif dans l'appli : la route, les portes d'entrée, chaque
 * écran rendu avec ses questions, le résumé final, et la relecture des
 * réponses gardées sur le téléphone. Le contenu et la logique sont
 * vérifiés contre le site par `engine/questionnaireBilanSportif.test.ts`.
 */
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TEXTES_ORIENTATION } from '../data/orientationProgrammes';
import { SECTIONS, TEXTES } from '../data/questionnaireBilanSportif';
import {
  etatVide,
  resume,
  sectionsVisibles,
  type EtatBilan,
} from '../engine/questionnaireBilanSportif';
import { ecrireBilan, lireBilan } from '../state/questionnaireBilan';
import { parseRoute, routeToHash } from '../state/useRoute';
import { QuestionnaireBilanScreen } from './QuestionnaireBilanScreen';

beforeEach(() => {
  const store = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  });
});

/** Le rendu de l'écran, entités HTML remises en caractères. */
const html = (e: EtatBilan) => {
  ecrireBilan(e);
  return renderToStaticMarkup(<QuestionnaireBilanScreen onRetour={() => {}} />)
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&');
};

/** Un bilan qui ouvre TOUTES les sections et toutes les questions conditionnelles. */
function bilanComplet(): EtatBilan {
  const e = etatVide();
  e.name = 'Léa';
  e.profil = 'sportif';
  e.situ = ['p', 'sp'];
  e.consent = '23/11/2026';
  e.A = {
    q3: 'Améliorer explosivité / vitesse / qualités athlétiques',
    q3b: ['Musculation', 'Pilates'],
    q6: 'Oui',
    q12b: "J'ai une échéance précise",
  };
  return e;
}

describe('le bilan sportif dans l’appli', () => {
  it('a sa route', () => {
    expect(parseRoute('#/bilan')).toEqual({ name: 'bilan' });
    expect(routeToHash({ name: 'bilan' })).toBe('#/bilan');
  });

  it('le catalogue et Réglages y mènent', () => {
    for (const f of ['./CatalogueScreen.tsx', './SettingsScreen.tsx'])
      expect(readFileSync(new URL(f, import.meta.url), 'utf8'), f).toContain('href="#/bilan"');
  });

  it('s’ouvre sur l’accueil du site : avertissement, profils, situations, accord', () => {
    const h = html(etatVide());
    for (const t of [
      TEXTES.titre,
      TEXTES.chapeau,
      TEXTES.avertissement,
      TEXTES.profil,
      TEXTES.situationAide,
      TEXTES.consentement,
      TEXTES.commencer,
    ])
      expect(h, t).toContain(t);
  });

  it('chaque section s’affiche avec toutes ses questions, conditions ouvertes', () => {
    const e = bilanComplet();
    const secs = sectionsVisibles(e);
    expect(secs).toHaveLength(SECTIONS.length);
    secs.forEach((sec, i) => {
      const h = html({ ...e, step: i });
      expect(h).toContain(sec.title);
      expect(h).toContain(`Étape ${i + 1} sur ${secs.length}`);
      for (const q of sec.qs) {
        expect(h, q.id).toContain(q.t);
        if (q.hint) expect(h, q.id).toContain(q.hint);
      }
    });
  });

  it('une question conditionnelle reste cachée tant que sa condition manque', () => {
    const e = bilanComplet();
    e.A = { q6: 'Non' };
    const sante = sectionsVisibles(e).findIndex((s) => s.title === 'Santé et limitations');
    expect(html({ ...e, step: sante })).not.toContain('Précise la zone');
  });

  it('la fin : le résumé exact, l’envoi par e-mail et WhatsApp', () => {
    const e = bilanComplet();
    const h = html({ ...e, step: 99 });
    expect(h).toContain("Merci Léa, c'est terminé");
    expect(h).toContain(resume(e));
    expect(h).toContain('mailto:g.descrosses@hotmail.fr');
    expect(h).toContain('https://wa.me/33699906737');
  });

  it('les réponses se relisent ; ce qui n’est pas reconnu est écarté', () => {
    const e = bilanComplet();
    ecrireBilan({ ...e, situ: ['p', 'inconnue'], step: 3 });
    const relu = lireBilan();
    expect(relu.situ).toEqual(['p']);
    expect(relu.step).toBe(3);
    expect(relu.A).toEqual(e.A);
    localStorage.setItem('p12s:questionnaire-bilan-sportif', '{pas du json');
    expect(lireBilan()).toEqual(etatVide());
  });

  it('jamais en base, ni dans l’export, ni dans la sauvegarde en ligne', () => {
    for (const f of ['../db/export.ts', '../db/repo.ts', '../cloud/sauvegarde.ts']) {
      const src = readFileSync(new URL(f, import.meta.url), 'utf8');
      expect(src, f).not.toMatch(/bilan-sportif|questionnaireBilan/);
    }
  });

  it('la fin : l’encart d’orientation, sans toucher au résumé envoyé', () => {
    const semaine = Object.fromEntries(
      ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'].map((d) => [d, '70']),
    );
    const e = etatVide();
    e.name = 'Karim';
    e.profil = 'sportif';
    e.consent = '23/11/2026';
    e.step = 99;
    e.A = {
      h1: 'Non',
      h2: 'Non',
      h3: 'Non',
      h4: 'Non',
      h5: 'Non',
      h6: 'Non',
      q6: 'Non',
      q3: 'Devenir plus fort',
      q9: 'Confirmé (3 à 5 ans)',
      q11: ['Squat avec barre', 'Développé couché', 'Soulevé de terre'],
      q12: '5',
      q13: semaine,
      q14: 'Salle',
    };
    const h = html(e);
    expect(h).toContain('data-orientation="suggestions"');
    expect(h).toContain(TEXTES_ORIENTATION.titre);
    expect(h).toContain('POWER CYCLE 1');
    expect(h).toContain('href="#/catalogue/power"');
    expect(h).toContain(TEXTES_ORIENTATION.phrase);
    expect(h).not.toMatch(/Démarrer/);
    expect(h).toContain(resume(e));
    expect(resume(e)).not.toContain(TEXTES_ORIENTATION.titre);

    const orange = html({ ...e, A: { ...e.A, q6: 'Oui', q6b: 'genou' } });
    expect(orange).toContain('data-orientation="orange"');
    expect(orange).toContain(TEXTES_ORIENTATION.orange);
    expect(orange).not.toContain('POWER CYCLE 1');
  });
});
