/**
 * La mémoire des programmes importés, vue du catalogue et du registre
 * (lot 3 de l'ADR ME, MYSELF & I).
 *
 * Ce que ces tests figent :
 * - le catalogue compilé passe TOUJOURS d'abord : un programme importé ne
 *   masque jamais POWER, MASS ni FEMMES ;
 * - `FAMILLES` et `tousLesProgrammes` restent compilés ;
 * - un programme importé connu est « disponible » et son cycle ouvre SON
 *   module (lot 4) ; un programme inconnu, l'écran « indisponible » ;
 *   jamais POWER ;
 * - les abonnés sont prévenus à chaque changement.
 */
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import type { ProgrammeImporteRow } from '../../db/db';
import { programmeParId, tousLesProgrammes } from '../../data/catalogue';
import { validerProgramme } from '../../engine/perso/valider';
import { ID_PROGRAMME_INDISPONIBLE, modulePourCycle } from '../registre';
import { abonnerMemoire, lireMemoire, remplirMemoire, viderMemoire } from './memoire';

const TEXTE = readFileSync(
  new URL('../../engine/perso/__fixtures__/training1.json', import.meta.url),
  'utf8',
);

function ligne(cle: string): ProgrammeImporteRow {
  const v = validerProgramme(TEXTE);
  if (!v.ok) throw new Error('fixture invalide');
  return {
    cle,
    uid: v.programme.uid,
    rev: 1,
    nom: v.programme.nom,
    importeLe: '2026-11-16',
    archive: false,
    texte: TEXTE,
    document: v.programme,
    reponses: { dureeSemaines: 8 },
  };
}

const CLE = 'perso-training1guillaume201005-1';

afterEach(() => viderMemoire());

describe('la mémoire vue du catalogue', () => {
  it('au démarrage : en chargement, vide', () => {
    expect(lireMemoire()).toEqual({ etat: 'chargement', programmes: [] });
    expect(programmeParId(CLE)).toBeNull();
  });

  it('un programme importé devient une fiche de la famille perso, « disponible »', () => {
    remplirMemoire([ligne(CLE)]);
    expect(lireMemoire().etat).toBe('pret');
    expect(programmeParId(CLE)).toMatchObject({
      id: CLE,
      familleId: 'perso',
      nom: 'Training 1',
      version: '1',
      dureeSemaines: 8,
      statut: 'disponible',
    });
  });

  it('le catalogue compilé passe d’abord, et reste compilé', () => {
    const avant = tousLesProgrammes().map((p) => p.id);
    // Une ligne forgée qui porterait l'identifiant de POWER ne le masque pas.
    remplirMemoire([{ ...ligne(CLE), cle: 'power12', nom: 'Faux POWER' }]);
    expect(programmeParId('power12')?.nom).toBe('POWER CYCLE 1');
    expect(programmeParId('power12')?.familleId).toBe('power');
    expect(tousLesProgrammes().map((p) => p.id)).toEqual(avant);
  });

  it('le cycle d’un programme importé ouvre SON module, jamais POWER 12', () => {
    remplirMemoire([ligne(CLE)]);
    expect(modulePourCycle(CLE).id).toBe(CLE);
    // Retiré de la mémoire (programme disparu) : indisponible, pas POWER.
    remplirMemoire([]);
    expect(modulePourCycle(CLE).id).toBe(ID_PROGRAMME_INDISPONIBLE);
  });

  it('prévient ses abonnés à chaque changement, et plus après désabonnement', () => {
    let appels = 0;
    const fin = abonnerMemoire(() => appels++);
    remplirMemoire([ligne(CLE)]);
    remplirMemoire([]);
    fin();
    remplirMemoire([ligne(CLE)]);
    expect(appels).toBe(2);
  });

  it('remplace l’instantané au lieu de le modifier', () => {
    remplirMemoire([]);
    const a = lireMemoire();
    remplirMemoire([ligne(CLE)]);
    expect(lireMemoire()).not.toBe(a);
    expect(a.programmes).toEqual([]);
  });
});
