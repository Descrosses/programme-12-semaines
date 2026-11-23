/**
 * Le questionnaire « Bilan sportif et nutrition » dans l'appli = celui du site.
 *
 * Le script du site est figé dans `docs/questionnaires/bilan-sportif/`. Ce
 * test le fait TOURNER (sans navigateur) à côté de la transcription et
 * compare :
 * - chaque section, question, option, liste, base et situation ;
 * - chaque condition d'affichage, sur des centaines de réponses ;
 * - la vigilance, l'arrêt de sécurité, les questions obligatoires ;
 * - le résumé envoyé au coach, au caractère près.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  AUCUN,
  BASES,
  CONTR,
  DAYS,
  ENVOI,
  HORS_SITU,
  MAT,
  METHODES,
  OBJ,
  PAS_PREF,
  PRIO,
  PROFILS,
  QUAL,
  SECTIONS,
  SITUATIONS,
  TEXTES,
  type QuestionBilan,
} from '../data/questionnaireBilanSportif';
import {
  arret,
  basculerChoix,
  basculerCoche,
  est1RM,
  estVisible,
  etatVide,
  liensEnvoi,
  repondue,
  resume,
  sectionsVisibles,
  vigilance,
  type EtatBilan,
} from './questionnaireBilanSportif';

const SOURCE = readFileSync(
  new URL('../../docs/questionnaires/bilan-sportif/bilan.js', import.meta.url),
  'utf8',
);

type Fn = (...a: unknown[]) => unknown;
interface Site {
  setS(s: unknown): void;
  buildSummary(): string;
  vigilance(): unknown;
  scopeCheck(): unknown;
  visibleSections(): { title: string }[];
  answered(q: unknown): boolean;
  SECTIONS: { qs: Record<string, unknown>[] }[] & Record<string, unknown>[];
  SITUATIONS: unknown;
  BASES: unknown;
  HORS_SITU: unknown;
  lists: Record<string, unknown>;
  est1RM: Fn;
}

/** Le script du site, exécuté tel quel. Seul son appel de démarrage (`render()`) est retiré. */
function site(): Site {
  const corps = SOURCE.replace(/render\(\);\s*$/, '');
  expect(corps).not.toBe(SOURCE);
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  const f = new Function(
    'localStorage',
    'document',
    `${corps}
    return { setS: (v) => { S = v; }, buildSummary, vigilance, scopeCheck, visibleSections, answered,
      SECTIONS, SITUATIONS, BASES, HORS_SITU, est1RM,
      lists: { OBJ, PRIO, QUAL, CONTR, MAT, METHODES, DAYS, PAS_PREF, AUCUN } };`,
  ) as (...a: unknown[]) => Site;
  return f({ getItem: () => null, setItem: () => {} }, { getElementById: () => ({}) });
}

const SITE = site();

/** Une section ou une question du site, sans ses fonctions (comparées à part). */
function sansFonctions(o: unknown): unknown {
  if (Array.isArray(o)) return o.map(sansFonctions);
  if (o !== null && typeof o === 'object') {
    const r: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(o)) {
      if (typeof v === 'function') r.si = 'fonction';
      else r[k] = sansFonctions(v);
    }
    return r;
  }
  return o;
}

describe('mot pour mot', () => {
  it('les douze sections et leurs 57 questions, conditions marquées au même endroit', () => {
    const marque = (o: unknown) =>
      JSON.parse(JSON.stringify(o, (k, v) => (k === 'si' ? 'fonction' : v))) as unknown;
    expect(marque(SECTIONS)).toEqual(sansFonctions(SITE.SECTIONS));
    expect(SECTIONS.flatMap((s) => s.qs)).toHaveLength(57);
  });

  it('les listes, les situations, les bases, les situations hors périmètre', () => {
    expect({ OBJ, PRIO, QUAL, CONTR, MAT, METHODES, DAYS, PAS_PREF, AUCUN }).toEqual(SITE.lists);
    expect(SITUATIONS).toEqual(SITE.SITUATIONS);
    expect(BASES).toEqual(SITE.BASES);
    expect(HORS_SITU).toEqual(SITE.HORS_SITU);
  });

  it('chaque texte affiché figure dans le site', () => {
    const dansLeSite = (t: string) => SOURCE.includes(JSON.stringify(t).slice(1, -1));
    const textes = [
      ...Object.values(TEXTES).flatMap((v) => (typeof v === 'string' ? [v] : Object.values(v))),
      ...PROFILS.flat(),
      ENVOI.email,
      ENVOI.whatsapp,
      ENVOI.sujet,
      ENVOI.bonjour,
      ENVOI.colle,
    ];
    for (const t of textes) expect(dansLeSite(t), t).toBe(true);
  });
});

// ------------------------------------------------------------ les réponses --

function aleatoire(graine: number) {
  let x = graine;
  return () => {
    x = (x * 1103515245 + 12345) % 2147483648;
    return x / 2147483648;
  };
}

function etatAleatoire(graine: number): EtatBilan {
  const r = aleatoire(graine);
  const pile = (p = 0.5) => r() < p;
  const un = <T>(a: readonly T[]) => a[Math.floor(r() * a.length)]!;
  const quelques = (a: readonly string[]) => a.filter(() => pile(0.3));
  const nombre = () => un(['', '0', '3', '45', '72,5', '180', '17', '  60 ', 'abc', '12']);
  const phrase = () =>
    un(['', 'non', 'Non.', 'rien', 'genou gauche 4/10', ' RAS ', 'asthme léger']);
  const e = etatVide();
  e.name = un(['', 'Léa', '  Karim ', 'Jo']);
  e.profil = un(['', 'debutant', 'sportif', 'sportif']);
  e.situ = SITUATIONS.map((s) => s.key).filter(() => pile(0.15));
  e.consent = un(['', '23/11/2026']);
  e.step = un([-1, 0, 3, 99]);
  const A: Record<string, unknown> = {};
  for (const q of SECTIONS.flatMap((s) => s.qs)) {
    if (pile(0.15)) continue;
    const opts = q.opts ?? [];
    switch (q.type) {
      case 'single':
        A[q.id] = un(opts);
        break;
      case 'scale':
        A[q.id] = String(1 + Math.floor(r() * 10));
        break;
      case 'multi':
        A[q.id] = quelques(opts);
        break;
      case 'check':
        A[q.id] = quelques((q.groups ?? []).flatMap((g) => [...g.o]));
        break;
      case 'num':
        A[q.id] = nombre();
        break;
      case 'text':
      case 'area':
        A[q.id] = phrase();
        break;
      case 'group': {
        const o: Record<string, string> = {};
        for (const f of q.fields ?? []) {
          if (pile(0.3)) continue;
          o[f.k] = f.type === 'select' ? un(f.opts ?? []) : f.type === 'text' ? phrase() : nombre();
        }
        A[q.id] = o;
        break;
      }
    }
    if ((q.other || q.type === 'check') && pile(0.3))
      A[`${q.id}_o`] = un(['', 'escalade', ' yoga ']);
  }
  // Les cas qui comptent, plus souvent que le hasard ne les tirerait.
  if (pile(0.3)) A.q3b = ['Pilates', ...liste(A.q3b)];
  if (pile(0.2)) A.q3 = 'Autre';
  for (const h of ['h1', 'h2', 'h3', 'h4']) if (pile(0.6)) A[h] = 'Non';
  e.A = A;
  return e;
}
const liste = (v: unknown) => (Array.isArray(v) ? (v as string[]) : []);

const ETATS = Array.from({ length: 400 }, (_, i) => etatAleatoire(i + 1));

describe('sur 400 réponses, l’appli et le site disent la même chose', () => {
  it('le résumé envoyé au coach, au caractère près', () => {
    for (const e of ETATS) {
      SITE.setS(structuredClone(e));
      expect(resume(e)).toBe(SITE.buildSummary());
    }
  });

  it('la vigilance et l’arrêt de sécurité', () => {
    for (const e of ETATS) {
      SITE.setS(structuredClone(e));
      expect(vigilance(e)).toEqual(SITE.vigilance());
      expect(arret(e)).toEqual(SITE.scopeCheck());
    }
  });

  it('les sections montrées, et chaque question affichée ou non', () => {
    const siteQ = new Map(
      SITE.SECTIONS.flatMap((s) => s.qs as Record<string, unknown>[]).map((q) => [q.id, q]),
    );
    for (const e of ETATS) {
      SITE.setS(structuredClone(e));
      expect(sectionsVisibles(e).map((s) => s.title)).toEqual(
        SITE.visibleSections().map((s) => s.title),
      );
      for (const q of SECTIONS.flatMap((s) => s.qs)) {
        const sq = siteQ.get(q.id)!;
        const show = sq.show as ((A: unknown) => boolean) | undefined;
        expect(estVisible(q, e.A), q.id).toBe(show ? show(e.A) : true);
        expect(repondue(q, e.A), q.id).toBe(SITE.answered(sq));
        for (const [i, g] of (q.groups ?? []).entries()) {
          const sg = (sq.groups as { show?: (A: unknown) => boolean }[])[i]!;
          expect(estVisible(g, e.A)).toBe(sg.show ? sg.show(e.A) : true);
        }
      }
    }
  });

  it('le maximum estimé : la formule du site, rien de plus', () => {
    for (const [kg, re] of [
      ['100', '5'],
      ['82,5', '1'],
      ['60', '13'],
      ['', '3'],
      ['0', '5'],
    ])
      expect(est1RM(kg, re)).toBe(SITE.est1RM(kg, re));
  });
});

describe('les choix, comme sur le site', () => {
  const q = (id: string) => SECTIONS.flatMap((s) => s.qs).find((x) => x.id === id)!;

  it('« Je ne sais pas / pas de préférence » chasse les autres méthodes, et inversement', () => {
    const q3b = q('q3b');
    expect(basculerChoix(q3b, ['Musculation', 'Cardio'], PAS_PREF, true)).toEqual([PAS_PREF]);
    expect(basculerChoix(q3b, [PAS_PREF], 'Pilates', true)).toEqual(['Pilates']);
  });

  it('trois priorités au plus : la quatrième case est refusée ; l’ordre reste celui des options', () => {
    const q5 = q('q5');
    expect(basculerChoix(q5, ['Santé', 'Force'], 'Muscle', true)).toEqual([
      'Force',
      'Muscle',
      'Santé',
    ]);
    expect(basculerChoix(q5, ['Force', 'Muscle', 'Santé'], 'Mobilité', true)).toEqual([
      'Force',
      'Muscle',
      'Santé',
    ]);
  });

  it('« Aucun de ces exercices » chasse les autres ; les cas Pilates n’existent qu’avec la méthode', () => {
    const q11: QuestionBilan = q('q11');
    const A = { q11: ['Pompes', 'Tractions'] };
    expect(basculerCoche(q11, A, AUCUN, true)).toEqual([AUCUN]);
    expect(basculerCoche(q11, { q11: [AUCUN] }, 'Pompes', true)).toEqual(['Pompes']);
    expect(basculerCoche(q11, { q11: [] }, 'Roll-up', true)).toEqual([]);
    expect(basculerCoche(q11, { q3b: ['Pilates'], q11: [] }, 'Roll-up', true)).toEqual(['Roll-up']);
  });
});

describe('l’envoi', () => {
  it('l’e-mail porte le résumé quand il tient dans un lien, WhatsApp toujours l’introduction', () => {
    const e = ETATS.find((x) => x.name.trim() === 'Léa')!;
    const l = liensEnvoi(e);
    expect(l.whatsapp).toBe(
      `https://wa.me/33699906737?text=${encodeURIComponent('Bonjour, voici mon bilan sportif et nutrition (Léa). Je colle le résumé ci-dessous :\n\n')}`,
    );
    const corps = decodeURIComponent(l.email.split('&body=')[1]!);
    if (l.complet) expect(corps).toContain(resume(e));
    else expect(corps).not.toContain('BILAN SPORTIF');
  });
});

describe('les 400 réponses couvrent vraiment tous les cas', () => {
  it('rouge, orange, vert, arrêts, modules 2 et 3, bases, hybride, max estimé', () => {
    const resumes = ETATS.map(resume);
    const niveaux = new Set(ETATS.map((e) => vigilance(e).level));
    expect([...niveaux].sort()).toEqual(['ORANGE', 'ROUGE', 'VERT']);
    expect(ETATS.some((e) => arret(e)?.type === 'hors')).toBe(true);
    for (const morceau of [
      '=== PERFORMANCE ===',
      '=== SITUATIONS PARTICULIÈRES ===',
      '[Repères de force (facultatif)]',
      'max estimé ≈',
      'Autre (',
      'programme hybride',
      'aucune ne correspond',
      ': impossible',
      'Sans prénom',
    ])
      expect(
        resumes.some((t) => t.includes(morceau)),
        morceau,
      ).toBe(true);
  });
});
