/**
 * La filière POWER : 1.0 ouvert à tous, TRANSITION 4 après 1.0, 2.0 en deux
 * temps. Et le matériel à prévoir, qui ne doit citer que des exercices
 * réellement programmés.
 */

import { describe, expect, it } from 'vitest';
import { accesProgramme, semaineAccessible } from './acces';
import { programmeParId, tousLesProgrammes } from '../data/catalogue';
import { EXERCISES } from '../data/exercises';
import { getSession } from './getSession';
import { EMPTY_CONTEXT } from './types';
import type { DayIndex, WeekIndex } from '../data/types';

const p = (id: string) => programmeParId(id)!;
const fini = (id: string) => ({ programmeId: id, statut: 'termine' });
const enCours = (id: string) => ({ programmeId: id, statut: 'en-cours' });

describe('la filière POWER', () => {
  it('POWER 28 a disparu du catalogue', () => {
    expect(programmeParId('power28')).toBeNull();
  });

  it('POWER 12 1.0 est ouvert à tous', () => {
    expect(accesProgramme(p('power12'), []).niveau).toBe('ouvert');
  });

  it('TRANSITION 4 s’ouvre à la fin de 1.0 — pas pendant', () => {
    expect(accesProgramme(p('power-transition4'), []).niveau).toBe('verrouille');
    expect(accesProgramme(p('power-transition4'), [enCours('power12')]).niveau).toBe('verrouille');
    expect(accesProgramme(p('power-transition4'), [fini('power12')]).niveau).toBe('ouvert');
  });

  it('POWER 12 2.0 : semaine 1 après 1.0, le reste après TRANSITION 4', () => {
    const v2 = p('power12v2');
    const rien = accesProgramme(v2, []);
    expect(rien.niveau).toBe('verrouille');
    expect(semaineAccessible(rien, 1)).toBe(false);

    const apres10 = accesProgramme(v2, [fini('power12')]);
    expect(apres10.niveau).toBe('premiere-semaine');
    expect(semaineAccessible(apres10, 1)).toBe(true);
    expect(semaineAccessible(apres10, 2)).toBe(false);

    const apresTransition = accesProgramme(v2, [fini('power12'), fini('power-transition4')]);
    expect(apresTransition.niveau).toBe('ouvert');
    expect(semaineAccessible(apresTransition, 12)).toBe(true);
  });

  it('les deux suivants restent « à venir » : aucune séance n’est écrite', () => {
    expect(p('power-transition4').statut).toBe('a-venir');
    expect(p('power12v2').statut).toBe('a-venir');
  });
});

describe('le matériel à prévoir', () => {
  // Tous les exercices programmés dans POWER 12, combines compris.
  const programmes = new Set<string>();
  for (let w = 0; w <= 12; w++) {
    for (let d = 0; d <= 6; d++) {
      for (const e of getSession(w as WeekIndex, d as DayIndex, EMPTY_CONTEXT)?.exercises ?? []) {
        programmes.add(e.id);
      }
    }
  }

  it('POWER 12 annonce la ceinture de lest de ses tractions lestées', () => {
    expect(p('power12').materiel?.map((m) => m.objet)).toContain('Ceinture de lest');
  });

  it('chaque objet cite des exercices qui existent ET sont programmés', () => {
    for (const prog of tousLesProgrammes()) {
      for (const m of prog.materiel ?? []) {
        expect(m.exercices.length, m.objet).toBeGreaterThan(0);
        for (const id of m.exercices) {
          expect(EXERCISES[id], `${m.objet} : ${id} inconnu`).toBeDefined();
          if (prog.id === 'power12') {
            expect(programmes.has(id), `${m.objet} : ${id} n’est plus programmé`).toBe(true);
          }
        }
      }
    }
  });
});
