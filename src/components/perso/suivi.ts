/**
 * Le décompte de suivi d'un programme importé, en une phrase (ADR D2).
 *
 * « Suivi complet » seulement si TOUTES les lignes se jouent série par série.
 * Sinon « Suivi partiel : X exercices sur Y » : MAJK ne juge pas ce qui est
 * essentiel, une seule ligne consultable suffit à le dire.
 *
 * Pur : aucun React, aucune base.
 */

import type { ProgrammeNormalise } from '../../engine/perso/types';

export function lignesDe(doc: ProgrammeNormalise) {
  return doc.semaines.flatMap((b) => b.seances.flatMap((s) => s.lignes));
}

export function phraseSuivi(doc: ProgrammeNormalise): string {
  const lignes = lignesDe(doc);
  const compatibles = lignes.filter((l) => l.etat === 'compatible').length;
  return compatibles === lignes.length
    ? 'Suivi complet'
    : `Suivi partiel : ${String(compatibles)} exercice${compatibles > 1 ? 's' : ''} sur ${String(lignes.length)}`;
}
