/**
 * Le poids de corps sur toute la durée du programme, en SVG écrit à la main.
 *
 * ── Pourquoi pas le `LineChart` existant ────────────────────────────────────
 *
 * Celui-là trace des séries indexées par numéro de semaine. Ici l'axe est le
 * temps au jour près, la courbe doit s'interrompre sur les trous, le fond est
 * colorié par bloc et une bande horizontale porte la cible. Tordre le composant
 * générique pour tout ça l'aurait rendu illisible pour ses trois autres usages.
 *
 * ── Ce que le graphique ne fait pas ────────────────────────────────────────
 *
 * Aucune animation : la courbe apparaît d'un coup. Une transition sur une
 * polyligne de cent points coûte des images perdues sur un téléphone, pour
 * zéro information.
 *
 * Aucun second axe Y pour le tour de taille : deux échelles dans un cadre de
 * 340 px de large, on ne sait plus quelle courbe lire sur quelle graduation.
 * Le tour de taille a son propre cadre, sous le premier, avec le même axe du
 * temps.
 *
 * Aucune interpolation : un trou reste un trou (voir `weightHistory`).
 */

import { useState } from 'react';
import { BLOCKS, WEEK_BLOCKS, type WeekIndex } from '../data/program';
import { addDays, daysBetween, humanDate } from '../engine/calendar';
import { fr } from '../engine/format';
import type { Measurement } from '../engine/nutrition';
import { serieMoyenne, serieTaille, troncons } from '../engine/weightHistory';
import styles from './WeightChart.module.css';

const W = 340;
const PAD = { top: 14, right: 10, bottom: 24, left: 36 };

/** Les repères verticaux demandés : le combine initial, la semaine 8, la 12. */
const REPERES: { week: WeekIndex; label: string }[] = [
  { week: 0, label: 'Combine' },
  { week: 8, label: 'S8' },
  { week: 12, label: 'S12' },
];

interface Cadre {
  debut: string;
  fin: string;
  /** Date de début du programme, ou `null` si elle n'est pas réglée. */
  startDate: string | null;
}

/** Un point touché : ce que la légende sous le graphique affiche. */
interface Touche {
  date: string;
  texte: string;
}

/**
 * Les deux conversions, valeur → pixel.
 *
 * `total` vaut 0 quand la fenêtre tient sur un jour : le `max(1, …)` évite la
 * division par zéro, et le point unique se place alors à gauche du cadre.
 */
function echelles(cadre: Cadre, hauteur: number, yMin: number, yMax: number) {
  const total = Math.max(0, daysBetween(cadre.debut, cadre.fin));
  const largeurInterne = W - PAD.left - PAD.right;
  const hauteurInterne = hauteur - PAD.top - PAD.bottom;
  const span = yMax - yMin || 1;
  return {
    total,
    pxJour: (j: number) => PAD.left + (Math.min(Math.max(j, 0), total) / Math.max(1, total)) * largeurInterne,
    px: (iso: string) =>
      PAD.left +
      (Math.min(Math.max(daysBetween(cadre.debut, iso), 0), total) / Math.max(1, total)) *
        largeurInterne,
    py: (v: number) => PAD.top + (1 - (v - yMin) / span) * hauteurInterne,
  };
}

/** Le fond colorié par bloc + les repères verticaux, partagé par les deux cadres. */
function FondBlocs({
  cadre,
  hauteur,
  pxJour,
  avecLabels,
}: {
  cadre: Cadre;
  hauteur: number;
  pxJour: (j: number) => number;
  /** Les étiquettes « Combine / S8 / S12 » ne vont que sur le cadre du haut. */
  avecLabels: boolean;
}) {
  if (!cadre.startDate) return null;
  const total = Math.max(0, daysBetween(cadre.debut, cadre.fin));
  const haut = PAD.top;
  const bas = hauteur - PAD.bottom;

  const semaines: { w: WeekIndex; x: number; largeur: number }[] = [];
  for (let w = 0 as WeekIndex; w <= 12; w = (w + 1) as WeekIndex) {
    const a = daysBetween(cadre.debut, addDays(cadre.startDate, w * 7));
    const b = a + 7;
    if (b <= 0 || a >= total) continue; // la semaine est hors du cadre
    const x = pxJour(a);
    const largeur = pxJour(b) - x;
    if (largeur > 0.5) semaines.push({ w, x, largeur });
  }

  return (
    <g>
      {semaines.map(({ w, x, largeur }) => (
        <rect
          key={w}
          x={x}
          y={haut}
          width={largeur}
          height={bas - haut}
          fill={BLOCKS[WEEK_BLOCKS[w]].color}
          opacity={0.13}
        />
      ))}
      {REPERES.map(({ week, label }) => {
        const j = daysBetween(cadre.debut, addDays(cadre.startDate!, week * 7));
        if (j < 0 || j > total) return null;
        const x = pxJour(j);
        return (
          <g key={label}>
            <line x1={x} y1={haut} x2={x} y2={bas} className={styles.repere} />
            {avecLabels && (
              <text
                x={Math.min(x + 3, W - PAD.right - 2)}
                y={haut - 4}
                className={styles.repereLabel}
                textAnchor={x > W - 60 ? 'end' : 'start'}
              >
                {label}
              </text>
            )}
          </g>
        );
      })}
    </g>
  );
}

/**
 * Le graphique du poids : pesées brutes en points discrets, moyenne glissante
 * 7 jours en trait épais, bande horizontale sur la cible.
 */
export function WeightChart({
  entries,
  cadre,
  bande,
}: {
  /** TOUTES les pesées, pas seulement celles de la fenêtre : la moyenne du
   *  premier jour affiché a besoin des six jours d'avant. */
  entries: Measurement[];
  cadre: Cadre;
  bande: { min: number; max: number };
}) {
  const [touche, setTouche] = useState<Touche | null>(null);
  const hauteur = 206;

  const pesees = entries
    .filter((e) => e.weightKg !== null && e.date >= cadre.debut && e.date <= cadre.fin)
    .map((e) => ({ date: e.date, value: e.weightKg! }));
  const lignes = troncons(serieMoyenne(entries, cadre.debut, cadre.fin));

  if (pesees.length === 0) {
    return (
      <p className={styles.vide}>
        Aucune pesée sur cette période. Saisis ton poids dans l’onglet Nutrition.
      </p>
    );
  }

  // La bande cible entre toujours dans le cadre : sinon on ne saurait pas de
  // quel côté on se trouve.
  const valeurs = [...pesees.map((p) => p.value), ...lignes.flat().map((p) => p.average), bande.min, bande.max];
  const brutMin = Math.min(...valeurs);
  const brutMax = Math.max(...valeurs);
  const marge = (brutMax - brutMin || 2) * 0.1;
  const yMin = brutMin - marge;
  const yMax = brutMax + marge;
  const { total, px, pxJour, py } = echelles(cadre, hauteur, yMin, yMax);
  const graduations = [brutMin, (brutMin + brutMax) / 2, brutMax];

  return (
    <figure className={styles.figure}>
      <svg
        viewBox={`0 0 ${W} ${hauteur}`}
        className={styles.svg}
        role="img"
        aria-label={`Poids de corps du ${humanDate(cadre.debut)} au ${humanDate(cadre.fin)}, moyenne glissante sur 7 jours, cible ${fr(bande.min)} à ${fr(bande.max)} kilos`}
      >
        <FondBlocs cadre={cadre} hauteur={hauteur} pxJour={pxJour} avecLabels />

        {graduations.map((g, i) => (
          <g key={i}>
            <line x1={PAD.left} y1={py(g)} x2={W - PAD.right} y2={py(g)} className={styles.grille} />
            <text x={PAD.left - 5} y={py(g) + 3.5} className={styles.graduation} textAnchor="end">
              {fr(Math.round(g * 10) / 10)}
            </text>
          </g>
        ))}

        {/* La cible du §13. La seule bande du graphique, et la seule du .md. */}
        <rect
          x={PAD.left}
          y={py(bande.max)}
          width={W - PAD.left - PAD.right}
          height={Math.max(1, py(bande.min) - py(bande.max))}
          className={styles.bande}
        />
        {[bande.min, bande.max].map((v) => (
          <line
            key={v}
            x1={PAD.left}
            y1={py(v)}
            x2={W - PAD.right}
            y2={py(v)}
            className={styles.bandeBord}
          />
        ))}

        {/* La moyenne glissante, un tronçon par suite de jours mesurés. */}
        {lignes.map((tr, i) =>
          tr.length === 1 ? (
            <circle key={i} cx={px(tr[0]!.date)} cy={py(tr[0]!.average)} r={3} className={styles.moyenneSeule} />
          ) : (
            <polyline
              key={i}
              points={tr.map((p) => `${px(p.date)},${py(p.average)}`).join(' ')}
              className={styles.moyenne}
            />
          ),
        )}

        {/* Les pesées brutes : petites, derrière la courbe dans la hiérarchie. */}
        {pesees.map((p) => (
          <circle key={p.date} cx={px(p.date)} cy={py(p.value)} r={2.2} className={styles.pesee} />
        ))}

        {touche && pesees.some((p) => p.date === touche.date) && (
          <circle
            cx={px(touche.date)}
            cy={py(pesees.find((p) => p.date === touche.date)!.value)}
            r={6}
            className={styles.peseeChoisie}
          />
        )}

        {/* Cibles tactiles séparées du dessin : un point de 2 px ne s'attrape
            pas au pouce. Elles sont invisibles et larges. */}
        {pesees.map((p) => (
          <circle
            key={`t-${p.date}`}
            cx={px(p.date)}
            cy={py(p.value)}
            r={14}
            className={styles.cible}
            onPointerDown={() =>
              setTouche({ date: p.date, texte: `${humanDate(p.date)} · ${fr(p.value)} kg` })
            }
          />
        ))}

        <text x={PAD.left} y={hauteur - 8} className={styles.graduation} textAnchor="start">
          {jourCourt(cadre.debut)}
        </text>
        {total > 6 && (
          <text x={W - PAD.right} y={hauteur - 8} className={styles.graduation} textAnchor="end">
            {jourCourt(cadre.fin)}
          </text>
        )}
      </svg>

      <p className={styles.touche} aria-live="polite">
        {touche ? touche.texte : 'Touche un point pour voir la date et le poids exact.'}
      </p>

      <figcaption className={styles.legende}>
        <span className={styles.item}>
          <span className={`${styles.pastille} ${styles.pastilleMoyenne}`} />
          Moyenne 7 jours
        </span>
        <span className={styles.item}>
          <span className={`${styles.pastille} ${styles.pastillePesee}`} />
          Pesées
        </span>
        <span className={styles.item}>
          <span className={`${styles.pastille} ${styles.pastilleBande}`} />
          Cible {fr(bande.min)}-{fr(bande.max)} kg
        </span>
      </figcaption>
    </figure>
  );
}

/** Le tour de taille, même axe du temps, son propre cadre. */
export function WaistChart({ entries, cadre }: { entries: Measurement[]; cadre: Cadre }) {
  const [touche, setTouche] = useState<Touche | null>(null);
  const hauteur = 128;
  const lignes = serieTaille(entries, cadre.debut, cadre.fin);
  const points = lignes.flat();

  if (points.length === 0) {
    return <p className={styles.vide}>Aucun tour de taille relevé sur cette période.</p>;
  }

  const brutMin = Math.min(...points.map((p) => p.value));
  const brutMax = Math.max(...points.map((p) => p.value));
  const marge = (brutMax - brutMin || 2) * 0.15;
  const { px, pxJour, py } = echelles(cadre, hauteur, brutMin - marge, brutMax + marge);
  const graduations = brutMin === brutMax ? [brutMin] : [brutMin, brutMax];

  return (
    <figure className={styles.figure}>
      <svg
        viewBox={`0 0 ${W} ${hauteur}`}
        className={styles.svg}
        role="img"
        aria-label="Tour de taille sur la même période"
      >
        <FondBlocs cadre={cadre} hauteur={hauteur} pxJour={pxJour} avecLabels={false} />

        {graduations.map((g, i) => (
          <g key={i}>
            <line x1={PAD.left} y1={py(g)} x2={W - PAD.right} y2={py(g)} className={styles.grille} />
            <text x={PAD.left - 5} y={py(g) + 3.5} className={styles.graduation} textAnchor="end">
              {fr(Math.round(g * 10) / 10)}
            </text>
          </g>
        ))}

        {lignes.map((tr, i) =>
          tr.length > 1 ? (
            <polyline
              key={i}
              points={tr.map((p) => `${px(p.date)},${py(p.value)}`).join(' ')}
              className={styles.taille}
            />
          ) : null,
        )}

        {points.map((p) => (
          <circle key={p.date} cx={px(p.date)} cy={py(p.value)} r={3} className={styles.pointTaille} />
        ))}

        {touche && points.some((p) => p.date === touche.date) && (
          <circle
            cx={px(touche.date)}
            cy={py(points.find((p) => p.date === touche.date)!.value)}
            r={6.5}
            className={styles.tailleChoisie}
          />
        )}

        {points.map((p) => (
          <circle
            key={`t-${p.date}`}
            cx={px(p.date)}
            cy={py(p.value)}
            r={14}
            className={styles.cible}
            onPointerDown={() =>
              setTouche({ date: p.date, texte: `${humanDate(p.date)} · ${fr(p.value)} cm` })
            }
          />
        ))}
      </svg>

      <p className={styles.touche} aria-live="polite">
        {touche ? touche.texte : 'Touche un point pour voir la date et la mesure exacte.'}
      </p>
    </figure>
  );
}

/** « 14/09 » — assez pour situer, assez court pour tenir sous l'axe. */
function jourCourt(iso: string): string {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
}
