import { useCallback, useEffect, useState } from 'react';
import { RestBar } from './components/RestBar';
import type { DayIndex, WeekIndex } from './data/types';
import { CombineScreen } from './screens/CombineScreen';
import { ProgressScreen } from './screens/ProgressScreen';
import { SessionScreen } from './screens/SessionScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { TodayScreen } from './screens/TodayScreen';
import { WeekScreen } from './screens/WeekScreen';
import { useRestTimer } from './state/useRestTimer';
import { useRoute, type Route } from './state/useRoute';
import { getSettingsRow } from './db/repo';
import styles from './App.module.css';

type TabName = 'today' | 'week' | 'progress' | 'combine' | 'settings';

const TABS: Array<{ name: TabName; label: string; icon: string }> = [
  { name: 'today', label: 'Aujourd’hui', icon: '▶' },
  { name: 'week', label: 'Semaine', icon: '▦' },
  { name: 'progress', label: 'Progrès', icon: '📈' },
  { name: 'combine', label: 'Combine', icon: '⏱' },
  { name: 'settings', label: 'Réglages', icon: '⚙' },
];

export function App() {
  const [alerts, setAlerts] = useState({ sound: true, vibration: true });
  const timer = useRestTimer(alerts);
  const [route, navigate] = useRoute();
  /** Incrémenté quand les réglages changent : force les écrans à se recharger. */
  const [dataVersion, setDataVersion] = useState(0);

  useEffect(() => {
    void (async () => {
      const row = await getSettingsRow();
      setAlerts({ sound: row.soundEnabled, vibration: row.vibrationEnabled });
    })();
  }, [dataVersion]);

  const openSession = useCallback(
    (week: WeekIndex, day: DayIndex) => navigate({ name: 'session', week, day }),
    [navigate],
  );

  const refresh = useCallback(() => setDataVersion((v) => v + 1), []);

  // Pendant une séance, la barre de navigation disparaît : l'écran est long,
  // le pouce navigue dedans, et une barre de plus multiplierait les appuis ratés.
  const inSession = route.name === 'session';

  return (
    <div className={inSession ? styles.app : `${styles.app} ${styles.withNav}`}>
      <main>{renderScreen(route, dataVersion, openSession, navigate, refresh, timer)}</main>

      <RestBar timer={timer} />

      {!inSession && (
        <nav className={styles.nav} aria-label="Navigation principale">
          {TABS.map((tab) => {
            const active = route.name === tab.name;
            return (
              <button
                key={tab.name}
                type="button"
                className={`${styles.tab} ${active ? styles.tabOn : ''}`}
                onClick={() =>
                  navigate(tab.name === 'week' ? { name: 'week', week: currentWeek(route) } : { name: tab.name })
                }
                aria-current={active ? 'page' : undefined}
              >
                <span className={styles.tabIcon} aria-hidden="true">
                  {tab.icon}
                </span>
                <span className={styles.tabLabel}>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      )}
    </div>
  );
}

function currentWeek(route: Route): WeekIndex {
  return route.name === 'week' || route.name === 'session' ? route.week : 1;
}

function renderScreen(
  route: Route,
  dataVersion: number,
  openSession: (week: WeekIndex, day: DayIndex) => void,
  navigate: (route: Route) => void,
  refresh: () => void,
  timer: ReturnType<typeof useRestTimer>,
) {
  switch (route.name) {
    case 'session':
      return (
        <SessionScreen
          key={`${route.week}-${route.day}-${dataVersion}`}
          week={route.week}
          day={route.day}
          timer={timer}
          onBack={() => navigate({ name: 'week', week: route.week })}
        />
      );

    case 'week':
      return (
        <WeekScreen
          key={`${route.week}-${dataVersion}`}
          week={route.week}
          onChangeWeek={(w) => navigate({ name: 'week', week: w })}
          onOpen={openSession}
        />
      );

    case 'progress':
      return <ProgressScreen key={dataVersion} />;

    case 'combine':
      return <CombineScreen key={dataVersion} />;

    case 'settings':
      return <SettingsScreen key={dataVersion} onChanged={refresh} />;

    default:
      return (
        <TodayScreen
          key={dataVersion}
          onOpen={openSession}
          onGoWeek={(w) => navigate({ name: 'week', week: w })}
          onGoSettings={() => navigate({ name: 'settings' })}
        />
      );
  }
}
