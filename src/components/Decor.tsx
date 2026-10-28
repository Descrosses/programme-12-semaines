import styles from './Decor.module.css';

/**
 * Décor de stade — en SVG, pas en image.
 *
 * ── Pourquoi du SVG et pas des photos ──────────────────────────────────────
 *
 * Ces éléments-là sont géométriques par nature : des lignes de yardage, un
 * faisceau de projecteur, des bandes diagonales. Les livrer en SVG leur coûte
 * quelques centaines d'octets au lieu de quelques centaines de kilo-octets,
 * ils restent nets sur tous les écrans, et ils se teintent avec les jetons de
 * design — donc une autre identité visuelle les reprendra sans les refaire.
 *
 * Les PHOTOS, elles, vivent ailleurs : voir `Visuel.tsx`. Ballon, stade et
 * casque ne se dessinent pas en SVG sans faire pauvre.
 *
 * ── Règle commune ──────────────────────────────────────────────────────────
 *
 * Tout ce fichier est décoratif : `aria-hidden`, `pointer-events: none`, et
 * jamais placé derrière un champ de saisie. Un décor qui gêne la lecture d'une
 * charge a échoué, quelle que soit sa beauté.
 */

/**
 * Lignes de yardage en perspective, vues depuis le bord du terrain.
 *
 * Posées en bas d'un écran ou sous un en-tête. L'écartement se resserre vers
 * le haut : c'est ce qui donne la profondeur, et c'est le seul endroit où la
 * géométrie fait le travail d'une photo.
 */
export function YardLines({ className }: { className?: string }) {
  return (
    <svg
      className={`${styles.yard} ${className ?? ''}`}
      viewBox="0 0 390 120"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="yardFade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0" />
          <stop offset="55%" stopColor="currentColor" stopOpacity="0.5" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.9" />
        </linearGradient>
      </defs>
      <g stroke="url(#yardFade)" fill="none" strokeWidth="1.5">
        {/* Lignes transversales : l'écart double à chaque palier vers le bas. */}
        {[18, 32, 50, 73, 101].map((y, i) => (
          <line key={y} x1={-40 + i * 6} y1={y} x2={430 - i * 6} y2={y} />
        ))}
        {/* Deux lignes de touche qui s'ouvrent vers le spectateur. */}
        <line x1="150" y1="10" x2="60" y2="120" />
        <line x1="240" y1="10" x2="330" y2="120" />
      </g>
    </svg>
  );
}

/**
 * Halo de projecteurs au-dessus de l'en-tête.
 *
 * Deux cônes très diffus, en haut à gauche et à droite. Volontairement faible :
 * l'effet doit se sentir sans se voir, sinon il entre en concurrence avec le
 * titre qu'il est censé mettre en valeur.
 */
export function StadiumGlow({ className }: { className?: string }) {
  return (
    <svg
      className={`${styles.glow} ${className ?? ''}`}
      viewBox="0 0 390 220"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <radialGradient id="beamL" cx="18%" cy="0%" r="62%">
          <stop offset="0%" stopColor="#bcd7f5" stopOpacity="0.3" />
          <stop offset="60%" stopColor="#3478c0" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#061426" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="beamR" cx="86%" cy="4%" r="58%">
          <stop offset="0%" stopColor="#bcd7f5" stopOpacity="0.24" />
          <stop offset="65%" stopColor="#3478c0" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#061426" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="390" height="220" fill="url(#beamL)" />
      <rect width="390" height="220" fill="url(#beamR)" />
    </svg>
  );
}

/**
 * Bandes diagonales — le motif des maillots et des tableaux de score.
 *
 * Sert à animer un coin de carte sans y poser d'image. `tone` choisit entre
 * l'accent rouge et le bleu clair, selon ce que la carte raconte.
 */
export function DiagonalStripes({
  tone = 'light',
  className,
}: {
  tone?: 'light' | 'accent';
  className?: string;
}) {
  const couleur = tone === 'accent' ? '#f01432' : '#bcd7f5';
  return (
    <svg
      className={`${styles.stripes} ${className ?? ''}`}
      viewBox="0 0 120 80"
      preserveAspectRatio="xMaxYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      <g stroke={couleur} strokeWidth="7" strokeLinecap="round" opacity="0.16">
        <line x1="40" y1="92" x2="104" y2="-12" />
        <line x1="60" y1="92" x2="124" y2="-12" />
        <line x1="80" y1="92" x2="144" y2="-12" />
      </g>
    </svg>
  );
}

/**
 * Le trait rouge qui ouvre un titre — la barre des génériques de
 * retransmission.
 *
 * Un élément si petit qu'il mériterait d'être une bordure CSS. Il est ici
 * parce qu'il revient sur tous les écrans et qu'une seule définition évite
 * qu'il grossisse d'un pixel quelque part.
 */
export function AccentRule({ className }: { className?: string }) {
  return <span className={`${styles.rule} ${className ?? ''}`} aria-hidden="true" />;
}
