/**
 * Les pièces communes aux quatre écrans FEMMES.
 *
 * Bandeau, navigation, icônes : tout ce qui se répète d'un écran à l'autre
 * vit ici, pour qu'un ajustement de l'identité ne se fasse qu'une fois.
 */

import type { ReactNode } from 'react';
import { visuelSrcSet, visuelUrl } from '../../data/visuels';
import s from './Femmes.module.css';

/* ------------------------------------------------------------- les icônes */

/* Au trait, monochromes, héritées de la couleur du parent. Des émojis
   auraient sorti des pictogrammes en couleur, étrangers à l'identité. */
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
        <path d="M7 8v3M12 8v4M17 8v3" {...trait} />
      </>
    ),
    reglages: (
      <>
        <path d="M4 7h10M18 7h2M4 17h4M12 17h8" {...trait} />
        <circle cx="16" cy="7" r="2.2" {...trait} />
        <circle cx="10" cy="17" r="2.2" {...trait} />
      </>
    ),
    retour: <path d="M19 12H5M11 6l-6 6 6 6" {...trait} />,
    chevron: <path d="M9 6l6 6-6 6" {...trait} />,
    chevronGauche: <path d="M15 6l-6 6 6 6" {...trait} />,
    maison: <path d="M4 11l8-7 8 7M6 10v9h12v-9" {...trait} />,
    halteres: <path d="M3 9v6M6 7v10M18 7v10M21 9v6M6 12h12" {...trait} />,
    chrono: (
      <>
        <circle cx="12" cy="13" r="8" {...trait} />
        <path d="M12 9v4l2.5 2.5M9 2h6" {...trait} />
      </>
    ),
    boucle: <path d="M4 12a8 8 0 0 1 13-6M20 12a8 8 0 0 1-13 6M17 2v5h-5M7 22v-5h5" {...trait} />,
    coche: <path d="M20 6L9 17l-5-5" {...trait} />,
    cible: (
      <>
        <circle cx="12" cy="12" r="8" {...trait} />
        <circle cx="12" cy="12" r="3" {...trait} />
      </>
    ),
    course: (
      <path d="M13 4a2 2 0 1 0 0-.1M11 8l-3 4 3 3 1 5M11 8l4-1 3 3 3 1M8 12l-4 1" {...trait} />
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
 * Il porte le même décor sur les quatre écrans — c'est lui qui fait tenir
 * l'identité ensemble. Seul le texte change.
 *
 * `alt=""` : le décor n'apporte aucune information que le titre ne dise
 * déjà. Le décrire ferait lire deux fois la même chose à une synthèse vocale.
 */
export function Bandeau({
  surTitre,
  titre,
  retour,
  onRetour,
}: {
  surTitre?: string;
  titre: string;
  /* Le fil d'Ariane de la référence : « ‹ Séance 1 » au-dessus du titre. */
  retour?: string;
  onRetour?: () => void;
}) {
  const src = visuelUrl('horizonFemmes');
  const srcSet = visuelSrcSet('horizonFemmes');
  /* Trois lignes de texte ne tiennent pas dans le ciel : la référence les
     pose sous la photo. Voir `.heroEmpile` dans la feuille de styles. */
  const empile = retour !== undefined;
  return (
    <div className={`${s.hero} ${empile ? s.heroEmpile : ''}`}>
      {src !== null && (
        <img src={src} {...(srcSet !== null ? { srcSet } : {})} sizes="100vw" alt="" />
      )}
      <div className={s.heroTexte}>
        {retour !== undefined && (
          <button type="button" className={s.retourLien} onClick={onRetour}>
            <Ico nom="chevronGauche" taille={17} />
            {retour}
          </button>
        )}
        {surTitre !== undefined && <span className={s.surTitre}>{surTitre}</span>}
        <h1 className={s.titre}>{titre}</h1>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------- la navigation */

export type OngletFemmes =
  | 'aujourdhui'
  | 'semaine'
  | 'nutrition'
  | 'progres'
  | 'mesures'
  | 'reglages';

const ONGLETS: { id: OngletFemmes; label: string; ico: string }[] = [
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
      <button
        type="button"
        className={`${s.navItem} ${s.navRetour}`}
        onClick={() => onAller('aujourdhui')}
      >
        <Ico nom="retour" />
        MAJK
      </button>
      <span className={s.navFilet} />
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
