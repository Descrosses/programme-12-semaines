/**
 * Les visuels photographiques de l'identité — déclarés ici, fournis par
 * Guillaume.
 *
 * ── Pourquoi un manifeste plutôt qu'un chemin en dur ───────────────────────
 *
 * L'appli doit être complète et belle AVANT que les images existent, et
 * complète et belle APRÈS. Une balise `<img>` pointant un fichier absent
 * laisse un cadre vide et une erreur 404 dans la console ; une photo
 * provisoire récupérée en ligne poserait un problème de droits et finirait
 * par rester.
 *
 * Donc : tant qu'un visuel n'est pas déclaré ici, l'emplacement affiche son
 * décor SVG seul — ce qui reste cohérent. Dès qu'il l'est, la photo prend sa
 * place sans qu'aucun écran ne change.
 *
 * ── Pour en ajouter un ─────────────────────────────────────────────────────
 *
 *   1. déposer le fichier dans `public/visuels/`
 *   2. passer son entrée de `null` au nom du fichier
 *
 * C'est tout. Rien d'autre à toucher.
 *
 * ── Contraintes ────────────────────────────────────────────────────────────
 *
 * AUCUN logo, aucune marque, aucun maillot reconnaissable : l'appli doit
 * pouvoir être commercialisée. Images originales, ou licence autorisant
 * explicitement l'usage commercial et la modification.
 *
 * Format WebP de préférence (PNG si la transparence l'exige), optimisé pour
 * téléphone. Budget total conseillé : 400 Ko pour l'ensemble des visuels —
 * au-delà, l'installation hors ligne double de poids.
 */

export interface VisuelSpec {
  /** Nom du fichier dans `public/visuels/`, ou `null` tant qu'il n'existe pas. */
  fichier: string | null;
  /** Ce qu'il doit montrer. Sert de cahier des charges, et de texte alternatif. */
  description: string;
  /** Dimensions conseillées, en pixels. */
  taille: string;
  /** Où il apparaît. */
  usage: string;
}

export const VISUELS = {
  ballon: {
    fichier: null,
    description:
      'Ballon de football américain de trois quarts, cuir texturé, coutures blanches, éclairage latéral de stade. Aucun logo.',
    taille: '800 × 800, fond transparent',
    usage: 'En-tête des écrans Aujourd’hui et Semaine, en haut à droite.',
  },
  stade: {
    fichier: null,
    description:
      'Stade américain de nuit, projecteurs allumés, vue basse depuis la pelouse. Tribunes floues, aucune marque lisible.',
    taille: '1200 × 600, WebP',
    usage: 'Bandeau d’en-tête des écrans Aujourd’hui et Combine.',
  },
  casque: {
    fichier: null,
    description:
      'Casque de football américain générique de profil, éclairage latéral, sans logo ni couleurs d’équipe identifiables.',
    taille: '600 × 600, fond transparent',
    usage: 'En-tête des écrans Nutrition et Progression.',
  },
} as const satisfies Record<string, VisuelSpec>;

export type VisuelNom = keyof typeof VISUELS;

/** Ce visuel est-il disponible ? */
export function visuelDisponible(nom: VisuelNom): boolean {
  return VISUELS[nom].fichier !== null;
}

/** L'URL du visuel, ou `null` s'il n'a pas encore été fourni. */
export function visuelUrl(nom: VisuelNom): string | null {
  const f = VISUELS[nom].fichier;
  return f === null ? null : `${import.meta.env.BASE_URL}visuels/${f}`;
}

/** La liste de ce qui manque — affichée dans Réglages, pour s'en souvenir. */
export function visuelsManquants(): Array<{ nom: VisuelNom } & VisuelSpec> {
  return (Object.keys(VISUELS) as VisuelNom[])
    .filter((n) => !visuelDisponible(n))
    .map((n) => ({ nom: n, ...VISUELS[n] }));
}
