import { useEffect, useState } from 'react';
import { LineChart, type Series } from '../components/Chart';
import { Stepper, stepValue } from '../components/Stepper';
import {
  HYDRATION_NOTE,
  NUTRITION_TARGETS,
  SHOPPING_LIST,
  SIMPLE_RULES,
  SUPPLEMENTS_NOTE,
  TARGET_GAIN_KG_PER_WEEK,
  type DayKind,
} from '../data/nutrition';
import { humanDate } from '../engine/calendar';
import { fr } from '../engine/format';
import {
  latestWaist,
  nutritionAdvice,
  weeklyAverages,
  weightTrend,
  type Measurement,
} from '../engine/nutrition';
import { allMeasurements, getMeasurement, saveMeasurement } from '../db/repo';
import styles from './Screens.module.css';

/**
 * Onglet Nutrition.
 *
 * Trois choses, dans cet ordre : ce que je dois manger aujourd'hui, ce que le
 * suivi me dit d'ajuster, et le détail qu'on ne relit qu'en faisant les courses.
 *
 * Ce n'est volontairement PAS un journal alimentaire. Pas de saisie repas par
 * repas, pas de base d'aliments : des applications gratuites font ça mieux, et
 * remplir un journal trois fois par jour ne tient pas un trimestre avec un
 * métier et deux enfants. La seule saisie ici est la pesée du matin, qui prend
 * cinq secondes et qui est la seule donnée qui pilote réellement le plan.
 */
export function NutritionScreen({ todayKind }: { todayKind: DayKind }) {
  const [rows, setRows] = useState<Measurement[] | null>(null);
  const [kind, setKind] = useState<DayKind>(todayKind);
  const [todayRow, setTodayRow] = useState<{ weightKg: number | null; waistCm: number | null }>({
    weightKg: null,
    waistCm: null,
  });

  const todayIso = new Date().toISOString().slice(0, 10);

  async function reload() {
    const all = await allMeasurements();
    setRows(all.map((r) => ({ date: r.date, weightKg: r.weightKg, waistCm: r.waistCm })));
    const t = await getMeasurement(todayIso);
    setTodayRow({ weightKg: t?.weightKg ?? null, waistCm: t?.waistCm ?? null });
  }

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!rows) return <div className={styles.loading}>Chargement…</div>;

  const target = NUTRITION_TARGETS[kind];
  const trend = weightTrend(rows, todayIso);
  const advice = nutritionAdvice(rows, todayIso);
  const waist = latestWaist(rows);

  // 8 fenêtres : la courbe montre presque deux mois, assez pour lire une pente.
  const points = weeklyAverages(rows, todayIso, 8)
    .filter((p) => p.average !== null)
    .reverse();
  const series: Series[] = [
    {
      label: 'Moyenne 7 jours',
      color: 'var(--accent)',
      points: points.map((p, i) => ({ x: i, y: p.average! })),
    },
  ];
  // « 14/8 » plutôt que « 14 » : sur deux mois de courbe, le seul numéro de
  // jour redevient ambigu dès qu'on repasse par un 1er.
  const xLabels = Object.fromEntries(
    points.map((p, i) => {
      const [, month, day] = p.endDate.split('-');
      return [i, `${Number(day)}/${Number(month)}`];
    }),
  );

  async function patchToday(patch: { weightKg?: number | null; waistCm?: number | null }) {
    await saveMeasurement(todayIso, patch);
    await reload();
  }

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <h1 className={styles.h1}>Nutrition</h1>
        <p className={styles.lead}>
          Beaucoup de glucides, protéines élevées sans excès, lipides modérés. Cinq prises par jour,
          pas plus — ça doit tenir avec le boulot et les enfants.
        </p>
      </header>

      {/* --- 1. Référence du jour ------------------------------------------ */}
      <section className={styles.card}>
        <div className={styles.keyStat}>
          <div className={styles.keyStatValue}>
            {target.kcal.toLocaleString('fr-FR')}
            <span className={styles.keyStatUnit}> kcal / jour</span>
          </div>
          <div className={styles.keyStatLabel}>
            {kind === todayKind ? 'Ta cible aujourd’hui' : 'Autre palier'} · {target.label}
          </div>
        </div>
        <div className={styles.macros}>
          <div className={styles.macro}>
            <b>{target.proteinG} g</b>
            <span>Protéines</span>
          </div>
          <div className={styles.macro}>
            <b>{target.carbsG} g</b>
            <span>Glucides</span>
          </div>
          <div className={styles.macro}>
            <b>{target.fatG} g</b>
            <span>Lipides</span>
          </div>
        </div>
        <p className={styles.fieldHint}>{target.note}</p>
      </section>

      {/* --- 4. Suggestion d'ajustement ------------------------------------ */}
      {advice.kind !== 'none' && (
        <p
          className={`${styles.alert} ${advice.kind === 'add' ? styles.alertVert : styles.alertRouge}`}
        >
          <b>{advice.title}.</b> {advice.action}
        </p>
      )}

      {/* --- Sélecteur des deux paliers ------------------------------------ */}
      <div className={styles.segment} role="group" aria-label="Palier alimentaire">
        {(['train', 'rest'] as const).map((k) => (
          <button
            key={k}
            type="button"
            className={`${styles.segmentButton} ${kind === k ? styles.segmentOn : ''}`}
            onClick={() => setKind(k)}
            aria-pressed={kind === k}
          >
            {NUTRITION_TARGETS[k].label}
          </button>
        ))}
      </div>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Repas types</h2>
        <div className={styles.mealList}>
          {target.meals.map((m) => (
            <div key={m.name} className={styles.meal}>
              <div>
                <div className={styles.mealName}>{m.name}</div>
                <div className={styles.mealDetail}>{m.detail}</div>
              </div>
              <div className={`${styles.mealKcal} tnum`}>{m.kcal} kcal</div>
            </div>
          ))}
        </div>
        <div className={styles.mealTotal}>
          <span>Total</span>
          <span className="tnum">≈ {target.kcal.toLocaleString('fr-FR')} kcal</span>
        </div>
        <p className={styles.fieldHint}>
          Ajuste les féculents de ±30 g selon la faim et ta moyenne hebdomadaire. Les quantités sont
          des repères, pas des lois.
        </p>
      </section>

      {/* --- 2 et 3. Suivi de poids et tour de taille ----------------------- */}
      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Pesée du matin</h2>
        <p className={styles.cardSub}>
          Au réveil, avant de manger ou de boire. Idéalement 4 à 7 fois par semaine — mais une seule
          fois suffit à faire tourner la moyenne.
        </p>
        <div className={styles.field}>
          <Stepper
            label={`Poids — ${humanDate(todayIso)}`}
            value={todayRow.weightKg}
            step={0.1}
            min={40}
            max={160}
            unit="kg"
            tone="accent"
            onStep={(d) =>
              void patchToday({ weightKg: stepValue(todayRow.weightKg, d, 40, 160) })
            }
            onCommit={(v) => void patchToday({ weightKg: v })}
          />
        </div>
        <div className={styles.field}>
          <Stepper
            label="Tour de taille"
            value={todayRow.waistCm}
            step={0.5}
            min={60}
            max={150}
            unit="cm"
            onStep={(d) => void patchToday({ waistCm: stepValue(todayRow.waistCm, d, 60, 150) })}
            onCommit={(v) => void patchToday({ waistCm: v })}
          />
          <p className={styles.fieldHint}>
            Optionnel, toutes les 1 à 2 semaines, même repère et même moment. Il ne sert qu'à
            trancher un cas ambigu : poids qui monte, tour de taille qui suit.
          </p>
        </div>
      </section>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Moyenne 7 jours</h2>
        <p className={styles.cardSub}>
          Une pesée isolée bouge de 1 à 2 kg selon l’hydratation, le sel de la veille, le transit.
          Seule la moyenne veut dire quelque chose.
        </p>
        <div className={styles.keyStat}>
          <div className={styles.keyStatValue}>
            {trend.average7 === null ? '—' : `${fr(trend.average7)}`}
            <span className={styles.keyStatUnit}> kg</span>
          </div>
          <div className={styles.keyStatLabel}>
            {trend.average7 === null
              ? 'Saisis ta première pesée pour lancer le suivi.'
              : trend.deltaKg === null
                ? `${trend.countThisWeek} pesée${trend.countThisWeek > 1 ? 's' : ''} cette semaine. Il faut une semaine de plus pour comparer.`
                : `${trend.deltaKg > 0 ? '+' : ''}${fr(trend.deltaKg)} kg vs la semaine précédente · ${trend.countThisWeek} pesée${trend.countThisWeek > 1 ? 's' : ''}`}
          </div>
        </div>
        {trend.deltaKg !== null && (
          <p className={styles.fieldHint} style={{ color: trend.onTarget ? 'var(--vert)' : undefined }}>
            {trend.onTarget
              ? `Dans la fourchette visée (+${fr(TARGET_GAIN_KG_PER_WEEK.min)} à +${fr(TARGET_GAIN_KG_PER_WEEK.max)} kg par semaine).`
              : `Fourchette visée : +${fr(TARGET_GAIN_KG_PER_WEEK.min)} à +${fr(TARGET_GAIN_KG_PER_WEEK.max)} kg par semaine. Viser 80-81 kg avec de meilleures performances vaut mieux que forcer jusqu’à 84.`}
          </p>
        )}
        {waist !== null && (
          <p className={styles.fieldHint}>
            Dernier tour de taille : <b>{fr(waist)} cm</b>.
          </p>
        )}
        <LineChart
          series={series}
          xLabels={xLabels}
          unit="kg"
          emptyMessage="Pas encore assez de pesées pour tracer une tendance."
        />
      </section>

      {/* --- Le détail, replié ---------------------------------------------- */}
      <details className={styles.details}>
        <summary className={styles.summary}>Liste de courses</summary>
        <div className={styles.detailsBody}>
          {SHOPPING_LIST.map((g) => (
            <p key={g.title}>
              <b>{g.title}</b> — {g.items}
            </p>
          ))}
        </div>
      </details>

      <details className={styles.details}>
        <summary className={styles.summary}>Règles simples</summary>
        <div className={styles.detailsBody}>
          <ol className={styles.ruleList}>
            {SIMPLE_RULES.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ol>
        </div>
      </details>

      <details className={styles.details}>
        <summary className={styles.summary}>Compléments et hydratation</summary>
        <div className={styles.detailsBody}>
          <p>{SUPPLEMENTS_NOTE}</p>
          <p>{HYDRATION_NOTE}</p>
        </div>
      </details>
    </div>
  );
}
