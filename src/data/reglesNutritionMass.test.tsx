/**
 * `regles-nutrition-mass.md` fait foi pour le regard MASS (Guillaume, 27
 * novembre, « go MASS lot 1 »). Ce test relit ses tableaux, rejoue son
 * exemple, et fige ce que le lot 1 a ouvert :
 *
 * - le regard ne change que deux valeurs, et seulement en PRISE de masse ;
 * - il suit la cible dans le profil gardé : le point des deux semaines refait
 *   la répartition avec les mêmes règles ;
 * - le nombre de repas par défaut dépend du programme (CONGESTION reste à 4 :
 *   son premier principe écrit « 4 prises par jour ») ;
 * - sous MASS, jamais le plan historique de POWER ; les six principes de
 *   CONGESTION restent en tête d'écran.
 */
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  calculerCibles,
  regardApplique,
  repartir,
  type ProfilCalcul,
} from '../engine/calculCibles';
import { FAMILLES_AVEC_CALCUL, proposerCible, regardDe } from '../engine/cibleProposee';
import { etatVide } from '../engine/questionnairePlanAlimentaire';
import {
  ajouterJours,
  pointDesDeuxSemaines,
  profilAGarder,
  type Pesee,
  type ProfilNutrition,
} from '../engine/reajustement';
import { composerSemaine, conseilRepasMass, repasParDefaut } from '../engine/semaineRepas';
import { SemaineRepasSection } from '../components/SemaineRepasSection';
import { FOOD_LIBRARY } from './foodLibrary';
import { moduleParId } from '../programmes/registre';
import { nutritionMass } from '../programmes/registre';
import { PrincipesMass } from '../screens/NutritionPrincipesScreen';
import { tousLesProgrammes } from './catalogue';
import { GLUCIDES_ALERTE_G_KG, PROTEINES_G_KG } from './reglesCiblesNutrition';
import {
  CONSEIL_REPAS_MASS,
  GLUCIDES_ALERTE_G_KG_MASS_PRISE,
  PROTEINES_G_KG_MASS_PRISE,
  REPAS_CONSEILLES_MASS_PRISE,
  REPAS_PAR_DEFAUT_MASS,
} from './reglesNutritionMass';

const lire = (f: string) => readFileSync(new URL(f, import.meta.url), 'utf8');
const md = lire('../../regles-nutrition-mass.md');
const nombre = (t: string) => Number(t.replace(/[^\d,]/g, '').replace(',', '.'));
const texte = (h: string) => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

function tableau(entete: string): string[][] {
  const lignes = md.split('\n');
  const i = lignes.findIndex((l) => l.startsWith(`| ${entete}`));
  expect(i, entete).toBeGreaterThan(-1);
  const out: string[][] = [];
  for (const l of lignes.slice(i + 2)) {
    if (!l.startsWith('|')) break;
    out.push(
      l
        .split('|')
        .slice(1, -1)
        .map((c) => c.trim()),
    );
  }
  return out;
}

/** L'homme de l'exemple du §12 : 30 ans, 180 cm, 80 kg, 5 séances, prise modérée. */
const EXEMPLE: ProfilCalcul = {
  sexe: 'homme',
  age: 30,
  tailleCm: 180,
  poidsKg: 80,
  travail: 'assis',
  pas: '5000-8000',
  seances: '5',
  duree: '45-75',
  objectif: 'prise',
  rythme: 'modere',
  grossesse: null,
  maladie: 'non',
  relation: 'non',
};

describe('regles-nutrition-mass.md ↔ le code', () => {
  it('les valeurs du regard MASS, face aux règles communes', () => {
    const t = tableau('Réglage');
    expect(t.map((l) => l[0])).toEqual(['Protéines', 'Alerte glucides']);
    expect([nombre(t[0]![1]!), nombre(t[0]![2]!)]).toEqual([
      PROTEINES_G_KG.defaut,
      PROTEINES_G_KG_MASS_PRISE,
    ]);
    expect([nombre(t[1]![1]!), nombre(t[1]![2]!)]).toEqual([
      GLUCIDES_ALERTE_G_KG,
      GLUCIDES_ALERTE_G_KG_MASS_PRISE,
    ]);
  });

  it('le nombre de repas par défaut, programme MASS par programme MASS', () => {
    const t = tableau('Programme MASS');
    const mass = tousLesProgrammes().filter((p) => p.familleId === 'mass');
    // Chaque programme de la famille a sa ligne, et réciproquement.
    expect(t.map((l) => l[0]).sort()).toEqual(mass.map((p) => p.nom).sort());
    expect(Object.keys(REPAS_PAR_DEFAUT_MASS).sort()).toEqual(mass.map((p) => p.id).sort());
    for (const [nom, repas] of t) {
      const id = mass.find((p) => p.nom === nom)!.id;
      expect(REPAS_PAR_DEFAUT_MASS[id], nom).toBe(Number(repas));
    }
  });

  it('l’exemple du §12, rejoué : 3 000 kcal, 160 g, 85 g, 400 g', () => {
    const r = calculerCibles(EXEMPLE, 'mass');
    expect([r.kcal, r.proteinG, r.fatG, r.carbsG]).toEqual([3000, 160, 85, 400]);
    for (const attendu of ['**3 000 kcal**', '**160 g**', '**85 g**', '**400 g**']) {
      expect(md, attendu).toContain(attendu);
    }
    // « La même personne sous POWER » : la phrase du .md, et le calcul commun.
    const commun = calculerCibles(EXEMPLE);
    expect([commun.kcal, commun.proteinG, commun.fatG, commun.carbsG]).toEqual([
      3000, 145, 85, 415,
    ]);
    expect(md).toContain('3 000 kcal, 145 g de protéines, 85 g de');
    expect(r.proposable).toBe(true);
    // Le détail du calcul dit d'où vient le 2,0.
    expect(r.etapes.find((e) => e.libelle === 'Protéines')!.calcul).toBe(
      '2 g/kg (prise de masse MASS) × 80 kg',
    );
  });
});

describe('le regard MASS ne joue qu’en prise de masse', () => {
  it('prise : 2,0 g/kg ; perte et maintien : les règles communes, au gramme près', () => {
    expect(regardApplique('mass', 'prise')).toBe(true);
    expect(regardApplique('mass', 'perte')).toBe(false);
    expect(regardApplique('mass', 'maintien')).toBe(false);
    expect(regardApplique('commun', 'prise')).toBe(false);
    for (const [objectif, rythme] of [
      ['perte', 'modere'],
      ['maintien', null],
    ] as const) {
      const p = { ...EXEMPLE, objectif, rythme };
      expect(calculerCibles(p, 'mass'), objectif).toEqual(calculerCibles(p));
    }
    expect(repartir(3000, 80, 'prise', 'mass').gKgProt).toBe(2);
    expect(repartir(3000, 80, 'prise').gKgProt).toBe(1.8);
    expect(repartir(2400, 80, 'perte', 'mass').gKgProt).toBe(2.2);
  });

  it('seules les protéines et les glucides bougent : calories et lipides identiques', () => {
    for (const poidsKg of [60, 70, 80, 90, 105]) {
      const p = { ...EXEMPLE, poidsKg };
      const [m, c] = [calculerCibles(p, 'mass'), calculerCibles(p)];
      expect(m.kcal, String(poidsKg)).toBe(c.kcal);
      expect(m.fatG, String(poidsKg)).toBe(c.fatG);
      expect(m.proteinG, String(poidsKg)).toBeGreaterThan(c.proteinG);
      expect(m.carbsG, String(poidsKg)).toBeLessThan(c.carbsG);
    }
  });

  it('l’alerte glucides passe de 2 à 3 g/kg', () => {
    // L'exemple : 5 g/kg de glucides, aucune alerte.
    expect(calculerCibles(EXEMPLE, 'mass').alertes).toEqual([]);
    // Un cas entre 2 et 3 g/kg : peu de dépense par kilo (femme de 60 ans,
    // 95 kg, sédentaire, sans séance), prise progressive.
    const sedentaire: ProfilCalcul = {
      ...EXEMPLE,
      sexe: 'femme',
      age: 60,
      poidsKg: 95,
      pas: '<5000',
      seances: '0',
      duree: null,
      rythme: 'progressif',
    };
    const [m, c] = [calculerCibles(sedentaire, 'mass'), calculerCibles(sedentaire)];
    expect(c.carbsG / 95).toBeGreaterThan(2);
    expect(c.carbsG / 95).toBeLessThan(3);
    expect(m.carbsG / 95).toBeGreaterThan(2);
    expect(m.carbsG / 95).toBeLessThan(3);
    // Les règles communes ne disent rien au-dessus de 2 ; MASS alerte sous 3.
    expect(c.alertes).toEqual([]);
    expect(m.alertes).toEqual(['Glucides sous 3 g/kg.']);
  });
});

function reponses(goal: 'prise' | 'perte') {
  const e = etatVide();
  Object.assign(e.profile, {
    sex: 'homme',
    age: '30',
    height: '180',
    weight: '80',
    job: 'assis',
    steps: '5000-8000',
    sessions: '5',
    duration: '45-75',
    sportType: ['muscu'],
    goal,
    pace: 'modere',
    medical: 'non',
    eating: 'non',
  });
  e.selected = ['poulet'];
  return e;
}

describe('du questionnaire au point des deux semaines', () => {
  it('MASS reçoit une cible, lue avec son regard ; les autres familles, les règles communes', () => {
    expect(FAMILLES_AVEC_CALCUL).toContain('mass');
    expect(regardDe('mass')).toBe('mass');
    for (const f of ['power', 'femmes', 'perso', null] as const) expect(regardDe(f)).toBe('commun');
    const mass = proposerCible(reponses('prise'), 'mass');
    const power = proposerCible(reponses('prise'), 'power');
    expect(mass.cas).toBe('proposee');
    if (mass.cas !== 'proposee' || power.cas !== 'proposee') throw new Error('proposition');
    expect(mass.regard).toBe('mass');
    expect(power.regard).toBe('commun');
    expect(mass.resultat.proteinG).toBe(160);
    expect(power.resultat.proteinG).toBe(145);
    // En perte, MASS et POWER reçoivent exactement la même cible.
    const [mp, pp] = [
      proposerCible(reponses('perte'), 'mass'),
      proposerCible(reponses('perte'), 'power'),
    ];
    if (mp.cas !== 'proposee' || pp.cas !== 'proposee') throw new Error('proposition');
    expect(mp.resultat).toEqual(pp.resultat);
  });

  it('le profil gardé porte le regard ; un profil commun garde sa forme d’avant', () => {
    expect(profilAGarder(EXEMPLE, '2026-11-27', 'mass').regard).toBe('mass');
    expect('regard' in profilAGarder(EXEMPLE, '2026-11-27')).toBe(false);
    expect('regard' in profilAGarder(EXEMPLE, '2026-11-27', 'commun')).toBe(false);
  });

  it('le point des deux semaines refait la répartition avec le même regard', () => {
    const J = '2026-12-11';
    const profil = (regard?: 'mass'): ProfilNutrition => ({
      ...profilAGarder(EXEMPLE, '2026-11-27', regard ?? 'commun'),
      pointLe: '2026-11-27',
    });
    // Poids stable sur 2 semaines en prise : sous 0,25 %/sem. → + 100 kcal.
    const pesees: Pesee[] = [
      ...[80, 80, 80, 80].map((weightKg, i) => ({ date: ajouterJours(J, -13 + i), weightKg })),
      ...[80, 80, 80, 80].map((weightKg, i) => ({ date: ajouterJours(J, -6 + i), weightKg })),
    ];
    const [m, c] = [
      pointDesDeuxSemaines(profil('mass'), 3000, pesees, J),
      pointDesDeuxSemaines(profil(), 3000, pesees, J),
    ];
    if (m.cas !== 'proposition' || c.cas !== 'proposition') throw new Error('proposition');
    expect([m.cible.kcal, c.cible.kcal]).toEqual([3100, 3100]);
    expect(m.cible.proteinG).toBe(160); // 2,0 × 80
    expect(c.cible.proteinG).toBe(145); // 1,8 × 80
    expect(m.cible.fatG).toBe(c.cible.fatG);
  });
});

describe('le nombre de repas d’une semaine composée la première fois', () => {
  const prise = { regard: 'mass' as const, objectif: 'prise' };
  it('5 sous MASS FORCE et HYPERTROPHIE, 4 sous CONGESTION — en prise de masse seulement', () => {
    expect(repasParDefaut('mass-force', prise)).toBe(5);
    expect(repasParDefaut('mass8', prise)).toBe(5);
    expect(repasParDefaut('mass4', prise)).toBe(4);
    // Hors prise de masse, sans regard MASS, sans profil ou sans programme : 4.
    expect(repasParDefaut('mass-force', { regard: 'mass', objectif: 'perte' })).toBe(4);
    expect(repasParDefaut('mass-force', { objectif: 'prise' })).toBe(4);
    expect(repasParDefaut('mass-force', null)).toBe(4);
    expect(repasParDefaut('power12', prise)).toBe(4);
    expect(repasParDefaut(null, prise)).toBe(4);
  });

  it('le câblage : composer passe par ce nombre, plafonné par ce que la cible tient', () => {
    const lu = 'nombreAdmis(repasParDefaut(';
    expect(lire('../components/CibleCalculee.tsx')).toContain(
      `${lu}lu.programmeId, profil), m.kcal)`,
    );
    expect(lire('../screens/NutritionScreen.tsx')).toContain(
      `${lu}programmeId, profil), cibleSemaine.kcal)`,
    );
  });
});

describe('le conseil des 5 repas (Guillaume : « 4 repas, conseillé 5 […] mais 4 est possible »)', () => {
  const prise = { regard: 'mass' as const, objectif: 'prise' };

  it('le nombre conseillé et la phrase, relus dans le .md', () => {
    expect(REPAS_CONSEILLES_MASS_PRISE).toBe(5);
    expect(md).toContain('moins de **5 repas** conseillés');
    // La phrase affichée est celle du .md, mot pour mot (citation « > »).
    const cite = md
      .split('\n')
      .filter((l) => l.trimStart().startsWith('> '))
      .map((l) => l.trimStart().slice(2))
      .join(' ');
    expect(cite).toContain(CONSEIL_REPAS_MASS);
  });

  it('sous MASS en prise de masse, tant que la semaine a moins de 5 repas', () => {
    expect(conseilRepasMass('mass4', prise, 4, 3000)).toBe(true);
    expect(conseilRepasMass('mass-force', prise, 4, 3000)).toBe(true);
    // 5 ou 6 repas : plus rien à conseiller.
    expect(conseilRepasMass('mass4', prise, 5, 3000)).toBe(false);
    expect(conseilRepasMass('mass4', prise, 6, 3000)).toBe(false);
    // Une cible qui ne tient pas 5 repas (sous 1 500 kcal) : on ne conseille
    // pas ce que l'appli refuserait de composer.
    expect(conseilRepasMass('mass4', prise, 4, 1400)).toBe(false);
    expect(conseilRepasMass('mass4', prise, 4, 1500)).toBe(true);
  });

  it('jamais hors MASS, ni hors prise de masse, ni sans profil', () => {
    expect(conseilRepasMass('power12', prise, 4, 3000)).toBe(false);
    expect(conseilRepasMass(null, prise, 4, 3000)).toBe(false);
    expect(conseilRepasMass('mass4', { regard: 'mass', objectif: 'perte' }, 4, 3000)).toBe(false);
    expect(conseilRepasMass('mass4', { objectif: 'prise' }, 4, 3000)).toBe(false);
    expect(conseilRepasMass('mass4', null, 4, 3000)).toBe(false);
  });

  it('à l’écran : au-dessus de « + Ajouter un repas », seulement quand il est donné', () => {
    const rendu = (conseil?: string) =>
      renderToStaticMarkup(
        <SemaineRepasSection
          semaine={composerSemaine({ kcal: 3000, proteinG: 160 }, [], FOOD_LIBRARY, '2026-11-27')}
          cibleActuelle={{ kcal: 3000, proteinG: 160 }}
          jourInitial={4}
          aujourdhui="2026-11-27"
          cible={null}
          preferes={[]}
          catalogue={FOOD_LIBRARY}
          customs={[]}
          onCreateCustom={() => {}}
          onChange={() => {}}
          onRecomposer={() => {}}
          onQuitter={() => {}}
          {...(conseil === undefined ? {} : { conseilRepas: conseil })}
        />,
      );
    expect(rendu()).not.toContain('data-conseil-repas');
    const h = rendu(CONSEIL_REPAS_MASS);
    expect(h.indexOf('data-conseil-repas')).toBeGreaterThan(-1);
    expect(h.indexOf('data-conseil-repas')).toBeLessThan(h.indexOf('data-ajouter-repas'));
    expect(texte(h)).toContain('5 repas par jour sont conseillés');
    expect(texte(h)).toContain('4 restent possibles.');
    const ecran = lire('../screens/NutritionScreen.tsx');
    expect(ecran).toMatch(
      /conseilRepasMass\(\s*programmeId,\s*profil,\s*nombreDeRepas\(semaine\),/,
    );
    expect(ecran).toContain('? { conseilRepas: CONSEIL_REPAS_MASS }');
  });
});

describe('l’écran Nutrition de MASS', () => {
  it('une vue à part : jamais celle qui peut ouvrir le plan historique de POWER', () => {
    expect(nutritionMass(moduleParId('mass4')!)).toEqual({ principes: true });
    expect(nutritionMass(moduleParId('mass-force')!)).toEqual({ principes: false });
    expect(nutritionMass(moduleParId('power12')!)).toBeNull();
    const ecran = lire('../screens/NutritionPrincipesScreen.tsx');
    expect(ecran).toMatch(/<NutritionScreen[\s\S]*?\bsansPlanHistorique\b/);
    expect(ecran).toContain('programmeId={programmeId}');
    // À la fin du questionnaire non plus : rien à « masquer » sous MASS.
    expect(lire('../components/CibleCalculee.tsx')).toContain(
      "famille !== 'femmes' && famille !== 'mass' && row.legacyNutritionPlan",
    );
    // Le raccourci d'Aujourd'hui lit la cible posée, jamais les menus.
    expect(lire('../screens/TodayScreen.tsx')).toContain(
      'menus: mass === null && state.settingsRow.legacyNutritionPlan',
    );
  });

  it('MASS CONGESTION : ses six principes en tête — ouverts sans cible, repliés avec', () => {
    const sans = renderToStaticMarkup(<PrincipesMass ciblePosee={false} />);
    expect(texte(sans)).toContain('4 prises par jour, protéines à chaque prise');
    expect(sans.match(/class="[^"]*principe[^"]*"/g)).toHaveLength(6);
    // Sans cible, rien à replier : pas de bouton.
    expect(sans).not.toContain('aria-expanded');
    const avec = renderToStaticMarkup(<PrincipesMass ciblePosee />);
    expect(avec).toContain('data-principes-mass');
    expect(avec).toContain('aria-expanded="false"');
    expect(texte(avec)).toContain('Voir les 6 principes');
    expect(texte(avec)).not.toContain('4 prises par jour');
    expect(texte(avec)).toContain('elle ne les remplace pas');
    // Plus de « ne chiffre ni les calories » : la cible est juste dessous.
    for (const h of [sans, avec]) expect(texte(h)).not.toContain('ne chiffre ni');
  });
});
