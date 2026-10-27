import { describe, expect, it } from 'vitest';
import { deloadFromReal, recalageFor, shiftLoad } from './realLoad';
import type { ResolvedLoad } from './loadResolver';
import type { Occurrence } from './types';

const occ = (week: number, kg: number | null, plannedKg: number | null): Occurrence => ({
  exerciseId: 'rdl',
  week,
  day: 0,
  kg,
  plannedKg,
  rpe: 7,
  failed: false,
  targetRPE: null,
  completed: true,
});

const plan = (kg: number, kgMax?: number): ResolvedLoad => ({
  kg,
  shape: 'barbell',
  step: 2.5,
  source: 'programme',
  ...(kgMax !== undefined ? { kgMax } : {}),
});

describe('recalageFor', () => {
  it('mesure l’écart entre ce qui a été fait et ce que le plan annonçait', () => {
    // Le cas réel : le tableau annonce 95 kg pour le RDL, Guillaume en tire 130.
    const r = recalageFor([occ(7, 130, 95)])!;
    expect(r.refKg).toBe(130);
    expect(r.refWeek).toBe(7);
    expect(r.offsetKg).toBe(35);
  });

  it('prend la DERNIÈRE occurrence, pas une moyenne', () => {
    // Une moyenne de sept semaines traînerait les charges du début de
    // programme pendant tout le bloc de force.
    const r = recalageFor([occ(5, 110, 90), occ(6, 120, 92.5), occ(7, 130, 95)])!;
    expect(r.refKg).toBe(130);
    expect(r.offsetKg).toBe(35);
  });

  it('saute les occurrences sans charge', () => {
    const r = recalageFor([occ(5, 130, 95), occ(6, null, 95), occ(7, null, 95)])!;
    expect(r.refKg).toBe(130);
    expect(r.refWeek).toBe(5);
  });

  it('rend null sans aucune charge enregistrée', () => {
    expect(recalageFor([])).toBeNull();
    expect(recalageFor([occ(5, null, 95)])).toBeNull();
  });

  it('n’invente aucun décalage quand le plan de l’époque est inconnu', () => {
    // Lignes écrites avant que `plannedKg` existe : on garde la charge réelle
    // comme référence, mais l'écart vaut zéro plutôt qu'un chiffre inventé.
    const r = recalageFor([occ(5, 130, null)])!;
    expect(r.refKg).toBe(130);
    expect(r.offsetKg).toBe(0);
  });

  it('gère un décalage négatif — soulever moins que prévu', () => {
    expect(recalageFor([occ(7, 85, 95)])!.offsetKg).toBe(-10);
  });
});

describe('shiftLoad', () => {
  it('déplace le plan de l’écart réel', () => {
    expect(shiftLoad(plan(90), 35).kg).toBe(125);
  });

  it('dit que la charge ne vient plus du programme seul', () => {
    expect(shiftLoad(plan(90), 35).source).toBe('historique');
  });

  it('déplace AUSSI le plafond', () => {
    /*
     * « Plafond assumé à 95 kg » a été écrit quand le plan partait de 90.
     * Appliqué tel quel à quelqu'un qui en tire 130, il ferait redescendre de
     * 35 kg au nom d'une limite qui ne parlait pas de lui. Le tableau donne la
     * FORME — plancher, plafond, écart entre les deux — et le décalage déplace
     * la forme entière.
     */
    const decale = shiftLoad(plan(90, 95), 35);
    expect(decale.kg).toBe(125);
    expect(decale.kgMax).toBe(130);
  });

  it('arrondit au pas de la barre', () => {
    expect(shiftLoad(plan(90), 36)!.kg).toBe(125); // 126 → 125
  });

  it('ne touche à rien sans décalage', () => {
    const p = plan(90, 95);
    expect(shiftLoad(p, 0)).toBe(p);
  });

  it('ne touche à rien sur un exercice sans charge', () => {
    const pdc: ResolvedLoad = { kg: null, shape: 'bodyweight', step: 2.5, source: 'programme' };
    expect(shiftLoad(pdc, 35)).toBe(pdc);
  });

  it('descend aussi quand le décalage est négatif', () => {
    expect(shiftLoad(plan(90), -10).kg).toBe(80);
  });
});

describe('deloadFromReal', () => {
  it('prend 80 % de la charge RÉELLE, pas du prévisionnel', () => {
    // Le défaut signalé : le tableau annonçait 75 kg, soit 80 % des 95 kg
    // qu'il PRÉVOYAIT pour la semaine 7. La semaine 7 s'est jouée à 130.
    expect(deloadFromReal(130, 0.8, 2.5)).toBe(105);
    expect(deloadFromReal(95, 0.8, 2.5)).toBe(75);
  });

  it('arrondit au pas de la barre', () => {
    expect(deloadFromReal(122, 0.8, 2.5)).toBe(97.5);
  });

  it('suit la charge réelle, quelle qu’elle soit', () => {
    expect(deloadFromReal(60, 0.8, 2.5)).toBe(47.5);
    expect(deloadFromReal(200, 0.8, 2.5)).toBe(160);
  });

  it('donne un deload PLUS LÉGER que « plan + décalage »', () => {
    /*
     * 75 + 35 = 110, soit 85 % des 130 réels — un deload plus lourd que ce que
     * le programme demande, et d'autant plus lourd que le décalage est grand.
     * Un deload est une PROPORTION de ce qu'on soulève, pas une soustraction.
     */
    expect(deloadFromReal(130, 0.8, 2.5)).toBeLessThan(75 + 35);
  });
});
