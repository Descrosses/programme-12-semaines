/**
 * Le registre est la couture entre le catalogue et le moteur. Si elle lâche,
 * l'application annonce un programme qu'elle ne sait pas jouer, ou joue un
 * programme qu'elle n'annonce pas — deux pannes silencieuses.
 */

import { describe, expect, it } from 'vitest';
import { PROGRAMME_PAR_DEFAUT, programmesDisponibles } from '../data/catalogue';
import { EMPTY_CONTEXT } from '../engine/types';
import {
  FEMMES_SANS_MODULE,
  ID_PROGRAMME_INDISPONIBLE,
  MODULES,
  MODULE_INDISPONIBLE,
  moduleParId,
  modulePourCycle,
} from './registre';
import { POWER12 } from './power12';
import { currentWeek, locateToday } from '../engine/calendar';
import { FEMMES_PROGRAMME_ID } from '../db/femmesRepo';

describe('registre des programmes', () => {
  it('a un module pour chaque programme annoncé disponible', () => {
    /*
     * Le sens qui compte. L'inverse est permis : un module peut exister avant
     * d'être annoncé, le temps de le vérifier.
     */
    /*
     * FEMMES 8 est la seule exception, et elle est nommée : il n'est pas un
     * module, il a ses PROPRES écrans, vers lesquels l'App aiguille tout cycle
     * FEMMES (`FEMMES_PROGRAMME_ID`). Sans cet aiguillage, il retomberait sur
     * POWER 12 — exactement la panne que ce test surveille.
     */
    const sansModule = programmesDisponibles()
      .map((p) => p.id)
      .filter((id) => moduleParId(id) === null && id !== FEMMES_PROGRAMME_ID);
    expect(sansModule).toEqual([]);
  });

  it('rend `null` pour un programme annoncé mais pas encore écrit', () => {
    // Les cinq étapes suivantes du parcours POWER sont « à venir ».
    // Aucune séance n'est écrite : pas de module.
    for (const id of [
      'power-transition1',
      'power-cycle2',
      'power-transition2',
      'power-cycle3',
      'power-transition-finale',
    ]) {
      expect(moduleParId(id), id).toBeNull();
    }
    expect(moduleParId('mass8')).toBeNull();
    expect(moduleParId(null)).toBeNull();
  });

  it('joue MASS 4, et le décrit comme il est', () => {
    const m = moduleParId('mass4');
    expect(m).not.toBeNull();
    expect(m?.dureeSemaines).toBe(4);
    // Quatre semaines, sans semaine 0 : MASS 4 n'a pas de combine initial.
    expect(m?.semaines).toEqual([1, 2, 3, 4]);
    // Et aucun bloc de périodisation : la même séance chaque semaine.
    expect(m?.blocDeLaSemaine(1)).toBeNull();
    expect(m?.joursDeLaSemaine(1)).toEqual([0, 1, 3, 5]);
    expect(m?.joursDeLaSemaine(5)).toEqual([]);
  });

  it('ne laisse jamais un cycle sans programme : sans cycle, POWER 12', () => {
    expect(modulePourCycle(null).id).toBe(PROGRAMME_PAR_DEFAUT);
  });

  /*
   * Lot 3 de l'ADR ME, MYSELF & I (décision de Guillaume, 16 novembre) :
   * un identifiant INCONNU n'ouvre plus POWER 12 en silence. Il aurait joué
   * les séances de POWER et enregistré leurs séries sous un cycle qui n'est
   * pas le sien.
   */
  it('un programme inconnu rend le module « indisponible », jamais POWER 12', () => {
    for (const id of ['power99', 'mass12', 'perso-inconnu00-1']) {
      const m = modulePourCycle(id);
      expect(m.id, id).toBe(ID_PROGRAMME_INDISPONIBLE);
      expect(m.semaines, id).toEqual([]);
      expect(m.getSession(1, 0, EMPTY_CONTEXT), id).toBeNull();
      // Réglages reste ouvert : c'est de là qu'on restaure une sauvegarde.
      expect(
        m.onglets.map((o) => o.vue),
        id,
      ).toEqual(['settings']);
    }
    expect(MODULE_INDISPONIBLE.id).toBe(ID_PROGRAMME_INDISPONIBLE);
  });

  it('le calendrier d’un programme indisponible ne plante pas : aucune semaine, aucun jour', () => {
    // Ce que l'App calcule au démarrage d'un cycle (vu planter dans le navigateur).
    expect(currentWeek('2026-11-16', '2026-11-20', MODULE_INDISPONIBLE)).toBeNull();
    expect(locateToday('2026-11-16', '2026-11-20', MODULE_INDISPONIBLE)).toBeNull();
  });

  it('FEMMES 8 garde son repli sur POWER 12, et App calcule les mêmes valeurs', () => {
    expect(FEMMES_SANS_MODULE).toBe(FEMMES_PROGRAMME_ID);
    const femmes = modulePourCycle(FEMMES_PROGRAMME_ID);
    // Le MÊME objet qu'avant le lot 3 : rien de ce qu'App en tire ne change.
    expect(femmes).toBe(POWER12);
    for (const jour of ['2026-11-07', '2026-11-16', '2026-12-31']) {
      expect(locateToday('2026-11-07', jour, femmes)).toEqual(
        locateToday('2026-11-07', jour, POWER12),
      );
      expect(currentWeek('2026-11-07', jour, femmes)).toBe(
        currentWeek('2026-11-07', jour, POWER12),
      );
    }
  });

  it('un programme du catalogue compilé sans module garde son repli', () => {
    for (const id of ['mass8', 'power-cycle2', 'femmes-cycle2']) {
      expect(modulePourCycle(id).id, id).toBe(PROGRAMME_PAR_DEFAUT);
    }
  });

  it('décrit POWER 12 comme il est réellement', () => {
    const p = modulePourCycle('power12');
    expect(p.dureeSemaines).toBe(12);
    // Semaine 0 comprise : POWER 12 commence par son combine initial.
    expect(p.semaines).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(p.blocDeLaSemaine(8)).toBe('deload');
    expect(p.blocDeLaSemaine(13)).toBeNull();
    expect(p.joursDeLaSemaine(13)).toEqual([]);
  });

  it('construit une séance par le module, comme le moteur la construirait', () => {
    const p = modulePourCycle('power12');
    const seance = p.getSession(1, 0, EMPTY_CONTEXT);
    expect(seance).not.toBeNull();
    expect(seance?.title).toContain('Lower Strength');
    // Un jour sans séance reste sans séance.
    expect(p.getSession(1, 1, EMPTY_CONTEXT)).toBeNull();
  });

  it('expose un module par identifiant unique', () => {
    const ids = MODULES.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
