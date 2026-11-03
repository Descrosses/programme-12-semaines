/**
 * Les garde-fous du catalogue.
 *
 * Ce ne sont pas des tests d'affichage : ce sont les règles que Guillaume a
 * posées et qu'une bonne intention suffirait à enfreindre. « Ne présente pas
 * un programme non développé comme disponible », « ne crée pas de faux
 * programmes pour remplir le catalogue », « n'invente pas les objectifs de la
 * famille Femmes ». Un test les rend vérifiables.
 */

import { describe, expect, it } from 'vitest';
import {
  FAMILLES,
  PROGRAMME_PAR_DEFAUT,
  familleParId,
  programmeParId,
  programmesDisponibles,
  tousLesProgrammes,
} from './catalogue';
import { DUREE_SEMAINES } from './types';

describe('catalogue Dcross-fit', () => {
  it('ne déclare disponible que ce qui est réellement jouable', () => {
    /*
     * Si ce test casse en ajoutant un programme, la question à se poser n'est
     * pas « comment le faire passer » mais « ce programme se joue-t-il
     * vraiment du début à la fin dans cette application ».
     */
    expect(programmesDisponibles().map((p) => p.id)).toEqual(['power12']);
  });

  it('fait correspondre le programme par défaut à la durée du moteur', () => {
    const defaut = programmeParId(PROGRAMME_PAR_DEFAUT);
    expect(defaut).not.toBeNull();
    expect(defaut?.dureeSemaines).toBe(DUREE_SEMAINES);
  });

  it('couvre les trois familles prévues, et aucune autre', () => {
    expect(FAMILLES.map((f) => f.id)).toEqual(['power', 'mass', 'femmes']);
  });

  it('n’invente aucun programme pour la famille Femmes', () => {
    expect(familleParId('femmes')?.programmes).toEqual([]);
  });

  it('ne donne ni objectifs ni prérequis à un programme qui n’existe pas', () => {
    for (const p of tousLesProgrammes()) {
      if (p.statut === 'disponible') continue;
      expect({ id: p.id, objectifs: p.objectifs.length }).toEqual({ id: p.id, objectifs: 0 });
      expect({ id: p.id, prerequis: p.prerequis.length }).toEqual({ id: p.id, prerequis: 0 });
    }
  });

  it('donne un identifiant unique à chaque programme', () => {
    const ids = tousLesProgrammes().map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('range chaque programme dans la famille qui le porte', () => {
    for (const famille of FAMILLES) {
      for (const p of famille.programmes) {
        expect({ id: p.id, famille: p.familleId }).toEqual({ id: p.id, famille: famille.id });
      }
    }
  });

  it('rend `null` pour un identifiant inconnu, sans rien inventer', () => {
    expect(programmeParId('power99')).toBeNull();
    expect(familleParId('crossfit' as never)).toBeNull();
  });
});
