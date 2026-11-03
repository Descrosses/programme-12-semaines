/**
 * Les fiches de mouvement de MASS 4 : quel mouvement montre quelle planche.
 *
 * ── Ce que sont ces fiches ────────────────────────────────────────────────
 *
 * Trente infographies d'exécution produites par Guillaume — position de
 * départ, contraction, fin du mouvement, muscles ciblés, points clés — une par
 * mouvement du programme. Elles sont livrées AVEC l'application, dans
 * `public/fiches/`, et pré-cachées : la question « comment on fait ce
 * mouvement, déjà ? » se pose en salle, c'est-à-dire exactement là où le
 * réseau manque.
 *
 * ── Pourquoi une table écrite à la main ───────────────────────────────────
 *
 * Nos identifiants sont français (`oiseau-machine`), les fichiers sont en
 * anglais (`reverse-pec-deck.webp`). Aucune règle de transformation ne relie
 * les deux, et tenter d'en déduire une donnerait tôt ou tard la fiche d'un
 * autre mouvement — une erreur silencieuse, et une erreur sportive : montrer
 * un écarté à la place d'un développé incliné fait travailler autre chose.
 *
 * Chaque ligne a donc été vérifiée en comparant le nom affiché des deux côtés,
 * pas le nom du fichier. Le nom de référence est reporté en commentaire quand
 * il diffère du nôtre, pour que la vérification reste refaisable sans rouvrir
 * l'autre dépôt.
 *
 * Un test vérifie deux choses qu'on ne verrait pas autrement : que les trente
 * mouvements ont tous une fiche, et que chaque fichier déclaré existe
 * réellement sur le disque. Un nom de fichier faux ne casse rien — il affiche
 * une image vide, au moment où l'on en a le plus besoin.
 */

export const FICHES_MASS4: Readonly<Record<string, string>> = {
  // ----------------------------------------------------------- épaules ---
  'oiseau-machine': 'reverse-pec-deck.webp', // « Oiseau à la machine (reverse pec deck) »
  'developpe-militaire-smith': 'smith-military-press.webp', // « … à la Smith machine »
  'elevations-laterales': 'lateral-raise.webp',
  'elevations-frontales-unilat': 'front-raise.webp',
  'oiseau-banc-halteres': 'bench-rear-delt-fly.webp', // « Oiseau sur banc, haltères »

  // ------------------------------------------------------------- bras ---
  'barre-au-front': 'skull-crusher.webp',
  'curl-barre-ez': 'ez-curl.webp', // « Curl biceps barre EZ »
  'curl-halteres-alterne': 'db-curl.webp', // « Curl haltères debout, alterné »
  'curl-machine': 'machine-curl.webp', // « Curl biceps à la machine »
  'extension-triceps-corde': 'triceps-pushdown.webp', // « Extension triceps poulie, corde »
  'dips-banc': 'bench-dips.webp',

  // -------------------------------------------------------------- dos ---
  'tirage-vertical-supination': 'supinated-lat-pulldown.webp',
  'tirage-vertical-unilateral': 'single-arm-pulldown.webp', // « … machine, prise supination »
  'tirage-horizontal-serre': 'close-grip-cable-row.webp',
  'pull-over-poulie': 'cable-pullover.webp', // « Pull over à la poulie »
  'rowing-bucheron': 'db-row-elbow-out.webp', // « Rowing bûcheron, coude à 45° »
  'shrugs-halteres': 'db-shrug.webp',

  // ------------------------------------------------------------- pecs ---
  'ecarte-poulie-basse': 'cable-fly-low-high.webp', // « Écarté poulie basse (bas vers haut) »
  'developpe-incline-smith': 'smith-incline-press.webp', // « … à la Smith machine »
  'developpe-couche-halteres': 'db-bench-press.webp',
  'ecarte-couche-halteres': 'db-fly.webp',
  'pull-over-haltere': 'db-pullover.webp', // « Pull over allongé, haltère »

  // ----------------------------------------------------------- jambes ---
  'squat-smith': 'smith-squat.webp', // « Squat à la Smith machine »
  'leg-extension': 'leg-extension.webp', // « Leg extension assis »
  'leg-curl-allonge': 'leg-curl.webp',
  'fentes-halteres': 'db-lunge.webp', // « Fentes avant ou arrière, haltères »

  // ------------------------------------------------------------ tronc ---
  'gainage-debout-valise': 'suitcase-hold.webp', // « Gainage debout, une haltère »
  'ab-wheel': 'ab-wheel.webp',
  'roman-side-bench': 'roman-side-bench.webp', // « … haltère ou kettlebell »
  'releve-de-buste': 'back-extension.webp', // « Relevé de buste (lombaires) »
};

/** Le chemin servi pour un mouvement, ou `undefined` s'il n'a pas de fiche. */
export function fichePour(exerciceId: string): string | undefined {
  const fichier = FICHES_MASS4[exerciceId];
  return fichier === undefined ? undefined : `fiches/${fichier}`;
}
