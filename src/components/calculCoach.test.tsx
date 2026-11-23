/**
 * L'écran coach (`#/admin`) : coller le questionnaire, voir le calcul.
 *
 * Ce que ces tests figent :
 * - chaque étape du calcul est montrée, et la cible annoncée comme une
 *   estimation ;
 * - une exclusion du §6 est DITE (« ne le proposerait pas »), les chiffres
 *   restent visibles — le coach décide ;
 * - un profil incomplet nomme ce qui manque et ne calcule rien ;
 * - la carte « Préparer une fiche » lit le questionnaire et ne réclame plus
 *   les quatre valeurs, ni ne dit que l'appli « ne calcule pas ».
 */
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { etatVide, resume } from '../engine/questionnairePlanAlimentaire';
import { lireResume } from '../engine/lireResumeQuestionnaire';
import { CalculCoach } from './CalculCoach';

function questionnaire(diff: Partial<ReturnType<typeof etatVide>['profile']> = {}) {
  const e = etatVide();
  Object.assign(e.profile, {
    sex: 'homme',
    age: '34',
    height: '180',
    weight: '82.5',
    job: 'assis',
    steps: '5000-8000',
    sessions: '4',
    duration: '45-75',
    sportType: ['muscu'],
    goal: 'perte',
    pace: 'modere',
    medical: 'non',
    eating: 'non',
    ...diff,
  });
  e.selected = ['poulet'];
  return resume(e);
}

const rendu = (texte: string) =>
  renderToStaticMarkup(<CalculCoach lecture={lireResume(texte)} onReprendre={() => {}} />);
const texte = (h: string) => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

describe('le calcul montré au coach', () => {
  it('l’exemple du .md : chaque étape, la cible, proposable', () => {
    const h = rendu(questionnaire());
    expect(h).toContain('data-calcul="proposable"');
    for (const etape of [
      'Dépense au repos',
      'Coefficient',
      'Dépense totale',
      'Objectif',
      'Protéines',
      'Lipides',
      'Glucides',
    ]) {
      expect(h).toContain(etape);
    }
    expect(texte(h)).toContain('2 150 kcal · 180 g P · 225 g G · 60 g L');
    expect(texte(h)).toContain('Une estimation, pas une mesure');
    expect(h).toContain('Reprendre ces chiffres pour les deux journées');
    expect(h).not.toContain('ne le proposerait pas');
  });

  it('une exclusion du §6 est dite, les chiffres restent', () => {
    const h = rendu(questionnaire({ medical: 'oui' }));
    expect(h).toContain('data-calcul="a-voir"');
    expect(h).toContain('L’appli ne le proposerait pas à la personne');
    expect(h).toContain('Maladie ou traitement');
    expect(h).toContain('Reprendre ces chiffres');
  });

  it('un profil incomplet : ce qui manque, aucun chiffre', () => {
    const h = rendu(questionnaire({ weight: '' }));
    expect(h).toContain('data-calcul="incomplet"');
    expect(texte(h)).toContain('Il manque : poids.');
    expect(h).not.toContain('kcal');
  });
});

describe('la carte « Préparer une fiche »', () => {
  const src = readFileSync(new URL('../screens/SettingsScreen.tsx', import.meta.url), 'utf8');
  const carte = src.slice(src.indexOf('export function CarteFichePour'));

  it('lit le questionnaire et montre le calcul', () => {
    expect(carte).toContain('lireResume(collage)');
    expect(carte).toContain('<CalculCoach');
    expect(carte).toMatch(/setCibles\(\{ train: m, rest: \{ \.\.\.m \} \}\)/);
  });

  it('plus de texte périmé', () => {
    expect(carte).not.toContain('ne calcule pas');
    expect(carte).not.toContain('les quatre valeurs');
  });
});
