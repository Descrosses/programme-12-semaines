import { VISUELS, visuelUrl, type VisuelNom } from '../data/visuels';
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
 */
export function Visuel({
  nom,
  className,
  fit = 'contain',
}: {
  nom: VisuelNom;
  className?: string;
  /** `contain` pour un objet détouré, `cover` pour un bandeau d'ambiance. */
  fit?: 'contain' | 'cover';
}) {
  const url = visuelUrl(nom);
  if (url === null) return null;

  return (
    <img
      src={url}
      alt=""
      aria-hidden="true"
      loading="lazy"
      decoding="async"
      title={VISUELS[nom].description}
      className={`${styles.visuel} ${fit === 'cover' ? styles.visuelCover : ''} ${className ?? ''}`}
    />
  );
}
