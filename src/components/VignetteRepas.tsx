/**
 * La photo d'un repas de la bibliothèque — ou, tant qu'elle n'existe pas,
 * une vignette neutre.
 *
 * Chaque repas a sa photo, sauf ceux que la bibliothèque déclare
 * `photoAVenir` (les collations à boire du 27 novembre : les photos sont
 * générées par Guillaume). Une image absente donnerait un cadre cassé ; la
 * vignette dit simplement qu'il n'y a pas encore d'image, sans rien inventer.
 * Le jour où la photo arrive : déposer le fichier et retirer `photoAVenir`
 * (`bibliothequeRepas.test.ts` refuse l'un sans l'autre).
 */

import { photoDe, type RepasBibliotheque } from '../data/bibliothequeRepas';
import { Icon } from './Icon';

export function VignetteRepas({
  repas,
  className,
  alt = '',
  differee = true,
  grande = false,
}: {
  repas: Pick<RepasBibliotheque, 'id' | 'nom' | 'photoAVenir'>;
  className: string | undefined;
  alt?: string;
  /** `loading="lazy"` — faux pour la photo en grand de la fiche. */
  differee?: boolean;
  /** La fiche plein écran : la vignette provisoire écrit « Photo à venir ». */
  grande?: boolean;
}) {
  if (repas.photoAVenir) {
    return (
      <span
        className={className}
        data-photo-a-venir
        {...(alt === '' ? { 'aria-hidden': true } : { role: 'img', 'aria-label': alt })}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          aspectRatio: '1 / 1',
          background: 'var(--surface-3)',
          color: 'var(--ink-3)',
          fontSize: '0.8125rem',
        }}
      >
        <Icon name="meal" size={grande ? '40px' : '22px'} />
        {grande && <span>Photo à venir</span>}
      </span>
    );
  }
  return (
    <img
      className={className}
      src={`${import.meta.env.BASE_URL}${photoDe(repas.id)}`}
      alt={alt}
      width={600}
      height={600}
      decoding="async"
      {...(differee ? { loading: 'lazy' as const } : {})}
    />
  );
}
