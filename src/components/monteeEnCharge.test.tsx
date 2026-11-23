/**
 * La montée en charge (décision de Guillaume, 23 novembre) : avant le
 * PREMIER mouvement lourd polyarticulaire de la séance, 5 reps à 50 %, 3 à
 * 70 %, 2-3 à 85 %, 2 à 90-95 % de la charge de travail, 1 min de repos.
 *
 * Ce que ces tests figent :
 * - le tableau est le même dans les deux .md et dans le code ;
 * - les kilos se calculent sur la charge de travail, arrondis au pas ; sans
 *   charge connue, des pourcentages, jamais un kilo inventé ;
 * - qui en reçoit : POWER (squat, bench, push press, deadlift — même précédés
 *   d'un explosif), jamais un jour de test ni le Speed Squat ; MASS FORCE (le
 *   mouvement évalué qui ouvre la séance) ; jamais MASS CONGESTION ;
 * - la carte l'affiche avant les séries, et le retire dès la première série
 *   de travail validée.
 *
 * L'empreinte ne voit que la durée (+5 ou +6 min) : d'où ce test.
 */
import 'fake-indexeddb/auto';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { SetRow } from '../db/db';
import { PALIERS_MONTEE, POURQUOI_MONTEE, REPOS_MONTEE_SEC } from '../data/monteeEnCharge';
import type { DayIndex } from '../data/types';
import type { ResolvedExercise } from '../engine/getSession';
import { paliersMontee } from '../engine/monteeEnCharge';
import { EMPTY_CONTEXT } from '../engine/types';
import { moduleParId } from '../programmes/registre';
import type { RestTimer } from '../state/useRestTimer';
import { ExerciseCard } from './ExerciseCard';
import { MonteeEnCharge } from './MonteeEnCharge';

const md = (f: string) => readFileSync(new URL(`../../${f}`, import.meta.url), 'utf8');
const JOURS: DayIndex[] = [0, 1, 2, 3, 4, 5, 6];
const SETTINGS = {
  ...EMPTY_CONTEXT.settings,
  oneRM: { 'back-squat': 140, 'bench-press': 100, deadlift: 180 },
};
const CTX = { ...EMPTY_CONTEXT, settings: SETTINGS };

function marques(id: string, semaine: number, jour: DayIndex): string[] {
  const s = moduleParId(id)!.getSession(semaine, jour, CTX);
  return (s?.exercises ?? []).filter((e) => e.monteeEnCharge).map((e) => e.id);
}

describe('le tableau des deux .md = le code', () => {
  for (const [f, debut, fin] of [
    ['programme-final-12-semaines.md', '## 6. Échauffements', '## 7.'],
    ['programme-mass-force.md', '## 2 bis. Montée en charge', '## 3.'],
  ] as const) {
    it(f, () => {
      const t = md(f);
      const section = t.slice(t.indexOf(debut), t.indexOf(fin, t.indexOf(debut)));
      const lignes = [
        ...section.matchAll(/^\| (\d) \| ([\d-]+) \| ([\d-]+) % de la charge de travail \|$/gm),
      ];
      expect(lignes.map((m) => ({ reps: m[2], pct: m[3]!.split('-').map(Number) }))).toEqual(
        PALIERS_MONTEE.map((p) => ({ reps: p.reps, pct: [...p.pct] })),
      );
      expect(section).toContain('1 min de repos entre ces séries');
      expect(section).toContain(POURQUOI_MONTEE);
      expect(REPOS_MONTEE_SEC).toBe(60);
    });
  }
});

describe('les kilos', () => {
  it('sur une charge de travail de 100 kg', () => {
    expect(paliersMontee(100)).toEqual([
      { reps: '5', pct: '50 %', kg: '50 kg' },
      { reps: '3', pct: '70 %', kg: '70 kg' },
      { reps: '2-3', pct: '85 %', kg: '85 kg' },
      { reps: '2', pct: '90-95 %', kg: '90-95 kg' },
    ]);
  });

  it('arrondis au pas de la barre', () => {
    // 70 % de 87,5 = 61,25 : à égale distance de 60 et 62,5, on monte.
    expect(paliersMontee(87.5).map((p) => p.kg)).toEqual([
      '45 kg',
      '62,5 kg',
      '75 kg',
      '80-82,5 kg',
    ]);
  });

  it('sans charge de travail : des pourcentages, aucun kilo', () => {
    expect(paliersMontee(null).every((p) => p.kg === null)).toBe(true);
  });
});

describe('qui reçoit la montée en charge', () => {
  it('POWER : un seul mouvement par séance, le premier lift lourd, même après un explosif', () => {
    const LOURDS = ['back-squat', 'pin-squat', 'bench-press', 'push-press', 'deadlift'];
    for (let w = 1; w <= 11; w++) {
      for (const j of JOURS) {
        const s = moduleParId('power12')!.getSession(w, j, CTX);
        if (s === null) continue;
        const premier = s.exercises.find((e) => e.def.role === 'main');
        expect(marques('power12', w, j), `S${w} j${j}`).toEqual(premier ? [premier.id] : []);
        if (premier) expect(LOURDS, `S${w} j${j}`).toContain(premier.id);
      }
    }
    // Semaine 1 : les quatre jours lourds, chacun son mouvement.
    expect([0, 2, 4, 5].map((j) => marques('power12', 1, j as DayIndex))).toEqual([
      ['back-squat'],
      ['bench-press'],
      ['push-press'],
      ['deadlift'],
    ]);
    // S5-7 : le squat du lundi est un Pin Squat (§8).
    expect(marques('power12', 6, 0)).toEqual(['pin-squat']);
    // Le squat du lundi n'ouvre pas la séance : les Pogo Jumps passent avant.
    expect(moduleParId('power12')!.getSession(1, 0, CTX)!.exercises[0]!.id).not.toBe('back-squat');
    // Le dimanche n'a pas de mouvement lourd à la barre.
    expect(marques('power12', 1, 6)).toEqual([]);
  });

  it('POWER : jamais les semaines de test (S0, S12), jamais le Speed Squat', () => {
    for (const w of [0, 12]) {
      for (const j of JOURS) expect(marques('power12', w, j), `S${w} j${j}`).toEqual([]);
    }
    for (let w = 1; w <= 11; w++) expect(marques('power12', w, 4)).not.toContain('speed-squat');
  });

  it('MASS FORCE : le mouvement évalué qui ouvre chaque séance, et lui seul', () => {
    const m = moduleParId('mass-force')!;
    for (const w of m.semaines) {
      for (const j of JOURS) {
        const s = m.getSession(w, j, CTX);
        if (s === null) continue;
        expect(marques('mass-force', w, j), `S${w} j${j}`).toEqual([s.exercises[0]!.id]);
      }
    }
  });

  it('MASS CONGESTION : jamais', () => {
    const m = moduleParId('mass4')!;
    for (const w of m.semaines) for (const j of JOURS) expect(marques('mass4', w, j)).toEqual([]);
  });
});

describe('à l’écran', () => {
  const timer = { state: null, start: () => {} } as unknown as RestTimer;
  const squat = moduleParId('power12')!
    .getSession(1, 0, CTX)!
    .exercises.find((e) => e.id === 'back-squat')!;
  const carte = (ex: ResolvedExercise, savedSets: SetRow[] = []) =>
    renderToStaticMarkup(
      <ExerciseCard
        ex={ex}
        savedSets={savedSets}
        overrideKg={null}
        timer={timer}
        history={undefined}
        media={null}
        note={{ week: 1, day: 0, date: '' }}
        onSaveSet={async () => {}}
        onOverride={() => {}}
      />,
    );

  it('avant les séries, avec les kilos de la charge de travail', () => {
    const html = carte(squat);
    const bloc = html.indexOf('aria-label="Montée en charge"');
    expect(bloc).toBeGreaterThan(-1);
    expect(bloc).toBeLessThan(html.indexOf('Valider la série 1'));
    expect(squat.load.kg).not.toBeNull();
    for (const p of paliersMontee(squat.load.kg, squat.load.step)) expect(html).toContain(p.kg!);
    expect(html).toContain('Elles ne comptent pas dans tes séries');
  });

  it('retirée dès la première série de travail validée', () => {
    const fait = { setIndex: 0, exerciseId: 'back-squat' } as SetRow;
    expect(carte(squat, [fait])).not.toContain('aria-label="Montée en charge"');
  });

  it('les autres cartes ne l’ont pas', () => {
    const rdl = moduleParId('power12')!
      .getSession(1, 0, CTX)!
      .exercises.find((e) => e.id === 'rdl')!;
    expect(carte(rdl)).not.toContain('Montée en charge');
  });

  it('charge inconnue : pourcentages et une consigne, jamais un kilo', () => {
    const html = renderToStaticMarkup(
      <MonteeEnCharge chargeTravail={null} pas={2.5} timer={timer} />,
    );
    expect(html).toContain('90-95 %');
    expect(html).toContain('n’est pas encore connue');
    expect(html).not.toMatch(/\d kg/);
  });
});
