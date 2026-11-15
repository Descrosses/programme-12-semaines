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
 * Dix planches de MASS CONGESTION montrant le même geste avec le même
 * matériel, deux rattachements décidés par Guillaume (leg curl → leg curl
 * allongé, élévations frontales → alternées), et quinze planches générées
 * par Guillaume pour MASS FORCE (lots F2 et F4), au même gabarit et avec le
 * même avatar MASS.
 *
 * Les pièges relevés à l'audit ont désormais LEUR planche — ne jamais les
 * rattacher aux voisines : tirage horizontal LARGE ≠ prise serrée
 * (`close-grip-cable-row`), push press ≠ développé militaire strict
 * (`smith-military-press`), incliné HALTÈRES ≠ incliné Smith.
 *
 * Les 28 exercices de MASS FORCE ont leur fiche. L'extension triceps allongé
 * a été refaite une fois : la première planche colorait l'avant du bras
 * (biceps) et annonçait deux fléchisseurs du coude.
 */

export const FICHES_FORCE: Readonly<Record<string, string>> = {
  // Lundi
  'mf-developpe-couche-barre': 'barbell-bench-press.webp', // « Développé couché (barre libre) »
  'mf-developpe-couche-smith': 'smith-bench-press.webp', // « Développé couché Smith machine »
  'mf-developpe-incline-halteres': 'incline-db-press.webp', // « Développé incliné haltères »
  'mf-ecarte-couche': 'db-fly.webp', // « Écarté couché haltères »
  // Planche générée par Guillaume (lot F2) : la barre au front en barre W,
  // comme le prescrit MASS FORCE (l'ancienne planche montre une barre droite).
  'mf-barre-au-front': 'ez-skull-crusher.webp', // « Barre front barre W »
  'mf-extension-triceps-allonge': 'db-lying-triceps-extension.webp', // vue de dos, triceps
  // Mardi
  'mf-tirage-vertical-poulie': 'lat-pulldown-cable.webp', // « Tirage vertical poulie haute »
  'mf-tirage-vertical-machine': 'lat-pulldown-machine.webp', // « … machine guidée »
  'mf-rowing-buste-penche': 'barbell-row.webp', // « Rowing buste penché »
  'mf-tirage-horizontal-large': 'wide-cable-row.webp', // « Tirage horizontal assis », barre LARGE
  'mf-tirage-supination-poulie': 'supinated-lat-pulldown.webp', // « … prise supination »
  'mf-tirage-supination-machine': 'supinated-machine-pulldown.webp', // « … machine guidée »
  'mf-pull-over-poulie': 'cable-pullover.webp', // « Pull over à la poulie »
  'mf-curl-barre-w': 'ez-curl.webp', // « Biceps curl barre W »
  // Planche générée par Guillaume : montée à intention de vitesse maximale.
  'mf-curl-halteres': 'db-alternating-curl.webp', // « Curl haltères alterné »
  // Jeudi
  'mf-squat-barre': 'barbell-squat.webp', // « Squat (barre libre) »
  'mf-squat-smith': 'smith-squat.webp', // « Squat Smith Machine »
  'mf-leg-extension': 'leg-extension.webp', // « Leg Extension assis »
  // Décision de Guillaume (lot F2) : le leg curl prend la planche du leg curl allongé.
  'mf-leg-curl': 'leg-curl.webp', // « Leg Curl allongé »
  'mf-fentes-avant': 'forward-lunge.webp', // « Fentes avant haltères »
  'mf-fentes-arriere': 'db-lunge.webp', // « Fentes arrières haltères »
  'mf-fentes-bulgares': 'bulgarian-split-squat.webp', // « Fentes bulgares haltères »
  // Vendredi
  'mf-push-press-smith': 'push-press-smith.webp', // impulsion des jambes visible
  'mf-push-press-barre': 'push-press-barbell.webp', // impulsion des jambes visible
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
