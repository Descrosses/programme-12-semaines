/**
 * Supprimer un programme importé qu'un cycle suit (Guillaume, 26 novembre) :
 * « demander une confirmation à l'utilisateur s'il est sûr de son choix,
 * mais après sa seconde confirmation, on supprime ».
 *
 * Ces tests figent :
 * - la première confirmation dit ce qui part (cycles, séances faites,
 *   séries), au singulier comme au pluriel ;
 * - le programme et ses cycles ne partent qu'à la SECONDE confirmation ;
 * - le refus « Archive-le plutôt » n'existe plus.
 * Les touches elles-mêmes sont vérifiées au navigateur (pas de DOM ici).
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { phraseBilan } from './DetailsImporte';

const source = readFileSync(new URL('./DetailsImporte.tsx', import.meta.url), 'utf8');

describe('supprimer un programme suivi par un cycle', () => {
  it('la première confirmation dit ce qui part, au singulier', () => {
    expect(phraseBilan('Training 1', { cycles: 1, seances: 1, series: 1 })).toBe(
      'Un cycle suit « Training 1 » : 1 séance faite et 1 série enregistrée. Supprimer le programme efface aussi ce cycle et tout ce qui y a été noté : séances, séries, remarques, photos de suivi.',
    );
  });

  it('… et au pluriel', () => {
    const phrase = phraseBilan('Training 1', { cycles: 2, seances: 12, series: 148 });
    expect(phrase).toMatch(
      /^2 cycles suivent « Training 1 » : 12 séances faites et 148 séries enregistrées\./,
    );
    expect(phrase).toContain('efface aussi ces cycles');
  });

  it('un cycle jamais commencé se dit aussi : 0 séance faite', () => {
    expect(phraseBilan('X', { cycles: 1, seances: 0, series: 0 })).toContain(
      '0 séance faite et 0 série enregistrée',
    );
  });

  it('deux confirmations : « Continuer » mène à la seconde, seule la seconde emporte les cycles', () => {
    expect(source).toMatch(/onClick=\{\(\) => setEtape\('seconde'\)\}>\s*Continuer/);
    expect(source).toContain("supprimerProgramme(row.cle, { avecSesCycles: etape === 'seconde' })");
    expect(source).toContain('Oui, tout supprimer');
    expect(source).toContain('Dernière confirmation.');
    // Un cycle trouvé ouvre la PREMIÈRE confirmation, jamais la simple.
    expect(source).toContain("setEtape(b.cycles > 0 ? 'premiere' : 'simple')");
  });

  it('le refus d’avant a disparu', () => {
    expect(source).not.toContain('Archive-le plutôt');
  });
});
