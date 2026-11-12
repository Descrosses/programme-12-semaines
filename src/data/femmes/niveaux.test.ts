/**
 * Les trois niveaux — la grille validée par Guillaume, verrouillée.
 *
 * ── Ce que ces tests défendent ─────────────────────────────────────────────
 *
 * Un niveau est un jeu de paramètres, pas une copie du programme. Le risque
 * n'est donc pas qu'un chiffre soit faux : c'est que les niveaux se mettent
 * à diverger d'eux-mêmes — un exercice qui disparaît pour tout le monde, un
 * pattern fondamental retiré « parce que c'était le dernier de la liste »,
 * ou une débutante qui se retrouve avec plus de volume qu'une confirmée.
 *
 * On vérifie donc trois choses, dans cet ordre d'importance :
 *   1. les trois niveaux font le MÊME programme — mêmes mouvements de base ;
 *   2. le volume est strictement croissant d'un niveau au suivant ;
 *   3. les chiffres sont exactement ceux de la grille validée.
 */

import { describe, expect, it } from 'vitest';
import { NIVEAUX, NIVEAU_DEFS, NIVEAU_PAR_DEFAUT, niveauDef, type Niveau } from './niveaux';
import { PHASES, phaseOf } from './phases';
import { WEEKS, type PhaseId } from './types';
import { getSession } from '../../engine/femmes/getSession';
import { EMPTY_CONTEXT } from '../../engine/femmes/types';

const PHASE_IDS: PhaseId[] = [1, 2, 3];

/** Une séance résolue, pour un niveau et une semaine donnés. */
function seance(niveau: Niveau, week: (typeof WEEKS)[number]) {
  return getSession(week, 0, 'maison', EMPTY_CONTEXT, niveau);
}

describe('la grille des niveaux', () => {
  it('compte trois niveaux, et l’intermédiaire est le défaut', () => {
    expect(NIVEAUX).toEqual(['debutante', 'intermediaire', 'confirmee']);
    expect(NIVEAU_PAR_DEFAUT).toBe('intermediaire');
  });

  it('l’intermédiaire est la base INCHANGÉE — ni retrait, ni tour forcé', () => {
    /*
     * C'est ce qui rend les deux autres niveaux lisibles : ils se comparent
     * à un programme qui existe vraiment. Si l'intermédiaire se mettait à
     * retirer ou forcer quelque chose, « la base » ne voudrait plus rien
     * dire et la grille deviendrait trois programmes déguisés.
     */
    const def = niveauDef('intermediaire');
    for (const p of PHASE_IDS) {
      expect(def.retire[p], `phase ${p}`).toBeNull();
      expect(def.tours[p], `phase ${p}`).toBeNull();
    }
  });

  it('porte exactement les chiffres validés le 12 novembre', () => {
    expect(NIVEAU_DEFS.debutante.tours).toEqual({ 1: 2, 2: 3, 3: 3 });
    expect(NIVEAU_DEFS.confirmee.tours).toEqual({ 1: 4, 2: 4, 3: 5 });
    expect(NIVEAU_DEFS.debutante.retire).toEqual({
      1: 'p1-core',
      2: 'p2-fessier',
      3: 'p3-dos',
    });
  });

  it('chaque niveau porte une intention, et les trois diffèrent', () => {
    const intentions = NIVEAUX.map((n) => niveauDef(n).intention);
    expect(new Set(intentions).size, 'deux niveaux partagent la même intention').toBe(3);
    for (const i of intentions) expect(i.trim().length).toBeGreaterThan(30);
  });

  it('toute ligne retirée existe vraiment dans sa phase', () => {
    /*
     * Le piège du portage : un `slotId` mal recopié retirerait… rien du
     * tout, en silence, et la débutante ferait le circuit complet.
     */
    for (const n of NIVEAUX) {
      for (const p of PHASE_IDS) {
        const slotId = niveauDef(n).retire[p];
        if (slotId === null) continue;
        const existe = PHASES[p].circuit.some((s) => s.slotId === slotId);
        expect(existe, `${n} phase ${p} : « ${slotId} » n'est pas au circuit`).toBe(true);
      }
    }
  });
});

describe('ce que le niveau change dans la séance', () => {
  it('le nombre d’exercices suit la grille, phase par phase', () => {
    // Phase 1 : 5 au circuit. Phases 2 et 3 : 6.
    expect(seance('debutante', 1).slots.length).toBe(4);
    expect(seance('intermediaire', 1).slots.length).toBe(5);
    expect(seance('confirmee', 1).slots.length).toBe(5);

    expect(seance('debutante', 4).slots.length).toBe(5);
    expect(seance('intermediaire', 4).slots.length).toBe(6);

    expect(seance('debutante', 7).slots.length).toBe(5);
    expect(seance('confirmee', 7).slots.length).toBe(6);
  });

  it('le nombre de tours suit la grille', () => {
    expect(seance('debutante', 1).tours).toBe(2);
    expect(seance('confirmee', 1).tours).toBe(4);
    expect(seance('debutante', 7).tours).toBe(3);
    expect(seance('confirmee', 7).tours).toBe(5);
  });

  it('l’intermédiaire garde la rampe d’origine en phase 2', () => {
    /*
     * La phase 2 est le seul intervalle du programme : 3 tours puis 4, au
     * fil des semaines. Les deux autres niveaux la figent ; l'intermédiaire
     * doit la laisser monter, sinon on perd la progression interne à la
     * phase.
     */
    const s3 = seance('intermediaire', 3).tours;
    const s5 = seance('intermediaire', 5).tours;
    expect(s3).toBeGreaterThanOrEqual(3);
    expect(s5).toBeGreaterThanOrEqual(s3);
    expect(s5).toBeLessThanOrEqual(4);
  });

  it('l’intention du niveau ouvre les notes de séance', () => {
    for (const n of NIVEAUX) {
      expect(seance(n, 2).notes[0]).toBe(niveauDef(n).intention);
    }
  });

  it('la séance dit de quel niveau elle vient', () => {
    for (const n of NIVEAUX) expect(seance(n, 6).niveau).toBe(n);
  });
});

describe('les invariants, qui comptent plus que les chiffres', () => {
  it('les trois niveaux font le MÊME programme : aucun pattern perdu', () => {
    /*
     * L'invariant central. Retirer une ligne est acceptable tant qu'on
     * retire du tronc ou de l'extension ; retirer un squat, une charnière,
     * une fente ou un tirage ferait un AUTRE programme, et la débutante ne
     * progresserait plus vers le même endroit.
     */
    const FONDAMENTAUX = ['squat', 'hinge', 'fente', 'tirage'];
    for (const n of NIVEAUX) {
      for (const w of WEEKS) {
        const ids = seance(n, w).slots.map((s) => s.slotId);
        for (const pattern of FONDAMENTAUX) {
          const present = ids.some((id) => id.includes(pattern));
          // La phase 1 n'a pas de charnière dédiée : le pont fessier la joue.
          if (pattern === 'hinge' && phaseOf(w).id === 1) continue;
          expect(present, `${n} S${w} : plus de ${pattern}`).toBe(true);
        }
      }
    }
  });

  const volume = (n: Niveau, w: (typeof WEEKS)[number]) => {
    const s = seance(n, w);
    return s.tours * s.slots.length;
  };

  it('le volume ne DÉCROÎT jamais d’un niveau au suivant', () => {
    /*
     * Volume = tours × exercices. Si une débutante se retrouvait au-dessus
     * d'une intermédiaire, le choix de niveau deviendrait un piège : on
     * croirait alléger et on chargerait.
     */
    for (const w of WEEKS) {
      expect(volume('debutante', w), `S${w} débutante > intermédiaire`).toBeLessThan(
        volume('intermediaire', w),
      );
      expect(volume('intermediaire', w), `S${w} intermédiaire > confirmée`).toBeLessThanOrEqual(
        volume('confirmee', w),
      );
    }
  });

  it('en fin de phase 2, confirmée rejoint intermédiaire — ASSUMÉ, pas un oubli', () => {
    /*
     * Ce test fige une DÉCISION, il ne signale plus un défaut.
     *
     * Les faits : la grille donne 4 tours fixes à la confirmée en phase 2,
     * tandis que l'intermédiaire y monte de 3 à 4 au fil des semaines. En
     * semaine 5, les deux arrivent donc à 4 tours sur le même circuit, et la
     * séance est RIGOUREUSEMENT IDENTIQUE — le niveau n'y change plus rien.
     *
     * Ce comportement a été montré à Guillaume, chiffres à l'appui, avec le
     * correctif qui tenait en un chiffre (confirmée phase 2 à 5 tours, comme
     * sa phase 3). Il a tranché le 12 novembre : ON RESTE SUR 4 TOURS.
     *
     * Ce n'est donc PAS à corriger. Une phase 2 qui converge n'est pas une
     * anomalie si on considère que la phase 2 est une phase de construction
     * commune, et que c'est la phase 3 qui sépare les niveaux — ce qu'elle
     * fait bien : 3, 4 et 5 tours.
     *
     * Le test reste parce qu'un chiffre changé par mégarde le ferait tomber,
     * et qu'on relirait alors cette décision au lieu de la deviner.
     */
    const s5i = seance('intermediaire', 5);
    const s5c = seance('confirmee', 5);
    expect(s5i.tours).toBe(s5c.tours);
    expect(s5i.slots.length).toBe(s5c.slots.length);
    expect(volume('intermediaire', 5)).toBe(volume('confirmee', 5));

    // Et la phase 3, elle, sépare bien les trois niveaux.
    expect(volume('debutante', 7)).toBeLessThan(volume('intermediaire', 7));
    expect(volume('intermediaire', 7)).toBeLessThan(volume('confirmee', 7));
  });

  it('aucun niveau ne touche aux répétitions ni aux exercices eux-mêmes', () => {
    /*
     * Les trois leviers sont le nombre d'exercices, le nombre de tours et
     * l'intention. Pas les répétitions, pas les charges, pas les mouvements.
     * Ce test compare ligne à ligne ce que les trois niveaux ont en commun.
     */
    for (const w of WEEKS) {
      const ref = new Map(seance('intermediaire', w).slots.map((s) => [s.slotId, s]));
      for (const n of ['debutante', 'confirmee'] as Niveau[]) {
        for (const slot of seance(n, w).slots) {
          const attendu = ref.get(slot.slotId);
          expect(attendu, `${n} S${w} : ${slot.slotId} absent de la base`).toBeDefined();
          expect(slot.exercise.id, `${n} S${w} ${slot.slotId}`).toBe(attendu!.exercise.id);
          expect(slot.work, `${n} S${w} ${slot.slotId}`).toEqual(attendu!.work);
          expect(slot.load, `${n} S${w} ${slot.slotId}`).toEqual(attendu!.load);
        }
      }
    }
  });
});
