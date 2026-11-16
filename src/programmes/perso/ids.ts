/**
 * Les identifiants des programmes importés (ME, MYSELF & I).
 *
 * Trois identifiants à ne pas confondre : l'`uid` désigne le programme toutes
 * versions confondues (il vient du fichier) ; la CLÉ désigne une version
 * (`perso-<uid>-<rev>`, attribuée par MAJK) ; un exercice importé porte la clé
 * de sa version devant son identifiant local.
 *
 * Pur : ni base, ni React.
 */

/** Le préfixe réservé : aucun programme compilé ne commence ainsi. */
export const PREFIXE_PERSO = 'perso-';

/** `perso-<uid>-<rev>` — l'uid ne contient ni tiret ni majuscule. */
const CLE = /^perso-([a-z0-9]{8,24})-([1-9][0-9]*)$/;

export function clePerso(uid: string, rev: number): string {
  return `${PREFIXE_PERSO}${uid}-${String(rev)}`;
}

export function lireCle(cle: string): { uid: string; rev: number } | null {
  const m = CLE.exec(cle);
  return m === null ? null : { uid: m[1]!, rev: Number(m[2]) };
}

/**
 * L'identifiant d'un exercice importé, tel que l'historique l'enregistrera.
 *
 * Préfixé par la clé de VERSION : la même « squat » de deux programmes, ou de
 * deux versions d'un programme, ne partage ni historique ni image de
 * référence. Aucune performance n'est attribuée d'office à un autre
 * programme.
 */
export function idExerciceImporte(cle: string, idLocal: string): string {
  return `${cle}-${idLocal}`;
}
