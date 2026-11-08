/**
 * LE PLAN QUE L'UTILISATEUR COMPOSE LUI-MÊME.
 *
 * ── À quoi ça sert ────────────────────────────────────────────────────────
 *
 * Une cible — 2 800 kcal, 160 g de protéines — ne dit pas quoi mettre dans
 * l'assiette. Le plan historique de Guillaume le dit, mais c'est le SIEN :
 * ses neuf prises, ses aliments, ses horaires. Le servir à quelqu'un d'autre
 * reviendrait à lui prescrire la diète d'un inconnu.
 *
 * Ce module donne la troisième voie : la structure est fournie — cinq repas,
 * quatre groupes par repas — et le CONTENU vient de la personne. Ses aliments
 * à elle, ceux qu'elle a déclarés dans son questionnaire ; ses quantités à
 * elle, qu'elle règle jusqu'à tomber sur sa cible.
 *
 * L'APPLICATION NE PROPOSE AUCUNE QUANTITÉ, et c'est le point. Elle additionne
 * et elle affiche l'écart. Suggérer « 250 g de riz », ce serait prescrire —
 * exactement ce que ce dépôt refuse de faire depuis le début.
 *
 * ── Pourquoi quatre groupes et pas les huit familles du catalogue ─────────
 *
 * Parce que personne ne compose un repas en pensant « légumineuse ». On pense
 * glucides, protéines, lipides, et des légumes autour. Les huit familles
 * restent la vérité du catalogue — elles servent la recherche et les
 * substitutions — et ces quatre groupes sont la lecture qu'on en fait au
 * moment de remplir une assiette.
 */

import type { DayKind, FoodCategory } from './nutrition';

/**
 * Les cinq repas, dans l'ordre de la journée.
 *
 * Ce sont des IDENTIFIANTS STABLES, jamais des libellés : renommer
 * « Collation du matin » doit être sans conséquence, renommer `collation1`
 * effacerait silencieusement tout ce qu'on y avait mis.
 *
 * Cinq et pas neuf : neuf, c'est le plan de Guillaume, construit pour un
 * pratiquant qui se lève à 5 h 45. Cinq couvre la journée de tout le monde,
 * et un repas vide ne coûte rien à l'écran — il se replie.
 */
export const REPAS_PERSO = [
  { id: 'pdej', nom: 'Petit-déjeuner' },
  { id: 'collation1', nom: 'Collation du matin' },
  { id: 'dejeuner', nom: 'Déjeuner' },
  { id: 'collation2', nom: 'Collation de l’après-midi' },
  { id: 'diner', nom: 'Dîner' },
] as const;

export type RepasId = (typeof REPAS_PERSO)[number]['id'];

/**
 * Les quatre groupes d'un repas, et les familles du catalogue qu'ils
 * rassemblent.
 *
 * Les lentilles et les haricots rouges vont aux PROTÉINES, pas aux glucides :
 * c'est pour leurs protéines qu'on les met dans une assiette, et c'est là que
 * le questionnaire les range déjà. Le skyr aussi — un laitier maigre est une
 * source de protéines avant d'être autre chose.
 *
 * `autre` n'a pas de groupe : ce sont les condiments et les hors-catégories.
 * Ils restent accessibles par le sélecteur d'aliments de la journée, mais ils
 * n'ont rien à faire dans la construction d'un repas.
 */
export const GROUPES_REPAS = [
  { id: 'glucides', nom: 'Glucides', familles: ['feculent'] },
  { id: 'proteines', nom: 'Protéines', familles: ['proteine', 'laitier', 'legumineuse'] },
  { id: 'lipides', nom: 'Lipides', familles: ['gras'] },
  { id: 'vegetaux', nom: 'Fruits et légumes', familles: ['fruit', 'legume'] },
] as const satisfies ReadonlyArray<{
  id: string;
  nom: string;
  familles: readonly FoodCategory[];
}>;

export type GroupeId = (typeof GROUPES_REPAS)[number]['id'];

/** Le groupe d'une famille du catalogue, ou `null` pour `autre`. */
export function groupeDeFamille(famille: FoodCategory): GroupeId | null {
  return (
    GROUPES_REPAS.find((g) => (g.familles as readonly FoodCategory[]).includes(famille))?.id ?? null
  );
}

/** Une quantité d'un aliment, dans un repas. */
export interface LignePerso {
  /** Identifiant du catalogue ou d'un aliment personnalisé. */
  foodId: string;
  /** Dans l'unité de l'aliment : grammes, millilitres ou unités. */
  qty: number;
}

/** Le contenu d'une journée : ce qu'il y a dans chacun des cinq repas. */
export type JourneePerso = Partial<Record<RepasId, readonly LignePerso[]>>;

/**
 * Le plan complet : une journée d'entraînement, une journée de repos.
 *
 * DEUX JOURNÉES ET PAS UNE, parce que la cible elle-même en a deux. Un plan
 * unique obligerait à rater l'une des deux cibles tous les jours.
 *
 * Elles se remplissent séparément, mais rarement de zéro : `copierJournee`
 * recopie l'entraînement vers le repos, et il ne reste qu'à baisser les
 * féculents — c'est exactement ce que fait le plan historique, « mêmes
 * aliments, seuls les féculents baissent ».
 */
export type PlanPerso = Record<DayKind, JourneePerso>;

export const PLAN_PERSO_VIDE: PlanPerso = { train: {}, rest: {} };

/**
 * Pose une quantité, ou retire la ligne quand elle tombe à zéro.
 *
 * Zéro n'est pas une quantité : c'est l'absence de l'aliment. Garder une
 * ligne à 0 g laisserait traîner dans le plan des aliments qu'on a retirés,
 * et l'écran les afficherait comme s'ils comptaient.
 */
export function poserQuantite(
  journee: JourneePerso,
  repas: RepasId,
  foodId: string,
  qty: number | null,
): JourneePerso {
  const lignes = journee[repas] ?? [];
  const sans = lignes.filter((l) => l.foodId !== foodId);
  const valide = qty !== null && Number.isFinite(qty) && qty > 0;
  const suivantes = valide ? [...sans, { foodId, qty }] : sans;
  if (suivantes.length === 0) {
    const { [repas]: _retire, ...reste } = journee;
    return reste;
  }
  return { ...journee, [repas]: suivantes };
}

/** La quantité posée pour un aliment dans un repas, ou `null`. */
export function quantiteDe(journee: JourneePerso, repas: RepasId, foodId: string): number | null {
  return journee[repas]?.find((l) => l.foodId === foodId)?.qty ?? null;
}

/** Y a-t-il quoi que ce soit dans cette journée ? */
export function journeeVide(journee: JourneePerso): boolean {
  return REPAS_PERSO.every((r) => (journee[r.id]?.length ?? 0) === 0);
}

/**
 * Recopie une journée vers l'autre, à l'identique.
 *
 * Volontairement à l'identique, et pas « avec les féculents baissés » : de
 * combien, l'application n'en sait rien, et le deviner serait prescrire. Elle
 * épargne la re-saisie, la décision reste à la personne.
 */
export function copierJournee(plan: PlanPerso, de: DayKind, vers: DayKind): PlanPerso {
  return { ...plan, [vers]: { ...plan[de] } };
}
