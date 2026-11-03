/**
 * MASS 4 contre son document.
 *
 * Même règle que pour POWER 12 : le document fait foi, et une valeur qui n'y
 * figure pas n'existe pas dans l'application. Ces tests transcrivent les
 * affirmations du document et vérifient que le code les tient — pas l'inverse.
 *
 * Source : `MODELE_4_SEMAINES_MASSE_CONGESTION.md`, dépôt
 * Descrosses/Programme-Teddy-, version anonymisée du 27/10/2026.
 */

import { describe, expect, it } from 'vitest';
import { EXERCICES_MASS4, TECHNIQUES, TOUS_LES_EXERCICES_MASS4 } from './exercices';
import {
  CONDITIONS_SERIE_OPTIONNELLE,
  SEANCE_ALLEGEE,
  modePour,
  proposeSerieOptionnelle,
  repsAffichees,
  seriesPour,
} from './progression';
import { EMPTY_CONTEXT } from '../../engine/types';
import { MASS4 } from './module';
import { SEANCES_MASS4, seancePour } from './seances';
import { travailPour } from './travail';
import { JOURS_MASS4, SEMAINES_MASS4 } from './types';

describe('MASS 4 — structure', () => {
  it('tient en quatre semaines, sans semaine 0', () => {
    // Pas de combine initial : le document n'en prévoit aucun.
    expect(SEMAINES_MASS4).toEqual([1, 2, 3, 4]);
  });

  it('se fait le lundi, le mardi, le jeudi et le samedi', () => {
    expect(JOURS_MASS4).toEqual([0, 1, 3, 5]);
    expect(SEANCES_MASS4.map((s) => s.jour)).toEqual([0, 1, 3, 5]);
  });

  it('propose la même séance chaque semaine', () => {
    /*
     * « Principe : la même séance chaque semaine, de la semaine 1 à la
     * semaine 4. » Il n'y a donc qu'une définition par jour, et rien qui
     * dépende de la semaine dans ce fichier.
     */
    for (const jour of JOURS_MASS4) {
      expect(seancePour(jour)).not.toBeNull();
    }
    expect(seancePour(2)).toBeNull();
    expect(seancePour(6)).toBeNull();
  });

  it('porte les quatre titres du document', () => {
    expect(SEANCES_MASS4.map((s) => s.titre)).toEqual([
      'Épaules, triceps, biceps',
      'Dos',
      'Pecs, biceps',
      'Jambes, triceps',
    ]);
  });
});

describe('MASS 4 — exercices', () => {
  it('ne cite aucun mouvement absent du catalogue', () => {
    const inconnus = SEANCES_MASS4.flatMap((s) =>
      s.lignes.map((l) => l.exerciceId).filter((id) => EXERCICES_MASS4[id] === undefined),
    );
    expect(inconnus).toEqual([]);
  });

  it('n’a aucun mouvement en double dans le catalogue', () => {
    const ids = TOUS_LES_EXERCICES_MASS4.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('n’invente de consigne pour personne', () => {
    /*
     * Quatre mouvements n'ont qu'un nom dans le document. Leur attribuer une
     * consigne reviendrait à parler à la place du programme.
     */
    const sansConsigne = TOUS_LES_EXERCICES_MASS4.filter((e) => e.consigne === undefined).map(
      (e) => e.id,
    );
    expect(sansConsigne.sort()).toEqual([
      'curl-machine',
      'oiseau-banc-halteres',
      'pull-over-poulie',
      'roman-side-bench',
    ]);
  });

  it('décrit chaque technique d’intensité utilisée', () => {
    const utilisees = new Set(SEANCES_MASS4.flatMap((s) => s.lignes.map((l) => l.technique)));
    for (const t of utilisees) {
      expect({ technique: t, decrite: typeof TECHNIQUES[t] === 'string' }).toEqual({
        technique: t,
        decrite: true,
      });
    }
  });
});

describe('MASS 4 — supersets', () => {
  it('en compte un par séance, et un seul', () => {
    for (const seance of SEANCES_MASS4) {
      const duos = new Set(
        seance.lignes.filter((l) => l.superset !== undefined).map((l) => l.superset),
      );
      expect({ jour: seance.jour, duos: duos.size }).toEqual({ jour: seance.jour, duos: 1 });
    }
  });

  it('enchaîne exactement deux mouvements, le repos après le duo', () => {
    for (const seance of SEANCES_MASS4) {
      const duo = seance.lignes.filter((l) => l.superset !== undefined);
      expect(duo).toHaveLength(2);
      // Le premier n'a pas de repos : on enchaîne. Le second le porte.
      expect(duo[0]?.reposSec).toBeNull();
      expect(typeof duo[1]?.reposSec).toBe('number');
    }
  });
});

describe('MASS 4 — progression par le volume', () => {
  it('ne propose aucune série optionnelle en semaine 1', () => {
    // « Semaine 1, calibration : trouver ses charges de travail. »
    for (const seance of SEANCES_MASS4) {
      for (const ligne of seance.lignes) {
        expect(proposeSerieOptionnelle(ligne, 1)).toBe(false);
        expect(seriesPour(ligne, 1, true)).toBe(ligne.series);
      }
    }
  });

  it('la propose sur les cinq mouvements nommés, des semaines 2 à 4', () => {
    const attendus = [
      'developpe-couche-halteres',
      'developpe-incline-smith',
      'developpe-militaire-smith',
      'elevations-laterales',
      'squat-smith',
    ];
    for (const semaine of [2, 3, 4]) {
      const avec = SEANCES_MASS4.flatMap((s) =>
        s.lignes.filter((l) => proposeSerieOptionnelle(l, semaine)).map((l) => l.exerciceId),
      );
      expect({ semaine, avec: [...new Set(avec)].sort() }).toEqual({ semaine, avec: attendus });
    }
  });

  it('n’ajoute la série que si la personne dit oui', () => {
    const squat = seancePour(5)?.lignes.find((l) => l.exerciceId === 'squat-smith');
    expect(squat).toBeDefined();
    if (!squat) return;
    expect(seriesPour(squat, 3, false)).toBe(3);
    expect(seriesPour(squat, 3, true)).toBe(4);
  });

  it('pose les deux conditions du document, sans en inventer une troisième', () => {
    expect(CONDITIONS_SERIE_OPTIONNELLE).toHaveLength(2);
    expect(CONDITIONS_SERIE_OPTIONNELLE[0]).toContain('60 min');
    expect(CONDITIONS_SERIE_OPTIONNELLE[1]).toContain('courbatures');
  });

  it('garde la séance allégée à deux séries et quatre reps en réserve', () => {
    expect(SEANCE_ALLEGEE.seriesMax).toBe(2);
    expect(SEANCE_ALLEGEE.repsEnReserve).toBe(4);
  });
});

describe('MASS 4 — alternance unilatéral / bilatéral', () => {
  const jambes = seancePour(5);
  const legExtension = jambes?.lignes.find((l) => l.exerciceId === 'leg-extension');
  const legCurl = jambes?.lignes.find((l) => l.exerciceId === 'leg-curl-allonge');

  it('fait le leg extension à une jambe en semaines 1 et 3', () => {
    expect(legExtension).toBeDefined();
    if (!legExtension) return;
    expect(modePour(legExtension, 1)).toBe('unilateral');
    expect(modePour(legExtension, 2)).toBe('bilateral');
    expect(modePour(legExtension, 3)).toBe('unilateral');
    expect(modePour(legExtension, 4)).toBe('bilateral');
  });

  it('fait le leg curl à DEUX jambes aux mêmes semaines — l’inverse', () => {
    /*
     * Le piège du document : les deux mouvements alternent en sens opposé.
     * Les intervertir serait invisible en lisant le code, et faux à la salle.
     */
    expect(legCurl).toBeDefined();
    if (!legCurl) return;
    expect(modePour(legCurl, 1)).toBe('bilateral');
    expect(modePour(legCurl, 2)).toBe('unilateral');
    expect(modePour(legCurl, 3)).toBe('bilateral');
    expect(modePour(legCurl, 4)).toBe('unilateral');
  });

  it('n’alterne que ces deux mouvements', () => {
    const alternants = SEANCES_MASS4.flatMap((s) =>
      s.lignes.filter((l) => l.alternance !== undefined).map((l) => l.exerciceId),
    );
    expect(alternants.sort()).toEqual(['leg-curl-allonge', 'leg-extension']);
  });

  it('écrit « / jambe » seulement quand c’est unilatéral', () => {
    expect(legExtension && repsAffichees(legExtension, 1)).toBe('10 / jambe');
    expect(legExtension && repsAffichees(legExtension, 2)).toBe('10');
  });
});

describe('MASS 4 — ce que le programme ne fait PAS', () => {
  it('ne prescrit aucune charge', () => {
    /*
     * « Charges : autorégulées. La personne choisit ses charges et les note,
     * et aucune charge n'est prescrite. » Aucune ligne de séance ne porte de
     * kilos, et ce test échouera si quelqu'un en ajoute.
     */
    const texte = JSON.stringify(SEANCES_MASS4);
    expect(texte).not.toMatch(/"kg"|"charge"|"pct"|"oneRM"/);
  });

  it('n’a aucun bloc de périodisation', () => {
    // La même séance chaque semaine : il n'y a rien à périodiser.
    const texte = JSON.stringify(SEANCES_MASS4);
    expect(texte).not.toMatch(/deload|accumulation|intensification/i);
  });
});

describe('MASS 4 — lecture des répétitions', () => {
  it('reconnaît les formes simples du document', () => {
    expect(travailPour('12')).toEqual({
      kind: 'reps',
      reps: 12,
      perSide: false,
      sideLabel: 'côté',
    });
    expect(travailPour('8-10')).toEqual({
      kind: 'reps',
      reps: { min: 8, max: 10 },
      perSide: false,
      sideLabel: 'côté',
    });
  });

  it('comprend « par bras », « par côté » et « par jambe »', () => {
    expect(travailPour('15 / bras')).toMatchObject({ reps: 15, perSide: true, sideLabel: 'côté' });
    expect(travailPour('8 / jambe')).toMatchObject({ perSide: true, sideLabel: 'jambe' });
    expect(travailPour('30 s / côté')).toEqual({ kind: 'time', seconds: 30, perSide: true });
  });

  it('ne garde que la première partie d’une technique en deux temps', () => {
    // « 6 + 10-12 » : la dégressive est décrite par la technique, pas ici.
    expect(travailPour('6 + 10-12')).toMatchObject({ reps: 6 });
    expect(travailPour('10 + max')).toMatchObject({ reps: 10 });
  });

  it('rend `null` plutôt que d’inventer un chiffre', () => {
    expect(travailPour('au feeling')).toBeNull();
    expect(travailPour('')).toBeNull();
  });

  it('lit toutes les lignes du programme sans en manquer une', () => {
    const illisibles = SEANCES_MASS4.flatMap((s) =>
      s.lignes.filter((l) => travailPour(l.reps) === null).map((l) => l.exerciceId),
    );
    expect(illisibles).toEqual([]);
  });
});

describe('MASS 4 — la séance assemblée', () => {
  it('ne rend rien hors de ses quatre semaines, ni les jours de repos', () => {
    expect(MASS4.getSession(0, 0, EMPTY_CONTEXT)).toBeNull();
    expect(MASS4.getSession(5, 0, EMPTY_CONTEXT)).toBeNull();
    // Mercredi, vendredi, dimanche : repos.
    expect(MASS4.getSession(1, 2, EMPTY_CONTEXT)).toBeNull();
    expect(MASS4.getSession(1, 4, EMPTY_CONTEXT)).toBeNull();
    expect(MASS4.getSession(1, 6, EMPTY_CONTEXT)).toBeNull();
  });

  it('n’annonce aucun bloc de périodisation', () => {
    expect(MASS4.blocDeLaSemaine(1)).toBeNull();
    expect(MASS4.blocDeLaSemaine(4)).toBeNull();
  });

  it('ne pose aucune charge sur aucun exercice', () => {
    for (const semaine of [1, 2, 3, 4]) {
      for (const jour of [0, 1, 3, 5] as const) {
        const s = MASS4.getSession(semaine, jour, EMPTY_CONTEXT);
        for (const ex of s?.exercises ?? []) {
          expect({ ex: ex.id, kg: ex.load.kg }).toEqual({ ex: ex.id, kg: null });
          expect({ ex: ex.id, source: ex.load.source }).toEqual({ ex: ex.id, source: 'aucune' });
        }
      }
    }
  });

  it('garde la même séance de la semaine 1 à la 4, aux séries près', () => {
    const s1 = MASS4.getSession(1, 0, EMPTY_CONTEXT);
    const s4 = MASS4.getSession(4, 0, EMPTY_CONTEXT);
    expect(s1?.exercises.map((e) => e.id)).toEqual(s4?.exercises.map((e) => e.id));
    expect(s1?.title).toBe(s4?.title);
  });

  it('annonce la quatrième série possible à partir de la semaine 2', () => {
    const texte = (semaine: number) =>
      JSON.stringify(
        MASS4.getSession(semaine, 0, EMPTY_CONTEXT)?.exercises.find(
          (e) => e.id === 'developpe-militaire-smith',
        )?.notes,
      );
    expect(texte(1)).not.toContain('Quatrième série');
    expect(texte(2)).toContain('Quatrième série');
  });

  it('estime une durée proche des 60 minutes annoncées', () => {
    for (const jour of [0, 1, 3, 5] as const) {
      const min = MASS4.getSession(1, jour, EMPTY_CONTEXT)?.plannedMin ?? 0;
      expect({ jour, dans_la_fourchette: min >= 45 && min <= 75 }).toEqual({
        jour,
        dans_la_fourchette: true,
      });
    }
  });
});
