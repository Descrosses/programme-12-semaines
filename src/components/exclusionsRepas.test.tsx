/**
 * Ce que la personne ne mange pas, à l'écran (`regles-repas-automatiques.md`
 * §4).
 *
 * Ce que ces tests figent :
 * - « Je ne mange pas » : repliée, une ligne qui nomme ; dépliée, une case
 *   par famille (barrée ET pleine quand écartée) ; la phrase de prudence
 *   TOUJOURS là ; les créneaux que plus aucun repas ne remplit, dits ;
 * - « Changer ce repas » ne propose aucun repas écarté, et le dit ;
 * - la fin du questionnaire dit ce que les allergies écarteront, et ce
 *   qu'elle n'a pas reconnu, mot pour mot ;
 * - une semaine composée avant garde ses repas : un bandeau le dit.
 */
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { FOOD_LIBRARY } from '../data/foodLibrary';
import type { ExclusionId } from '../data/exclusionsRepas';
import { alimentsExclus, lireAllergies } from '../engine/exclusionsRepas';
import { proposerCible } from '../engine/cibleProposee';
import { etatVide } from '../engine/questionnairePlanAlimentaire';
import { composerSemaine } from '../engine/semaineRepas';
import { ChoixRepas } from './ChoixRepas';
import { CibleCalculee } from './CibleCalculee';
import { JeNeMangePas, SemaineRepasSection } from './SemaineRepasSection';

const texte = (h: string) => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
const prudence = 'Avec une allergie, vérifie toujours la composition de chaque repas.';

describe('« Je ne mange pas »', () => {
  const rendu = (ex: ExclusionId[], ouvert = false) =>
    renderToStaticMarkup(
      <JeNeMangePas exclusions={ex} onChange={() => {}} ouvertParDefaut={ouvert} />,
    );

  it('repliée : une ligne qui nomme, et la prudence', () => {
    expect(texte(rendu([]))).toContain('Je ne mange pas : rien d’écarté');
    const h = rendu(['arachide', 'gluten']);
    expect(texte(h)).toContain('Je ne mange pas : Arachide, Gluten');
    expect(h).not.toContain('aria-pressed');
    expect(texte(h)).toContain(prudence);
  });

  it('dépliée : sept familles, l’écartée pressée', () => {
    const h = rendu(['arachide'], true);
    expect(h.match(/aria-pressed=/g)).toHaveLength(7);
    expect(h).toMatch(/aria-pressed="true"[^>]*>Arachide</);
    expect(h).toMatch(/aria-pressed="false"[^>]*>Gluten</);
    expect(texte(h)).toContain(prudence);
  });

  it('les créneaux que plus aucun repas ne remplit sont dits', () => {
    expect(texte(rendu(['gluten', 'laitiers']))).toContain(
      'la bibliothèque n’a aucun repas pour : petit-déjeuner, collation de l’après-midi',
    );
    expect(rendu(['arachide'])).not.toContain('data-creneaux-vides');
  });
});

describe('« Changer ce repas » sans ce que la personne ne mange pas', () => {
  it('aucun repas au beurre de cacahuète, et c’est dit', () => {
    const avec = (exclus?: Set<string>) =>
      renderToStaticMarkup(
        <ChoixRepas
          creneau="pdej"
          nomCreneau="Petit-déjeuner"
          preferes={[]}
          catalogue={FOOD_LIBRARY}
          onChoisir={() => {}}
          onFermer={() => {}}
          {...(exclus ? { exclus } : {})}
        />,
      );
    expect(avec()).toContain('Porridge, banane, beurre de cacahuète');
    const h = avec(alimentsExclus(['arachide']));
    expect(h).not.toContain('cacahuète');
    expect(texte(h)).toMatch(/\d+ repas (n’est|ne sont) pas proposés?/);
  });
});

describe('la fin du questionnaire lit les allergies', () => {
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
  const rendu = (allergies: string) =>
    texte(
      renderToStaticMarkup(
        <CibleCalculee
          proposition={proposerCible(e, 'power')}
          actuelle={null}
          planHistoriqueAffiche={false}
          allergies={lireAllergies(allergies)}
          onUtiliser={() => {}}
        />,
      ),
    );

  it('ce qui sera écarté, et le non reconnu mot pour mot', () => {
    const t = rendu('Arachide, kiwi');
    expect(t).toContain('les repas avec arachide seront écartés de ta semaine');
    expect(t).toContain('Non reconnu dans tes allergies : « kiwi »');
  });

  it('rien d’écrit : rien de dit', () => {
    const t = rendu('');
    expect(t).not.toContain('seront écartés');
    expect(t).not.toContain('Non reconnu');
  });

  it('le câblage : exclusions enregistrées ET appliquées à la semaine composée', () => {
    const src = readFileSync(new URL('./CibleCalculee.tsx', import.meta.url), 'utf8');
    expect(src).toContain('const allergies = lireAllergies(etat.profile.allergies);');
    expect(src).toContain('exclusionsRepas: exclusions,');
    expect(src).toContain('alimentsExclus(exclusions),');
    // Ce que la personne avait déjà écarté n'est jamais retiré ici.
    expect(src).toContain(
      '(lu.exclusions ?? []).includes(e.id) || allergies.exclusions.includes(e.id)',
    );
  });
});

describe('une semaine composée AVANT une exclusion', () => {
  it('garde ses repas, et un bandeau le dit', () => {
    const semaine = composerSemaine({ kcal: 2150, proteinG: 180 }, [], FOOD_LIBRARY, '2026-11-26');
    const rendu = (ex: ExclusionId[]) =>
      renderToStaticMarkup(
        <SemaineRepasSection
          semaine={semaine}
          cibleActuelle={{ kcal: 2150, proteinG: 180 }}
          jourInitial={3}
          cible={null}
          preferes={[]}
          catalogue={FOOD_LIBRARY}
          customs={[]}
          onCreateCustom={() => {}}
          onChange={() => {}}
          onRecomposer={() => {}}
          onQuitter={() => {}}
          exclusions={ex}
          onExclusions={() => {}}
        />,
      );
    expect(rendu([])).not.toContain('data-semaine="exclus-restants"');
    const h = rendu(['arachide']);
    expect(h).toContain('data-semaine="exclus-restants"');
    expect(texte(h)).toContain('un aliment que tu ne manges pas : Beurre de cacahuète.');
    const nutrition = readFileSync(
      new URL('../screens/NutritionScreen.tsx', import.meta.url),
      'utf8',
    );
    expect(
      nutrition.match(/composerSemaine\(cibleSemaine, preferes, catalogue, todayIso, exclus\)/g),
    ).toHaveLength(2);
    expect(nutrition).toContain('exclus={exclus}');
  });
});
