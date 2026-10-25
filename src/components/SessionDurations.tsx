import { DAY_LABELS_SHORT, type DayIndex, type WeekIndex } from '../data/types';
import { getSession as buildSession } from '../engine/getSession';
import { humanDate } from '../engine/calendar';
import {
  gapLabel,
  medianRealMin,
  sessionDurations,
  type SessionDurationEntry,
} from '../engine/sessionClock';
import { readiness as computeReadiness } from '../engine/readiness';
import type { SessionContext } from '../engine/types';
import type { ReadinessRow, SessionRow } from '../db/db';
import styles from '../screens/Screens.module.css';

/**
 * Combien de temps les séances ont RÉELLEMENT pris.
 *
 * Ce que ça résout : l'étiquette de durée est une estimation, et une
 * estimation que personne ne confronte au réel reste fausse indéfiniment. Le
 * vendredi a affiché « 60 min » pendant des semaines pour une séance de
 * quatre-vingts minutes. Ici, les deux chiffres sont côte à côte, séance par
 * séance, et c'est le réel qui a le dernier mot.
 *
 * La barre n'est pas décorative : sa longueur est la durée réelle rapportée à
 * la plus longue séance de la liste, et le trait clair dessus marque le prévu.
 * Deux chiffres suffiraient à comprendre une ligne ; la barre sert à voir d'un
 * coup d'œil, sur quinze lignes, lesquelles débordent.
 */
export function SessionDurations({
  rows,
  readinessRows,
  baselineCm,
  ctx,
}: {
  rows: SessionRow[];
  /**
   * Les relevés de readiness, pour reconstruire la séance TELLE QU'ELLE A ÉTÉ
   * PRESCRITE ce jour-là.
   *
   * Sans eux, une séance passée en orange — une série de moins sur chaque
   * accessoire, −5 % sur les gros mouvements — serait comparée à la durée
   * d'une séance verte, qu'elle n'a jamais eue. L'écart affiché aurait alors
   * été un artefact du calcul, pas un dépassement.
   */
  readinessRows: ReadinessRow[];
  baselineCm: number | null;
  ctx: SessionContext;
}) {
  const parSeance = new Map(readinessRows.map((r) => [`${r.week}/${r.day}`, r]));

  const entries = sessionDurations(rows, (week, day) => {
    const releve = parSeance.get(`${week}/${day}`);
    const s = buildSession(week as WeekIndex, day as DayIndex, {
      ...ctx,
      readiness: releve ? computeReadiness(baselineCm, releve.jumpCm) : null,
    });
    return s?.plannedMin ?? null;
  });

  if (entries.length === 0) {
    return (
      <p className={styles.cardSub}>
        Aucune séance terminée pour l’instant. La durée se mesure entre la première ouverture de la
        séance et l’appui sur « Séance terminée ».
      </p>
    );
  }

  const max = Math.max(...entries.map((e) => Math.max(e.realMin, e.plannedMin ?? 0)));
  const mediane = medianRealMin(entries);
  const depassements = entries.filter((e) => e.verdict?.warn).length;

  return (
    <>
      <p className={styles.cardSub}>
        {entries.length} séance{entries.length > 1 ? 's' : ''} mesurée
        {entries.length > 1 ? 's' : ''}
        {mediane !== null && ` · médiane ${mediane} min`}
        {depassements > 0 && ` · ${depassements} au-delà de +15 % du prévu`}.
      </p>
      <ul className={styles.durations}>
        {entries.map((e) => (
          <Ligne key={`${e.week}-${e.day}`} e={e} max={max} />
        ))}
      </ul>
    </>
  );
}

function Ligne({ e, max }: { e: SessionDurationEntry; max: number }) {
  const pctReel = Math.max(2, Math.round((e.realMin / max) * 100));
  const pctPrevu = e.plannedMin === null ? null : Math.round((e.plannedMin / max) * 100);

  return (
    <li className={styles.durationRow}>
      <span className={styles.durationWhen}>
        S{e.week} {DAY_LABELS_SHORT[e.day as DayIndex]}
        {e.date && <span className={styles.durationDate}> · {humanDate(e.date)}</span>}
      </span>

      <span className={styles.durationBar} aria-hidden="true">
        <span
          className={`${styles.durationFill} ${e.verdict?.warn ? styles.durationOver : ''}`}
          style={{ width: `${pctReel}%` }}
        />
        {pctPrevu !== null && (
          <span className={styles.durationMark} style={{ left: `${pctPrevu}%` }} />
        )}
      </span>

      <span className={`${styles.durationValue} tnum`}>
        {e.realMin} min
        {e.plannedMin !== null && (
          <span className={styles.durationPlanned}> / {e.plannedMin} prévu</span>
        )}
      </span>

      {e.verdict && e.verdict.gapMin !== 0 && (
        <span
          className={`${styles.durationGap} ${e.verdict.warn ? styles.durationOverText : ''} tnum`}
        >
          {gapLabel(e.verdict)}
        </span>
      )}
    </li>
  );
}
