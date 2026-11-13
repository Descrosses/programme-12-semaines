/**
 * À quoi sert chaque exercice de tronc.
 *
 * ── Pourquoi ce fichier ────────────────────────────────────────────────────
 *
 * Le programme range ses exercices de tronc par FONCTION — anti-extension,
 * anti-rotation, rotation, flexion latérale — et s'interdit d'en mettre deux
 * de la même famille le même jour (§8). Cette logique n'était écrite que
 * dans un test : sur la carte d'un Pallof Press, rien ne disait pourquoi on
 * le fait, ni en quoi il diffère d'un Ab Wheel.
 *
 * La table vit maintenant dans les données. La carte d'exercice l'affiche en
 * bandeau, et le test de répartition la lit au lieu de tenir sa propre
 * copie : une seule source, deux lecteurs.
 *
 * ── Ce qui vient du .md, et ce qui n'en vient pas ──────────────────────────
 *
 * Le RANGEMENT de chaque exercice dans sa famille vient du programme (§7,
 * §8). Les PHRASES d'utilité sont des définitions d'usage, écrites pour
 * l'écran et recopiées dans le .md (§8, « À quoi sert chaque exercice de
 * tronc ») : elles expliquent la famille, elles ne prescrivent rien.
 */

export type FamilleTronc =
  | 'anti-extension'
  | 'anti-rotation'
  | 'rotation'
  | 'flexion latérale'
  | 'porté symétrique'
  | 'porté antérieur'
  | 'stabilité globale';

export interface FonctionTronc {
  /** Le nom affiché en tête du bandeau. */
  nom: string;
  /** Ce que le tronc fait pendant l'exercice. */
  role: string;
  /** Ce que ça change sous la barre ou sur le terrain. */
  utilite: string;
}

export const FONCTIONS_TRONC: Readonly<Record<FamilleTronc, FonctionTronc>> = {
  'anti-extension': {
    nom: 'Anti-extension',
    role: 'Empêcher le bas du dos de se creuser.',
    utilite: 'C’est ce qui garde le tronc rigide sous un squat ou un deadlift lourd.',
  },
  'anti-rotation': {
    nom: 'Anti-rotation',
    role: 'Empêcher le buste de tourner quand une charge le tire de côté.',
    utilite: 'C’est ce qui transmet la force sans fuite quand un seul côté pousse ou tire.',
  },
  rotation: {
    nom: 'Rotation',
    role: 'Produire la rotation : elle part des hanches et traverse le tronc.',
    utilite: 'C’est le geste des frappes, des lancers et des changements de direction.',
  },
  'flexion latérale': {
    nom: 'Flexion latérale',
    role: 'Rester droit contre une charge d’un seul côté, ou se redresser contre elle.',
    utilite: 'Ce sont les obliques : ils empêchent le buste de s’affaisser sur un appui.',
  },
  'porté symétrique': {
    nom: 'Porté symétrique',
    role: 'Rester gainé en marchant, chargé des deux côtés.',
    utilite: 'Prise, épaules et tronc tiennent ensemble, sur la durée.',
  },
  'porté antérieur': {
    nom: 'Porté antérieur',
    role: 'Rester droit avec la charge devant soi.',
    utilite: 'Le haut du dos et les abdos empêchent le buste de s’enrouler.',
  },
  'stabilité globale': {
    nom: 'Stabilité globale',
    role: 'Garder le bassin immobile pendant que bras et jambes bougent.',
    utilite: 'Coordination du tronc en appui sur les mains.',
  },
};

/**
 * La famille de chaque exercice de tronc ou de porté.
 *
 * Y figurent aussi les exercices déprogrammés mais conservés au catalogue
 * (Zercher March, Bear Crawl, Copenhagen Plank) : une série déjà enregistrée
 * doit pouvoir dire à quoi elle servait.
 */
export const FAMILLE_TRONC: Readonly<Record<string, FamilleTronc>> = {
  'ab-wheel': 'anti-extension',
  'hanging-leg-raise': 'anti-extension',
  'dead-bug-cable': 'anti-extension',
  'pallof-press': 'anti-rotation',
  'cable-chop': 'rotation',
  'landmine-rotation': 'rotation',
  'roman-side-bench': 'flexion latérale',
  'suitcase-carry': 'flexion latérale',
  'barbell-offset-hold': 'flexion latérale',
  'copenhagen-plank': 'flexion latérale',
  'farmer-carry': 'porté symétrique',
  'zercher-march': 'porté antérieur',
  'bear-crawl': 'stabilité globale',
};

/** La fonction d'un exercice, ou `null` si ce n'est pas un exercice de tronc. */
export function fonctionTronc(exId: string): FonctionTronc | null {
  const famille = FAMILLE_TRONC[exId];
  return famille === undefined ? null : FONCTIONS_TRONC[famille];
}
