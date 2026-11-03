/**
 * Les garde-fous des fiches de mouvement.
 *
 * Ce qu'ils empêchent : une fiche manquante ou un nom de fichier faux. Ni
 * l'un ni l'autre ne plante — l'application affiche un bouton qui ouvre une
 * image vide, ou n'affiche pas de bouton du tout. On ne s'en aperçoit qu'en
 * salle, devant une machine qu'on ne sait pas utiliser.
 */

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { EXERCICES_MASS4 } from './exercices';
import { FICHES_MASS4, fichePour } from './fiches';

const DOSSIER = join(process.cwd(), 'public', 'fiches');

describe('fiches de mouvement de MASS 4', () => {
  it('donne une fiche à chacun des mouvements du programme', () => {
    const sans = Object.keys(EXERCICES_MASS4).filter((id) => FICHES_MASS4[id] === undefined);
    expect(sans).toEqual([]);
  });

  it('ne déclare aucune fiche pour un mouvement qui n’existe pas', () => {
    /*
     * L'autre sens : une entrée orpheline signale un identifiant renommé d'un
     * côté et pas de l'autre, donc un mouvement qui a perdu sa fiche sans que
     * le premier test s'en aperçoive.
     */
    const orphelines = Object.keys(FICHES_MASS4).filter((id) => EXERCICES_MASS4[id] === undefined);
    expect(orphelines).toEqual([]);
  });

  it('pointe vers des fichiers qui existent réellement', () => {
    const manquants = Object.values(FICHES_MASS4).filter((f) => !existsSync(join(DOSSIER, f)));
    expect(manquants).toEqual([]);
  });

  it('ne fait pas pointer deux mouvements vers la même planche', () => {
    /*
     * Une fiche partagée serait forcément une erreur de copie : chaque
     * mouvement a la sienne, et deux mouvements distincts qui affichent la
     * même image en montrent un faux à l'un des deux.
     */
    const fichiers = Object.values(FICHES_MASS4);
    expect(new Set(fichiers).size).toBe(fichiers.length);
  });

  it('sert un chemin relatif, jamais absolu', () => {
    // Le site est publié dans un sous-dossier : un chemin commençant par « / »
    // sortirait de la base et renverrait un 404 en production seulement.
    expect(fichePour('oiseau-machine')).toBe('fiches/reverse-pec-deck.webp');
    expect(fichePour('mouvement-inconnu')).toBeUndefined();
  });
});
