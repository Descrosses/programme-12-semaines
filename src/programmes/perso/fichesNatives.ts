/**
 * Les fiches techniques livrées avec MAJK, désignables depuis un programme
 * importé.
 *
 * Une fiche native se désigne par une clé `programme:exercice`
 * (`power12:back-squat`). C'est une CLÉ, pas un nom : le fichier
 * d'illustrations la cite (`{ "majk": "power12:back-squat" }`) et le
 * rattachement est certain. Le nom ne sert qu'aux PROPOSITIONS de l'aperçu
 * (`proposerFiches`), que la personne confirme.
 *
 * Seules les images voyagent : les consignes, muscles et erreurs d'une
 * planche POWER restent à POWER. LADIES n'a pas de fiche.
 */

import { EXERCISES } from '../../data/exercises';
import { BIBLIOTHEQUE_LIBRE_POWER } from '../../data/fichesPower12';
import type { FicheCandidate } from '../../engine/perso/illustrations';
import { fichePour } from '../mass4/fiches';
import { TOUS_LES_EXERCICES_MASS4 } from '../mass4/exercices';
import { fichePourForce } from '../massforce/fiches';
import { SEANCES_FORCE } from '../massforce/seances';

export interface FicheNative {
  /** `power12:back-squat` */
  cle: string;
  nom: string;
  /** Le nom du programme, en mots. */
  programme: string;
  /** Le chemin servi, ex. `fiches/back-squat.webp`. */
  fiche: string;
  /** Autres noms sous lesquels l'aperçu d'un import la PROPOSE (bibliothèque libre). */
  alias?: readonly string[];
}

function construire(): FicheNative[] {
  const out: FicheNative[] = [];
  for (const e of Object.values(EXERCISES)) {
    if (e.fiche !== undefined) {
      out.push({ cle: `power12:${e.id}`, nom: e.name, programme: 'POWER', fiche: e.fiche });
    }
  }
  for (const e of TOUS_LES_EXERCICES_MASS4) {
    const fiche = fichePour(e.id);
    if (fiche !== undefined) {
      out.push({ cle: `mass4:${e.id}`, nom: e.nom, programme: 'MASS CONGESTION', fiche });
    }
  }
  // La bibliothèque des exercices LIBRES de POWER (Guillaume, 26 novembre :
  // « garde-les dans la bibliothèque dès que ce mouvement fera partie d'un
  // programme ») : UNE clé par mouvement, proposée sous son nom ET ses alias.
  for (const e of BIBLIOTHEQUE_LIBRE_POWER) {
    out.push({
      cle: `power12-libre:${e.fichier.replace(/^power12-/, '').replace(/\.webp$/, '')}`,
      nom: e.nom,
      programme: 'POWER',
      fiche: `fiches/${e.fichier}`,
      ...(e.alias === undefined ? {} : { alias: e.alias }),
    });
  }
  const vues = new Set<string>();
  for (const s of SEANCES_FORCE) {
    for (const l of s.lignes) {
      for (const o of l.options) {
        const fiche = fichePourForce(o.id);
        if (fiche === undefined || vues.has(o.id)) continue;
        vues.add(o.id);
        out.push({ cle: `mass-force:${o.id}`, nom: o.nom, programme: 'MASS FORCE', fiche });
      }
    }
  }
  return out;
}

let cache: FicheNative[] | null = null;

/** Toutes les fiches natives, une entrée par exercice qui en a une. */
export function fichesNatives(): readonly FicheNative[] {
  cache ??= construire();
  return cache;
}

/** Les clés désignables (`power12:…`), pour le validateur. */
export function clesFichesNatives(): ReadonlySet<string> {
  return new Set(fichesNatives().map((f) => f.cle));
}

/** Le chemin de la fiche d'une clé, ou `undefined` si elle n'existe pas (ou plus). */
export function ficheNative(cle: string): string | undefined {
  return fichesNatives().find((f) => f.cle === cle)?.fiche;
}

/** Les fiches natives comme candidates aux propositions de l'aperçu. */
export function candidatesNatives(): FicheCandidate[] {
  // Un nom ou un alias = une candidate ; la même image sous plusieurs noms
  // reste UNE planche pour `proposerFiches`.
  return fichesNatives().flatMap((f) =>
    [f.nom, ...(f.alias ?? [])].map((nom) => ({
      image: f.fiche,
      nom,
      origine: f.programme,
      lien: { majk: f.cle },
    })),
  );
}
