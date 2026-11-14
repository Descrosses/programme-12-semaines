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
    largeurs: { display: 760, mobile: 420 },
    description: 'Ballon de football américain posé sur l’herbe, cuir texturé, coutures blanches.',
    cadrage: 'contain',
    focus: 'center',
    /*
     * Détouré. La source du pack était sur fond BLANC : posée telle quelle
     * dans un en-tête marine, elle y collait un rectangle blanc. Le fond a été
     * rendu transparent et l'image rognée au ballon.
     *
     * Deux tailles modestes (760 et 420 px) et non 1200 : cette image ne sert
     * jamais de bandeau, seulement une vignette de 190 px. Le canal alpha
     * compresse mal — en 1200 px elle pesait 204 Ko, plus que le stade.
     */
    usage: 'Vignette d’en-tête, en haut à droite. Jamais en bandeau.',
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
  /*
   * Le seul visuel du pack FEMMES, et le seul qui ne vienne pas du pack NFL.
   *
   * Horizon de ville au coucher de soleil, registre synthwave. Il a été
   * DÉRIVÉ de la maquette fournie par Guillaume : recadré sous la barre de
   * statut, et le titre de séance qui y figurait effacé par clonage d'une
   * colonne de ciel — c'est désormais du texte HTML, donc il change avec la
   * séance.
   *
   * Le recadrage descend volontairement jusque dans la zone où la maquette
   * éteignait déjà son décor vers le violet : une partie du fondu est donc
   * dans l'image, le reste est fait par un masque CSS. C'est ce qui évite
   * l'arête nette au bas du bandeau que Guillaume avait signalée.
   */
  horizonFemmes: {
    display: '20_femmes_horizon_display.webp',
    mobile: '20_femmes_horizon_mobile.webp',
    largeurs: { display: 1200, mobile: 640 },
    description:
      'Horizon de ville au coucher du soleil, ciel orange et magenta, palmiers en silhouette, reflets sur l’eau.',
    cadrage: 'cover',
    focus: 'center 40%',
    usage: 'Bandeau d’en-tête du programme FEMMES.',
  },
  /*
   * La photo de la carte FEMMES, page Programmes. Fournie par Guillaume en
   * deux versions : brute et déjà assombrie. C'est la BRUTE qui est servie,
   * parce que POWER (`sprint`) et MASS (`force`) posent des photos brutes et
   * font l'assombrissement dans le code — le voile en dégradé de
   * `.banniereVoile`. La version assombrie aurait été noircie deux fois.
   *
   * 1218 px et non 1200 : c'est la largeur livrée, on ne l'agrandit pas.
   */
  carteFemmes: {
    display: '21_femmes_carte_display.webp',
    mobile: '21_femmes_carte_mobile.webp',
    largeurs: { display: 1218, mobile: 640 },
    description: 'Athlète en hip thrust à la barre, dos sur un banc, salle sombre.',
    cadrage: 'cover',
    focus: '70% center',
    usage: 'Carte de la famille FEMMES, page Programmes.',
  },
  /*
   * La photo de la carte ME, MYSELF & I, page Programmes. Générée par
   * Guillaume (ChatGPT) : une silhouette de dos face au miroir, trois reflets
   * — « me, myself and I ». Le voile en dégradé du code fait
   * l'assombrissement, comme pour les trois autres cartes.
   *
   * Une exception à « servie brute » : la générée était deux fois plus
   * sombre que les autres (luminance moyenne de la moitié droite 22, contre
   * 47 pour POWER, 49 pour MASS et 45 pour FEMMES). Sous le même voile, la
   * silhouette disparaissait. Les ombres ont été relevées (gamma 0,66)
   * jusqu'à 47 ; la lumière dorée, déjà claire, bouge peu.
   *
   * Deux emplacements, deux recadrages, et chaque terme du focus en sert un :
   *
   * - `10 %` (vertical) sert la carte du catalogue, 128 px de haut : on n'y
   *   voit qu'environ 60 % de la hauteur. Centré, le cadrage coupait la tête ;
   *   à 10 %, la fenêtre part de la casquette et descend jusqu'au short.
   * - `95 %` (horizontal) sert la tuile de l'accueil, presque carrée : on n'y
   *   voit qu'environ 42 % de la largeur. Centré, il ne restait qu'un bord de
   *   l'athlète (qui occupe de 57 à 81 % de la largeur). À 78 %, il était
   *   entier mais sa tête passait sous l'étiquette « À venir », en haut à
   *   droite. À 95 %, la fenêtre va de 55 à 97 % : l'athlète entier à gauche,
   *   tête dégagée, ses reflets à droite.
   *
   * Aucun des deux ne gêne l'autre : la carte est assez large pour montrer
   * toute la largeur de l'image, la tuile assez haute pour toute la hauteur.
   */
  cartePerso: {
    display: '22_perso_carte_display.webp',
    mobile: '22_perso_carte_mobile.webp',
    largeurs: { display: 1200, mobile: 640 },
    description: 'Athlète de dos face au miroir d’une salle sombre, trois reflets, lumière dorée.',
    cadrage: 'cover',
    focus: '95% 10%',
    usage: 'Carte de la famille ME, MYSELF & I : page Programmes et tuile de l’accueil.',
  },
  /*
   * Les quatre photos d'en-tête de MASS, fournies par Guillaume (14 novembre)
   * en une planche de 1774 × 887 : chacune fait 885 px de large, pas 1200.
   * On ne les agrandit pas. Sujet à DROITE, noir à gauche : le titre se pose
   * sur le noir, d'où un focus calé à droite.
   */
  massAthlete: {
    display: '30_mass_athlete_display.webp',
    mobile: '30_mass_athlete_mobile.webp',
    largeurs: { display: 885, mobile: 640 },
    description: 'Athlète torse nu, tête levée, lumière rouge en contre-jour sur fond noir.',
    cadrage: 'cover',
    focus: 'right center',
    usage: 'Bandeau d’en-tête MASS : Aujourd’hui.',
  },
  massDisque: {
    display: '31_mass_disque_display.webp',
    mobile: '31_mass_disque_mobile.webp',
    largeurs: { display: 885, mobile: 640 },
    description: 'Disque de 20 kg sur une barre, liseré de lumière rouge, salle sombre.',
    cadrage: 'cover',
    focus: 'right center',
    usage: 'Bandeau d’en-tête MASS : Semaine.',
  },
  massSalle: {
    display: '32_mass_salle_display.webp',
    mobile: '32_mass_salle_mobile.webp',
    largeurs: { display: 885, mobile: 640 },
    description:
      'Banc de développé couché et barre chargée dans une salle sombre, éclairage rouge.',
    cadrage: 'cover',
    focus: 'right center',
    usage: 'En-tête de séance MASS.',
  },
  massDisques: {
    display: '33_mass_disques_display.webp',
    mobile: '33_mass_disques_mobile.webp',
    largeurs: { display: 885, mobile: 640 },
    description: 'Rangée de disques en gros plan, reflets rouges.',
    cadrage: 'cover',
    focus: 'right center',
    usage: 'En-tête du combiné d’évaluation MASS.',
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
    /*
     * « top » : ce montage a son portrait tout en haut. Dans le bandeau court
     * de Réglages on n'en voit qu'un tiers — centré, le cadrage commençait
     * sous le menton et il ne restait qu'une épaule.
     */
    focus: 'center top',
    usage: 'En-tête de Réglages, et Aujourd’hui quand les 12 semaines sont bouclées.',
  },
  sprint: {
    display: '05_sprint_display.webp',
    mobile: '05_sprint_mobile.webp',
    largeurs: { display: 1200, mobile: 640 },
    description: 'Athlète en départ de sprint entre deux plots, poussière de craie au sol.',
    cadrage: 'cover',
    /*
     * « top » et non « center » : ce visuel sert deux emplacements de formes
     * différentes. Dans le bandeau haut d'Aujourd'hui, l'image est rognée sur
     * les CÔTÉS et seul le 62 % compte. Dans le bandeau court de Progrès,
     * elle est rognée en HAUTEUR et seul le second terme compte — centré, il
     * coupait la tête de l'athlète et il ne restait qu'un torse.
     */
    focus: '62% top',
    usage: 'Bandeau des séances de puissance, et en-tête de Progrès.',
  },
  force: {
    display: '06_developpe_couche_display.webp',
    mobile: '06_developpe_couche_mobile.webp',
    largeurs: { display: 1200, mobile: 640 },
    description: 'Développé couché lourd, barre chargée, pareur derrière le banc.',
    cadrage: 'cover',
    focus: 'center 45%',
    usage: 'Bandeau des semaines d’accumulation et de deload.',
  },
  squat: {
    display: 'athlete-squat.webp',
    mobile: 'athlete-squat-mobile.webp',
    largeurs: { display: 1086, mobile: 640 },
    description:
      'Athlète en bas de squat sous une barre chargée, maillot bleu marine, salle sombre.',
    cadrage: 'cover',
    /*
     * 12 % et non « center ». L'image est en portrait (1086 × 1448) alors que
     * l'en-tête est presque carré : on n'en voit qu'environ deux tiers. Centré,
     * le cadrage coupait le visage en haut. À 12 %, la fenêtre descend du haut
     * du crâne jusque sous les genoux — le visage, la barre et la position de
     * squat restent entiers, et seuls les pieds sortent.
     */
    focus: 'center 12%',
    usage: 'Bandeau des semaines de force maximale.',
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
