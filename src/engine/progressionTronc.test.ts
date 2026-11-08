/**
 * §11 cas 9 — le tronc progresse par le LEVIER, et le programme le prouve.
 *
 * ── Le défaut corrigé ici ──────────────────────────────────────────────────
 *
 * L'Ab Wheel sortait 3 × 8 au poids du corps en semaine 1, et 3 × 8 au poids
 * du corps en semaine 11. Douze semaines, zéro progression. Le Pallof, le
 * Dead Bug et le Woodchop faisaient pire : ils BAISSAIENT en volume au fil
 * des blocs, sans qu'aucune ligne n'explique pourquoi.
 *
 * La cause n'était pas une erreur de saisie, c'était un trou dans la règle :
 * les huit cas du §11 sont écrits en kilos (« +5 kg bas du corps »), et aucun
 * ne s'applique à un mouvement au poids du corps. Faute de règle, rien ne
 * bougeait.
 *
 * ── Ce que ce fichier verrouille, et pourquoi ici ──────────────────────────
 *
 * L'empreinte ne capture PAS les notes de prescription : elle compare les
 * séries, le travail, la charge, le repos et le RPE. Toute la progression du
 * cas 9 passant par la consigne, elle lui est invisible. Sans ce fichier,
 * quelqu'un pourrait vider les trois consignes de levier et l'empreinte
 * resterait verte.
 *
 * On vérifie donc deux choses que personne d'autre ne vérifie :
 *   1. la consigne CHANGE d'un bloc à l'autre — sinon il n'y a pas de
 *      progression, juste trois fois le même texte ;
 *   2. le volume NE CHANGE PAS avec elle — c'est tout l'intérêt du levier :
 *      la contrainte monte sans qu'une minute s'ajoute à la séance.
 */

import { describe, expect, it } from 'vitest';
import { getSession } from './getSession';
import { EMPTY_CONTEXT, type SessionContext } from './types';
import { EXERCISES } from '../data/exercises';
import type { DayIndex, WeekIndex } from '../data/types';

const ctx: SessionContext = {
  ...EMPTY_CONTEXT,
  settings: {
    startDate: '2026-01-03',
    broadJumpBaselineCm: 240,
    tableauOrigine: false,
    oneRM: { 'back-squat': 110, 'bench-press': 115, deadlift: 140, 'weighted-pullup': 45 },
  },
};

function trouve(week: number, day: number, id: string) {
  const s = getSession(week as WeekIndex, day as DayIndex, ctx);
  const ex = (s?.exercises ?? []).find((e) => e.id === id);
  if (!ex) throw new Error(`${id} absent de S${week} j${day}`);
  return ex;
}

/** La consigne affichée sous l'exercice, consignes de séance comprises. */
function consigne(week: number, day: number, id: string): string {
  return trouve(week, day, id).notes.join(' ');
}

/**
 * Une semaine par bloc, hors deload : le deload réécrit les volumes, il
 * dirait autre chose que ce qu'on mesure ici.
 */
const ACCUMULATION = 2;
const FORCE_MAX = 6;
const PUISSANCE = 10;

describe('§11 cas 9 — la progression du tronc est écrite, bloc par bloc', () => {
  /*
   * jour, identifiant, et le mot qui doit apparaître dans la consigne de
   * chaque bloc. On teste un MOT-CLÉ et pas la phrase entière : reformuler
   * une consigne est légitime, perdre le cran de levier ne l'est pas.
   */
  const ECHELLE = [
    {
      id: 'ab-wheel',
      jour: 0,
      crans: [/à genoux/i, /amplitude compl/i, /(pieds surélevés|départ debout)/i],
    },
    {
      id: 'hanging-leg-raise',
      jour: 6,
      crans: [/genoux à la poitrine/i, /jambes tendues/i, /(barre|jambes tendues)/i],
    },
    {
      id: 'copenhagen-plank',
      jour: 4,
      crans: [/genou.*fléchi/i, /tendue/i, /tendue/i],
    },
  ] as const;

  it('chaque exercice au poids du corps porte une consigne à chaque bloc', () => {
    for (const { id, jour, crans } of ECHELLE) {
      const blocs = [ACCUMULATION, FORCE_MAX, PUISSANCE];
      blocs.forEach((w, i) => {
        const txt = consigne(w, jour, id);
        expect(txt.trim(), `${id} S${w} — consigne vide`).not.toBe('');
        expect(txt, `${id} S${w} — cran de levier absent`).toMatch(crans[i]!);
      });
    }
  });

  it('la consigne CHANGE d’un bloc à l’autre — sinon il n’y a pas de progression', () => {
    /*
     * Le cœur du garde-fou. Trois consignes identiques passeraient le test
     * précédent si le mot-clé s'y trouvait par hasard ; elles ne décrivent
     * pourtant aucune progression.
     */
    for (const { id, jour } of ECHELLE) {
      const textes = [ACCUMULATION, FORCE_MAX, PUISSANCE].map((w) => consigne(w, jour, id));
      expect(new Set(textes).size, `${id} — ${textes.length} blocs, mais pas 3 consignes`).toBe(3);
    }
  });

  it('et le VOLUME, lui, ne bouge pas : le levier ne coûte pas une minute', () => {
    /*
     * C'est la contrepartie de la règle « jamais par l'ajout de séries ».
     * Si une progression de levier s'accompagnait d'une série de plus, elle
     * allongerait la séance — exactement ce que le cas 9 interdit.
     *
     * Le Copenhagen est la seule exception, et dans le bon sens : il DESCEND
     * à 5 reps en puissance parce que son levier est long. Une baisse de
     * volume adossée à un levier plus long reste une progression.
     */
    for (const w of [ACCUMULATION, FORCE_MAX, PUISSANCE]) {
      expect(trouve(w, 0, 'ab-wheel').sets, `ab-wheel S${w}`).toBe(3);
      expect(trouve(w, 6, 'hanging-leg-raise').sets, `hanging-leg-raise S${w}`).toBe(3);
      expect(trouve(w, 4, 'copenhagen-plank').sets, `copenhagen-plank S${w}`).toBe(3);
    }
    // Aucune série ajoutée nulle part : c'est l'interdiction explicite du §11.
    expect(trouve(PUISSANCE, 0, 'ab-wheel').sets).toBe(trouve(ACCUMULATION, 0, 'ab-wheel').sets);
  });

  it('le Copenhagen ne saute jamais le levier court — c’est lui qui avait fait mal', () => {
    /*
     * §14 : ce mouvement a été suspendu pour douleur, puis repris. Il entre
     * genou fléchi, et la jambe tendue n'arrive qu'au bloc suivant, sous
     * condition. Une reprise directe en levier long serait exactement la
     * faute que la suspension devait éviter.
     */
    for (const w of [1, 2, 3, 4]) {
      expect(consigne(w, 4, 'copenhagen-plank'), `S${w}`).toMatch(/genou.*fléchi/i);
    }
    // Et le passage au levier long reste conditionnel, jamais automatique.
    expect(consigne(FORCE_MAX, 4, 'copenhagen-plank')).toMatch(/si les .* sans douleur|sinon/i);
    expect(EXERCISES['copenhagen-plank']!.cues?.join(' ')).toMatch(/gêne/i);
  });

  it('le Hanging Leg Raise passe de 12 à 8 reps, et la consigne dit pourquoi', () => {
    /*
     * Lu seul, « 3 × 8-12 » puis « 3 × 8 » ressemble à une régression. C'est
     * le levier qui a changé. Le programme doit le DIRE, sinon il a l'air de
     * se contredire — et c'est ce qu'il faisait avant le cas 9.
     */
    expect(trouve(ACCUMULATION, 6, 'hanging-leg-raise').loadLine).toContain('8-12');
    expect(trouve(FORCE_MAX, 6, 'hanging-leg-raise').loadLine).toContain('8');
    expect(consigne(FORCE_MAX, 6, 'hanging-leg-raise')).toMatch(/levier/i);
  });
});
