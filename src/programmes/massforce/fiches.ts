/**
 * Les fiches de mouvement de MASS FORCE (lot F1, audit des fiches MASS du
 * 14 novembre, validé par Guillaume).
 *
 * ── Ce que cette table réutilise ──────────────────────────────────────────
 *
 * Les planches MASS déjà livrées (`public/fiches/`, celles de MASS
 * CONGESTION), avec leur avatar MASS. Aucune image nouvelle, aucune planche de
 * POWER (`power12-*`) : chaque famille garde son avatar.
 *
 * ── Ce qu'elle ne contient PAS, exprès ────────────────────────────────────
 *
 * Seuls les mouvements dont une planche MASS montre le même geste avec le
 * même matériel (dix), plus deux rattachements décidés par Guillaume (lot
 * F2) : le leg curl prend la planche du leg curl allongé, les élévations
 * frontales celle des élévations alternées (il les fait ainsi). Les autres restent sans fiche plutôt qu'avec
 * une fausse :
 *
 * - pièges écartés : tirage horizontal LARGE (la planche est en prise serrée
 *   neutre), push press (la planche Smith est un développé strict, sans
 *   impulsion des jambes), développé incliné HALTÈRES (planches : incliné
 *   Smith, ou couché plat) ;
 * - barre au front et curl haltères : Guillaume génère leurs planches (barre
 *   W ; curl haltères), les planches actuelles ne conviennent pas ;
 * - quatorze mouvements sans planche MASS (lot F4).
 *
 * MASS CONGESTION a sa propre table (`mass4/fiches.ts`), inchangée : deux
 * programmes peuvent montrer le même fichier, leurs prescriptions restent
 * indépendantes.
 */

export const FICHES_FORCE: Readonly<Record<string, string>> = {
  // Lundi
  'mf-ecarte-couche': 'db-fly.webp', // « Écarté couché haltères »
  // Mardi
  'mf-tirage-supination-poulie': 'supinated-lat-pulldown.webp', // « … prise supination »
  'mf-pull-over-poulie': 'cable-pullover.webp', // « Pull over à la poulie »
  'mf-curl-barre-w': 'ez-curl.webp', // « Biceps curl barre W »
  // Jeudi
  'mf-squat-smith': 'smith-squat.webp', // « Squat Smith Machine »
  'mf-leg-extension': 'leg-extension.webp', // « Leg Extension assis »
  // Décision de Guillaume (lot F2) : le leg curl prend la planche du leg curl allongé.
  'mf-leg-curl': 'leg-curl.webp', // « Leg Curl allongé »
  'mf-fentes-arriere': 'db-lunge.webp', // « Fentes arrières haltères »
  // Vendredi
  // Décision de Guillaume (lot F2) : élévations frontales faites en alterné.
  'mf-elevations-frontales': 'front-raise.webp', // « Élévations frontales (… alternées) »
  'mf-elevations-laterales': 'lateral-raise.webp',
  'mf-oiseau-penche': 'bench-rear-delt-fly.webp', // « Oiseau sur banc incliné »
  'mf-pec-fly-inverse': 'reverse-pec-deck.webp', // « Oiseau à la machine (Reverse Pec Deck) »
};

/** Le chemin servi pour un exercice MASS FORCE, ou `undefined` sans fiche. */
export function fichePourForce(exerciceId: string): string | undefined {
  const fichier = FICHES_FORCE[exerciceId];
  return fichier === undefined ? undefined : `fiches/${fichier}`;
}
