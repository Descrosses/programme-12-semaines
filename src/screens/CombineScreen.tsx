import { useEffect, useState } from 'react';
import { Stepper, stepValue } from '../components/Stepper';
import { EXERCISES } from '../data/exercises';
import {
  COMBINE_METRICS,
  COMBINE_S8_METRICS,
  RAMPS,
  RAMPS_S12,
  TARGETS_12_WEEKS,
} from '../data/testSessions';
import { fr } from '../engine/format';
import { allCombines, getSettingsRow, saveCombine } from '../db/repo';
import type { CombinePhase, CombineRow } from '../db/db';
import styles from './Screens.module.css';

const PHASES: Array<{ id: CombinePhase; label: string; when: string }> = [
  { id: 'initial', label: 'Initial', when: 'Avant la semaine 1' },
  { id: 's8', label: 'Intermédiaire', when: 'Semaine 8, sans 1RM' },
  { id: 'final', label: 'Final', when: 'Semaine 12' },
];

/**
 * Réglages du stepper par unité de mesure.
 *
 * Le pas du chrono est de 0,1 s : sur un 10 m, deux séances peuvent se jouer à
 * un dixième, et un pas plus gros effacerait le progrès qu'on cherche à voir.
 * Pour un temps relevé à la vidéo au centième, la saisie clavier prend le
 * relais — chaque mesure de cet écran l'accepte.
 */
const MEASURE = {
  cm: { step: 5, min: 50, max: 400, unit: 'cm' },
  s: { step: 0.1, min: 0.5, max: 60, unit: 's' },
  m: { step: 5, min: 5, max: 200, unit: 'm' },
  kg: { step: 2.5, min: 0, max: 300, unit: 'kg' },
  reps: { step: 1, min: 0, max: 60, unit: 'reps' },
} as const;

/**
 * De la mesure du combine vers la colonne du tableau de charges.
 *
 * La correspondance est écrite, pas déduite : « test-squat-1rm » donnait
 * « squat » en retirant les affixes, alors que la colonne s'appelle
 * « back-squat ». Les paliers du squat et du bench ne s'affichaient donc
 * jamais — sans erreur, juste rien.
 */
const RAMP_KEY: Record<string, keyof typeof RAMPS | undefined> = {
  'test-squat-1rm': 'back-squat',
  'test-bench-1rm': 'bench-press',
  'test-deadlift-1rm': 'deadlift',
  'test-weighted-pullup-1rm': 'weighted-pullup',
};

/** Un temps de sprint plus bas est meilleur : la flèche doit s'inverser. */
const LOWER_IS_BETTER = new Set(['test-sprint-10m', 'test-sprint-20m']);

export function CombineScreen() {
  const [rows, setRows] = useState<CombineRow[] | null>(null);
  const [phase, setPhase] = useState<CombinePhase>('initial');
  const [draft, setDraft] = useState<Record<string, number | null>>({});
  /** Poids de corps des Réglages : il ne se mesure pas en salle (§12). */
  const [settingsBodyweight, setSettingsBodyweight] = useState<number | null>(null);

  useEffect(() => {
    void (async () => {
      setRows(await allCombines());
      setSettingsBodyweight((await getSettingsRow()).bodyweightKg);
    })();
  }, []);

  useEffect(() => {
    if (!rows) return;
    setDraft(rows.find((r) => r.phase === phase)?.metrics ?? {});
  }, [rows, phase]);

  if (!rows) return <div className={styles.loading}>Chargement…</div>;

  const metrics = phase === 's8' ? COMBINE_S8_METRICS : COMBINE_METRICS;
  const byPhase = (p: CombinePhase) => rows.find((r) => r.phase === p)?.metrics ?? {};

  async function save() {
    await saveCombine(phase, { metrics: draft, date: new Date().toISOString().slice(0, 10) });
    setRows(await allCombines());
  }

  // §13 — « Le vrai critère : l'écart deadlift − squat. »
  const gap = (p: CombinePhase) => {
    const m = byPhase(p);
    const dl = m['test-deadlift-1rm'];
    const sq = m['test-squat-1rm'];
    return typeof dl === 'number' && typeof sq === 'number' ? dl - sq : null;
  };
  const gapInitial = gap('initial');
  const gapFinal = gap('final');
  const gapNow = gapFinal ?? gapInitial;

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <h1 className={styles.h1}>Combine</h1>
        <p className={styles.lead}>
          Même lieu, mêmes chaussures, même protocole, idéalement même heure. C’est ce qui rend les
          trois combines comparables.
        </p>
      </header>

      <div className={styles.weeks}>
        {PHASES.map((p) => (
          <button
            key={p.id}
            type="button"
            className={`${styles.week} ${phase === p.id ? styles.weekOn : ''}`}
            style={{ width: 'auto', padding: '0 14px', borderBottomColor: 'var(--bloc-test)' }}
            onClick={() => setPhase(p.id)}
            aria-pressed={phase === p.id}
          >
            <span className={styles.weekNum} style={{ fontSize: '1rem' }}>
              {p.label}
            </span>
            <span className={styles.weekTag}>{p.when}</span>
          </button>
        ))}
      </div>

      {/* --- L'indicateur clé du programme -------------------------------- */}
      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Écart deadlift − squat</h2>
        <p className={styles.cardSub}>
          Le vrai critère du programme. S’il devient nul ou positif, la chaîne postérieure a rattrapé
          son retard.
        </p>
        <div className={styles.keyStat}>
          <div
            className={styles.keyStatValue}
            style={{ color: gapNow === null ? 'var(--ink-3)' : gapNow >= 0 ? 'var(--vert)' : 'var(--orange)' }}
          >
            {gapNow === null ? '—' : `${gapNow > 0 ? '+' : ''}${fr(gapNow)} kg`}
          </div>
          <div className={styles.keyStatLabel}>{gapLabel(byPhase, gapInitial, gapFinal)}</div>
        </div>
      </section>

      {/* --- Comparaison des trois combines -------------------------------- */}
      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Comparaison</h2>
        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Mesure</th>
                <th>Initial</th>
                <th>S8</th>
                <th>Final</th>
                <th>Cible</th>
              </tr>
            </thead>
            <tbody>
              {COMBINE_METRICS.map((id) => {
                const i = byPhase('initial')[id];
                const s = byPhase('s8')[id];
                const f = byPhase('final')[id];
                const better =
                  typeof i === 'number' && typeof f === 'number'
                    ? LOWER_IS_BETTER.has(id)
                      ? f < i
                      : f > i
                    : null;
                return (
                  <tr key={id}>
                    <td>{EXERCISES[id]?.name ?? id}</td>
                    <td>{typeof i === 'number' ? fr(i) : '—'}</td>
                    <td>{typeof s === 'number' ? fr(s) : '—'}</td>
                    <td
                      className={
                        better === null ? '' : better ? styles.deltaUp : styles.deltaDown
                      }
                    >
                      {typeof f === 'number' ? fr(f) : '—'}
                    </td>
                    <td style={{ color: 'var(--ink-3)', fontWeight: 500 }}>
                      {TARGETS_12_WEEKS[id]?.target ?? '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* --- Saisie guidée -------------------------------------------------- */}
      <h2 className={styles.sectionTitle}>
        Saisie — combine {PHASES.find((p) => p.id === phase)!.label.toLowerCase()}
      </h2>
      {phase === 's8' && (
        <p className={styles.hint}>Pas de 1RM cette semaine : tests athlétiques seulement.</p>
      )}

      {metrics.map((id) => {
        const def = EXERCISES[id];
        if (!def) return null;
        const cfg = MEASURE[def.measure ?? 'reps'];
        /*
         * Les paliers du test final ne sont pas ceux du test initial : ils sont
         * calculés sur les maxima mesurés ce jour-là. Montrer ceux du §12 en
         * semaine 12 ferait monter le squat à 130 pour un 1RM de 110.
         */
        const cle = RAMP_KEY[id];
        const ramp = cle ? (phase === 'final' ? RAMPS_S12 : RAMPS)[cle] : undefined;
        return (
          <section key={id} className={styles.card}>
            <h3 className={styles.cardTitle}>{def.name}</h3>
            <p className={styles.cardSub}>{def.intent}</p>
            {ramp && (
              <p className={styles.fieldHint}>
                <b>Paliers :</b>{' '}
                {ramp
                  .map(
                    (r) =>
                      `${r.added ? '+' : ''}${fr(r.kg)}${r.reps > 1 ? `×${r.reps}` : ''}${
                        r.optional ? ' ?' : ''
                      }`,
                  )
                  .join(' / ')}
              </p>
            )}
            {id === 'test-bodyweight' && (
              <p className={styles.fieldHint}>
                Relevé à la maison, pas en salle : moyenne de 3 matins à jeun. Il se saisit aussi
                dans Réglages, à n’importe quel moment.
              </p>
            )}
            <div style={{ marginTop: 12 }}>
              <Stepper
                label={def.name}
                value={draft[id] ?? null}
                step={cfg.step}
                min={cfg.min}
                max={cfg.max}
                unit={cfg.unit}
                tone="accent"
                onStep={(d) =>
                  setDraft((prev) => ({
                    ...prev,
                    [id]: stepValue(prev[id] ?? null, d, cfg.min, cfg.max),
                  }))
                }
                onCommit={(v) => setDraft((prev) => ({ ...prev, [id]: v }))}
              />
            </div>
            {id === 'test-bodyweight' &&
              settingsBodyweight !== null &&
              draft[id] !== settingsBodyweight && (
                <button
                  type="button"
                  className={styles.secondary}
                  style={{ width: '100%', margin: '10px 0 0' }}
                  onClick={() =>
                    setDraft((prev) => ({ ...prev, [id]: settingsBodyweight }))
                  }
                >
                  Reprendre {fr(settingsBodyweight)} kg des Réglages
                </button>
              )}
          </section>
        );
      })}

      <button type="button" className={styles.primary} onClick={() => void save()}>
        Enregistrer le combine
      </button>
    </div>
  );
}

/**
 * Légende de l'écart deadlift − squat.
 *
 * Elle affichait une phrase écrite en dur — « Départ : deadlift 130, squat
 * 140, soit −10 kg » — qui étaient les estimations d'avant le combine. Le
 * chiffre au-dessus, lui, venait des vrais tests. Deux sources pour un même
 * indicateur, et la légende contredisait le nombre qu'elle expliquait.
 *
 * Tout vient désormais des combines enregistrés, et rien d'autre.
 */
function gapLabel(
  byPhase: (p: CombinePhase) => Record<string, number | null>,
  gapInitial: number | null,
  gapFinal: number | null,
): string {
  if (gapInitial === null && gapFinal === null) {
    return 'Saisis un deadlift et un squat 1RM pour le calculer.';
  }
  if (gapInitial !== null && gapFinal !== null) {
    return `Au départ ${fr(gapInitial)} kg, aujourd’hui ${fr(gapFinal)} kg.`;
  }
  const m = byPhase('initial');
  const dl = m['test-deadlift-1rm'];
  const sq = m['test-squat-1rm'];
  if (typeof dl === 'number' && typeof sq === 'number') {
    return `Combine initial : deadlift ${fr(dl)}, squat ${fr(sq)}, soit ${
      gapInitial! > 0 ? '+' : ''
    }${fr(gapInitial!)} kg.`;
  }
  return 'Mesuré au combine final. Saisis le combine initial pour voir la progression.';
}
