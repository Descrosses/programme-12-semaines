/**
 * MASS FORCE — la progression S1 → S4 (lot 6, §1 ter du .md).
 *
 * Fonctions PURES : elles ne lisent que les séries brutes du cycle (jamais
 * `buildHistoryIndex`, partagé avec POWER, dont l'`Occurrence.completed` veut
 * dire « au moins une série » et non « séance complète »).
 *
 * La progression suit les SÉANCES réellement faites, pas le calendrier : une
 * séance non faite ne produit aucun passage, la cible suivante est la même.
 *
 * Seuils (§1 ter, décisions de Guillaume) :
 * - +2,5 % après réussite, jamais au-delà du haut de la fourchette ;
 * - −5 % après deux échecs de suite, jamais sous le bas ; au bas : suspendu ;
 * - tolérance de 2,5 points pour juger qu'une charge est conforme ;
 * - sans RIR, deux réussites consécutives au même % avant de monter (ACSM 2009 :
 *   « two consecutive training sessions ») ;
 * - l'ancre (1RM) est figée à la hausse ; une baisse s'applique tout de suite.
 */
import type { ReferenceForceRow, SetRow } from '../../db/db';
import { historiqueReferences } from '../../engine/references';
import type { FourchettePct, LigneForce } from './types';

export const PAS_PCT = 2.5;
export const BAISSE_PCT = 5;
export const TOLERANCE_PCT = 2.5;
const EPS = 1e-9;

export interface SerieForce {
  index: number;
  reps: number | null;
  kg: number | null;
  rir: number | null;
  failed: boolean;
  faiteLe: number;
}

/** Une séance où l'exercice a été fait : ses séries, et la cible qu'elle portait. */
export interface PassageForce {
  semaine: number;
  jour: number;
  pct: number | null;
  kgCible: number | null;
  series: SerieForce[];
}

/**
 * Les passages d'un exercice-matériel AVANT une semaine donnée, dans l'ordre.
 * Une séance sans aucune saisie ne compte pas : non faite = ignorée.
 */
export function passagesDe(
  series: readonly SetRow[],
  exerciseId: string,
  avantSemaine: number,
): PassageForce[] {
  const groupes = new Map<string, SetRow[]>();
  for (const s of series) {
    if (s.exerciseId !== exerciseId || s.week >= avantSemaine) continue;
    if (s.actualReps === null && s.actualKg === null) continue;
    const cle = `${s.week}/${s.day}`;
    const g = groupes.get(cle);
    if (g) g.push(s);
    else groupes.set(cle, [s]);
  }
  return [...groupes.values()]
    .sort((a, b) => a[0]!.week - b[0]!.week || a[0]!.day - b[0]!.day)
    .map((rows) => {
      const triees = [...rows].sort((a, b) => a.setIndex - b.setIndex);
      return {
        semaine: triees[0]!.week,
        jour: triees[0]!.day,
        pct: triees.find((r) => r.pctPrescrit != null)?.pctPrescrit ?? null,
        kgCible: triees.find((r) => r.kgCible != null)?.kgCible ?? null,
        series: triees.map((r) => ({
          index: r.setIndex,
          reps: r.actualReps,
          kg: r.actualKg,
          rir: r.rirSaisi ?? null,
          failed: r.failed,
          faiteLe: r.doneAt ?? 0,
        })),
      };
    });
}

export type Classement =
  | 'echec'
  | 'incomplete'
  | 'sous-charge'
  | 'dure'
  | 'reussite'
  | 'a-confirmer';

export interface Prescrit {
  series: number;
  reps: number;
}

/** « 5 », « 12 / jambe » → 5, 12. */
export function repsPrescrites(ligne: LigneForce): number {
  return Number.parseInt(ligne.reps, 10);
}

const faites = (p: PassageForce) => p.series.filter((s) => s.reps !== null);
const manque = (p: PassageForce, reps: number) =>
  faites(p).some((s) => (s.reps as number) < reps || s.failed);
/** Le RIR de la dernière série faite, `null` s'il n'a pas été saisi. */
const rirFinal = (p: PassageForce) => faites(p).at(-1)?.rir ?? null;

/** Le classement d'une séance, dans l'ordre de priorité du §1 ter. */
export function classer(p: PassageForce, prescrit: Prescrit, ancre: number): Classement {
  if (manque(p, prescrit.reps)) return 'echec';
  if (faites(p).length < prescrit.series) return 'incomplete';
  const kgs = faites(p).map((s) => s.kg);
  if (kgs.some((k) => k === null) || p.pct === null) return 'sous-charge';
  const pctReel = (Math.min(...(kgs as number[])) / ancre) * 100;
  if (pctReel < p.pct - TOLERANCE_PCT - EPS) return 'sous-charge';
  const rir = rirFinal(p);
  if (rir === null) return 'a-confirmer';
  return rir === 0 ? 'dure' : 'reussite';
}

const MOTIFS = {
  reussite: 'Séance réussie : +2,5 %.',
  confirmee: 'Deuxième réussite à ce % : +2,5 %.',
  aConfirmer: 'Réussite sans RIR saisi : on la confirme à la même charge.',
  dure: 'Dernière séance à l’échec (RIR 0) : même cible.',
  incomplete: 'Séance précédente incomplète : même cible.',
  sousCharge: 'Charge précédente sous la cible, ou non saisie : même cible.',
  echec: 'Répétitions manquées : même cible.',
  deuxEchecs: 'Deux échecs de suite : −5 %.',
  plafond: 'Haut de la fourchette atteint : refais le combiné au prochain cycle.',
  suspendu:
    'Deux échecs au bas de la fourchette : référence à réévaluer. Refais un test direct au combiné ; en attendant, charge libre.',
  repart: 'Nouvelle référence : la progression repart du bas de la fourchette.',
  baisse: 'Nouveau 1RM plus bas : appliqué tout de suite.',
  hausse: 'Nouveau 1RM plus haut : il servira au prochain cycle.',
} as const;

/** Le % qui suit une séance classée. `null` : suspendu. */
export function pctSuivant(
  pct: number,
  c: Classement,
  precedent: { pct: number; classement: Classement } | null,
  f: FourchettePct,
): { pct: number | null; motif: string } {
  const monter = (motif: string) =>
    pct >= f.max - EPS
      ? { pct: f.max, motif: MOTIFS.plafond }
      : { pct: Math.min(pct + PAS_PCT, f.max), motif };
  switch (c) {
    case 'reussite':
      return monter(MOTIFS.reussite);
    case 'a-confirmer':
      return precedent !== null &&
        Math.abs(precedent.pct - pct) < EPS &&
        (precedent.classement === 'reussite' || precedent.classement === 'a-confirmer')
        ? monter(MOTIFS.confirmee)
        : { pct, motif: MOTIFS.aConfirmer };
    case 'dure':
      return { pct, motif: MOTIFS.dure };
    case 'incomplete':
      return { pct, motif: MOTIFS.incomplete };
    case 'sous-charge':
      return { pct, motif: MOTIFS.sousCharge };
    case 'echec':
      if (precedent?.classement !== 'echec') return { pct, motif: MOTIFS.echec };
      return pct <= f.min + EPS
        ? { pct: null, motif: MOTIFS.suspendu }
        : { pct: Math.max(pct - BAISSE_PCT, f.min), motif: MOTIFS.deuxEchecs };
  }
}

export type EtatForce =
  | { kind: 'sans-reference' }
  | {
      kind: 'actif';
      ancre: number;
      reference: ReferenceForceRow | null;
      pct: number;
      motif: string | null;
    }
  | { kind: 'suspendu'; motif: string };

/** L'ancre qu'une séance portait : charge cible ÷ % (deux décimales, comme la saisie). */
const ancreDe = (p: PassageForce) =>
  Math.round((((p.kgCible as number) * 100) / (p.pct as number)) * 100) / 100;

const fin = (p: PassageForce) => Math.max(...p.series.map((s) => s.faiteLe));
const debut = (p: PassageForce) => Math.min(...p.series.map((s) => s.faiteLe));

/**
 * L'état de progression d'un mouvement à fourchette, avant une séance.
 *
 * On rejoue les passages qui portaient une cible : chacun est classé contre
 * l'ancre qu'il portait, et donne le % suivant.
 */
export function etatForce(input: {
  passages: readonly PassageForce[];
  fourchette: FourchettePct;
  references: readonly ReferenceForceRow[];
  exercice: string;
  variante: string;
  prescrit: Prescrit;
}): EtatForce {
  const { fourchette: f, prescrit } = input;
  const directes = historiqueReferences(input.references, input.exercice, input.variante).filter(
    (r) => r.modalite === 'direct',
  );
  const refPour = (kg: number) => directes.find((r) => Math.abs(r.chargeKg - kg) < 0.005) ?? null;

  const cibles = input.passages.filter((p) => p.pct !== null && p.kgCible !== null);
  if (cibles.length === 0) {
    const r = directes[0];
    return r === undefined
      ? { kind: 'sans-reference' }
      : { kind: 'actif', ancre: r.chargeKg, reference: r, pct: f.min, motif: null };
  }

  let pct: number | null = f.min;
  let motif: string | null = null;
  let precedent: { pct: number; classement: Classement } | null = null;
  let suspenduLe: number | null = null;
  for (const p of cibles) {
    // Une séance avec cible APRÈS une suspension : une nouvelle ancre a été posée.
    if (suspenduLe !== null) {
      suspenduLe = null;
      precedent = null;
    }
    const c = classer(p, prescrit, ancreDe(p));
    const suite = pctSuivant(p.pct as number, c, precedent, f);
    pct = suite.pct;
    motif = suite.motif;
    if (pct === null) suspenduLe = fin(p);
    precedent = { pct: p.pct as number, classement: c };
  }

  const dernier = cibles[cibles.length - 1]!;
  if (pct === null) {
    const nouvelle = directes.find((r) => r.creeLe > (suspenduLe as number));
    return nouvelle === undefined
      ? { kind: 'suspendu', motif: motif as string }
      : {
          kind: 'actif',
          ancre: nouvelle.chargeKg,
          reference: nouvelle,
          pct: f.min,
          motif: MOTIFS.repart,
        };
  }

  // Ancre figée à la hausse ; une référence plus basse, posée depuis le début
  // du cycle, s'applique tout de suite.
  let ancre = ancreDe(dernier);
  const recente = directes.find((r) => r.creeLe > debut(cibles[0]!));
  if (recente !== undefined && recente.chargeKg < ancre - EPS) {
    ancre = recente.chargeKg;
    motif = MOTIFS.baisse;
  } else if (recente !== undefined && recente.chargeKg > ancre + EPS) {
    motif = `${motif} ${MOTIFS.hausse}`;
  }
  return { kind: 'actif', ancre, reference: refPour(ancre), pct, motif };
}

/**
 * Exercices complémentaires et push press : « augmente / garde / baisse ».
 * Aucun kilo n'est calculé — il n'y a pas de 1RM pour ces mouvements.
 */
export function conseilComplementaire(
  ligne: LigneForce,
  passages: readonly PassageForce[],
): string | null {
  const r = repsPrescrites(ligne);
  if (Number.isNaN(r)) return null;
  const haut = r + 2;
  const p = passages.at(-1);
  const avant = passages.at(-2) ?? null;
  const complet = (x: PassageForce) => faites(x).length >= ligne.series && !manque(x, r);
  const minKg = (x: PassageForce) => {
    const kgs = faites(x).map((s) => s.kg);
    return kgs.some((k) => k === null) ? null : Math.min(...(kgs as number[]));
  };

  switch (ligne.progression) {
    case 'plage':
      if (p === undefined)
        return `Plage : ${r} à ${haut} répétitions. Quand toutes les séries atteignent ${haut}, augmente la charge.`;
      if (manque(p, r))
        return avant !== null && manque(avant, r)
          ? `Deux séances sous ${r} répétitions : baisse la charge.`
          : `Série sous ${r} répétitions : garde la charge.`;
      if (faites(p).length < ligne.series) return 'Séance précédente incomplète : garde la charge.';
      if (faites(p).every((s) => (s.reps as number) >= haut))
        return `Toutes les séries à ${haut} : augmente la charge et reviens à ${r}.`;
      return `Garde la charge, vise une répétition de plus (jusqu’à ${haut}).`;
    case 'fixe':
      if (p === undefined)
        return 'Répétitions fixes : deux séances complètes de suite à la même charge, puis augmente.';
      if (manque(p, r))
        return avant !== null && manque(avant, r)
          ? 'Deux séances avec une série manquée : baisse la charge.'
          : 'Série manquée : garde la charge.';
      if (faites(p).length < ligne.series) return 'Séance précédente incomplète : garde la charge.';
      if (avant !== null && complet(avant) && minKg(p) !== null && minKg(p) === minKg(avant))
        return 'Deux séances complètes à cette charge : augmente la charge.';
      return 'Garde la charge : encore une séance complète à cette charge, puis augmente.';
    case 'push-press': {
      if (p === undefined)
        return 'Choisis une charge que tu maîtrises. 4 × 4 complet avec 2 répétitions en réserve ou plus : augmente.';
      if (!complet(p)) return 'Séance incomplète ou série manquée : garde la charge.';
      const rir = rirFinal(p);
      if (rir === null) return 'Sans RIR saisi, la charge est gardée.';
      return rir >= 2
        ? '4 × 4 complet avec 2 répétitions en réserve ou plus : augmente la charge.'
        : 'Moins de 2 répétitions en réserve : garde la charge.';
    }
    case 'pourcentage':
      return null;
  }
}
