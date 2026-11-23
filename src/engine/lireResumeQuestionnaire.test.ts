/**
 * Le résumé du questionnaire, relu par l'appli. On le fabrique avec
 * `resume()` (identique au site au caractère près, vérifié par
 * `questionnairePlanAlimentaire.test.ts`) : la lecture suit donc le texte
 * réellement envoyé, pas une copie écrite à la main.
 */
import { describe, expect, it } from 'vitest';
import { OPTIONS } from '../data/questionnairePlanAlimentaire';
import { etatVide, resume, type EtatQuestionnaire } from './questionnairePlanAlimentaire';
import { lireResume } from './lireResumeQuestionnaire';

function graine(n: number) {
  let s = n;
  return () => (s = (s * 1103515245 + 12345) % 2 ** 31) / 2 ** 31;
}

function etatAleatoire(n: number): EtatQuestionnaire {
  const r = graine(n);
  const choix = (k: keyof typeof OPTIONS) => OPTIONS[k][Math.floor(r() * OPTIONS[k].length)]![0];
  const e = etatVide();
  const p = e.profile;
  p.sex = choix('sex');
  p.age = String(18 + Math.floor(r() * 50));
  p.height = String(150 + Math.floor(r() * 45));
  p.weight = (45 + Math.floor(r() * 800) / 10).toFixed(1);
  p.job = choix('job');
  p.steps = choix('steps');
  p.sessions = choix('sessions');
  p.duration = p.sessions === '0' ? null : choix('duration');
  p.sportType = p.sessions === '0' ? [] : ['muscu', 'cardio'].slice(0, 1 + Math.floor(r() * 2));
  p.goal = choix('goal');
  p.pace = p.goal === 'maintien' ? null : choix('pace');
  p.trend = choix('trend');
  p.pregnant = p.sex === 'femme' ? choix('pregnant') : null;
  p.medical = choix('medical');
  p.eating = choix('eating');
  e.selected = ['poulet', 'riz', 'skyr'];
  return e;
}

describe('aller-retour depuis le résumé réellement envoyé', () => {
  it('400 profils : chaque donnée du calcul est relue telle quelle', () => {
    for (let i = 1; i <= 400; i++) {
      const e = etatAleatoire(i);
      const p = e.profile;
      const lu = lireResume(resume(e));
      expect(lu.trouve).toBe(true);
      expect(lu.manquants, `profil ${i}`).toEqual([]);
      expect(lu.profil).toEqual({
        sexe: p.sex,
        age: Number(p.age),
        tailleCm: Number(p.height),
        poidsKg: Number(p.weight),
        travail: p.job,
        pas: p.steps,
        seances: p.sessions,
        duree: p.duration,
        objectif: p.goal,
        rythme: p.pace,
        grossesse: p.pregnant,
        maladie: p.medical,
        relation: p.eating,
      });
    }
  });

  it('le message entier, collé depuis WhatsApp, avec apostrophes typographiques', () => {
    const e = etatAleatoire(7);
    const msg = `Bonjour Guillaume,\n\nVoici mes réponses.\n\n${resume(e).replace(/'/g, '’')}\n\nMerci !`;
    expect(lireResume(msg).profil).toEqual(lireResume(resume(e)).profil);
  });

  it('les aliments passent dans le catalogue ; un aliment ajouté à la main reste à part', () => {
    const e = etatAleatoire(3);
    e.selected = ['poulet', 'perso-123'];
    const lu = lireResume(resume(e));
    expect(lu.aliments.length).toBe(1);
    expect(lu.inconnus).toEqual(['perso-123']);
  });
});

describe('ce qui manque n’est jamais deviné', () => {
  it('un champ non renseigné : profil absent, manque nommé', () => {
    const e = etatAleatoire(5);
    e.profile.weight = '';
    const lu = lireResume(resume(e));
    expect(lu.profil).toBeNull();
    expect(lu.manquants).toEqual(['poids']);
  });

  it('un libellé inconnu : la donnée manque', () => {
    const e = etatAleatoire(5);
    const t = resume(e).replace(/^Travail : .*$/m, 'Travail : Astronaute');
    expect(lireResume(t).manquants).toContain('travail');
  });

  it('un texte quelconque : rien trouvé', () => {
    expect(lireResume('Bonjour, je voudrais un plan.')).toMatchObject({
      trouve: false,
      profil: null,
    });
  });
});
