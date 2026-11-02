import { useEffect, useMemo, useState } from 'react';
import {
  allMeasurements,
  allNotes,
  allPainLogs,
  allReadiness,
  allSessions,
  allSets,
  getSettingsRow,
} from '../db/repo';
import type { WeekIndex } from '../data/types';
import { currentWeek } from '../engine/calendar';
import {
  ALL_SECTIONS,
  REPORT_SECTIONS,
  buildWeeklyReport,
  formatWeeklyReport,
  reportSummary,
  type ReportSection,
  type WeeklyReportInput,
} from '../engine/weeklyReport';
import styles from './WeeklyReport.module.css';

type Sources = Omit<WeeklyReportInput, 'week' | 'todayIso'>;

const draftKey = (week: number) => `bilan-mot-${week}`;

function readDraft(week: number): string {
  try {
    return localStorage.getItem(draftKey(week)) ?? '';
  } catch {
    return '';
  }
}

function writeDraft(week: number, text: string): void {
  try {
    localStorage.setItem(draftKey(week), text);
  } catch {
    // Stockage indisponible : le mot reste à l'écran le temps de l'envoi.
  }
}

/**
 * Le bilan de la semaine, à relire puis à envoyer.
 *
 * Pas de serveur : l'envoi passe par le partage du téléphone, donc l'élève
 * choisit le destinataire et rien ne part sans son geste.
 */
export function WeeklyReport() {
  const [sources, setSources] = useState<Sources | null>(null);
  const [week, setWeek] = useState<WeekIndex>(1);
  const [sections, setSections] = useState<ReadonlySet<ReportSection>>(ALL_SECTIONS);
  const [word, setWord] = useState('');
  const [status, setStatus] = useState('');
  const todayIso = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    void (async () => {
      const [settings, sessions, sets, readiness, measurements, pain, notes] = await Promise.all([
        getSettingsRow(),
        allSessions(),
        allSets(),
        allReadiness(),
        allMeasurements(),
        allPainLogs(),
        allNotes(),
      ]);
      const initial = (currentWeek(settings.startDate, todayIso) ?? 1) as WeekIndex;
      setWeek(initial);
      setWord(readDraft(initial));
      setSources({
        startDate: settings.startDate,
        sessions,
        sets,
        readiness,
        measurements,
        pain,
        notes,
      });
    })();
  }, [todayIso]);

  const report = useMemo(
    () => (sources ? buildWeeklyReport({ ...sources, week, todayIso }) : null),
    [sources, week, todayIso],
  );

  if (!report) return <div className={styles.loading}>Chargement…</div>;

  const text = formatWeeklyReport(report, sections, word);

  const changeWeek = (delta: number) => {
    const next = (week + delta) as WeekIndex;
    setWeek(next);
    setWord(readDraft(next));
    setStatus('');
  };

  const toggle = (id: ReportSection) => {
    const next = new Set(sections);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSections(next);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setStatus('Bilan copié. Colle-le dans ton message au coach.');
    } catch {
      setStatus('Copie impossible : sélectionne le texte de l’aperçu à la main.');
    }
  };

  const send = async () => {
    if (typeof navigator.share !== 'function') {
      await copy();
      return;
    }
    try {
      await navigator.share({ title: `Bilan semaine ${week}`, text });
      setStatus('Bilan transmis à l’application choisie.');
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        setStatus('Envoi annulé. Rien n’est parti.');
      } else {
        await copy();
      }
    }
  };

  return (
    <section className={styles.root} aria-label="Bilan de la semaine">
      <div className={styles.weekRow}>
        <button
          type="button"
          className={styles.weekButton}
          onClick={() => changeWeek(-1)}
          disabled={week <= 1}
          aria-label="Semaine précédente"
        >
          ‹
        </button>
        <h2 className={styles.weekTitle}>Semaine {week}</h2>
        <button
          type="button"
          className={styles.weekButton}
          onClick={() => changeWeek(1)}
          disabled={week >= 12}
          aria-label="Semaine suivante"
        >
          ›
        </button>
      </div>

      <p className={styles.summary}>{reportSummary(report, sections)}</p>

      <div className={styles.card}>
        <h3 className={styles.cardTitle}>Ce qui sera envoyé</h3>
        {REPORT_SECTIONS.map(({ id, label }) => (
          <label key={id} className={styles.check}>
            <input type="checkbox" checked={sections.has(id)} onChange={() => toggle(id)} />
            <span>{label}</span>
          </label>
        ))}
      </div>

      <div className={styles.card}>
        <label className={styles.cardTitle} htmlFor="bilan-mot">
          Un mot pour ton coach (facultatif)
        </label>
        <textarea
          id="bilan-mot"
          className={styles.word}
          rows={3}
          value={word}
          onChange={(e) => {
            setWord(e.target.value);
            writeDraft(week, e.target.value);
          }}
        />
      </div>

      <div className={styles.card}>
        <h3 className={styles.cardTitle}>Aperçu</h3>
        <pre className={styles.preview}>{text}</pre>
      </div>

      <p className={styles.privacy}>
        Rien ne part sans ton geste. Tu choisis l’application et le destinataire.
      </p>

      <div className={styles.actions}>
        <button type="button" className={styles.primary} onClick={() => void send()}>
          Envoyer mon bilan
        </button>
        <button type="button" className={styles.secondary} onClick={() => void copy()}>
          Copier le texte
        </button>
        <p className={styles.status} role="status">
          {status}
        </p>
      </div>
    </section>
  );
}
