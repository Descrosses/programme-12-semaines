/**
 * Ce que MASS 4 mesure, et quand.
 *
 * ── Une phrase du document, et rien de plus ───────────────────────────────
 *
 * « Mesures : poids de corps (moyenne de 3 matins à jeun) et tour de bras,
 * relevés en semaine 1 et en semaine 4. »
 *
 * Deux mesures, deux relevés. Pas de 1RM, pas de saut, pas de sprint : le
 * combine de POWER 12 en relève onze, et aucune des onze n'est demandée ici.
 * C'est la raison pour laquelle MASS a un onglet Mesures et pas un onglet
 * Combine.
 *
 * ── Pourquoi ce fichier n'importe pas `data/exercises` ────────────────────
 *
 * `test-bodyweight` y existe, mais `test-arm-cm` n'y est pas — c'est une
 * mesure de MASS, et le catalogue d'exercices de POWER n'a pas à grossir pour
 * l'accueillir. Les deux mesures sont donc déclarées ici, dans les données du
 * programme qui les demande.
 *
 * ── Les pas de saisie, qui ne sont pas ceux de POWER ──────────────────────
 *
 * L'écran de combine de POWER règle le pas par unité : 2,5 kg pour les kilos,
 * 5 cm pour les centimètres. Ces valeurs conviennent à un 1RM et à un broad
 * jump ; appliquées ici elles donneraient un poids de corps au pas de 2,5 kg
 * et un tour de bras au pas de 5 cm, soit deux saisies inutilisables. Le pas
 * est donc porté par la mesure, pas par son unité.
 */

/** Les deux identifiants, tels qu'ils sont stockés dans `combines.metrics`. */
export const MESURES_MASS4 = ['test-bodyweight', 'test-arm-cm'] as const;

export interface MesureMass4 {
  readonly id: (typeof MESURES_MASS4)[number];
  readonly nom: string;
  /** Comment la prendre, pour que les deux relevés soient comparables. */
  readonly consigne: string;
  readonly unite: string;
  readonly pas: number;
  readonly min: number;
  readonly max: number;
}

export const DEFINITIONS_MESURES: readonly MesureMass4[] = [
  {
    id: 'test-bodyweight',
    nom: 'Poids de corps',
    consigne: 'Moyenne de 3 matins, à jeun, à la maison. Jamais en salle, jamais après une séance.',
    unite: 'kg',
    pas: 0.1,
    min: 40,
    max: 160,
  },
  {
    id: 'test-arm-cm',
    nom: 'Tour de bras',
    consigne:
      'Bras contracté, au point le plus large. Même bras, même mètre ruban, même moment de la journée que la première fois.',
    unite: 'cm',
    pas: 0.5,
    min: 20,
    max: 60,
  },
];

/**
 * Les deux relevés du cycle.
 *
 * On réutilise les phases `initial` et `final` de la table des combines
 * plutôt que d'en créer d'autres : la table est déjà rattachée au cycle, donc
 * les mesures d'un cycle MASS ne peuvent pas se mélanger à celles d'un cycle
 * POWER. La phase `s8` de POWER n'a pas d'équivalent ici — un programme de
 * quatre semaines n'a pas de relevé de semaine 8.
 */
export const RELEVES_MASS4 = [
  { id: 'initial', label: 'Début', quand: 'Semaine 1' },
  { id: 'final', label: 'Fin', quand: 'Semaine 4' },
] as const;
