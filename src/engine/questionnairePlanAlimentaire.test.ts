/**
 * Le questionnaire « Votre plan alimentaire » dans l'appli = celui du site.
 *
 * Le site d'origine est figé dans `docs/questionnaires/plan-alimentaire/`.
 * Ce test le fait TOURNER (son propre code, sans navigateur) à côté de la
 * transcription, et compare :
 * - chaque libellé, option, borne, catégorie et aliment ;
 * - les erreurs de chaque écran, sur des centaines de profils ;
 * - le résumé envoyé au coach, au caractère près.
 *
 * Si le site change, on recopie ses deux fichiers : ce test dit alors
 * exactement ce que l'appli doit reprendre.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  AIDES_NOMBRES,
  ALIMENTS,
  CATEGORIES,
  CHAPEAUX_PROFIL,
  CONSIGNE_ALIMENTS,
  ENVOI,
  ERREURS,
  ETAPES_PROFIL,
  EXEMPLE_ALLERGIES,
  NOMBRES,
  NOTE_SECURITE,
  OPTIONS,
  QUESTIONS,
  TEXTES,
  TITRES_PROFIL,
  type CleChoix,
} from '../data/questionnairePlanAlimentaire';
import {
  ajouter,
  ajoutesHorsPlan,
  alimentsPourMonPlan,
  basculer,
  erreursDe,
  etatVide,
  etapePrecedente,
  etapeSuivante,
  profilVide,
  reinitialiser,
  resume,
  toutChoisir,
  type EtatQuestionnaire,
  type Profil,
} from './questionnairePlanAlimentaire';

const source = (f: string) =>
  readFileSync(new URL(`../../docs/questionnaires/plan-alimentaire/${f}`, import.meta.url), 'utf8');
const APP = source('app.js');
const FOODS = source('foods.js');

interface Site {
  state: {
    step: unknown;
    selected: string[];
    customFoods: unknown[];
    profile: Record<string, unknown>;
  };
  summaryText(): string;
  validate(step: string): boolean;
  errors(): Record<string, string>;
  OPTS: Record<string, [string, string][]>;
  NUMS: Record<string, unknown>;
  PROFILE_TITLES: Record<string, string>;
  FOOD_CATEGORIES: { id: string; label: string }[];
  FOODS: { id: string; name: string; category: string }[];
}

/** Le code du site, exécuté tel quel. Seuls ses trois appels de démarrage (DOM) sont retirés. */
function site(): Site {
  const corps = APP.replace(/checkData\(\);\s*load\(\);\s*render\(\);\s*$/, '');
  expect(corps).not.toBe(APP);
  const stockage = { getItem: () => null, setItem: () => {} };
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  const f = new Function(
    'localStorage',
    'window',
    'document',
    `${FOODS}\n${corps}\nreturn { state, summaryText, validate, errors: () => errors, OPTS, NUMS, PROFILE_TITLES, FOOD_CATEGORIES, FOODS };`,
  ) as (...a: unknown[]) => Site;
  return f(stockage, {}, {});
}

const S = site();

/** Une chaîne écrite dans le code du site, telle quelle (guillemets doubles). */
const dansLeSite = (t: string) => APP.includes(JSON.stringify(t).slice(1, -1));

describe('mot pour mot', () => {
  it('les options, les bornes, les titres d’écran', () => {
    expect(OPTIONS).toEqual(S.OPTS);
    expect(NOMBRES).toEqual(S.NUMS);
    expect(TITRES_PROFIL).toEqual(S.PROFILE_TITLES);
  });

  it('les catégories et les 43 aliments, dans l’ordre', () => {
    expect(CATEGORIES).toEqual(S.FOOD_CATEGORIES);
    expect(ALIMENTS).toEqual(
      S.FOODS.map((f) => ({ id: f.id, name: f.name, category: f.category })),
    );
    expect(ALIMENTS).toHaveLength(43);
  });

  it('chaque texte affiché figure dans le site', () => {
    const textes = [
      ...Object.values(CHAPEAUX_PROFIL),
      ...Object.values(QUESTIONS).flatMap((q) => [q.titre, q.aide ?? '']),
      ...Object.values(AIDES_NOMBRES),
      ...Object.values(TEXTES),
      ...Object.values(ERREURS),
      NOTE_SECURITE,
      EXEMPLE_ALLERGIES,
      CONSIGNE_ALIMENTS,
      ENVOI.sujet,
      ENVOI.message,
      ENVOI.whatsapp,
      ENVOI.email,
      'Ils serviront de base à vos futurs menus, avec des quantités adaptées à votre profil.',
    ].filter((t) => t !== '');
    for (const t of textes) expect(dansLeSite(t), t).toBe(true);
  });

  it('la seule phrase non reprise : les valeurs pour 100 g, qui ne sont pas affichées', () => {
    expect(dansLeSite(`${CONSIGNE_ALIMENTS} Valeurs moyennes pour 100 g`)).toBe(true);
  });
});

// ------------------------------------------------------------- les profils --

/** Un générateur déterministe : les mêmes profils à chaque exécution. */
function aleatoire(graine: number) {
  let x = graine;
  return () => {
    x = (x * 1103515245 + 12345) % 2147483648;
    return x / 2147483648;
  };
}

const NOMBRES_ESSAIS = ['', '17', '18', '45', '72.5', '72,5', 'abc', '300', '130', '250', ' 80 '];

function profilAuHasard(r: () => number): Profil {
  const p = profilVide();
  const un = <T>(l: readonly T[]) => l[Math.floor(r() * l.length)]!;
  for (const k of Object.keys(OPTIONS) as CleChoix[]) {
    if (r() < 0.15) continue; // laissé sans réponse
    if (k === 'sportType') {
      p.sportType = OPTIONS.sportType.filter(() => r() < 0.4).map((o) => o[0]);
    } else p[k] = un(OPTIONS[k]).at(0)!;
  }
  for (const k of ['age', 'height', 'weight', 'waist', 'weight4w'] as const)
    p[k] = un(NOMBRES_ESSAIS);
  p.allergies = un(['', '  ', 'lactose', 'Arachide, gluten']);
  return p;
}

function memeEtat(e: EtatQuestionnaire) {
  S.state.profile = structuredClone(e.profile) as unknown as Record<string, unknown>;
  S.state.selected = [...e.selected];
  S.state.customFoods = structuredClone(e.customFoods);
}

describe('le même comportement que le site', () => {
  const r = aleatoire(42);
  const profils = Array.from({ length: 400 }, () => profilAuHasard(r));

  it('les erreurs de chaque écran, sur 400 profils', () => {
    for (const p of profils) {
      memeEtat({ ...etatVide(), profile: p });
      for (const etape of ETAPES_PROFIL) {
        S.validate(etape);
        expect(erreursDe(etape, p), `${etape} ${JSON.stringify(p)}`).toEqual(S.errors());
      }
    }
  });

  it('le résumé envoyé, au caractère près, sur 400 profils et autant de sélections', () => {
    for (const p of profils) {
      const selected = ALIMENTS.filter(() => r() < 0.35).map((f) => f.id);
      let e: EtatQuestionnaire = { ...etatVide(), profile: p, selected };
      if (r() < 0.3) e = ajouter(e, 'legumes', 'chou-fleur', 1_700_000_000_000);
      memeEtat(e);
      expect(resume(e)).toBe(S.summaryText());
    }
  });

  it('un profil complet, lu par un humain', () => {
    const p = profilVide();
    Object.assign(p, {
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
      trend: 'stable',
      medical: 'non',
      eating: 'non',
    });
    const t = resume({ ...etatVide(), profile: p, selected: ['riz', 'poulet'] });
    expect(t).toContain('Poids : 82,5 kg');
    expect(t).toContain('Objectif : Perdre du poids · rythme : modéré');
    expect(t).toContain('Sport : 4 / semaine · 45 à 75 min · Musculation');
    expect(t).toContain('Tour de taille : non renseigné');
    expect(t.endsWith('IDENTIFIANTS : riz,poulet')).toBe(true);
  });
});

describe('la sélection', () => {
  it('cocher, décocher ; tout choisir, réinitialiser une catégorie', () => {
    let e = basculer(etatVide(), 'riz');
    expect(e.selected).toEqual(['riz']);
    e = basculer(e, 'riz');
    expect(e.selected).toEqual([]);
    e = toutChoisir(e, 'fruits');
    expect(e.selected).toEqual(['banane', 'pomme', 'fruits-rouges', 'orange', 'kiwi']);
    e = reinitialiser(basculer(e, 'riz'), 'fruits');
    expect(e.selected).toEqual(['riz']);
  });

  it('ajouter : un nom connu est coché, un nom nouveau entre sans valeur', () => {
    let e = ajouter(etatVide(), 'glucides', '  pâtes ');
    expect(e.selected).toEqual(['pates']);
    expect(e.customFoods).toEqual([]);
    e = ajouter(e, 'legumes', 'chou-fleur', 1_700_000_000_000);
    expect(e.customFoods).toEqual([
      {
        id: `perso-${(1_700_000_000_000).toString(36)}`,
        name: 'Chou-fleur',
        category: 'legumes',
        custom: true,
      },
    ]);
    // Décoché, il disparaît.
    expect(basculer(e, `perso-${(1_700_000_000_000).toString(36)}`).customFoods).toEqual([]);
  });

  it('vers « Mon plan » : les 43 aliments se traduisent, les ajoutés restent dehors', () => {
    let e: EtatQuestionnaire = { ...etatVide(), selected: ALIMENTS.map((f) => f.id) };
    expect(new Set(alimentsPourMonPlan(e)).size).toBe(43);
    e = ajouter(e, 'legumes', 'chou-fleur', 1);
    expect(alimentsPourMonPlan(e)).toHaveLength(43);
    expect(ajoutesHorsPlan(e)).toBe(1);
  });
});

describe('le parcours', () => {
  it('intro → 4 écrans de profil → 5 catégories → récapitulatif → fin, et retour', () => {
    const aller: unknown[] = [];
    let x: ReturnType<typeof etapeSuivante> = 'intro';
    for (let i = 0; i < 11; i++) {
      x = etapeSuivante(x);
      aller.push(x);
    }
    expect(aller).toEqual(['p0', 'p1', 'p2', 'p3', 0, 1, 2, 3, 4, 'recap', 'done']);
    const retour: unknown[] = [];
    for (let i = 0; i < 11; i++) {
      x = etapePrecedente(x);
      retour.push(x);
    }
    expect(retour).toEqual(['recap', 4, 3, 2, 1, 0, 'p3', 'p2', 'p1', 'p0', 'intro']);
  });
});
