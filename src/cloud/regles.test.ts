/**
 * Les règles de la sauvegarde en ligne (lot 1 du compte).
 *
 * La plus importante : un téléphone vide, ou qui contient MOINS que le
 * compte, n'écrase jamais la sauvegarde en ligne sans qu'on le demande.
 */
import { describe, expect, it } from 'vitest';
import {
  aSauvegarderALouverture,
  chemins,
  codeValide,
  decisionEnvoi,
  emailValide,
  estVierge,
  type ResumeSauvegarde,
} from './regles';

const r = (p: Partial<ResumeSauvegarde> = {}): ResumeSauvegarde => ({
  exporteLe: '2026-11-23T10:00:00.000Z',
  series: 0,
  seances: 0,
  repas: 0,
  pesees: 0,
  autres: 0,
  ...p,
});

describe('envoyer, ou pas', () => {
  it('une base vierge ne part jamais, même forcée', () => {
    const vide = r({ autres: 3 }); // réglages, cycle démarré : ça ne compte pas
    expect(estVierge(vide)).toBe(true);
    expect(decisionEnvoi(vide, null)).toEqual({ envoyer: false, raison: 'base-vierge' });
    expect(decisionEnvoi(vide, r({ series: 400 }), true)).toEqual({
      envoyer: false,
      raison: 'base-vierge',
    });
  });

  it('première sauvegarde : rien en ligne, on envoie', () => {
    expect(decisionEnvoi(r({ series: 1 }), null)).toEqual({ envoyer: true });
  });

  it('autant ou plus qu’en ligne : on envoie', () => {
    const enLigne = r({ series: 100, seances: 20 });
    expect(decisionEnvoi(r({ series: 100, seances: 20 }), enLigne).envoyer).toBe(true);
    expect(decisionEnvoi(r({ series: 104, seances: 21 }), enLigne).envoyer).toBe(true);
  });

  it('moins de séries qu’en ligne : retenu, avec les deux volumes', () => {
    expect(decisionEnvoi(r({ series: 12, seances: 3 }), r({ series: 400, seances: 60 }))).toEqual({
      envoyer: false,
      raison: 'moins-que-en-ligne',
      local: 15,
      enLigne: 460,
    });
  });

  it('autant de séries mais moins de repas : retenu aussi', () => {
    const d = decisionEnvoi(r({ series: 50, repas: 2 }), r({ series: 50, repas: 90 }));
    expect(d.envoyer).toBe(false);
  });

  it('« Remplacer quand même » passe outre', () => {
    expect(decisionEnvoi(r({ series: 12 }), r({ series: 400 }), true)).toEqual({ envoyer: true });
  });
});

describe('à l’ouverture de l’appli', () => {
  const maintenant = new Date('2026-11-23T12:00:00.000Z');
  it('jamais sauvegardé, ou un envoi en attente : on sauvegarde', () => {
    expect(aSauvegarderALouverture(null, false, maintenant)).toBe(true);
    expect(aSauvegarderALouverture('2026-11-23T11:59:00.000Z', true, maintenant)).toBe(true);
  });
  it('moins de 24 h : rien ; 24 h ou plus : on sauvegarde', () => {
    expect(aSauvegarderALouverture('2026-11-22T12:00:01.000Z', false, maintenant)).toBe(false);
    expect(aSauvegarderALouverture('2026-11-22T12:00:00.000Z', false, maintenant)).toBe(true);
  });
  it('une date illisible ne bloque pas la sauvegarde', () => {
    expect(aSauvegarderALouverture('n’importe quoi', false, maintenant)).toBe(true);
  });
});

describe('le reste', () => {
  it('un dossier par compte, et rien en dehors', () => {
    const c = chemins('abc-123');
    for (const p of Object.values(c)) expect(p.startsWith('abc-123/')).toBe(true);
    expect(new Set(Object.values(c)).size).toBe(3);
  });
  it('adresse et code', () => {
    expect(emailValide(' guillaume@exemple.fr ')).toBe(true);
    expect(emailValide('guillaume@exemple')).toBe(false);
    expect(codeValide('123456')).toBe(true);
    expect(codeValide('12345')).toBe(false);
    expect(codeValide('12a456')).toBe(false);
  });
});
