/**
 * Le rappel de sauvegarde du dernier jour d'entraînement de la semaine.
 *
 * Décision de Guillaume : l'appli conseille, le dernier jour d'entraînement
 * de chaque semaine, d'exporter ses données. En cas de pépin (téléphone
 * perdu, données du navigateur effacées), on ne perd alors jamais plus d'une
 * semaine — au lieu d'un programme entier.
 *
 * Le « dernier jour » est celui du PROGRAMME, pas du calendrier : le dernier
 * jour qui porte une séance dans la semaine (le dimanche pour POWER, le
 * samedi pour un programme importé qui s'arrête le samedi, etc.).
 *
 * Un conseil, jamais une obligation : rien ne bloque, et le rappel se tait
 * dès qu'un export a été fait le jour même.
 *
 * Pur : ni base, ni React, ni date du jour (passée en argument).
 */

export type EtatRappel = 'conseiller' | 'fait';

/** Le jour est-il le dernier de la semaine qui porte une séance ? */
export function estDernierJourDEntrainement(jours: readonly number[], jour: number): boolean {
  return jours.length > 0 && Math.max(...jours) === jour;
}

/**
 * `null` : pas de rappel ici (ce n'est pas le dernier jour de la semaine).
 * `'fait'` : un export a déjà été fait aujourd'hui.
 * `'conseiller'` : on conseille l'export.
 */
export function etatRappelSauvegarde(o: {
  joursDeLaSemaine: readonly number[];
  jour: number;
  /** `YYYY-MM-DD` du dernier export sur cet appareil, `null` si aucun. */
  dernierExport: string | null;
  /** `YYYY-MM-DD`, date locale. */
  aujourdhui: string;
}): EtatRappel | null {
  if (!estDernierJourDEntrainement(o.joursDeLaSemaine, o.jour)) return null;
  return o.dernierExport !== null && o.dernierExport >= o.aujourdhui ? 'fait' : 'conseiller';
}
