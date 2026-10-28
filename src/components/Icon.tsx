/**
 * Icônes vectorielles — une seule famille, un seul trait.
 *
 * ── Ce qu'elles remplacent ─────────────────────────────────────────────────
 *
 * L'interface portait 53 emojis répartis sur 21 symboles. Un emoji n'est pas
 * une icône : il change de dessin d'un téléphone à l'autre, il est coloré
 * quoi qu'on fasse, il ne s'aligne pas sur la hauteur d'x du texte, et il
 * empêche toute cohérence graphique. Trois « ▼ » dans trois composants n'ont
 * déjà pas la même taille.
 *
 * ── Ce qu'elles ne remplacent PAS ──────────────────────────────────────────
 *
 * Les emojis qui sont du CONTENU et non de l'interface : les pictogrammes
 * d'aliments de l'écran Nutrition appartiennent aux données du programme, pas
 * à l'habillage. Ils ne passent pas par ici.
 *
 * ── Pourquoi pas une bibliothèque ──────────────────────────────────────────
 *
 * Le projet n'a aucune dépendance d'interface, et une bibliothèque d'icônes
 * pèse des centaines de kilo-octets pour une vingtaine de dessins. Celles-ci
 * sont tracées à la main sur une grille de 24, au trait de 2, et pèsent
 * ensemble moins qu'un seul fichier d'une bibliothèque.
 *
 * Toutes prennent `currentColor` : elles héritent de la couleur du texte, donc
 * du jeton de design, donc de l'identité visuelle. Changer de thème les
 * reteint sans les redessiner.
 */

export type IconName =
  | 'play'
  | 'calendar'
  | 'meal'
  | 'chart'
  | 'stopwatch'
  | 'settings'
  | 'arrow-left'
  | 'arrow-right'
  | 'arrow-up'
  | 'arrow-down'
  | 'chevron-down'
  | 'chevron-up'
  | 'check'
  | 'close'
  | 'plus'
  | 'minus'
  | 'swap'
  | 'repeat'
  | 'note'
  | 'camera'
  | 'video'
  | 'book'
  | 'pencil'
  | 'image'
  | 'alert'
  | 'helmet';

/** Les tracés, sur une grille de 24. Trait de 2, extrémités rondes. */
const PATHS: Record<IconName, string> = {
  play: 'M8 5l11 7-11 7z',
  calendar: 'M4 6h16v15H4zM4 10h16M9 3v4M15 3v4',
  meal: 'M6 3v8a2 2 0 002 2v8M6 3v5M9 3v5M18 3c-1.5 2-2 4-2 7h2v11',
  chart: 'M4 20V9M10 20V4M16 20v-7M22 20H2',
  stopwatch: 'M12 21a8 8 0 100-16 8 8 0 000 16zM12 9v4l2 2M9 2h6',
  /*
   * Des curseurs, et non une roue dentée : à 21 px, un engrenage à huit dents
   * se lit comme un soleil. Trois rangées et trois boutons restent
   * reconnaissables à n'importe quelle taille.
   */
  settings:
    'M4 7h5M13 7h7M4 12h11M19 12h1M4 17h3M11 17h9M11 7a2 2 0 104 0 2 2 0 00-4 0M15 12a2 2 0 104 0 2 2 0 00-4 0M7 17a2 2 0 104 0 2 2 0 00-4 0',
  'arrow-left': 'M19 12H5M11 6l-6 6 6 6',
  'arrow-right': 'M5 12h14M13 6l6 6-6 6',
  'arrow-up': 'M12 19V5M6 11l6-6 6 6',
  'arrow-down': 'M12 5v14M6 13l6 6 6-6',
  'chevron-down': 'M6 9l6 6 6-6',
  'chevron-up': 'M6 15l6-6 6 6',
  check: 'M4 12.5l5.5 5.5L20 6',
  close: 'M6 6l12 12M18 6L6 18',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  swap: 'M4 8h13l-3-3M20 16H7l3 3',
  repeat: 'M4 11a7 7 0 0111-5.7l2.5 2M20 13a7 7 0 01-11 5.7L6.5 17M17 3v4h-4M7 21v-4h4',
  note: 'M5 3h10l4 4v14H5zM15 3v4h4M8 12h8M8 16h5',
  camera: 'M3 7h4l2-2h6l2 2h4v13H3zM12 17a4 4 0 100-8 4 4 0 000 8z',
  video: 'M3 6h12v12H3zM15 10l6-3v10l-6-3z',
  book: 'M4 4h7a2 2 0 012 2v14a2 2 0 00-2-2H4zM20 4h-7a2 2 0 00-2 2v14a2 2 0 012-2h7z',
  pencil: 'M4 20l4-1 10-10-3-3L5 16zM14 6l3 3',
  image: 'M3 5h18v14H3zM3 16l5-5 4 4 3-3 6 6',
  alert: 'M12 3L2 20h20zM12 10v4M12 17h.01',
  helmet: 'M4 13a8 8 0 0116 0v3h-5l-2 3H8a4 4 0 01-4-4zM4 14h11',
};

/**
 * `size` suit la typographie plutôt qu'un chiffre en dur : une icône posée
 * dans un libellé doit grandir avec lui quand le système agrandit les textes.
 */
export function Icon({
  name,
  size = '1.25em',
  className,
  strokeWidth = 2,
}: {
  name: IconName;
  size?: string | number;
  className?: string;
  strokeWidth?: number;
}) {
  const plein = name === 'play';
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={plein ? 'currentColor' : 'none'}
      stroke={plein ? 'none' : 'currentColor'}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      style={{ flex: 'none', display: 'block' }}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
