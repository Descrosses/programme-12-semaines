/**
 * Le chrono de la séance — calculé, jamais compté.
 *
 * ── Pourquoi deux horodatages et pas un compteur ───────────────────────────
 *
 * Un compteur qui s'incrémente toutes les secondes meurt avec l'onglet. Entre
 * deux séries, Guillaume verrouille son téléphone, répond à un message,
 * recharge la page sans le vouloir. Un compteur aurait alors perdu dix minutes
 * sans le dire, et le chiffre affiché à la fin serait faux sans que rien ne
 * signale qu'il l'est.
 *
 * Deux instants en base — `startedAt`, `finishedAt` — n'ont pas ce problème :
 * la durée est une soustraction, donc elle est juste même si l'appli n'a pas
 * tourné une seule seconde entre les deux. L'écran rafraîchit un affichage,
 * il ne tient pas le compte.
 *
 * Corollaire : `startedAt` ne se réécrit JAMAIS tout seul. S'il existe, la
 * séance a commencé, point. Le seul moyen de le changer est le bouton
 * « Remettre à zéro », et il demande confirmation.
 *
 * Tout ici est pur : aucune lecture d'horloge sans qu'on la passe en argument,
 * ce qui rend les six cas testables sans attendre une minute.
 */

/** Ce que l'écran connaît de l'horloge d'une séance. */
export interface SessionClock {
  startedAt?: number | undefined;
  finishedAt?: number | undefined;
}

/**
 * Durée écoulée en millisecondes, ou `null` s'il n'y a rien à mesurer.
 *
 * `null` dans deux cas : aucune heure de début (séance jamais ouverte, ou
 * ligne créée par une version antérieure à ce chrono), ou une fin ANTÉRIEURE
 * au début. Ce second cas ne devrait pas arriver, mais une durée négative
 * affichée au-dessus d'une séance serait pire qu'une absence de durée — et
 * elle se produirait exactement le jour où l'horloge du téléphone se recale.
 */
export function elapsedMs(clock: SessionClock, now: number): number | null {
  if (clock.startedAt === undefined) return null;
  const fin = clock.finishedAt ?? now;
  const ms = fin - clock.startedAt;
  return ms < 0 ? null : ms;
}

/** Durée écoulée en minutes entières, ou `null`. */
export function elapsedMin(clock: SessionClock, now: number): number | null {
  const ms = elapsedMs(clock, now);
  return ms === null ? null : Math.round(ms / 60_000);
}

/**
 * « 7 min », « 48 min », « 1 h 12 ».
 *
 * Pas de secondes. Une séance ne se joue pas à la seconde près, et un chiffre
 * qui bouge chaque seconde en tête d'écran est une animation : exactement ce
 * qu'on ne veut pas sous les yeux entre deux séries.
 */
export function formatDuration(ms: number): string {
  const minutes = Math.max(0, Math.round(ms / 60_000));
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, '0')}`;
}

/** Le chrono tel qu'il s'affiche en tête de séance, ou `null`. */
export function clockLabel(clock: SessionClock, now: number): string | null {
  const ms = elapsedMs(clock, now);
  return ms === null ? null : formatDuration(ms);
}

/** La séance est-elle en cours — commencée et pas terminée ? */
export function isRunning(clock: SessionClock): boolean {
  return clock.startedAt !== undefined && clock.finishedAt === undefined;
}

/** Au-delà de ce dépassement, le résumé le signale. Décision de Guillaume. */
export const OVERRUN_PCT = 15;

export interface DurationVerdict {
  realMin: number;
  plannedMin: number;
  /** Réel − prévu, en minutes. Négatif = plus rapide que prévu. */
  gapMin: number;
  /** Dépassement en %, arrondi à l'unité. Négatif = en dessous du prévu. */
  overPct: number;
  /** Dépassement de plus de 15 % — un constat, pas un reproche. */
  warn: boolean;
}

/**
 * Réel contre prévu, et rien de plus.
 *
 * Ce que cette fonction NE fait pas : conseiller. Une séance plus longue que
 * prévue peut vouloir dire une salle pleine, un repos mal tenu, ou un
 * échauffement sérieux — l'appli ne sait pas laquelle, donc elle ne tranche
 * pas. Elle affiche l'écart et laisse Guillaume le lire.
 *
 * `null` si la durée prévue est nulle ou absente : un pourcentage de
 * dépassement sur une base de zéro n'existe pas.
 */
export function durationVerdict(realMin: number, plannedMin: number): DurationVerdict | null {
  if (!Number.isFinite(plannedMin) || plannedMin <= 0) return null;
  const gapMin = Math.round(realMin - plannedMin);
  const overPct = Math.round(((realMin - plannedMin) / plannedMin) * 100);
  return {
    realMin: Math.round(realMin),
    plannedMin,
    gapMin,
    overPct,
    warn: overPct > OVERRUN_PCT,
  };
}

/** « +18 min (+24 %) », « −6 min (−8 %) », « pile sur le prévu ». */
export function gapLabel(v: DurationVerdict): string {
  if (v.gapMin === 0) return 'pile sur le prévu';
  const signe = v.gapMin > 0 ? '+' : '−';
  return `${signe}${Math.abs(v.gapMin)} min (${signe}${Math.abs(v.overPct)} %)`;
}

/** Une séance terminée, avec sa durée réelle et celle que le plan annonçait. */
export interface SessionDurationEntry {
  week: number;
  day: number;
  date: string;
  realMin: number;
  plannedMin: number | null;
  verdict: DurationVerdict | null;
}

/** Ce que l'historique des durées a besoin de connaître d'une séance. */
export interface ClockedSession extends SessionClock {
  week: number;
  day: number;
  date: string;
}

/**
 * Les durées réelles, séance par séance, dans l'ordre du programme.
 *
 * Seules les séances TERMINÉES entrent : une séance ouverte et jamais fermée
 * n'a pas de durée, elle a un chrono qui tourne. L'inclure ferait apparaître
 * dans l'historique une séance de « 14 h » — la nuit passée entre l'ouverture
 * de la veille et le regard d'aujourd'hui.
 *
 * `plannedFor` est passée en argument plutôt que lue ici : la durée prévue se
 * calcule depuis la séance résolue, ce qui demande le programme entier. La
 * garder dehors laisse cette fonction pure et testable sans monter de contexte.
 */
export function sessionDurations(
  rows: ClockedSession[],
  plannedFor: (week: number, day: number) => number | null,
): SessionDurationEntry[] {
  return rows
    .filter((r) => r.startedAt !== undefined && r.finishedAt !== undefined)
    .map((r) => {
      const realMin = elapsedMin(r, r.finishedAt!);
      if (realMin === null) return null;
      const plannedMin = plannedFor(r.week, r.day);
      return {
        week: r.week,
        day: r.day,
        date: r.date,
        realMin,
        plannedMin,
        verdict: plannedMin === null ? null : durationVerdict(realMin, plannedMin),
      };
    })
    .filter((e): e is SessionDurationEntry => e !== null)
    .sort((a, b) => (a.week !== b.week ? a.week - b.week : a.day - b.day));
}

/** Médiane des durées réelles, en minutes — ou `null` si la liste est vide. */
export function medianRealMin(entries: SessionDurationEntry[]): number | null {
  if (entries.length === 0) return null;
  const triees = entries.map((e) => e.realMin).sort((a, b) => a - b);
  const mid = Math.floor(triees.length / 2);
  return triees.length % 2 === 1 ? triees[mid]! : Math.round((triees[mid - 1]! + triees[mid]!) / 2);
}
