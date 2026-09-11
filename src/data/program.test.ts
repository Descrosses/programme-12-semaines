/**
 * Intégrité du programme transcrit.
 *
 * Ces tests ne vérifient pas des valeurs du .md (c'est le rôle de
 * `mainLiftTable.test.ts`) mais la cohérence interne : pas d'exercice fantôme,
 * pas d'id dupliqué, pas de repos absurde, pas de règle qui vise un exercice
 * absent de la séance qu'elle prétend modifier.
 */

import { describe, expect, it } from 'vitest';
import { BASE_SESSIONS } from './baseSessions';
import { BLOCK_RULES, CONTRAST_BY_DAY, DELOAD_POLICY } from './blockRules';
import { EXERCISES, EXERCISE_IDS } from './exercises';
import { MAIN_LIFT_TABLE } from './mainLiftTable';
import { SPECIAL_SESSIONS, RAMPS } from './testSessions';
import { WARMUPS } from './warmups';
import { WEEK_BLOCKS, WEEK_DAYS, BLOCKS } from './program';
import { DAY_LABELS, type DayIndex } from './types';

const DAYS: DayIndex[] = [0, 1, 2, 3, 4];

describe('catalogue d’exercices', () => {
  it('aucun id dupliqué', () => {
    expect(new Set(EXERCISE_IDS).size).toBe(EXERCISE_IDS.length);
  });

  it('les ids sont en kebab-case (ils sont gelés, autant qu’ils soient propres)', () => {
    for (const id of EXERCISE_IDS) expect(id, id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it('tout exercice porteur d’un liftId correspond à une ligne du tableau', () => {
    for (const id of EXERCISE_IDS) {
      const lift = EXERCISES[id]!.liftId;
      if (lift) expect(MAIN_LIFT_TABLE[lift], `${id} → ${lift}`).toBeDefined();
    }
  });

  it('chaque exercice a une intention d’exécution non vide', () => {
    for (const id of EXERCISE_IDS) expect(EXERCISES[id]!.intent.length, id).toBeGreaterThan(0);
  });

  it('la règle §5 est rappelée sur tous les mouvements explosifs', () => {
    const explosifs = EXERCISE_IDS.filter((id) => EXERCISES[id]!.explosive);
    expect(explosifs.length).toBeGreaterThan(0);
    for (const id of explosifs) {
      expect(EXERCISES[id]!.cues?.join(' '), id).toContain('tentative de performance');
    }
  });
});

describe('trames §7', () => {
  it('couvrent les 5 jours', () => {
    expect(DAYS.map((d) => BASE_SESSIONS[d].day)).toEqual(DAYS);
  });

  it('ne référencent que des exercices existants', () => {
    for (const d of DAYS) {
      for (const slot of BASE_SESSIONS[d].slots) {
        expect(EXERCISES[slot.exId], `${DAY_LABELS[d]} → ${slot.exId}`).toBeDefined();
      }
    }
  });

  it('n’ont pas deux fois le même exercice dans une séance', () => {
    for (const d of DAYS) {
      const ids = BASE_SESSIONS[d].slots.map((s) => s.exId);
      expect(new Set(ids).size, DAY_LABELS[d]).toBe(ids.length);
    }
  });

  it('le readiness test est prévu les jours jambes uniquement (§4 : lundi, vendredi, samedi)', () => {
    expect(DAYS.map((d) => BASE_SESSIONS[d].readinessTest)).toEqual([true, false, true, true, false]);
  });

  it('un slot piloté par le tableau déclare bien son liftId', () => {
    for (const d of DAYS) {
      for (const slot of BASE_SESSIONS[d].slots) {
        const def = EXERCISES[slot.exId]!;
        if (def.liftId) expect(slot.liftId, `${slot.exId}`).toBe(def.liftId);
      }
    }
  });

  it('les repos sont plausibles (0 à 5 min)', () => {
    for (const d of DAYS) {
      for (const slot of BASE_SESSIONS[d].slots) {
        expect(slot.restSec, `${slot.exId}`).toBeGreaterThanOrEqual(0);
        expect(slot.restSec, `${slot.exId}`).toBeLessThanOrEqual(300);
      }
    }
  });

  it('les repos des lifts lourds respectent §7 et §10', () => {
    const rest = (d: DayIndex, exId: string) =>
      BASE_SESSIONS[d].slots.find((s) => s.exId === exId)?.restSec;
    expect(rest(0, 'back-squat')).toBe(210); // 3 min 30
    expect(rest(3, 'deadlift')).toBe(210); // 3 min 30
    expect(rest(1, 'bench-press')).toBe(180); // 3 min
    expect(rest(1, 'weighted-pullup')).toBe(150); // 2 min 30
    expect(rest(0, 'rdl')).toBe(150); // 2 min 30
    expect(rest(2, 'speed-squat')).toBe(60); // 60 s en accumulation
  });
});

describe('règles de bloc §8', () => {
  it('ne visent que des exercices existants', () => {
    for (const set of BLOCK_RULES) {
      for (const rule of set.rules) {
        const id = rule.op === 'insert' ? rule.slot.exId : rule.exId;
        expect(EXERCISES[id], `${set.block} → ${id}`).toBeDefined();
      }
    }
  });

  it('ne visent que des exercices présents dans la trame du jour', () => {
    for (const set of BLOCK_RULES) {
      if (set.day === undefined) continue;
      const present = new Set(BASE_SESSIONS[set.day].slots.map((s) => s.exId));
      for (const rule of set.rules) {
        if (rule.op === 'insert') continue;
        expect(present.has(rule.exId), `${set.block} ${DAY_LABELS[set.day]} → ${rule.exId}`).toBe(true);
      }
    }
  });

  it('le contraste S9-11 couvre lundi, mercredi et samedi (§8)', () => {
    expect(Object.keys(CONTRAST_BY_DAY).map(Number).sort()).toEqual([0, 1, 3]);
    for (const [day, spec] of Object.entries(CONTRAST_BY_DAY)) {
      expect(EXERCISES[spec!.heavy], `lourd ${day}`).toBeDefined();
      expect(EXERCISES[spec!.explosive], `explosif ${day}`).toBeDefined();
    }
  });

  it('l’explosif du contraste est retiré du début de séance', () => {
    for (const [dayStr, spec] of Object.entries(CONTRAST_BY_DAY)) {
      const day = Number(dayStr) as DayIndex;
      const rules = BLOCK_RULES.filter((r) => r.block === 'power' && r.day === day).flatMap((r) => r.rules);
      const removed = rules.some((r) => r.op === 'remove' && r.exId === spec!.explosive);
      expect(removed, `${DAY_LABELS[day]} : ${spec!.explosive} doit sortir du début de séance`).toBe(true);
    }
  });

  it('le deload retire le Nordic et le conditioning (§8)', () => {
    expect(DELOAD_POLICY.removeExIds).toContain('nordic-curl');
    expect(DELOAD_POLICY.removeExIds).toContain('conditioning');
    expect(DELOAD_POLICY.maxRPE).toBe(6);
    expect(DELOAD_POLICY.accessoryLoadFactor).toBe(0.8);
  });
});

describe('séances écrites en toutes lettres (§12, §8 S12)', () => {
  it('ne référencent que des exercices existants', () => {
    for (const { week, day, blueprint } of SPECIAL_SESSIONS) {
      for (const slot of blueprint.slots) {
        expect(EXERCISES[slot.exId], `S${week} ${DAY_LABELS[day]} → ${slot.exId}`).toBeDefined();
      }
    }
  });

  it('le jour déclaré correspond à la trame', () => {
    for (const { day, blueprint } of SPECIAL_SESSIONS) expect(blueprint.day).toBe(day);
  });

  it('le combine initial tient entièrement dans la semaine 0 : sam, dim, lundi', () => {
    const cases = SPECIAL_SESSIONS.filter((s) => s.blueprint.title.startsWith('Combine initial'));
    expect(cases.map((s) => [s.week, s.day])).toEqual([
      [0, 3],
      [0, 4],
      [0, 0],
    ]);
  });

  it('§12 — le poids de corps ne figure dans aucune séance de combine', () => {
    for (const s of SPECIAL_SESSIONS) {
      expect(s.blueprint.slots.map((x) => x.exId), s.blueprint.title).not.toContain(
        'test-bodyweight',
      );
    }
  });

  it('la semaine 12 couvre les 5 jours', () => {
    const s12 = SPECIAL_SESSIONS.filter((s) => s.week === 12).map((s) => s.day);
    expect(s12.sort()).toEqual([0, 1, 2, 3, 4]);
  });

  it('le lundi S12 accueille le bench et le push press du tableau (décision de Guillaume)', () => {
    const lundi = SPECIAL_SESSIONS.find((s) => s.week === 12 && s.day === 0)!.blueprint;
    const ids = lundi.slots.map((s) => s.exId);
    expect(ids).toEqual([
      'box-jump',
      'back-squat',
      'bulgarian-split-squat',
      'ab-wheel',
      'bench-press',
      'push-press',
    ]);
    // Les quatre autres jours sont des tests purs : aucun lift chargé du tableau.
    for (const day of [1, 2, 3, 4] as DayIndex[]) {
      const s = SPECIAL_SESSIONS.find((x) => x.week === 12 && x.day === day)!.blueprint;
      const lourds = s.slots.filter((slot) => slot.liftId && slot.liftId !== 'speed-squat');
      expect(lourds.map((l) => l.exId), `S12 ${DAY_LABELS[day]}`).toEqual([]);
    }
  });

  it('le combine intermédiaire ne contient aucun test de 1RM (§12)', () => {
    for (const s of SPECIAL_SESSIONS.filter((x) => x.week === 8)) {
      const has1RM = s.blueprint.slots.some((slot) => slot.exId.endsWith('-1rm'));
      expect(has1RM, `S8 ${DAY_LABELS[s.day]}`).toBe(false);
    }
  });

  it('les paliers de montée de charge sont croissants', () => {
    for (const [lift, ramp] of Object.entries(RAMPS)) {
      for (let i = 1; i < ramp.length; i++) {
        expect(ramp[i]!.kg, `${lift} palier ${i}`).toBeGreaterThan(ramp[i - 1]!.kg);
      }
    }
  });
});

describe('périodisation §2', () => {
  it('chaque semaine 0-12 a un bloc', () => {
    for (let w = 0; w <= 12; w++) {
      const block = WEEK_BLOCKS[w as keyof typeof WEEK_BLOCKS];
      expect(block, `semaine ${w}`).toBeDefined();
      expect(BLOCKS[block]).toBeDefined();
    }
  });

  it('les blocs suivent le tableau §2', () => {
    expect(Object.values(WEEK_BLOCKS)).toEqual([
      'test',
      'accumulation',
      'accumulation',
      'accumulation',
      'deload',
      'maxforce',
      'maxforce',
      'maxforce',
      'deload',
      'power',
      'power',
      'power',
      'taper',
    ]);
  });

  it('la semaine 1 ne compte que 4 séances : elle démarre le mercredi', () => {
    expect(WEEK_DAYS[1]).toEqual([1, 2, 3, 4]);
    expect(SPECIAL_SESSIONS.find((s) => s.week === 1)).toBeUndefined();
  });

  it('la semaine 0 groupe les trois jours du combine initial', () => {
    expect(WEEK_DAYS[0]).toEqual([3, 4, 0]);
    const lundi = SPECIAL_SESSIONS.find((s) => s.week === 0 && s.day === 0);
    expect(lundi?.blueprint.title).toBe('Combine initial — jour 3');
  });
});

describe('échauffements §6', () => {
  it('sont cochables et sans id dupliqué', () => {
    const ids = [...WARMUPS.lower.items, ...WARMUPS.upper.items].map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(WARMUPS.lower.items.length).toBe(7);
    expect(WARMUPS.upper.items.length).toBe(6);
  });
});
