/**
 * Hang High Pull — ajouté au vendredi (Total Body Power).
 *
 * Trois choses à tenir, et une à ne pas faire :
 *   - il est là toutes les semaines sauf la 12, réservée aux tests du combine ;
 *   - son volume suit les règles de bloc du §8 comme les autres explosifs, sans
 *     règle écrite à part — c'est le rôle `power` qui s'en charge ;
 *   - la règle d'arrêt du §5 s'injecte seule dans ses consignes, par le flag
 *     `explosive`, et n'est jamais recopiée à la main.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { EXERCISES } from './exercises';
import { WEEK_DAYS } from './program';
import { getSession, hasSession } from '../engine/getSession';
import { EMPTY_CONTEXT, type SessionContext } from '../engine/types';
import type { WeekIndex } from './types';

const ID = 'hang-high-pull';
const VENDREDI = 4;

const CTX: SessionContext = {
  ...EMPTY_CONTEXT,
  settings: { ...EMPTY_CONTEXT.settings, startDate: '2026-09-14' },
};

const vendredi = (week: WeekIndex) => getSession(week, VENDREDI, CTX);
const hhp = (week: WeekIndex) => vendredi(week)?.exercises.find((e) => e.id === ID) ?? null;

describe('la fiche exercice', () => {
  const def = EXERCISES[ID];

  it('existe, avec un identifiant au format du catalogue', () => {
    expect(def).toBeDefined();
    // Tiret-minuscule comme les 40 autres : c'est la clé de l'historique.
    expect(ID).toMatch(/^[a-z]+(-[a-z]+)*$/);
  });

  it('est un mouvement explosif de chaîne postérieure', () => {
    expect(def!.fn).toBe('hinge');
    // `power` est ce qui déclenche la règle de deload des explosifs (§8).
    expect(def!.role).toBe('power');
    expect(def!.explosive).toBe(true);
  });

  it('dit la vitesse avant la charge, et nomme les deux erreurs', () => {
    expect(def!.intent).toContain('Priorité à la vitesse, jamais à la charge');
    const consignes = (def!.cues ?? []).join(' ');
    expect(consignes).toContain('tirer avec les bras avant l’extension complète des hanches');
    expect(consignes).toContain('s’éloigne du corps');
  });

  it('précise qu’aucune alternative Basic-Fit n’est nécessaire', () => {
    expect(def!.altBasicFit).toContain('Aucune nécessaire');
  });

  it('n’est pas un hang clean, et le dit', () => {
    // Choix déjà tranché par Guillaume : pas de réception en front rack.
    expect((def!.cues ?? []).join(' ')).toContain('Ce n’est pas un hang clean');
  });

  it('interdit explicitement d’enchaîner les reps', () => {
    /*
     * La règle §5 le dit déjà en général. Ici on le dit pour ce mouvement-là,
     * avec ce que « reset » veut dire une barre à la main : une série
     * ballistique enchaînée dégrade les dernières reps, ce qui est exactement
     * ce que l'exercice cherche à éviter.
     */
    const consignes = (def!.cues ?? []).join(' ');
    expect(consignes).toContain('barre reposée ou position réinitialisée');
    expect(consignes).toContain('jamais enchaîné en continu');
  });
});

describe('la règle d’arrêt du §5 s’injecte toute seule', () => {
  const def = EXERCISES[ID]!;

  it('la règle est présente dans ses consignes', () => {
    const consignes = (def.cues ?? []).join(' ');
    expect(consignes).toContain('Chaque répétition est une tentative de performance');
    expect(consignes).toContain('Reset complet 5-10 s entre les reps');
    expect(consignes).toContain('même s’il reste des séries écrites');
  });

  it('elle est le MÊME texte que sur Box Jump et Push Press', () => {
    /*
     * Le vrai test : si quelqu'un la recopiait à la main sur le Hang High Pull,
     * corriger la règle une fois au §5 ne corrigerait plus que les autres. On
     * compare donc la dernière consigne de chacun, celle que `def()` ajoute.
     */
    const derniere = (id: string) => EXERCISES[id]!.cues!.at(-1);
    expect(derniere(ID)).toBe(derniere('box-jump'));
    expect(derniere(ID)).toBe(derniere('pogo-jumps'));
  });

  it('elle apparaît dans la séance résolue, pas seulement dans le catalogue', () => {
    const ex = hhp(1)!;
    expect(ex.def.cues?.join(' ')).toContain('Reset complet 5-10 s entre les reps');
  });
});

describe('sa place dans la séance du vendredi', () => {
  it('vient immédiatement après le Broad Jump, avant le Lateral Bound', () => {
    /*
     * Le Broad Jump reste premier : il sert aussi de test de readiness, et sa
     * mesure n'a de sens qu'à froid. Le Hang High Pull passe juste derrière
     * parce que c'est le mouvement chargé et technique du bloc, celui qui
     * demande le plus de fraîcheur nerveuse.
     */
    const ids = vendredi(1)!.exercises.map((e) => e.id);
    expect(ids.slice(0, 4)).toEqual(['broad-jump', ID, 'lateral-bound', 'push-press']);
  });

  it('reste deuxième dans le bloc puissance, devant les pogos ajoutés', () => {
    for (const w of [9, 10, 11]) {
      const ids = vendredi(w as WeekIndex)!.exercises.map((e) => e.id);
      expect(ids.slice(0, 4), `S${w}`).toEqual([
        'broad-jump',
        ID,
        'pogo-jumps',
        'lateral-bound',
      ]);
    }
  });

  it('n’apparaît QUE le vendredi', () => {
    for (let w = 0; w <= 12; w++) {
      const week = w as WeekIndex;
      for (const day of WEEK_DAYS[week]) {
        if (!hasSession(week, day) || day === VENDREDI) continue;
        const ids = getSession(week, day, CTX)?.exercises.map((e) => e.id) ?? [];
        expect(ids, `S${week} jour ${day}`).not.toContain(ID);
      }
    }
  });
});

describe('le volume suit les blocs du §8', () => {
  it('semaines 1-3 — accumulation : 3 × 3, repos 90 s, 40 kg', () => {
    for (const w of [1, 2, 3] as WeekIndex[]) {
      const ex = hhp(w)!;
      expect(ex.sets, `S${w}`).toBe(3);
      expect(ex.work.kind, `S${w}`).toBe('reps');
      expect((ex.work as { reps: number }).reps, `S${w}`).toBe(3);
      expect(ex.restSec, `S${w}`).toBe(90);
      expect(ex.load.kg, `S${w}`).toBe(40);
    }
  });

  it('semaines 5-7 — force maximale : 4 × 3, repos 2 min', () => {
    for (const w of [5, 6, 7] as WeekIndex[]) {
      expect(hhp(w)!.sets, `S${w}`).toBe(4);
      expect(hhp(w)!.restSec, `S${w}`).toBe(120);
    }
  });

  it('semaines 9-11 — puissance : 4 × 3 maintenu, la vitesse prime', () => {
    for (const w of [9, 10, 11] as WeekIndex[]) {
      const ex = hhp(w)!;
      expect(ex.sets, `S${w}`).toBe(4);
      expect((ex.work as { reps: number }).reps, `S${w}`).toBe(3);
      expect(ex.notes.join(' '), `S${w}`).toContain('Vitesse de barre');
    }
  });

  it('semaines 4 et 8 — deload : volume divisé par 2, sans règle écrite à part', () => {
    /*
     * Rien dans `blockRules.ts` ne nomme cet exercice pour le deload. C'est le
     * rôle `power` qui applique « sauts : volume divisé par 2, intention
     * maximale conservée » (§8) — la même réduction que Broad Jump et Lateral
     * Bound le même jour.
     */
    for (const w of [4, 8] as WeekIndex[]) {
      const ex = hhp(w)!;
      expect(ex.sets, `S${w}`).toBe(2);
      // Les reps ne bougent pas : c'est le VOLUME qui est divisé, pas l'effort.
      expect((ex.work as { reps: number }).reps, `S${w}`).toBe(3);
      expect(
        ex.adjustments.map((a) => a.why).join(' '),
        `S${w}`,
      ).toContain('volume de sauts divisé par 2');
    }
  });

  it('la réduction de deload est la même que celle des autres explosifs du jour', () => {
    for (const w of [4, 8] as WeekIndex[]) {
      const s = vendredi(w)!;
      const reduit = (id: string) => s.exercises.find((e) => e.id === id)?.sets;
      // Broad Jump 5 × 2 → 3 séries, Lateral Bound 3 → 2, Hang High Pull 3 → 2.
      expect(reduit('broad-jump'), `S${w} broad jump`).toBe(3);
      expect(reduit('lateral-bound'), `S${w} lateral bound`).toBe(2);
      expect(reduit(ID), `S${w} hang high pull`).toBe(2);
    }
  });
});

describe('semaine 12 — absent, le vendredi est réservé aux tests', () => {
  it('ne figure pas dans la séance du vendredi de la semaine 12', () => {
    const ids = vendredi(12)!.exercises.map((e) => e.id);
    expect(ids).not.toContain(ID);
  });

  it('ce vendredi-là garde exactement ce que le .md lui donne', () => {
    /*
     * La semaine 12 ne dérive pas de la trame du §7 : elle la REMPLACE. Rien
     * n'y est donc ajouté par construction — mais il faut le vérifier, parce
     * que c'est précisément la garantie que Guillaume a demandée.
     *
     * Le speed squat léger de fin de séance est voulu, il est écrit dans les
     * notes de la séance : « tests d'abord, puis le speed squat léger ».
     */
    expect(vendredi(12)!.exercises.map((e) => e.id)).toEqual([
      'test-broad-jump',
      'test-vertical-jump',
      'test-sprint-10m',
      'test-sprint-20m',
      'test-strict-pullup-max',
      'test-leg-raise-max',
      'speed-squat',
    ]);
  });
});

describe('la charge est autonome — aucun 1RM d’un autre mouvement', () => {
  it('part de 40 kg tant que rien n’a été soulevé', () => {
    expect(hhp(1)!.load.kg).toBe(40);
    expect(hhp(1)!.load.source).toBe('programme');
  });

  it('ne bouge pas quand les 1RM des Réglages changent', () => {
    // Le piège que le programme a déjà connu : indexer une charge sur le 1RM
    // d'un autre mouvement. Ici il n'y a rien à indexer.
    const avec = (oneRM: Record<string, number>) =>
      getSession(1, VENDREDI, {
        ...CTX,
        settings: { ...CTX.settings, oneRM },
      })!.exercises.find((e) => e.id === ID)!.load.kg;
    expect(avec({ 'back-squat': 110, deadlift: 140 })).toBe(40);
    expect(avec({ 'back-squat': 220, deadlift: 260 })).toBe(40);
    expect(avec({})).toBe(40);
  });

  it('reprend ensuite la charge réellement soulevée', () => {
    const ctx: SessionContext = {
      ...CTX,
      history: {
        [ID]: [
          {
            exerciseId: ID,
            week: 1,
            kg: 45,
            plannedKg: 40,
            rpe: null,
            targetRPE: null,
            failed: false,
            completed: true,
          },
        ],
      },
    };
    const ex = getSession(2, VENDREDI, ctx)!.exercises.find((e) => e.id === ID)!;
    expect(ex.load.kg).toBe(45);
    expect(ex.load.source).toBe('historique');
  });
});

describe('le .md reste la source de vérité', () => {
  const md = readFileSync(new URL('../../programme-final-12-semaines.md', import.meta.url), 'utf8');

  it('le §7 décrit le mouvement au vendredi, avec sa charge de départ', () => {
    expect(md).toContain('**B. Hang High Pull — 3 × 3 × 40 kg** — Repos 90 s');
    // Il est bien en B, donc juste après le Broad Jump resté en A.
    expect(md.indexOf('**B. Hang High Pull')).toBeGreaterThan(md.indexOf('**A. Broad Jump'));
    expect(md.indexOf('**B. Hang High Pull')).toBeLessThan(md.indexOf('**C. Lateral Bound'));
  });

  it('la consigne de reset est écrite dans le §7', () => {
    expect(md).toContain('jamais enchaîné en continu');
  });

  it('le §8 écrit les deux modifications de bloc', () => {
    expect(md).toContain('Hang High Pull 4 × 3, repos 2 min');
    expect(md).toContain('Hang High Pull 4 × 3 (2 min, vitesse de barre');
  });

  it('la règle de progression du code est celle du .md', () => {
    const regle = EXERCISES[ID]!.progressionRule!;
    expect(md).toContain(regle.replace(/\.$/, ''));
  });

  it('le §8 semaine 12 ne le mentionne nulle part', () => {
    const s12 = md.slice(md.indexOf('### Semaine 12 — Taper + tests'));
    expect(s12.slice(0, s12.indexOf('## 9.'))).not.toContain('Hang High Pull');
  });
});
