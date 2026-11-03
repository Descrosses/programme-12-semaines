/**
 * L'identité de la plateforme, en un seul endroit.
 *
 * ── Pourquoi centraliser un nom ───────────────────────────────────────────
 *
 * « Dcross-fit » était provisoire, et l'a été dit explicitement. Un nom
 * provisoire écrit en dur dans six écrans devient définitif par usure : au
 * moment de le changer, on en oublie deux, et l'application porte deux noms.
 *
 * Le passage de Dcross-fit à MAJK l'a confirmé : il a tenu en deux lignes de
 * ce fichier, plus les métadonnées d'affichage.
 *
 * Tout ce qui s'affiche ici est donc une constante. Le jour où le nom change,
 * c'est ce fichier qu'on modifie, et rien d'autre.
 *
 * Ce qui n'est PAS ici : le nom technique du dépôt, l'URL de publication, le
 * nom court du manifeste PWA. Ils sont figés par GitHub Pages et par les
 * raccourcis déjà installés sur les téléphones — les changer casserait les
 * installations existantes, et c'est une décision séparée.
 */

/**
 * Le nom affiché.
 *
 * MAJK s'écrit toujours en capitales, donc les deux constantes ont la même
 * valeur. Elles restent distinctes parce qu'elles disent deux choses
 * différentes — « le nom » et « le nom en capitales » — et qu'un nom futur
 * pourrait de nouveau les séparer.
 */
export const MARQUE = 'MAJK';

/** La version capitales, pour les bandeaux et la typographie condensée. */
export const MARQUE_CAPITALES = 'MAJK';

/** La signature sous le logo. */
export const SIGNATURE = 'Programmes · Progression · Performance';

/**
 * Le logo, servi depuis `public/marque/`.
 *
 * Les deux cartes — as et valet de cœur — sont fournies par Guillaume et ne
 * doivent pas être retouchées : ni recadrage, ni détourage, ni changement de
 * couleur. Les deux fichiers ci-dessous sont le PNG d'origine simplement
 * redimensionné pour l'écran, sans aucune autre transformation.
 */
/*
 * Les fichiers gardent leur ancien nom : ce sont des chemins servis, pas du
 * texte affiché. Les renommer n'apporterait rien et le brief demande de ne pas
 * toucher aux identifiants techniques.
 */
export const LOGO = {
  /** Affichage courant, jusqu'à 300 px de large. */
  petit: 'marque/logo-dcross-fit-petit.webp',
  /** Écrans à forte densité, ou affichage plus grand. */
  grand: 'marque/logo-dcross-fit.webp',
} as const;
