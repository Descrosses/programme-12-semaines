/**
 * Deux mouvements dans un seul encadré — et le rythme qui va avec.
 *
 * ── Ce que ça résout ───────────────────────────────────────────────────────
 *
 * Le lundi, l'Ab Wheel et le Roman Side Bench se font « en alternance : une
 * série de chaque, 45 s entre les stations ». À l'écran, c'étaient deux cartes
 * séparées de trois séries chacune. Pour suivre la consigne, il fallait
 * valider la série 1 de la première, faire défiler jusqu'à la seconde, valider
 * sa série 1, remonter — six allers-retours par séance, les mains pleines,
 * entre deux séries de 45 s. Personne ne le fait : on finit l'un, puis l'autre,
 * et l'alternance écrite dans le programme n'existe plus.
 *
 * ── Deux rythmes, pas un ───────────────────────────────────────────────────
 *
 * Réunir deux mouvements peut vouloir dire deux choses opposées, et les
 * confondre fausserait la séance :
 *
 *   ENCHAÎNÉ — A puis B sans aucun repos, et le repos vient après le duo.
 *   C'est le superset classique.
 *
 *   ALTERNÉ — une série de chaque, avec le MÊME repos entre chaque station.
 *   C'est ce que le programme écrit pour le tronc du lundi. Le repos n'est pas
 *   supprimé, il est juste rempli par l'autre mouvement.
 *
 * Le rythme n'est écrit nulle part comme tel : il se LIT dans les repos que
 * la trame donne déjà aux deux créneaux. Un premier créneau à `restSec: 0` ne
 * peut vouloir dire qu'une chose — on enchaîne. Deux repos non nuls veulent
 * dire qu'on alterne. Ajouter un champ pour redire ça aurait fait deux
 * vérités, et le jour où elles divergent, l'écran prescrit un rythme que le
 * programme n'écrit pas.
 *
 * Pur : aucun React, aucune base.
 */

import type { ResolvedExercise } from './getSession';
import { restLabel, workLabel } from './format';
import type { Work } from '../data/types';

export type Rythme = 'enchaine' | 'alterne';

export interface Paire {
  kind: 'paire';
  id: string;
  a: ResolvedExercise;
  b: ResolvedExercise;
  rythme: Rythme;
  /** Nombre de tours : le plus grand des deux nombres de séries. */
  tours: number;
  /**
   * Le repos qui compte. En enchaîné, celui du SECOND — c'est lui qui suit le
   * duo. En alterné, le repos de chaque station.
   */
  restSec: number;
}

export interface Solo {
  kind: 'solo';
  ex: ResolvedExercise;
}

export type Bloc = Paire | Solo;

/**
 * Le rythme de la paire, lu dans les repos de la trame.
 *
 * Premier créneau sans repos → on enchaîne. Sinon, on alterne.
 */
export function rythmeDe(a: ResolvedExercise, b: ResolvedExercise): Rythme {
  return a.restSec === 0 && b.restSec > 0 ? 'enchaine' : 'alterne';
}

/**
 * Regroupe les exercices d'une séance en blocs à afficher.
 *
 * Une paire n'est formée que par deux exercices CONSÉCUTIFS portant le même
 * identifiant. Consécutifs, parce que l'ordre d'une séance n'est pas
 * décoratif : réunir deux mouvements séparés par un troisième reviendrait à
 * déplacer ce troisième sans le dire.
 *
 * Un identifiant esseulé — l'autre moitié retirée par un deload, une
 * suspension ou un remplacement — ne forme pas de paire : l'exercice restant
 * s'affiche normalement, seul. C'est le cas qui casse si on suppose que le
 * voisin est toujours là.
 */
export function groupSupersets(exercises: ResolvedExercise[]): Bloc[] {
  const blocs: Bloc[] = [];
  for (let i = 0; i < exercises.length; i++) {
    const ex = exercises[i]!;
    const suivant = exercises[i + 1];
    if (ex.superset && suivant?.superset === ex.superset) {
      const rythme = rythmeDe(ex, suivant);
      blocs.push({
        kind: 'paire',
        id: ex.superset,
        a: ex,
        b: suivant,
        rythme,
        tours: Math.max(ex.sets, suivant.sets),
        restSec: rythme === 'enchaine' ? suivant.restSec : ex.restSec,
      });
      i++; // le voisin est déjà consommé
      continue;
    }
    blocs.push({ kind: 'solo', ex });
  }
  return blocs;
}

/**
 * Le travail d'UNE série : « 8 », « 8 / côté », « 25 m ».
 *
 * L'en-tête du bloc annonce déjà le nombre de tours ; répéter « 3 × » devant
 * chacun des deux mouvements donnait « 3 tours · 3 × 8 et 3 × 8 / côté », où
 * le même 3 est écrit trois fois et où plus personne ne sait lequel compte.
 */
export function travailCourt(work: Work): string {
  return workLabel(1, work).replace(/^1 × /, '');
}

/** « Alternance » / « Superset » — le mot qui coiffe l'encadré. */
export function titreRythme(rythme: Rythme): string {
  return rythme === 'enchaine' ? 'Superset' : 'Alternance';
}

/** La phrase qui dit comment mener le bloc, sans répéter le programme. */
export function consigneRythme(p: Paire): string {
  return p.rythme === 'enchaine'
    ? `Les deux enchaînés, sans repos. Repos ${restLabel(p.restSec)} après le duo.`
    : `Une série de chaque, ${restLabel(p.restSec)} entre les stations.`;
}

/**
 * Le tour en cours : le premier dont les DEUX mouvements ne sont pas validés.
 *
 * C'est lui qu'on ouvre, et lui seul : trois tours dépliés en même temps
 * remettraient à l'écran les six champs qu'on cherchait à ranger.
 */
export function tourActif(tours: number, faits: (tour: number) => boolean): number {
  let i = 0;
  while (i < tours && faits(i)) i++;
  return i;
}

/**
 * Combien de séries de ce bloc sont validées, sur le total.
 *
 * Compte les SÉRIES et non les tours : un tour à moitié fait — l'Ab Wheel
 * validé, le Roman Side Bench pas encore — est un travail réel, et l'afficher
 * comme nul découragerait sans raison.
 */
export function avancement(
  p: Paire,
  valides: (ex: ResolvedExercise) => number,
): { faites: number; total: number } {
  return {
    faites: Math.min(valides(p.a), p.a.sets) + Math.min(valides(p.b), p.b.sets),
    total: p.a.sets + p.b.sets,
  };
}
