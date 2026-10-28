import type { ReactNode } from 'react';
import { AccentRule, StadiumGlow, YardLines } from './Decor';
import { Visuel } from './Visuel';
import { VISUELS, type VisuelNom } from '../data/visuels';
import styles from './ScreenHeader.module.css';

/**
 * L'en-tête de retransmission — le même sur tous les écrans.
 *
 * ── Ce qu'il fait ──────────────────────────────────────────────────────────
 *
 * Un titre en capitales condensées, un sur-titre pisté, un sous-titre entre
 * deux traits rouges, et un décor de stade derrière. C'est ce qui donne
 * l'identité : un seul composant, donc une seule définition de ce à quoi
 * ressemble « entrer dans un écran ».
 *
 * ── Ce qu'il ne fait pas ───────────────────────────────────────────────────
 *
 * Il ne contient aucune donnée et ne décide de rien. Les écrans lui passent
 * leurs textes ; il ne va rien chercher.
 *
 * Le décor est en SVG et la photo est optionnelle (`visuel`) : l'écran est
 * juste avant comme après la livraison des images.
 *
 * ── Deux façons de poser une photo ─────────────────────────────────────────
 *
 * Elle vient du manifeste, pas d'un réglage d'écran. Un visuel déclaré
 * `cover` (stade, casque, sprint) remplit tout l'en-tête derrière le voile :
 * c'est l'ambiance. Un visuel `contain` (le ballon, posé sur fond blanc) ne
 * peut pas servir de fond — il se range en vignette en haut à droite, où son
 * fond se fond dans le dégradé.
 */
export function ScreenHeader({
  eyebrow,
  title,
  subtitle,
  visuel,
  compact = false,
  /** Premier écran ouvert : sa photo se charge tout de suite, pas en différé. */
  prioritaire = false,
  children,
}: {
  /** Au-dessus du titre, pisté et en petites capitales : « semaine 8 ». */
  eyebrow?: string;
  /** Le titre, affiché en capitales condensées. */
  title: string;
  /** Sous le titre, encadré de deux traits rouges. */
  subtitle?: string;
  /** Photo d'ambiance, quand elle existe. */
  visuel?: VisuelNom;
  /** Version resserrée, pour les écrans qui ont beaucoup à montrer. */
  compact?: boolean;
  prioritaire?: boolean;
  /** Ce qui vient sous le sous-titre, dans l'en-tête. */
  children?: ReactNode;
}) {
  const pleineImage = visuel !== undefined && VISUELS[visuel].cadrage === 'cover';

  return (
    <header
      className={`${styles.header} ${compact ? styles.compact : ''} ${
        pleineImage ? styles.hero : ''
      }`}
    >
      <StadiumGlow />
      {visuel &&
        (pleineImage ? (
          <>
            <Visuel nom={visuel} className={styles.fond} sizes="100vw" prioritaire={prioritaire} />
            <span className={styles.voile} aria-hidden="true" />
          </>
        ) : (
          <Visuel nom={visuel} className={styles.photo} sizes="190px" />
        ))}
      <YardLines className={styles.yard} />

      <div className={styles.content}>
        {eyebrow && <p className={styles.eyebrow}>{eyebrow}</p>}
        <h1 className={styles.title}>{title}</h1>
        {subtitle && (
          <div className={styles.subtitleRow}>
            <AccentRule className={styles.ruleLeft} />
            <span className={styles.subtitle}>{subtitle}</span>
            <AccentRule className={styles.ruleRight} />
          </div>
        )}
        {children}
      </div>
    </header>
  );
}
