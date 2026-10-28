import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { BLOCKS, WEEK_BLOCKS, WEEK_DAYS } from '../data/program';
import { DAY_LABELS, DAY_LABELS_SHORT, type DayIndex, type WeekIndex } from '../data/types';
import { dateFor, humanDateShort } from '../engine/calendar';
import { getSession } from '../engine/getSession';
import {
  allReadiness,
  allSessions,
  allSets,
  buildHistoryIndex,
  getSettingsRow,
  toEngineSettings,
  toReadinessRecords,
} from '../db/repo';
import { explosiveTrend } from '../engine/trends';
import type { SessionRow } from '../db/db';
import { defilementPourCentrer } from '../state/weekStrip';
import { Icon } from '../components/Icon';
import { ScreenHeader } from '../components/ScreenHeader';
import { DiagonalStripes } from '../components/Decor';
import styles from './Week.module.css';

interface DayLine {
  day: DayIndex;
  title: string;
  intensity: string;
  duration: string;
  date: string;
  status: SessionRow['status'];
  isToday: boolean;
}

/** Vue de la semaine : les 5 jours, leur état, et le bloc en cours. */
export function WeekScreen({
  week,
  onChangeWeek,
  onOpen,
  onGoNutrition,
}: {
  week: WeekIndex;
  onChangeWeek: (week: WeekIndex) => void;
  onOpen: (week: WeekIndex, day: DayIndex) => void;
  onGoNutrition: () => void;
}) {
  const [lines, setLines] = useState<DayLine[] | null>(null);
  const bande = useRef<HTMLDivElement>(null);
  const choisie = useRef<HTMLButtonElement>(null);

  /*
   * La bande se recale sur la semaine choisie, à l'ouverture comme à chaque
   * changement.
   *
   * On pose `scrollLeft` plutôt que d'appeler `scrollIntoView` : celui-ci fait
   * aussi défiler la PAGE pour amener l'élément dans le champ, et l'écran
   * sauterait verticalement à chaque semaine touchée.
   */
  useEffect(() => {
    const c = bande.current;
    const b = choisie.current;
    if (!c || !b) return;
    c.scrollLeft = defilementPourCentrer({
      visible: c.clientWidth,
      totale: c.scrollWidth,
      gauche: b.offsetLeft - c.offsetLeft,
      largeur: b.offsetWidth,
    });
  }, [week]);

  useEffect(() => {
    void (async () => {
      const settingsRow = await getSettingsRow();
      const settings = toEngineSettings(settingsRow);
      const [sets, readinessRows, rows] = await Promise.all([
        allSets(),
        allReadiness(),
        allSessions(),
      ]);
      const history = buildHistoryIndex(sets);
      const trend = explosiveTrend(toReadinessRecords(readinessRows));
      const todayIso = new Date().toISOString().slice(0, 10);

      const out: DayLine[] = [];
      for (const day of WEEK_DAYS[week]) {
        const s = getSession(week, day, {
          settings,
          history,
          readiness: null,
          explosiveDecline: trend.declining,
        });
        if (!s) continue;
        const date = settings.startDate ? dateFor(settings.startDate, week, day) : '';
        out.push({
          day,
          title: s.title,
          intensity: s.intensity,
          duration: s.durationLabel,
          date,
          status: rows.find((r) => r.week === week && r.day === day)?.status ?? 'planned',
          isToday: date === todayIso,
        });
      }
      setLines(out);
    })();
  }, [week]);

  const block = BLOCKS[WEEK_BLOCKS[week]];

  return (
    <div className={styles.screen}>
      <ScreenHeader
        eyebrow={week === 0 ? 'Avant le programme' : `Bloc ${block.name}`}
        title={week === 0 ? 'Combine initial' : `Semaine ${week}`}
        subtitle={block.objective}
        visuel="casque"
        prioritaire
        compact
      />

      {/*
        Sélecteur de semaines, colorié par bloc — la périodisation se lit d'un
        coup d'œil. La couleur passe par une variable CSS plutôt que par trois
        propriétés en ligne : le soulignement, l'étiquette et la bordure de la
        carte de phase la lisent toutes au même endroit.
      */}
      <div className={styles.weeks} ref={bande}>
        {Array.from({ length: 13 }, (_, w) => {
          const b = BLOCKS[WEEK_BLOCKS[w as WeekIndex]];
          return (
            <button
              key={w}
              type="button"
              ref={w === week ? choisie : undefined}
              className={`${styles.week} ${w === week ? styles.weekOn : ''}`}
              style={{ '--bloc': b.color } as CSSProperties}
              onClick={() => onChangeWeek(w as WeekIndex)}
              aria-current={w === week ? 'true' : undefined}
            >
              <span className={styles.weekNum}>{w === 0 ? 'T' : w}</span>
              <span className={styles.weekTag}>{b.short}</span>
            </button>
          );
        })}
      </div>

      <section className={styles.phase} style={{ '--bloc': block.color } as CSSProperties}>
        <DiagonalStripes />
        <span className={styles.phaseIcon}>
          <Icon name="chart" size="22px" />
        </span>
        <div className={styles.phaseBody}>
          <div className={styles.phaseName}>{block.name}</div>
          <p className={styles.phaseMeta}>
            {block.intensityLabel} · {block.objective}
          </p>
        </div>
      </section>

      {lines === null ? (
        <div className={styles.loading}>Chargement…</div>
      ) : (
        <div className={styles.days}>
          {lines.map((l) => (
            <button
              key={l.day}
              type="button"
              className={styles.dayRow}
              onClick={() => onOpen(week, l.day)}
            >
              <span className={styles.dayName}>{DAY_LABELS_SHORT[l.day]}</span>
              <span className={styles.dayBody}>
                <span className={styles.dayTitle}>{l.title}</span>
                <span className={styles.dayMeta}>
                  <Icon name="stopwatch" size="15px" />
                  <span className={styles.dayMetaText}>
                    {l.duration}
                    {l.date && ` · ${humanDateShort(l.date)}`}
                  </span>
                </span>
              </span>
              <span
                className={`${styles.status} ${
                  l.status === 'done'
                    ? styles.statusDone
                    : l.status === 'skipped'
                      ? styles.statusSkipped
                      : l.isToday
                        ? styles.statusToday
                        : ''
                }`}
              >
                {l.status === 'done'
                  ? 'Faite'
                  : l.status === 'skipped'
                    ? 'Sautée'
                    : l.isToday
                      ? 'Aujourd’hui'
                      : 'À faire'}
              </span>
              <span className="visually-hidden">Ouvrir la séance du {DAY_LABELS[l.day]}</span>
            </button>
          ))}
        </div>
      )}

      {/*
        Un lien, pas un sous-onglet. La diet ne change pas d'une semaine à
        l'autre : la recopier dans chacun des treize écrans Semaine afficherait
        treize fois la même chose, et une cible fausse pour les jours de repos
        de la semaine affichée.
      */}
      <button type="button" className={styles.cta} onClick={onGoNutrition}>
        <Icon name="meal" size="22px" />
        Voir la nutrition
      </button>
    </div>
  );
}
