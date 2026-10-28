/**
 * Les visuels photographiques de l'identité — pack « NFL Classic Premium V1 ».
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
 * ── Deux tailles, une seule qui se charge ──────────────────────────────────
 *
 * Chaque visuel existe en `mobile` (640 px de large) et en `display`
 * (1200 px). Le navigateur n'en télécharge QU'UNE, choisie par `srcSet` et
 * `sizes` selon la largeur réelle de l'emplacement et la densité de l'écran.
 * Sur un iPhone, un bandeau pleine largeur prend la version display ; une
 * vignette de carte prend la mobile.
 *
 * ── Marques tierces ────────────────────────────────────────────────────────
 *
 * Le pack livré contenait des marques visibles : un logo et un lettrage
 * Under Armour sur le montage (04), un virgule Nike sur la chaussure du
 * sprint (05), sur le maillot du développé couché (06) et sur le short de la
 * réception (07). Elles ont été effacées des fichiers eux-mêmes, pas
 * seulement masquées par un cadrage : un recadrage CSS laisse la marque dans
 * les octets servis, ce qui ne vaut rien pour une appli destinée à la vente.
 *
 * Cela ne vaut PAS validation des droits. Ces images sont des générations
 * d'IA ; le guide du pack le dit lui-même. Avant toute commercialisation il
 * faut soit des photos sous licence commerciale explicite, soit des prises de
 * vue faites pour l'occasion.
 *
 * ── Pour en ajouter un ─────────────────────────────────────────────────────
 *
 *   1. déposer les deux fichiers dans `public/visuels/`
 *   2. ajouter l'entrée ici
 *
 * C'est tout. Rien d'autre à toucher.
 */

export interface VisuelSpec {
  /** Fichier 1200 px dans `public/visuels/`, ou `null` tant qu'il n'existe pas. */
  display: string | null;
  /** Fichier 640 px, servi aux petits emplacements. */
  mobile: string | null;
  /** Largeur en pixels de chaque variante, pour `srcSet`. */
  largeurs: { display: number; mobile: number };
  /** Ce qu'il montre. Sert de cahier des charges, et de texte alternatif. */
  description: string;
  /** Cadrage attendu : `cover` recadre, `contain` montre tout l'objet. */
  cadrage: 'cover' | 'contain';
  /**
   * Point d'intérêt, en `object-position`. C'est ce qui décide de ce qu'on
   * garde quand un bandeau de 390 × 150 recadre une image de 1200 × 675.
   */
  focus: string;
  /** Où il apparaît. */
  usage: string;
}

export const VISUELS = {
  ballon: {
    display: '01_ballon_display.webp',
    mobile: '01_ballon_mobile.webp',
    largeurs: { display: 1200, mobile: 640 },
    description: 'Ballon de football américain posé sur l’herbe, cuir texturé, coutures blanches.',
    cadrage: 'contain',
    focus: 'center',
    usage: 'Vignette, jamais en bandeau : la source est sur fond blanc.',
  },
  stade: {
    display: '02_stade_display.webp',
    mobile: '02_stade_mobile.webp',
    largeurs: { display: 1200, mobile: 640 },
    description:
      'Stade de football américain illuminé de nuit, projecteurs allumés, vue basse depuis la ligne des 50 yards.',
    cadrage: 'cover',
    focus: 'center 62%',
    usage: 'Bandeau d’en-tête : Aujourd’hui, Combine.',
  },
  casque: {
    display: '03_casque_display.webp',
    mobile: '03_casque_mobile.webp',
    largeurs: { display: 1200, mobile: 640 },
    description:
      'Casque de football américain rouge de profil sur la pelouse, projecteurs de stade en arrière-plan.',
    cadrage: 'cover',
    focus: '58% center',
    usage: 'Bandeau d’en-tête : Semaine.',
  },
  athlete: {
    display: '04_montage_athlete_display.webp',
    mobile: '04_montage_athlete_mobile.webp',
    largeurs: { display: 1097, mobile: 585 },
    description:
      'Montage d’un athlète de football américain : portrait, sprint, développé couché et réception.',
    cadrage: 'cover',
    focus: 'center 28%',
    usage: 'Carte de présentation du programme. Jamais derrière du texte long.',
  },
  sprint: {
    display: '05_sprint_display.webp',
    mobile: '05_sprint_mobile.webp',
    largeurs: { display: 1200, mobile: 640 },
    description: 'Athlète en départ de sprint entre deux plots, poussière de craie au sol.',
    cadrage: 'cover',
    focus: '55% center',
    usage: 'Bandeau des séances de puissance et de l’écran Progrès.',
  },
  force: {
    display: '06_developpe_couche_display.webp',
    mobile: '06_developpe_couche_mobile.webp',
    largeurs: { display: 1200, mobile: 640 },
    description: 'Développé couché lourd, barre chargée, pareur derrière le banc.',
    cadrage: 'cover',
    focus: 'center 45%',
    usage: 'Bandeau des séances de force.',
  },
  reception: {
    display: '07_reception_display.webp',
    mobile: '07_reception_mobile.webp',
    largeurs: { display: 801, mobile: 427 },
    description: 'Réception de ballon en extension, les deux pieds décollés, sur la pelouse.',
    cadrage: 'cover',
    focus: 'center 30%',
    usage: 'Bandeau du Combine.',
  },
} as const satisfies Record<string, VisuelSpec>;

export type VisuelNom = keyof typeof VISUELS;

const base = () => import.meta.env.BASE_URL;

/** Ce visuel est-il disponible ? */
export function visuelDisponible(nom: VisuelNom): boolean {
  return VISUELS[nom].display !== null;
}

/** L'URL de la grande version, ou `null` s'il n'a pas encore été fourni. */
export function visuelUrl(nom: VisuelNom): string | null {
  const f = VISUELS[nom].display;
  return f === null ? null : `${base()}visuels/${f}`;
}

/**
 * Le `srcSet` complet — les deux tailles avec leur largeur réelle.
 *
 * C'est le navigateur qui choisit, et il n'en charge qu'une. Donner les deux
 * ne coûte donc rien ; donner la mauvaise seule coûterait soit du flou, soit
 * 100 Ko inutiles.
 */
export function visuelSrcSet(nom: VisuelNom): string | null {
  const v = VISUELS[nom];
  if (v.display === null || v.mobile === null) return null;
  return `${base()}visuels/${v.mobile} ${v.largeurs.mobile}w, ${base()}visuels/${v.display} ${v.largeurs.display}w`;
}

/** La liste de ce qui manque — pour ne pas l'oublier. */
export function visuelsManquants(): Array<{ nom: VisuelNom } & VisuelSpec> {
  return (Object.keys(VISUELS) as VisuelNom[])
    .filter((n) => !visuelDisponible(n))
    .map((n) => ({ nom: n, ...VISUELS[n] }));
}
