/**
 * Poser ou effacer un maximum, sans jamais écrire de zéro.
 *
 * Deux écrans saisissent les 1RM — le parcours d'accueil et les Réglages — et
 * les deux doivent les ranger de la même façon, sinon l'un laisserait des
 * valeurs que l'autre croit effacées.
 *
 * Un `Stepper` vidé renvoie `null`. Écrire `{ 'back-squat': null }` ferait
 * croire au moteur qu'un maximum existe et ne vaut rien ; `oneRM` est un
 * `Record<string, number>`, une valeur absente s'exprime par l'absence de clé.
 * On la retire donc pour de bon.
 *
 * Un zéro est refusé pour la même raison, en pire : zéro est une PERFORMANCE
 * aux yeux du moteur, et les jours de readiness rouge prescrivent 65 % du
 * maximum. Un zéro donnerait une barre vide présentée comme un plan.
 */
export function poseMaximum(
  actuel: Record<string, number>,
  id: string,
  valeur: number | null,
): Record<string, number> {
  const suite = { ...actuel };
  if (valeur === null || !Number.isFinite(valeur) || valeur <= 0) delete suite[id];
  else suite[id] = valeur;
  return suite;
}
