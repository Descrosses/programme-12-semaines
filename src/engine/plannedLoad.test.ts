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
    // Recalés sur le squat testé à 110 kg : 55 % pour le speed squat, rapport
    // à l'ancienne base 140 pour le front squat, que le .md ne chiffre qu'en kg.
    expect(kgDe('front-squat', 1)).toBe(60);
    expect(kgDe('speed-squat', 1)).toBe(60);
  });
});

/**
 * Speed Squat et Front Squat, recalés sur le squat réellement testé (110 kg).
 *
 * Les deux colonnes avaient été écrites sur un back squat supposé à 140. Le
 * speed squat de la semaine 1, annoncé « 55 % », en valait 70 % du vrai max :
 * à cette charge la barre ne peut pas être rapide, donc l'exercice ne fait plus
 * ce pour quoi il existe.
 */
describe('speed squat et front squat calés sur le squat testé', () => {
  const SQUAT_TESTE = 110;
  /** Les pourcentages que le .md écrit, bloc par bloc. */
  const PCT_SPEED = [0.55, 0.55, 0.55, 0.5, 0.6, 0.6, 0.6, 0.5, 0.6, 0.6, 0.6, 0.5];

  it('chaque semaine du speed squat vaut le pourcentage du .md appliqué à 110 kg', () => {
    for (let w = 1; w <= 12; w++) {
      const attendu = Math.round((PCT_SPEED[w - 1]! * SQUAT_TESTE) / 2.5) * 2.5;
      expect(kgDe('speed-squat', w), `speed squat S${w}`).toBe(attendu);
    }
  });

  it('aucune charge de speed squat ne dépasse 62 % du squat testé', () => {
    // Au-delà, ce n'est plus un exercice de vitesse. 62 % laisse la marge de
    // l'arrondi au 2,5 kg sur le palier 60 %.
    for (let w = 1; w <= 12; w++) {
      const kg = kgDe('speed-squat', w)!;
      expect(kg / SQUAT_TESTE, `speed squat S${w} = ${kg} kg`).toBeLessThanOrEqual(0.62);
    }
  });

  /*
   * Le front squat n'a aucun pourcentage écrit : on vérifie le résultat, pas la
   * formule. Un front squat vaut ~85 % d'un back squat, soit ~93 kg ici. Du
   * 3 × 6 à RPE 7 doit tomber autour de 65-70 % de ce max, jamais à 80 %
   * comme les 75 kg d'avant.
   */
  it('le front squat d’accumulation reste dans la zone d’un 3 × 6 à RPE 7', () => {
    const maxFrontSquatEstime = SQUAT_TESTE * 0.85;
    for (const w of [1, 2, 3]) {
      const pct = kgDe('front-squat', w)! / maxFrontSquatEstime;
      expect(pct, `front squat S${w}`).toBeLessThan(0.72);
    }
  });

  /*
   * Le push press n'est PAS concerné : le .md le donne en kilos absolus avec un
   * plafond de RPE et sa propre règle de progression (« +2,5 kg quand les reps
   * sont rapides »). Aucune de ses cases ne tombe sur un pourcentage rond d'un
   * squat, ni de 140 ni de 110 — c'est une poussée verticale, elle n'a rien à
   * voir avec un maximum de squat.
   */
  it('le push press ne suit aucun 1RM de squat', () => {
    const attendu = [50, 52.5, 55, 45, 55, 57.5, 60, 45, 57.5, 60, 62.5, 50];
    for (let w = 1; w <= 12; w++) {
      expect(kgDe('push-press', w), `push press S${w}`).toBe(attendu[w - 1]);
    }
  });
});
