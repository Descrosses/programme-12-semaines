/**
 * Graphiques en SVG écrit à la main.
 *
 * Pas de bibliothèque : un graphe de progression, c'est une polyligne et des
 * étiquettes. Importer 200 Ko de dépendance pour ça pénaliserait le premier
 * chargement, qui doit rester rapide en 4G dans une salle.
 */

import { fr } from '../engine/format';
import styles from './Chart.module.css';

export interface Point {
  x: number;
  y: number;
}

export interface Series {
  label: string;
  color: string;
  points: Point[];
  /** Trait pointillé : sert à distinguer le plan du réalisé. */
  dashed?: boolean;
}

const W = 320;
const H = 150;
const PAD = { top: 10, right: 8, bottom: 22, left: 34 };

export function LineChart({
  series,
  xLabels,
  unit = '',
  emptyMessage = 'Pas encore de données.',
}: {
  series: Series[];
  /** Étiquette sous l'axe horizontal, indexée par valeur de `x`. */
  xLabels: Record<number, string>;
  unit?: string;
  emptyMessage?: string;
}) {
  const all = series.flatMap((s) => s.points);
  if (all.length === 0) return <p className={styles.empty}>{emptyMessage}</p>;

  const xs = all.map((p) => p.x);
  const ys = all.map((p) => p.y);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const rawMin = Math.min(...ys);
  const rawMax = Math.max(...ys);
  // Une marge de 8 % évite qu'un point ne colle au bord du cadre.
  const span = rawMax - rawMin || Math.max(1, rawMax * 0.1);
  const yMin = rawMin - span * 0.08;
  const yMax = rawMax + span * 0.08;

  const px = (x: number) =>
    PAD.left + ((x - xMin) / (xMax - xMin || 1)) * (W - PAD.left - PAD.right);
  const py = (y: number) => PAD.top + (1 - (y - yMin) / (yMax - yMin)) * (H - PAD.top - PAD.bottom);

  const ticks = [rawMin, (rawMin + rawMax) / 2, rawMax];

  return (
    <figure className={styles.figure}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className={styles.svg}
        role="img"
        aria-label={series.map((s) => s.label).join(', ')}
      >
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={PAD.left} y1={py(t)} x2={W - PAD.right} y2={py(t)} className={styles.grid} />
            <text x={PAD.left - 5} y={py(t) + 3.5} className={styles.tick} textAnchor="end">
              {fr(Math.round(t * 10) / 10)}
            </text>
          </g>
        ))}

        {Object.entries(xLabels).map(([x, label]) => {
          const v = Number(x);
          if (v < xMin || v > xMax) return null;
          return (
            <text key={x} x={px(v)} y={H - 6} className={styles.tick} textAnchor="middle">
              {label}
            </text>
          );
        })}

        {series.map((s) => (
          <g key={s.label}>
            {s.points.length > 1 && (
              <polyline
                points={s.points.map((p) => `${px(p.x)},${py(p.y)}`).join(' ')}
                fill="none"
                stroke={s.color}
                strokeWidth={2.5}
                strokeLinejoin="round"
                strokeLinecap="round"
                strokeDasharray={s.dashed ? '5 4' : undefined}
                opacity={s.dashed ? 0.75 : 1}
              />
            )}
            {s.points.map((p, i) => (
              <circle key={i} cx={px(p.x)} cy={py(p.y)} r={s.dashed ? 2 : 3.5} fill={s.color} />
            ))}
          </g>
        ))}
      </svg>

      <figcaption className={styles.legend}>
        {series.map((s) => (
          <span key={s.label} className={styles.legendItem}>
            <span
              className={`${styles.swatch} ${s.dashed ? styles.swatchDashed : ''}`}
              style={{ background: s.color }}
            />
            {s.label}
          </span>
        ))}
        {unit && <span className={styles.unit}>en {unit}</span>}
      </figcaption>
    </figure>
  );
}

/** Barres verticales simples — RPE moyen par séance, tonnage, etc. */
export function BarChart({
  bars,
  unit = '',
  emptyMessage = 'Pas encore de données.',
}: {
  bars: Array<{ label: string; value: number; color?: string }>;
  unit?: string;
  emptyMessage?: string;
}) {
  if (bars.length === 0) return <p className={styles.empty}>{emptyMessage}</p>;

  const max = Math.max(...bars.map((b) => b.value));
  const min = Math.min(0, ...bars.map((b) => b.value));
  const bw = (W - PAD.left - PAD.right) / bars.length;

  return (
    <figure className={styles.figure}>
      <svg viewBox={`0 0 ${W} ${H}`} className={styles.svg} role="img">
        {[min, (min + max) / 2, max].map((t, i) => {
          const y = PAD.top + (1 - (t - min) / (max - min || 1)) * (H - PAD.top - PAD.bottom);
          return (
            <g key={i}>
              <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} className={styles.grid} />
              <text x={PAD.left - 5} y={y + 3.5} className={styles.tick} textAnchor="end">
                {fr(Math.round(t * 10) / 10)}
              </text>
            </g>
          );
        })}

        {bars.map((b, i) => {
          const h = ((b.value - min) / (max - min || 1)) * (H - PAD.top - PAD.bottom);
          return (
            <g key={i}>
              <rect
                x={PAD.left + i * bw + bw * 0.18}
                y={H - PAD.bottom - h}
                width={bw * 0.64}
                height={Math.max(1, h)}
                rx={2}
                fill={b.color ?? 'var(--accent)'}
              />
              <text
                x={PAD.left + i * bw + bw / 2}
                y={H - 6}
                className={styles.tick}
                textAnchor="middle"
              >
                {b.label}
              </text>
            </g>
          );
        })}
      </svg>
      {unit && <figcaption className={styles.legend}>en {unit}</figcaption>}
    </figure>
  );
}
