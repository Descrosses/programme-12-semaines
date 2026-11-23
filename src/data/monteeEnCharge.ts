/**
 * La montée en charge avant le premier mouvement lourd polyarticulaire de la
 * séance (décision de Guillaume, 23 novembre).
 *
 * Transcription du §6 de `programme-final-12-semaines.md` et du §2 bis de
 * `programme-mass-force.md` : le même tableau dans les deux documents.
 * `monteeEnCharge.test.ts` relit les deux et compare case par case.
 *
 * Aucune logique ici : le calcul des kilos vit dans `engine/monteeEnCharge.ts`.
 */

export interface PalierMontee {
  /** Les répétitions, telles qu'écrites : « 5 », « 2-3 ». */
  readonly reps: string;
  /** Le pourcentage de la charge de travail, ou une fourchette (« 90-95 »). */
  readonly pct: readonly [number] | readonly [number, number];
}

export const PALIERS_MONTEE: readonly PalierMontee[] = [
  { reps: '5', pct: [50] },
  { reps: '3', pct: [70] },
  { reps: '2-3', pct: [85] },
  { reps: '2', pct: [90, 95] },
];

/** « 1 min de repos entre ces séries ». */
export const REPOS_MONTEE_SEC = 60;

/** Le pourquoi, pour un débutant — mot pour mot la phrase du .md. */
export const POURQUOI_MONTEE =
  'Le but : générer progressivement une tension et un stress musculaire et tendineux suffisants pour être prêt pour les vraies séries de travail.';
