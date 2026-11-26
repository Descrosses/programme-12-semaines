/**
 * Nutrition automatique, lot 1 : la cible PROPOSÉE à la fin du questionnaire
 * (`regles-cibles-nutrition.md` §0, §5, §6).
 *
 * Ce que ces tests figent :
 * - le chiffre proposé est celui du coach, au gramme près (même lecture des
 *   réponses) — l'exemple du §8 du .md donne 2 150 kcal · 180 / 225 / 60 ;
 * - seules POWER, LADIES et les programmes importés reçoivent un calcul
 *   (§0 : MASS garde ses principes sans chiffres) ;
 * - un cas du §6 (exclusion OU plancher) ne montre AUCUN chiffre : « Ta
 *   cible sera posée par Guillaume » ;
 * - le détail du calcul est replié, une cible en place est annoncée avant
 *   d'être remplacée, le plan historique masqué est dit ;
 * - la même cible est enregistrée les deux jours (§5), rien avant le bouton.
 */
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { FamilleId } from '../data/catalogue';
import type { CiblesNutrition } from '../data/ciblesNutrition';
import { calculerCibles } from '../engine/calculCibles';
import { macrosDe, proposerCible, type PropositionCible } from '../engine/cibleProposee';
import { lireResume } from '../engine/lireResumeQuestionnaire';
import { etatVide, resume } from '../engine/questionnairePlanAlimentaire';
import { CibleCalculee, dejaEnregistree } from './CibleCalculee';

function reponses(diff: Partial<ReturnType<typeof etatVide>['profile']> = {}) {
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
  return e;
}

const rendu = (
  p: PropositionCible,
  actuelle: CiblesNutrition | null = null,
  planHistoriqueAffiche = false,
) =>
  renderToStaticMarkup(
    <CibleCalculee
      proposition={p}
      actuelle={actuelle}
      planHistoriqueAffiche={planHistoriqueAffiche}
      onUtiliser={() => {}}
    />,
  );
const texte = (h: string) => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

describe('la cible proposée à la fin du questionnaire', () => {
  it('l’exemple du §8 : 2 150 kcal, 180 g P, 225 g G, 60 g L', () => {
    const p = proposerCible(reponses(), 'power');
    expect(p.cas).toBe('proposee');
    if (p.cas !== 'proposee') return;
    expect(macrosDe(p.resultat)).toEqual({ kcal: 2150, proteinG: 180, carbsG: 225, fatG: 60 });
  });

  it('le même chiffre que l’écran du coach, sur des profils variés', () => {
    const variantes = [
      {},
      { sex: 'femme', pregnant: 'non', age: '41', height: '165', weight: '68' },
      { goal: 'prise', pace: 'rapide', weight: '70' },
      { goal: 'maintien', pace: '', sessions: '0', duration: '' },
      { weight: '120', steps: '>12000', sessions: '6+', duration: '>75' },
    ];
    for (const v of variantes) {
      const e = reponses(v);
      const p = proposerCible(e, 'perso');
      const coach = calculerCibles(lireResume(resume(e)).profil!);
      expect(p.cas, JSON.stringify(v)).toBe('proposee');
      if (p.cas === 'proposee') expect(macrosDe(p.resultat)).toEqual(macrosDe(coach));
    }
  });

  it('POWER, LADIES et les programmes importés seulement (§0)', () => {
    const familles: [FamilleId | null, string][] = [
      ['power', 'proposee'],
      ['femmes', 'proposee'],
      ['perso', 'proposee'],
      ['mass', 'sans-objet'],
      [null, 'sans-objet'],
    ];
    for (const [f, cas] of familles) expect(proposerCible(reponses(), f).cas, String(f)).toBe(cas);
    expect(rendu({ cas: 'sans-objet' })).toBe('');
  });

  it('§6 : exclusion ou plancher → « posée par Guillaume », aucun chiffre', () => {
    const cas = [
      { medical: 'oui' },
      { eating: 'oui' },
      { eating: 'oral' },
      { sex: 'femme', pregnant: 'oui' },
      { weight: '58' }, // perte demandée avec un IMC de 17,9
      // Sous le plancher : 1 000 kcal pour une femme (plancher 1 200).
      {
        sex: 'femme',
        pregnant: 'non',
        age: '50',
        height: '155',
        weight: '50',
        steps: '<5000',
        sessions: '0',
        duration: '',
        pace: 'rapide',
      },
    ];
    for (const c of cas) {
      const p = proposerCible(reponses(c), 'power');
      expect(p.cas, JSON.stringify(c)).toBe('coach');
      const h = texte(rendu(p));
      expect(h).toContain('Ta cible sera posée par Guillaume');
      expect(h).not.toMatch(/\d/);
      expect(h).not.toContain('Utiliser cette cible');
    }
  });

  it('un profil incomplet nomme ce qui manque, sans chiffre', () => {
    const p = proposerCible(reponses({ weight: '' }), 'power');
    expect(p).toEqual({ cas: 'incomplet', manquants: ['poids'] });
    expect(texte(rendu(p))).toContain('il manque poids');
  });

  it('le chiffre d’abord, le calcul replié, un seul bouton', () => {
    const h = rendu(proposerCible(reponses(), 'power'));
    const t = texte(h);
    expect(h).toContain('data-cible="proposee"');
    expect(t).toContain('2 150 kcal / jour');
    expect(t).toContain('Une estimation à partir de tes réponses, pas une mesure');
    expect(h).toMatch(/<details[^>]*><summary>Comment on l’a calculée<\/summary>/);
    expect(h).not.toMatch(/<details[^>]*open/);
    for (const etape of ['Dépense au repos', 'Coefficient', 'Dépense totale', 'Objectif']) {
      expect(t).toContain(etape);
    }
    expect(h.match(/<button/g)).toHaveLength(1);
    expect(h).toContain('>Utiliser cette cible<');
    expect(t).toContain('« Mes cibles nutritionnelles »');
    expect(t).toContain('pas un avis médical');
  });

  it('une cible en place est annoncée ; la même cible n’a plus de bouton', () => {
    const p = proposerCible(reponses(), 'power');
    const autre = { kcal: 2300, proteinG: 150, carbsG: 250, fatG: 70 };
    expect(texte(rendu(p, { train: autre, rest: autre }))).toContain(
      'Elle remplacera ta cible actuelle (2 300 kcal).',
    );
    const meme = { kcal: 2150, proteinG: 180, carbsG: 225, fatG: 60 };
    const h = rendu(p, { train: meme, rest: meme });
    expect(texte(h)).toContain('Ta cible est enregistrée');
    expect(h).not.toContain('<button');
    // Un seul des deux jours différent : ce n'est pas la même cible.
    expect(dejaEnregistree({ train: meme, rest: autre }, meme)).toBe(false);
  });

  it('le plan historique affiché : l’écran dit qu’il sera masqué', () => {
    const p = proposerCible(reponses(), 'power');
    expect(texte(rendu(p, null, true))).toContain('Ton plan nutritionnel sera masqué');
    expect(texte(rendu(p, null, false))).not.toContain('sera masqué');
  });

  it('la même cible les deux jours (§5), écrite au bouton seulement', () => {
    const src = readFileSync(new URL('./CibleCalculee.tsx', import.meta.url), 'utf8');
    expect(src).toContain('ciblesNutrition: { train: { ...m }, rest: { ...m } }');
    // Deux écritures, chacune derrière SON bouton : « Utiliser cette cible »
    // et « Activer le point des 2 semaines » (lot 4).
    expect(src.match(/saveSettings\(/g)).toHaveLength(2);
    expect(src).toContain('onSuivre={() =>');
    expect(src).toContain('onUtiliser={(m) =>');
  });

  it('branchée à la fin du questionnaire, et « Aucune cible posée » y mène', () => {
    const fin = readFileSync(
      new URL('../screens/QuestionnairePlanScreen.tsx', import.meta.url),
      'utf8',
    );
    expect(fin).toMatch(
      /<CibleDuQuestionnaire etat=\{etat\} \/>\s*<p className=\{q\.chapeau\}>\{TEXTES\.fin2\}/,
    );
    const nutrition = readFileSync(
      new URL('../screens/NutritionScreen.tsx', import.meta.url),
      'utf8',
    );
    expect(nutrition).toMatch(/href="#\/questionnaire">\s*Faire calculer ma cible/);
    expect(nutrition).not.toContain('MAJK ne décide pas combien tu dois manger');
  });
});
