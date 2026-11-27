/**
 * Refonte « Journal » de l'onglet Nutrition, mode semaine de repas (maquette
 * C de Guillaume, 26 novembre : « go refonte C avec la possibilité d'ajouter
 * un repas »).
 *
 * Ce que ces tests figent :
 * - la carte « Il te reste aujourd'hui » : le reste, le dépassement DIT EN
 *   MOTS, une barre par chiffre posé (une macro absente n'a pas de barre) ;
 * - les sept pastilles datées de la semaine en cours ;
 * - la frise : seuls les repas que la semaine compose (4, 5 ou 6), plus un
 *   repas hors de ce nombre s'il porte déjà quelque chose ;
 * - « + Ajouter un repas » et « Repas par jour » : un nombre que la cible ne
 *   tient pas (§1) n'est pas proposé, et l'écran dit pourquoi ;
 * - « Mon plan » garde ses cinq repas ; la phrase de prudence des exclusions
 *   reste TOUJOURS affichée ;
 * - le câblage de l'écran.
 */
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { FOOD_LIBRARY } from '../data/foodLibrary';
import type { NombreRepas } from '../data/reglesRepasAutomatiques';
import { composerSemaine, type CibleRepas } from '../engine/semaineRepas';
import { PlanPerso } from './PlanPerso';
import { ResteDuJour } from './ResteDuJour';
import { ChoixNombreRepas, SemaineRepasSection } from './SemaineRepasSection';

const texte = (h: string) => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
const lire = (f: string) => readFileSync(new URL(f, import.meta.url), 'utf8');
const MANGE = { kcal: 1195, proteinG: 97.4, carbsG: 81, fatG: 48 };
const CIBLE = { kcal: 2150, proteinG: 180, carbsG: 225, fatG: 60 };

describe('« Il te reste aujourd’hui »', () => {
  const carte = (cible: typeof CIBLE | null, mange = MANGE, enPlus = 0) =>
    renderToStaticMarkup(
      <ResteDuJour cible={cible} mange={mange} repas={{ faits: 2, prevus: 4 }} enPlus={enPlus} />,
    );

  it('le reste en grand, le compte dessous, quatre barres', () => {
    const h = carte(CIBLE);
    const t = texte(h);
    expect(h).toContain('data-reste="reste"');
    expect(t).toContain('Il te reste aujourd’hui 955 kcal');
    expect(t).toContain('1 195 mangées sur 2 150 · 2 repas sur 4');
    expect(h.match(/data-barre=/g)).toHaveLength(4);
    expect(t).toContain('Protéines 97 / 180 g');
    // 1 195 / 2 150 = 56 %.
    expect(h).toMatch(/data-ton="kcal" style="width:56%"/);
    expect(t).not.toContain('en plus');
  });

  it('une macro non posée n’a pas de barre — jamais « 0 g »', () => {
    const h = carte({ kcal: 2150, proteinG: 180, carbsG: null, fatG: null } as never);
    expect(h.match(/data-barre=/g)).toHaveLength(2);
    expect(texte(h)).not.toContain('Glucides');
    expect(texte(h)).not.toContain('Lipides');
  });

  it('au-delà de la cible : dit en mots, la barre ne dépasse pas 100 %', () => {
    const h = carte(CIBLE, { ...MANGE, kcal: 2400 }, 1);
    expect(h).toContain('data-reste="depasse"');
    expect(texte(h)).toContain('Tu as dépassé ta cible de 250 kcal');
    expect(h).toMatch(/data-ton="kcal" style="width:100%"/);
    expect(texte(h)).toContain('1 aliment en plus');
  });

  it('sans cible : ce qui a été mangé, ni reste ni barre', () => {
    const h = carte(null);
    expect(h).toContain('data-reste="sans-cible"');
    expect(texte(h)).toContain('Mangé aujourd’hui 1 195 kcal');
    expect(h).not.toContain('data-barre=');
  });
});

const section = (
  cibleSemaine: CibleRepas,
  nombre: NombreRepas = 4,
  extra: Partial<Parameters<typeof SemaineRepasSection>[0]> = {},
) =>
  renderToStaticMarkup(
    <SemaineRepasSection
      semaine={composerSemaine(cibleSemaine, [], FOOD_LIBRARY, '2026-11-26', new Set(), nombre)}
      cibleActuelle={cibleSemaine}
      jourInitial={3}
      aujourdhui="2026-11-26"
      cible={null}
      preferes={[]}
      catalogue={FOOD_LIBRARY}
      customs={[]}
      onCreateCustom={() => {}}
      onChange={() => {}}
      onRecomposer={() => {}}
      onQuitter={() => {}}
      exclusions={[]}
      onExclusions={() => {}}
      {...extra}
    />,
  );
const etapes = (h: string) =>
  [...h.matchAll(/<p class="[^"]*etapeNom[^"]*">([^<]+)/g)].map((m) => m[1]);

describe('la journée en frise', () => {
  it('sept pastilles datées : la semaine du jeudi 26 va du 23 au 29', () => {
    const h = section({ kcal: 2150, proteinG: 180 });
    const dates = [...h.matchAll(/jourDate[^"]*">(\d+)</g)].map((m) => Number(m[1]));
    expect(dates).toEqual([23, 24, 25, 26, 27, 28, 29]);
  });

  it('la semaine passe d’un mois à l’autre sans se tromper', () => {
    const h = renderToStaticMarkup(
      <SemaineRepasSection
        semaine={composerSemaine({ kcal: 2150, proteinG: 180 }, [], FOOD_LIBRARY, '2026-12-01')}
        cibleActuelle={null}
        jourInitial={1}
        aujourdhui="2026-12-01"
        cible={null}
        preferes={[]}
        catalogue={FOOD_LIBRARY}
        customs={[]}
        onCreateCustom={() => {}}
        onChange={() => {}}
        onRecomposer={() => {}}
        onQuitter={() => {}}
      />,
    );
    expect([...h.matchAll(/jourDate[^"]*">(\d+)</g)].map((m) => Number(m[1]))).toEqual([
      30, 1, 2, 3, 4, 5, 6,
    ]);
  });

  it('4, 5 ou 6 repas : la frise montre ceux que la semaine compose, du matin au soir', () => {
    expect(etapes(section({ kcal: 2600, proteinG: 170 }, 4))).toEqual([
      'Matin · Petit-déjeuner',
      'Midi · Déjeuner',
      'Après-midi · Collation de l’après-midi',
      'Soir · Dîner',
    ]);
    expect(etapes(section({ kcal: 2600, proteinG: 170 }, 5))).toEqual([
      'Matin · Petit-déjeuner',
      'Matinée · Collation du matin',
      'Midi · Déjeuner',
      'Après-midi · Collation de l’après-midi',
      'Soir · Dîner',
    ]);
    expect(etapes(section({ kcal: 2600, proteinG: 170 }, 6)).at(-1)).toBe(
      'Soirée · Collation du soir',
    );
    expect(etapes(section({ kcal: 2600, proteinG: 170 }, 6))).toHaveLength(6);
  });

  it('un repas hors du nombre choisi reste à l’écran s’il porte quelque chose', () => {
    const plan = (journee: Parameters<typeof PlanPerso>[0]['journee']) =>
      renderToStaticMarkup(
        <PlanPerso
          kind="train"
          journee={journee}
          preferes={[]}
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
          }}
        />,
      );
    expect(etapes(plan({}))).toHaveLength(4);
    const avec = etapes(plan({ collation1: [{ foodId: 'banane', qty: 1 }] }));
    expect(avec).toHaveLength(5);
    expect(avec[1]).toBe('Matinée · Collation du matin');
    // Un repas : son plat (ou ses aliments), ses quantités en une ligne, ses kcal.
    expect(texte(plan({ collation1: [{ foodId: 'banane', qty: 1 }] }))).toContain('Banane ×1');
  });

  it('« Mon plan » garde ses cinq repas : la collation du soir n’y est pas', () => {
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
    expect(h.match(/aria-expanded="false"/g)).toHaveLength(5);
    expect(texte(h)).not.toContain('Collation du soir');
    expect(texte(h)).toContain('Cinq repas, tes aliments, tes quantités.');
  });
});

describe('ajouter un repas (§1 : 4, 5 ou 6 repas par jour)', () => {
  it('« + Ajouter un repas » sous le dernier repas, tant que la cible tient un repas de plus', () => {
    expect(section({ kcal: 2150, proteinG: 180 }, 4)).toContain('data-ajouter-repas="propose"');
    expect(section({ kcal: 2150, proteinG: 180 }, 5)).toContain('data-ajouter-repas="propose"');
    // 6 repas : il n'y a plus rien à ajouter.
    expect(section({ kcal: 2150, proteinG: 180 }, 6)).not.toContain('data-ajouter-repas');
  });

  it('cible trop basse : pas de bouton, et l’écran dit à partir de quand', () => {
    // Seule une fiche de coach descend sous 1 200 kcal.
    const h = section({ kcal: 1100, proteinG: 90 }, 4);
    expect(h).toContain('data-ajouter-repas="refuse"');
    expect(h).not.toContain('data-ajouter-repas="propose"');
    expect(texte(h)).toContain('Un repas de plus (5 par jour) : à partir de 1 200 kcal');
    expect(texte(section({ kcal: 1100, proteinG: 90 }, 5))).toContain(
      'Un repas de plus (6 par jour) : à partir de 1 200 kcal',
    );
    // Dès 1 200 kcal, le plus petit plancher : le repas de plus est proposé.
    expect(section({ kcal: 1200, proteinG: 100 }, 4)).toContain('data-ajouter-repas="propose"');
  });

  it('« Repas par jour » : un nombre refusé est désactivé ET expliqué', () => {
    const choix = (kcal: number, nombre: NombreRepas = 4) =>
      renderToStaticMarkup(<ChoixNombreRepas nombre={nombre} kcal={kcal} onChange={() => {}} />);
    const boutons = (h: string) =>
      [...h.matchAll(/<button[^>]*>(\d)<\/button>/g)].map((m) => ({
        n: Number(m[1]),
        off: m[0].includes('disabled'),
        on: m[0].includes('aria-pressed="true"'),
      }));
    expect(boutons(choix(2150, 5))).toEqual([
      { n: 4, off: false, on: false },
      { n: 5, off: false, on: true },
      { n: 6, off: false, on: false },
    ]);
    expect(choix(2150)).not.toContain('data-nombre-refuse');
    expect(boutons(choix(1200)).map((b) => b.off)).toEqual([false, false, false]);
    expect(choix(1200)).not.toContain('data-nombre-refuse');
    expect(boutons(choix(1100)).map((b) => b.off)).toEqual([false, true, true]);
    expect(texte(choix(1100))).toContain(
      '5 repas : à partir de 1 200 kcal ; 6 repas : à partir de 1 200 kcal',
    );
    // Ce que le nombre choisi compose, lu dans les règles.
    expect(texte(choix(2150, 6))).toContain(
      'Petit-déjeuner · Collation du matin · Déjeuner · Collation de l’après-midi · Dîner · Collation du soir',
    );
  });
});

describe('les outils de la semaine, en tuiles', () => {
  it('courses, « Je ne mange pas », recomposer — et le point des 2 semaines s’il existe', () => {
    const h = section({ kcal: 2150, proteinG: 180 }, 5);
    const tuiles = h.slice(h.indexOf('aria-label="Outils de ma semaine"'));
    expect(texte(tuiles)).toContain('Ma liste de courses');
    expect(texte(tuiles)).toContain('Je ne mange pas rien d’écarté');
    expect(texte(tuiles)).toContain('Recomposer ma semaine 5 repas par jour');
    expect(texte(tuiles)).not.toContain('Point des 2 semaines');
    const avec = section({ kcal: 2150, proteinG: 180 }, 4, {
      point: { resume: 'le 10 décembre', detail: <p>détail</p> },
    });
    expect(texte(avec)).toContain('Point des 2 semaines le 10 décembre');
    // Replié : la phrase du point n'est pas à l'écran.
    expect(avec).not.toContain('<p>détail</p>');
  });

  it('exclusions : les cases sont repliées, la phrase de prudence TOUJOURS là', () => {
    const h = section({ kcal: 2150, proteinG: 180 }, 4, { exclusions: ['arachide'] });
    expect(texte(h)).toContain('Je ne mange pas Arachide');
    expect(h).not.toContain('aria-label="Familles écartées"');
    expect(texte(h)).toContain(
      'Avec une allergie, vérifie toujours la composition de chaque repas.',
    );
  });
});

describe('le câblage de l’écran', () => {
  const ecran = lire('../screens/NutritionScreen.tsx');

  it('recomposer porte le nombre de repas, jamais au-delà de ce que la cible tient', () => {
    expect(ecran).toContain('onRecomposer={(nombre) =>');
    expect(ecran).toContain('nombreAdmis(nombre, cibleSemaine.kcal)');
  });

  it('mode semaine : le sélecteur de palier ne s’affiche que si les deux cibles diffèrent', () => {
    expect(ecran).toContain('{!(semaine !== null && memeCibleLesDeuxJours) && (');
    expect(ecran).toMatch(
      /memeCibleLesDeuxJours =\s*train !== null &&\s*repos !== null &&\s*train\.kcal === repos\.kcal &&\s*train\.proteinG === repos\.proteinG &&\s*train\.carbsG === repos\.carbsG &&\s*train\.fatG === repos\.fatG/,
    );
  });

  it('le point des 2 semaines : en tuile tant qu’il n’est pas dû, en carte sinon', () => {
    expect(ecran).toContain("const pointEnTuile = semaine !== null && point?.cas === 'pas-du';");
    expect(ecran).toContain(
      '{point !== null && profil !== null && cibleSemaine !== null && !pointEnTuile && (',
    );
  });

  it('la frise et les tuiles ne portent aucune couleur en dur : jetons du thème', () => {
    for (const f of ['./ResteDuJour.module.css', './SemaineRepasSection.module.css']) {
      const css = lire(f).replace(/\/\*[\s\S]*?\*\//g, '');
      expect(css.match(/#[0-9a-f]{3,8}\b/gi) ?? [], f).toEqual([]);
    }
    const frise = lire('./PlanPerso.module.css');
    const bloc = frise.slice(frise.indexOf('LA JOURNÉE EN FRISE')).replace(/\/\*[\s\S]*?\*\//g, '');
    expect(bloc.match(/#[0-9a-f]{3,8}\b/gi) ?? []).toEqual([]);
  });
});
