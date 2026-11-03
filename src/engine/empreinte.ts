/**
 * L'empreinte du programme : tout ce que le moteur prescrit, en un seul texte.
 *
 * ── Pourquoi elle existe ───────────────────────────────────────────────────
 *
 * La transformation en plateforme Dcross-fit déplace le programme, la base de
 * données et la navigation. Aucune de ces trois choses ne doit changer UNE
 * SEULE charge, et personne ne peut le vérifier à l'œil : il y a des milliers
 * de cases, et une erreur de 2,5 kg en semaine 9 ne se voit qu'en semaine 9,
 * trop tard.
 *
 * L'empreinte résout donc toutes les séances du programme, dans plusieurs
 * états de l'utilisateur, et les sérialise. Le fichier qui en résulte est
 * commité. `empreinte.test.ts` le recalcule à chaque exécution et compare.
 * Si une seule ligne bouge, le test échoue et montre laquelle.
 *
 * ── Ce qu'elle couvre ──────────────────────────────────────────────────────
 *
 * Pas seulement les charges : le titre de la séance, sa durée calculée, son
 * intensité, la présence d'un échauffement, les notes ajoutées par les règles,
 * les exercices suspendus, les séries, les répétitions, les temps de repos et
 * les cibles de RPE. Une fonctionnalité qui disparaît en silence fait bouger
 * au moins une de ces lignes.
 *
 * ── Les valeurs de 1RM utilisées ───────────────────────────────────────────
 *
 * Elles sont volontairement rondes et fausses — 100, 80, 120, 20. Ce ne sont
 * pas les maxima de Guillaume : ses performances n'ont rien à faire dans un
 * fichier de test, et une empreinte doit rester lisible par quelqu'un d'autre.
 * Seuls les RAPPORTS comptent ici, pas les kilos.
 */

import type { DayIndex, WeekIndex } from '../data/types';
import { POWER12 } from '../programmes/power12';
import { readiness } from './readiness';
import { DEFAULT_SETTINGS, type SessionContext, type Settings } from './types';

/** Maxima de référence, ronds et anonymes. Voir l'en-tête. */
const MAXIMA: Settings['oneRM'] = {
  'back-squat': 100,
  'bench-press': 80,
  deadlift: 120,
  'weighted-pullup': 20,
};

const REFERENCE_SAUT_CM = 225;

function reglages(patch: Partial<Settings>): Settings {
  return { ...DEFAULT_SETTINGS, ...patch };
}

/** Un état d'utilisateur à photographier. */
export interface Contexte {
  nom: string;
  ctx: SessionContext;
}

/*
 * Les cinq états retenus.
 *
 * Ils ne sont pas pris au hasard : chacun protège une règle qu'une refonte
 * pourrait casser sans bruit.
 *
 * 1. Installation neuve  — le programme tel qu'il sort de la boîte.
 * 2. Maxima renseignés   — la table des charges en pourcentage du 1RM (§9).
 * 3. Tableau d'origine   — le drapeau qui préserve la table historique.
 * 4. Forme orange        — les adaptations du §11, cas intermédiaire.
 * 5. Forme rouge         — les adaptations du §11, cas le plus intrusif.
 *
 * L'historique reste vide partout : le recalage proportionnel a ses propres
 * tests, et une empreinte qui dépendrait d'un historique inventé mélangerait
 * deux sujets.
 */
export const CONTEXTES: Contexte[] = [
  {
    nom: 'installation neuve',
    ctx: { settings: DEFAULT_SETTINGS, history: {}, readiness: null, explosiveDecline: false },
  },
  {
    nom: 'maxima renseignés',
    ctx: {
      settings: reglages({ oneRM: MAXIMA, broadJumpBaselineCm: REFERENCE_SAUT_CM }),
      history: {},
      readiness: null,
      explosiveDecline: false,
    },
  },
  {
    nom: 'tableau d’origine',
    ctx: {
      settings: reglages({
        oneRM: MAXIMA,
        broadJumpBaselineCm: REFERENCE_SAUT_CM,
        tableauOrigine: true,
      }),
      history: {},
      readiness: null,
      explosiveDecline: false,
    },
  },
  {
    nom: 'forme orange',
    ctx: {
      settings: reglages({ oneRM: MAXIMA, broadJumpBaselineCm: REFERENCE_SAUT_CM }),
      history: {},
      readiness: readiness(REFERENCE_SAUT_CM, 218),
      explosiveDecline: false,
    },
  },
  {
    nom: 'forme rouge',
    ctx: {
      settings: reglages({ oneRM: MAXIMA, broadJumpBaselineCm: REFERENCE_SAUT_CM }),
      history: {},
      readiness: readiness(REFERENCE_SAUT_CM, 198),
      explosiveDecline: true,
    },
  },
];

const JOURS = [0, 1, 2, 3, 4, 5, 6] as const;

/** Une valeur absente s'écrit toujours pareil : jamais 0, jamais vide. */
function ou(valeur: number | null | undefined): string {
  return valeur === null || valeur === undefined ? '—' : String(valeur);
}

/**
 * Le texte d'un seul contexte.
 *
 * Une ligne par exercice, une ligne par séance, rien d'autre. Le format est
 * fait pour le `diff` : préfixe stable à gauche, valeurs à droite.
 */
function empreinteContexte(c: Contexte): string[] {
  const lignes: string[] = [`### ${c.nom}`];

  /*
   * L'empreinte passe par le MODULE de programme, et non plus par le moteur
   * directement. C'est ce qui lui donne son second rôle : elle ne vérifie plus
   * seulement que les règles n'ont pas bougé, elle vérifie que la couture
   * posée au-dessus du moteur ne change rien à ce qu'il répond.
   */
  for (const semaine of POWER12.semaines) {
    for (const jour of JOURS) {
      const s = POWER12.getSession(semaine as WeekIndex, jour as DayIndex, c.ctx);
      if (s === null || s === undefined || s.exercises.length === 0) continue;

      lignes.push(
        [
          `S${semaine}J${jour}`,
          'séance',
          s.title,
          `bloc=${s.blockName}`,
          `intensité=${s.intensity}`,
          `durée=${s.plannedMin}min`,
          `échauffement=${s.warmup === null ? 'non' : 'oui'}`,
          `test=${s.readinessTest ? 'oui' : 'non'}`,
          `notes=${s.notes.length}`,
          `suspendus=${s.suspended.map((x) => x.id).join('+') || '—'}`,
        ].join(' | '),
      );

      for (const ex of s.exercises) {
        lignes.push(
          [
            `S${semaine}J${jour}`,
            ex.id,
            ex.loadLine,
            `séries=${ex.sets}`,
            `travail=${JSON.stringify(ex.work)}`,
            `kg=${ou(ex.load.kg)}`,
            `kgMax=${ou(ex.load.kgMax)}`,
            `source=${ex.load.source}`,
            `repos=${ex.restSec}s`,
            `rpe=${ou(ex.targetRPE?.min)}-${ou(ex.targetRPE?.max)}`,
            `superset=${ex.superset ?? '—'}`,
            `contraste=${ex.contrast === undefined ? '—' : `${ex.contrast.explosive}×${ex.contrast.explosiveReps}`}`,
          ].join(' | '),
        );
      }
    }
  }

  return lignes;
}

/** Le texte complet, celui qui est commité et comparé. */
export function empreinte(contextes: Contexte[] = CONTEXTES): string {
  const corps = contextes.flatMap((c) => [...empreinteContexte(c), '']);
  return corps.join('\n');
}

/** Le nombre de lignes de prescription, hors en-têtes et lignes vides. */
export function compterLignes(texte: string): number {
  return texte.split('\n').filter((l) => l !== '' && !l.startsWith('###')).length;
}
