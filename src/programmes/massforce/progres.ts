/**
 * MASS FORCE — l'écran Progrès (« go code progrès FORCE », 27 novembre,
 * maquette validée par Guillaume).
 *
 * Fonction PURE : elle ne lit que ce que la base a déjà enregistré — le choix
 * du matériel, les références du combiné, les séries brutes du cycle. Rien
 * n'est calculé ici qui ne le soit déjà pour la séance : la « prochaine
 * séance » est `chargePour`, la séance passée est `classer`. Une même cible
 * ne peut donc pas différer entre la séance et le Progrès.
 *
 * Ce que l'écran n'invente pas :
 * - push press : le programme ne donne pas de % — seules les charges réelles ;
 * - un test sous-maximal seul n'est jamais converti en 1RM (aucune formule
 *   validée) : pas de %, et l'écran le dit.
 */
import type { ReferenceForceRow, SetRow } from '../../db/db';
import { VARIANTES } from '../../data/combineMass';
import { COMBINE_MASS_FORCE } from '../../data/combineMass';
import type { ChargeCible } from '../../engine/getSession';
import { historiqueReferences } from '../../engine/references';
import { chargePour, FOURCHETTES_FORCE } from './charges';
import { optionChoisie, type ChoixForce } from './depart';
import { classer, passagesDe, repsPrescrites, type Classement } from './progression';
import { SEANCES_FORCE } from './seances';
import { SEMAINES_FORCE, type FourchettePct, type LigneForce } from './types';

/** Le résultat d'une séance, tel que l'écran l'écrit. */
export type ResultatSeance = 'reussie' | 'echec' | 'incomplete' | 'sous-cible' | 'sans-cible';

export interface SeanceProgres {
  semaine: number;
  jour: number;
  /** La charge la plus basse des séries faites (celle que `classer` juge). */
  kg: number | null;
  series: number;
  reps: number[];
  ratees: number;
  /** Le RIR de la dernière série, s'il a été saisi. */
  rir: number | null;
  /** La charge en % du 1RM que la séance portait ; `null` sans cible. */
  pctReel: number | null;
  resultat: ResultatSeance;
}

export interface MouvementProgres {
  cle: string;
  /** « Développé couché », comme le combiné le nomme. */
  nom: string;
  materiel: string;
  /** Le test le plus récent de ce mouvement, à CE matériel. */
  reference: ReferenceForceRow | null;
  fourchette: FourchettePct | null;
  /** La cible de la prochaine séance ; `null` : charge libre (push press). */
  prochaine: ChargeCible | null;
  /** Les 4 semaines faites pour ce mouvement : plus de prochaine séance. */
  cycleTermine: boolean;
  /** Aucune séance faite encore. */
  premiere: boolean;
  seances: SeanceProgres[];
}

const derniereSemaine = SEMAINES_FORCE[SEMAINES_FORCE.length - 1]!;

const RESULTAT: Record<Classement, ResultatSeance> = {
  reussite: 'reussie',
  'a-confirmer': 'reussie',
  dure: 'reussie',
  echec: 'echec',
  incomplete: 'incomplete',
  'sous-charge': 'sous-cible',
};

/** Les lignes des mouvements évalués au combiné, dans l'ordre de la semaine. */
export function lignesEvaluees(): LigneForce[] {
  return SEANCES_FORCE.flatMap((s) => s.lignes).filter((l) => l.testLibelle !== 'Aucun');
}

export function progresForce(input: {
  choix: ChoixForce | undefined;
  references: readonly ReferenceForceRow[];
  series: readonly SetRow[];
}): MouvementProgres[] {
  return lignesEvaluees().map((ligne) => {
    const option = optionChoisie(ligne, input.choix);
    const test = option.test;
    const nom = COMBINE_MASS_FORCE.find((c) => c.exercice === test?.exercice)?.nom ?? ligne.libelle;
    const materiel = test === undefined ? ligne.materiel : VARIANTES[test.variante];
    const reference =
      test === undefined
        ? null
        : (historiqueReferences(input.references, test.exercice, test.variante)[0] ?? null);
    const fourchette = FOURCHETTES_FORCE[option.id] ?? null;

    const passages = passagesDe(input.series, option.id, Number.POSITIVE_INFINITY);
    const prescrit = { series: ligne.series, reps: repsPrescrites(ligne) };
    const seances = passages.map((p): SeanceProgres => {
      const faites = p.series.filter((s) => s.reps !== null);
      const kgs = faites.map((s) => s.kg).filter((k): k is number => k !== null);
      const kg = kgs.length === 0 ? null : Math.min(...kgs);
      const avecCible = p.pct !== null && p.kgCible !== null;
      const ancre = avecCible ? ((p.kgCible as number) * 100) / (p.pct as number) : null;
      return {
        semaine: p.semaine,
        jour: p.jour,
        kg,
        series: faites.length,
        reps: faites.map((s) => s.reps as number),
        ratees: faites.filter((s) => s.failed).length,
        rir: faites.at(-1)?.rir ?? null,
        pctReel: ancre === null || kg === null ? null : Math.round((kg / ancre) * 1000) / 10,
        resultat: avecCible ? RESULTAT[classer(p, prescrit, ancre as number)] : 'sans-cible',
      };
    });

    // La prochaine séance suit les séances FAITES, pas le calendrier.
    const semaineSuivante = (passages.at(-1)?.semaine ?? SEMAINES_FORCE[0]! - 1) + 1;
    const cycleTermine = semaineSuivante > derniereSemaine;
    const prochaine = cycleTermine
      ? null
      : chargePour(ligne, option, input.references, semaineSuivante, input.series);

    return {
      cle: ligne.cle,
      nom,
      materiel,
      reference,
      fourchette,
      prochaine,
      cycleTermine,
      premiere: passages.length === 0,
      seances,
    };
  });
}
