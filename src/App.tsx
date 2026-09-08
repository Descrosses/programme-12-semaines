import { useEffect, useState } from 'react';
import { RestBar } from './components/RestBar';
import { WEEK_DAYS } from './data/program';
import { DAY_LABELS_SHORT, type DayIndex, type WeekIndex } from './data/types';
import { hasSession } from './engine/getSession';
import { SessionScreen } from './screens/SessionScreen';
import { useRestTimer } from './state/useRestTimer';
import { getSettingsRow, saveSettings } from './db/repo';
import styles from './App.module.css';

/**
 * Coquille de l'application.
 *
 * Écran temporaire de sélection semaine / jour, en attendant l'écran
 * « Aujourd'hui » qui fera la détection automatique. Le chrono, lui, est déjà
 * global : il survit au changement d'écran.
 */
export function App() {
  const timer = useRestTimer();
  const [target, setTarget] = useState<{ week: WeekIndex; day: DayIndex } | null>(null);
  const [week, setWeek] = useState<WeekIndex>(1);
  const [ready, setReady] = useState(false);

  // Date de début : sans elle, aucun calendrier. Valeur de dépannage tant que
  // l'écran Réglages n'existe pas.
  useEffect(() => {
    void (async () => {
      const row = await getSettingsRow();
      if (!row.startDate) {
        await saveSettings({
          startDate: lastSaturday(),
          broadJumpBaselineCm: row.broadJumpBaselineCm ?? 240,
          oneRM: Object.keys(row.oneRM).length
            ? row.oneRM
            : { 'back-squat': 140, 'bench-press': 120, deadlift: 130, 'weighted-pullup': 42 },
        });
      }
      setReady(true);
    })();
  }, []);

  if (!ready) return null;

  if (target) {
    return (
      <>
        <SessionScreen
          week={target.week}
          day={target.day}
          timer={timer}
          onBack={() => setTarget(null)}
        />
        <RestBar timer={timer} />
      </>
    );
  }

  return (
    <div className={styles.picker}>
      <h1 className={styles.h1}>Programme 12 semaines</h1>
      <p className={styles.sub}>Choisis une semaine et un jour.</p>

      <div className={styles.weeks}>
        {Array.from({ length: 13 }, (_, w) => (
          <button
            key={w}
            type="button"
            className={`${styles.week} ${w === week ? styles.weekOn : ''}`}
            onClick={() => setWeek(w as WeekIndex)}
          >
            {w === 0 ? 'T' : w}
          </button>
        ))}
      </div>

      <div className={styles.days}>
        {WEEK_DAYS[week].map((d) => (
          <button
            key={d}
            type="button"
            className={styles.day}
            disabled={!hasSession(week, d)}
            onClick={() => setTarget({ week, day: d })}
          >
            {DAY_LABELS_SHORT[d]}
          </button>
        ))}
      </div>

      <RestBar timer={timer} />
    </div>
  );
}

/** Samedi le plus récent — point de départ par défaut du combine initial. */
function lastSaturday(): string {
  const d = new Date();
  d.setDate(d.getDate() - ((d.getDay() + 1) % 7));
  return d.toISOString().slice(0, 10);
}
