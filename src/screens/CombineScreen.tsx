import { useEffect, useState } from 'react';
import { Stepper, stepValue } from '../components/Stepper';
import { EXERCISES } from '../data/exercises';
import {
  COMBINE_METRICS,
  COMBINE_S8_METRICS,
  RAMPS,
  RAMPS_S12,
  cibleFor,
} from '../data/testSessions';
import { fr } from '../engine/format';
import { allCombines, getSettingsRow, saveCombine } from '../db/repo';
import type { CombinePhase, CombineRow } from '../db/db';
import { Icon } from '../components/Icon';
import { ScreenHeader } from '../components/ScreenHeader';
import styles from './Combine.module.css';

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
      <ScreenHeader
        eyebrow="Trois mesures comparables"
        title="Combine"
        subtitle="Mêmes conditions à chaque fois"
        visuel="stade"
        compact
      />

      <p className={styles.hint}>
        Même lieu, mêmes chaussures, même protocole, idéalement même heure. C’est ce qui rend les
        trois combines comparables.
      </p>

      <div className={styles.phases} role="group" aria-label="Combine affiché">
        {PHASES.map((p) => (
          <button
            key={p.id}
            type="button"
            className={`${styles.phase} ${phase === p.id ? styles.phaseOn : ''}`}
            onClick={() => setPhase(p.id)}
            aria-pressed={phase === p.id}
          >
            <span className={styles.phaseNom}>{p.label}</span>
            <span className={styles.phaseQuand}>{p.when}</span>
          </button>
        ))}
      </div>

      {/* --- L'indicateur clé du programme -------------------------------- */}
      <section className={styles.card}>
        <h2 className={styles.cardTitle}>
          <span className={styles.cardIcon} aria-hidden="true">
            <Icon name="chart" size="20px" />
          </span>
          Écart deadlift − squat
        </h2>
        <p className={styles.cardSub}>
          Le vrai critère du programme. S’il devient nul ou positif, la chaîne postérieure a
          rattrapé son retard.
        </p>
        <div className={styles.keyStat}>
          <div
            className={styles.keyStatValue}
            style={{
              color:
                gapNow === null ? 'var(--ink-3)' : gapNow >= 0 ? 'var(--vert)' : 'var(--orange)',
            }}
          >
            {gapNow === null ? '—' : `${gapNow > 0 ? '+' : ''}${fr(gapNow)} kg`}
          </div>
          <div className={styles.keyStatLabel}>{gapLabel(byPhase, gapInitial, gapFinal)}</div>
        </div>
      </section>

      {/* --- Comparaison des trois combines -------------------------------- */}
      <section className={styles.card}>
        <h2 className={styles.cardTitle}>
          <span className={styles.cardIcon} aria-hidden="true">
            <Icon name="swap" size="20px" />
          </span>
          Comparaison
        </h2>
        <p className={styles.cardSub}>
          La flèche suit le chiffre, la couleur dit si c’est un progrès : en vert, c’est mieux, même
          quand la valeur baisse — un sprint plus court est un sprint plus rapide.
        </p>
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
                /*
                 * La flèche suit le NOMBRE, pas le jugement. Sur un sprint,
                 * passer de 1,82 à 1,74 est une progression mais la valeur
                 * descend : une flèche vers le haut y contredirait le chiffre
                 * écrit juste à côté. C'est la couleur, doublée du mot caché,
                 * qui dit si c'est bien.
                 */
                const monte =
                  typeof i === 'number' && typeof f === 'number' && f !== i ? f > i : null;
                return (
                  <tr key={id}>
                    <td>{EXERCISES[id]?.name ?? id}</td>
                    <td>{typeof i === 'number' ? fr(i) : '—'}</td>
                    <td>{typeof s === 'number' ? fr(s) : '—'}</td>
                    <td
                      className={better === null ? '' : better ? styles.deltaUp : styles.deltaDown}
                    >
                      {monte !== null && (
                        <span className={styles.fleche} aria-hidden="true">
                          {monte ? '↑' : '↓'}
                        </span>
                      )}
                      {typeof f === 'number' ? fr(f) : '—'}
                      {better !== null && (
                        <span className="visually-hidden">
                          {better ? ' — progression' : ' — recul'}
                        </span>
                      )}
                    </td>
                    {/*
                      L'objectif se calcule sur CE qu'a fait l'utilisateur au
                      combine initial, pas sur les maxima de l'auteur. Sans
                      performance initiale il n'y a rien à calculer — et on
                      l'écrit, plutôt que de servir un chiffre qui ne veut
                      rien dire pour celui qui le lit.
                    */}
                    <td className={styles.cible}>
                      {cibleFor(id, typeof i === 'number' ? i : null) ?? (
                        <span className={styles.aDefinir}>à définir</span>
                      )}
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
        Saisie · {PHASES.find((p) => p.id === phase)!.label}
        <span className={styles.sectionRule} aria-hidden="true" />
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
            <div className={styles.stepperZone}>
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
                  onClick={() => setDraft((prev) => ({ ...prev, [id]: settingsBodyweight }))}
                >
                  Reprendre {fr(settingsBodyweight)} kg des Réglages
                </button>
              )}
          </section>
        );
      })}

      <button type="button" className={styles.primary} onClick={() => void save()}>
        <Icon name="check" size="22px" />
        Enregistrer le combine
      </button>
    </div>
  );
}

/**
 * Un écart s'écrit avec son signe, toujours.
 *
 * La légende écrivait « au départ -10 kg, aujourd'hui 6 kg » sous un chiffre
 * affiché « +6 kg » : le même nombre apparaissait deux fois, une fois signé et
 * une fois non. Sur l'indicateur central du programme, c'est le genre de
 * détail qui fait douter du reste.
 */
function signe(v: number): string {
  return `${v > 0 ? '+' : ''}${fr(v)}`;
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
    return `Au départ ${signe(gapInitial)} kg, aujourd’hui ${signe(gapFinal)} kg.`;
  }
  const m = byPhase('initial');
  const dl = m['test-deadlift-1rm'];
  const sq = m['test-squat-1rm'];
  if (typeof dl === 'number' && typeof sq === 'number') {
    return `Combine initial : deadlift ${fr(dl)}, squat ${fr(sq)}, soit ${signe(gapInitial!)} kg.`;
  }
  return 'Mesuré au combine final. Saisis le combine initial pour voir la progression.';
}
