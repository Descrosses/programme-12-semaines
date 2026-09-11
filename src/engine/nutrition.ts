/**
 * Suivi de poids et suggestion d'ajustement alimentaire.
 *
 * Le .md le dit sans ambiguïté : « On ne regarde jamais une pesée isolée — elle
 * bouge de 1-2 kg selon l'hydratation, le sel de la veille, le transit. On ne
 * regarde que la moyenne des 7 derniers jours. » Tout ce fichier découle de
 * cette phrase : aucune fonction ne lit une pesée seule.
 *
 * Même forme que `trends.ts` pour les sauts — fenêtre glissante, seuil, nombre
 * de semaines consécutives — mais appliquée au poids.
 */

import { TARGET_GAIN_KG_PER_WEEK } from '../data/nutrition';

/** Une pesée du matin, et éventuellement le tour de taille du jour. */
export interface Measurement {
  /** `YYYY-MM-DD`. */
  date: string;
  weightKg: number | null;
  waistCm: number | null;
}

/**
 * Seuils d'ajustement, transcrits du .md.
 *
 * Le .md donne des fourchettes (« moins de 150-200 g », « plus de 400-500 g »,
 * « 2-3 semaines »). Il faut bien trancher pour coder. On retient à chaque fois
 * le bord PRUDENT, c'est-à-dire celui qui pousse le moins à manger davantage :
 *
 * - stable = 150 g et non 200 g : on est plus exigeant avant de déclarer le
 *   poids bloqué, donc on ajoute du féculent moins facilement ;
 * - stable sur 3 semaines et non 2 : trois points valent mieux que deux pour
 *   distinguer un plateau d'un simple creux ;
 * - prise rapide = 400 g et non 500 g, sur 2 semaines et non 3 : là le bord
 *   prudent est l'inverse, on corrige tôt une prise qui part trop vite.
 */
export const ADJUST_RULES = {
  /** Variation hebdomadaire en deçà de laquelle le poids est jugé stable. */
  stableKg: 0.15,
  stableWeeks: 3,
  /** Prise hebdomadaire au-delà de laquelle on freine. */
  fastGainKg: 0.4,
  fastGainWeeks: 2,
  /** Hausse de tour de taille qui confirme que la prise n'est pas que musculaire. */
  waistRiseCm: 0.5,
} as const;

const MS_PER_DAY = 86_400_000;

function time(iso: string): number {
  return Date.parse(`${iso}T12:00:00Z`);
}

function round(n: number, decimals = 2): number {
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
}

/**
 * Moyenne des pesées tombant dans la fenêtre `]endIso − days ; endIso]`.
 *
 * `null` si la fenêtre est vide. Une seule pesée suffit : le .md prévoit
 * explicitement le cas de la pesée hebdomadaire unique (« moins précis mais
 * reste utilisable »), ça ne doit pas bloquer le calcul.
 */
export function windowAverage(
  entries: Measurement[],
  endIso: string,
  days = 7,
): number | null {
  const end = time(endIso);
  const start = end - days * MS_PER_DAY;
  const values = entries
    .filter((e) => e.weightKg !== null && time(e.date) > start && time(e.date) <= end)
    .map((e) => e.weightKg!);
  if (values.length === 0) return null;
  return round(values.reduce((a, b) => a + b, 0) / values.length);
}

export interface WeeklyPoint {
  /** 0 = semaine qui se termine aujourd'hui, 1 = la précédente, etc. */
  weeksAgo: number;
  /** Dernier jour de la fenêtre. */
  endDate: string;
  average: number | null;
}

/** Moyennes glissantes des `count` dernières semaines, de la plus récente à la plus ancienne. */
export function weeklyAverages(
  entries: Measurement[],
  todayIso: string,
  count: number,
): WeeklyPoint[] {
  const out: WeeklyPoint[] = [];
  for (let w = 0; w < count; w++) {
    const endDate = new Date(time(todayIso) - w * 7 * MS_PER_DAY).toISOString().slice(0, 10);
    out.push({ weeksAgo: w, endDate, average: windowAverage(entries, endDate) });
  }
  return out;
}

export interface WeightTrend {
  /** Moyenne des 7 derniers jours. */
  average7: number | null;
  /** Moyenne des 7 jours d'avant, pour la comparaison exigée par le .md. */
  previous7: number | null;
  /** `average7 − previous7`, en kg. */
  deltaKg: number | null;
  /** Nombre de pesées dans les 7 derniers jours — dit la fiabilité de la moyenne. */
  countThisWeek: number;
  /** La progression est dans la fourchette visée (+0,15 à +0,30 kg/semaine). */
  onTarget: boolean;
}

export function weightTrend(entries: Measurement[], todayIso: string): WeightTrend {
  const average7 = windowAverage(entries, todayIso, 7);
  const previous7 = windowAverage(
    entries,
    new Date(time(todayIso) - 7 * MS_PER_DAY).toISOString().slice(0, 10),
    7,
  );
  const deltaKg = average7 !== null && previous7 !== null ? round(average7 - previous7) : null;
  const countThisWeek = entries.filter(
    (e) =>
      e.weightKg !== null &&
      time(e.date) > time(todayIso) - 7 * MS_PER_DAY &&
      time(e.date) <= time(todayIso),
  ).length;

  return {
    average7,
    previous7,
    deltaKg,
    countThisWeek,
    onTarget:
      deltaKg !== null &&
      deltaKg >= TARGET_GAIN_KG_PER_WEEK.min &&
      deltaKg <= TARGET_GAIN_KG_PER_WEEK.max,
  };
}

/** Tour de taille le plus récent d'une fenêtre, `null` si aucun. */
export function latestWaist(entries: Measurement[], onOrBeforeIso?: string): number | null {
  const limit = onOrBeforeIso ? time(onOrBeforeIso) : Infinity;
  const candidates = entries
    .filter((e) => e.waistCm !== null && time(e.date) <= limit)
    .sort((a, b) => time(b.date) - time(a.date));
  return candidates[0]?.waistCm ?? null;
}

export type AdviceKind = 'add' | 'remove' | 'none';

export interface NutritionAdvice {
  kind: AdviceKind;
  /** Titre court, celui qu'on lit en premier. */
  title: string;
  /** L'action, en une phrase. */
  action: string;
  /** Nombre de semaines consécutives qui ont déclenché la règle. */
  weeks: number;
}

const NO_ADVICE: NutritionAdvice = { kind: 'none', title: '', action: '', weeks: 0 };

/**
 * §« Règle d'ajustement » du .md, appliquée à la moyenne glissante.
 *
 * Ne se prononce jamais sur une pesée isolée ni sur une seule semaine : il faut
 * `stableWeeks` (ou `fastGainWeeks`) variations hebdomadaires consécutives qui
 * vont toutes dans le même sens. Si les données manquent sur une seule de ces
 * semaines, on ne dit rien plutôt que de conseiller à l'aveugle.
 */
export function nutritionAdvice(entries: Measurement[], todayIso: string): NutritionAdvice {
  const needed = Math.max(ADJUST_RULES.stableWeeks, ADJUST_RULES.fastGainWeeks) + 1;
  const points = weeklyAverages(entries, todayIso, needed);

  /** Variation de la semaine `i` par rapport à la précédente. `null` si trou. */
  const delta = (i: number): number | null => {
    const a = points[i]?.average;
    const b = points[i + 1]?.average;
    return a != null && b != null ? round(a - b) : null;
  };

  // Prise trop rapide d'abord : c'est le signal qu'on veut voir en premier, et
  // une prise rapide n'est jamais « stable » — les deux cas s'excluent.
  const fast = Array.from({ length: ADJUST_RULES.fastGainWeeks }, (_, i) => delta(i));
  if (fast.every((d) => d !== null && d > ADJUST_RULES.fastGainKg)) {
    const waistNow = latestWaist(entries, points[0]!.endDate);
    const waistThen = latestWaist(entries, points[ADJUST_RULES.fastGainWeeks]!.endDate);
    const waistRising =
      waistNow !== null &&
      waistThen !== null &&
      waistNow - waistThen > ADJUST_RULES.waistRiseCm;

    return {
      kind: 'remove',
      weeks: ADJUST_RULES.fastGainWeeks,
      title: `Prise rapide depuis ${ADJUST_RULES.fastGainWeeks} semaines`,
      action: waistRising
        ? 'Retire 50 g de féculent au dîner. Ton tour de taille suit la même hausse : la prise n’est pas uniquement musculaire.'
        : 'Retire 50 g de féculent au dîner.',
    };
  }

  const stable = Array.from({ length: ADJUST_RULES.stableWeeks }, (_, i) => delta(i));
  if (stable.every((d) => d !== null && Math.abs(d) <= ADJUST_RULES.stableKg)) {
    return {
      kind: 'add',
      weeks: ADJUST_RULES.stableWeeks,
      title: `Poids stable depuis ${ADJUST_RULES.stableWeeks} semaines`,
      action: 'Ajoute 50 g de féculent au dîner.',
    };
  }

  return NO_ADVICE;
}
