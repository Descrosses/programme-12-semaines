/**
 * Le verrou de la transformation Dcross-fit.
 *
 * Ce test ne vérifie pas une règle : il vérifie qu'AUCUNE règle n'a bougé. Il
 * recalcule l'empreinte complète du programme et la compare au fichier
 * commité. Tant qu'il passe, POWER 12 prescrit exactement ce qu'il prescrivait
 * avant la refonte.
 *
 * ── Si ce test échoue ──────────────────────────────────────────────────────
 *
 * Vitest affiche les lignes qui diffèrent. Deux cas, et un seul est bénin :
 *
 * 1. Le changement n'était pas voulu → c'est une régression. Corriger le code,
 *    pas le fichier.
 * 2. Le changement était voulu et validé → régénérer avec
 *    `EMPREINTE_MAJ=1 npx vitest run src/engine/empreinte.test.ts`, puis
 *    RELIRE LE DIFF avant de commiter. Un fichier régénéré sans être relu ne
 *    protège plus rien.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { compterLignes, empreinte } from './empreinte';

const CHEMIN = fileURLToPath(new URL('./__fixtures__/empreinte.txt', import.meta.url));

describe('empreinte du programme', () => {
  it('est identique au fichier de référence', () => {
    const calculee = empreinte();

    if (process.env.EMPREINTE_MAJ === '1') {
      writeFileSync(CHEMIN, calculee, 'utf8');
    }

    const reference = readFileSync(CHEMIN, 'utf8');
    expect(calculee).toBe(reference);
  });

  it('couvre bien tout le programme et pas trois séances', () => {
    const lignes = compterLignes(empreinte());

    /*
     * Un seuil bas, pas un chiffre exact : le but est d'attraper une empreinte
     * vidée par accident — un `continue` trop large, un contexte qui ne se
     * construit plus. Le chiffre exact, lui, est déjà protégé par le test
     * ci-dessus, ligne à ligne.
     */
    expect(lignes).toBeGreaterThan(1000);
  });

  it('ne dépend ni de l’horloge ni de l’ordre d’exécution', () => {
    expect(empreinte()).toBe(empreinte());
  });
});
