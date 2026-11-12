/**
 * Les pièces communes aux quatre écrans FEMMES.
 *
 * Bandeau, navigation, icônes : tout ce qui se répète d'un écran à l'autre
 * vit ici, pour qu'un ajustement de l'identité ne se fasse qu'une fois.
 *
 * La référence visuelle est la planche à quatre écrans fournie par
 * Guillaume. Ce fichier la RECOPIE : quand la planche et une préférence de
 * code divergent, c'est la planche qui gagne.
 */

import type { ReactNode } from 'react';
import { visuelSrcSet, visuelUrl } from '../../data/visuels';
import s from './Femmes.module.css';

/* ------------------------------------------------------------- les icônes */

const trait = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

export function Ico({ nom, taille = 20 }: { nom: string; taille?: number }) {
  const d: Record<string, ReactNode> = {
    play: <path d="M6 4l14 8-14 8z" fill="currentColor" stroke="none" />,
    /* Le retour à MAJK : une maison dont le toit fait flèche vers la gauche. */
    majk: <path d="M3 11l9-7 9 7M6 9.5V19h12V9.5M3 15h7M6 12l-3 3 3 3" {...trait} />,
    calendrier: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" {...trait} />
        <path d="M3 10h18M8 3v4M16 3v4" {...trait} />
      </>
    ),
    fourchette: (
      <path d="M6 3v8a2 2 0 0 0 4 0V3M8 11v10M18 3c-1.5 2-2 4-2 6s.5 3 2 3v9" {...trait} />
    ),
    graphe: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" {...trait} />,
    regle: (
      <>
        <rect x="2" y="8" width="20" height="8" rx="1.5" {...trait} />
        <path d="M7 12h.01M12 12h.01M17 12h.01" {...trait} />
      </>
    ),
    reglages: (
      <>
        <path d="M4 7h10M18 7h2M4 17h4M12 17h8M4 12h2M10 12h10" {...trait} />
        <circle cx="16" cy="7" r="2" {...trait} />
        <circle cx="8" cy="12" r="2" {...trait} />
        <circle cx="10" cy="17" r="2" {...trait} />
      </>
    ),
    chevron: <path d="M9 6l6 6-6 6" {...trait} />,
    chevronGauche: <path d="M15 5l-7 7 7 7" {...trait} strokeWidth={2.6} />,
    maison: <path d="M4 11l8-7 8 7M6 10v9h12v-9M10 19v-5h4v5" {...trait} />,
    chrono: (
      <>
        <circle cx="12" cy="13" r="7.5" {...trait} />
        <path d="M12 9.5V13l2.2 2.2M9.5 2.5h5" {...trait} />
      </>
    ),
    boucle: (
      <path
        d="M4 11a8 8 0 0 1 14-4.5M20 13a8 8 0 0 1-14 4.5M18.5 2.5v4.5H14M5.5 21.5V17H10"
        {...trait}
        strokeWidth={2.6}
      />
    ),
    coche: <path d="M20 6L9 17l-5-5" {...trait} strokeWidth={2.6} />,
    cible: (
      <>
        <circle cx="11" cy="13" r="8" {...trait} strokeWidth={2.2} />
        <circle cx="11" cy="13" r="3.5" {...trait} strokeWidth={2.2} />
        <path d="M11 13l8.5-8.5M16.5 4.5h3v3" {...trait} strokeWidth={2.2} />
      </>
    ),
    course: (
      <>
        <circle cx="14.5" cy="4" r="2" fill="currentColor" stroke="none" />
        <path
          d="M12 9l-3.5 4.5 3.5 2.5.5 5M12 9l4-1 2.5 3 3 .5M8.5 13.5L5 15l-2 4M12 9l-3.5-.5L6 11"
          {...trait}
          strokeWidth={2.2}
        />
      </>
    ),
  };
  return (
    <svg viewBox="0 0 24 24" width={taille} height={taille} aria-hidden="true">
      {d[nom] ?? null}
    </svg>
  );
}

/* ------------------------------------------------------------- le bandeau */

/**
 * Le même décor sur les quatre écrans. Deux dispositions, celles de la
 * planche :
 *
 * - `logo` (écran 1) : « MAJK FEMMES » sur deux lignes, penché, DANS la
 *   photo ;
 * - sinon (écrans 2, 3, 4) : le bloc de texte se pose au pied de la photo,
 *   là où elle s'est déjà fondue dans la page.
 *
 * `alt=""` : le décor n'apporte aucune information que le titre ne dise.
 */
export function Bandeau({
  logo = false,
  surTitre,
  surTitreRose = false,
  titre,
  taille = 'm',
  sousTitre,
  retour,
  onRetour,
}: {
  logo?: boolean;
  surTitre?: string;
  /* Écran 2 : « Programme » en rose italique plutôt qu'en capitales. */
  surTitreRose?: boolean;
  titre: string;
  taille?: 'xl' | 'l' | 'm';
  sousTitre?: string;
  retour?: string;
  onRetour?: () => void;
}) {
  const src = visuelUrl('horizonFemmes');
  const srcSet = visuelSrcSet('horizonFemmes');
  const tailleCls = taille === 'xl' ? s.titreXl : taille === 'l' ? s.titreL : s.titreM;
  return (
    <div className={s.hero}>
      {src !== null && (
        <img src={src} {...(srcSet !== null ? { srcSet } : {})} sizes="100vw" alt="" />
      )}
      {logo ? (
        <h1 className={s.logo}>
          <span>MAJK</span>
          <span>FEMMES</span>
        </h1>
      ) : (
        <div className={s.heroTexte}>
          {retour !== undefined && (
            <button type="button" className={s.retourLien} onClick={onRetour}>
              <Ico nom="chevronGauche" taille={18} />
              {retour}
            </button>
          )}
          {surTitre !== undefined && (
            <span className={surTitreRose ? s.surTitreRose : s.surTitre}>{surTitre}</span>
          )}
          <h1 className={`${s.titre} ${tailleCls}`}>{titre}</h1>
          {sousTitre !== undefined && <span className={s.sousTitre}>{sousTitre}</span>}
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------- la navigation */

/*
 * La barre de la planche : MAJK, puis six onglets.
 *
 * `majk` n'est pas un onglet du programme, c'est la SORTIE vers l'accueil
 * MAJK — `EcransFemmes` le traite à part. Dans une version précédente ce
 * bouton ramenait à l'écran Aujourd'hui de FEMMES : on ne ressortait pas.
 */
export type OngletFemmes =
  | 'majk'
  | 'aujourdhui'
  | 'semaine'
  | 'nutrition'
  | 'progres'
  | 'mesures'
  | 'reglages';

const ONGLETS: { id: OngletFemmes; label: string; ico: string }[] = [
  { id: 'majk', label: 'MAJK', ico: 'majk' },
  { id: 'aujourdhui', label: 'Aujourd’hui', ico: 'play' },
  { id: 'semaine', label: 'Semaine', ico: 'calendrier' },
  { id: 'nutrition', label: 'Nutrition', ico: 'fourchette' },
  { id: 'progres', label: 'Progrès', ico: 'graphe' },
  { id: 'mesures', label: 'Mesures', ico: 'regle' },
  { id: 'reglages', label: 'Réglages', ico: 'reglages' },
];

export function NavFemmes({
  actif,
  onAller,
}: {
  actif: OngletFemmes;
  onAller: (onglet: OngletFemmes) => void;
}) {
  return (
    <nav className={s.nav}>
      {ONGLETS.map((o) => (
        <button
          key={o.id}
          type="button"
          className={`${s.navItem} ${actif === o.id ? s.navOn : ''}`}
          onClick={() => onAller(o.id)}
        >
          <Ico nom={o.ico} />
          {o.label}
        </button>
      ))}
    </nav>
  );
}
