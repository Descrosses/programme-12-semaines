/**
 * Le combiné de MASS FORCE : quatre tests, une liste FERMÉE de matériels, et
 * aucun protocole ni formule (rien de cela n'est validé).
 */
import { describe, expect, it } from 'vitest';
import { COMBINE_MASS_FORCE, VARIANTES, estVariante } from './combineMass';

describe('combiné MASS FORCE', () => {
  it('quatre tests, dans l’ordre de Guillaume', () => {
    expect(COMBINE_MASS_FORCE.map((t) => t.nom)).toEqual([
      'Développé couché',
      'Tirage vertical',
      'Squat',
      'Push press',
    ]);
  });

  it('la liste des matériels est fermée, et chaque test y puise', () => {
    expect(Object.keys(VARIANTES)).toEqual(['barre', 'smith', 'halteres', 'poulie', 'machine']);
    for (const t of COMBINE_MASS_FORCE) {
      for (const v of t.variantes) expect(estVariante(v), `${t.nom} : ${v}`).toBe(true);
    }
    expect(estVariante('kettlebell')).toBe(false);
  });

  it('push press : Smith ou barre libre, au choix', () => {
    const pp = COMBINE_MASS_FORCE.find((t) => t.exercice === 'push-press')!;
    expect([...pp.variantes].sort()).toEqual(['barre', 'smith']);
  });

  it('ne porte ni protocole, ni formule, ni critère : seulement le test et son matériel', () => {
    for (const t of COMBINE_MASS_FORCE) {
      expect(Object.keys(t).sort(), t.nom).toEqual(['exercice', 'nom', 'variantes']);
    }
  });
});
