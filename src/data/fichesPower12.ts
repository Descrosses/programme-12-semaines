/**
 * Les fiches de mouvement de POWER 12 : quel mouvement montre quelle planche.
 *
 * ── Ce que sont ces fiches ────────────────────────────────────────────────
 *
 * Trente-cinq planches produites par Guillaume, un athlète dans un même décor,
 * chacune en trois temps : position de départ, contraction ou étirement,
 * position finale (le Broad Jump montre quatre phases sur une image, le
 * Suitcase Carry deux).
 * Contrairement à celles de MASS 4, elles ne portent aucun texte : elles
 * montrent la posture, les consignes restent celles de la carte.
 *
 * Elles sont livrées AVEC l'application, dans `public/fiches/`, et
 * pré-cachées par le même motif que celles de MASS 4 (`vite.config.ts`).
 *
 * ── Pourquoi une table écrite à la main ───────────────────────────────────
 *
 * Même raison que pour MASS 4 : une fiche rattachée au mauvais mouvement ne
 * casse rien et montre un faux geste. Chaque ligne a été vérifiée en
 * regardant la planche, pas son nom de fichier.
 *
 * Le préfixe `power12-` sépare ces fichiers de ceux de MASS 4, qui ont des
 * mouvements homonymes (`ab-wheel.webp`, `roman-side-bench.webp`) mais une
 * autre planche.
 *
 * ── Ce qui n'en a pas ─────────────────────────────────────────────────────
 *
 * Les autres mouvements du catalogue n'ont pas de planche : la carte garde
 * alors son comportement actuel (photo d'ambiance et « Ajouter la fiche
 * technique »). Une fiche déposée par la personne reste prioritaire sur la
 * planche livrée — voir `FicheTechnique.tsx`.
 */

export const FICHES_POWER12: Readonly<Record<string, string>> = {
  // ------------------------------------------------------------ lundi ---
  'pogo-jumps': 'power12-pogo-jumps.webp',
  'box-jump': 'power12-box-jump.webp',
  'bulgarian-split-squat': 'power12-bulgarian-split-squat.webp',
  rdl: 'power12-rdl.webp',
  'ab-wheel': 'power12-ab-wheel.webp',
  'roman-side-bench': 'power12-roman-side-bench.webp',

  // --------------------------------------------------------- mercredi ---
  'plyo-push-up': 'power12-plyo-push-up.webp',
  'bench-press': 'power12-bench-press.webp',
  'weighted-pullup': 'power12-weighted-pullup.webp',
  'landmine-press-kneeling': 'power12-landmine-press-kneeling.webp',
  'chest-supported-row': 'power12-chest-supported-row.webp',
  'face-pull': 'power12-face-pull.webp',
  'pallof-press': 'power12-pallof-press.webp',
  'cable-external-rotation': 'power12-cable-external-rotation.webp',

  // --------------------------------------------------------- vendredi ---
  'broad-jump': 'power12-broad-jump.webp', // une image, quatre phases
  'hang-high-pull': 'power12-hang-high-pull.webp',
  'push-press': 'power12-push-press.webp',
  'jump-squat-db': 'power12-jump-squat-db.webp',
  'explosive-cable-row': 'power12-explosive-cable-row.webp', // tirage assis, poulie basse
  'farmer-carry': 'power12-farmer-carry.webp',
  'lateral-bound': 'power12-lateral-bound.webp',
  'dead-bug-cable': 'power12-dead-bug-cable.webp',

  // ----------------------------------------------------------- samedi ---
  deadlift: 'power12-deadlift.webp',
  'front-squat': 'power12-front-squat.webp',
  'hip-thrust': 'power12-hip-thrust.webp',
  'nordic-curl': 'power12-nordic-curl.webp',
  'single-leg-rdl': 'power12-single-leg-rdl.webp',
  'copenhagen-plank': 'power12-copenhagen-plank.webp',
  'suitcase-carry': 'power12-suitcase-carry.webp', // deux temps

  // ---------------------------------------------------------- dimanche ---
  'incline-db-press': 'power12-incline-db-press.webp',
  'neutral-grip-pullup': 'power12-neutral-grip-pullup.webp',
  'one-arm-cable-row': 'power12-one-arm-cable-row.webp',
  'landmine-press-standing': 'power12-landmine-press-standing.webp',
  'cable-chop': 'power12-cable-chop.webp', // woodchop haut → bas
  'hanging-leg-raise': 'power12-hanging-leg-raise.webp',
};

/** Le chemin servi pour un mouvement, ou `undefined` s'il n'a pas de fiche. */
export function fichePower12(exerciceId: string): string | undefined {
  const fichier = FICHES_POWER12[exerciceId];
  return fichier === undefined ? undefined : `fiches/${fichier}`;
}
