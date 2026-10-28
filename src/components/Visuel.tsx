import type { CSSProperties } from 'react';
import { VISUELS, visuelSrcSet, visuelUrl, type VisuelNom } from '../data/visuels';
import styles from './Decor.module.css';

/**
 * Un emplacement de photo — qui se comporte correctement quand la photo
 * n'existe pas encore.
 *
 * C'est tout l'intérêt de passer par `visuels.ts` : l'écran est écrit une
 * fois, et il est juste avant comme après la livraison des images. Pas de
 * cadre vide, pas de 404 dans la console, et surtout aucune photo provisoire
 * récupérée en ligne qui finirait par rester.
 *
 * Décoratif : `aria-hidden`, et jamais devant un contenu lisible. La
 * description du manifeste sert quand même d'`alt`, pour le jour où l'un de
 * ces visuels deviendrait porteur de sens.
 *
 * ── Le cadrage vient du manifeste ──────────────────────────────────────────
 *
 * `cadrage` et `focus` sont déclarés avec l'image, pas avec l'écran : le
 * point d'intérêt d'une photo est une propriété de la photo. Si Guillaume
 * remplace le stade par un autre stade dont l'action est plus haute, il
 * corrige une ligne de `visuels.ts` et tous les écrans suivent.
 */
export function Visuel({
  nom,
  className,
  fit,
  /**
   * Largeur occupée par l'emplacement, en syntaxe `sizes`. C'est elle qui
   * décide laquelle des deux variantes se télécharge. `100vw` pour un
   * bandeau pleine largeur, une valeur en pixels pour une vignette.
   */
  sizes = '100vw',
  /** Le premier visuel de l'écran d'accueil n'est pas différé : on le voit tout de suite. */
  prioritaire = false,
}: {
  nom: VisuelNom;
  className?: string;
  /** Force le cadrage, sinon celui déclaré dans le manifeste. */
  fit?: 'contain' | 'cover';
  sizes?: string;
  prioritaire?: boolean;
}) {
  const url = visuelUrl(nom);
  if (url === null) return null;

  const spec = VISUELS[nom];
  const cadrage = fit ?? spec.cadrage;
  const srcSet = visuelSrcSet(nom);

  return (
    <img
      src={url}
      {...(srcSet ? { srcSet, sizes } : {})}
      alt=""
      aria-hidden="true"
      loading={prioritaire ? 'eager' : 'lazy'}
      fetchPriority={prioritaire ? 'high' : 'auto'}
      decoding="async"
      title={spec.description}
      style={{ objectPosition: spec.focus } as CSSProperties}
      className={`${styles.visuel} ${cadrage === 'cover' ? styles.visuelCover : ''} ${className ?? ''}`}
    />
  );
}
