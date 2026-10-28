import type { ReactNode } from 'react';
import { AccentRule, StadiumGlow, YardLines } from './Decor';
import { Visuel } from './Visuel';
import type { VisuelNom } from '../data/visuels';
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
 */
export function ScreenHeader({
  eyebrow,
  title,
  subtitle,
  visuel,
  compact = false,
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
  /** Ce qui vient sous le sous-titre, dans l'en-tête. */
  children?: ReactNode;
}) {
  return (
    <header className={`${styles.header} ${compact ? styles.compact : ''}`}>
      <StadiumGlow />
      {visuel && <Visuel nom={visuel} className={styles.photo} />}
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
