import { useEffect, useMemo, useState } from 'react';
import { BarChart, LineChart, type Series } from '../components/Chart';
import { EXERCISES } from '../data/exercises';
import { prescriptionFor } from '../data/mainLiftTable';
import { DAY_LABELS_SHORT, type MainLiftId } from '../data/types';
import { fr } from '../engine/format';
import { explosiveTrend, weeklyBests } from '../engine/trends';
import type { HistoryIndex } from '../engine/types';
import {
  allReadiness,
  allSets,
  buildHistoryIndex,
  getSettingsRow,
  toReadinessRecords,
} from '../db/repo';
import type { ReadinessRow, SetRow } from '../db/db';
import styles from './Screens.module.css';

/** Les quatre lifts que le programme suit vraiment (§13). */
const LIFTS: Array<{ id: MainLiftId; label: string }> = [
  { id: 'back-squat', label: 'Squat' },
  { id: 'bench-press', label: 'Bench' },
  { id: 'deadlift', label: 'Deadlift' },
  { id: 'weighted-pullup', label: 'Tractions' },
];

export function ProgressScreen() {
  const [data, setData] = useState<{
    history: HistoryIndex;
    readiness: ReadinessRow[];
    sets: SetRow[];
    baseline: number | null;
  } | null>(null);
  const [lift, setLift] = useState<MainLiftId>('deadlift');

  useEffect(() => {
    void (async () => {
      const [sets, readiness, settingsRow] = await Promise.all([
        allSets(),
        allReadiness(),
        getSettingsRow(),
      ]);
      setData({
        history: buildHistoryIndex(sets),
        readiness,
        sets,
        baseline: settingsRow.broadJumpBaselineCm,
      });
    })();
  }, []);

  const trend = useMemo(
    () => (data ? explosiveTrend(toReadinessRecords(data.readiness)) : null),
    [data],
  );

  if (!data) return <div className={styles.loading}>Chargement…</div>;

  // --- charge réelle vs plan, semaine par semaine ---------------------------
  const planPoints = [];
  for (let w = 1; w <= 12; w++) {
    const p = prescriptionFor(lift, w);
    const kg = p?.load && 'kg' in p.load ? p.load.kg : null;
    if (kg !== null) planPoints.push({ x: w, y: kg });
  }
  const exId = LIFTS.find((l) => l.id === lift)!.id;
  const realPoints = (data.history[exId] ?? [])
    .filter((o) => o.kg !== null)
    .map((o) => ({ x: o.week, y: o.kg! }));

  const liftSeries: Series[] = [
    { label: 'Plan', color: 'var(--ink-3)', points: planPoints, dashed: true },
    { label: 'Réel', color: 'var(--accent)', points: realPoints },
  ];

  // --- broad jump dans le temps --------------------------------------------
  const jumps = weeklyBests(toReadinessRecords(data.readiness));
  const jumpSeries: Series[] = [
    { label: 'Meilleur saut', color: 'var(--vert)', points: jumps.map((j) => ({ x: j.week, y: j.cm })) },
  ];
  if (data.baseline !== null && jumps.length > 0) {
    jumpSeries.unshift({
      label: 'Référence',
      color: 'var(--ink-3)',
      dashed: true,
      points: [
        { x: jumps[0]!.week, y: data.baseline },
        { x: jumps[jumps.length - 1]!.week, y: data.baseline },
      ],
    });
  }

  // --- RPE moyen par séance -------------------------------------------------
  const bySession = new Map<string, { sum: number; n: number; week: number; day: number }>();
  for (const s of data.sets) {
    if (s.actualRpe === null) continue;
    const key = `${s.week}-${s.day}`;
    const cur = bySession.get(key) ?? { sum: 0, n: 0, week: s.week, day: s.day };
    cur.sum += s.actualRpe;
    cur.n += 1;
    bySession.set(key, cur);
  }
  const rpeBars = [...bySession.values()]
    .sort((a, b) => a.week - b.week || a.day - b.day)
    .slice(-12)
    .map((v) => ({
      label: `${v.week}${DAY_LABELS_SHORT[v.day as 0 | 1 | 2 | 3 | 4][0]}`,
      value: Math.round((v.sum / v.n) * 10) / 10,
      color: v.sum / v.n >= 9 ? 'var(--rouge)' : 'var(--accent)',
    }));

  const weeksX = Object.fromEntries(
    Array.from({ length: 12 }, (_, i) => [i + 1, i % 2 === 0 ? `S${i + 1}` : '']),
  );

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <h1 className={styles.h1}>Progression</h1>
        <p className={styles.lead}>Ce que tu as réellement soulevé, comparé au plan.</p>
      </header>

      {trend?.declining && (
        <p className={`${styles.alert} ${trend.suggestEarlyDeload ? styles.alertRouge : ''}`}>
          {trend.message}
        </p>
      )}

      <div className={styles.weeks}>
        {LIFTS.map((l) => (
          <button
            key={l.id}
            type="button"
            className={`${styles.week} ${lift === l.id ? styles.weekOn : ''}`}
            style={{ width: 'auto', padding: '0 14px', borderBottomColor: 'var(--accent)' }}
            onClick={() => setLift(l.id)}
            aria-pressed={lift === l.id}
          >
            <span className={styles.weekNum} style={{ fontSize: '1rem' }}>
              {l.label}
            </span>
          </button>
        ))}
      </div>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>{EXERCISES[lift]?.name} — charge par semaine</h2>
        <p className={styles.cardSub}>
          {realPoints.length === 0
            ? 'Rien d’enregistré pour l’instant.'
            : `Dernière charge travaillée : ${fr(realPoints[realPoints.length - 1]!.y)} kg.`}
        </p>
        <LineChart
          series={liftSeries}
          xLabels={weeksX}
          unit="kg"
          emptyMessage="Valide des séries pour voir la courbe apparaître."
        />
      </section>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Broad jump — readiness</h2>
        <p className={styles.cardSub}>
          Meilleur saut de chaque semaine. Deux baisses de suite déclenchent le cas 7 du programme.
        </p>
        <LineChart
          series={jumpSeries}
          xLabels={weeksX}
          unit="cm"
          emptyMessage="Aucun readiness test enregistré."
        />
      </section>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>RPE moyen par séance</h2>
        <p className={styles.cardSub}>
          Les 12 dernières séances. Une barre rouge signale une séance encaissée à 9 ou plus.
        </p>
        <BarChart bars={rpeBars} emptyMessage="Aucun RPE saisi pour l’instant." />
      </section>
    </div>
  );
}
