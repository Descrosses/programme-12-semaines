/**
 * Le 1RM saisi dans les Réglages ne touche PAS aux charges du tableau §9.
 *
 * Ce test existe parce que l'appli faisait l'inverse : elle traitait chaque
 * case du §9 comme un pourcentage d'un maximum estimé avant le combine, puis la
 * recalait sur le 1RM saisi. Le deadlift de la semaine 1, écrit « 4×5×97,5 » au
 * §9, s'affichait donc à 105 kg dès qu'un 140 était renseigné — une valeur que
 * le programme ne dit nulle part.
 *
 * On vérifie ici les 7 colonnes du tableau × 12 semaines, avec des 1RM absurdes
 * dans les deux sens : la charge planifiée doit être identique au kilogramme
 * près. Le seul chemin qui a le droit de la changer est §11, depuis
 * l'historique réel — c'est `progression.test.ts` qui le couvre.
 */

import { describe, expect, it } from 'vitest';
import { MAIN_LIFT_TABLE, prescriptionFor } from '../data/mainLiftTable';
import { BASE_SESSIONS } from '../data/baseSessions';
import { getSession } from './getSession';
import {
  DEFAULT_SETTINGS,
  EMPTY_CONTEXT,
  type HistoryIndex,
  type SessionContext,
  type Settings,
  type WeekIndex,
} from './types';
import type { DayIndex, MainLiftId } from '../data/types';

const LIFTS = Object.keys(MAIN_LIFT_TABLE) as MainLiftId[];
const SEMAINES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

/** Trois jeux de 1RM : aucun, très bas, très haut. */
const JEUX: Array<[string, Settings['oneRM']]> = [
  ['aucun 1RM saisi', {}],
  ['1RM très bas', { 'back-squat': 60, 'bench-press': 50, deadlift: 70, 'weighted-pullup': 5 }],
  ['1RM très haut', { 'back-squat': 220, 'bench-press': 180, deadlift: 260, 'weighted-pullup': 80 }],
  ['les 1RM réellement testés', { 'back-squat': 110, 'bench-press': 115, deadlift: 140 }],
];

const kgDe = (lift: MainLiftId, week: number): number | null => {
  const p = prescriptionFor(lift, week);
  if (!p?.load || !('kg' in p.load)) return null;
  return p.load.kg;
};

describe('les charges du §9 ne dépendent pas des Réglages', () => {
  it('prescriptionFor ne prend aucun 1RM en paramètre', () => {
    // Garde-fou de signature : si quelqu'un rajoute un troisième argument, le
    // recalage peut revenir sans que rien d'autre ne casse.
    expect(prescriptionFor.length).toBe(2);
  });

  it('les 7 mouvements × 12 semaines donnent les mêmes kilos, quels que soient les 1RM', () => {
    const reference = new Map<string, number | null>();
    for (const lift of LIFTS) {
      for (const week of SEMAINES) reference.set(`${lift}/${week}`, kgDe(lift, week));
    }
    // Le tableau est une donnée figée : la relire ne peut pas dépendre d'un
    // réglage, et c'est exactement ce qu'on veut garantir ici.
    for (const lift of LIFTS) {
      for (const week of SEMAINES) {
        expect(kgDe(lift, week), `${lift} S${week}`).toBe(reference.get(`${lift}/${week}`));
      }
    }
  });

  /*
   * Le vrai test : on passe par `getSession`, le chemin que l'écran emprunte,
   * avec des 1RM différents. C'est là que le recalage s'appliquait.
   */
  it('la séance résolue affiche les kilos du .md quel que soit le 1RM saisi', () => {
    const history: HistoryIndex = {};
    const jours = Object.keys(BASE_SESSIONS).map(Number) as DayIndex[];

    for (const week of SEMAINES) {
      for (const day of jours) {
        const parJeu = JEUX.map(([nom, oneRM]) => {
          const ctx: SessionContext = {
            ...EMPTY_CONTEXT,
            settings: { ...DEFAULT_SETTINGS, startDate: '2026-09-07', oneRM },
            history,
          };
          const s = getSession(week as WeekIndex, day, ctx);
          /*
           * Toutes les charges, pas seulement celles du tableau : une première
           * version filtrait sur `liftId`, que `ResolvedExercise` ne porte pas.
           * Le filtre ne gardait rien et le test passait sur le code fautif.
           */
          const charges = (s?.exercises ?? [])
            .map((e) => `${e.id}=${e.load.kg ?? '—'}`)
            .join(' ');
          expect(charges, `S${week} jour ${day} : aucune charge lue`).not.toBe('');
          return [nom, charges] as const;
        });

        const [premier, ...autres] = parJeu;
        for (const [nom, charges] of autres) {
          expect(charges, `S${week} jour ${day} — ${nom} vs ${premier![0]}`).toBe(premier![1]);
        }
      }
    }
  });

  it('la semaine 1 affiche exactement ce que le .md écrit', () => {
    // Les quatre cases que Guillaume a relevées ou qui portent le plus de poids.
    expect(kgDe('deadlift', 1)).toBe(97.5); // le cas signalé : 105 kg était faux
    expect(kgDe('back-squat', 1)).toBe(100);
    expect(kgDe('bench-press', 1)).toBe(87.5);
    expect(kgDe('weighted-pullup', 1)).toBe(17.5);
    expect(kgDe('push-press', 1)).toBe(50);
    expect(kgDe('front-squat', 1)).toBe(75);
    expect(kgDe('speed-squat', 1)).toBe(77.5);
  });
});
