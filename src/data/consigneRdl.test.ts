/**
 * La consigne du Romanian Deadlift (§3 du `.md`) ne cite plus de kilos.
 *
 * « S2 : 85 kg, S3 : 90 kg si RPE conforme » étaient les charges de l'auteur.
 * Remplacées par une règle au RPE (décision de Guillaume). L'empreinte ne lit
 * pas les consignes : sans ce test, le retour des kilos passerait inaperçu.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { EXERCISES } from './exercises';

const md = readFileSync(new URL('../../programme-final-12-semaines.md', import.meta.url), 'utf8');
const debut = md.indexOf('**E. Romanian Deadlift');
const bloc = md.slice(debut, md.indexOf('\n\n', md.indexOf('\n', debut) + 1));

describe('consigne du Romanian Deadlift', () => {
  it('le bloc RDL du §3 existe', () => {
    expect(debut).toBeGreaterThan(-1);
  });

  it('aucun kilo dans la consigne (le titre garde le tableau de l’auteur)', () => {
    const consigne = bloc.slice(bloc.indexOf('\n') + 1);
    expect(consigne).not.toMatch(/\d+([,.]\d+)?\s?kg/);
    expect(md).not.toContain('S2 : 85 kg, S3 : 90 kg');
  });

  it('la règle de progression au RPE', () => {
    expect(bloc).toContain(
      "Semaines 2 et 3 : la charge monte d'un cran si le RPE de la semaine précédente est resté à 7 ou moins. Sinon, garde la même.",
    );
  });

  it('la consigne affichée dans l’app reste sans kilo', () => {
    const rdl = Object.values(EXERCISES).find((e) => e.name === 'Romanian Deadlift');
    expect(rdl).toBeDefined();
    expect(JSON.stringify(rdl)).not.toMatch(/\d+([,.]\d+)?\s?kg/);
  });
});
