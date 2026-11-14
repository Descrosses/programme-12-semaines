/**
 * Enregistrer une série, ou dire pourquoi elle ne l'est pas (P1-B, lot de
 * stabilisation).
 *
 * Régression : quand l'écriture IndexedDB échouait (stockage plein, base
 * verrouillée…), l'erreur partait dans la console et rien ne s'affichait. La
 * série n'était pas enregistrée — c'était juste —, mais on pouvait croire
 * l'avoir validée.
 *
 * Règle : une série n'est considérée comme enregistrée qu'APRÈS confirmation
 * de l'écriture. Tant que ce n'est pas le cas, on rend la phrase à afficher.
 */
export async function enregistrerOuSignaler(
  enregistrer: () => Promise<void>,
): Promise<string | null> {
  try {
    await enregistrer();
    return null;
  } catch (e) {
    const raison = e instanceof Error && e.message.trim() !== '' ? ` (${e.message.trim()})` : '';
    return `Série non enregistrée${raison}. Rien n’a été compté : réessaie.`;
  }
}
