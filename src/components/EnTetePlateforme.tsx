/**
 * L'en-tête de la plateforme : logo, marque, signature.
 *
 * ── Pourquoi un composant partagé ─────────────────────────────────────────
 *
 * Les trois écrans de la plateforme — accueil, programmes, parcours — portent
 * le même bandeau. Le recopier trois fois garantit qu'il divergera : un
 * changement de logo appliqué à deux écrans sur trois ne se voit qu'en
 * naviguant, et c'est exactement le genre d'écart qu'on ne remarque jamais
 * sur son propre écran.
 *
 * Les écrans de PROGRAMME, eux, ne le portent pas : ils ont leur propre
 * en-tête, aux couleurs de leur univers. C'est ce qui fait sentir qu'on est
 * entré dans un programme plutôt que resté dans le hall.
 *
 * ── Le logo ───────────────────────────────────────────────────────────────
 *
 * Les deux cartes sont affichées telles quelles : ni recadrées, ni détourées,
 * ni recolorées. Son fond graphite rejoint celui de l'écran, ce qui fait
 * disparaître les bords du carré sans y toucher.
 */

import { LOGO, MARQUE_CAPITALES, SIGNATURE } from '../data/marque';
import styles from './EnTetePlateforme.module.css';

export function EnTetePlateforme({ prioritaire = false }: { prioritaire?: boolean }) {
  return (
    <header className={styles.entete}>
      {/* Les obliques rouges des deux coins, purement décoratives. */}
      <span className={styles.obliqueGauche} aria-hidden="true" />
      <span className={styles.obliqueDroite} aria-hidden="true" />

      <img
        className={styles.logo}
        src={`${import.meta.env.BASE_URL}${LOGO.petit}`}
        srcSet={`${import.meta.env.BASE_URL}${LOGO.petit} 300w, ${import.meta.env.BASE_URL}${LOGO.grand} 600w`}
        sizes="132px"
        alt={MARQUE_CAPITALES}
        width={132}
        height={132}
        decoding="async"
        {...(prioritaire ? { fetchPriority: 'high' as const } : { loading: 'lazy' as const })}
      />

      {/* Le nom, encadré de deux traits rouges comme dans la maquette. */}
      <p className={styles.marque}>
        <span className={styles.trait} aria-hidden="true" />
        <span className={styles.nom}>{MARQUE_CAPITALES}</span>
        <span className={styles.trait} aria-hidden="true" />
      </p>
      <p className={styles.signature}>{SIGNATURE}</p>
    </header>
  );
}
