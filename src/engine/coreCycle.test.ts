/**
 * Le cycle du tronc, le retrait d'un exercice, et le deload qui n'en était
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
import { setSummary } from './format';
import { EXERCISES } from '../data/exercises';
import { DELOAD_CORE } from '../data/blockRules';
import { FAMILLE_TRONC, FONCTIONS_TRONC, fonctionTronc } from '../data/fonctionsTronc';
import type { DayIndex, WeekIndex } from '../data/types';
import type { HistoryIndex } from './types';

const ONE_RM = {
  'back-squat': 110,
  'bench-press': 115,
  deadlift: 140,
  'weighted-pullup': 45,
} as const;

/**
 * Un historique de portés, pour pouvoir observer le deload.
 *
 * Les charges d'accessoires ne sont plus écrites dans le programme : elles
 * viennent de ce que l'utilisateur a réellement soulevé. Un deload « à 80 % de
 * la charge » n'a donc rien à réduire tant qu'aucune séance n'a eu lieu — ce
 * qui est le comportement voulu, mais ne se teste pas.
 *
 * Ces trois lignes jouent le rôle d'un utilisateur arrivé en semaine 3 avec
 * ses propres charges. Elles ne sont plus une prescription du programme, juste
 * le passé d'un utilisateur de test.
 *
 * Semaine 2 et non 3 : une séance ne peut pas se référencer elle-même, et
 * plusieurs assertions portent sur la semaine 3.
 */
const PORTES_PASSES: HistoryIndex = {
  'farmer-carry': [
    {
      exerciseId: 'farmer-carry',
      week: 2,
      day: 4 as DayIndex,
      kg: 34,
      rpe: null,
      plannedKg: null,
      failed: false,
      targetRPE: null,
      completed: true,
    },
  ],
  'suitcase-carry': [
    {
      exerciseId: 'suitcase-carry',
      week: 2,
      day: 5 as DayIndex,
      kg: 32,
      rpe: null,
      plannedKg: null,
      failed: false,
      targetRPE: null,
      completed: true,
    },
  ],
  'barbell-offset-hold': [
    {
      exerciseId: 'barbell-offset-hold',
      week: 2,
      day: 2 as DayIndex,
      kg: 5,
      rpe: null,
      plannedKg: null,
      failed: false,
      targetRPE: null,
      completed: true,
    },
  ],
  'zercher-march': [
    {
      exerciseId: 'zercher-march',
      week: 2,
      day: 5 as DayIndex,
      kg: 20,
      rpe: null,
      plannedKg: null,
      failed: false,
      targetRPE: null,
      completed: true,
    },
  ],
};

const ctx = (over: Partial<SessionContext> = {}): SessionContext => ({
  ...EMPTY_CONTEXT,
  settings: {
    startDate: '2026-01-03',
    broadJumpBaselineCm: 240,
    oneRM: { ...ONE_RM },
    tableauOrigine: false,
  },
  history: PORTES_PASSES,
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

describe('Copenhagen Plank — repris, et déplacé', () => {
  /*
   * Il a été suspendu, puis repris sur décision de Guillaume. Il ne revient
   * PAS à sa place d'origine.
   */
  it('n’est plus suspendu', () => {
    expect(EXERCISES['copenhagen-plank']!.suspended).toBeUndefined();
  });

  it('est au vendredi, toutes les semaines d’entraînement', () => {
    for (const w of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]) {
      expect(ids(session(w, 4).exercises), `S${w}`).toContain('copenhagen-plank');
    }
  });

  it('a QUITTÉ le samedi, où il doublonnait avec le Suitcase Carry', () => {
    // Les deux résistent à la flexion latérale. C'est tout l'objet du
    // déplacement : les faire le même jour, c'est faire deux fois le même
    // travail en croyant en faire deux.
    for (const w of [1, 3, 5, 9]) {
      expect(ids(session(w, 5).exercises), `S${w}`).not.toContain('copenhagen-plank');
    }
  });

  it('le deload de la semaine 8 l’allège comme les autres', () => {
    const ex = session(8, 4).exercises.find((e) => e.id === 'copenhagen-plank');
    expect(ex?.sets).toBe(2);
  });

  it('la règle du bloc puissance l’a suivi au vendredi', () => {
    // Une règle qui désigne un exercice absent de la trame du jour ne plante
    // pas : elle ne fait rien, en silence.
    const ex = session(9, 4).exercises.find((e) => e.id === 'copenhagen-plank');
    expect(ex?.sets).toBe(3);
    expect(ex?.work).toMatchObject({ kind: 'reps', reps: 5, perSide: true });
  });

  it('porte une consigne d’arrêt à la gêne — c’est lui qui avait fait mal', () => {
    expect(EXERCISES['copenhagen-plank']!.cues!.join(' ')).toMatch(/gêne à l’aine/i);
  });
});

/*
 * LA RÈGLE DE GUILLAUME : jamais deux exercices du tronc de la MÊME FAMILLE
 * le même jour.
 *
 * Elle ne compte pas les exercices, elle compte les familles. Trois exercices
 * de tronc dans une séance ne posent aucun problème s'ils travaillent trois
 * choses différentes ; deux en posent un s'ils travaillent la même.
 *
 * Les familles ci-dessous sont celles que les fiches du catalogue écrivent
 * elles-mêmes — « Anti-extension. » pour le Dead Bug, « Anti-rotation
 * dynamique » pour le Pallof, « résister à la flexion latérale » pour
 * l'Offset Hold. Rien n'est deviné ici.
 */
const FAMILLE: Readonly<Record<string, string>> = FAMILLE_TRONC;

/*
 * L'UNIQUE dérogation à la règle ci-dessus, et elle est nominative.
 *
 * Le samedi des blocs force max et puissance ferme sur le Suitcase Carry
 * puis le Roman Side Bench — deux « flexion latérale ». Guillaume l'a
 * tranché en connaissance de cause, après qu'on lui a montré le conflit :
 * le facteur limitant diffère (la main d'un côté, les obliques de l'autre),
 * exactement l'argument que le §8 tient déjà pour le Barbell Offset Hold.
 *
 * Elle est écrite comme une PAIRE NOMMÉE, pas comme un assouplissement de
 * la règle : n'importe quel autre doublon de famille, y compris une
 * troisième « flexion latérale » glissée dans ce même samedi, fait toujours
 * tomber le test. C'est ce que vérifie « la dérogation ne couvre que cette
 * paire-là », plus bas.
 */
const DEROGATION = {
  jour: 5,
  paire: ['suitcase-carry', 'roman-side-bench'] as const,
  famille: 'flexion latérale',
};

/** Les familles du jour, la paire dérogatoire comptée pour une seule. */
function famillesDuJour(ids: readonly string[], jour: number): string[] {
  const couverte = jour === DEROGATION.jour && DEROGATION.paire.every((x) => ids.includes(x));
  return ids
    .filter((id) => !(couverte && id === DEROGATION.paire[1]))
    .map((id) => FAMILLE[id] ?? `INCONNUE:${id}`);
}

describe('jamais deux exercices du tronc de la même famille le même jour', () => {
  it('sur les douze semaines, les cinq jours', () => {
    for (let w = 1; w <= 12; w++) {
      for (const d of [0, 2, 4, 5, 6]) {
        const s = session(w, d);
        const tronc = s.exercises
          .filter((e) => e.def.role === 'core' || e.def.role === 'carry')
          .map((e) => e.id);
        const familles = famillesDuJour(tronc, d);
        expect(new Set(familles).size, `S${w} j${d} — ${tronc.join(', ')}`).toBe(familles.length);
      }
    }
  });

  it('la dérogation ne couvre que cette paire-là', () => {
    /*
     * Si un troisième exercice de flexion latérale entrait dans ce samedi,
     * la dérogation ne le couvrirait pas — elle ne neutralise qu'un seul
     * identifiant, nommément le Roman Side Bench. On le prouve en le
     * simulant : la règle doit redevenir rouge.
     */
    const troisAuSamedi = ['suitcase-carry', 'roman-side-bench', 'copenhagen-plank'];
    const familles = famillesDuJour(troisAuSamedi, 5);
    expect(new Set(familles).size).not.toBe(familles.length);

    // Et la même paire un AUTRE jour n'est pas couverte non plus.
    const auLundi = famillesDuJour(['suitcase-carry', 'roman-side-bench'], 0);
    expect(new Set(auLundi).size).not.toBe(auLundi.length);
  });

  it('la paire dérogatoire est bien celle que le programme produit', () => {
    // La dérogation décrit le réel : si le samedi cessait de porter ces
    // deux-là, elle deviendrait une permission dormante sur un jour qui
    // n'en a plus besoin. Ce test la périme le jour où ça arrive.
    for (const w of [5, 6, 7, 9, 10, 11]) {
      const tronc = session(w, 5)
        .exercises.filter((e) => e.def.role === 'core' || e.def.role === 'carry')
        .map((e) => e.id);
      expect(tronc, `S${w}`).toEqual([...DEROGATION.paire]);
      for (const id of DEROGATION.paire) {
        expect(FAMILLE[id], id).toBe(DEROGATION.famille);
      }
    }
  });

  it('chaque exercice du tronc a une famille déclarée', () => {
    // Un exercice ajouté sans famille rendrait la règle au-dessus muette :
    // « INCONNUE:x » ne ressemble à aucune autre, donc ne déclenche rien.
    for (let w = 1; w <= 12; w++) {
      for (const d of [0, 2, 4, 5, 6]) {
        for (const e of session(w, d).exercises) {
          if (e.def.role !== 'core' && e.def.role !== 'carry') continue;
          expect(FAMILLE[e.id], `S${w} j${d} — ${e.id}`).toBeDefined();
        }
      }
    }
  });
});

describe('aucun suivi de blessure personnel — le programme est grand public', () => {
  /*
   * Le programme a porté le suivi de l'adducteur gauche de son auteur : un
   * curseur de douleur sous quatre exercices, des rappels sous sept autres,
   * une condition « adducteur bien toléré » dans une progression. C'était
   * sa blessure, pas celle de la personne qui suit le programme. Décision de
   * Guillaume : tout disparaît. Ces tests empêchent qu'il revienne par un
   * copier-coller de fiche.
   */
  const BLESSURE = /adducteur|§ ?14|symptomatique/i;

  it('aucune fiche ne porte de suivi de douleur', () => {
    for (const e of Object.values(EXERCISES)) {
      expect('painWatch' in e, e.id).toBe(false);
    }
  });

  it('aucune fiche ne parle de la blessure de l’auteur', () => {
    for (const e of Object.values(EXERCISES)) {
      const texte = [
        e.intent,
        e.progressionRule,
        e.altBasicFit,
        e.suspended?.reason,
        ...(e.cues ?? []),
      ]
        .filter(Boolean)
        .join(' ');
      expect(texte, e.id).not.toMatch(BLESSURE);
    }
  });

  it('aucune consigne de séance non plus, sur les douze semaines', () => {
    for (let w = 1; w <= 12; w++) {
      for (const d of [0, 2, 4, 5, 6]) {
        for (const e of session(w, d).exercises) {
          expect(e.notes.join(' '), `S${w} j${d} — ${e.id}`).not.toMatch(BLESSURE);
        }
      }
    }
  });

  it('les mouvements qui étaient surveillés restent programmés', () => {
    for (const id of [
      'back-squat',
      'bulgarian-split-squat',
      'front-squat',
      'deadlift',
      'single-leg-rdl',
      'hip-thrust',
      'farmer-carry',
      'suitcase-carry',
      'lateral-bound',
      'roman-side-bench',
    ]) {
      expect(EXERCISES[id]!.suspended, id).toBeUndefined();
    }
  });

  it('le Bulgarian progresse sur le RPE, sans condition de tolérance', () => {
    expect(EXERCISES['bulgarian-split-squat']!.progressionRule).toBe(
      '8 reps propres à RPE ≤ 7,5 → +2 kg par haltère.',
    );
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

  it('l’anti-flexion latérale couvre quatre jours, les mêmes qu’en S1-4', () => {
    /*
     * Lundi (Roman Side Bench), mercredi (Offset Hold), vendredi
     * (Copenhagen), samedi (Suitcase Carry).
     *
     * Le vendredi et le samedi se suivent, et c'est assumé : c'est
     * exactement la forme qu'ont déjà les semaines 1 à 4 depuis le retour du
     * Copenhagen. Les deux moitiés du programme ont désormais la même
     * répartition — ce qui n'était pas le cas quand le Suitcase Carry
     * s'arrêtait en semaine 4 et que le Roman Side Bench passait deux fois
     * par semaine.
     *
     * Les tissus sollicités ne sont pas les mêmes : le Copenhagen met
     * l'adducteur en tension maximale à l'arrêt, le Suitcase Carry freine
     * une inclinaison en marchant, charge dans une main.
     */
    const familleLaterale = [
      'barbell-offset-hold',
      'roman-side-bench',
      'copenhagen-plank',
      'suitcase-carry',
    ];
    const jours = (w: number) =>
      [0, 2, 4, 5, 6].filter((d) =>
        session(w, d).exercises.some((e) => familleLaterale.includes(e.id)),
      );
    expect(jours(5)).toEqual([0, 2, 4, 5]);
    expect(jours(3), 'les semaines 1-4 ont la même forme').toEqual([4, 5]);
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
    /*
     * Le vendredi en porte TROIS depuis le retour du Copenhagen Plank, et
     * c'est une décision, pas une dérive : Guillaume a choisi de garder
     * l'Offset Hold du mercredi ET de reprendre le Copenhagen. Le vendredi
     * était le seul jour libre de flexion latérale dans les deux moitiés du
     * programme.
     *
     * Les trois familles y restent distinctes — rotation, anti-extension,
     * flexion latérale — ce que le describe suivant vérifie sur les douze
     * semaines. C'est cette règle-là qui compte, pas le décompte.
     */
    const attendu: Record<number, string[]> = {
      0: ['ab-wheel', 'roman-side-bench'],
      2: ['pallof-press', 'barbell-offset-hold'],
      4: ['landmine-rotation', 'dead-bug-cable', 'copenhagen-plank'],
      /* Suitcase Carry puis Roman Side Bench. Deux « flexion latérale » le
         même jour : dérogation nommée, assumée par Guillaume, et vérifiée
         comme telle par le describe de la règle de famille. Le Zercher
         March est déprogrammé — il reste au catalogue avec sa raison. */
      5: ['suitcase-carry', 'roman-side-bench'],
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
    for (const d of [0, 2]) expect(tronc(8, d), `j${d}`).toHaveLength(2);
    // Le vendredi en a trois, Copenhagen compris, deload inclus.
    expect(tronc(8, 4)).toHaveLength(3);
  });

  it('les semaines 1 à 4 gardent leur répartition, Copenhagen en plus', () => {
    expect(tronc(3, 0)).toEqual(['ab-wheel']);
    // Le vendredi gagne le Copenhagen : porté symétrique, anti-extension,
    // flexion latérale. Trois exercices, trois familles.
    expect(tronc(3, 4)).toEqual(['farmer-carry', 'dead-bug-cable', 'copenhagen-plank']);
    // Et le samedi ne garde QUE le Suitcase Carry : c'est de là qu'il vient.
    expect(tronc(3, 5)).toEqual(['suitcase-carry']);
    // Le Bear Crawl n'est plus programmé : deux exercices dès la semaine 1.
    expect(tronc(3, 6)).toEqual(['cable-chop', 'hanging-leg-raise']);
  });
});

describe('ce qui sort du programme à partir de la semaine 5', () => {
  /*
   * Le Suitcase Carry n'en fait plus partie : il reste sur les douze
   * semaines. C'était la seule marche chargée d'un seul côté du programme,
   * et elle disparaissait au profit d'un Roman Side Bench déjà présent au
   * lundi. Le Farmer Carry, lui, sort toujours.
   */
  const PARTIS = ['farmer-carry'];

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

  it('le Suitcase Carry, lui, traverse les douze semaines', () => {
    // Les semaines 8 et 12 sont sautées : leur samedi est un combine, pas
    // une séance ordinaire. Aucun porté n'y figure, et c'est voulu.
    for (const w of [3, 5, 6, 10, 11]) {
      const s = getSession(w as WeekIndex, 5 as DayIndex, ctx());
      expect(ids(s?.exercises ?? []), `S${w}`).toContain('suitcase-carry');
    }
  });

  it('mais les semaines 1 à 4 gardent le reste — leur historique ne se réécrit pas', () => {
    expect(ids(session(3, 4).exercises)).toContain('farmer-carry');
    expect(ids(session(4, 4).exercises)).toContain('farmer-carry');
  });

  /*
   * Le Bear Crawl est DÉPROGRAMMÉ dès la semaine 1 (décision de Guillaume),
   * mais sa fiche reste au catalogue : « on ne supprime pas d'exercices
   * existants ». Les séries déjà enregistrées gardent donc un nom.
   */
  it('le Bear Crawl n’est plus programmé nulle part, mais reste au catalogue', () => {
    for (let w = 1; w <= 12; w++) {
      for (const d of [0, 2, 4, 5, 6]) {
        const s = getSession(w as WeekIndex, d as DayIndex, ctx());
        expect(ids(s?.exercises ?? []), `S${w} j${d}`).not.toContain('bear-crawl');
      }
    }
    expect(EXERCISES['bear-crawl']?.name).toBe('Bear Crawl');
  });

  /*
   * Le Farmer Carry n'est plus TESTÉ (décision de Guillaume) : sa distance ne
   * décidait d'aucune charge et il sort du programme dès la semaine 5. Le
   * mouvement, lui, reste au vendredi des semaines 1-4 — ce sont deux
   * exercices distincts au catalogue, et seul celui du combine part.
   */
  it('le Farmer Carry n’est plus testé à aucun combine', () => {
    for (const [w, d] of [
      [0, 5],
      [8, 5],
      [12, 5],
    ] as const) {
      expect(ids(session(w, d).exercises)).not.toContain('test-farmer-carry');
    }
    expect(EXERCISES['test-farmer-carry']).toBeUndefined();
    // Le mouvement, lui, est toujours là.
    expect(EXERCISES['farmer-carry']).toBeDefined();
  });

  it('aucun doublon : le Woodchop est l’ancien chop, pas une seconde fiche', () => {
    expect(EXERCISES['cable-chop']!.name).toContain('Woodchop');
    expect(EXERCISES['woodchop']).toBeUndefined();
  });
});

describe('Roman Side Bench et Zercher March', () => {
  it('le Roman Side Bench tient le lundi ET le samedi, à prescription identique', () => {
    /*
     * Deux séances par semaine, c'est une redondance assumée : Guillaume a
     * préféré déprogrammer le Zercher March plutôt que ce mouvement-là.
     *
     * Ce qui est verrouillé ici, c'est la condition qui rend la redondance
     * inoffensive : les DEUX jours portent exactement la même prescription,
     * au poids du corps. C'est ce qui fait qu'aucune charge ne dérive quand
     * l'exercice lit son propre historique à deux endroits dans la semaine
     * (le garde-fou de historyIndex s'appuie sur ce fait). Si l'un des deux
     * jours prenait une charge ou un volume propre, ce test tomberait, et
     * il faudrait alors les séparer pour de bon.
     */
    for (const w of [5, 6, 7, 9, 10, 11]) {
      const lundi = trouve(w, 0, 'roman-side-bench');
      const samedi = trouve(w, 5, 'roman-side-bench');
      expect(lundi.loadLine, `S${w} lundi`).toBe('3 × 8 / côté — poids du corps');
      expect(samedi.loadLine, `S${w} samedi`).toBe(lundi.loadLine);
      expect(samedi.sets, `S${w}`).toBe(lundi.sets);
    }
  });

  it('il n’apparaît aucun autre jour que ces deux-là', () => {
    for (let w = 1; w <= 12; w++) {
      for (const d of [2, 4, 6]) {
        expect(ids(session(w, d).exercises), `S${w} j${d}`).not.toContain('roman-side-bench');
      }
    }
  });

  it('la règle du deload reste la règle du deload : 2 séries en semaine 8', () => {
    /*
     * Le volume de bloc ne doit pas se glisser dans le deload. La semaine 8
     * garde ses 2 séries, parce que c'est ce que le programme écrit — et la
     * semaine 4 n'a pas cet exercice, qui n'existe qu'à partir de la 5.
     */
    expect(trouve(8, 0, 'roman-side-bench').loadLine).toBe('2 × 6 / côté — poids du corps');
    expect(trouve(8, 0, 'ab-wheel').loadLine).toBe('2 × 6 — poids du corps');
  });

  it('alternance à volume ÉGAL avec l’Ab Wheel le lundi', () => {
    /*
     * C'était l'incohérence : « une série de chaque » annoncé, et l'un des
     * deux à 3 séries quand l'autre en avait 2. Au bout de deux tours il
     * restait une série d'Ab Wheel toute seule.
     */
    for (const w of [5, 6, 7, 9, 10, 11]) {
      const abWheel = trouve(w, 0, 'ab-wheel');
      const roman = trouve(w, 0, 'roman-side-bench');
      expect(abWheel.sets).toBe(roman.sets);
      expect(abWheel.sets).toBe(3);
      expect(abWheel.restSec).toBe(45);
      expect(roman.restSec).toBe(45);
      const noms = ids(session(w, 0).exercises);
      expect(noms[noms.indexOf('ab-wheel') + 1]).toBe('roman-side-bench');
      expect(abWheel.notes.join(' ')).toMatch(/alternance/i);
    }
  });

  it('le Zercher March est déprogrammé — mais pas supprimé', () => {
    /*
     * Il n'apparaît dans aucune séance, des douze semaines. Il reste au
     * CATALOGUE avec sa fiche complète : « on ne supprime pas d'exercices
     * existants ». Il peut se reprogrammer sans rien réécrire.
     */
    for (let w = 1; w <= 12; w++) {
      for (const d of [0, 2, 4, 5, 6]) {
        expect(ids(session(w, d).exercises), `S${w} j${d}`).not.toContain('zercher-march');
      }
    }
    expect(EXERCISES['zercher-march'], 'la fiche reste au catalogue').toBeDefined();
  });

  it('leurs fiches sont complètes', () => {
    for (const id of ['roman-side-bench', 'zercher-march', 'cable-chop']) {
      const ex = EXERCISES[id]!;
      expect(ex.intent, id).toBeTruthy();
      expect(ex.progressionRule, id).toBeTruthy();
      expect(ex.altBasicFit, id).toBeTruthy();
      expect(ex.cues!.length, id).toBeGreaterThanOrEqual(5);
      expect(ex.cues!.join(' '), id).toMatch(/Muscles :/);
      expect(ex.cues!.join(' '), id).toMatch(
        /Objectif athlétique :|Objectif athlétique|Objectif :/,
      );
    }
  });
});

describe('le bandeau « à quoi ça sert » des exercices de tronc', () => {
  /*
   * L'empreinte ne voit pas ce bandeau : elle compare séries, charge et
   * repos. Sans ce test, on pourrait vider la table et tout resterait vert.
   */
  it('tout exercice de tronc ou de porté PROGRAMMÉ a une fonction affichable', () => {
    for (let w = 1; w <= 12; w++) {
      for (const d of [0, 2, 4, 5, 6]) {
        const s = getSession(w as WeekIndex, d as DayIndex, ctx());
        for (const e of s?.exercises ?? []) {
          if (e.def.role !== 'core' && e.def.role !== 'carry') continue;
          const f = fonctionTronc(e.id);
          expect(f, `${e.id} S${w} j${d} : pas de fonction`).not.toBeNull();
          expect(f!.role.length, e.id).toBeGreaterThan(20);
          expect(f!.utilite.length, e.id).toBeGreaterThan(20);
        }
      }
    }
  });

  it('chaque famille a son texte, et les textes diffèrent', () => {
    const roles = Object.values(FONCTIONS_TRONC).map((f) => f.role);
    expect(new Set(roles).size).toBe(roles.length);
    for (const famille of new Set(Object.values(FAMILLE_TRONC))) {
      expect(FONCTIONS_TRONC[famille], famille).toBeDefined();
    }
  });

  it('un exercice qui n’est pas du tronc n’affiche rien', () => {
    expect(fonctionTronc('back-squat')).toBeNull();
    expect(fonctionTronc('bench-press')).toBeNull();
  });
});
