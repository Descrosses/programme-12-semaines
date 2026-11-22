/**
 * Les fiches de mouvement de POWER 12 : quel mouvement montre quelle planche.
 *
 * ── Ce que sont ces fiches ────────────────────────────────────────────────
 *
 * Trente-six planches produites par Guillaume, un athlète dans un même décor,
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
  'back-squat': 'power12-back-squat.webp',
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

  // ---------------------------------------------------------- combiné ---
  // Deux tests du combiné (§12) n'ont aucun mouvement de séance derrière
  // eux : leur planche est la leur, rattachée directement à leur identifiant.
  'test-vertical-jump': 'power12-vertical-jump.webp', // trois temps : impulsion, élan des bras, apex
  'test-strict-pullup-max': 'power12-strict-pullup.webp', // poids de corps, de la suspension au menton
};

/**
 * Les exercices du combiné (§12) portent des identifiants à eux (`test-…`)
 * pour que leur historique reste séparé de celui des séances. Le MOUVEMENT,
 * lui, est le même : « Back Squat 1RM » est un back squat. Cette table dit,
 * pour chaque test, de quel mouvement il emprunte la planche.
 *
 * La planche n'est pas recopiée : le test lit celle du mouvement, donc les
 * deux ne peuvent pas diverger (une planche remplacée suit partout).
 *
 * Deux tests ont leur propre planche (Vertical Jump, Tractions strictes max)
 * et figurent directement dans `FICHES_POWER12`. Pour les tractions strictes,
 * on ne reprend pas la planche des tractions lestées : elle montre une ceinture
 * et un disque de 20 kg, ce n'est pas le geste du test — on ne rattache pas
 * la voisine.
 *
 * Sans planche : Sprint 10 m, Sprint 20 m, Poids de corps (rien à montrer).
 */
export const MOUVEMENT_DU_TEST: Readonly<Record<string, string>> = {
  'test-squat-1rm': 'back-squat',
  'test-bench-1rm': 'bench-press',
  'test-deadlift-1rm': 'deadlift',
  'test-weighted-pullup-1rm': 'weighted-pullup',
  'test-push-press-1rm': 'push-press',
  'test-broad-jump': 'broad-jump',
  'test-ab-wheel-max': 'ab-wheel',
  'test-leg-raise-max': 'hanging-leg-raise',
};

/**
 * Un mouvement de séance qui partage le GESTE d'un autre, et donc sa planche.
 *
 * Le Speed Squat est un back squat — plus léger (≈ 60 %), remontée à vitesse
 * maximale. La planche que Guillaume y avait déposée sur son téléphone était
 * celle du back squat, au pixel près : elle est désormais livrée à tous, sans
 * second fichier (une planche remplacée suit partout).
 */
export const MEME_GESTE: Readonly<Record<string, string>> = {
  'speed-squat': 'back-squat',
};

/**
 * La bibliothèque des exercices LIBRES de POWER : ceux qu'on tape à la main
 * pour remplacer un exercice (« Remplacer cet exercice »). Un nom reconnu —
 * le nom ou un de ses alias, casse et accents ignorés — reçoit sa planche.
 *
 * Décision de Guillaume (22 novembre) : « on étoffe la bibliothèque dès qu'on
 * peut ». Chaque entrée est une planche fournie et vérifiée (geste, matériel,
 * prise) ; elle ne s'affiche que sous un cycle POWER — jamais une image d'une
 * famille chez l'autre.
 */
export interface ExerciceLibre {
  nom: string;
  fichier: string;
  alias?: readonly string[];
}

export const BIBLIOTHEQUE_LIBRE_POWER: readonly ExerciceLibre[] = [
  {
    nom: 'Rowing buste penché',
    fichier: 'power12-rowing-buste-penche.webp', // barre, prise pronation, buste ≈ 45°
    alias: [
      'Rowing barre buste penché',
      'Rowing buste penché barre',
      'Rowing buste penché à la barre',
      'Bent over row',
      'Barbell bent over row',
    ],
  },
];

/** Le chemin servi pour un mouvement, ou `undefined` s'il n'a pas de fiche. */
export function fichePower12(exerciceId: string): string | undefined {
  const fichier =
    FICHES_POWER12[MOUVEMENT_DU_TEST[exerciceId] ?? MEME_GESTE[exerciceId] ?? exerciceId];
  return fichier === undefined ? undefined : `fiches/${fichier}`;
}
