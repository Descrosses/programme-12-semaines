/**
 * Les mouvements que l'écran Progrès de MASS 4 suit.
 *
 * ── Pourquoi une donnée du programme et pas une constante d'écran ─────────
 *
 * Parce qu'une erreur d'identifiant ici ne casse rien : elle vide simplement
 * la courbe. L'écran affiche « Rien d'enregistré pour l'instant » alors que
 * les séries ont bien été validées, et personne ne sait dire pourquoi. Posés
 * ici, ces identifiants sont vérifiés par un test contre le catalogue et
 * contre les séances réelles.
 *
 * Le choix des quatre : le mouvement poly-articulaire lourd de chacune des
 * quatre séances de la semaine — un par séance, jamais deux.
 *
 * Ce n'est PAS le premier exercice de chaque séance, et c'est une nuance de
 * programmation, pas un détail : deux séances sur quatre ouvrent par un
 * mouvement d'isolation qui pré-fatigue le muscle avant le gros mouvement
 * (l'oiseau avant le développé militaire, l'écarté avant l'incliné). C'est
 * une méthode de congestion, et prendre « le premier » donnerait donc une
 * courbe d'écarté poulie là où on veut celle du développé incliné.
 */

export const MOUVEMENTS_SUIVIS: ReadonlyArray<{ id: string; label: string }> = [
  { id: 'developpe-incline-smith', label: 'Incliné' },
  { id: 'tirage-vertical-supination', label: 'Tirage' },
  { id: 'developpe-militaire-smith', label: 'Militaire' },
  { id: 'squat-smith', label: 'Squat' },
];
