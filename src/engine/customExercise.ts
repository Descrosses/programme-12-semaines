/**
 * Remplacer un exercice, ou en ajouter un — sans toucher au programme.
 *
 * ── La distinction qui gouverne tout ce fichier ─────────────────────────────
 *
 * Le programme est une PRESCRIPTION : il dit ce qui était prévu, et il le
 * redira la semaine suivante. Un remplacement est un FAIT DE SÉANCE : le
 * 3 octobre, la cage à squat était prise, donc c'était un Hack Squat. C'est
 * exactement la distinction déjà retenue pour un aliment mangé en plus du plan
 * alimentaire, et elle a les mêmes conséquences.
 *
 * Donc : rien n'est modifié automatiquement. L'exercice prévu reste au plan,
 * et la semaine suivante le même créneau le propose de nouveau. L'appli dit
 * seulement ce qui a été fait à sa place, avec un bouton pour refaire le même
 * choix en un geste si Guillaume le veut.
 *
 * ── Pourquoi un remplacement ne nourrit pas §11 ─────────────────────────────
 *
 * Les séries validées s'enregistrent sous l'id du REMPLAÇANT. §11 lit
 * l'historique par identifiant d'exercice : un Hack Squat fait à la place du
 * Back Squat n'influence donc jamais la charge de squat de la semaine
 * suivante, et il n'y a aucune règle à écrire pour ça — c'est la conséquence
 * mécanique du choix de stockage.
 *
 * L'inverse est vrai aussi, et c'est voulu : si le Hack Squat revient trois
 * semaines plus tard, il retrouve son propre historique et sa propre
 * progression. Un exercice fait deux fois n'est plus un accident.
 *
 * Tout ici est pur : aucun accès à la base, aucun React.
 */

import { reps as repsWork, type ExerciseDef, type Work } from '../data/types';
import type { ResolvedExercise } from './getSession';
import { loadLine as formatLoadLine } from './format';
import type { ResolvedLoad } from './loadResolver';

/** Préfixe des exercices tapés à la main, pour ne jamais heurter un id du programme. */
export const FREE_PREFIX = 'libre:';

/** Ce que Guillaume saisit dans le panneau — remplacement comme ajout. */
export interface CustomSpec {
  /** Id du catalogue, ou `libre:<slug>` pour un nom tapé. */
  exerciseId: string;
  name: string;
  sets: number;
  reps: number;
  /** `null` = pas de charge (poids du corps, élastique). */
  kg: number | null;
  restSec: number;
}

/** Une ligne telle que la base la porte. */
export interface CustomRow extends CustomSpec {
  id?: number;
  kind: 'replace' | 'add';
  originalExerciseId: string | null;
  week: number;
  day: number;
  at: number;
}

/** Valeurs d'ouverture du panneau d'AJOUT : un accessoire ordinaire. */
export const ADD_DEFAULTS: Omit<CustomSpec, 'exerciseId' | 'name'> = {
  sets: 3,
  reps: 8,
  kg: null,
  restSec: 60,
};

/**
 * Un identifiant stable à partir d'un nom tapé.
 *
 * Deux saisies du même nom doivent produire le même id, sinon « Hack Squat »
 * de la semaine 5 et « hack squat » de la semaine 8 feraient deux historiques
 * séparés — et Guillaume ne verrait jamais sa progression dessus.
 *
 * Les accents sont retirés et la casse écrasée pour cette raison : c'est le
 * nom AFFICHÉ qui garde la forme tapée, pas l'identifiant.
 */
export function freeId(name: string): string {
  const slug = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${FREE_PREFIX}${slug}`;
}

export function isFreeId(id: string): boolean {
  return id.startsWith(FREE_PREFIX);
}

/**
 * La fiche d'un exercice libre.
 *
 * Minimale et c'est volontaire : on n'invente ni intention, ni consigne, ni
 * règle de progression pour un mouvement dont on ne connaît que le nom. Un
 * texte générique du genre « garde le dos droit » occuperait la place d'une
 * vraie consigne sans en être une.
 *
 * `role: 'accessory'` plutôt que `main` : le bouton « rep ratée », réservé aux
 * lifts principaux, n'apparaît donc pas — et c'est juste, puisqu'aucune règle
 * de §11 ne s'applique à un mouvement sans cible de RPE.
 */
export function freeDef(spec: CustomSpec): ExerciseDef {
  return { id: spec.exerciseId, name: spec.name, fn: 'libre', role: 'accessory' };
}

/**
 * La charge d'un exercice de séance.
 *
 * Toujours un chiffre saisi à la main, jamais autorégulée : l'autorégulation
 * suppose un historique et une place dans le programme, et un exercice choisi
 * à l'instant n'a ni l'un ni l'autre. `source: 'historique'` dit d'où elle
 * vient — de ce que Guillaume a tapé, pas du .md.
 */
function customLoad(spec: CustomSpec): ResolvedLoad {
  if (spec.kg === null) return { kg: null, shape: 'none', step: 2.5, source: 'aucune' };
  return { kg: spec.kg, shape: 'barbell', step: 2.5, source: 'historique' };
}

/**
 * L'exercice saisi, sous la forme que l'écran séance sait déjà afficher.
 *
 * C'est tout l'intérêt de passer par `ResolvedExercise` : un exercice ajouté
 * se comporte comme les autres — une ligne par série, validation, timer de
 * repos, remarques, enregistrement immédiat — sans un seul composant de plus.
 *
 * `def` est passé en argument quand l'exercice vient du catalogue, pour qu'il
 * garde ses consignes et sa fiche technique. Un nom libre reçoit la fiche
 * minimale ci-dessus.
 */
export function resolveCustom(spec: CustomSpec, def?: ExerciseDef): ResolvedExercise {
  const work: Work = repsWork(spec.reps);
  const load = customLoad(spec);
  return {
    def: def ?? freeDef(spec),
    id: spec.exerciseId,
    name: spec.name,
    sets: spec.sets,
    work,
    load,
    /*
     * Aucune cible de RPE : le programme n'en prescrit pas pour un exercice
     * qu'il ne connaît pas. En inventer une ferait entrer le mouvement dans
     * les règles de progression de §11, qui n'ont rien à dire sur lui.
     */
    targetRPE: null,
    restSec: spec.restSec,
    loadLine: formatLoadLine(spec.sets, work, load),
    notes: [],
    lastKg: spec.kg,
    lastMeasure: null,
    suggestion: null,
    adjustments: [],
  };
}

/** « 3 × 8 × 40 kg », « 3 × 12 » au poids du corps. */
export function specFormat(spec: CustomSpec): string {
  const charge = spec.kg === null ? '' : ` × ${formatKg(spec.kg)} kg`;
  return `${spec.sets} × ${spec.reps}${charge}`;
}

function formatKg(n: number): string {
  return String(Math.round(n * 100) / 100).replace('.', ',');
}

/**
 * Les valeurs d'ouverture du panneau de REMPLACEMENT : celles de l'exercice
 * d'origine.
 *
 * Remplacer un 4 × 6 à 120 kg par un 3 × 8 par défaut obligerait à corriger
 * quatre curseurs avant de commencer. On part donc du format prévu, et
 * Guillaume ne touche que ce qui change vraiment.
 *
 * Les reps d'une fourchette (« 6-8 ») ouvrent sur le HAUT : c'est la cible,
 * le bas n'est qu'un plancher acceptable.
 */
export function prefillFrom(ex: ResolvedExercise): Omit<CustomSpec, 'exerciseId' | 'name'> {
  return {
    sets: ex.sets,
    reps: repsOf(ex.work) ?? ADD_DEFAULTS.reps,
    kg: ex.load.kg,
    restSec: ex.restSec,
  };
}

function repsOf(work: Work): number | null {
  if (work.kind !== 'reps') return null;
  const r = work.reps;
  if (r === 'max') return null;
  return typeof r === 'number' ? r : r.max;
}

// ---------------------------------------------------------------------------
// Appliquer les lignes de la séance du jour
// ---------------------------------------------------------------------------

/** Un exercice prévu, mis de côté par un remplacement. */
export interface Replaced {
  /** L'exercice que le programme prescrivait — conservé pour l'afficher. */
  original: ResolvedExercise;
  row: CustomRow;
}

export interface CustomApplied {
  /** La liste à afficher : remplacements en place, ajouts à la fin. */
  exercises: ResolvedExercise[];
  /** Ce qui a été mis de côté, avec la ligne qui l'a remplacé. */
  replaced: Replaced[];
}

/**
 * Remplace et ajoute, dans l'ordre d'affichage voulu.
 *
 * Un remplacement prend la PLACE de l'exercice d'origine, il ne va pas en fin
 * de liste : l'ordre d'une séance n'est pas décoratif — le squat vient avant
 * les accessoires parce qu'il demande d'être frais. Ce qui remplace le squat
 * hérite de sa place.
 *
 * Les ajouts, eux, vont à la fin : rien ne dit où les mettre, et les glisser
 * au milieu déplacerait le travail prévu.
 *
 * `defFor` permet à un remplacement choisi dans le catalogue de garder ses
 * consignes. Elle est passée en argument pour que ce fichier reste pur.
 */
export function applyCustom(
  exercises: ResolvedExercise[],
  rows: CustomRow[],
  defFor: (exerciseId: string) => ExerciseDef | undefined,
): CustomApplied {
  const remplacements = new Map<string, CustomRow>();
  for (const r of rows) {
    if (r.kind !== 'replace' || r.originalExerciseId === null) continue;
    // La plus récente gagne : remplacer deux fois le même créneau dans la
    // même séance veut dire « non, finalement, celui-là ».
    const dejaLa = remplacements.get(r.originalExerciseId);
    if (!dejaLa || r.at >= dejaLa.at) remplacements.set(r.originalExerciseId, r);
  }

  const replaced: Replaced[] = [];
  const liste: ResolvedExercise[] = [];

  for (const ex of exercises) {
    const row = remplacements.get(ex.id);
    if (!row) {
      liste.push(ex);
      continue;
    }
    replaced.push({ original: ex, row });
    liste.push(resolveCustom(row, defFor(row.exerciseId)));
  }

  for (const r of rows) {
    if (r.kind !== 'add') continue;
    liste.push(resolveCustom(r, defFor(r.exerciseId)));
  }

  return { exercises: liste, replaced };
}

// ---------------------------------------------------------------------------
// Ce que la semaine suivante doit montrer
// ---------------------------------------------------------------------------

/** `a` vient-elle strictement avant `b` dans le programme ? */
function estAvant(a: { week: number; day: number }, b: { week: number; day: number }): boolean {
  return a.week !== b.week ? a.week < b.week : a.day < b.day;
}

/**
 * Le dernier remplacement fait sur ce créneau, avant aujourd'hui.
 *
 * Même JOUR, parce que c'est le créneau qui compte : le Back Squat du lundi et
 * celui d'un éventuel autre jour ne sont pas le même emplacement de séance, et
 * la raison du remplacement — la cage occupée le lundi soir — est propre au
 * jour.
 *
 * Strictement avant : le remplacement du jour est déjà affiché à sa place, le
 * répéter dans une puce « la semaine dernière » serait doublement faux.
 */
export function previousReplacement(
  rows: CustomRow[],
  cible: { exerciseId: string; week: number; day: number },
): CustomRow | null {
  const candidats = rows
    .filter(
      (r) =>
        r.kind === 'replace' &&
        r.originalExerciseId === cible.exerciseId &&
        r.day === cible.day &&
        estAvant(r, cible),
    )
    .sort((a, b) => (estAvant(a, b) ? -1 : 1));
  return candidats[candidats.length - 1] ?? null;
}

/**
 * Les exercices ajoutés la dernière fois qu'on a fait ce créneau.
 *
 * Seulement la DERNIÈRE séance concernée, pas toutes les précédentes : un
 * ajout fait une fois en semaine 3 n'a pas à revenir proposer ses services
 * pendant neuf semaines.
 */
export function previousAdditions(
  rows: CustomRow[],
  cible: { week: number; day: number },
): CustomRow[] {
  const avant = rows.filter((r) => r.kind === 'add' && r.day === cible.day && estAvant(r, cible));
  if (avant.length === 0) return [];
  const derniereSemaine = Math.max(...avant.map((r) => r.week));
  return avant.filter((r) => r.week === derniereSemaine).sort((a, b) => a.at - b.at);
}

/** « Remplacé par Hack Squat : 3 × 8 × 40 kg » — la puce de la semaine suivante. */
export function replacementChip(row: CustomRow): string {
  return `Remplacé par ${row.name} : ${specFormat(row)}`;
}

/** « Ajouté la semaine dernière : Hack Squat, 3 × 8 × 40 kg ». */
export function additionChip(row: CustomRow): string {
  return `Ajouté la semaine dernière : ${row.name}, ${specFormat(row)}`;
}

// ---------------------------------------------------------------------------
// La liste de choix du panneau
// ---------------------------------------------------------------------------

export interface ExerciseChoice {
  exerciseId: string;
  name: string;
  /** D'où il vient : du programme, ou d'un nom déjà tapé une fois. */
  source: 'programme' | 'historique';
}

/**
 * Les exercices proposés dans le panneau, dans l'ordre d'utilité.
 *
 * Ceux déjà utilisés d'abord — s'il a remplacé le squat par un Hack Squat la
 * semaine dernière, c'est très probablement ce qu'il va rechoisir, et le faire
 * chercher dans une liste de quarante entrées serait absurde. Puis le
 * catalogue du programme, par ordre alphabétique.
 *
 * Un exercice déjà utilisé qui EST au catalogue n'apparaît qu'une fois, en
 * tête : deux lignes identiques dans une liste de choix font douter qu'elles
 * soient identiques.
 */
export function exerciseChoices(
  catalogue: Array<{ id: string; name: string }>,
  dejaUtilises: Array<{ exerciseId: string; name: string; at: number }>,
): ExerciseChoice[] {
  const vus = new Set<string>();
  const liste: ExerciseChoice[] = [];

  for (const u of [...dejaUtilises].sort((a, b) => b.at - a.at)) {
    if (vus.has(u.exerciseId)) continue;
    vus.add(u.exerciseId);
    liste.push({
      exerciseId: u.exerciseId,
      name: u.name,
      source: isFreeId(u.exerciseId) ? 'historique' : 'programme',
    });
  }

  for (const c of [...catalogue].sort((a, b) => a.name.localeCompare(b.name, 'fr'))) {
    if (vus.has(c.id)) continue;
    vus.add(c.id);
    liste.push({ exerciseId: c.id, name: c.name, source: 'programme' });
  }

  return liste;
}

/** Filtre la liste de choix sur ce que Guillaume tape, accents ignorés. */
export function matchChoices(liste: ExerciseChoice[], recherche: string): ExerciseChoice[] {
  const q = sansAccent(recherche.trim());
  if (q === '') return liste;
  return liste.filter((c) => sansAccent(c.name).includes(q));
}

function sansAccent(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}
