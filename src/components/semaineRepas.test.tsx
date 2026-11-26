/**
 * La semaine de repas à l'écran (lot 2 de la nutrition automatique).
 *
 * Ce que ces tests figent :
 * - un écran, la journée : sept jours, ouvert sur aujourd'hui (repéré
 *   autrement que par la couleur), « Mes repas · Jeudi » ;
 * - « Mon plan » en mode semaine ne dit plus « il ne décide d'aucune
 *   quantité » ; hors semaine, il le dit toujours ;
 * - « Changer ce repas » montre la bibliothèque DÉJÀ ajustée à la part du
 *   repas ; sans semaine, les quantités de référence ;
 * - la cible changée est dite (bandeau), jamais appliquée seule ; aucune
 *   confirmation ouverte d'office ;
 * - accepter la cible compose la semaine UNE fois, sans écraser une semaine
 *   ni une liste d'aliments existantes.
 */
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { FOOD_LIBRARY } from '../data/foodLibrary';
import { ajusterRepas, composerSemaine } from '../engine/semaineRepas';
import { proposerCible } from '../engine/cibleProposee';
import { etatVide } from '../engine/questionnairePlanAlimentaire';
import { ChoixRepas } from './ChoixRepas';
import { CibleCalculee } from './CibleCalculee';
import { PlanPerso } from './PlanPerso';
import { ProposerSemaine, SemaineRepasSection } from './SemaineRepasSection';

const CIBLE = { kcal: 2150, proteinG: 180 };
const SEMAINE = composerSemaine(CIBLE, ['poulet'], FOOD_LIBRARY, '2026-11-26');
const texte = (h: string) => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

const section = (cibleActuelle = CIBLE) =>
  renderToStaticMarkup(
    <SemaineRepasSection
      semaine={SEMAINE}
      cibleActuelle={cibleActuelle}
      jourInitial={3}
      aujourdhui="2026-11-26"
      cible={{ kcal: 2150, proteinG: 180, carbsG: 225, fatG: 60 }}
      preferes={['poulet']}
      catalogue={FOOD_LIBRARY}
      customs={[]}
      onCreateCustom={() => {}}
      onChange={() => {}}
      onRecomposer={() => {}}
      onQuitter={() => {}}
    />,
  );

describe('la semaine de repas, à l’écran', () => {
  it('sept jours, ouverte sur aujourd’hui, les repas du jour', () => {
    const h = section();
    expect(h.match(/aria-pressed=/g)).toHaveLength(7);
    // Sept pastilles (aria-pressed) : les tuiles et les repas n'en portent pas.
    const jours = [...h.matchAll(/<button[^>]*aria-pressed="[^"]*"[^>]*>/g)].map((m) => m[0]);
    const jeudi = jours.find((b) => b.includes('aria-label="Jeudi (aujourd’hui)"'))!;
    expect(jeudi).toContain('aria-pressed="true"');
    expect(jeudi).toContain('data-aujourdhui');
    expect(jours.filter((b) => b.includes('data-aujourdhui'))).toHaveLength(1);
    expect(texte(h)).toContain('Mes repas · Jeudi');
    expect(h).toContain('data-semaine-auto');
    expect(texte(h)).not.toContain('il ne décide d’aucune quantité');
    expect(texte(h)).toContain('Recomposer ma semaine');
    expect(texte(h)).toContain('Revenir à mon plan composé à la main');
    expect(h).not.toContain('role="alertdialog"');
  });

  it('une cible changée est dite, pas appliquée', () => {
    expect(section()).not.toContain('data-semaine="cible-changee"');
    const h = section({ kcal: 2400, proteinG: 180 });
    expect(h).toContain('data-semaine="cible-changee"');
    expect(texte(h)).toContain('Ta cible a changé (2 150 → 2 400 kcal)');
  });

  it('« Mon plan » hors semaine ne change pas', () => {
    const h = renderToStaticMarkup(
      <PlanPerso
        kind="train"
        journee={{}}
        preferes={['poulet']}
        catalogue={FOOD_LIBRARY}
        customs={[]}
        onCreateCustom={() => {}}
        cible={null}
        onChange={() => {}}
        onCopier={null}
      />,
    );
    expect(texte(h)).toContain('il ne décide d’aucune quantité');
    expect(h).not.toContain('data-semaine-auto');
  });

  it('la carte qui propose de composer la semaine', () => {
    const h = renderToStaticMarkup(<ProposerSemaine cible={CIBLE} onComposer={() => {}} />);
    expect(texte(h)).toContain('2 150 kcal, 180 g de protéines');
    expect(h).toContain('>Composer ma semaine<');
  });
});

describe('« Changer ce repas » : la bibliothèque ajustée', () => {
  const choix = (avecAjustement: boolean) =>
    renderToStaticMarkup(
      <ChoixRepas
        creneau="dejeuner"
        nomCreneau="Déjeuner"
        preferes={[]}
        catalogue={FOOD_LIBRARY}
        onChoisir={() => {}}
        onFermer={() => {}}
        {...(avecAjustement ? { ajuster: (r) => ajusterRepas(r, 0.3, CIBLE, FOOD_LIBRARY) } : {})}
      />,
    );

  it('avec la semaine : quantités ajustées à la part du repas', () => {
    const h = texte(choix(true));
    expect(h).toContain('déjà ajustées à ta cible pour ce repas');
    // Poulet, riz, brocolis : 645 kcal visées (30 % de 2 150), pas l'assiette de référence.
    const kcal = Number(/Poulet, riz, brocolis (\d+) kcal/.exec(h)![1]);
    expect(Math.abs(kcal / 645 - 1)).toBeLessThanOrEqual(0.03);
  });

  it('sans semaine : les quantités de référence, comme avant', () => {
    const h = texte(choix(false));
    expect(h).toContain('quantités de référence');
    expect(h).not.toContain('déjà ajustées');
  });
});

describe('accepter la cible compose la semaine, une fois', () => {
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
  });
  const p = proposerCible(e, 'power');
  const rendu = (semaineExiste: boolean) =>
    texte(
      renderToStaticMarkup(
        <CibleCalculee
          proposition={p}
          actuelle={null}
          planHistoriqueAffiche={false}
          semaineExiste={semaineExiste}
          onUtiliser={() => {}}
        />,
      ),
    );

  it('l’écran le dit avant le bouton, seulement s’il n’y a pas de semaine', () => {
    expect(rendu(false)).toContain('MAJK composera aussi ta semaine de repas');
    expect(rendu(true)).not.toContain('composera aussi');
  });

  it('jamais d’écrasement : ni la semaine, ni la liste d’aliments', () => {
    const src = readFileSync(new URL('./CibleCalculee.tsx', import.meta.url), 'utf8');
    expect(src).toMatch(
      /\.\.\.\(lu\.semaine\s*\?\s*\{\}\s*:\s*\{\s*semaineRepas: composerSemaine\(/,
    );
    expect(src).toContain('const sansListe = (lu.preferes ?? []).length === 0');
    expect(src).toContain('...(sansListe ? { alimentsPreferes: aliments } : {})');
  });

  it('Nutrition : la semaine remplace « Mon plan », qui n’est jamais effacé', () => {
    const src = readFileSync(new URL('../screens/NutritionScreen.tsx', import.meta.url), 'utf8');
    expect(src).toMatch(/semaine !== null \? \(\s*<SemaineRepasSection/);
    expect(src).toContain('onQuitter={() => void enregistreSemaine(null)}');
    expect(src).not.toMatch(/planPerso: null/);
  });
});

describe('cocher un repas mangé (semaine automatique)', () => {
  const plan = (faits?: { pris: ReadonlySet<'pdej' | 'dejeuner'> }) =>
    renderToStaticMarkup(
      <PlanPerso
        kind="train"
        journee={SEMAINE.jours[3]!}
        preferes={['poulet']}
        catalogue={FOOD_LIBRARY}
        customs={[]}
        onCreateCustom={() => {}}
        cible={null}
        onChange={() => {}}
        onCopier={null}
        semaine={{
          jour: 'Jeudi',
          creneaux: ['pdej', 'dejeuner', 'collation2', 'diner'],
          ajusteur: () => undefined,
          ...(faits ? { faits: { pris: faits.pris, onBasculer: () => {} } } : {}),
        }}
      />,
    );

  it('une coche par repas posé, dite au lecteur d’écran ; aucune sur un créneau vide', () => {
    const h = plan({ pris: new Set(['pdej'] as const) });
    expect(h).toContain('aria-label="Petit-déjeuner — mangé"');
    expect(h).toContain('aria-label="Déjeuner — pas encore mangé"');
    expect(h.match(/— (?:mangé|pas encore mangé)"/g)).toHaveLength(4);
    expect(h).not.toContain('Collation du matin — ');
    expect(texte(h)).toContain('Coche un repas quand il est mangé');
  });

  it('sans le geste (un autre jour que le jour même) : aucune coche', () => {
    const h = plan();
    expect(h).not.toMatch(/— (?:mangé|pas encore mangé)"/);
    expect(texte(h)).not.toContain('Coche un repas');
  });

  it('on ne coche que les repas du jour, dans le journal des repas pris', () => {
    const section = readFileSync(new URL('./SemaineRepasSection.tsx', import.meta.url), 'utf8');
    expect(section).toContain('...(faits && jour === jourInitial ? { faits } : {})');
    const ecran = readFileSync(new URL('../screens/NutritionScreen.tsx', import.meta.url), 'utf8');
    expect(ecran).toContain('setMealEaten(todayIso, cleRepasFait(repas), !faits.has(repas))');
    // Le journal ne se ressaisit plus : en mode semaine, la carte « Il te
    // reste aujourd'hui » fait le compte (repas cochés + aliments en plus), et
    // « Ce que j'ai mangé » ne s'affiche plus que hors semaine.
    expect(ecran).toMatch(/\{semaine !== null && \(\s*<ResteDuJour/);
    expect(ecran).toMatch(
      /\{semaine === null && \(\s*<section className=\{styles\.card\}>\s*<h2 className=\{styles\.cardTitle\}>Ce que j’ai mangé/,
    );
    expect(ecran).toContain('+ Ajouter un aliment hors de mes repas');
  });
});
