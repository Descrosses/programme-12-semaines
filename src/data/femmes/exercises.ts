/**
 * Catalogue des exercices, transcrit de la §2 du .md.
 *
 * Chaque exercice appartient à UNE version (maison ou Basic-Fit). Les deux
 * versions d'une même ligne de circuit sont appariées dans `phases.ts`, pas
 * ici.
 *
 * Deux champs méritent l'attention :
 *
 * - `restrictions` : les contre-indications de la §1. Elles ne sont pas
 *   décoratives — `engine/safety.ts` retire réellement l'exercice du circuit
 *   tant que la réponse correspondante n'est pas donnée.
 * - `fallbackId` : par quoi on le remplace alors. Toujours un exercice déjà
 *   présent au programme. L'appli ne propose jamais un mouvement que le
 *   programme n'a pas écrit.
 */

import type { ExerciseDef } from './types';

const LIST: ExerciseDef[] = [
  // -------------------------------------------------------------------------
  // Phase 1 — maison
  // -------------------------------------------------------------------------
  {
    id: 'squat-pdc',
    name: 'Squat au poids du corps',
    fn: 'squat',
    version: 'maison',
    intent: 'Réapprendre le mouvement propre, sans charge. Descente contrôlée.',
    cues: [
      'Expire en montant, jamais en poussant ventre en avant',
      'Genoux dans l’axe des pieds',
      'Descends jusqu’où le dos reste neutre, pas plus bas',
    ],
  },
  {
    id: 'fentes-statiques',
    name: 'Fentes statiques',
    fn: 'lunge',
    version: 'maison',
    intent: 'Stabilité unilatérale, sans déplacement : le bassin reste gainé.',
    cues: ['Buste droit', 'Genou arrière vers le sol, sans le toucher'],
  },
  {
    id: 'pont-fessier',
    name: 'Pont fessier',
    fn: 'glute',
    version: 'maison',
    intent: 'Réveiller les fessiers, décharger le bas du dos.',
    cues: ['Expire en montant', 'Serre les fessiers en haut, ne cambre pas'],
  },
  {
    id: 'rowing-halteres-2kg',
    name: 'Rowing haltères 2 kg',
    fn: 'pull',
    version: 'maison',
    intent: 'Rouvrir le haut du dos, contrer la posture de portage.',
    cues: ['Dos plat', 'Tire les coudes vers l’arrière, pas vers le haut'],
  },
  {
    id: 'bird-dog',
    name: 'Bird-dog',
    fn: 'core',
    version: 'maison',
    intent: 'Gainage profond sans pression sur la ligne blanche.',
    cues: ['Bassin immobile', 'Expire en tendant bras et jambe opposés'],
  },

  // -------------------------------------------------------------------------
  // Phase 1 — Basic-Fit
  // -------------------------------------------------------------------------
  {
    id: 'presse-cuisses',
    name: 'Presse à cuisses',
    fn: 'squat',
    version: 'salle',
    intent: 'Charge légère : le dos est soutenu, l’amplitude reste modérée.',
    cues: ['Ne décolle pas le bassin du dossier', 'Ne verrouille pas les genoux'],
  },
  {
    id: 'fentes-marchees-legeres',
    name: 'Fentes marchées',
    fn: 'lunge',
    version: 'salle',
    intent: 'À vide ou haltères légers. Le déplacement vient quand l’équilibre suit.',
    cues: ['Buste droit', 'Pas assez long pour que le genou avant reste au-dessus du pied'],
  },
  {
    id: 'hip-thrust-banc',
    name: 'Hip thrust au banc',
    fn: 'glute',
    version: 'salle',
    intent: 'Même intention que le pont fessier, avec plus d’amplitude.',
    cues: ['Menton rentré', 'Expire en montant, verrouille en haut sans cambrer'],
  },
  {
    id: 'tirage-horizontal-poulie',
    name: 'Tirage horizontal poulie basse',
    fn: 'pull',
    version: 'salle',
    intent: 'Rouvrir le haut du dos, dos soutenu par la position assise.',
    cues: ['Buste stable, ne te balance pas', 'Épaules basses'],
  },
  {
    id: 'bird-dog-sol',
    name: 'Bird-dog au sol',
    fn: 'core',
    version: 'salle',
    intent: 'Gainage profond sans pression sur la ligne blanche.',
    cues: ['Bassin immobile', 'Expire en tendant bras et jambe opposés'],
  },

  // -------------------------------------------------------------------------
  // Phase 2 — maison
  // -------------------------------------------------------------------------
  {
    id: 'goblet-squat-kb',
    name: 'Goblet squat kettlebell',
    fn: 'squat',
    version: 'maison',
    intent: 'La charge devant oblige le buste à rester droit. Première charge du programme.',
    cues: ['Kettlebell contre la poitrine', 'Expire en remontant'],
  },
  {
    id: 'deadlift-kb',
    name: 'Deadlift kettlebell',
    fn: 'hinge',
    version: 'maison',
    intent: 'Charnière de hanche. Le dos ne bouge pas, ce sont les hanches qui reculent.',
    cues: ['Dos neutre du début à la fin', 'Expire en te redressant'],
  },
  {
    id: 'fentes-marchees',
    name: 'Fentes marchées',
    fn: 'lunge',
    version: 'maison',
    intent: 'Fente en déplacement : plus d’équilibre demandé qu’en statique.',
    cues: ['Buste droit', 'Pose le pied bien à plat avant de transférer le poids'],
  },
  {
    id: 'rowing-kb',
    name: 'Rowing kettlebell',
    fn: 'pull',
    version: 'maison',
    intent: 'Un bras à la fois : le tronc résiste à la rotation.',
    cues: ['Bassin de face', 'Dos plat, appui de l’autre main'],
  },
  {
    id: 'planche-genoux',
    name: 'Planche genoux',
    fn: 'core',
    version: 'maison',
    intent: 'Gainage statique allégé. Écarté si une douleur limite un mouvement (§1).',
    cues: ['Ventre rentré sans bloquer la respiration', 'Bassin en rétroversion légère'],
    restrictions: ['flexionTronc'],
    fallbackId: 'bird-dog',
  },
  {
    id: 'pont-fessier-unilateral',
    name: 'Pont fessier unilatéral',
    fn: 'glute',
    version: 'maison',
    intent: 'Une jambe à la fois : révèle et corrige l’asymétrie post-grossesse.',
    cues: ['Bassin à l’horizontale, il ne doit pas basculer', 'Expire en montant'],
  },

  // -------------------------------------------------------------------------
  // Phase 2 — Basic-Fit
  // -------------------------------------------------------------------------
  {
    id: 'goblet-squat-haltere',
    name: 'Goblet squat haltère',
    fn: 'squat',
    version: 'salle',
    intent: 'Identique au goblet kettlebell, avec une charge réglable.',
    cues: ['Haltère contre la poitrine', 'Expire en remontant'],
  },
  {
    id: 'sdt-roumain-halteres',
    name: 'Soulevé de terre roumain haltères',
    fn: 'hinge',
    version: 'salle',
    intent: 'Charnière de hanche, jambes quasi tendues, amplitude limitée par les ischios.',
    cues: ['Descends tant que le dos reste plat, pas plus bas', 'Haltères au contact des cuisses'],
  },
  {
    id: 'fentes-marchees-halteres',
    name: 'Fentes marchées haltères',
    fn: 'lunge',
    version: 'salle',
    intent: 'Fente en déplacement, charge tenue bras le long du corps.',
    cues: ['Buste droit', 'Épaules basses, ne hausse pas'],
  },
  {
    id: 'tirage-poulie-unilateral',
    name: 'Tirage poulie basse',
    fn: 'pull',
    version: 'salle',
    intent: 'Un bras à la fois : le tronc résiste à la rotation.',
    cues: ['Bassin de face', 'Ne pivote pas pour aller chercher plus loin'],
  },
  {
    id: 'planche-genoux-salle',
    name: 'Planche genoux',
    fn: 'core',
    version: 'salle',
    intent: 'Gainage statique allégé. Écarté si une douleur limite un mouvement (§1).',
    cues: ['Ventre rentré sans bloquer la respiration', 'Bassin en rétroversion légère'],
    restrictions: ['flexionTronc'],
    fallbackId: 'bird-dog-sol',
  },
  {
    id: 'pont-fessier-unilateral-banc',
    name: 'Pont fessier unilatéral au banc',
    fn: 'glute',
    version: 'salle',
    intent: 'Une jambe à la fois, épaules au banc : plus d’amplitude qu’au sol.',
    cues: ['Bassin à l’horizontale', 'Expire en montant'],
  },

  // -------------------------------------------------------------------------
  // Phase 3 — maison
  // -------------------------------------------------------------------------
  {
    id: 'swing-kb',
    name: 'Swing kettlebell',
    fn: 'hinge',
    version: 'maison',
    intent: 'Charnière explosive. C’est un mouvement de hanches, pas d’épaules.',
    cues: [
      'La kettlebell ne monte pas plus haut que les épaules',
      'Expire fort au moment de la projection',
    ],
    restrictions: ['impact'],
    fallbackId: 'deadlift-kb',
  },
  {
    id: 'squat-saute',
    name: 'Squat sauté',
    fn: 'squat',
    version: 'maison',
    intent: 'Version explosive. Réception amortie, jamais jambes tendues.',
    cues: [
      'Atterris sur l’avant du pied puis déroule',
      'Arrête la série dès que la réception claque',
    ],
    variant: 'ou squat tempo',
    restrictions: ['impact'],
    fallbackId: 'squat-tempo',
  },
  {
    id: 'squat-tempo',
    name: 'Squat tempo',
    fn: 'squat',
    version: 'maison',
    intent:
      'Variante sans impact écrite au programme : 3 s de descente, 1 s en bas, remontée normale.',
    cues: ['Compte la descente', 'Expire en remontant'],
  },
  {
    id: 'fentes-bulgares-chaise',
    name: 'Fentes bulgares (chaise)',
    fn: 'lunge',
    version: 'maison',
    intent: 'Charge une jambe presque entièrement. Le mouvement le plus exigeant du programme.',
    cues: [
      'Buste légèrement penché en avant',
      'Pied avant assez loin pour que le genou reste derrière les orteils',
    ],
  },
  {
    id: 'rowing-presse-halteres',
    name: 'Rowing + presse haltères',
    fn: 'pull',
    version: 'maison',
    intent: 'Enchaînement tirage puis poussée au-dessus de la tête, sans reposer les haltères.',
    cues: ['Expire pendant la poussée', 'Ne cambre pas pour aller chercher la verticale'],
    restrictions: ['overhead'],
    fallbackId: 'rowing-halteres-2kg',
  },
  {
    id: 'planche-complete',
    name: 'Planche complète',
    fn: 'core',
    version: 'maison',
    intent: 'Gainage sur les pieds. Écarté si une douleur limite un mouvement (§1).',
    cues: ['Ligne droite épaules-bassin-talons', 'Sors dès que le ventre pousse vers l’avant'],
    restrictions: ['flexionTronc'],
    fallbackId: 'bird-dog',
  },
  {
    id: 'superman',
    name: 'Superman',
    fn: 'core',
    version: 'maison',
    intent: 'Chaîne postérieure. Extension et non flexion : le dos reste neutre.',
    cues: ['Décolle sans à-coup', 'Regard vers le sol, nuque longue'],
  },

  // -------------------------------------------------------------------------
  // Phase 3 — Basic-Fit
  // -------------------------------------------------------------------------
  {
    id: 'swing-ou-sdt-explosif',
    name: 'Kettlebell swing ou soulevé de terre haltères explosif',
    fn: 'hinge',
    version: 'salle',
    intent: 'Charnière explosive, kettlebell ou haltères selon ce qui est libre.',
    cues: ['Mouvement de hanches', 'Expire fort au moment de la projection'],
    restrictions: ['impact'],
    fallbackId: 'sdt-roumain-halteres',
  },
  {
    id: 'squat-guide',
    name: 'Squat guidé',
    fn: 'squat',
    version: 'salle',
    intent: 'Barre guidée : la trajectoire est tenue, seule la charge demande de l’attention.',
    cues: ['Pieds légèrement avancés', 'Expire en remontant'],
    variant: 'ou squat sauté',
  },
  {
    id: 'fentes-bulgares-banc',
    name: 'Fentes bulgares au banc',
    fn: 'lunge',
    version: 'salle',
    intent: 'Charge une jambe presque entièrement. Le mouvement le plus exigeant du programme.',
    cues: ['Buste légèrement penché en avant', 'Pied avant assez loin pour protéger le genou'],
  },
  {
    id: 'tirage-developpe-poulie',
    name: 'Tirage poulie + développé épaules poulie',
    fn: 'pull',
    version: 'salle',
    intent: 'Enchaînement tirage puis poussée au-dessus de la tête.',
    cues: ['Expire pendant la poussée', 'Ne cambre pas pour aller chercher la verticale'],
    restrictions: ['overhead'],
    fallbackId: 'tirage-horizontal-poulie',
  },
  {
    id: 'planche-complete-salle',
    name: 'Planche complète',
    fn: 'core',
    version: 'salle',
    intent: 'Gainage sur les pieds. Écarté si une douleur limite un mouvement (§1).',
    cues: ['Ligne droite épaules-bassin-talons', 'Sors dès que le ventre pousse vers l’avant'],
    restrictions: ['flexionTronc'],
    fallbackId: 'bird-dog-sol',
  },
  {
    id: 'extension-lombaire-banc',
    name: 'Extension lombaire au banc à lombaires',
    fn: 'core',
    version: 'salle',
    intent: 'Chaîne postérieure. Extension et non flexion : le dos reste neutre.',
    cues: ['Remonte jusqu’à l’alignement, pas au-delà', 'Sans à-coup'],
  },

  // -------------------------------------------------------------------------
  // Cardio optionnel (§2, à partir de la phase 3)
  // -------------------------------------------------------------------------
  {
    id: 'cardio-marche',
    name: 'Marche rapide',
    fn: 'cardio',
    version: 'maison',
    intent: 'Allure où la conversation reste possible mais devient un peu courte.',
  },
  {
    id: 'cardio-corde',
    name: 'Corde à sauter',
    fn: 'cardio',
    version: 'maison',
    intent: 'Impact répété : à réserver au périnée récupéré.',
    restrictions: ['impact'],
    fallbackId: 'cardio-marche',
  },
  {
    id: 'cardio-velo',
    name: 'Vélo',
    fn: 'cardio',
    version: 'salle',
    intent: 'Sans impact, résistance modérée.',
  },
  {
    id: 'cardio-tapis',
    name: 'Tapis',
    fn: 'cardio',
    version: 'salle',
    intent: 'Marche rapide en pente plutôt que course, tant que le périnée n’est pas récupéré.',
  },
];

export const EXERCISES: Record<string, ExerciseDef> = Object.fromEntries(
  LIST.map((e) => [e.id, e]),
);

export function getExercise(id: string): ExerciseDef {
  const ex = EXERCISES[id];
  if (!ex) throw new Error(`Exercice inconnu : ${id}`);
  return ex;
}

/** Les séances de cardio optionnel, par version (§2). */
export const CARDIO_IDS: Record<'maison' | 'salle', string[]> = {
  maison: ['cardio-marche', 'cardio-corde'],
  salle: ['cardio-velo', 'cardio-tapis'],
};
