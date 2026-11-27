/**
 * MASS FORCE — l'onglet Progrès (« go code progrès FORCE », 27 novembre).
 *
 * Ce que ces tests figent :
 * - la « prochaine séance » du Progrès est EXACTEMENT la cible que la séance
 *   affichera (même fonction, mêmes données) ;
 * - une séance réussie / ratée est jugée comme la progression la juge ;
 * - rien n'est inventé : pas de % sans 1RM mesuré, pas de % pour un
 *   mouvement sans fourchette (push press, squat à la barre).
 */
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { ReferenceForceRow, SetRow } from '../../db/db';
import { EMPTY_CONTEXT } from '../../engine/types';
import { ProgresForce } from '../../screens/massforce/ProgresForce';
import { moduleParId } from '../registre';
import { progresForce } from './progres';

const ref = (
  exercice: string,
  variante: string,
  chargeKg: number,
  modalite: 'direct' | 'sous-maximal' = 'direct',
  reps = 1,
): ReferenceForceRow => ({
  exercice,
  variante,
  modalite,
  chargeKg,
  reps,
  date: '2026-11-18',
  programmeId: 'mass-force',
  cycleId: 1,
  note: '',
  creeLe: 1,
});

let horloge = 100;
/** Une séance du développé couché à la barre : 4 séries de `reps`. */
const seance = (
  week: number,
  kg: number,
  pct: number,
  reps: number[] = [5, 5, 5, 5],
  ratee = -1,
): SetRow[] =>
  reps.map(
    (r, i) =>
      ({
        exerciseId: 'mf-developpe-couche-barre',
        week,
        day: 0,
        setIndex: i,
        actualKg: kg,
        actualReps: r,
        failed: i === ratee,
        pctPrescrit: pct,
        kgCible: kg,
        doneAt: (horloge += 1),
      }) as SetRow,
  );

const REFS = [
  ref('developpe-couche', 'barre', 100),
  ref('tirage-vertical', 'poulie', 60, 'sous-maximal', 8),
];
const banc = (series: SetRow[]) =>
  progresForce({ choix: undefined, references: REFS, series }).find(
    (m) => m.cle === 'lun-developpe',
  )!;

describe('Progrès MASS FORCE', () => {
  it('les 4 mouvements du combiné, dans l’ordre de la semaine', () => {
    expect(
      progresForce({ choix: undefined, references: [], series: [] }).map((m) => m.nom),
    ).toEqual(['Développé couché', 'Tirage vertical', 'Squat', 'Push press']);
  });

  it('avant la 1re séance : la charge de départ, au bas de la fourchette', () => {
    const m = banc([]);
    expect(m.premiere).toBe(true);
    expect(m.prochaine).toMatchObject({ kind: 'calculee', pctCible: 75, kgCible: 75 });
    expect(m.fourchette).toEqual({ min: 75, max: 82.5 });
  });

  it('la prochaine séance = la cible que la séance affichera, au kilo près', () => {
    const series = [
      ...seance(1, 75, 75),
      ...seance(2, 75, 75),
      ...seance(3, 77.5, 77.5, [5, 5, 5, 4], 3),
    ];
    const m = banc(series);
    const seanceS4 = moduleParId('mass-force')!.getSession(4, 0, {
      ...EMPTY_CONTEXT,
      referencesForce: REFS,
      seriesCycle: series,
    })!;
    const developpe = seanceS4.exercises.find((e) => e.id === 'mf-developpe-couche-barre')!;
    expect(m.prochaine).toEqual(developpe.chargeCible);
  });

  it('chaque séance jugée comme la progression la juge : réussie, échec', () => {
    const m = banc([...seance(1, 75, 75), ...seance(2, 77.5, 77.5, [5, 5, 5, 4], 3)]);
    expect(m.seances.map((s) => [s.semaine, s.kg, s.pctReel, s.resultat, s.ratees])).toEqual([
      [1, 75, 75, 'reussie', 0],
      [2, 77.5, 77.5, 'echec', 1],
    ]);
  });

  it('les 4 semaines faites : plus de prochaine séance', () => {
    const m = banc([1, 2, 3, 4].flatMap((w) => seance(w, 75, 75)));
    expect(m.cycleTermine).toBe(true);
    expect(m.prochaine).toBeNull();
  });

  it('rien d’inventé : test sous-maximal seul, pas de % ; push press, pas de fourchette', () => {
    const tous = progresForce({ choix: undefined, references: REFS, series: [] });
    const tirage = tous.find((m) => m.cle === 'mar-tirage')!;
    expect(tirage.prochaine).toMatchObject({ kind: 'a-completer' });
    const push = tous.find((m) => m.cle === 'ven-push-press')!;
    expect(push.fourchette).toBeNull();
    const h = renderToStaticMarkup(<ProgresForce mouvements={tous} />);
    expect(h).toContain('test sous-maximal : 60 kg × 8');
    expect(h).toContain('Pas de 1RM mesuré : pas de charge en %.');
    expect(h).toContain('Le programme ne donne pas de % pour ce mouvement');
  });

  it('à l’écran : la cible, le graphique (un point par séance), la liste', () => {
    const m = banc([...seance(1, 75, 75), ...seance(2, 77.5, 77.5, [5, 5, 5, 4], 3)]);
    const h = renderToStaticMarkup(<ProgresForce mouvements={[m]} />);
    expect(h).toContain('1RM mesuré 100 kg le 18 novembre');
    expect(h).toContain('Prochaine séance');
    expect(h).toContain('77,5 kg · 77,5 %');
    expect(h.match(/<circle/g)).toHaveLength(2);
    expect(h).toContain('data-resultat="echec"');
    expect(h).toContain('77,5 kg · 5 · 5 · 5 · 4, 1 rep ratée');
  });
});
