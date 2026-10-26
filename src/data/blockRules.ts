/**
 * §8 — Modifications par bloc, encodées comme des règles.
 *
 * Personne ne recopie une séance douze fois : l'engine part des cinq trames de
 * `baseSessions.ts` et applique les règles ci-dessous selon le bloc de la
 * semaine. Corriger le deload, c'est corriger une ligne ici, pas soixante.
 */

import {
  autoreg,
  bodyweight,
  hold,
  meters,
  noLoad,
  reps,
  rpe,
  rpeAtMost,
  rpeRange,
  type Block,
  type DayIndex,
  type LoadSpec,
  type WeekIndex,
  type RPETarget,
  type Slot,
  type Work,
} from './types';

// ---------------------------------------------------------------------------
// Formes de règles
// ---------------------------------------------------------------------------

export interface SlotPatch {
  sets?: number;
  work?: Work;
  restSec?: number;
  targetRPE?: RPETarget | null;
  /** Multiplie la charge résolue (ex. 1.1 pour « +10 % » des accessoires haut). */
  loadFactor?: number;
  /**
   * Comme `loadFactor`, mais appliqué UNE SEULE FOIS, à l'entrée du bloc.
   *
   * Pourquoi deux champs. `loadFactor` s'applique à une charge écrite dans le
   * programme : la base ne bouge pas, le facteur peut donc être réappliqué
   * chaque semaine sans dériver. Sur une charge AUTORÉGULÉE, la base est ce
   * qui a réellement été soulevé la fois d'avant — donc une charge qui
   * contient déjà le facteur. Le réappliquer chaque semaine le composerait :
   * 110 → 121 → 133 → 146 en trois semaines.
   *
   * Celui-ci ne se déclenche donc que si la charge de référence vient d'un
   * AUTRE bloc. Le passage en force max porte la hausse ; les semaines
   * suivantes, l'autorégulation et le §11 reprennent la main.
   */
  loadFactorAtBlockEntry?: number;
  load?: LoadSpec;
  note?: string;
  /** Id de l'exercice explosif intercalé entre les séries (contraste S9-11). */
  contrastWith?: string;
}

export type SlotRule =
  | { op: 'patch'; exId: string; patch: SlotPatch }
  | { op: 'remove'; exId: string }
  | { op: 'insert'; slot: Slot; after?: string; atStart?: true };

export interface BlockRuleSet {
  block: Block;
  /** Absent = s'applique à tous les jours du bloc. */
  day?: DayIndex;
  /**
   * Première semaine où ces règles s'appliquent. Absent = tout le bloc.
   *
   * Nécessaire parce qu'un bloc n'est pas une semaine : « deload » couvre la
   * semaine 4 ET la semaine 8. Les exercices de tronc introduits en semaine 5
   * doivent apparaître dans le deload de la 8 et surtout PAS dans celui de la
   * 4, qui est déjà faite et dont l'historique ne se réécrit pas.
   */
  fromWeek?: WeekIndex;
  rules: SlotRule[];
  notes?: string[];
}

const patch = (exId: string, p: SlotPatch): SlotRule => ({ op: 'patch', exId, patch: p });
const remove = (exId: string): SlotRule => ({ op: 'remove', exId });

// ---------------------------------------------------------------------------
// Deload — semaines 4 et 8 (§8)
// ---------------------------------------------------------------------------

/**
 * Ces règles s'appliquent par rôle, pas par exercice : c'est ce qui permet de
 * couvrir aussi les accessoires que le tableau ne chiffre pas (Bulgarian,
 * Hip Thrust). Base de calcul décidée avec Guillaume : 80 % de la charge
 * RÉELLE de la dernière semaine non-deload du même exercice.
 */
export const DELOAD_POLICY = {
  /** « Accessoires : 2 séries au lieu de 3-4 ». */
  accessorySets: 2,
  /** « −20 % ». */
  accessoryLoadFactor: 0.8,
  /** « Sauts : volume divisé par 2, intention maximale conservée ». */
  jumpVolumeDivisor: 2,
  /** « Zéro série au-dessus de RPE 6 ». */
  maxRPE: 6,
  /** « Aucun Nordic difficile, aucun conditioning ». */
  removeExIds: ['nordic-curl', 'conditioning', 'zone2-bike'],
  /**
   * Tronc et portés : séries de repli quand l'exercice n'est pas dans
   * `DELOAD_CORE`. Deux séries, comme les accessoires.
   */
  coreSets: 2,
  /** « Réduire les charges des carries si nécessaire » — même −20 % que les accessoires. */
  carryLoadFactor: 0.8,
  notes: [
    'Deload : 2 séries sur les accessoires à −20 %, volume de sauts divisé par 2 (intention maximale conservée), zéro série au-dessus de RPE 6.',
    'Tronc et portés allégés eux aussi : moins de séries, moins de reps, aucune série menée à l’échec.',
    'Aucun Nordic difficile, aucun conditioning.',
  ],
} as const;

/**
 * Deload du tronc et des portés, exercice par exercice.
 *
 * ── Pourquoi une table et pas une formule ──────────────────────────────────
 *
 * Le défaut corrigé ici : `role: 'core'` et `role: 'carry'` ne tombaient dans
 * aucune branche du deload. Un dimanche de semaine 4 gardait ses 3 × 8/côté de
 * chop, ses 3 × 8-12 de leg raise et ses 3 × 20 m de bear crawl — volume
 * complet, dans la semaine censée dissiper la fatigue.
 *
 * Une formule « −30 % de reps » aurait donné des chiffres impraticables
 * (8-12 reps → 6-9) pour une table qui tient en dix lignes. Les valeurs
 * ci-dessous sont celles décidées avec Guillaume, lisibles telles quelles.
 *
 * Réduction appliquée UNE SEULE FOIS : ces exercices ne passent par aucune
 * autre branche du deload, et aucune règle de bloc ne les patche en semaine
 * 4 ou 8.
 */
export const DELOAD_CORE: Readonly<Record<string, { sets: number; work: Work }>> = {
  'ab-wheel': { sets: 2, work: reps(6) },
  'pallof-press': { sets: 2, work: reps(5, true) },
  'dead-bug-cable': { sets: 2, work: reps(5, true) },
  'cable-chop': { sets: 2, work: reps(6, true) },
  'hanging-leg-raise': { sets: 2, work: reps(6) },
  'bear-crawl': { sets: 2, work: meters(15) },
  'farmer-carry': { sets: 2, work: meters(20) },
  'suitcase-carry': { sets: 2, work: meters(20, true) },
  // Introduits en semaine 5, donc concernés par le seul deload de la 8.
  'roman-side-bench': { sets: 2, work: reps(6, true) },
  'landmine-rotation': { sets: 2, work: reps(4, true) },
  'barbell-offset-hold': { sets: 2, work: hold(15, true) },
  'zercher-march': { sets: 2, work: meters(10) },
};

// ---------------------------------------------------------------------------
// Semaines 5-7 — Force maximale (§8)
// ---------------------------------------------------------------------------

/*
 * Les créneaux de tronc introduits en semaine 5.
 *
 * Écrits une fois et réutilisés par les trois blocs concernés (force max,
 * deload de la semaine 8, puissance) : trois copies finiraient par diverger,
 * et c'est exactement le genre d'écart qui ne se voit pas dans une revue.
 */
const slot = (
  exId: string,
  sets: number,
  work: Work,
  load: LoadSpec,
  restSec: number,
  note?: string,
): Slot => ({ exId, sets, work, load, targetRPE: null, restSec, ...(note ? { note } : {}) });

const romanSideBench = (sets: number, r: number) =>
  slot(
    'roman-side-bench',
    sets,
    reps(r, true),
    bodyweight(),
    45,
    'En alternance avec l’Ab Wheel : une série de chaque, 45 s entre les stations. Amplitude confortable uniquement.',
  );

const zercherMarch = (sets: number, m: number) =>
  slot(
    'zercher-march',
    sets,
    meters(m),
    autoreg(20, 2.5, 'barbell'),
    90,
    `≈ ${Math.round(m / 0.65)} pas chargés. Buste vertical, pas courts. La série s’arrête si le dos s’arrondit, pas quand la distance est faite.`,
  );

const landmineRotation = (sets: number, r: number, restSec: number, note: string) =>
  slot('landmine-rotation', sets, reps(r, true), autoreg(undefined, 2.5, 'barbell'), restSec, note);

const offsetHold = (sets: number, sec: number, restSec: number, note: string) =>
  slot('barbell-offset-hold', sets, hold(sec, true), autoreg(5, 2.5, 'barbell'), restSec, note);

const MAXFORCE: BlockRuleSet[] = [
  {
    block: 'maxforce',
    day: 0,
    notes: ['Fini le tempo 3 s : descente contrôlée ~2 s, remontée intention maximale.'],
    rules: [
      patch('box-jump', { sets: 4, work: reps(2), restSec: 120 }),
      patch('back-squat', { restSec: 240 }),
      // Même bascule que le Hip Thrust, en plus marquée : 3 × 8/jambe
      // → 4 × 5/jambe. Garder les mêmes haltères reviendrait à alléger la
      // série au moment où le bloc demande de la charger.
      patch('bulgarian-split-squat', {
        sets: 4,
        work: reps(5, true, 'jambe'),
        targetRPE: rpe(8),
        restSec: 120,
        loadFactorAtBlockEntry: 1.1,
      }),
      /*
       * Second exercice de tronc du lundi, en superset avec l'Ab Wheel.
       *
       * Le lundi est la séance la plus serrée du programme : elle dépasse
       * déjà son étiquette de 60-70 min. Enchaîner les deux exercices de
       * tronc en alternance, 45 s entre les stations, rend l'ajout presque
       * gratuit — ils ne se concurrencent pas (anti-extension d'un côté,
       * flexion latérale de l'autre) et n'utilisent pas le même matériel.
       */
      /*
       * L'alternance se fait à volume ÉGAL : 3 × 8 des deux côtés.
       *
       * Elle ne l'était pas. L'Ab Wheel héritait des 3 × 8 de la trame et le
       * Roman Side Bench entrait à 2 × 8 — deux exercices annoncés « une série
       * de chaque » dont l'un comptait une série de plus. Au bout de deux
       * tours, il n'y avait plus d'alternance : il restait une série d'Ab
       * Wheel toute seule.
       *
       * Les séries sont écrites ici en toutes lettres, même quand elles
       * répètent la trame : c'est le seul endroit où la règle d'alternance se
       * lit, et la faire dépendre d'une valeur située dans un autre fichier
       * est exactement ce qui l'a laissée se désaccorder.
       */
      patch('ab-wheel', {
        sets: 3,
        work: reps(8),
        restSec: 45,
        note: 'En alternance avec le Roman Side Bench : une série de chaque, 45 s entre les stations.',
      }),
      { op: 'insert', after: 'ab-wheel', slot: romanSideBench(3, 8) },
    ],
  },
  {
    block: 'maxforce',
    day: 2,
    rules: [
      patch('bench-press', { restSec: 210 }),
      patch('weighted-pullup', { restSec: 180 }),
      // « Accessoires haut : 3 × 6 au lieu de 3 × 8, +10 % »
      patch('landmine-press-kneeling', { sets: 3, work: reps(6, true), loadFactor: 1.1, targetRPE: rpe(8) }),
      patch('chest-supported-row', { sets: 3, work: reps(6), loadFactor: 1.1, targetRPE: rpe(8) }),
      /*
       * Barbell Offset Hold — le second point d'appui asymétrique de la
       * semaine, et le seul ajout du bloc.
       *
       * Le mercredi parce que c'est le seul jour sans lift principal du bas
       * du corps : rien en amont ne fatigue le tronc, rien en aval n'en
       * souffre. Et parce que la fréquence est tout l'objet de l'ajout — le
       * placer le samedi à côté du Suitcase Carry donnerait deux jours collés
       * puis cinq jours vides.
       *
       * Pas le lundi : c'est la séance où l'adducteur travaille le plus
       * (squat + Bulgarian), et on n'y ajoute rien tant que les symptômes
       * durent.
       *
       * Juste après le Pallof Press : les deux forment un bloc tronc debout
       * de six minutes, anti-rotation puis anti-flexion latérale.
       */
      {
        op: 'insert',
        after: 'pallof-press',
        slot: offsetHold(
          3,
          25,
          60,
          'Charge = le disque d’un seul côté. Zéro inclinaison : la série s’arrête quand l’épaule descend.',
        ),
      },
    ],
  },
  {
    block: 'maxforce',
    day: 4,
    rules: [
      // « Hang High Pull 4 × 3, repos 2 min » (§8).
      patch('hang-high-pull', { sets: 4, restSec: 120 }),
      patch('push-press', { restSec: 150 }),
      patch('speed-squat', { restSec: 75 }),
      /*
       * La Landmine Rotation quitte le dimanche pour le vendredi.
       *
       * C'est la seule qualité de tronc qui s'exprime en vitesse : sa place
       * est dans la séance de puissance, pas en fin de séance modérée.
       *
       * Après le Lateral Bound et avant le Push Press : le tronc est encore
       * frais, et tout ce qui le fatigue vraiment vient ensuite. Le Hang High
       * Pull garde sa deuxième place — c'est lui qui demande le plus de
       * fraîcheur nerveuse du bloc.
       *
       * Le Farmer Carry sort : son créneau finance presque exactement celui
       * de la rotation, la séance ne s'allonge pas.
       */
      remove('farmer-carry'),
      {
        op: 'insert',
        after: 'lateral-bound',
        slot: landmineRotation(
          3,
          5,
          75,
          'Apprentissage puis accélération contrôlée. Pieds qui pivotent, rotation initiée par les hanches, retour maîtrisé.',
        ),
      },
    ],
  },
  {
    block: 'maxforce',
    day: 5,
    rules: [
      patch('deadlift', { restSec: 240 }),
      patch('front-squat', { restSec: 150 }),
      /*
       * Hip Thrust — le trou que Guillaume a trouvé en comptant son tonnage.
       *
       * §8 fait passer l'exercice de 4 × 8 à 4 × 6 avec deux minutes de repos
       * au lieu d'une et demie, mais ne dit rien de la charge. Résultat : le
       * même poids, moins de reps, plus de repos — c'est-à-dire moins de
       * travail à intensité égale. Un bloc de force fait l'inverse.
       *
       * Le +10 % n'est pas inventé ici : c'est le chiffre que §8 applique
       * déjà aux accessoires du HAUT pour exactement la même bascule, 3 × 8
       * → 3 × 6. Les deux seuls accessoires autorégulés du bas du corps —
       * Hip Thrust et Bulgarian — étaient les seuls à ne pas l'avoir.
       *
       * 4 × 8 × 110 = 3 520 kg en 1 min 30 de repos
       *   → 4 × 6 × 120 = 2 880 kg en 2 min : −18 % de volume, +9 % de charge.
       * C'est ça, un bloc de force.
       */
      patch('hip-thrust', {
        sets: 4,
        work: reps(6),
        targetRPE: rpe(8),
        restSec: 120,
        loadFactorAtBlockEntry: 1.1,
      }),
      patch('nordic-curl', { sets: 3, work: reps({ min: 4, max: 5 }) }),
      /*
       * Le Suitcase Carry sort, le Zercher March prend sa place, et le Roman
       * Side Bench ferme la séance.
       *
       * Le samedi porte déjà le deadlift, le front squat et le hip thrust :
       * les deux ajouts sont volontairement courts et légers. Le Zercher
       * March démarre barre nue — sa progression se fait en distance avant de
       * se faire en charge.
       */
      remove('suitcase-carry'),
      /*
       * Le Single-Leg RDL sort du samedi — pour le bloc force max, et pour
       * lui seul.
       *
       * Une RÈGLE DE BLOC, pas une exception sur trois numéros de semaine :
       * ce qui motive le retrait est ce que le bloc fait au samedi, pas le
       * fait qu'on soit en semaine 5, 6 ou 7. Le samedi de force max porte le
       * deadlift à 4 min de repos, le front squat, et un Hip Thrust à +10 % —
       * trois mouvements de chaîne postérieure lourds, suivis du Zercher
       * March et du Roman Side Bench. Le Single-Leg RDL à 3 × 8/côté y est
       * la septième station et la moins décisive : son intention, le hinge
       * unilatéral lent, est déjà payée six fois dans la séance.
       *
       * Écrit en règle, il revient tout seul partout ailleurs : semaines 1 à
       * 4, et semaines 9 à 12. Aucune liste de semaines à maintenir, et
       * aucun risque qu'il disparaisse d'un bloc où personne ne l'a retiré.
       */
      remove('single-leg-rdl'),
      { op: 'insert', slot: zercherMarch(2, 12) },
      { op: 'insert', slot: romanSideBench(3, 8) },
    ],
  },
  {
    block: 'maxforce',
    day: 6,
    notes: [
      'Dimanche : tout à 3 séries.',
      'Le tronc du dimanche tient en deux exercices : Hanging Leg Raise puis Woodchop. Le Bear Crawl sort, la Landmine Rotation est passée au vendredi.',
    ],
    rules: [
      /*
       * Le Bear Crawl sort, le Woodchop reste et devient le second exercice
       * de tronc du dimanche.
       *
       * Le Woodchop EST l'ancien Cable Chop : même identifiant, donc même
       * historique. Lui créer une fiche séparée aurait fabriqué le doublon
       * qu'il fallait éviter.
       */
      remove('bear-crawl'),
      patch('cable-chop', {
        sets: 2,
        work: reps(6, true),
        restSec: 60,
        note: 'Rotation coordonnée hanches-tronc, retour maîtrisé. Jamais une torsion lombaire forcée.',
      }),
      // « Dimanche : tout à 3 séries, conditioning 6 × 20 s / 100 s »
      patch('incline-db-press', { sets: 3 }),
      patch('neutral-grip-pullup', { sets: 3, work: reps(6) }),
      patch('one-arm-cable-row', { sets: 3, work: reps(8, true) }),
      patch('landmine-press-standing', { sets: 3, work: reps(6, true) }),
      patch('hanging-leg-raise', { sets: 3, work: reps(8) }),
      patch('conditioning', {
        work: { kind: 'intervals', rounds: 6, workSec: 20, easySec: 100 },
        note: 'Et pas davantage.',
      }),
    ],
  },
];

// ---------------------------------------------------------------------------
// Semaines 9-11 — Conversion force → puissance, contraste (§8)
// ---------------------------------------------------------------------------

/**
 * « Série lourde → repos → mouvement explosif → repos → série lourde suivante.
 * C'est du contraste, pas un superset. » Repos de §10.
 */
export interface ContrastSpec {
  heavy: string;
  explosive: string;
  explosiveReps: number;
  /** Lourd → explosif. */
  restAfterHeavySec: number;
  /** Explosif → lourd suivant. */
  restAfterExplosiveSec: number;
  cycleLabel: string;
}

export const CONTRAST_BY_DAY: Partial<Record<DayIndex, ContrastSpec>> = {
  0: {
    heavy: 'back-squat',
    explosive: 'box-jump',
    explosiveReps: 2,
    restAfterHeavySec: 120,
    restAfterExplosiveSec: 120,
    cycleLabel: 'Cycle ≈ 4 min',
  },
  2: {
    heavy: 'bench-press',
    explosive: 'plyo-push-up',
    explosiveReps: 3,
    restAfterHeavySec: 90,
    restAfterExplosiveSec: 120,
    cycleLabel: 'Cycle ≈ 3 min 30',
  },
  5: {
    heavy: 'deadlift',
    explosive: 'broad-jump',
    explosiveReps: 2,
    restAfterHeavySec: 120,
    restAfterExplosiveSec: 120,
    cycleLabel: 'Cycle ≈ 4 min',
  },
};

const POWER: BlockRuleSet[] = [
  {
    block: 'power',
    day: 0,
    notes: ['Pogos et box jumps de début de séance supprimés : ils passent dans le contraste.'],
    rules: [
      remove('pogo-jumps'),
      remove('box-jump'),
      patch('back-squat', { contrastWith: 'box-jump' }),
      patch('bulgarian-split-squat', { sets: 3, work: reps(5, true, 'jambe'), targetRPE: rpe(7.5) }),
      // Même alternance qu'en force max, et même volume des deux côtés.
      patch('ab-wheel', {
        sets: 3,
        work: reps(8),
        restSec: 45,
        note: 'En alternance avec le Roman Side Bench : une série de chaque, 45 s entre les stations.',
      }),
      { op: 'insert', after: 'ab-wheel', slot: romanSideBench(3, 8) },
    ],
  },
  {
    block: 'power',
    day: 2,
    rules: [
      remove('plyo-push-up'),
      patch('bench-press', { contrastWith: 'plyo-push-up' }),
      patch('weighted-pullup', { restSec: 180, note: 'Intention explosive.' }),
      patch('landmine-press-kneeling', { sets: 4, work: reps(5, true), targetRPE: rpe(6), note: 'Explosif.' }),
      patch('chest-supported-row', { sets: 3, work: reps(6) }),
      patch('pallof-press', { sets: 3, work: reps(5, true) }),
      // Volume réduit comme tout le reste du bloc : la tenue reste, elle ne
      // coûte rien à la fraîcheur et c'est la seule anti-flexion latérale de
      // la semaine en dehors du samedi.
      { op: 'insert', after: 'pallof-press', slot: offsetHold(2, 20, 45, 'Charge = le disque d’un seul côté.') },
    ],
  },
  {
    block: 'power',
    day: 4,
    notes: [
      'Pas de conditioning. Tu quittes la salle stimulé, pas détruit.',
      'Le Dead Bug reste, en volume réduit : c’est le second exercice de tronc du vendredi depuis que la Landmine Rotation y est passée.',
    ],
    rules: [
      {
        /*
         * Les pogos passent derrière le Hang High Pull, pas devant : c'est lui
         * qui demande le plus de fraîcheur nerveuse du bloc, et trente contacts
         * de pogo juste avant iraient contre sa seule raison d'être.
         */
        op: 'insert',
        after: 'hang-high-pull',
        slot: {
          exId: 'pogo-jumps',
          sets: 3,
          work: reps(10),
          load: noLoad(),
          targetRPE: null,
          restSec: 45,
        },
      },
      patch('lateral-bound', { sets: 4, work: reps(2, true), restSec: 90 }),
      /*
       * Le schéma ne bouge pas de force max à puissance : 4 × 3. Ce qui change
       * est ce qu'on cherche — la vitesse de barre, pas le kilo de plus. Sans
       * RPE cible, §11 se contente de reporter le décalage réel.
       */
      patch('hang-high-pull', {
        sets: 4,
        restSec: 120,
        note: 'Vitesse de barre : la charge ne monte que si les reps restent vives.',
      }),
      patch('speed-squat', { restSec: 90 }),
      patch('jump-squat-db', { sets: 5, work: reps(3), restSec: 120 }),
      remove('farmer-carry'),
      remove('explosive-cable-row'),
      /*
       * Le Dead Bug ne disparaît plus du bloc puissance.
       *
       * §8 le supprimait quand le vendredi n'avait qu'un exercice de tronc
       * et que la priorité était de raccourcir la séance. Depuis que la
       * Landmine Rotation y vit, le supprimer laisserait le vendredi à un
       * seul exercice de tronc. Il reste, en 2 × 5/côté — le Farmer Carry
       * sorti libère largement de quoi le financer.
       */
      patch('dead-bug-cable', { sets: 2, work: reps(5, true) }),
      {
        op: 'insert',
        after: 'lateral-bound',
        slot: landmineRotation(
          3,
          4,
          90,
          'Rotation explosive. Reset 5-10 s entre les reps. La vitesse prime sur la charge : si elle baisse, la charge ne monte pas.',
        ),
      },
    ],
  },
  {
    block: 'power',
    day: 5,
    rules: [
      remove('broad-jump'),
      patch('deadlift', { contrastWith: 'broad-jump' }),
      patch('hip-thrust', { sets: 4, work: reps(5), targetRPE: rpeRange(7, 8), note: 'Explosif.' }),
      patch('nordic-curl', { sets: 2, work: reps(4) }),
      patch('copenhagen-plank', { sets: 3, work: reps(5, true) }),
      remove('suitcase-carry'),
      { op: 'insert', slot: zercherMarch(2, 12) },
      { op: 'insert', slot: romanSideBench(3, 8) },
    ],
  },
  {
    block: 'power',
    day: 6,
    notes: [
      'Tronc du dimanche : Hanging Leg Raise puis Woodchop. La Landmine Rotation est au vendredi, avec les autres mouvements de vitesse.',
    ],
    rules: [
      remove('bear-crawl'),
      patch('cable-chop', {
        sets: 2,
        work: reps(6, true),
        restSec: 60,
        note: 'Rotation coordonnée hanches-tronc, retour maîtrisé.',
      }),
      patch('incline-db-press', { sets: 3, work: reps({ min: 6, max: 8 }) }),
      patch('neutral-grip-pullup', { sets: 3, work: reps({ min: 5, max: 6 }) }),
      patch('one-arm-cable-row', { sets: 3, work: reps(8, true) }),
      patch('landmine-press-standing', { sets: 2, work: reps(8, true) }),
      patch('hanging-leg-raise', { sets: 3, work: reps(8) }),
      remove('conditioning'),
      {
        op: 'insert',
        slot: {
          exId: 'zone2-bike',
          sets: 1,
          work: { kind: 'time', seconds: 900 },
          load: noLoad(),
          targetRPE: rpeAtMost(4),
          restSec: 0,
          note: 'Facultatif : 10-15 min, rien de plus.',
        },
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Semaine 8 — le deload qui vient APRÈS l'introduction du nouveau tronc
// ---------------------------------------------------------------------------

/*
 * `fromWeek: 5` fait tout le travail ici.
 *
 * Les semaines 4 et 8 sont le même bloc. Sans discriminant, ces règles
 * toucheraient aussi la semaine 4 — déjà faite, et dont l'historique ne se
 * réécrit pas. Avec, elles ne concernent que la semaine 8.
 *
 * Les volumes ne sont pas écrits ici : `DELOAD_CORE` les réduit comme pour
 * tous les autres exercices de tronc. Ces règles disent seulement QUELS
 * exercices sont au programme cette semaine-là.
 *
 * Samedi et dimanche de la semaine 8 sont des séances de combine écrites en
 * toutes lettres : aucune règle de bloc ne s'y applique, d'où leur absence.
 */
const DELOAD_S8: BlockRuleSet[] = [
  {
    block: 'deload',
    day: 0,
    fromWeek: 5,
    /*
     * Les séries écrites ici ne décident de rien : la semaine 8 est un deload,
     * donc `DELOAD_CORE` ramène l'Ab Wheel à 2 × 6 et le Roman Side Bench à
     * 2 × 6/côté, après cette règle. C'est voulu — la règle du deload du
     * programme passe avant le volume de bloc, et les 3 × 8 des semaines
     * normales ne doivent pas s'y glisser.
     */
    rules: [{ op: 'insert', after: 'ab-wheel', slot: romanSideBench(2, 8) }],
  },
  {
    block: 'deload',
    day: 2,
    fromWeek: 5,
    rules: [
      {
        op: 'insert',
        after: 'pallof-press',
        slot: offsetHold(3, 25, 60, 'Charge = le disque d’un seul côté.'),
      },
    ],
  },
  {
    block: 'deload',
    day: 4,
    fromWeek: 5,
    rules: [
      remove('farmer-carry'),
      {
        op: 'insert',
        after: 'lateral-bound',
        slot: landmineRotation(3, 5, 75, 'Deload : charge allégée, vitesse conservée.'),
      },
    ],
  },
];

export const BLOCK_RULES: BlockRuleSet[] = [...MAXFORCE, ...POWER, ...DELOAD_S8];

const sApplique = (r: BlockRuleSet, block: Block, day: DayIndex, week: WeekIndex): boolean =>
  r.block === block &&
  (r.day === undefined || r.day === day) &&
  (r.fromWeek === undefined || week >= r.fromWeek);

/** Règles applicables à une séance donnée. */
export function rulesFor(block: Block, day: DayIndex, week: WeekIndex): SlotRule[] {
  return BLOCK_RULES.filter((r) => sApplique(r, block, day, week)).flatMap((r) => r.rules);
}

/** Notes de bloc à afficher en tête de séance. */
export function blockNotesFor(block: Block, day: DayIndex, week: WeekIndex): string[] {
  return BLOCK_RULES.filter((r) => sApplique(r, block, day, week)).flatMap((r) => r.notes ?? []);
}
