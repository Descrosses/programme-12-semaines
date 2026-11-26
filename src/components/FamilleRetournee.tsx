/**
 * Accueil — la carte d'une famille qui SE RETOURNE et s'agrandit presque à
 * la taille de l'écran (Guillaume, 26 novembre : « des volets explicatifs
 * pour chaque programme […] comme une carte qu'on retourne […] avec les
 * qualités que le programme développe »).
 *
 * ── Rien d'inventé ─────────────────────────────────────────────────────────
 *
 * Le verso ne dit que ce que le catalogue dit déjà, mot pour mot : le
 * sous-titre et le résumé de la famille, puis les OBJECTIFS écrits de chaque
 * programme qui en a (« Ce que tu développes »). Un programme sans objectifs
 * écrits (MASS FORCE, les étapes à venir) n'en reçoit pas ; ME, MYSELF & I,
 * dont le contenu vient de la personne, n'a que son résumé.
 *
 * ── Le mouvement ───────────────────────────────────────────────────────────
 *
 * La carte part EXACTEMENT de la tuile touchée (son rectangle à l'écran),
 * pivote d'un demi-tour en grandissant, et revient s'y poser à la fermeture.
 * Mouvement réduit demandé par le téléphone : elle s'ouvre et se ferme sans
 * animation. « Voir les programmes » mène au catalogue sur cette famille,
 * ce que faisait la tuile avant.
 */

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import type { Famille } from '../data/catalogue';
import { HABILLAGE } from '../data/famillesVisuel';
import { Icon } from './Icon';
import { Visuel } from './Visuel';
import local from './FamilleRetournee.module.css';

/** La durée du demi-tour, en millisecondes (le CSS porte la même). */
export const DUREE_RETOURNEMENT = 560;

export interface Rectangle {
  top: number;
  left: number;
  width: number;
  height: number;
}

/** Le rectangle d'arrivée : presque tout l'écran, sous l'encoche. */
export function rectangleOuvert(largeur: number, hauteur: number, hautSur = 0): Rectangle {
  const marge = 14;
  const top = hautSur + marge;
  return { top, left: marge, width: largeur - 2 * marge, height: hauteur - top - marge };
}

/** Ce que le verso affiche : les objectifs ÉCRITS, programme par programme. */
export function qualitesDe(famille: Famille): { nom: string; objectifs: readonly string[] }[] {
  return famille.programmes
    .filter((p) => p.objectifs.length > 0)
    .map((p) => ({ nom: p.nom, objectifs: p.objectifs }));
}

/** La hauteur de l'encoche de l'iPhone (0 ailleurs) : la carte ouverte passe dessous. */
function hauteurEncoche(): number {
  const sonde = document.createElement('div');
  sonde.style.cssText =
    'position:fixed;top:0;left:0;visibility:hidden;padding-top:env(safe-area-inset-top,0px)';
  document.body.appendChild(sonde);
  const h = sonde.getBoundingClientRect().height;
  sonde.remove();
  return h;
}

type Phase = 'depart' | 'ouverte' | 'retour';

const mouvementReduit = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function FamilleRetournee({
  famille,
  depart,
  onFermee,
  onVoir,
}: {
  famille: Famille;
  /** Le rectangle de la tuile touchée, d'où la carte part et où elle revient. */
  depart: Rectangle;
  onFermee: () => void;
  onVoir: () => void;
}) {
  const [phase, setPhase] = useState<Phase>('depart');
  const fermer = useRef<HTMLButtonElement>(null);
  const habillage = HABILLAGE[famille.id];
  const qualites = qualitesDe(famille);
  const titreId = `famille-retournee-${famille.id}`;

  // Le demi-tour part au cadre suivant : le navigateur a d'abord posé la
  // carte sur la tuile, sinon il n'y aurait rien à animer.
  useEffect(() => {
    const a = requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        setPhase('ouverte');
        fermer.current?.focus({ preventScroll: true });
      }),
    );
    // Le fond ne défile pas sous la carte ouverte.
    const avant = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    return () => {
      cancelAnimationFrame(a);
      document.documentElement.style.overflow = avant;
    };
  }, []);

  const refermer = () => {
    if (phase === 'retour') return;
    setPhase('retour');
    window.setTimeout(onFermee, mouvementReduit() ? 0 : DUREE_RETOURNEMENT);
  };

  useEffect(() => {
    const touche = (e: KeyboardEvent) => {
      if (e.key === 'Escape') refermer();
    };
    window.addEventListener('keydown', touche);
    return () => window.removeEventListener('keydown', touche);
  });

  const haut = hauteurEncoche();
  const cible =
    phase === 'ouverte' ? rectangleOuvert(window.innerWidth, window.innerHeight, haut) : depart;

  /*
   * Rendue dans `body`, hors de l'écran : l'Accueil isole son contenu (la
   * fumée du fond), et la carte restait alors SOUS le menu du bas, qui
   * captait le toucher sur « Voir les programmes ».
   */
  return createPortal(
    <div
      className={`${local.fond} ${phase === 'ouverte' ? local.fondVisible : ''}`}
      onClick={refermer}
    >
      <div
        className={`${local.carte} ${phase === 'ouverte' ? local.retournee : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titreId}
        style={
          {
            top: cible.top,
            left: cible.left,
            width: cible.width,
            height: cible.height,
            '--teinte': habillage.teinte,
          } as CSSProperties
        }
        onClick={(e) => e.stopPropagation()}
      >
        {/* Recto : la tuile telle qu'on l'a touchée. */}
        <div className={local.recto} aria-hidden="true">
          {habillage.photo !== undefined && (
            <span className={local.photo}>
              <Visuel nom={habillage.photo} sizes="420px" />
            </span>
          )}
          <span className={local.voileRecto} />
          <span className={local.nomRecto}>{famille.nom}</span>
        </div>

        {/* Verso : ce que la famille développe. */}
        <div className={local.verso}>
          <div className={local.bandeau}>
            {habillage.photo !== undefined && (
              <span className={local.photo}>
                <Visuel nom={habillage.photo} sizes="420px" />
              </span>
            )}
            <span className={local.voileBandeau} />
            <button
              ref={fermer}
              type="button"
              className={local.fermer}
              onClick={refermer}
              aria-label="Fermer"
            >
              <Icon name="close" size="20px" />
            </button>
            <div className={local.titres}>
              <h2 id={titreId} className={local.nom}>
                {famille.nom}
              </h2>
              {famille.sousTitre !== undefined && (
                <p className={local.sousTitre}>{famille.sousTitre}</p>
              )}
              <span className={local.barres} aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
            </div>
          </div>

          <div className={local.contenu}>
            <p className={local.resume}>{famille.resume}</p>

            {qualites.length > 0 && (
              <>
                <h3 className={local.rubrique}>Ce que tu développes</h3>
                {qualites.map((q) => (
                  <section key={q.nom} className={local.programme}>
                    {qualites.length > 1 && <h4 className={local.nomProgramme}>{q.nom}</h4>}
                    <ul className={local.liste}>
                      {q.objectifs.map((o) => (
                        <li key={o}>{o}</li>
                      ))}
                    </ul>
                  </section>
                ))}
              </>
            )}
          </div>

          <div className={local.actions}>
            <button type="button" className={local.voir} onClick={onVoir}>
              Voir les programmes
              <Icon name="arrow-right" size="18px" />
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
