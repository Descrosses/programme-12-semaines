/**
 * Remarques par exercice — les deux décisions qui comptent.
 *
 * Ce qu'elles servent : repérer qu'un mouvement s'est senti anormalement dur ou
 * léger, et le relire quand il revient. C'est le signal qui aurait fait
 * remarquer dès la semaine 1 que la charge de squat ne correspondait pas au
 * vrai niveau — deux mois avant que le combine ne le montre.
 */

import { describe, expect, it } from 'vitest';
import { hasNote, noteBadgeLabel, normalizeNote, pastNotes, type NoteLike } from './exerciseNotes';
import type { DayIndex } from '../data/types';

const note = (week: number, day: DayIndex, text: string, date = '2026-09-14'): NoteLike => ({
  exerciseId: 'back-squat',
  week,
  day,
  date,
  text,
});

describe('ce qu’on stocke, et ce qu’on n’stocke pas', () => {
  it('un texte est stocké sans ses espaces de bord', () => {
    expect(normalizeNote('  très lourd dès la 2e série  ')).toBe('très lourd dès la 2e série');
  });

  /*
   * La règle qui tient tout le reste : un champ vide n'écrit RIEN. Sans elle,
   * neuf exercices ouverts et refermés sans rien dire laisseraient neuf lignes
   * vides, et le badge « remarque » s'allumerait sur du vide — l'indicateur
   * cesserait de vouloir dire quelque chose.
   */
  it('un champ vide, ou effacé, ne laisse rien derrière lui', () => {
    for (const vide of ['', '   ', '\n', '\t  \n']) {
      expect(normalizeNote(vide), JSON.stringify(vide)).toBeNull();
    }
  });

  it('hasNote suit la même règle', () => {
    expect(hasNote({ text: 'ok' })).toBe(true);
    expect(hasNote({ text: '   ' })).toBe(false);
    expect(hasNote(null)).toBe(false);
    expect(hasNote(undefined)).toBe(false);
  });
});

describe('lesquelles relire quand le mouvement revient', () => {
  const ici = { week: 5, day: 0 as DayIndex };

  it('celles des semaines précédentes, la plus récente d’abord', () => {
    const rows = [
      note(1, 0, 'très lourd dès la 2e série'),
      note(3, 0, 'mieux, mais la 5e reste dure'),
      note(2, 0, 'toujours lourd'),
    ];
    expect(pastNotes(rows, ici).map((r) => r.week)).toEqual([3, 2, 1]);
  });

  /*
   * Celle du jour est déjà dans le champ de saisie. La réafficher au-dessus
   * donnerait à croire qu'on en a écrit deux.
   */
  it('jamais celle de l’occurrence en cours', () => {
    const rows = [note(5, 0, 'du jour'), note(1, 0, 'd’avant')];
    expect(pastNotes(rows, ici).map((r) => r.text)).toEqual(['d’avant']);
  });

  it('jamais celles d’une semaine à venir', () => {
    // Guillaume peut ouvrir la semaine 9 à l'avance et y noter quelque chose.
    const rows = [note(9, 0, 'plus tard'), note(2, 0, 'avant')];
    expect(pastNotes(rows, ici).map((r) => r.text)).toEqual(['avant']);
  });

  it('dans la même semaine, le jour départage', () => {
    // Le broad jump revient vendredi et samedi : samedi doit voir vendredi.
    const rows = [note(5, 4, 'vendredi'), note(5, 5, 'samedi')];
    expect(pastNotes(rows, { week: 5, day: 5 }).map((r) => r.text)).toEqual(['vendredi']);
    expect(pastNotes(rows, { week: 5, day: 4 })).toEqual([]);
  });

  it('les remarques vides ne comptent pas', () => {
    const rows = [note(1, 0, '   '), note(2, 0, 'vraie remarque')];
    expect(pastNotes(rows, ici)).toHaveLength(1);
  });

  /*
   * L'ordre se lit dans la semaine et le jour, jamais dans la date : décaler la
   * date de début du programme réécrit toutes les dates de séance, et une
   * remarque de la semaine 1 doit rester avant celle de la semaine 3 après ce
   * recalage.
   */
  it('un recalage du calendrier ne change pas l’ordre', () => {
    const rows = [
      note(1, 0, 'semaine 1', '2027-01-04'),
      note(3, 0, 'semaine 3', '2026-09-28'),
    ];
    expect(pastNotes(rows, ici).map((r) => r.text)).toEqual(['semaine 3', 'semaine 1']);
  });

  it('aucune remarque antérieure : rien à afficher, donc pas de badge', () => {
    expect(pastNotes([], ici)).toEqual([]);
    expect(pastNotes([note(5, 0, 'du jour')], ici)).toEqual([]);
  });
});

describe('le libellé du badge', () => {
  it('s’accorde', () => {
    expect(noteBadgeLabel(1)).toBe('1 remarque');
    expect(noteBadgeLabel(2)).toBe('2 remarques');
    expect(noteBadgeLabel(11)).toBe('11 remarques');
  });
});
