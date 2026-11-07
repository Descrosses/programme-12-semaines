/**
 * Le chrono d'un BLOC minuté — à ne pas confondre avec le repos.
 *
 * ── Pourquoi un deuxième chrono ────────────────────────────────────────────
 *
 * Celui de `restTimer` compte un REPOS : il part quand une série se termine,
 * il sonne, et il s'efface. Un circuit minuté est l'inverse — « circuit 1,
 * total 10 minutes, minuté » : le compte à rebours court PENDANT le travail,
 * il englobe les séries et les récupérations, et il ne dit pas « reprends »
 * mais « il te reste tant ». Les faire porter par le même objet obligerait
 * l'un des deux à mentir, et les deux tournent en même temps : 20 s entre les
 * exercices à l'intérieur des 10 minutes du circuit.
 *
 * ── Pourquoi `localStorage` et pas un état React ───────────────────────────
 *
 * Dix minutes, c'est long. L'écran s'éteint, l'application passe en
 * arrière-plan, iOS la décharge, la personne revient. Un compteur gardé en
 * mémoire du composant redémarrerait à zéro à chaque retour — c'est-à-dire
 * exactement quand on a besoin de lui. On ne stocke donc pas un décompte mais
 * l'HORODATAGE DE FIN, et le temps restant se recalcule à chaque affichage.
 * Même choix que le chrono de repos, et pour la même raison.
 *
 * Ce n'est pas dans IndexedDB : un bloc en cours n'est pas une donnée
 * d'entraînement, c'est un état d'écran. Le perdre ne perd rien.
 */

const KEY = 'majk:blocs-minutes';
/** Au-delà, un bloc oublié n'intéresse plus personne et encombre. */
const PEREMPTION_MS = 12 * 60 * 60 * 1000;

export interface BlocMinute {
  /** Fin prévue, en ms epoch. */
  finAt: number;
  /** La durée annoncée, en secondes — pour la barre de progression. */
  totalSec: number;
}

export type BlocsMinutes = Record<string, BlocMinute>;

/**
 * La clé d'un bloc : la séance ET le bloc.
 *
 * Sans la semaine et le jour, le circuit 1 du lundi et celui du mercredi
 * partageraient le même compte à rebours — et démarrer l'un arrêterait
 * l'autre.
 */
export function cleBloc(week: number, day: number, blocId: string): string {
  return `${week}-${day}-${blocId}`;
}

export function lireBlocs(now = Date.now()): BlocsMinutes {
  try {
    const brut = localStorage.getItem(KEY);
    if (brut === null) return {};
    const lu = JSON.parse(brut) as unknown;
    if (typeof lu !== 'object' || lu === null) return {};
    const propres: BlocsMinutes = {};
    for (const [cle, valeur] of Object.entries(lu as Record<string, unknown>)) {
      const v = valeur as Partial<BlocMinute>;
      if (typeof v?.finAt !== 'number' || typeof v?.totalSec !== 'number') continue;
      if (now - v.finAt > PEREMPTION_MS) continue; // périmé : on l'oublie
      propres[cle] = { finAt: v.finAt, totalSec: v.totalSec };
    }
    return propres;
  } catch {
    // Mode privé, stockage plein, JSON abîmé : pas de bloc en cours, c'est tout.
    return {};
  }
}

function ecrire(blocs: BlocsMinutes): void {
  try {
    if (Object.keys(blocs).length === 0) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, JSON.stringify(blocs));
  } catch {
    /* Rien à faire : le bloc tournera sans survivre au rechargement. */
  }
}

export function lireBloc(cle: string, now = Date.now()): BlocMinute | null {
  return lireBlocs(now)[cle] ?? null;
}

export function demarrerBloc(cle: string, minutes: number, now = Date.now()): BlocMinute {
  const totalSec = Math.round(minutes * 60);
  const bloc: BlocMinute = { finAt: now + totalSec * 1000, totalSec };
  ecrire({ ...lireBlocs(now), [cle]: bloc });
  return bloc;
}

export function arreterBloc(cle: string, now = Date.now()): void {
  const blocs = lireBlocs(now);
  delete blocs[cle];
  ecrire(blocs);
}

/**
 * Secondes restantes, jamais négatives.
 *
 * Le dépassement se lit par `depassementSec` : les deux séparés, parce que
 * l'écran n'affiche pas « -45 s » mais « 0:00 » puis « +45 s ». Un nombre
 * négatif dans un libellé de durée se lit mal et se formate encore plus mal.
 */
export function restantSec(bloc: BlocMinute, now = Date.now()): number {
  return Math.max(0, Math.ceil((bloc.finAt - now) / 1000));
}

export function depassementSec(bloc: BlocMinute, now = Date.now()): number {
  return Math.max(0, Math.floor((now - bloc.finAt) / 1000));
}

export function blocFini(bloc: BlocMinute, now = Date.now()): boolean {
  return now >= bloc.finAt;
}

/** Part écoulée, de 0 à 1. Reste à 1 une fois le temps dépassé. */
export function ratioBloc(bloc: BlocMinute, now = Date.now()): number {
  if (bloc.totalSec <= 0) return 1;
  const ecoule = bloc.totalSec - restantSec(bloc, now);
  return Math.min(1, Math.max(0, ecoule / bloc.totalSec));
}

/** « 10:00 », « 0:45 » — le format d'un compte à rebours, pas d'une durée. */
export function minutesSecondes(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
