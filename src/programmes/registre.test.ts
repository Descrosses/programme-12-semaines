/**
 * Le registre est la couture entre le catalogue et le moteur. Si elle lâche,
 * l'application annonce un programme qu'elle ne sait pas jouer, ou joue un
 * programme qu'elle n'annonce pas — deux pannes silencieuses.
 */

import { describe, expect, it } from 'vitest';
import { PROGRAMME_PAR_DEFAUT, programmesDisponibles } from '../data/catalogue';
import { EMPTY_CONTEXT } from '../engine/types';
import { MODULES, moduleParId, modulePourCycle } from './registre';

describe('registre des programmes', () => {
  it('a un module pour chaque programme annoncé disponible', () => {
    /*
     * Le sens qui compte. L'inverse est permis : un module peut exister avant
     * d'être annoncé, le temps de le vérifier.
     */
    const sansModule = programmesDisponibles()
      .map((p) => p.id)
      .filter((id) => moduleParId(id) === null);
    expect(sansModule).toEqual([]);
  });

  it('rend `null` pour un programme annoncé mais pas encore écrit', () => {
    // MASS 4 figure au catalogue en « à venir ». Il n'a pas de module.
    expect(moduleParId('mass4')).toBeNull();
    expect(moduleParId('power28')).toBeNull();
    expect(moduleParId(null)).toBeNull();
  });

  it('ne laisse jamais un cycle sans programme', () => {
    // Un identifiant renommé, un import d'un fichier plus ancien.
    expect(modulePourCycle('power99').id).toBe(PROGRAMME_PAR_DEFAUT);
    expect(modulePourCycle(null).id).toBe(PROGRAMME_PAR_DEFAUT);
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
