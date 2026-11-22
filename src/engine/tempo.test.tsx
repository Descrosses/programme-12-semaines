/**
 * Le tempo en tête de carte (décision de Guillaume, 22 novembre).
 *
 * Ce que ces tests figent :
 * - chaque tempo est EXTRAIT mot pour mot de la consigne de son exercice,
 *   dans les quatre programmes : rien de reformulé, rien de déduit ;
 * - la liste des exercices qui portent un tempo, programme par programme
 *   (une disparition silencieuse ferait tomber le test) ;
 * - les tempos datés : le 3-0-X du squat en S1-3 seulement, la barre au
 *   front de MASS CONGESTION en 3 s le lundi et 2 s le samedi ;
 * - les modules MASS passent bien le tempo jusqu'à la séance servie ;
 * - l'empreinte ne voit pas les consignes : ce test est son garde-fou ici.
 */
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { EXERCISES } from '../data/exercises';
import { EXERCISES as EXERCISES_FEMMES } from '../data/femmes/exercises';
import type { TempoPrescrit } from '../data/types';
import { TempoChip } from '../components/TempoChip';
import { TOUS_LES_EXERCICES_MASS4 } from '../programmes/mass4/exercices';
import { SEANCES_FORCE } from '../programmes/massforce/seances';
import { moduleParId } from '../programmes/registre';
import { tempoDuJour } from './tempo';
import { EMPTY_CONTEXT } from './types';

/** Chaque segment (« · ») se lit tel quel dans la consigne, casse ignorée. */
function extraitDe(tempo: readonly TempoPrescrit[], consignes: readonly (string | undefined)[]) {
  const source = consignes
    .filter((c): c is string => c !== undefined)
    .join(' ')
    .toLowerCase();
  return tempo
    .flatMap((t) => t.texte.split(' · '))
    .filter((segment) => !source.includes(segment.toLowerCase()));
}

describe('tempoDuJour', () => {
  const t: TempoPrescrit[] = [
    { texte: 'A', semaines: [1, 2, 3] },
    { texte: 'B', jours: [5] },
  ];
  it('le premier tempo dont la semaine et le jour conviennent', () => {
    expect(tempoDuJour(t, 2, 0)).toBe('A');
    expect(tempoDuJour(t, 4, 5)).toBe('B');
  });
  it('aucun tempo écrit pour ce jour : rien', () => {
    expect(tempoDuJour(t, 4, 0)).toBeNull();
    expect(tempoDuJour(undefined, 1, 0)).toBeNull();
  });
});

describe('extrait mot pour mot de la consigne, jamais reformulé', () => {
  it('POWER', () => {
    const avec = Object.values(EXERCISES).filter((d) => d.tempo !== undefined);
    expect(avec.map((d) => d.id).sort()).toEqual(
      [
        'back-squat',
        'bench-press',
        'bulgarian-split-squat',
        'chest-supported-row',
        'hip-thrust',
        'lateral-bound',
        'nordic-curl',
        'pallof-press',
        'rdl',
        'weighted-pullup',
      ].sort(),
    );
    for (const d of avec) {
      expect(extraitDe(d.tempo!, [d.intent, ...(d.cues ?? [])]), d.id).toEqual([]);
    }
  });

  it('MASS CONGESTION', () => {
    const avec = TOUS_LES_EXERCICES_MASS4.filter((e) => e.tempo !== undefined);
    expect(avec).toHaveLength(13);
    for (const e of avec) {
      // La barre au front écrit « Descente 3 s […] lundi, 2 s […] samedi » :
      // son « Descente 2 s » est vérifié à part, plus bas.
      if (e.id === 'barre-au-front') continue;
      expect(extraitDe(e.tempo!, [e.consigne]), e.id).toEqual([]);
    }
  });

  it('MASS FORCE', () => {
    const lignes = SEANCES_FORCE.flatMap((s) => s.lignes).filter((l) => l.tempo !== undefined);
    expect([...new Set(lignes.map((l) => l.cle))].sort()).toEqual(
      ['jeu-leg-curl', 'jeu-leg-extension', 'mar-curl-w', 'mar-supination'].sort(),
    );
    for (const l of lignes) expect(extraitDe(l.tempo!, [l.consigne]), l.cle).toEqual([]);
  });

  it('FEMMES', () => {
    const avec = Object.values(EXERCISES_FEMMES).filter((d) => d.tempo !== undefined);
    expect(avec.map((d) => d.id)).toEqual(['squat-tempo']);
    for (const d of avec) {
      expect(extraitDe(d.tempo!, [d.intent, ...(d.cues ?? [])]), d.id).toEqual([]);
    }
  });
});

describe('les tempos datés', () => {
  it('back squat : 3-0-X en S1-3, descente ~2 s en S5-7, rien ailleurs', () => {
    const t = EXERCISES['back-squat']!.tempo;
    for (const s of [1, 2, 3]) expect(tempoDuJour(t, s, 0)).toBe('Tempo 3-0-X');
    for (const s of [5, 6, 7]) expect(tempoDuJour(t, s, 0)).toBe('Descente contrôlée ~2 s');
    for (const s of [0, 4, 8, 9, 10, 11, 12]) expect(tempoDuJour(t, s, 0)).toBeNull();
  });

  it('barre au front (MASS CONGESTION) : 3 s le lundi, 2 s le samedi', () => {
    const e = TOUS_LES_EXERCICES_MASS4.find((x) => x.id === 'barre-au-front')!;
    expect(e.consigne).toBe('Descente 3 s en superset du lundi, 2 s en superset du samedi.');
    expect(tempoDuJour(e.tempo, 1, 0)).toBe('Descente 3 s');
    expect(tempoDuJour(e.tempo, 1, 5)).toBe('Descente 2 s');
  });
});

describe('jusqu’à la séance servie', () => {
  const tempos = (id: string, semaine: number, jours: number[]) =>
    jours.flatMap((j) =>
      (moduleParId(id)!.getSession(semaine, j as 0, EMPTY_CONTEXT)?.exercises ?? []).map((e) => ({
        id: e.id,
        tempo: tempoDuJour(e.def.tempo, semaine, j),
      })),
    );

  it('POWER S1 lundi : squat 3-0-X, split squat 3-1-X-0, RDL 3-1-X-1', () => {
    const t = tempos('power12', 1, [0]).filter((x) => x.tempo !== null);
    expect(t).toEqual(
      expect.arrayContaining([
        { id: 'back-squat', tempo: 'Tempo 3-0-X' },
        { id: 'bulgarian-split-squat', tempo: 'Tempo 3-1-X-0' },
        { id: 'rdl', tempo: 'Tempo 3-1-X-1' },
      ]),
    );
  });

  it('MASS CONGESTION et MASS FORCE : le module transmet le tempo', () => {
    expect(tempos('mass4', 1, [0, 5]).filter((x) => x.id === 'barre-au-front')).toEqual([
      { id: 'barre-au-front', tempo: 'Descente 3 s' },
      { id: 'barre-au-front', tempo: 'Descente 2 s' },
    ]);
    expect(
      tempos('mass-force', 1, [0, 1, 3, 4]).some((x) => x.tempo === 'Excentrique 2 secondes'),
    ).toBe(true);
  });

  it('la pastille affiche le texte du programme, et rien sans tempo', () => {
    expect(renderToStaticMarkup(<TempoChip tempo="Tempo 3-1-X-0" />)).toContain('Tempo 3-1-X-0');
    expect(renderToStaticMarkup(<TempoChip tempo={null} />)).toBe('');
  });
});
