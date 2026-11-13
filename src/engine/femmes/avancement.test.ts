/**
 * L'avancement FEMMES : la séance du jour est la première NON FAITE.
 *
 * Choix fait au lancement de FEMMES 8 : on avance quand une séance est
 * terminée, pas quand le calendrier tourne. Une séance manquée n'est jamais
 * sautée. Si ces tests tombent, c'est que l'avancement a été recalé sur des
 * dates par mégarde.
 */
import { describe, expect, it } from 'vitest';
import { TOTAL_SESSIONS } from '../../data/femmes/programme';
import { ORDRE, avancement, estFaite, historique, type SeanceFaite } from './avancement';
import type { ExerciseRecord } from './types';

const fait = (semaine: number, jour: 0 | 1 | 2 | 3): SeanceFaite => ({
  semaine,
  jour,
  terminee: true,
});

describe('avancement FEMMES', () => {
  it('l’ordre couvre les trente séances, semaine après semaine', () => {
    expect(ORDRE).toHaveLength(TOTAL_SESSIONS);
    expect(ORDRE[0]).toEqual({ semaine: 1, jour: 0 });
    for (let i = 1; i < ORDRE.length; i++) {
      expect(ORDRE[i]!.semaine).toBeGreaterThanOrEqual(ORDRE[i - 1]!.semaine);
    }
  });

  it('au départ : rien de fait, la prochaine est la séance 1 de la semaine 1', () => {
    const a = avancement([]);
    expect(a).toEqual({
      faites: 0,
      total: TOTAL_SESSIONS,
      prochaine: { semaine: 1, jour: 0 },
      semaine: 1,
      termine: false,
    });
  });

  it('une séance faite fait passer à la suivante', () => {
    expect(avancement([fait(1, 0)]).prochaine).toEqual({ semaine: 1, jour: 1 });
  });

  it('une séance manquée n’est jamais sautée', () => {
    // Lundi et vendredi faits, mercredi oublié : c'est mercredi qui revient.
    const a = avancement([fait(1, 0), fait(1, 2)]);
    expect(a.prochaine).toEqual({ semaine: 1, jour: 1 });
    expect(a.faites).toBe(2);
  });

  it('une séance commencée mais pas terminée ne compte pas', () => {
    const a = avancement([{ semaine: 1, jour: 0, terminee: false }]);
    expect(a.faites).toBe(0);
    expect(a.prochaine).toEqual({ semaine: 1, jour: 0 });
  });

  it('une ligne hors programme ne gonfle pas le compteur', () => {
    expect(avancement([fait(9, 0), fait(1, 3)]).faites).toBe(0);
  });

  it('les trente faites : programme terminé, semaine 8', () => {
    const a = avancement(ORDRE.map((c) => fait(c.semaine, c.jour)));
    expect(a.termine).toBe(true);
    expect(a.prochaine).toBeNull();
    expect(a.faites).toBe(TOTAL_SESSIONS);
    expect(a.semaine).toBe(8);
  });

  it('estFaite ne répond oui qu’aux séances terminées', () => {
    const seances = [fait(1, 0), { semaine: 1, jour: 1 as const, terminee: false }];
    expect(estFaite(seances, 1, 0)).toBe(true);
    expect(estFaite(seances, 1, 1)).toBe(false);
  });
});

describe('historique pour la progression des charges', () => {
  const rec = (week: number, kg: number): ExerciseRecord => ({
    exerciseId: 'x',
    week,
    day: 0,
    date: '2026-11-13',
    version: 'salle',
    planned: 10,
    actual: 10,
    kg,
    ressenti: 'ok',
    remarque: null,
  });

  it('est trié dans l’ordre du programme, pas dans l’ordre d’enregistrement', () => {
    // La semaine 2 corrigée APRÈS la semaine 3 ne devient pas « la dernière ».
    const h = historique([
      { semaine: 3, jour: 0, terminee: true, exercices: [rec(3, 30)] },
      { semaine: 2, jour: 0, terminee: true, exercices: [rec(2, 20)] },
    ]);
    expect(h['x']!.map((r) => r.kg)).toEqual([20, 30]);
  });
});
