import { useEffect, useMemo, useState } from 'react';
import { BarChart, LineChart, type Series } from '../components/Chart';
import { NotesBrowser } from '../components/NotesBrowser';
import { SessionDurations } from '../components/SessionDurations';
import { VisualTracking } from '../components/VisualTracking';
import { WeightOverview } from '../components/WeightOverview';
import { EXERCISES } from '../data/exercises';
import { prescriptionFor } from '../data/mainLiftTable';
import { DAY_LABELS_SHORT, type MainLiftId } from '../data/types';
import { fr } from '../engine/format';
import { explosiveTrend, weeklyBests } from '../engine/trends';
import type { HistoryIndex, SessionContext } from '../engine/types';
import {
  allReadiness,
  allSessions,
  allSets,
  buildHistoryIndex,
  getSettingsRow,
  toEngineSettings,
  toReadinessRecords,
} from '../db/repo';
import type { ReadinessRow, SessionRow, SetRow } from '../db/db';
import { Icon } from '../components/Icon';
import { ScreenHeader } from '../components/ScreenHeader';
import styles from './Progress.module.css';

/** Les quatre lifts que le programme suit vraiment (§13). */
const LIFTS: Array<{ id: MainLiftId; label: string }> = [
  { id: 'back-squat', label: 'Squat' },
  { id: 'bench-press', label: 'Bench' },
  { id: 'deadlift', label: 'Deadlift' },
  { id: 'weighted-pullup', label: 'Tractions' },
];

/**
 * L'écran répond à une seule question — « est-ce que ça bouge ? » — par trois
 * moyens : les charges, le poids de corps et l'œil. Un sélecteur en haut plutôt
 * que huit sections empilées : les courbes se consultent le soir, les photos une
 * fois par semaine, on ne veut pas faire défiler les unes pour atteindre les
 * autres.
 *
 * Le poids a sa propre vue et pas une carte de plus sous les charges : il porte
 * son propre sélecteur de période, deux graphiques et un tableau de treize
 * lignes. Empilé sous le reste, on ne l'aurait jamais atteint au pouce.
 */
type Vue = 'chiffres' | 'poids' | 'remarques' | 'photos';

/** Le sous-titre de l'en-tête suit la vue choisie. */
const SOUS_TITRES: Record<Vue, string> = {
  chiffres: 'Charges réelles contre plan',
  poids: 'Poids de corps depuis le combine',
  remarques: 'Tes notes, de la plus récente',
  photos: 'Une photo par semaine',
};

export function ProgressScreen() {
  const [vue, setVue] = useState<Vue>('chiffres');
  const [data, setData] = useState<{
    history: HistoryIndex;
    readiness: ReadinessRow[];
    sets: SetRow[];
    sessions: SessionRow[];
    baseline: number | null;
    oneRM: Record<string, number>;
    ctx: SessionContext;
  } | null>(null);
  const [lift, setLift] = useState<MainLiftId>('deadlift');

  useEffect(() => {
    void (async () => {
      const [sets, readiness, settingsRow, sessions] = await Promise.all([
        allSets(),
        allReadiness(),
        getSettingsRow(),
        allSessions(),
      ]);
      const history = buildHistoryIndex(sets);
      setData({
        history,
        readiness,
        sets,
        sessions,
        baseline: settingsRow.broadJumpBaselineCm,
        oneRM: settingsRow.oneRM,
        /*
         * La durée prévue d'une séance se calcule depuis la séance RÉSOLUE :
         * elle dépend des règles de bloc, du deload, des séries réellement
         * prescrites. On reconstruit donc le même contexte que l'écran Séance ;
         * la readiness, elle, est posée séance par séance par le composant.
         */
        ctx: {
          settings: toEngineSettings(settingsRow),
          history,
          readiness: null,
          explosiveDecline: explosiveTrend(toReadinessRecords(readiness)).declining,
        },
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
    // Même base que les séances : la courbe « Plan » doit montrer le plan
    // recalé, pas celui d'avant le combine.
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
    { label: 'Réel', color: 'var(--accent-ink)', points: realPoints },
  ];

  // --- broad jump dans le temps --------------------------------------------
  const jumps = weeklyBests(toReadinessRecords(data.readiness));
  const jumpSeries: Series[] = [
    {
      label: 'Meilleur saut',
      color: 'var(--vert)',
      points: jumps.map((j) => ({ x: j.week, y: j.cm })),
    },
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
    const cur = bySession.get(key) ?? {
      sum: 0,
      n: 0,
      week: s.week,
      day: s.day,
    };
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
      /*
       * Bleu pour une séance ordinaire, rouge pour une séance encaissée à 9
       * ou plus. Les deux étaient rouges : un rouge vif contre un rouge
       * clair, impossible à séparer d'un coup d'œil alors que c'est tout ce
       * qu'on cherche sur ce graphique. La nuance ne porte plus seule — le
       * sous-titre dit déjà ce que signifie une barre rouge.
       */
      color: v.sum / v.n >= 9 ? 'var(--rouge)' : 'var(--bleu-ink)',
    }));

  const weeksX = Object.fromEntries(
    Array.from({ length: 12 }, (_, i) => [i + 1, i % 2 === 0 ? `S${i + 1}` : '']),
  );

  return (
    <div className={styles.screen}>
      <ScreenHeader
        eyebrow="12 semaines"
        title="Progression"
        subtitle={SOUS_TITRES[vue]}
        visuel="sprint"
        compact
      />

      <div className={styles.segment} role="group" aria-label="Vue">
        {(
          [
            ['chiffres', 'Charges'],
            ['poids', 'Poids'],
            ['remarques', 'Remarques'],
            ['photos', 'Photos'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`${styles.segmentButton} ${vue === id ? styles.segmentOn : ''}`}
            onClick={() => setVue(id)}
            aria-pressed={vue === id}
          >
            {label}
          </button>
        ))}
      </div>

      {vue === 'poids' && <WeightOverview />}

      {vue === 'remarques' && <NotesBrowser />}

      {vue === 'photos' && <VisualTracking />}

      {vue === 'chiffres' && (
        <>
          {trend?.declining && (
            <p className={`${styles.alert} ${trend.suggestEarlyDeload ? styles.alertRouge : ''}`}>
              <span className={styles.alertIcon} aria-hidden="true">
                <Icon name="alert" size="18px" />
              </span>
              <span>{trend.message}</span>
            </p>
          )}

          <div className={styles.lifts} role="group" aria-label="Mouvement suivi">
            {LIFTS.map((l) => (
              <button
                key={l.id}
                type="button"
                className={`${styles.lift} ${lift === l.id ? styles.liftOn : ''}`}
                onClick={() => setLift(l.id)}
                aria-pressed={lift === l.id}
              >
                {l.label}
              </button>
            ))}
          </div>

          <section className={styles.card}>
            <h2 className={styles.cardTitle}>
              <span className={styles.cardIcon} aria-hidden="true">
                <Icon name="chart" size="20px" />
              </span>
              {EXERCISES[lift]?.name}
            </h2>
            <p className={styles.cardSub}>Charge travaillée semaine par semaine, contre le plan.</p>
            {realPoints.length === 0 ? (
              <p className={styles.cardSub}>Rien d’enregistré pour l’instant.</p>
            ) : (
              <p className={styles.cardValeur}>
                {fr(realPoints[realPoints.length - 1]!.y)} kg <small>dernière charge</small>
              </p>
            )}
            <LineChart
              series={liftSeries}
              xLabels={weeksX}
              unit="kg"
              emptyMessage="Valide des séries pour voir la courbe apparaître."
            />
          </section>

          <section className={styles.card}>
            <h2 className={styles.cardTitle}>
              <span className={styles.cardIcon} aria-hidden="true">
                <Icon name="arrow-up" size="20px" />
              </span>
              Broad jump
            </h2>
            <p className={styles.cardSub}>
              Meilleur saut de chaque semaine. Deux baisses de suite déclenchent le cas 7 du
              programme.
            </p>
            <LineChart
              series={jumpSeries}
              xLabels={weeksX}
              unit="cm"
              emptyMessage="Aucun readiness test enregistré."
            />
          </section>

          <section className={styles.card}>
            <h2 className={styles.cardTitle}>
              <span className={styles.cardIcon} aria-hidden="true">
                <Icon name="stopwatch" size="20px" />
              </span>
              Durée des séances
            </h2>
            <p className={styles.cardSub}>
              Mesurée entre la première ouverture de la séance et « Séance terminée ». Le trait
              clair sur la barre marque la durée prévue.
            </p>
            <SessionDurations
              rows={data.sessions}
              readinessRows={data.readiness}
              baselineCm={data.baseline}
              ctx={data.ctx}
            />
          </section>

          <section className={styles.card}>
            <h2 className={styles.cardTitle}>
              <span className={styles.cardIcon} aria-hidden="true">
                <Icon name="alert" size="20px" />
              </span>
              RPE moyen par séance
            </h2>
            <p className={styles.cardSub}>
              Les 12 dernières séances. Une barre rouge signale une séance encaissée à 9 ou plus.
            </p>
            <BarChart bars={rpeBars} emptyMessage="Aucun RPE saisi pour l’instant." />
          </section>
        </>
      )}
    </div>
  );
}
