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
 *
 * Le cadrage décide de la PLACE de la photo, jamais de la hauteur du bandeau :
 * tout en-tête qui porte un visuel a la même, sinon l'écran au ballon paraît
 * rabougri à côté des autres.
 */
export function ScreenHeader({
  eyebrow,
  title,
  subtitle,
  marque,
  argent = false,
  visuel,
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
  /**
   * Le nom de la famille en très gros au-dessus du titre (« MASS »). Le titre
   * passe alors en seconde ligne, plus petit. Maquette MASS de Guillaume.
   */
  marque?: string;
  /**
   * Titre argenté sans « // », trait rouge court, photo qui passe sous la
   * barre d'état : l'écran Semaine MASS, d'après la référence de Guillaume.
   */
  argent?: boolean;
  /** Photo d'ambiance, quand elle existe. */
  visuel?: VisuelNom;
  prioritaire?: boolean;
  /** Ce qui vient sous le sous-titre, dans l'en-tête. */
  children?: ReactNode;
}) {
  const pleineImage = visuel !== undefined && VISUELS[visuel].cadrage === 'cover';

  const entete = (
    <header
      className={`${styles.header} ${pleineImage ? styles.hero : visuel ? styles.avecVisuel : ''} ${marque !== undefined ? styles.avecMarque : ''} ${argent ? styles.argent : ''}`}
    >
      <StadiumGlow className={styles.lueur} />
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
        {marque !== undefined && <p className={styles.marque}>{marque}</p>}
        <h1 className={`${styles.title} ${marque !== undefined ? styles.titreSecond : ''}`}>
          {title}
        </h1>
        {/*
          La ligne de sous-titre est TOUJOURS rendue, même vide.
          Le bloc de titre étant calé en bas de l'en-tête, une rubrique sans
          sous-titre voyait son titre descendre de 28 pt : c'est le cas des
          écrans Aujourd'hui et Semaine de MASS 4, qui n'a pas de bloc de
          périodisation à annoncer. La ligne garde sa place, le titre garde
          la sienne.
        */}
        <div className={styles.subtitleRow} aria-hidden={subtitle === undefined || undefined}>
          {subtitle !== undefined && (
            <>
              <AccentRule className={styles.ruleLeft} />
              <span className={styles.subtitle}>{subtitle}</span>
              <AccentRule className={styles.ruleRight} />
            </>
          )}
        </div>
      </div>
    </header>
  );

  /*
   * Ce qui suit le bloc de titre vit EN DEHORS de l'en-tête.
   *
   * C'était dedans, sous le sous-titre, et ça déplaçait toute la rubrique :
   * le bloc de titre est calé en bas de l'en-tête, donc chaque ligne ajoutée
   * en dessous le repoussait vers le haut. Réglages, qui porte une phrase,
   * remontait son trait rouge de 27 points ; Nutrition, qui en porte trois,
   * de 62. Deux écrans sur six, et un décalage qu'aucune règle n'expliquait.
   *
   * En sortant ces blocs, le trait rouge tombe au même pixel partout.
   */
  if (children === undefined) return entete;
  return (
    <>
      {entete}
      <div className={styles.apres}>{children}</div>
    </>
  );
}
