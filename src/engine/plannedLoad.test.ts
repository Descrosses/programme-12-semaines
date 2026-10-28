/**
 * Les charges du §9 sont des pourcentages du 1RM de celui qui s'entraîne.
 *
 * ── Ce que ce fichier gardait avant ────────────────────────────────────────
 *
 * Exactement l'inverse : « le 1RM saisi ne touche PAS aux charges du §9 ». Le
 * tableau était écrit en kilos absolus, et ces kilos étaient ceux de l'auteur
 * du programme — son squat à 110, son bench à 115. Les figer, c'était les
 * servir à tout le monde : quelqu'un qui squatte 70 kg se voyait prescrire
 * 5 × 3 à 90 kg en semaine 5, soit 128 % de son maximum.
 *
 * Le tableau donne maintenant une intensité, et le kilo se calcule sur le
 * maximum de chacun. Les tests de ce fichier portent donc sur le nouveau
 * contrat :
 *
 *   1. chaque case = son pourcentage × le 1RM de l'utilisateur ;
 *   2. sans 1RM mesuré, AUCUNE charge — jamais de repli sur une valeur
 *      d'auteur ni sur une estimation ;
 *   3. deux utilisateurs différents reçoivent deux plans différents ;
 *   4. une installation qui tournait déjà sur le tableau en kilos le garde ;
 *   5. aucune charge n'atteint le 1RM, et chaque semaine tient dans la bande
 *      de son bloc (§2).
 */

import { describe, expect, it } from 'vitest';
import { MAIN_LIFT_TABLE, prescriptionFor } from '../data/mainLiftTable';
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

/** Les 1RM mesurés au combine initial de l'auteur — le jeu de référence. */
const TESTES: Record<string, number> = {
  'back-squat': 110,
  'bench-press': 115,
  deadlift: 140,
  'weighted-pullup': 45,
};

function contexte(oneRM: Settings['oneRM'], tableauOrigine = false): SessionContext {
  const history: HistoryIndex = {};
  return {
    ...EMPTY_CONTEXT,
    settings: { ...DEFAULT_SETTINGS, startDate: '2026-09-07', oneRM, tableauOrigine },
    history,
  };
}

/**
 * La charge résolue d'un mouvement, telle que l'écran l'affiche.
 *
 * On balaie les sept jours plutôt que de coder le jour de chaque lift : le
 * bench passe au lundi en semaine 12 (décision de Guillaume), et une table
 * figée ferait passer le test pour une absence alors que le mouvement est là.
 * `undefined` veut donc bien dire « absent de la semaine ».
 */
function kgResolu(lift: string, week: number, ctx: SessionContext): number | null | undefined {
  for (const day of [0, 1, 2, 3, 4, 5, 6] as DayIndex[]) {
    const ex = getSession(week as WeekIndex, day, ctx)?.exercises.find((e) => e.id === lift);
    if (ex) return ex.load.kg;
  }
  return undefined;
}

// ---------------------------------------------------------------------------

describe('le tableau §9 donne des intensités, pas des kilos', () => {
  it('aucune case indexée ne porte de kilo en dur', () => {
    /*
     * Le test qui garde la porte fermée. Un `barbell` ou un `added` sur une
     * colonne indexée, c'est le maximum de l'auteur réservé à tout le monde —
     * le défaut qu'on vient de retirer.
     */
    for (const lift of ['back-squat', 'bench-press', 'deadlift', 'weighted-pullup'] as const) {
      for (const week of SEMAINES) {
        const load = prescriptionFor(lift, week)?.load;
        if (load === null || load === undefined) continue; // semaine de test 1RM
        expect(load.kind, `${lift} S${week}`).toBe('pct1RM');
      }
    }
  });

  it('chaque case vaut son pourcentage appliqué au 1RM de l’utilisateur', () => {
    for (const [lift, max] of Object.entries(TESTES)) {
      for (const week of SEMAINES) {
        const load = prescriptionFor(lift as MainLiftId, week)?.load;
        if (!load || load.kind !== 'pct1RM') continue;
        const attendu = Math.round((max * load.pct) / 100 / 2.5) * 2.5;
        expect(
          kgResolu(lift, week, contexte(TESTES)),
          `${lift} S${week} — ${load.pct} % de ${max}`,
        ).toBe(attendu);
      }
    }
  });

  it('deux utilisateurs différents reçoivent deux plans différents', () => {
    const fort = contexte({ 'back-squat': 180 });
    const debutant = contexte({ 'back-squat': 70 });
    // Semaine 5, 82 % : 147,5 kg pour l'un, 57,5 kg pour l'autre.
    expect(kgResolu('back-squat', 5, fort)).toBe(147.5);
    expect(kgResolu('back-squat', 5, debutant)).toBe(57.5);
  });

  it('le pourcentage ne dépend PAS du 1RM — seul le kilo en dépend', () => {
    // Le tableau reste une donnée figée : c'est sa lecture qui est relative.
    const reference = LIFTS.flatMap((lift) =>
      SEMAINES.map((week) => {
        const load = prescriptionFor(lift, week)?.load;
        return `${lift}/${week}=${load && load.kind === 'pct1RM' ? load.pct : '—'}`;
      }),
    );
    expect(prescriptionFor.length, 'prescriptionFor prend toujours 2 arguments').toBe(2);
    expect(reference.filter((l) => !l.endsWith('—')).length).toBeGreaterThan(40);
  });
});

describe('sans 1RM mesuré, aucune charge n’est inventée', () => {
  it('les colonnes indexées n’affichent rien du tout', () => {
    const vierge = contexte({});
    for (const lift of ['back-squat', 'bench-press', 'deadlift', 'weighted-pullup'] as const) {
      for (const week of SEMAINES) {
        const kg = kgResolu(lift, week, vierge);
        // `undefined` = le mouvement n'est pas dans cette séance ; `null` = il
        // y est, sans charge. Aucun des deux n'est un chiffre, c'est tout ce
        // qui compte.
        expect(kg ?? null, `${lift} S${week} sans 1RM`).toBeNull();
      }
    }
  });

  it('un zéro ne remplace jamais une absence', () => {
    const vierge = contexte({});
    for (const week of SEMAINES) {
      expect(kgResolu('back-squat', week, vierge) ?? null).not.toBe(0);
    }
  });

  it('l’écran DIT pourquoi, au lieu de laisser un tiret muet', () => {
    /*
     * Un champ vide sans explication laisse chercher ce qui ne va pas. La
     * note dit d'où viendrait le chiffre et où le renseigner — sans jamais
     * proposer de valeur.
     */
    const vierge = contexte({});
    const squat = getSession(1 as WeekIndex, 0, vierge)!.exercises.find(
      (e) => e.id === 'back-squat',
    )!;
    const note = squat.notes.find((n) => /non calculée/.test(n));
    expect(note, 'aucune note n’explique la charge manquante').toBeDefined();
    expect(note).toContain('70 %');
    expect(note).toContain('Réglages');
    // Et surtout : elle ne souffle aucun kilo.
    expect(note).not.toMatch(/\d+(,\d+)?\s*kg/);
  });

  it('la note disparaît dès que le maximum est saisi', () => {
    const squat = getSession(1 as WeekIndex, 0, contexte(TESTES))!.exercises.find(
      (e) => e.id === 'back-squat',
    )!;
    expect(squat.notes.find((n) => /non calculée/.test(n))).toBeUndefined();
  });

  it('mais le push press, lui, reste chiffré : il ne suit aucun maximum', () => {
    // Kilos absolus, plafond de RPE, règle de progression propre (§7, §8).
    const attendu = [50, 52.5, 55, 45, 55, 57.5, 60, 45, 57.5, 60, 62.5, 50];
    const vierge = contexte({});
    for (let w = 1; w <= 12; w++) {
      const load = prescriptionFor('push-press', w)?.load;
      expect(load?.kind, `push press S${w}`).toBe('barbell');
      if (load?.kind === 'barbell') expect(load.kg, `push press S${w}`).toBe(attendu[w - 1]);
    }
    expect(kgResolu('push-press', 1, vierge)).toBe(50);
  });
});

describe('une installation déjà en cours garde le tableau qu’elle avait', () => {
  /*
   * Le tableau est passé des kilos aux pourcentages pendant que des
   * installations suivaient un plan commencé. Les réécrire au milieu des douze
   * semaines changerait des charges que personne n'a demandé à changer : elles
   * gardent donc les kilos d'origine, colonne par colonne.
   */
  const ORIGINE: Record<string, Array<number | null>> = {
    'back-squat': [77.5, 82.5, 87.5, 70, 90, 95, 97.5, 77.5, 92.5, 95, 97.5, 77.5],
    'bench-press': [85, 87.5, 90, 77.5, 95, 97.5, 102.5, 82.5, 95, 97.5, 102.5, 82.5],
    deadlift: [105, 110, 115, 92.5, 117.5, 125, 130, 97.5, 120, 127.5, 130, null],
    'weighted-pullup': [20, 22.5, 25, 10, 30, 32.5, 35, 15, 30, 32.5, 35, null],
    'speed-squat': [60, 60, 60, 55, 65, 65, 65, 55, 65, 65, 65, 55],
    'front-squat': [60, 60, 62.5, 50, 65, 70, 70, 55, 70, 72.5, 75, null],
  };

  const ancienne = contexte(TESTES, true);

  for (const [lift, kilos] of Object.entries(ORIGINE)) {
    it(`${lift} — les douze semaines sont inchangées`, () => {
      kilos.forEach((kg, i) => {
        if (kg === null) return; // semaine de test, ou mouvement absent
        expect(kgResolu(lift, i + 1, ancienne), `${lift} S${i + 1}`).toBe(kg);
      });
    });
  }

  it('c’est la SEULE chose que le drapeau change : sans lui, le deadlift suit les bandes', () => {
    // La colonne deadlift sortait des bandes du §2 — 93 % en semaine 7 pour un
    // bloc qui plafonne à 90. C'est la seule corrigée, et la correction ne
    // s'applique qu'aux installations neuves.
    expect(kgResolu('deadlift', 7, ancienne)).toBe(130);
    expect(kgResolu('deadlift', 7, contexte(TESTES))).toBe(125);
  });

  it('un maximum manquant ne ressuscite pas le kilo d’origine', () => {
    // Le drapeau dit « garde ton plan », pas « sers les chiffres de l'auteur à
    // n'importe qui ». Une installation neuve n'en porte jamais.
    expect(DEFAULT_SETTINGS.tableauOrigine).toBe(false);
  });
});

describe('speed squat et front squat suivent le squat', () => {
  /** Les pourcentages que §7 et §8 écrivent, bloc par bloc. */
  const PCT_SPEED = [55, 55, 55, 50, 60, 60, 60, 50, 60, 60, 60, 50];

  it('le speed squat reprend les pourcentages du .md', () => {
    for (let w = 1; w <= 12; w++) {
      const load = prescriptionFor('speed-squat', w)?.load;
      expect(load?.kind, `speed squat S${w}`).toBe('pct1RM');
      if (load?.kind === 'pct1RM') {
        expect(load.pct, `speed squat S${w}`).toBe(PCT_SPEED[w - 1]);
        expect(load.lift, `speed squat S${w}`).toBe('back-squat');
      }
    }
  });

  it('aucune charge de speed squat ne dépasse 62 % du squat', () => {
    // Au-delà, ce n'est plus un exercice de vitesse.
    for (let w = 1; w <= 12; w++) {
      const load = prescriptionFor('speed-squat', w)!.load!;
      if (load.kind === 'pct1RM') expect(load.pct, `speed squat S${w}`).toBeLessThanOrEqual(62);
    }
  });

  it('le front squat d’accumulation reste dans la zone d’un 3 × 6 à RPE 7', () => {
    // Un front squat vaut ~85 % d'un back squat : 55 % du back en fait 65 % du
    // front, ce qui correspond à du 3 × 6 à RPE 7. À 80 % ce serait impossible.
    for (const w of [1, 2, 3]) {
      const load = prescriptionFor('front-squat', w)!.load!;
      if (load.kind === 'pct1RM') expect(load.pct / 85, `front squat S${w}`).toBeLessThan(0.72);
    }
  });
});

describe('aucune charge planifiée au-dessus du 1RM', () => {
  /*
   * Plafond par bloc, repris du §2 : 79 % en accumulation, 65-70 % en deload,
   * 90 % en force max, 89 % en puissance. Un point de marge pour l'arrondi au
   * point de pourcentage.
   */
  const PLAFOND = [80, 80, 80, 70, 90, 90, 90, 72, 89, 89, 89, 80];

  it('chaque semaine des quatre lifts reste sous le plafond de son bloc', () => {
    for (const lift of ['back-squat', 'bench-press', 'deadlift'] as const) {
      for (let w = 1; w <= 12; w++) {
        const load = prescriptionFor(lift, w)?.load;
        if (!load || load.kind !== 'pct1RM') continue;
        expect(load.pct, `${lift} S${w} — ${load.pct} %`).toBeLessThanOrEqual(PLAFOND[w - 1]!);
      }
    }
  });

  it('le deadlift tient maintenant dans ses bandes, comme les deux autres', () => {
    // Il en sortait de 3 à 4 points sur quatre semaines. C'est la correction
    // décidée avec Guillaume : les nouveaux utilisateurs suivent le §2.
    for (const w of [3, 7, 10, 11]) {
      const load = prescriptionFor('deadlift', w)!.load!;
      if (load.kind === 'pct1RM')
        expect(load.pct, `deadlift S${w}`).toBeLessThanOrEqual(PLAFOND[w - 1]!);
    }
  });

  it('aucune case n’atteint 100 % du maximum, sur aucun lift', () => {
    for (const lift of LIFTS) {
      for (let w = 1; w <= 12; w++) {
        const load = prescriptionFor(lift, w)?.load;
        if (!load || load.kind !== 'pct1RM') continue;
        expect(load.pct, `${lift} S${w}`).toBeLessThan(100);
      }
    }
  });

  it('la séance résolue d’un débutant reste à sa mesure', () => {
    // Le défaut d'origine, vu depuis l'écran : 90 kg de squat servis à
    // quelqu'un qui en soulève 70.
    const debutant = contexte({ 'back-squat': 70, 'bench-press': 50, deadlift: 90 });
    for (const [lift, max] of [
      ['back-squat', 70],
      ['bench-press', 50],
      ['deadlift', 90],
    ] as const) {
      for (let w = 1; w <= 12; w++) {
        const kg = kgResolu(lift, w, debutant);
        if (kg == null) continue;
        expect(kg, `${lift} S${w} pour un max de ${max}`).toBeLessThan(max);
      }
    }
  });
});
