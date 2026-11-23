/**
 * Le questionnaire « Bilan sportif et nutrition », transcrit mot pour mot du
 * site de Guillaume (<https://questionnaire-bilan-sportif.netlify.app>).
 *
 * Source figée : `docs/questionnaires/bilan-sportif/bilan.js` (le script de
 * la page, au 23 novembre). `engine/questionnaireBilanSportif.test.ts` EXÉCUTE
 * ce script et compare chaque section, question, option, condition
 * d'affichage et le résumé envoyé, au caractère près. Ne rien reformuler :
 * Guillaume et ses outils relisent ce résumé.
 *
 * Aucune logique ici. Les conditions d'affichage (`si`) sont nommées ; le
 * moteur (`engine/questionnaireBilanSportif.ts`) les évalue comme le site.
 * Les noms de champs (`n`, `s`, `t`…) sont ceux du site, pour que la
 * comparaison se lise ligne à ligne.
 */

/** Les conditions d'affichage du site, nommées. */
export type Condition = 'pilates' | 'douleur' | 'echeance' | 'athle' | 'force';

export type TypeQuestion =
  | 'single'
  | 'multi'
  | 'scale'
  | 'num'
  | 'text'
  | 'area'
  | 'group'
  | 'check';

export interface ChampGroupe {
  k: string;
  l: string;
  u?: string;
  type?: 'select' | 'text';
  opts?: readonly string[];
  ph?: string;
  wide?: boolean;
}

export interface GroupeCoche {
  l: string;
  o: readonly string[];
  si?: Condition;
}

export interface QuestionBilan {
  id: string;
  /** `true` = obligatoire ; `'any'` = au moins un champ du groupe. */
  req?: boolean | 'any';
  /** Numéro affiché dans le résumé (« S1 », « 3b »…). */
  n: string;
  /** Libellé court, repris dans le résumé. */
  s: string;
  /** La question posée. */
  t: string;
  type: TypeQuestion;
  hint?: string;
  opts?: readonly string[];
  other?: boolean;
  max?: number;
  exclusive?: string;
  unit?: string;
  fields?: readonly ChampGroupe[];
  zero?: boolean;
  rm?: boolean;
  groups?: readonly GroupeCoche[];
  si?: Condition;
}

export interface SectionBilan {
  id?: string;
  title: string;
  /** 1 = tronc commun, 2 = performance (profil sportif), 3 = situation particulière. */
  mod: 1 | 2 | 3;
  /** Pour une section de situation particulière : la situation qui l'ouvre. */
  key?: string;
  intro?: string;
  si?: Condition;
  qs: readonly QuestionBilan[];
}

export const OBJ = [
  'Perdre du poids / de la masse grasse',
  'Prendre du muscle',
  'Devenir plus fort',
  'Améliorer explosivité / vitesse / qualités athlétiques',
  'Me renforcer musculairement (sans viser la prise de masse)',
  'Améliorer ma mobilité / ma posture',
  'Améliorer condition physique / endurance',
  'Reprendre le sport',
  'Santé / bien-être',
  'Préparation à un sport ou une épreuve',
  'Autre',
] as const;
export const PRIO = [
  'Résultats physiques',
  'Force',
  'Muscle',
  'Explosivité',
  'Endurance',
  'Mobilité',
  'Santé',
  'Performance sportive',
  'Esthétique',
  'Énergie au quotidien',
  'Autre',
] as const;
export const QUAL = [
  'Force maximale',
  'Puissance / explosivité',
  'Accélération',
  'Vitesse',
  'Détente',
  'Agilité',
  'Endurance',
  'Capacité à répéter des efforts intenses',
  'Masse musculaire',
  'Mobilité',
  'Gainage',
  'Autre',
] as const;
export const CONTR = [
  'Travail',
  'Horaires décalés',
  'Déplacements',
  'Peu de temps pour cuisiner',
  'Budget',
  'Repas en famille',
  'Cantine / restaurant',
  'Pas de frigo',
  'Pas de micro-ondes',
  'Autre',
  'Aucune',
] as const;
export const MAT = [
  'Plateformes / espace pour sauter',
  'Médecine-ball',
  'Traîneau',
  'Landmine',
  'Kettlebells',
  'Élastiques',
  'Trap bar',
  'Barre olympique + disques',
  'Espace de sprint',
  'Vélo / rameur / SkiErg',
  'Chronomètre / appli vidéo',
  'Autre',
] as const;
export const METHODES = [
  'Musculation',
  'Pilates',
  'Entraînement fonctionnel',
  'Circuit training',
  'Cardio',
  'Mobilité / étirements',
  'Poids du corps (sans matériel)',
  'Je ne sais pas / pas de préférence',
] as const;
export const DAYS = [
  'Lundi',
  'Mardi',
  'Mercredi',
  'Jeudi',
  'Vendredi',
  'Samedi',
  'Dimanche',
] as const;

export const PAS_PREF = 'Je ne sais pas / pas de préférence';
export const AUCUN = 'Aucun de ces exercices';
export const ECHELLE = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'] as const;

export const SECTIONS: readonly SectionBilan[] = [
  {
    id: 'depistage',
    title: "Ta sécurité d'abord",
    mod: 1,
    intro:
      "Quelques questions courtes pour vérifier que tu peux t'entraîner sans risque. Réponds honnêtement : ce n'est pas un test, c'est ce qui permet de t'orienter correctement.",
    qs: [
      {
        id: 'h1',
        req: true,
        n: 'S1',
        s: 'Douleur ou pression à la poitrine',
        t: "As-tu déjà ressenti une douleur ou une pression dans la poitrine, à l'effort ou au repos ?",
        type: 'single',
        opts: ['Oui', 'Non'],
      },
      {
        id: 'h2',
        req: true,
        n: 'S2',
        s: 'Malaise ou vertiges',
        t: 'As-tu eu un malaise, une perte de connaissance ou des vertiges inexpliqués récemment ?',
        type: 'single',
        opts: ['Oui', 'Non'],
      },
      {
        id: 'h3',
        req: true,
        n: 'S3',
        s: 'Cœur ou tension',
        t: "Un médecin t'a-t-il déjà parlé d'un problème de cœur ou d'une tension trop élevée ?",
        type: 'single',
        opts: ['Oui', 'Non'],
      },
      {
        id: 'h4',
        req: true,
        n: 'S4',
        s: 'Essoufflement anormal',
        t: 'Es-tu essoufflé(e) de façon anormale pour un effort léger (monter un étage, marcher vite) ?',
        type: 'single',
        opts: ['Oui', 'Non'],
      },
      {
        id: 'h5',
        req: true,
        n: 'S5',
        s: 'Maladie chronique / restriction',
        t: "As-tu une maladie chronique (diabète, asthme sévère…) ou un médecin t'a-t-il conseillé de limiter l'activité physique ?",
        type: 'single',
        opts: ['Oui', 'Non'],
      },
      {
        id: 'h6',
        req: true,
        n: 'S6',
        s: 'Grossesse en cours',
        t: 'Es-tu enceinte actuellement ?',
        type: 'single',
        opts: ['Oui', 'Non', 'Non concerné(e)'],
      },
    ],
  },
  {
    title: 'Profil et objectif',
    mod: 1,
    qs: [
      { id: 'q1', req: true, n: '1', s: 'Âge', t: 'Quel âge as-tu ?', type: 'num', unit: 'ans' },
      {
        id: 'q2',
        req: true,
        n: '2',
        s: 'Sexe / taille / poids',
        t: 'Sexe, taille et poids actuel',
        type: 'group',
        fields: [
          {
            k: 'sexe',
            l: 'Sexe',
            type: 'select',
            opts: ['Femme', 'Homme', 'Autre', 'Préfère ne pas répondre'],
            wide: true,
          },
          { k: 'taille', l: 'Taille', u: 'cm' },
          { k: 'poids', l: 'Poids', u: 'kg' },
        ],
      },
      {
        id: 'q3',
        req: true,
        n: '3',
        s: 'Objectif principal',
        t: 'Quel est ton objectif principal ?',
        type: 'single',
        opts: [
          'Perdre du poids / de la masse grasse',
          'Prendre du muscle',
          'Devenir plus fort',
          'Améliorer explosivité / vitesse / qualités athlétiques',
          'Me renforcer musculairement (sans viser la prise de masse)',
          'Améliorer ma mobilité / ma posture',
          'Améliorer condition physique / endurance',
          'Reprendre le sport',
          'Santé / bien-être',
          'Préparation à un sport ou une épreuve',
          'Autre',
        ],
        other: true,
      },
      {
        id: 'q3b',
        req: true,
        n: '3b',
        s: 'Méthodes / entraînements souhaités',
        t: "Avec quel type d'entraînement veux-tu atteindre cet objectif ?",
        hint: 'Plusieurs choix possibles : ce que tu aimes ou veux essayer.',
        type: 'multi',
        opts: [
          'Musculation',
          'Pilates',
          'Entraînement fonctionnel',
          'Circuit training',
          'Cardio',
          'Mobilité / étirements',
          'Poids du corps (sans matériel)',
          'Je ne sais pas / pas de préférence',
        ],
        exclusive: 'Je ne sais pas / pas de préférence',
      },
      {
        id: 'q3c',
        n: '3c',
        s: 'Expérience en Pilates',
        t: 'Quelle est ton expérience en Pilates ?',
        type: 'single',
        opts: [
          'Jamais pratiqué',
          'Quelques séances',
          "Régulier depuis moins d'un an",
          "Régulier depuis plus d'un an",
        ],
        si: 'pilates',
      },
      {
        id: 'q4',
        n: '4',
        s: 'Objectif chiffré / échéance',
        t: 'As-tu un objectif chiffré ou une échéance ?',
        hint: 'Ex. −8 kg, squat à 150 kg, courir 10 km, compétition dans 4 mois.',
        type: 'area',
      },
      {
        id: 'q5',
        n: '5',
        s: '3 priorités',
        t: 'Quels sont tes 3 critères les plus importants ?',
        hint: "Jusqu'à 3 choix.",
        type: 'multi',
        opts: [
          'Résultats physiques',
          'Force',
          'Muscle',
          'Explosivité',
          'Endurance',
          'Mobilité',
          'Santé',
          'Performance sportive',
          'Esthétique',
          'Énergie au quotidien',
          'Autre',
        ],
        max: 3,
        other: true,
      },
    ],
  },
  {
    title: 'Santé et limitations',
    mod: 1,
    qs: [
      {
        id: 'q6',
        req: true,
        n: '6',
        s: 'Douleur / blessure actuelle',
        t: 'As-tu actuellement une douleur, une blessure ou une gêne ?',
        type: 'single',
        opts: ['Oui', 'Non'],
      },
      {
        id: 'q6b',
        req: true,
        n: '6b',
        s: 'Détail douleur',
        t: 'Précise la zone, les mouvements qui déclenchent la douleur et son intensité de 0 à 10.',
        type: 'area',
        si: 'douleur',
      },
      {
        id: 'q7',
        req: true,
        n: '7',
        s: 'Antécédents médicaux / chirurgicaux',
        t: "As-tu des antécédents médicaux ou chirurgicaux qui peuvent influencer l'entraînement ou l'alimentation ?",
        hint: "Écris « non » si ce n'est pas le cas.",
        type: 'area',
      },
      {
        id: 'q8',
        req: true,
        n: '8',
        s: 'Traitement / consigne médicale',
        t: 'Prends-tu un traitement, ou as-tu reçu une consigne médicale qui peut modifier ta pratique sportive ou ton alimentation ?',
        hint: "Écris « non » si ce n'est pas le cas.",
        type: 'area',
      },
    ],
  },
  {
    title: 'Niveau et expérience',
    mod: 1,
    qs: [
      {
        id: 'q9',
        req: true,
        n: '9',
        s: 'Niveau',
        t: 'Quel est ton niveau actuel en musculation / préparation physique ?',
        type: 'single',
        opts: [
          'Jamais pratiqué',
          "Débutant (moins d'1 an)",
          'Intermédiaire (1 à 3 ans)',
          'Confirmé (3 à 5 ans)',
          'Avancé (plus de 5 ans)',
        ],
      },
      {
        id: 'q10',
        req: true,
        n: '10',
        s: 'Sports et entraînements actuels',
        t: 'Quels sports ou entraînements fais-tu actuellement, en dehors de ce programme ?',
        hint: "Match, club, course, salle, vélo… Indique les jours, la durée et l'intensité. Écris « rien » si tu ne fais rien.",
        type: 'area',
      },
      {
        id: 'q11',
        n: '11',
        s: 'Exercices maîtrisés',
        t: 'Quels exercices maîtrises-tu déjà correctement ?',
        hint: 'Coche tout ce que tu sais faire avec une bonne technique. Si tu débutes, coche la dernière case.',
        type: 'check',
        groups: [
          {
            l: 'Jambes',
            o: [
              'Squat avec barre',
              'Squat gobelet / avec haltère',
              'Presse à cuisses',
              'Fentes / split squat',
              'Soulevé de terre',
              'Soulevé de terre roumain',
              'Hip thrust',
              'Leg curl / leg extension',
            ],
          },
          {
            l: 'Pectoraux et épaules',
            o: [
              'Développé couché',
              'Développé incliné',
              'Pompes',
              'Dips',
              'Développé militaire',
              'Élévations latérales',
            ],
          },
          {
            l: 'Dos et bras',
            o: [
              'Tractions',
              'Tirage vertical',
              'Rowing (barre, haltère ou machine)',
              'Curl biceps',
              'Extensions triceps',
            ],
          },
          {
            l: 'Explosivité',
            o: ['Épaulé / power clean', 'Kettlebell swing', 'Sauts / pliométrie', 'Sprints'],
          },
          {
            l: 'Gainage et cardio',
            o: ['Planche / gainage', 'Roue abdominale', 'Course à pied', 'Vélo / rameur'],
          },
          {
            l: 'Pilates',
            o: [
              'The Hundred',
              'Roll-up',
              'Single leg stretch',
              'Pont fessier (bridge)',
              'Planche (plank)',
              'Swimming',
            ],
            si: 'pilates',
          },
          { l: '', o: ['Aucun de ces exercices'] },
        ],
      },
    ],
  },
  {
    title: 'Organisation',
    mod: 1,
    qs: [
      {
        id: 'q12',
        req: true,
        n: '12',
        s: 'Séances par semaine',
        t: 'Combien de séances peux-tu réellement faire chaque semaine ?',
        type: 'num',
        unit: 'séances',
      },
      {
        id: 'q12b',
        req: true,
        n: '12b',
        s: 'Durée souhaitée',
        t: 'Sur quelle durée souhaites-tu suivre ton programme ?',
        hint: 'La durée finale pourra être ajustée selon ton objectif, ton niveau et tes disponibilités.',
        type: 'single',
        opts: [
          '4 semaines (cycle court)',
          '8 semaines (cycle standard)',
          '12 semaines (cycle complet)',
          '16 semaines (cycle long)',
          "J'ai une échéance précise",
          'Je ne sais pas : recommande-moi une durée',
        ],
      },
      {
        id: 'q12c',
        req: true,
        n: '12c',
        s: "Date de l'échéance",
        t: "Quelle est la date de ton échéance, et de quoi s'agit-il ?",
        hint: 'Ex. mariage le 12 juin, compétition le 3 mars.',
        type: 'text',
        si: 'echeance',
      },
      {
        id: 'q13',
        req: 'any',
        n: '13',
        s: 'Disponibilités',
        t: 'Tes disponibilités réalistes, jour par jour',
        hint: "Indique le temps en minutes. Mets 0 si c'est impossible.",
        type: 'group',
        zero: true,
        fields: [
          { k: 'Lundi', l: 'Lundi', u: 'min' },
          { k: 'Mardi', l: 'Mardi', u: 'min' },
          { k: 'Mercredi', l: 'Mercredi', u: 'min' },
          { k: 'Jeudi', l: 'Jeudi', u: 'min' },
          { k: 'Vendredi', l: 'Vendredi', u: 'min' },
          { k: 'Samedi', l: 'Samedi', u: 'min' },
          { k: 'Dimanche', l: 'Dimanche', u: 'min' },
        ],
      },
      {
        id: 'q14',
        req: true,
        n: '14',
        s: 'Lieu',
        t: "Où vas-tu principalement t'entraîner ?",
        type: 'single',
        opts: ['Maison', 'Salle', 'Extérieur', 'Plusieurs lieux'],
      },
      {
        id: 'q15',
        req: true,
        n: '15',
        s: 'Matériel',
        t: 'Quel matériel as-tu réellement à disposition ?',
        hint: 'Ex. rack, barre, haltères, poulies, machines, kettlebells, élastiques, tapis, ballon, reformer, cardio, espace de sprint…',
        type: 'area',
      },
    ],
  },
  {
    title: 'Alimentation',
    mod: 1,
    qs: [
      {
        id: 'q16',
        req: true,
        n: '16',
        s: 'Objectif alimentaire',
        t: 'Quel est ton objectif alimentaire principal ?',
        type: 'single',
        opts: [
          'Perte de graisse',
          'Maintien du poids / recomposition',
          'Prise de poids / muscle',
          'Soutenir les performances',
          "Améliorer la qualité de l'alimentation",
          'Je ne sais pas',
        ],
      },
      {
        id: 'q17',
        n: '17',
        s: 'Journée alimentaire type',
        t: 'Décris une journée alimentaire normale, avec les quantités approximatives si possible.',
        hint: 'Petit-déjeuner, collations, déjeuner, dîner, boissons.',
        type: 'area',
      },
      {
        id: 'q18',
        n: '18',
        s: 'Repas / collations souhaités',
        t: 'Combien de repas et collations souhaites-tu idéalement par jour ?',
        type: 'num',
        unit: 'par jour',
      },
      {
        id: 'q19',
        req: true,
        n: '19',
        s: 'Allergies / intolérances / régime',
        t: 'As-tu des allergies, des intolérances, des aliments interdits ou un régime particulier ?',
        hint: "Écris « non » si ce n'est pas le cas.",
        type: 'area',
      },
      {
        id: 'q20',
        n: '20',
        s: 'Aliments refusés / à garder',
        t: 'Quels aliments refuses-tu de manger, ou veux-tu absolument garder ?',
        type: 'area',
      },
      {
        id: 'q21',
        n: '21',
        s: 'Contraintes alimentaires',
        t: 'Quelles sont tes contraintes pour manger correctement ?',
        hint: 'Plusieurs choix possibles.',
        type: 'multi',
        opts: [
          'Travail',
          'Horaires décalés',
          'Déplacements',
          'Peu de temps pour cuisiner',
          'Budget',
          'Repas en famille',
          'Cantine / restaurant',
          'Pas de frigo',
          'Pas de micro-ondes',
          'Autre',
          'Aucune',
        ],
        other: true,
      },
      {
        id: 'q22',
        n: '22',
        s: 'Boissons',
        t: 'Combien bois-tu environ par jour ?',
        hint: 'Eau, puis café, sodas, boissons énergétiques et alcool si tu en consommes.',
        type: 'area',
      },
    ],
  },
  {
    title: 'Récupération et quotidien',
    mod: 1,
    qs: [
      {
        id: 'q23',
        n: '23',
        s: 'Sommeil (heures)',
        t: "Combien d'heures dors-tu réellement par nuit ?",
        type: 'num',
        unit: 'heures',
      },
      {
        id: 'q23b',
        n: '23b',
        s: 'Qualité du sommeil /10',
        t: 'Comment juges-tu la qualité de ton sommeil ?',
        hint: '1 = très mauvaise, 10 = excellente.',
        type: 'scale',
      },
      {
        id: 'q24',
        n: '24',
        s: 'Stress /10',
        t: 'Quel est ton niveau moyen de stress ?',
        hint: '1 = très faible, 10 = très élevé.',
        type: 'scale',
      },
      {
        id: 'q25',
        n: '25',
        s: 'Activité quotidienne',
        t: 'En dehors du sport, ton quotidien est physiquement…',
        type: 'single',
        opts: [
          'Très sédentaire',
          'Plutôt sédentaire',
          'Modérément actif',
          'Actif',
          'Très physique',
        ],
      },
      { id: 'q25b', n: '25b', s: 'Métier', t: 'Ton métier (facultatif)', type: 'text' },
    ],
  },
  {
    title: "Historique d'entraînement",
    mod: 2,
    qs: [
      {
        id: 'q26',
        n: '26',
        s: 'Ancienneté / fréquence',
        t: "Depuis combien de temps t'entraînes-tu sérieusement, et à quelle fréquence ces 6 derniers mois ?",
        type: 'group',
        fields: [
          { k: 'ans', l: 'Ancienneté', u: 'ans' },
          { k: 'freq', l: 'Fréquence', u: 'séances/sem' },
        ],
      },
      {
        id: 'q27',
        n: '27',
        s: 'Dernier programme',
        t: 'À quoi ressemblait ton dernier programme ?',
        hint: 'Split, nombre de séances, principaux exercices, séries et répétitions.',
        type: 'area',
      },
      {
        id: 'q28',
        si: 'athle',
        n: '28',
        s: 'Qualités à développer',
        t: 'Quelles sont les 3 qualités physiques à développer en priorité ?',
        hint: 'Maximum 3 choix.',
        type: 'multi',
        opts: [
          'Force maximale',
          'Puissance / explosivité',
          'Accélération',
          'Vitesse',
          'Détente',
          'Agilité',
          'Endurance',
          'Capacité à répéter des efforts intenses',
          'Masse musculaire',
          'Mobilité',
          'Gainage',
          'Autre',
        ],
        max: 3,
        other: true,
      },
      {
        id: 'q29',
        n: '29',
        s: 'Points forts / faibles',
        t: 'Quels sont, selon toi, tes principaux points forts et points faibles ?',
        type: 'area',
      },
      {
        id: 'q36',
        n: '36',
        s: 'Mobilité',
        t: 'As-tu des limitations de mobilité connues ?',
        hint: 'Chevilles, hanches, épaules, squat profond… Écris « non » sinon.',
        type: 'area',
      },
    ],
  },
  {
    title: 'Repères de force (facultatif)',
    mod: 2,
    si: 'force',
    intro:
      'Pas besoin de tester ton maximum maintenant : la première semaine du programme sert à le mesurer. Si tu connais une charge récente réalisée avec une technique propre, indique-la. Si tu ne fais pas ces exercices, écris ceux que tu fais à la place. Sinon, laisse vide.',
    qs: [
      {
        id: 'q30',
        n: '30',
        s: 'Squat ou équivalent',
        t: 'Squat ou équivalent : dernière charge connue',
        hint: 'Tu ne fais pas de squat ? Écris ton exercice pour les jambes. Laisse vide si tu ne sais pas.',
        type: 'group',
        rm: true,
        fields: [
          {
            k: 'exo',
            l: 'Exercice que tu fais à la place (si tu ne fais pas celui-ci)',
            type: 'text',
            ph: 'ex. presse à cuisses, hack squat',
            wide: true,
          },
          { k: 'kg', l: 'Charge', u: 'kg' },
          { k: 'reps', l: 'Répétitions', u: 'reps' },
        ],
      },
      {
        id: 'q31',
        n: '31',
        s: 'Développé couché ou équivalent',
        t: 'Développé couché ou équivalent : dernière charge connue',
        hint: 'Tu ne fais pas de développé couché ? Écris ton exercice pour les pectoraux. Laisse vide si tu ne sais pas.',
        type: 'group',
        rm: true,
        fields: [
          {
            k: 'exo',
            l: 'Exercice que tu fais à la place (si tu ne fais pas celui-ci)',
            type: 'text',
            ph: 'ex. développé incliné haltères, machine',
            wide: true,
          },
          { k: 'kg', l: 'Charge', u: 'kg' },
          { k: 'reps', l: 'Répétitions', u: 'reps' },
        ],
      },
      {
        id: 'q32',
        n: '32',
        s: 'Soulevé de terre ou équivalent',
        t: 'Soulevé de terre ou équivalent : dernière charge connue',
        hint: "Tu ne fais pas de soulevé de terre ? Écris ton exercice pour le dos et l'arrière des jambes. Laisse vide si tu ne sais pas.",
        type: 'group',
        rm: true,
        fields: [
          {
            k: 'exo',
            l: 'Exercice que tu fais à la place (si tu ne fais pas celui-ci)',
            type: 'text',
            ph: 'ex. soulevé de terre roumain, trap bar',
            wide: true,
          },
          { k: 'kg', l: 'Charge', u: 'kg' },
          { k: 'reps', l: 'Répétitions', u: 'reps' },
        ],
      },
      {
        id: 'q33',
        n: '33',
        s: 'Tractions ou équivalent',
        t: 'Tractions ou équivalent : dernière performance connue',
        hint: 'Tu ne fais pas de tractions ? Écris ton exercice pour le dos. Laisse vide ce que tu ne sais pas.',
        type: 'group',
        fields: [
          {
            k: 'exo',
            l: 'Exercice que tu fais à la place',
            type: 'text',
            ph: 'ex. tirage vertical',
            wide: true,
          },
          { k: 'pdc', l: 'Max au poids du corps', u: 'reps' },
          { k: 'lest', l: 'Lest ajouté', u: 'kg' },
          { k: 'lestreps', l: 'Répétitions avec lest', u: 'reps' },
        ],
      },
    ],
  },
  {
    title: 'Récupération et matériel spécifique',
    mod: 2,
    qs: [
      {
        id: 'q38',
        n: '38',
        s: 'Récupération /10',
        t: 'Comment récupères-tu entre deux séances difficiles ?',
        hint: '1 = très mal, 10 = très bien.',
        type: 'scale',
      },
      {
        id: 'q40',
        si: 'athle',
        n: '40',
        s: 'Équipement spécifique',
        t: 'Quel équipement spécifique peux-tu utiliser ?',
        type: 'multi',
        opts: [
          'Plateformes / espace pour sauter',
          'Médecine-ball',
          'Traîneau',
          'Landmine',
          'Kettlebells',
          'Élastiques',
          'Trap bar',
          'Barre olympique + disques',
          'Espace de sprint',
          'Vélo / rameur / SkiErg',
          'Chronomètre / appli vidéo',
          'Autre',
        ],
        other: true,
      },
    ],
  },
  {
    title: 'Objectif de perte de poids importante',
    mod: 3,
    key: 'p',
    qs: [
      {
        id: 'p1',
        n: 'P1',
        s: 'Perte souhaitée',
        t: 'Combien souhaites-tu perdre, et sur quelle durée ?',
        type: 'group',
        fields: [
          { k: 'kg', l: 'À perdre', u: 'kg' },
          { k: 'mois', l: 'Sur', u: 'mois' },
        ],
      },
      {
        id: 'p2',
        n: 'P2',
        s: 'Variations de poids',
        t: 'Ton poids a-t-il fortement varié ces dernières années ?',
        type: 'area',
      },
      {
        id: 'p3',
        n: 'P3',
        s: 'Régimes restrictifs',
        t: 'As-tu déjà suivi des régimes très restrictifs ou connu des épisodes de perte de contrôle alimentaire ? (précision facultative)',
        type: 'area',
      },
    ],
  },
  {
    title: 'Sport spécifique',
    mod: 3,
    key: 'sp',
    qs: [
      {
        id: 'sp1',
        n: 'SP1',
        s: 'Sport / poste / niveau',
        t: 'Quel sport pratiques-tu, à quel poste ou rôle, et à quel niveau ?',
        type: 'area',
      },
      {
        id: 'sp2',
        n: 'SP2',
        s: 'Entraînements et compétitions',
        t: "Combien d'entraînements et de compétitions par semaine, et quels jours ?",
        type: 'area',
      },
      {
        id: 'sp3',
        n: 'SP3',
        s: 'Actions déterminantes',
        t: 'Quelles actions déterminent le plus ta performance ?',
        hint: 'Sprint, changements de direction, contacts, sauts, endurance, lancer… 3 maximum.',
        type: 'area',
      },
      {
        id: 'sp4',
        n: 'SP4',
        s: 'Prochaine échéance',
        t: 'Quand commence ta prochaine compétition, saison ou échéance importante ?',
        type: 'text',
      },
      {
        id: 'sp5',
        n: 'SP5',
        s: 'Période',
        t: 'Es-tu en pleine saison, en intersaison ou en préparation ?',
        type: 'single',
        opts: ['Pleine saison', 'Intersaison', 'Préparation'],
      },
    ],
  },
];

export const SITUATIONS: readonly { key: string; l: string }[] = [
  { key: 'pp', l: 'Post-partum' },
  { key: 'b', l: 'Reprise après blessure' },
  { key: 'p', l: 'Je veux perdre beaucoup de poids (10 kg ou plus)' },
  { key: 's', l: 'Senior' },
  { key: 'a', l: 'Adolescent (moins de 18 ans)' },
  { key: 'sp', l: 'Préparation à un sport précis' },
];

/** Les deux profils de l'accueil : [valeur enregistrée, libellé]. */
export const PROFILS = [
  ['debutant', 'Je débute ou je reprends'],
  ['sportif', "Je m'entraîne déjà régulièrement"],
] as const;

/** Les situations que cette version n'accueille pas encore (écran d'arrêt). */
export const HORS_SITU: Readonly<Record<string, string>> = {
  pp: 'post-partum',
  b: 'reprise après blessure',
  s: 'senior',
  a: 'adolescent',
};

/** Les libellés de vigilance du résumé, dans l'ordre du site. */
export const VIGILANCE = {
  h1: 'douleur ou pression à la poitrine',
  h2: 'malaise ou vertiges inexpliqués',
  h3: 'problème de cœur ou de tension',
  h4: 'essoufflement anormal',
  h5: 'maladie chronique ou restriction médicale',
  h6: 'grossesse en cours',
  q6: 'douleur ou blessure actuelle',
  q7: 'antécédents médicaux',
  q8: 'traitement ou consigne médicale',
} as const;

/**
 * Les bases de programme du SITE (« indicatif, à valider par Guillaume »).
 * Ce ne sont PAS les programmes de l'appli : elles ne servent qu'à la ligne
 * « bases candidates » du résumé, reprise telle quelle.
 */
export interface CritereBase {
  tag: 'objectif' | 'methodes' | 'niveau' | 'sexe';
  valeurs: readonly string[];
  poids: number;
  requis?: boolean;
  ecarteSiDifferent?: boolean;
}
export const BASES: readonly { id: string; label: string; criteres: readonly CritereBase[] }[] = [
  {
    id: 'force-explosivite',
    label: 'Force + explosivité',
    criteres: [
      {
        tag: 'objectif',
        valeurs: [
          'Devenir plus fort',
          'Améliorer explosivité / vitesse / qualités athlétiques',
          'Préparation à un sport ou une épreuve',
        ],
        poids: 3,
        requis: true,
      },
      { tag: 'methodes', valeurs: ['Musculation', 'Entraînement fonctionnel'], poids: 1 },
      { tag: 'niveau', valeurs: ['intermédiaire', 'avancé'], poids: 1 },
    ],
  },
  {
    id: 'prise-de-masse',
    label: 'Prise de masse',
    criteres: [
      { tag: 'objectif', valeurs: ['Prendre du muscle'], poids: 3, requis: true },
      { tag: 'methodes', valeurs: ['Musculation'], poids: 2 },
    ],
  },
  {
    id: 'perte-de-poids-homme',
    label: 'Perte de poids (profil homme)',
    criteres: [
      {
        tag: 'objectif',
        valeurs: ['Perdre du poids / de la masse grasse'],
        poids: 3,
        requis: true,
      },
      {
        tag: 'methodes',
        valeurs: [
          'Musculation',
          'Circuit training',
          'Cardio',
          'Entraînement fonctionnel',
          'Poids du corps (sans matériel)',
        ],
        poids: 1,
      },
      { tag: 'sexe', valeurs: ['Homme'], poids: 1, ecarteSiDifferent: true },
    ],
  },
  {
    id: 'perte-de-poids-femme',
    label: 'Perte de poids (profil femme)',
    criteres: [
      {
        tag: 'objectif',
        valeurs: ['Perdre du poids / de la masse grasse'],
        poids: 3,
        requis: true,
      },
      {
        tag: 'methodes',
        valeurs: [
          'Musculation',
          'Circuit training',
          'Cardio',
          'Entraînement fonctionnel',
          'Poids du corps (sans matériel)',
        ],
        poids: 1,
      },
      { tag: 'sexe', valeurs: ['Femme'], poids: 1, ecarteSiDifferent: true },
    ],
  },
  {
    id: 'pilates',
    label: 'Pilates',
    criteres: [
      { tag: 'methodes', valeurs: ['Pilates'], poids: 4, requis: true },
      {
        tag: 'objectif',
        valeurs: [
          'Perdre du poids / de la masse grasse',
          'Me renforcer musculairement (sans viser la prise de masse)',
          'Améliorer ma mobilité / ma posture',
          'Santé / bien-être',
        ],
        poids: 1,
      },
    ],
  },
];

/** Les textes affichés hors questions, mot pour mot. */
export const TEXTES = {
  titre: 'Bilan sportif et nutrition',
  chapeau:
    "Quelques questions pour construire un programme d'entraînement et un plan alimentaire adaptés à toi. Compte 10 à 15 minutes. À la fin, tu récupères un résumé à envoyer à ton coach.",
  avertissement:
    "En cas de problème cardiaque ou respiratoire connu, de douleur persistante, de malaise à l'effort, de grossesse, d'accouchement récent ou de blessure importante, demande l'avis d'un médecin avant de commencer ou de reprendre.",
  prenom: 'Ton prénom',
  profil: 'Quel profil te ressemble le plus ?',
  situation: 'Une situation particulière ?',
  situationAide:
    "Coche ce qui te concerne. Certaines situations ne sont pas encore prises en charge dans cette version : coche-les quand même, pour qu'on le sache.",
  consentement:
    "J'accepte que mes réponses, y compris mes informations de santé, soient utilisées pour construire mon programme. Elles restent dans ton téléphone jusqu'à ce que tu les envoies. En les envoyant, tu les transmets à Guillaume (g.descrosses@hotmail.fr), qui les utilise uniquement pour construire ton programme, avec l'aide d'un outil d'intelligence artificielle. Tu peux demander à tout moment leur suppression en écrivant à cette adresse.",
  consentementErreur: 'Ton accord est nécessaire pour continuer.',
  profilErreur: 'Choisis le profil qui te ressemble le plus.',
  commencer: 'Commencer',
  obligatoires:
    "Les questions marquées d'une étoile (*) sont nécessaires pour construire ton programme. Les autres sont facultatives.",
  reponseNecessaire: 'Cette réponse est nécessaire pour continuer.',
  retour: 'Retour',
  suivant: 'Suivant',
  voirResume: 'Voir mon résumé',
  autre: 'Précise : autre',
  autreExercice: 'Autre exercice (facultatif)',
  choisir: 'Choisir',
  termine: 'Terminé',
  modules: { 1: 'Tronc commun', 2: 'Performance', 3: 'Situation particulière' },
  arretRougeTitre: 'Avant de poursuivre',
  arretHorsTitre: "Cette version ne peut pas encore t'accueillir",
  arretRouge:
    "Une de tes réponses indique une situation pour laquelle ce questionnaire ne permet pas de construire automatiquement un programme adapté en toute sécurité. Le questionnaire s'arrête donc ici pour le moment.",
  arretHorsDebut: "D'après tes réponses (",
  arretHorsFin:
    '), ce questionnaire ne permet pas, pour le moment, de construire un programme adapté en toute sécurité.',
  arretRougeSuite:
    "Cela ne signifie pas que tu ne peux pas pratiquer une activité physique, mais ta situation nécessite d'abord un avis approprié. Pour ce type de symptômes, il est recommandé d'en parler à un médecin. Tu pourras refaire le questionnaire ensuite si ta situation entre dans le périmètre du programme.",
  arretHorsSuite:
    'Cela ne signifie pas que tu ne peux pas pratiquer une activité physique : ta situation demande un accompagnement adapté, que cette version ne fournit pas encore.',
  arretContact:
    'Une question sur le fonctionnement de ce questionnaire ? Écris à g.descrosses@hotmail.fr.',
  modifier: 'Modifier mes réponses',
  effacer: 'Effacer mes réponses',
  effacerConfirmation: 'Effacer toutes tes réponses de ce téléphone ?',
  finDebut: 'Merci ',
  finFin: ", c'est terminé",
  finComplet:
    "Relis ton résumé. Par e-mail, le message s'ouvre avec ton résumé déjà dedans : appuie sur envoyer. Par WhatsApp, le résumé est copié : colle-le dans le message (appui long, puis « Coller »), puis envoie.",
  finCourt:
    'Relis ton résumé. En appuyant sur WhatsApp ou e-mail, il est copié automatiquement : colle-le dans le message (appui long, puis « Coller »), puis envoie.',
  envoyerEmail: 'Envoyer par e-mail',
  envoyerWhatsapp: 'Envoyer par WhatsApp',
  copierSeulement: 'Copier le résumé seulement',
  copie: 'Résumé copié. Colle-le dans le message, puis envoie.',
  copieAussi: 'Résumé aussi copié, au cas où.',
  copieManuelle: 'Sélectionne le texte et copie-le à la main.',
  recommencer: 'Recommencer',
  recommencerConfirmation: 'Effacer toutes les réponses et recommencer ?',
} as const;

/** L'envoi au coach, comme sur le site. */
export const ENVOI = {
  email: 'g.descrosses@hotmail.fr',
  whatsapp: '33699906737',
  sujet: 'Bilan sportif et nutrition : ',
  bonjour: 'Bonjour, voici mon bilan sportif et nutrition',
  colle: ' Je colle le résumé ci-dessous :\n\n',
  /** Au-delà, l'e-mail ne porte que l'introduction (limite des liens mailto). */
  limiteMailto: 6000,
} as const;
