/**
 * Le parcours POWER de 52 semaines (schéma de Guillaume), et le matériel à
 * prévoir, qui ne doit citer que des exercices réellement programmés.
 */

import { describe, expect, it } from 'vitest';
import { accesProgramme } from './acces';
import { familleParId, programmeParId, tousLesProgrammes } from '../data/catalogue';
import { EXERCISES } from '../data/exercises';
import { getSession } from './getSession';
import { EMPTY_CONTEXT } from './types';
import type { DayIndex, WeekIndex } from '../data/types';

const p = (id: string) => programmeParId(id)!;
const fini = (id: string) => ({ programmeId: id, statut: 'termine' });
const enCours = (id: string) => ({ programmeId: id, statut: 'en-cours' });

const PARCOURS = [
  'power12',
  'power-transition1',
  'power-cycle2',
  'power-transition2',
  'power-cycle3',
  'power-transition-finale',
];

describe('le parcours POWER', () => {
  /*
   * Le schéma annonce « 52 semaines », mais ses six étapes font 3 × 12 +
   * 3 × 4 = 48. L'écart a été signalé à Guillaume ; l'application affiche ce
   * que les étapes font vraiment, sans le chiffre de 52.
   */
  it('six étapes, dans l’ordre du schéma : 3 × 12 + 3 × 4 = 48 semaines d’entraînement', () => {
    const ids = familleParId('power')!.programmes.map((x) => x.id);
    expect(ids).toEqual(PARCOURS);
    const total = familleParId('power')!.programmes.reduce((n, x) => n + x.dureeSemaines, 0);
    expect(total).toBe(48);
  });

  it('les anciennes places ont disparu : POWER 28, TRANSITION 4, POWER 12 2.0', () => {
    for (const id of ['power28', 'power-transition4', 'power12v2']) {
      expect(programmeParId(id), id).toBeNull();
    }
  });

  it('le cycle 1 est disponible dès l’inscription', () => {
    const a = accesProgramme(p('power12'), []);
    expect(a.ouvert).toBe(true);
    expect(a.badge).toBe('Disponible dès l’inscription');
  });

  it('chaque étape s’ouvre quand la précédente est TERMINÉE — pas commencée', () => {
    for (let i = 1; i < PARCOURS.length; i++) {
      const etape = p(PARCOURS[i]!);
      const avant = PARCOURS[i - 1]!;
      expect(accesProgramme(etape, []).ouvert, etape.id).toBe(false);
      expect(accesProgramme(etape, [enCours(avant)]).ouvert, etape.id).toBe(false);
      expect(accesProgramme(etape, [fini(avant)]).ouvert, etape.id).toBe(true);
    }
  });

  it('pas de saut : finir le cycle 1 n’ouvre pas le cycle 2', () => {
    expect(accesProgramme(p('power-cycle2'), [fini('power12')]).ouvert).toBe(false);
  });

  it('le badge reprend les mots du schéma', () => {
    expect(accesProgramme(p('power-transition1'), []).badge).toBe('Se débloque après le cycle 1');
    expect(accesProgramme(p('power-cycle2'), []).badge).toBe('Se débloque après la transition 1');
    expect(accesProgramme(p('power-transition-finale'), []).badge).toBe(
      'Se débloque après le cycle 3',
    );
  });

  it('les cinq étapes suivantes restent « à venir » : aucune séance n’est écrite', () => {
    for (const id of PARCOURS.slice(1)) expect(p(id).statut, id).toBe('a-venir');
  });
});

describe('le matériel à prévoir', () => {
  const programmes = new Set<string>();
  for (let w = 0; w <= 12; w++) {
    for (let d = 0; d <= 6; d++) {
      for (const e of getSession(w as WeekIndex, d as DayIndex, EMPTY_CONTEXT)?.exercises ?? []) {
        programmes.add(e.id);
      }
    }
  }

  it('le cycle 1 annonce la ceinture de lest de ses tractions lestées', () => {
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
