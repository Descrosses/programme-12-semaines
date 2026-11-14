/**
 * MASS FORCE — le départ : les choix du cycle, et le passage par le combiné.
 * Fonctions pures, sans base ni React.
 *
 * Deux conditions pour ouvrir les séances (décisions de Guillaume) :
 * 1. les choix du cycle sont faits — matériel et variantes, une fois pour
 *    tout le cycle ;
 * 2. le combiné a fourni une référence pour CHAQUE mouvement évalué, AVEC LE
 *    MATÉRIEL CHOISI. Une référence à la barre ne débloque pas un cycle à la
 *    Smith : rien n'est transposé d'un matériel à l'autre.
 */
import type { ReferenceForceRow } from '../../db/db';
import { COMBINE_MASS_FORCE } from '../../data/combineMass';
import { referenceCourante } from '../../engine/references';
import { SEANCES_FORCE } from './seances';
import type { LigneForce, OptionForce } from './types';

/** Le choix du cycle : clé de ligne → identifiant de l'option retenue. */
export type ChoixForce = Readonly<Record<string, string>>;

/** L'option retenue pour une ligne : celle du choix, sinon la première. */
export function optionChoisie(ligne: LigneForce, choix: ChoixForce | undefined): OptionForce {
  const id = choix?.[ligne.cle];
  return ligne.options.find((o) => o.id === id) ?? ligne.options[0]!;
}

/** Les lignes qui offrent un choix, dans l'ordre des séances. */
export function lignesAChoix(): LigneForce[] {
  return SEANCES_FORCE.flatMap((s) => s.lignes.filter((l) => l.options.length > 1));
}

/** Le choix par défaut : la première option de chaque ligne à choix. */
export function choixParDefaut(): Record<string, string> {
  return Object.fromEntries(lignesAChoix().map((l) => [l.cle, l.options[0]!.id]));
}

export interface TestRequis {
  exercice: string;
  variante: string;
  /** « Développé couché », tel que le combiné le nomme. */
  nom: string;
}

/** Les tests du combiné que CES choix rendent nécessaires, sans doublon. */
export function testsRequis(choix: ChoixForce | undefined): TestRequis[] {
  const vus = new Map<string, TestRequis>();
  for (const s of SEANCES_FORCE) {
    for (const l of s.lignes) {
      const t = optionChoisie(l, choix).test;
      if (t === undefined) continue;
      const nom = COMBINE_MASS_FORCE.find((c) => c.exercice === t.exercice)?.nom ?? t.exercice;
      vus.set(`${t.exercice}|${t.variante}`, { exercice: t.exercice, variante: t.variante, nom });
    }
  }
  return [...vus.values()];
}

export interface EtatDepart {
  /** Les choix du cycle ont-ils été confirmés ? */
  choixFaits: boolean;
  /** Les tests requis sans référence pour le matériel choisi. */
  manquants: TestRequis[];
  /** Les séances peuvent-elles s'ouvrir ? */
  pret: boolean;
}

export function etatDepart(
  choix: ChoixForce | undefined,
  references: readonly ReferenceForceRow[],
): EtatDepart {
  const manquants = testsRequis(choix).filter(
    (t) => referenceCourante(references, t.exercice, t.variante) === null,
  );
  const choixFaits = choix !== undefined;
  return { choixFaits, manquants, pret: choixFaits && manquants.length === 0 };
}

/**
 * Un choix complet et valide : chaque ligne à choix a une option, et chaque
 * option existe. `null` si tout va bien, sinon la phrase à afficher.
 */
export function erreurChoix(choix: ChoixForce): string | null {
  for (const l of lignesAChoix()) {
    const id = choix[l.cle];
    if (id === undefined) return `Choix manquant : ${l.libelle}.`;
    if (!l.options.some((o) => o.id === id)) return `Choix inconnu pour ${l.libelle} : ${id}.`;
  }
  const connues = new Set(lignesAChoix().map((l) => l.cle));
  const intrus = Object.keys(choix).find((k) => !connues.has(k));
  return intrus === undefined ? null : `Ligne inconnue : ${intrus}.`;
}
