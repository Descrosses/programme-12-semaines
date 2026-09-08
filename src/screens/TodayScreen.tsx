import { useEffect, useState } from 'react';
import { BLOCKS, WEEK_BLOCKS } from '../data/program';
import { DAY_LABELS, type DayIndex, type WeekIndex } from '../data/types';
import { humanDate, locateToday, type TodayState } from '../engine/calendar';
import { getSession } from '../engine/getSession';
import { explosiveTrend, type ExplosiveTrend } from '../engine/trends';
import {
  allReadiness,
  allSessions,
  allSets,
  buildHistoryIndex,
  getSettingsRow,
  toEngineSettings,
  toReadinessRecords,
} from '../db/repo';
import type { SessionRow } from '../db/db';
import styles from './Screens.module.css';

/**
 * Écran d'ouverture.
 *
 * Défaut n°11 du prototype : il fallait retrouver la bonne semaine et le bon
 * jour à la main. Ici la date fait tout le travail, et le bouton reste
 * disponible pour les jours où le programme décale.
 */
export function TodayScreen({
  onOpen,
  onGoWeek,
  onGoSettings,
}: {
  onOpen: (week: WeekIndex, day: DayIndex) => void;
  onGoWeek: (week: WeekIndex) => void;
  onGoSettings: () => void;
}) {
  const [state, setState] = useState<{
    loading: boolean;
    today: TodayState | null;
    title: string;
    intensity: string;
    duration: string;
    rows: SessionRow[];
    trend: ExplosiveTrend;
  }>({
    loading: true,
    today: null,
    title: '',
    intensity: '',
    duration: '',
    rows: [],
    trend: { declining: false, consecutiveDrops: 0, suggestEarlyDeload: false, weekly: [], message: '' },
  });

  useEffect(() => {
    void (async () => {
      const settingsRow = await getSettingsRow();
      const settings = toEngineSettings(settingsRow);
      const todayIso = new Date().toISOString().slice(0, 10);
      const today = locateToday(settings.startDate, todayIso);

      const [sets, readinessRows, rows] = await Promise.all([
        allSets(),
        allReadiness(),
        allSessions(),
      ]);
      const history = buildHistoryIndex(sets);
      const trend = explosiveTrend(toReadinessRecords(readinessRows), todayIso);

      // Aperçu de la séance : seul l'en-tête nous intéresse ici.
      let title = '';
      let intensity = '';
      let duration = '';
      const target =
        today?.kind === 'session' ? today.session : today?.kind === 'rest' ? today.next : null;
      if (target) {
        const s = getSession(target.week, target.day, {
          settings,
          history,
          readiness: null,
          explosiveDecline: trend.declining,
        });
        title = s?.title ?? '';
        intensity = s?.intensity ?? '';
        duration = s?.durationLabel ?? '';
      }

      setState({ loading: false, today, title, intensity, duration, rows, trend });
    })();
  }, []);

  if (state.loading) return <div className={styles.loading}>Chargement…</div>;

  const { today, trend } = state;

  if (!today) {
    return (
      <div className={styles.screen}>
        <header className={styles.header}>
          <h1 className={styles.h1}>Bienvenue</h1>
          <p className={styles.lead}>
            Il manque une seule chose pour démarrer : la date du samedi de ton combine initial. Tout
            le calendrier en découle.
          </p>
        </header>
        <button type="button" className={styles.primary} onClick={onGoSettings}>
          Renseigner la date de début
        </button>
      </div>
    );
  }

  const status = (week: number, day: DayIndex) =>
    state.rows.find((r) => r.week === week && r.day === day)?.status ?? 'planned';

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <div className={styles.eyebrow}>
          {humanDate(new Date().toISOString().slice(0, 10))}
        </div>

        {today.kind === 'session' && (
          <>
            <h1 className={styles.todayTitle}>{state.title}</h1>
            <div className={styles.meta}>
              <span
                className={styles.tag}
                style={{ background: BLOCKS[WEEK_BLOCKS[today.session.week]].color }}
              >
                {state.intensity}
              </span>
              <span>
                Semaine <b>{today.session.week === 0 ? 'de test' : today.session.week}</b>
              </span>
              <span>{DAY_LABELS[today.session.day]}</span>
              <span>
                Durée <b>{state.duration}</b>
              </span>
            </div>
          </>
        )}

        {today.kind === 'rest' && (
          <>
            <h1 className={styles.todayTitle}>Repos</h1>
            <p className={styles.lead}>
              Prochaine séance {today.daysUntil === 1 ? 'demain' : `dans ${today.daysUntil} jours`},{' '}
              <b>{DAY_LABELS[today.next.day].toLowerCase()}</b> : {state.title}.
            </p>
          </>
        )}

        {today.kind === 'before' && (
          <>
            <h1 className={styles.todayTitle}>Ça commence bientôt</h1>
            <p className={styles.lead}>
              Premier jour du combine initial dans {today.daysUntil} jour
              {today.daysUntil > 1 ? 's' : ''}, le {humanDate(today.first.date)}.
            </p>
          </>
        )}

        {today.kind === 'finished' && (
          <>
            <h1 className={styles.todayTitle}>12 semaines bouclées</h1>
            <p className={styles.lead}>
              Dernière séance le {humanDate(today.last.date)}. Regarde l’écran Progression pour
              comparer tes trois combines.
            </p>
          </>
        )}
      </header>

      {trend.declining && (
        <p className={`${styles.alert} ${trend.suggestEarlyDeload ? styles.alertRouge : ''}`}>
          {trend.message}
        </p>
      )}

      {today.kind === 'session' && (
        <>
          {status(today.session.week, today.session.day) === 'done' ? (
            <>
              <p className={`${styles.alert} ${styles.alertVert}`}>
                Séance déjà marquée comme terminée. Tu peux la rouvrir pour corriger une saisie.
              </p>
              <button
                type="button"
                className={styles.secondary}
                onClick={() => onOpen(today.session.week, today.session.day)}
              >
                Rouvrir la séance
              </button>
            </>
          ) : (
            <button
              type="button"
              className={styles.primary}
              onClick={() => onOpen(today.session.week, today.session.day)}
            >
              Commencer la séance
            </button>
          )}
          <button
            type="button"
            className={styles.secondary}
            onClick={() => onGoWeek(today.session.week)}
          >
            Voir la semaine · changer de jour
          </button>
        </>
      )}

      {(today.kind === 'rest' || today.kind === 'before') && (
        <>
          <button
            type="button"
            className={styles.primary}
            onClick={() =>
              onOpen(
                today.kind === 'rest' ? today.next.week : today.first.week,
                today.kind === 'rest' ? today.next.day : today.first.day,
              )
            }
          >
            Ouvrir quand même la prochaine séance
          </button>
          <button
            type="button"
            className={styles.secondary}
            onClick={() =>
              onGoWeek(today.kind === 'rest' ? today.next.week : today.first.week)
            }
          >
            Voir la semaine · changer de jour
          </button>
        </>
      )}
    </div>
  );
}
