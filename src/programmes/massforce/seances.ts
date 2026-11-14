/**
 * MASS FORCE — les quatre séances de la semaine type, transcrites de
 * `programme-mass-force.md` (§1 et §3). Un test les relit case par case.
 *
 * Aucune charge n'est écrite ici : les lignes « À définir » attendent une
 * fourchette %1RM validée, les autres sont libres.
 */
import type { LigneForce, SeanceForce } from './types';

const C = {
  bench: {
    consigneCle: 'Développé couché',
    consigne: 'Exécution contrôlée, amplitude reproductible.',
    vigilance:
      'Ne pas transférer les charges entre barre et Smith. Prévoir des sécurités adaptées.',
  },
  incline: {
    consigneCle: 'Développé incliné haltères',
    consigne: 'Amplitude contrôlée, trajectoire stable.',
    vigilance: 'Éviter de sacrifier le contrôle pour augmenter les charges.',
  },
  ecarte: {
    consigneCle: 'Écarté couché',
    consigne: 'Mouvement contrôlé.',
    vigilance: 'Ne pas rechercher une amplitude excessive sous charge.',
  },
  front: {
    consigneCle: 'Barre au front',
    consigne: 'RPE 8.',
    vigilance: 'Surveiller la tolérance des coudes.',
  },
  extension: {
    consigneCle: 'Extension triceps allongé',
    consigne: 'Mouvement contrôlé.',
    vigilance: 'Attention à la fatigue des coudes après la barre au front.',
  },
  tirage: {
    consigneCle: 'Tirage vertical',
    consigne: 'Amplitude reproductible, sans élan excessif.',
    vigilance:
      'Une charge élevée ne doit pas transformer le mouvement en tirage avec tout le corps.',
  },
  rowing: {
    consigneCle: 'Rowing / tirage horizontal',
    consigne: 'RPE 8. Prise large en pronation pour le tirage horizontal.',
    vigilance: 'Le rowing penché demande davantage de stabilisation du tronc.',
  },
  supination: {
    consigneCle: 'Tirage vertical supination',
    consigne: 'Contraction maintenue 1 seconde. La qualité prime sur la charge.',
    vigilance: 'Ne pas augmenter la charge au détriment de la contraction recherchée.',
  },
  pullover: {
    consigneCle: 'Pull-over poulie haute',
    consigne: 'Contrôle du mouvement.',
    vigilance: 'Éviter les compensations du tronc.',
  },
  curlW: {
    consigneCle: 'Curl barre W',
    consigne: 'RPE 8, excentrique 2 secondes, contrôle total.',
    vigilance: 'Ne pas accélérer la descente sous l’effet de la fatigue.',
  },
  curlH: {
    consigneCle: 'Curl haltères',
    consigne: 'Intention de vitesse maximale, mouvement complet, prise au choix.',
    vigilance: 'Intention rapide ne signifie pas mouvement désordonné.',
  },
  squat: {
    consigneCle: 'Squat',
    consigne: '4×6 avec intention de force, pas une série facile.',
    vigilance:
      'Amplitude adaptée et reproductible, sécurités réglées. Le tempo excentrique reste à confirmer.',
  },
  legExt: {
    consigneCle: 'Leg extension',
    consigne: 'Excentrique 3 secondes, pic de contraction.',
    vigilance: 'Éviter les mouvements brusques.',
  },
  legCurl: {
    consigneCle: 'Leg curl',
    consigne: 'Excentrique 3 secondes, pic de contraction.',
    vigilance: 'Maintenir une position stable.',
  },
  fentes: {
    consigneCle: 'Fentes',
    consigne: 'Avant, arrière ou bulgares au choix.',
    vigilance: '12 répétitions par jambe.',
  },
  pushPress: {
    consigneCle: 'Push press',
    consigne: '4×4, Smith ou barre selon le choix de l’utilisateur.',
    vigilance: 'Exercice technique : nécessité d’une fiche claire et d’une variante adaptée.',
  },
  frontales: {
    consigneCle: 'Élévations frontales',
    consigne: '3×10.',
    vigilance: 'Éviter l’élan excessif.',
  },
  laterales: {
    consigneCle: 'Élévations latérales',
    consigne: '4×12.',
    vigilance: 'Éviter les compensations du tronc.',
  },
  oiseau: {
    consigneCle: 'Oiseau / pec fly inversée',
    consigne: 'Pic de contraction.',
    vigilance: 'Conserver une amplitude maîtrisée.',
  },
} as const;

const LUNDI: readonly LigneForce[] = [
  {
    cle: 'lun-developpe',
    options: [
      {
        id: 'mf-developpe-couche-barre',
        nom: 'Développé couché — barre libre',
        test: { exercice: 'developpe-couche', variante: 'barre' },
      },
      {
        id: 'mf-developpe-couche-smith',
        nom: 'Développé couché — Smith',
        test: { exercice: 'developpe-couche', variante: 'smith' },
      },
    ],
    libelle: 'Développé couché',
    materiel: 'Barre libre / Smith',
    testLibelle: 'Bench',
    series: 4,
    reps: '5',
    charge: 'a-definir',
    progression: 'pourcentage',
    reposSec: 240,
    ...C.bench,
  },
  {
    cle: 'lun-incline',
    options: [{ id: 'mf-developpe-incline-halteres', nom: 'Développé incliné haltères' }],
    libelle: 'Développé incliné haltères',
    materiel: 'Haltères',
    testLibelle: 'Aucun',
    series: 4,
    reps: '8',
    charge: 'libre',
    progression: 'plage',
    reposSec: 150,
    ...C.incline,
  },
  {
    cle: 'lun-ecarte',
    options: [{ id: 'mf-ecarte-couche', nom: 'Écarté couché' }],
    libelle: 'Écarté couché',
    materiel: 'Haltères',
    testLibelle: 'Aucun',
    series: 3,
    reps: '10',
    charge: 'libre',
    progression: 'plage',
    reposSec: 90,
    ...C.ecarte,
  },
  {
    cle: 'lun-front',
    options: [{ id: 'mf-barre-au-front', nom: 'Barre au front' }],
    libelle: 'Barre au front',
    materiel: 'Barre EZ / W',
    testLibelle: 'Aucun',
    series: 4,
    reps: '8',
    charge: 'libre',
    progression: 'fixe',
    reposSec: 120,
    ...C.front,
  },
  {
    cle: 'lun-extension',
    options: [{ id: 'mf-extension-triceps-allonge', nom: 'Extension triceps allongé' }],
    libelle: 'Extension triceps allongé',
    materiel: 'Haltères',
    testLibelle: 'Aucun',
    series: 3,
    reps: '10',
    charge: 'libre',
    progression: 'plage',
    reposSec: 90,
    ...C.extension,
  },
];

const MARDI: readonly LigneForce[] = [
  {
    cle: 'mar-tirage',
    options: [
      {
        id: 'mf-tirage-vertical-poulie',
        nom: 'Tirage vertical — poulie',
        test: { exercice: 'tirage-vertical', variante: 'poulie' },
      },
      {
        id: 'mf-tirage-vertical-machine',
        nom: 'Tirage vertical — machine guidée',
        test: { exercice: 'tirage-vertical', variante: 'machine' },
      },
    ],
    libelle: 'Tirage vertical',
    materiel: 'Poulie / Machine guidée',
    testLibelle: 'Tirage vertical',
    series: 4,
    reps: '5',
    charge: 'a-definir',
    progression: 'pourcentage',
    reposSec: 240,
    ...C.tirage,
  },
  {
    cle: 'mar-rowing',
    options: [
      { id: 'mf-rowing-buste-penche', nom: 'Rowing buste penché — barre' },
      { id: 'mf-tirage-horizontal-large', nom: 'Tirage horizontal large — poulie' },
    ],
    libelle: 'Rowing buste penché / Tirage horizontal large',
    materiel: 'Barre / Poulie',
    testLibelle: 'Aucun',
    series: 4,
    reps: '8',
    charge: 'libre',
    progression: 'fixe',
    reposSec: 150,
    ...C.rowing,
  },
  {
    /* Exercice DISTINCT du tirage vertical, sans lien avec le combiné
       (décision de Guillaume) : aucun `test`. */
    cle: 'mar-supination',
    options: [
      { id: 'mf-tirage-supination-poulie', nom: 'Tirage vertical supination — poulie' },
      { id: 'mf-tirage-supination-machine', nom: 'Tirage vertical supination — machine guidée' },
    ],
    libelle: 'Tirage vertical supination',
    materiel: 'Poulie / Machine guidée',
    testLibelle: 'Aucun',
    series: 3,
    reps: '10',
    charge: 'libre',
    progression: 'plage',
    reposSec: 120,
    ...C.supination,
  },
  {
    cle: 'mar-pullover',
    options: [{ id: 'mf-pull-over-poulie', nom: 'Pull-over poulie haute' }],
    libelle: 'Pull-over poulie haute',
    materiel: 'Poulie',
    testLibelle: 'Aucun',
    series: 3,
    reps: '15',
    charge: 'libre',
    progression: 'plage',
    reposSec: 90,
    ...C.pullover,
  },
  {
    /* Superset biceps, §2 : 15 s de transition après le curl W, 120 s de
       repos après le curl haltères. */
    cle: 'mar-curl-w',
    options: [{ id: 'mf-curl-barre-w', nom: 'Curl barre W' }],
    libelle: 'Curl barre W',
    materiel: 'Barre W',
    testLibelle: 'Aucun',
    series: 4,
    reps: '8',
    charge: 'libre',
    progression: 'fixe',
    reposSec: 15,
    superset: 'mar-biceps',
    ...C.curlW,
  },
  {
    cle: 'mar-curl-halteres',
    options: [{ id: 'mf-curl-halteres', nom: 'Curl haltères' }],
    libelle: 'Curl haltères',
    materiel: 'Haltères',
    testLibelle: 'Aucun',
    series: 4,
    reps: '12',
    charge: 'libre',
    progression: 'fixe',
    reposSec: 120,
    superset: 'mar-biceps',
    ...C.curlH,
  },
];

const JEUDI: readonly LigneForce[] = [
  {
    cle: 'jeu-squat',
    options: [
      {
        id: 'mf-squat-barre',
        nom: 'Squat — barre libre',
        test: { exercice: 'squat', variante: 'barre' },
      },
      {
        id: 'mf-squat-smith',
        nom: 'Squat — Smith',
        test: { exercice: 'squat', variante: 'smith' },
      },
    ],
    libelle: 'Squat',
    materiel: 'Barre libre / Smith',
    testLibelle: 'Squat',
    series: 4,
    reps: '6',
    charge: 'a-definir',
    progression: 'pourcentage',
    reposSec: 180,
    ...C.squat,
  },
  {
    cle: 'jeu-leg-extension',
    options: [{ id: 'mf-leg-extension', nom: 'Leg extension' }],
    libelle: 'Leg extension',
    materiel: 'Machine',
    testLibelle: 'Aucun',
    series: 3,
    reps: '8',
    charge: 'libre',
    progression: 'plage',
    reposSec: 120,
    ...C.legExt,
  },
  {
    cle: 'jeu-leg-curl',
    options: [{ id: 'mf-leg-curl', nom: 'Leg curl' }],
    libelle: 'Leg curl',
    materiel: 'Machine',
    testLibelle: 'Aucun',
    series: 3,
    reps: '8',
    charge: 'libre',
    progression: 'plage',
    reposSec: 120,
    ...C.legCurl,
  },
  {
    cle: 'jeu-fentes',
    options: [
      { id: 'mf-fentes-avant', nom: 'Fentes avant' },
      { id: 'mf-fentes-arriere', nom: 'Fentes arrière' },
      { id: 'mf-fentes-bulgares', nom: 'Fentes bulgares' },
    ],
    libelle: 'Fentes avant / arrière / bulgares',
    materiel: 'À préciser',
    testLibelle: 'Aucun',
    series: 3,
    reps: '12 / jambe',
    charge: 'libre',
    progression: 'plage',
    reposSec: 120,
    ...C.fentes,
  },
];

const VENDREDI: readonly LigneForce[] = [
  {
    cle: 'ven-push-press',
    options: [
      {
        id: 'mf-push-press-smith',
        nom: 'Push press — Smith',
        test: { exercice: 'push-press', variante: 'smith' },
      },
      {
        id: 'mf-push-press-barre',
        nom: 'Push press — barre libre',
        test: { exercice: 'push-press', variante: 'barre' },
      },
    ],
    libelle: 'Push press',
    materiel: 'Smith / Barre libre',
    testLibelle: 'Push press',
    series: 4,
    reps: '4',
    charge: 'a-definir',
    progression: 'push-press',
    reposSec: 240,
    ...C.pushPress,
  },
  {
    cle: 'ven-frontales',
    options: [{ id: 'mf-elevations-frontales', nom: 'Élévations frontales' }],
    libelle: 'Élévations frontales',
    materiel: 'À préciser',
    testLibelle: 'Aucun',
    series: 3,
    reps: '10',
    charge: 'libre',
    progression: 'plage',
    reposSec: 120,
    ...C.frontales,
  },
  {
    cle: 'ven-laterales',
    options: [{ id: 'mf-elevations-laterales', nom: 'Élévations latérales' }],
    libelle: 'Élévations latérales',
    materiel: 'À préciser',
    testLibelle: 'Aucun',
    series: 4,
    reps: '12',
    charge: 'libre',
    progression: 'plage',
    reposSec: 120,
    ...C.laterales,
  },
  {
    cle: 'ven-oiseau',
    options: [
      { id: 'mf-oiseau-penche', nom: 'Oiseau penché — haltères' },
      { id: 'mf-pec-fly-inverse', nom: 'Pec fly inversée — machine' },
    ],
    libelle: 'Oiseau penché / Pec fly inversée',
    materiel: 'Haltères / Machine',
    testLibelle: 'Aucun',
    series: 3,
    reps: '15',
    charge: 'libre',
    progression: 'plage',
    reposSec: 60,
    ...C.oiseau,
  },
];

export const SEANCES_FORCE: readonly SeanceForce[] = [
  { jour: 0, titre: 'Pecs / Triceps', lignes: LUNDI },
  { jour: 1, titre: 'Dos / Biceps', lignes: MARDI },
  { jour: 3, titre: 'Jambes', lignes: JEUDI },
  { jour: 4, titre: 'Épaules', lignes: VENDREDI },
];

export function seanceForce(jour: number): SeanceForce | null {
  return SEANCES_FORCE.find((s) => s.jour === jour) ?? null;
}
