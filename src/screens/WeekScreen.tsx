import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { blocInfo } from '../data/program';
import { modulePourCycle } from '../programmes/registre';
import type { ModuleProgramme } from '../programmes/types';
import { DAY_LABELS, DAY_LABELS_SHORT, type DayIndex, type WeekIndex } from '../data/types';
import { dateFor, humanDateShort } from '../engine/calendar';

import {
  allReadiness,
  cycleActif,
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
   * Le programme du cycle en cours. POWER 12 tant que c'est lui qui tourne,
   * MASS 4 si c'est lui — et c'est ce module qui dit combien de semaines
   * afficher, quels jours portent une séance, et s'il y a un bloc à annoncer.
   */
  const [programme, setProgramme] = useState<ModuleProgramme | null>(null);

  useEffect(() => {
    void cycleActif().then((c) => setProgramme(modulePourCycle(c?.programmeId ?? null)));
  }, []);

  /*
   * La bande se recale sur la semaine choisie, à l'ouverture comme à chaque
   * changement.
   *
   * On pose `scrollLeft` plutôt que d'appeler `scrollIntoView` : celui-ci fait
   * aussi défiler la PAGE pour amener l'élément dans le champ, et l'écran
   * sauterait verticalement à chaque semaine touchée.
   *
   * `programme` fait partie des dépendances, et ce n'est pas décoratif : la
   * bande n'existe qu'une fois le programme chargé, donc au premier passage
   * la référence est vide et il n'y a rien à recaler. Sans cette dépendance,
   * l'écran s'ouvrait sur la semaine 1 quelle que soit la semaine demandée.
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
  }, [week, programme]);

  useEffect(() => {
    if (programme === null) return;
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
      for (const day of programme.joursDeLaSemaine(week)) {
        const s = programme.getSession(week, day, {
          settings,
          history,
          readiness: null,
          explosiveDecline: trend.declining,
        });
        if (!s) continue;
        const date = settings.startDate ? dateFor(settings.startDate, week, day, programme) : '';
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
  }, [week, programme]);

  if (programme === null) return null;

  /*
   * Un programme peut n'avoir AUCUN bloc de périodisation : MASS 4 répète la
   * même séance quatre semaines de suite. Le bandeau de phase et le sur-titre
   * « Bloc … » se taisent alors, au lieu d'afficher une case vide ou, pire,
   * un bloc emprunté à l'autre programme.
   */
  const blocCourant = programme.blocDeLaSemaine(week);
  const block = blocInfo(blocCourant);
  if (!programme.semaines.includes(week)) return null;

  return (
    <div className={styles.screen}>
      <ScreenHeader
        eyebrow={
          week === 0 ? 'Avant le programme' : block === null ? 'Volume' : `Bloc ${block.name}`
        }
        title={week === 0 ? 'Combine initial' : `Semaine ${week}`}
        subtitle={block?.objective}
        {...(programme.id === 'power12' ? ({ visuel: 'casque' } as const) : {})}
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
        {programme.semaines.map((w) => {
          const cle = programme.blocDeLaSemaine(w);
          const b = blocInfo(cle);
          return (
            <button
              key={w}
              type="button"
              ref={w === week ? choisie : undefined}
              className={`${styles.week} ${w === week ? styles.weekOn : ''}`}
              style={{ '--bloc': b?.color ?? 'transparent' } as CSSProperties}
              onClick={() => onChangeWeek(w as WeekIndex)}
              aria-current={w === week ? 'true' : undefined}
            >
              <span className={styles.weekNum}>{w === 0 ? 'T' : w}</span>
              {b !== null && <span className={styles.weekTag}>{b.short}</span>}
            </button>
          );
        })}
      </div>

      {block !== null && (
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
      )}

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
