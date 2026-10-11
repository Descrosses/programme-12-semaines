/**
 * Le cycle du tronc, l'adaptation à l'adducteur, et le deload qui n'en était
 * pas un.
 *
 * Trois défauts sont verrouillés ici :
 *
 * 1. `role: 'core'` et `role: 'carry'` ne tombaient dans aucune branche du
 *    deload. Un dimanche de semaine 4 sortait avec le volume d'une semaine
 *    pleine, dans la semaine censée dissiper la fatigue.
 * 2. La rotation était la seule fonction du tronc sans expression en
 *    puissance : le Cable Chop restait identique de la semaine 1 à la 11.
 * 3. Un exercice douloureux n'avait aucun moyen d'être retiré sans être
 *    supprimé du catalogue — ce qui aurait effacé l'historique.
 */

import { describe, expect, it } from 'vitest';
import { getSession, type ResolvedExercise } from './getSession';
import { EMPTY_CONTEXT, type SessionContext } from './types';
import { readiness } from './readiness';
import { setSummary } from './format';
import { EXERCISES } from '../data/exercises';
import { DELOAD_CORE } from '../data/blockRules';
import type { DayIndex, WeekIndex } from '../data/types';

const ONE_RM = {
  'back-squat': 110,
  'bench-press': 115,
  deadlift: 140,
  'weighted-pullup': 45,
} as const;

const ctx = (over: Partial<SessionContext> = {}): SessionContext => ({
  ...EMPTY_CONTEXT,
  settings: { startDate: '2026-01-03', broadJumpBaselineCm: 240, oneRM: { ...ONE_RM } },
  ...over,
});

function session(week: number, day: number, c: SessionContext = ctx()) {
  const s = getSession(week as WeekIndex, day as DayIndex, c);
  if (!s) throw new Error(`Pas de séance en S${week} jour ${day}`);
  return s;
}

const ids = (ex: ResolvedExercise[]) => ex.map((e) => e.id);
const trouve = (week: number, day: number, id: string) => {
  const ex = session(week, day).exercises.find((e) => e.id === id);
  if (!ex) throw new Error(`${id} absent de S${week} jour ${day}`);
  return ex;
};
const DIMANCHE = 6;

// ---------------------------------------------------------------------------

describe('Landmine Rotation — au vendredi, avec les mouvements de vitesse', () => {
  const VENDREDI = 4;

  it('les semaines 1 à 4 ne la connaissent pas', () => {
    for (const w of [1, 2, 3, 4]) {
      for (const d of [0, 2, 4, 5, 6]) {
        expect(ids(session(w, d).exercises), `S${w} j${d}`).not.toContain('landmine-rotation');
      }
    }
  });

  it('force max : 3 × 5/côté le vendredi, repos 75 s', () => {
    for (const w of [5, 6, 7]) {
      const ex = trouve(w, VENDREDI, 'landmine-rotation');
      expect(ex.loadLine, `S${w}`).toBe('3 × 5 / côté');
      expect(ex.restSec, `S${w}`).toBe(75);
    }
  });

  it('puissance : 3 × 4/côté, repos 90 s, intention explosive', () => {
    for (const w of [9, 10, 11]) {
      const ex = trouve(w, VENDREDI, 'landmine-rotation');
      expect(ex.loadLine, `S${w}`).toBe('3 × 4 / côté');
      expect(ex.restSec, `S${w}`).toBe(90);
      expect(ex.notes.join(' '), `S${w}`).toMatch(/vitesse prime/i);
    }
  });

  it('semaine 8 : elle reste au vendredi, en volume de deload', () => {
    expect(trouve(8, VENDREDI, 'landmine-rotation').loadLine).toBe('2 × 4 / côté');
  });

  /*
   * Elle arrive après le Lateral Bound et avant le Push Press : le tronc est
   * encore frais, et tout ce qui le fatigue vraiment vient ensuite. Le Hang
   * High Pull garde sa deuxième place, c'est lui qui demande le plus de
   * fraîcheur nerveuse du bloc.
   */
  it('elle se place avant tout ce qui fatigue le tronc', () => {
    const noms = ids(session(5, VENDREDI).exercises);
    expect(noms.indexOf('landmine-rotation')).toBeGreaterThan(noms.indexOf('hang-high-pull'));
    expect(noms.indexOf('landmine-rotation')).toBeLessThan(noms.indexOf('push-press'));
    expect(noms.indexOf('landmine-rotation')).toBeLessThan(noms.indexOf('speed-squat'));
  });

  it('elle n’apparaît aucun autre jour — le dimanche a rendu sa place', () => {
    for (const w of [5, 8, 9]) {
      for (const d of [0, 2, 5, 6]) {
        expect(ids(session(w, d).exercises), `S${w} j${d}`).not.toContain('landmine-rotation');
      }
    }
  });

  it('semaine 12 : aucune rotation, ce sont les tests', () => {
    for (const d of [0, 2, 4, 5, 6]) {
      expect(ids(session(12, d).exercises), `j${d}`).not.toContain('landmine-rotation');
    }
  });
});

describe('le deload touche enfin le tronc et les portés', () => {
  it('chaque exercice de la table tombe exactement à sa valeur de deload', () => {
    const attendu: Record<string, { jour: number; ligne: string }> = {
      'ab-wheel': { jour: 0, ligne: '2 × 6 — poids du corps' },
      'pallof-press': { jour: 2, ligne: '2 × 5 / côté' },
      'dead-bug-cable': { jour: 4, ligne: '2 × 5 / côté' },
      'bear-crawl': { jour: DIMANCHE, ligne: '2 × 15 m' },
      'hanging-leg-raise': { jour: DIMANCHE, ligne: '2 × 6 — poids du corps' },
      'cable-chop': { jour: DIMANCHE, ligne: '2 × 6 / côté' },
    };
    for (const [id, { jour, ligne }] of Object.entries(attendu)) {
      expect(trouve(4, jour, id).loadLine, id).toBe(ligne);
    }
  });

  it('les portés sont raccourcis ET allégés de 20 %', () => {
    // Farmer : 4 × 25 m à 2 × 34 kg → 2 × 20 m à 2 × 28 kg (27,2 arrondi).
    expect(trouve(4, 4, 'farmer-carry').loadLine).toBe('2 × 20 m — 2 × 28 kg');
    // Suitcase : 3 × 30 m/côté à 32 kg → 2 × 20 m/côté à 26 kg (25,6 arrondi).
    expect(trouve(4, 5, 'suitcase-carry').loadLine).toBe('2 × 20 m / côté × 26 kg');
  });

  it('hors deload, rien n’est touché', () => {
    expect(trouve(3, 0, 'ab-wheel').loadLine).toBe('3 × 8 — poids du corps');
    expect(trouve(3, 4, 'farmer-carry').loadLine).toBe('4 × 25 m — 2 × 34 kg');
    expect(trouve(3, 5, 'suitcase-carry').loadLine).toBe('3 × 30 m / côté × 32 kg');
  });

  /*
   * Le piège d'une réduction appliquée deux fois : une fois par la table du
   * tronc, une fois par la branche des accessoires. Aucun exercice de la
   * table ne doit descendre sous 2 séries.
   */
  it('la réduction n’est jamais appliquée deux fois', () => {
    for (const w of [4, 8]) {
      for (const d of [0, 2, 4, 5, DIMANCHE]) {
        const s = getSession(w as WeekIndex, d as DayIndex, ctx());
        if (!s) continue;
        for (const ex of s.exercises) {
          if (ex.def.role !== 'core' && ex.def.role !== 'carry') continue;
          expect(ex.sets, `S${w} j${d} ${ex.id}`).toBeGreaterThanOrEqual(2);
        }
      }
    }
  });

  it('la table de deload ne vise que des exercices qui existent', () => {
    for (const id of Object.keys(DELOAD_CORE)) expect(EXERCISES[id], id).toBeDefined();
  });

  it('la séance dit qu’elle a allégé le tronc', () => {
    const chop = trouve(4, DIMANCHE, 'cable-chop');
    expect(chop.adjustments.map((a) => a.what)).toContain('3 × 8 / côté → 2 × 6 / côté');
  });
});

describe('Copenhagen Plank — suspendu, pas supprimé', () => {
  it('il ne figure dans aucune séance, quelle que soit la semaine', () => {
    for (let w = 1; w <= 12; w++) {
      for (const d of [0, 2, 4, 5, DIMANCHE]) {
        const s = getSession(w as WeekIndex, d as DayIndex, ctx());
        expect(ids(s?.exercises ?? []), `S${w} j${d}`).not.toContain('copenhagen-plank');
      }
    }
  });

  it('le samedi dit pourquoi, au lieu de le faire disparaître en silence', () => {
    const s = session(3, 5);
    expect(s.suspended.map((x) => x.id)).toEqual(['copenhagen-plank']);
    expect(s.suspended[0]!.reason).toMatch(/adducteur gauche/i);
    // Aucune semaine de reprise écrite : elle dépend des symptômes.
    expect(s.suspended[0]!.reason).not.toMatch(/semaine \d/i);
  });

  it('il reste au catalogue — sinon l’historique des semaines 1-3 serait orphelin', () => {
    expect(EXERCISES['copenhagen-plank']).toBeDefined();
    expect(EXERCISES['copenhagen-plank']!.suspended).toBeDefined();
  });

  it('une suspension passe avant le feu tricolore et avant le deload', () => {
    const rouge = ctx({ readiness: readiness(150, 240) });
    expect(ids(session(5, 5, rouge).exercises)).not.toContain('copenhagen-plank');
    expect(ids(session(4, 5).exercises)).not.toContain('copenhagen-plank');
  });

  it('rien ne le remplace : le samedi ne gagne aucun exercice', () => {
    expect(ids(session(3, 5).exercises)).toEqual([
      'broad-jump',
      'deadlift',
      'front-squat',
      'hip-thrust',
      'nordic-curl',
      'single-leg-rdl',
      'suitcase-carry',
    ]);
  });
});

describe('suivi de douleur — seulement là où il a un sens', () => {
  it('les deux mouvements symptomatiques le portent', () => {
    expect(EXERCISES['back-squat']!.painWatch).toMatch(/adducteur gauche/i);
    expect(EXERCISES['bulgarian-split-squat']!.painWatch).toMatch(/adducteur gauche/i);
  });

  it('et les deux nouveaux à tester — pas un de plus', () => {
    // Les deux mouvements symptomatiques, plus les deux exercices introduits
    // en semaine 5 dont la tolérance à l'aine reste à vérifier. Un curseur
    // de douleur sous chaque exercice ferait un questionnaire, pas un suivi.
    const avec = Object.values(EXERCISES)
      .filter((e) => e.painWatch)
      .map((e) => e.id)
      .sort();
    expect(avec).toEqual([
      'back-squat',
      'bulgarian-split-squat',
      'roman-side-bench',
      'zercher-march',
    ]);
  });

  it('les mouvements surveillés gardent leur programmation, avec un rappel', () => {
    for (const id of [
      'front-squat',
      'deadlift',
      'single-leg-rdl',
      'hip-thrust',
      'farmer-carry',
      'suitcase-carry',
      'lateral-bound',
    ]) {
      expect(EXERCISES[id]!.cues?.join(' '), id).toMatch(/adducteur gauche|aucune douleur/i);
      expect(EXERCISES[id]!.suspended, id).toBeUndefined();
    }
  });

  it('le Bulgarian conditionne sa progression à la tolérance, pas au seul RPE', () => {
    expect(EXERCISES['bulgarian-split-squat']!.progressionRule).toMatch(/tolérance passe avant/i);
  });
});

/*
 * Les résultats déjà enregistrés sur un exercice suspendu restent lisibles.
 *
 * Une suspension retire la prescription, jamais le résultat : rouvrir une
 * semaine passée doit montrer ce qui a été fait, pas une séance amputée.
 */
describe('résumé d’une série conservée', () => {
  const vide = { actualReps: null, actualKg: null, actualRpe: null, measureValue: null };

  it('n’affiche que les champs réellement saisis', () => {
    expect(setSummary({ ...vide, actualReps: 8 })).toBe('8 reps');
    expect(setSummary({ ...vide, actualReps: 8, actualRpe: 7 })).toBe('8 reps · 7 RPE');
    expect(setSummary({ ...vide, actualReps: 8, actualKg: 20, actualRpe: 7.5 })).toBe(
      '8 reps · 20 kg · 7,5 RPE',
    );
  });

  it('un champ vide n’est jamais rendu par un zéro', () => {
    // Le piège : « 0 reps » se relit six semaines plus tard comme une série
    // ratée, alors que la case n'avait simplement pas été remplie.
    expect(setSummary({ ...vide, actualKg: 20 })).toBe('20 kg');
    expect(setSummary({ ...vide, actualKg: 20 })).not.toContain('0 reps');
  });

  it('un zéro réellement saisi, lui, s’affiche', () => {
    expect(setSummary({ ...vide, actualReps: 0 })).toBe('0 reps');
  });

  it('une série validée sans aucun chiffre reste une série faite', () => {
    expect(setSummary(vide)).toBe('série validée');
  });

  it('une mesure passe avant la charge — c’est elle qu’on relit sur un porté', () => {
    expect(setSummary({ ...vide, measureValue: 30, actualKg: 32 })).toBe('30 · 32 kg');
  });
});

/**
 * Barbell Offset Hold — le second point d'appui asymétrique de la semaine.
 *
 * Ajouté parce que la suspension du Copenhagen Plank a laissé l'anti-flexion
 * latérale sur un seul exercice, un seul jour : le Suitcase Carry du samedi.
 */
describe('Barbell Offset Hold', () => {
  const MERCREDI = 2;

  it('absent des semaines 1 à 4 — il n’existe qu’à partir du bloc force', () => {
    for (const w of [1, 2, 3, 4]) {
      expect(ids(session(w, MERCREDI).exercises), `S${w}`).not.toContain('barbell-offset-hold');
    }
  });

  it('force max : 3 × 25 s/côté, repos 60 s', () => {
    for (const w of [5, 6, 7]) {
      const ex = trouve(w, MERCREDI, 'barbell-offset-hold');
      expect(ex.loadLine, `S${w}`).toBe('3 × 25 s / côté × 5 kg');
      expect(ex.restSec, `S${w}`).toBe(60);
    }
  });

  it('puissance : 2 × 20 s/côté, repos 45 s', () => {
    for (const w of [9, 10, 11]) {
      const ex = trouve(w, MERCREDI, 'barbell-offset-hold');
      expect(ex.loadLine, `S${w}`).toBe('2 × 20 s / côté × 5 kg');
      expect(ex.restSec, `S${w}`).toBe(45);
    }
  });

  /*
   * Semaine 4 : l'exercice n'existait pas encore, et cette semaine est faite.
   * Semaine 8 : il est au programme depuis trois semaines, il déloade comme
   * tout le reste du tronc au lieu de disparaître.
   */
  it('absent du deload de la semaine 4, présent en volume réduit en semaine 8', () => {
    expect(ids(session(4, MERCREDI).exercises)).not.toContain('barbell-offset-hold');
    expect(trouve(8, MERCREDI, 'barbell-offset-hold').loadLine).toBe('2 × 15 s / côté × 5 kg');
  });

  it('absent de la semaine 12 — ce sont les tests', () => {
    for (const d of [0, 2, 4, 5, 6]) {
      expect(ids(session(12, d).exercises), `j${d}`).not.toContain('barbell-offset-hold');
    }
  });

  it('il suit immédiatement le Pallof Press, et ferme la séance', () => {
    const noms = ids(session(5, MERCREDI).exercises);
    expect(noms[noms.indexOf('pallof-press') + 1]).toBe('barbell-offset-hold');
    expect(noms[noms.length - 1]).toBe('barbell-offset-hold');
  });

  it('il n’apparaît aucun autre jour — surtout pas le lundi', () => {
    // Le lundi est la séance où l'adducteur travaille le plus : squat et
    // Bulgarian. On n'y ajoute rien tant que les symptômes durent.
    for (const w of [5, 9]) {
      for (const d of [0, 4, 5, 6]) {
        expect(ids(session(w, d).exercises), `S${w} j${d}`).not.toContain('barbell-offset-hold');
      }
    }
  });

  it('le mercredi ne gagne qu’UN exercice, et seulement dans ces deux blocs', () => {
    const n = (w: number) => session(w, MERCREDI).exercises.length;
    expect(n(5)).toBe(n(3) + 1);
    // En puissance, le plyo push-up quitte le début de séance pour le
    // contraste : la tenue prend exactement sa place, le compte ne bouge pas.
    expect(n(9)).toBe(n(3));
    expect(n(4)).toBe(n(3)); // deload : même liste, volumes réduits
  });

  it('la fiche est complète et dit ce qu’il ne faut pas faire', () => {
    const ex = EXERCISES['barbell-offset-hold']!;
    expect(ex.intent).toBeTruthy();
    expect(ex.progressionRule).toMatch(/durée d’abord/i);
    expect(ex.altBasicFit).toBeTruthy();
    expect(ex.cues!.length).toBeGreaterThanOrEqual(5);
    // La charge affichée prête à confusion : c'est un seul côté, pas le total.
    expect(ex.cues!.join(' ')).toMatch(/UN SEUL côté/);
    // Et il ne doit pas approcher le pattern douloureux.
    expect(ex.cues!.join(' ')).toMatch(/aucune adduction de hanche/i);
    expect(ex.suspended).toBeUndefined();
  });

  it('l’anti-flexion latérale couvre trois jours écartés', () => {
    // Lundi (Roman Side Bench), mercredi (Offset Hold), samedi (Roman Side
    // Bench). Le Suitcase Carry a quitté le programme à partir de la S5.
    const jours = [0, 2, 4, 5, 6].filter((d) =>
      session(5, d).exercises.some((e) =>
        ['barbell-offset-hold', 'roman-side-bench'].includes(e.id),
      ),
    );
    expect(jours).toEqual([0, 2, 5]);
  });
});

/**
 * La règle « deux exercices de tronc par séance », à partir de la semaine 5.
 *
 * Elle est tenue ici parce qu'elle est facile à casser sans s'en apercevoir :
 * un `remove` de trop dans une règle de bloc, et une séance repasse à un seul
 * exercice sans que rien ne se plaigne.
 */
describe('deux exercices de tronc par séance, à partir de la S5', () => {
  const tronc = (w: number, d: number) =>
    session(w, d)
      .exercises.filter((e) => e.def.role === 'core' || e.def.role === 'carry')
      .map((e) => e.id);

  it('la répartition voulue, semaine par semaine', () => {
    const attendu: Record<number, string[]> = {
      0: ['ab-wheel', 'roman-side-bench'],
      2: ['pallof-press', 'barbell-offset-hold'],
      4: ['landmine-rotation', 'dead-bug-cable'],
      5: ['zercher-march', 'roman-side-bench'],
      6: ['hanging-leg-raise', 'cable-chop'],
    };
    for (const w of [5, 6, 7, 9, 10, 11]) {
      for (const [d, ids] of Object.entries(attendu)) {
        expect([...tronc(w, Number(d))].sort(), `S${w} j${d}`).toEqual([...ids].sort());
      }
    }
  });

  it('les trois jours d’entraînement de la semaine 8 en gardent deux aussi', () => {
    // Samedi et dimanche de la S8 sont des séances de combine : la règle ne
    // s'y applique pas, et c'est voulu — ce sont des tests, pas des séances.
    for (const d of [0, 2, 4]) expect(tronc(8, d), `j${d}`).toHaveLength(2);
  });

  it('les semaines 1 à 4 gardent leur répartition d’origine', () => {
    expect(tronc(3, 0)).toEqual(['ab-wheel']);
    expect(tronc(3, 4)).toEqual(['farmer-carry', 'dead-bug-cable']);
    expect(tronc(3, 5)).toEqual(['suitcase-carry']);
    expect(tronc(3, 6)).toEqual(['cable-chop', 'hanging-leg-raise', 'bear-crawl']);
  });
});

describe('ce qui sort du programme à partir de la semaine 5', () => {
  const PARTIS = ['farmer-carry', 'suitcase-carry', 'bear-crawl'];

  it('ils ne réapparaissent dans aucun bloc après la semaine 4', () => {
    for (let w = 5; w <= 12; w++) {
      for (const d of [0, 2, 4, 5, 6]) {
        const s = getSession(w as WeekIndex, d as DayIndex, ctx());
        for (const id of PARTIS) {
          expect(ids(s?.exercises ?? []), `${id} S${w} j${d}`).not.toContain(id);
        }
      }
    }
  });

  it('mais les semaines 1 à 4 les gardent — leur historique ne se réécrit pas', () => {
    expect(ids(session(3, 4).exercises)).toContain('farmer-carry');
    expect(ids(session(3, 5).exercises)).toContain('suitcase-carry');
    expect(ids(session(3, 6).exercises)).toContain('bear-crawl');
    expect(ids(session(4, 4).exercises)).toContain('farmer-carry');
  });

  /*
   * Le Farmer Carry reste une métrique du combine : §12 le mesure en distance
   * max à 2 × 40 kg, en semaine 0, 8 et 12. Le retirer de l'entraînement ne
   * le retire pas des tests — ce sont deux exercices distincts au catalogue.
   */
  it('le Farmer Carry reste testé au combine, même s’il n’est plus entraîné', () => {
    expect(ids(session(8, 5).exercises)).toContain('test-farmer-carry');
    expect(ids(session(12, 5).exercises)).toContain('test-farmer-carry');
  });

  it('aucun doublon : le Woodchop est l’ancien chop, pas une seconde fiche', () => {
    expect(EXERCISES['cable-chop']!.name).toContain('Woodchop');
    expect(EXERCISES['woodchop']).toBeUndefined();
  });
});

describe('Roman Side Bench et Zercher March', () => {
  it('le Roman Side Bench tient le lundi et le samedi', () => {
    for (const w of [5, 7]) {
      expect(trouve(w, 0, 'roman-side-bench').loadLine).toBe('2 × 8 / côté — poids du corps');
      expect(trouve(w, 5, 'roman-side-bench').loadLine).toBe('2 × 8 / côté — poids du corps');
    }
    // Volume réduit en bloc puissance, comme tout le reste.
    expect(trouve(9, 0, 'roman-side-bench').loadLine).toBe('2 × 6 / côté — poids du corps');
  });

  it('il s’enchaîne en alternance avec l’Ab Wheel le lundi', () => {
    const s = session(5, 0);
    expect(trouve(5, 0, 'ab-wheel').restSec).toBe(45);
    expect(trouve(5, 0, 'roman-side-bench').restSec).toBe(45);
    const noms = ids(s.exercises);
    expect(noms[noms.indexOf('ab-wheel') + 1]).toBe('roman-side-bench');
    expect(trouve(5, 0, 'ab-wheel').notes.join(' ')).toMatch(/alternance/i);
  });

  it('le Zercher March démarre barre nue et se mesure en mètres', () => {
    const ex = trouve(5, 5, 'zercher-march');
    expect(ex.loadLine).toBe('2 × 12 m × 20 kg');
    expect(ex.restSec).toBe(90);
    expect(ex.notes.join(' ')).toMatch(/pas chargés/);
  });

  it('les deux portent un suivi de douleur — leur tolérance n’est pas établie', () => {
    expect(EXERCISES['roman-side-bench']!.painWatch).toMatch(/adducteur gauche/i);
    expect(EXERCISES['zercher-march']!.painWatch).toMatch(/adducteur gauche/i);
  });

  it('leurs fiches sont complètes', () => {
    for (const id of ['roman-side-bench', 'zercher-march', 'cable-chop']) {
      const ex = EXERCISES[id]!;
      expect(ex.intent, id).toBeTruthy();
      expect(ex.progressionRule, id).toBeTruthy();
      expect(ex.altBasicFit, id).toBeTruthy();
      expect(ex.cues!.length, id).toBeGreaterThanOrEqual(5);
      expect(ex.cues!.join(' '), id).toMatch(/Muscles :/);
      expect(ex.cues!.join(' '), id).toMatch(/Objectif athlétique :|Objectif athlétique|Objectif :/);
    }
  });
});
