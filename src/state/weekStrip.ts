/**
 * Garder la semaine choisie sous les yeux, dans la bande des treize.
 *
 * ── Le défaut ───────────────────────────────────────────────────────────────
 *
 * Choisir la semaine 8 ramenait la bande au début : la pastille active partait
 * hors de l'écran, et il fallait refaire défiler pour se repérer. Les semaines
 * 1 à 6 semblaient épargnées, simplement parce qu'elles sont déjà visibles
 * quand la bande est à zéro.
 *
 * ── Ce que fait ce calcul ───────────────────────────────────────────────────
 *
 * Il dit où placer la bande pour que la pastille active tombe au MILIEU de ce
 * qu'on voit. Au milieu et non simplement « visible » : on choisit une semaine
 * pour regarder ce qu'il y a autour, et une pastille collée au bord cache la
 * moitié de ce contexte.
 *
 * Aux deux extrémités, le centrage est impossible et c'est tant mieux : la
 * bande se cale sur son début ou sa fin, ce qui montre le plus de semaines
 * possible. Les bornes s'en chargent, sans cas particulier.
 */

export interface MesuresBande {
  /** Largeur visible de la bande. */
  visible: number;
  /** Largeur totale, défilement compris. */
  totale: number;
  /** Position de la pastille DANS la bande, et sa largeur. */
  gauche: number;
  largeur: number;
}

/**
 * Le `scrollLeft` à poser pour centrer la pastille, borné aux extrémités.
 *
 * Rend 0 sur une mesure absente ou aberrante : ne pas défiler est toujours
 * préférable à défiler n'importe où.
 */
export function defilementPourCentrer(m: MesuresBande): number {
  const valeurs = [m.visible, m.totale, m.gauche, m.largeur];
  if (valeurs.some((v) => !Number.isFinite(v))) return 0;
  if (m.visible <= 0 || m.totale <= 0) return 0;

  // Tout tient à l'écran : il n'y a rien à faire défiler.
  const max = m.totale - m.visible;
  if (max <= 0) return 0;

  const centre = m.gauche + m.largeur / 2 - m.visible / 2;
  return Math.round(Math.min(max, Math.max(0, centre)));
}
