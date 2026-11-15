/**
 * L'alternative du Landmine Press half-kneeling ne donne plus de kilo fixe.
 *
 * « Développé haltère unilatéral à genou, 22 kg » était la charge de l'auteur
 * du programme : juste pour lui, fausse pour un nouvel utilisateur. Elle est
 * remplacée par un repère relatif (10 à 15 % de moins qu'au Landmine Press
 * barre) et, sans repère, par le RPE. Le `.md` et le code disent la même
 * chose, mot pour mot.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { EXERCISES } from './exercises';

const md = readFileSync(new URL('../../programme-final-12-semaines.md', import.meta.url), 'utf8');
const alt = EXERCISES['landmine-press-kneeling']!.altBasicFit!;

describe('alternative du Landmine Press half-kneeling', () => {
  it('aucun kilo fixe', () => {
    expect(alt).not.toMatch(/\d+([,.]\d+)?\s?kg/);
  });

  it('un repère relatif, et le RPE quand il n’y a pas de repère', () => {
    expect(alt).toContain('10 à 15 % de moins que ta charge au Landmine Press barre');
    expect(alt).toContain('8 reps à RPE 7');
  });

  it('le code transcrit le .md mot pour mot', () => {
    const fin = alt.slice(alt.indexOf('Sinon'));
    expect(md).toContain(fin);
    expect(md).not.toContain('unilatéral à genou, 22 kg');
  });
});
