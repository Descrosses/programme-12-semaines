/**
 * `regles-orientation-programmes.md` (validé par Guillaume le 23 novembre) = le code.
 *
 * Ce test relit chaque tableau de conditions du .md et chaque phrase de
 * l'écran, et les compare à la transcription. Puis il rejoue les décisions
 * de Guillaume (réponses A à H) sur des bilans précis.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SECTIONS } from './questionnaireBilanSportif';
import { MAX_SUGGESTIONS, REGLES_ORIENTATION, TEXTES_ORIENTATION } from './orientationProgrammes';
import { orienter } from '../engine/orientation';
import { etatVide, type EtatBilan } from '../engine/questionnaireBilanSportif';

const MD = readFileSync(new URL('../../regles-orientation-programmes.md', import.meta.url), 'utf8');
const aplat = (t: string) => t.replace(/\s+/g, ' ');

/** Les lignes « | Condition | Valeur | Source | » d'une section du .md. */
function tableau(titre: string): Record<string, string> {
  const debut = MD.indexOf(titre);
  expect(debut, titre).toBeGreaterThan(-1);
  const fin = MD.indexOf('\n### ', debut + 1);
  const lignes = MD.slice(debut, fin === -1 ? undefined : fin).split('\n');
  const t: Record<string, string> = {};
  for (const l of lignes) {
    const c = l.split('|').map((x) => x.trim());
    if (c.length >= 4 && c[1] && c[1] !== 'Condition' && !c[1].startsWith('---')) t[c[1]] = c[2]!;
  }
  return t;
}
const guillemets = (v: string) => [...v.matchAll(/« ([^»]+) »/g)].map((m) => m[1]!);
const q = (id: string) => SECTIONS.flatMap((s) => s.qs).find((x) => x.id === id)!;
const niveauxDu = (v: string) =>
  (q('q9').opts ?? []).filter((o) => o !== 'Jamais pratiqué' && v.includes(o.split(' (')[0]!));

const SECTIONS_MD = {
  power12: '### POWER CYCLE 1',
  'mass-force': '### Conditions de la famille MASS',
  femmes8: '### FEMMES CYCLE 1',
} as const;

describe('le .md, tableau par tableau', () => {
  for (const r of REGLES_ORIENTATION) {
    it(`${r.programme} : chaque condition écrite est celle du code`, () => {
      const t = tableau(SECTIONS_MD[r.programme as keyof typeof SECTIONS_MD]);
      expect(guillemets(t.Objectif!)).toEqual(r.objectifs);
      expect(t['Séances par semaine']).toMatch(new RegExp(`^${r.seancesMin} ou plus`));
      expect(t.Disponibilités).toContain(`au moins ${r.jours} jours à ${r.minutes} min ou plus`);
      if (r.niveaux === null) expect(t.Niveau).toBe("n'importe lequel");
      else expect(niveauxDu(t.Niveau!)).toEqual(r.niveaux);
      if (r.lieux === null) expect(t.Lieu).toBe("n'importe lequel");
      else expect(t.Lieu).toBe(r.lieux.join(' ou '));
      expect(t['Exercices maîtrisés']?.split(' **et** ') ?? []).toEqual(r.exercices);
      expect(t.Sexe ?? null).toBe(r.sexe);
    });
  }

  it('les valeurs sont des réponses possibles du bilan', () => {
    for (const r of REGLES_ORIENTATION) {
      for (const o of r.objectifs) expect(q('q3').opts, o).toContain(o);
      for (const n of r.niveaux ?? []) expect(q('q9').opts, n).toContain(n);
      for (const l of r.lieux ?? []) expect(q('q14').opts, l).toContain(l);
      const exos = (q('q11').groups ?? []).flatMap((g) => [...g.o]);
      for (const e of r.exercices) expect(exos, e).toContain(e);
    }
  });

  it('les phrases de l’écran, mot pour mot', () => {
    const md = aplat(MD).replace(/’/g, "'");
    for (const t of Object.values(TEXTES_ORIENTATION)) expect(md, t).toContain(t);
    expect(md).toContain('au plus deux');
    expect(MAX_SUGGESTIONS).toBe(2);
  });
});

// ------------------------------------------------- les décisions rejouées --

function bilan(A: Record<string, unknown>, extra: Partial<EtatBilan> = {}): EtatBilan {
  const e = etatVide();
  e.name = 'Test';
  e.profil = 'sportif';
  e.consent = '23/11/2026';
  e.A = { h1: 'Non', h2: 'Non', h3: 'Non', h4: 'Non', h5: 'Non', h6: 'Non', q6: 'Non', ...A };
  return { ...e, ...extra };
}
const semaine = (jours: number, minutes: number) =>
  Object.fromEntries(
    ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'].map((d, i) => [
      d,
      i < jours ? String(minutes) : '0',
    ]),
  );
const POWER = {
  q2: { sexe: 'Homme' },
  q3: 'Devenir plus fort',
  q9: 'Intermédiaire (1 à 3 ans)',
  q11: ['Squat avec barre', 'Développé couché', 'Soulevé de terre'],
  q12: '5',
  q13: semaine(5, 70),
  q14: 'Salle',
};
const ids = (e: EtatBilan) => {
  const o = orienter(e);
  return o.type === 'suggestions' ? o.suggestions.map((s) => s.programme) : o.type;
};

describe('les réponses de Guillaume, rejouées', () => {
  it('B — POWER : 5 séances et 5 jours à 60 min ; 4 jours ne suffisent pas', () => {
    expect(ids(bilan(POWER))).toEqual(['power12']);
    expect(ids(bilan({ ...POWER, q13: semaine(4, 90) }))).toEqual([]);
    expect(ids(bilan({ ...POWER, q12: '4' }))).toEqual([]);
    expect(ids(bilan({ ...POWER, q11: ['Squat avec barre', 'Développé couché'] }))).toEqual([]);
    expect(ids(bilan({ ...POWER, q9: "Débutant (moins d'1 an)" }))).toEqual([]);
  });

  it('A — vigilance orange : aucune suggestion ; rouge : arrêt', () => {
    expect(orienter(bilan({ ...POWER, q6: 'Oui', q6b: 'genou' })).type).toBe('orange');
    expect(orienter(bilan({ ...POWER, h1: 'Oui' })).type).toBe('arret');
  });

  it('C, D, H — prendre du muscle : MASS FORCE en attendant HYPERTROPHIE, « bientôt »', () => {
    const e = bilan({
      ...POWER,
      q3: 'Prendre du muscle',
      q9: "Débutant (moins d'1 an)",
      q12: '4',
      q13: semaine(4, 60),
    });
    const o = orienter(e);
    expect(o).toMatchObject({ type: 'suggestions', bientot: true });
    expect(ids(e)).toEqual(['mass-force']);
    expect(ids(bilan({ ...POWER, q3: 'Prendre du muscle', q9: 'Jamais pratiqué' }))).toEqual([]);
    expect(ids(bilan({ ...POWER, q3: 'Prendre du muscle', q14: 'Maison' }))).toEqual([]);
  });

  it('E, F — FEMMES CYCLE 1 : une femme seulement ; prise de muscle comprise', () => {
    const reprise = { q3: 'Reprendre le sport', q12: '3', q13: semaine(3, 30), q14: 'Maison' };
    expect(ids(bilan({ ...reprise, q2: { sexe: 'Femme' } }))).toEqual(['femmes8']);
    expect(ids(bilan({ ...reprise, q2: { sexe: 'Homme' } }))).toEqual([]);
    expect(ids(bilan({ ...reprise, q2: { sexe: 'Préfère ne pas répondre' } }))).toEqual([]);
    const muscle = bilan({
      ...POWER,
      q2: { sexe: 'Femme' },
      q3: 'Prendre du muscle',
      q12: '4',
      q13: semaine(4, 60),
    });
    expect(ids(muscle)).toEqual(['mass-force', 'femmes8']);
  });

  it('G — jamais plus de deux suggestions', () => {
    expect(REGLES_ORIENTATION.length).toBeGreaterThan(MAX_SUGGESTIONS);
  });

  it('perdre du poids : aucune suggestion (aucun programme dans l’appli)', () => {
    expect(ids(bilan({ ...POWER, q3: 'Perdre du poids / de la masse grasse' }))).toEqual([]);
  });

  it('chaque suggestion dit ses raisons', () => {
    const o = orienter(bilan(POWER));
    expect(o.type === 'suggestions' && o.suggestions[0]!.raisons).toEqual([
      'objectif : devenir plus fort',
      'niveau : intermédiaire (1 à 3 ans)',
      'squat, développé couché et soulevé de terre maîtrisés',
      '5 séances par semaine',
      '5 jours à 60 min ou plus',
      'lieu : salle',
    ]);
  });
});
