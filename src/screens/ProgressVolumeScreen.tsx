/**
 * Progrès de MASS 4 : ce qui a été soulevé, et rien de prévu.
 *
 * ── Pourquoi un autre écran que celui de POWER 12 ─────────────────────────
 *
 * Deux raisons, et la première suffirait.
 *
 * 1. Les mouvements. L'écran de POWER suit Squat, Bench, Deadlift et Tractions
 *    lestées. Aucun des quatre n'est au programme de MASS 4 : un cycle MASS
 *    ouvrait donc un écran qui proposait de choisir entre quatre mouvements
 *    qu'il ne contient pas, et affichait les charges d'un autre cycle.
 * 2. Le plan. L'écran de POWER trace deux courbes — le réel et le plan — parce
 *    que le §9 prescrit une charge pour chaque séance. MASS 4 n'en prescrit
 *    aucune : « les charges sont autorégulées, tu les choisis et tu les
 *    notes ». Une courbe de plan serait donc une courbe inventée, et c'est la
 *    raison pour laquelle il n'y en a qu'une ici.
 *
 * Les quatre mouvements suivis sont déclarés dans `mass4/suivi.ts`, avec la
 * raison de ce choix et le test qui le vérifie contre les séances réelles.
 */

import { useEffect, useState } from 'react';
import { BarChart, LineChart, type Series } from '../components/Chart';
import { NotesBrowser } from '../components/NotesBrowser';
import { SessionDurations } from '../components/SessionDurations';
import { VisualTracking } from '../components/VisualTracking';
import { WeightOverview } from '../components/WeightOverview';
import { ScreenHeader } from '../components/ScreenHeader';
import { DAY_LABELS_SHORT, type DayIndex } from '../data/types';
import { fr } from '../engine/format';
import type { HistoryIndex, SessionContext } from '../engine/types';
import {
  allReadiness,
  allSessions,
  allSets,
  buildHistoryIndex,
  getSettingsRow,
  toEngineSettings,
} from '../db/repo';
import type { ReadinessRow, SessionRow, SetRow } from '../db/db';
import { EXERCICES_MASS4 } from '../programmes/mass4/exercices';
import { MOUVEMENTS_SUIVIS } from '../programmes/mass4/suivi';
import { SEMAINES_MASS4 } from '../programmes/mass4/types';
import type { ModuleProgramme } from '../programmes/types';
import styles from './Progress.module.css';

type Vue = 'charges' | 'poids' | 'remarques' | 'photos';

const SOUS_TITRES: Record<Vue, string> = {
  charges: 'Ce que tu as réellement soulevé',
  poids: 'Poids de corps depuis la semaine 1',
  remarques: 'Tes notes, de la plus récente',
  photos: 'Une photo par semaine',
};

/** Au-delà de ce RPE, la barre passe au rouge : 1 rep en réserve ou moins. */
const RPE_LIMITE = 9;

export function ProgressVolumeScreen({ programme }: { programme: ModuleProgramme }) {
  const [vue, setVue] = useState<Vue>('charges');
  const [mouvement, setMouvement] = useState<string>('developpe-incline-smith');
  const [data, setData] = useState<{
    history: HistoryIndex;
    readiness: ReadinessRow[];
    sets: SetRow[];
    sessions: SessionRow[];
    ctx: SessionContext;
  } | null>(null);

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
        /*
         * Le contexte sert uniquement à redemander au programme la durée
         * PRÉVUE de chaque séance passée. MASS 4 n'en lit aucun champ — ses
         * séances ne dépendent ni de l'historique ni de la forme du jour — mais
         * l'interface commune le réclame, et le fournir vide serait un
         * mensonge sur ce que contient la base.
         */
        ctx: {
          settings: toEngineSettings(settingsRow),
          history,
          readiness: null,
          explosiveDecline: false,
        },
      });
    })();
  }, []);

  if (data === null) return <div className={styles.screen}>Chargement…</div>;

  // --- la charge réelle, semaine par semaine -------------------------------
  const occurrences = data.history[mouvement] ?? [];
  const points = occurrences
    .filter((o) => o.kg !== null)
    .map((o) => ({ x: o.week, y: o.kg as number }));
  const courbe: Series[] = [{ label: 'Réel', color: 'var(--accent)', points }];
  const derniere = points[points.length - 1] ?? null;

  // --- l'effort moyen, séance par séance -----------------------------------
  const parSeance = new Map<string, { somme: number; n: number; week: number; day: DayIndex }>();
  for (const s of data.sets) {
    if (s.actualRpe === null) continue;
    const cle = `${s.week}-${s.day}`;
    const courant = parSeance.get(cle) ?? { somme: 0, n: 0, week: s.week, day: s.day };
    courant.somme += s.actualRpe;
    courant.n += 1;
    parSeance.set(cle, courant);
  }
  const barres = [...parSeance.values()]
    .sort((a, b) => a.week - b.week || a.day - b.day)
    .slice(-12)
    .map((v) => {
      const moyenne = Math.round((v.somme / v.n) * 10) / 10;
      return {
        label: `${v.week}${DAY_LABELS_SHORT[v.day].slice(0, 1)}`,
        value: moyenne,
        color: moyenne >= RPE_LIMITE ? 'var(--rouge)' : 'var(--accent)',
      };
    });

  const semaines = Object.fromEntries(SEMAINES_MASS4.map((w) => [w, `S${w}`]));
  const nom = EXERCICES_MASS4[mouvement]?.nom ?? mouvement;

  return (
    <div className={styles.screen}>
      <ScreenHeader eyebrow="MASS 4" title="Progrès" subtitle={SOUS_TITRES[vue]} />

      <div className={styles.segment} role="group" aria-label="Vue">
        {(
          [
            ['charges', 'Charges'],
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

      {vue === 'charges' && (
        <>
          <div className={styles.lifts} role="group" aria-label="Mouvement">
            {MOUVEMENTS_SUIVIS.map((m) => (
              <button
                key={m.id}
                type="button"
                className={`${styles.lift} ${mouvement === m.id ? styles.liftOn : ''}`}
                onClick={() => setMouvement(m.id)}
                aria-pressed={mouvement === m.id}
              >
                {m.label}
              </button>
            ))}
          </div>

          <section className={styles.card}>
            <h2 className={styles.cardTitle}>{nom} — charge par semaine</h2>
            <p className={styles.cardSub}>
              {derniere === null
                ? 'Rien d’enregistré pour l’instant.'
                : `Dernière charge travaillée : ${fr(derniere.y)} kg en semaine ${derniere.x}.`}{' '}
              MASS 4 ne prescrit aucune charge : il n’y a donc qu’une courbe, la tienne.
            </p>
            <LineChart
              series={courbe}
              xLabels={semaines}
              unit="kg"
              emptyMessage="Valide des séries pour voir la courbe apparaître."
            />
          </section>

          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Durée des séances</h2>
            <p className={styles.cardSub}>
              Mesurée entre la première ouverture de la séance et « Séance terminée ». Le trait
              clair sur la barre marque les 60 minutes annoncées, échauffement compris.
            </p>
            <SessionDurations
              rows={data.sessions}
              readinessRows={data.readiness}
              baselineCm={null}
              ctx={data.ctx}
              programme={programme}
            />
          </section>

          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Effort moyen par séance</h2>
            <p className={styles.cardSub}>
              Les 12 dernières séances, en RPE — 10 moins les reps gardées en réserve. Une barre
              rouge signale une séance à {RPE_LIMITE} ou plus, soit une rep en réserve ou moins.
            </p>
            <BarChart bars={barres} emptyMessage="Aucune rep en réserve saisie pour l’instant." />
          </section>
        </>
      )}
    </div>
  );
}
