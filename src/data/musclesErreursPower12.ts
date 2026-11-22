/**
 * Muscles sollicités et erreurs à éviter, pour chaque planche de POWER 12.
 *
 * ── D'où vient ce texte ───────────────────────────────────────────────────
 *
 * Transcrit tel quel du tableau « MAJK — Fiches techniques POWER 12 »
 * (révision 5, 21 novembre 2026), où chaque ligne porte le statut « Validé »
 * par Guillaume. Le tableau fait foi : une correction se fait là-bas, puis
 * ici. Seule mise en forme : chaque muscle commence par une capitale, pour
 * s'afficher en pastille.
 *
 * ── Les règles ────────────────────────────────────────────────────────────
 *
 * - Une entrée par planche (`FICHES_POWER12`) : 36 mouvements de séance et
 *   2 tests du combiné qui ont leur propre planche. Les autres tests
 *   empruntent le mouvement dont ils prennent la planche
 *   (`MOUVEMENT_DU_TEST`) : un « Back Squat 1RM » est un back squat.
 * - Trois erreurs au plus, une par ligne du tableau.
 * - Rien n'est inventé : un mouvement absent n'affiche aucune section
 *   (règle 6 du mode d'emploi du tableau).
 *
 * `musclesErreursPower12.test.tsx` vérifie qu'aucune planche n'en manque et
 * qu'aucune entrée ne vise un mouvement sans planche.
 */

import { MOUVEMENT_DU_TEST } from './fichesPower12';
import type { InfosFiche } from './types';

export const MUSCLES_ERREURS_POWER12: Readonly<Record<string, InfosFiche>> = {
  'back-squat': {
    principaux: ['Quadriceps', 'Grands fessiers'],
    secondaires: ['Adducteurs', 'Ischio-jambiers', 'Érecteurs du rachis', 'Sangle abdominale'],
    erreurs: [
      'Genoux qui rentrent à la remontée',
      'Talons qui décollent ou poids qui part sur l’avant du pied',
      'Dos qui s’arrondit en bas (bascule du bassin)',
    ],
  },
  'pogo-jumps': {
    principaux: ['Triceps suraux (mollets)', 'Tendon d’Achille'],
    secondaires: ['Quadriceps', 'Muscles du pied et de la cheville'],
    erreurs: [
      'Genoux trop fléchis : le saut vient des cuisses, pas des chevilles',
      'Contacts au sol longs ou talons qui touchent',
      'Continuer quand les rebonds deviennent lourds',
    ],
  },
  'box-jump': {
    principaux: ['Quadriceps', 'Grands fessiers'],
    secondaires: ['Ischio-jambiers', 'Mollets', 'Sangle abdominale'],
    erreurs: [
      'Box trop haute : réception en squat profond',
      'Genoux qui rentrent à la réception',
      'Redescendre en sautant de la box au lieu de descendre à pied',
    ],
  },
  'bulgarian-split-squat': {
    principaux: ['Quadriceps', 'Grand fessier (jambe avant)'],
    secondaires: [
      'Adducteurs',
      'Moyen fessier',
      'Ischio-jambiers',
      'Fléchisseurs de hanche de la jambe arrière (étirement)',
    ],
    erreurs: [
      'Genou avant qui part vers l’intérieur',
      'Pousser avec la jambe arrière au lieu de la jambe avant',
      'Pied avant trop près du banc : talon qui décolle',
    ],
  },
  rdl: {
    principaux: ['Ischio-jambiers', 'Grands fessiers'],
    secondaires: ['Érecteurs du rachis', 'Grand dorsal (barre proche)', 'Avant-bras'],
    erreurs: [
      'Dos qui s’arrondit pour descendre plus bas',
      'Barre qui s’éloigne des cuisses',
      'Genoux qui plient trop : le mouvement devient un squat',
    ],
  },
  'ab-wheel': {
    principaux: ['Grand droit de l’abdomen', 'Transverse'],
    secondaires: ['Obliques', 'Grand dorsal', 'Dentelés', 'Triceps'],
    erreurs: [
      'Bas du dos qui se creuse en extension',
      'Amplitude plus grande que ce que tu contrôles au retour',
      'Tirer avec les bras au lieu de ramener avec les abdominaux',
    ],
  },
  'roman-side-bench': {
    principaux: ['Carré des lombes', 'Obliques interne et externe'],
    secondaires: ['Moyen fessier du côté haut'],
    erreurs: [
      'Rotation du bassin pendant le mouvement',
      'Rebond ou élan en bas',
      'Remonter au-delà de l’alignement du corps',
    ],
  },
  'plyo-push-up': {
    principaux: ['Grands pectoraux', 'Triceps'],
    secondaires: ['Deltoïdes antérieurs', 'Dentelés', 'Sangle abdominale'],
    erreurs: [
      'Bassin qui s’affaisse ou fesses qui montent',
      'Réception bras tendus, coudes verrouillés',
      'Continuer quand les mains décollent moins haut',
    ],
  },
  'bench-press': {
    principaux: ['Grands pectoraux', 'Triceps'],
    secondaires: ['Deltoïdes antérieurs', 'Grand dorsal (stabilisation)'],
    erreurs: [
      'Rebond de la barre sur le torse au lieu d’une vraie pause',
      'Fesses qui décollent du banc',
      'Coudes trop ouverts à 90° (épaules exposées)',
    ],
  },
  'weighted-pullup': {
    principaux: ['Grand dorsal', 'Biceps'],
    secondaires: ['Rhomboïdes', 'Trapèzes moyens et inférieurs', 'Brachial', 'Avant-bras'],
    erreurs: [
      'Kipping ou élan des jambes',
      'Ne pas repartir bras tendus (dead hang incomplet)',
      'Menton qui pique vers la barre au lieu de la poitrine',
    ],
  },
  'landmine-press-kneeling': {
    principaux: ['Deltoïde antérieur', 'Triceps'],
    secondaires: [
      'Grand pectoral (faisceau haut)',
      'Dentelé antérieur',
      'Sangle abdominale',
      'Fessiers',
    ],
    erreurs: [
      'Cambrer le bas du dos pour pousser',
      'Hanches qui tournent ou genou qui bouge',
      'Pousser uniquement avec le bras, sans transfert du tronc',
    ],
  },
  'chest-supported-row': {
    principaux: ['Grand dorsal', 'Rhomboïdes', 'Trapèzes moyens'],
    secondaires: ['Deltoïdes postérieurs', 'Biceps'],
    erreurs: [
      'Décoller la poitrine du banc pour tricher',
      'Tirer avec les biceps, épaules qui montent',
      'Pas de pause en contraction',
    ],
  },
  'face-pull': {
    principaux: ['Deltoïdes postérieurs', 'Rotateurs externes (infra-épineux, petit rond)'],
    secondaires: ['Trapèzes moyens et inférieurs', 'Rhomboïdes'],
    erreurs: [
      'Charge trop lourde : le buste part en arrière',
      'Tirer vers le menton au lieu du visage, coudes bas',
      'Épaules qui montent vers les oreilles',
    ],
  },
  'pallof-press': {
    principaux: ['Obliques', 'Transverse (anti-rotation)'],
    secondaires: ['Grand droit', 'Fessiers', 'Épaules (stabilisation)'],
    erreurs: [
      'Buste qui tourne vers la poulie',
      'Bassin qui part sur le côté au step-out',
      'Verrouillage de 2 s écourté',
    ],
  },
  'cable-external-rotation': {
    principaux: ['Infra-épineux', 'Petit rond (rotateurs externes)'],
    secondaires: ['Deltoïde postérieur', 'Trapèze inférieur'],
    erreurs: [
      'Coude qui s’écarte du corps',
      'Charge trop lourde : le mouvement devient un tirage',
      'Épaule qui monte ou part vers l’avant',
    ],
  },
  'broad-jump': {
    principaux: ['Grands fessiers', 'Quadriceps'],
    secondaires: ['Ischio-jambiers', 'Mollets', 'Sangle abdominale'],
    erreurs: [
      'Pas d’élan des bras',
      'Réception jambes tendues ou genoux qui rentrent',
      'Enchaîner les sauts sans reset complet',
    ],
  },
  'hang-high-pull': {
    principaux: ['Grands fessiers', 'Quadriceps', 'Trapèzes'],
    secondaires: ['Ischio-jambiers', 'Mollets', 'Deltoïdes', 'Érecteurs du rachis'],
    erreurs: [
      'Tirer avec les bras avant l’extension complète des hanches',
      'Barre qui s’éloigne du corps',
      'Passer sous la barre comme un hang clean',
    ],
  },
  'push-press': {
    principaux: ['Deltoïdes', 'Triceps'],
    secondaires: ['Quadriceps', 'Fessiers (drive)', 'Trapèzes', 'Sangle abdominale'],
    erreurs: [
      'Dip trop profond ou genoux qui partent en avant',
      'Pause entre le dip et la poussée',
      'Charge si lourde que la fin devient un strict press',
    ],
  },
  'jump-squat-db': {
    principaux: ['Quadriceps', 'Grands fessiers'],
    secondaires: ['Mollets', 'Ischio-jambiers'],
    erreurs: [
      'Charge trop lourde : le saut perd en vitesse',
      'Réception raide, genoux qui rentrent',
      'Enchaîner sans reset entre les reps',
    ],
  },
  'explosive-cable-row': {
    principaux: ['Grand dorsal', 'Rhomboïdes'],
    secondaires: ['Deltoïdes postérieurs', 'Biceps', 'Érecteurs du rachis'],
    erreurs: [
      'Balancer le buste pour tirer',
      'Retour lâché au lieu d’être contrôlé',
      'Épaules qui montent',
    ],
  },
  'farmer-carry': {
    principaux: ['Avant-bras (préhension)', 'Trapèzes'],
    secondaires: ['Sangle abdominale', 'Fessiers', 'Mollets'],
    erreurs: [
      'Buste qui s’incline ou épaules qui tombent',
      'Pas courts et hésitants au lieu d’une marche agressive',
      'Haltères qui tapent les cuisses',
    ],
  },
  'lateral-bound': {
    principaux: ['Moyen et grand fessier', 'Quadriceps'],
    secondaires: ['Adducteurs', 'Mollets', 'Muscles stabilisateurs de la cheville'],
    erreurs: [
      'Ne pas tenir la réception 2 s',
      'Genou qui rentre à la réception',
      'Bound court enchaîné sans reset',
    ],
  },
  'dead-bug-cable': {
    principaux: ['Transverse', 'Grand droit de l’abdomen (anti-extension)'],
    secondaires: ['Fléchisseurs de hanche', 'Obliques'],
    erreurs: [
      'Bas du dos qui décolle du sol',
      'Mouvements rapides, sans contrôle',
      'Retenir sa respiration',
    ],
  },
  deadlift: {
    principaux: ['Ischio-jambiers', 'Grands fessiers', 'Érecteurs du rachis'],
    secondaires: ['Quadriceps', 'Grand dorsal', 'Trapèzes', 'Avant-bras'],
    erreurs: [
      'Touch-and-go : rebond de la barre au sol',
      'Dos qui s’arrondit au décollage',
      'Barre qui s’éloigne des tibias',
    ],
  },
  'front-squat': {
    principaux: ['Quadriceps', 'Grands fessiers'],
    secondaires: ['Érecteurs du rachis', 'Haut du dos', 'Sangle abdominale'],
    erreurs: [
      'Coudes qui tombent : la barre glisse vers l’avant',
      'Buste qui penche',
      'Talons qui décollent',
    ],
  },
  'hip-thrust': {
    principaux: ['Grands fessiers'],
    secondaires: ['Ischio-jambiers', 'Quadriceps', 'Moyen fessier'],
    erreurs: [
      'Cambrer le bas du dos en haut au lieu de serrer les fessiers',
      'Menton levé, tête en arrière',
      'Pas de pause de 2 s en contraction',
    ],
  },
  'nordic-curl': {
    principaux: ['Ischio-jambiers (excentrique)'],
    secondaires: ['Grands fessiers', 'Mollets'],
    erreurs: [
      'Hanches cassées vers l’arrière au lieu d’un corps aligné',
      'Descente trop rapide, sans contrôle',
      'Pousser avec les mains trop tôt',
    ],
  },
  'single-leg-rdl': {
    principaux: ['Ischio-jambiers', 'Grand fessier (jambe d’appui)'],
    secondaires: ['Moyen fessier', 'Érecteurs du rachis', 'Muscles du pied'],
    erreurs: [
      'Hanche qui s’ouvre et tourne vers l’extérieur',
      'Dos qui s’arrondit',
      'Descente rapide qui fait perdre l’équilibre',
    ],
  },
  'copenhagen-plank': {
    principaux: ['Adducteurs'],
    secondaires: ['Obliques', 'Moyen fessier'],
    erreurs: [
      'Bassin qui s’affaisse ou tourne',
      'Continuer malgré une gêne à l’aine',
      'Levier trop long dès le départ',
    ],
  },
  'suitcase-carry': {
    principaux: ['Obliques', 'Carré des lombes (anti-inclinaison)'],
    secondaires: ['Avant-bras', 'Trapèzes', 'Moyen fessier'],
    erreurs: [
      'Buste qui penche du côté de l’haltère',
      'Porter à deux mains : l’exercice disparaît',
      'Regard vers le bas, épaule qui tombe',
    ],
  },
  'incline-db-press': {
    principaux: ['Grand pectoral (faisceau haut)', 'Deltoïdes antérieurs'],
    secondaires: ['Triceps'],
    erreurs: [
      'Banc trop incliné : le travail passe sur les épaules',
      'Haltères qui rebondissent en bas',
      'Coudes trop ouverts',
    ],
  },
  'neutral-grip-pullup': {
    principaux: ['Grand dorsal', 'Biceps', 'Brachial'],
    secondaires: ['Rhomboïdes', 'Trapèzes moyens et inférieurs', 'Avant-bras'],
    erreurs: [
      'Élan ou kipping',
      'Amplitude partielle, sans bras tendus en bas',
      'Transformer la séance en séance lourde',
    ],
  },
  'one-arm-cable-row': {
    principaux: ['Grand dorsal', 'Rhomboïdes'],
    secondaires: ['Deltoïde postérieur', 'Biceps', 'Obliques'],
    erreurs: [
      'Rotation excessive du buste pour tirer',
      'Épaule qui monte vers l’oreille',
      'Retour lâché',
    ],
  },
  'landmine-press-standing': {
    principaux: ['Deltoïde antérieur', 'Triceps'],
    secondaires: ['Grand pectoral', 'Dentelé antérieur', 'Fessiers', 'Quadriceps'],
    erreurs: [
      'Cambrer le bas du dos',
      'Pousser seulement avec le bras, sans les jambes',
      'Barre qui part trop loin devant',
    ],
  },
  'cable-chop': {
    principaux: ['Obliques', 'Transverse', 'Grand dorsal', 'Fessiers'],
    secondaires: ['Épaules et bras (transmission seulement)'],
    erreurs: [
      'Torsion du buste seul, bassin bloqué',
      'Retour subi au lieu d’être contrôlé',
      'Charge trop lourde : les bras tirent',
    ],
  },
  'hanging-leg-raise': {
    principaux: ['Grand droit de l’abdomen', 'Fléchisseurs de hanche'],
    secondaires: ['Obliques', 'Avant-bras (préhension)'],
    erreurs: [
      'Balancier ou élan',
      'Descente plus rapide que la montée',
      'Lever les jambes sans rétroverser le bassin',
    ],
  },
  'test-vertical-jump': {
    principaux: ['Grands fessiers', 'Quadriceps'],
    secondaires: ['Mollets', 'Ischio-jambiers', 'Épaules (bras)'],
    erreurs: [
      'Marque murale prise sans bras bien tendu',
      'Prise d’élan par des pas',
      'Pas assez de repos entre les essais',
    ],
  },
  'test-strict-pullup-max': {
    principaux: ['Grand dorsal', 'Biceps'],
    secondaires: ['Rhomboïdes', 'Trapèzes', 'Avant-bras', 'Sangle abdominale'],
    erreurs: [
      'Kipping ou élan',
      'Poitrine qui n’atteint pas la barre',
      'Reps partielles comptées dans le total',
    ],
  },
};

/** Muscles et erreurs d'un mouvement (ou du test qui emprunte sa planche). */
export function infosFichePower12(exerciceId: string): InfosFiche | undefined {
  return MUSCLES_ERREURS_POWER12[MOUVEMENT_DU_TEST[exerciceId] ?? exerciceId];
}
