/**
 * La semaine de repas automatique (`regles-repas-automatiques.md`) — lot 2
 * de la nutrition automatique. Pur : aucune base, aucun React.
 *
 * Deux fonctions font tout :
 * - `ajusterRepas` met un repas de la bibliothèque à la part d'une cible
 *   (§2 : deux leviers, bornés, arrondis) ;
 * - `composerSemaine` choisit les repas des 7 jours (§3 : sans hasard) et
 *   les ajuste.
 *
 * Ce qu'elle rend est un plan ordinaire (`JourneePerso`) : l'écran « Mon
 * plan » le lit, le modifie et l'additionne comme n'importe quel plan, et
 * la vignette du plat reste tant que ses ingrédients y sont
 * (`repasReconnu`).
 */

import {
  BIBLIOTHEQUE_REPAS,
  repasPourCreneau,
  type RepasBibliotheque,
} from '../data/bibliothequeRepas';
import type { CiblesNutrition } from '../data/ciblesNutrition';
import { cibleSaisie } from '../data/ciblesNutrition';
import {
  groupeDeFamille,
  type JourneePerso,
  type LignePerso,
  type RepasId,
} from '../data/planPerso';
import { ARRONDIS, CRENEAUX_AUTO, LEVIERS, TOLERANCE_PART } from '../data/reglesRepasAutomatiques';
import { repasExclu } from './exclusionsRepas';
import { macrosDeLigne, type Catalogue } from './planPersoTotaux';

/** Ce que les quantités visent : calories obligatoires, protéines si posées. */
export interface CibleRepas {
  kcal: number;
  proteinG: number | null;
}

/** La semaine enregistrée : 7 journées, 0 = lundi. */
export interface SemaineRepas {
  jours: readonly JourneePerso[];
  /** La cible sur laquelle les quantités ont été ajustées. */
  cible: CibleRepas;
  /** AAAA-MM-JJ. */
  creeLe: string;
}

const borne = (x: number, b: { min: number; max: number }) => Math.min(Math.max(x, b.min), b.max);

/** §1 — la cible du jour d'entraînement, à défaut celle du repos. */
export function cibleDeSemaine(cibles: CiblesNutrition | null): CibleRepas | null {
  const c = cibleSaisie(cibles?.train) ?? cibleSaisie(cibles?.rest);
  return c === null ? null : { kcal: c.kcal, proteinG: c.proteinG };
}

/** La part d'un créneau, ou `null` si l'appli ne le compose pas. */
export function partDe(repas: RepasId): number | null {
  return CRENEAUX_AUTO.find((c) => c.repas === repas)?.part ?? null;
}

function estProteique(foodId: string, catalogue: Catalogue): boolean {
  const f = catalogue[foodId];
  return f !== undefined && groupeDeFamille(f.category) === 'proteines';
}

function arrondir(qty: number, unite: string): number {
  const a = ARRONDIS[unite] ?? ARRONDIS.g!;
  return Math.max(a.min, Math.round(qty / a.pas) * a.pas);
}

/** kcal et protéines d'une liste de lignes. */
function pese(lignes: readonly LignePerso[], catalogue: Catalogue) {
  return lignes.reduce(
    (t, l) => {
      const m = macrosDeLigne(l, catalogue);
      return { kcal: t.kcal + m.kcal, proteinG: t.proteinG + m.proteinG };
    },
    { kcal: 0, proteinG: 0 },
  );
}

type Pesee = { kcal: number; proteinG: number };

/**
 * Les deux facteurs, calories d'abord : la solution exacte (calories ET
 * protéines), bornée ; si un levier bute, l'autre rattrape les calories.
 */
function resoudre(
  vise: Pesee,
  p: Pesee,
  r: Pesee,
  avecProteines: boolean,
): { a: number; b: number } {
  const det = p.kcal * r.proteinG - r.kcal * p.proteinG;
  if (avecProteines && p.kcal > 0 && r.kcal > 0 && Math.abs(det) > 1e-6) {
    let a = borne((vise.kcal * r.proteinG - r.kcal * vise.proteinG) / det, LEVIERS.proteines);
    const b = borne((vise.kcal - a * p.kcal) / r.kcal, LEVIERS.reste);
    a = borne((vise.kcal - b * r.kcal) / p.kcal, LEVIERS.proteines);
    return { a, b };
  }
  // Calories seules : un facteur pour tout le repas.
  const total = p.kcal + r.kcal;
  const k = total > 0 ? borne(vise.kcal / total, LEVIERS.reste) : 1;
  return { a: k, b: k };
}

/**
 * §2 — les quantités d'un repas, mises à `part` de la cible.
 *
 * Deux leviers : `a` sur les aliments protéiques, `b` sur le reste. Les
 * aliments À LA PIÈCE (œuf, banane) sont arrondis d'abord — une banane ne
 * descend pas sous 1 — puis les aliments pesés rattrapent l'écart.
 */
export function ajusterRepas(
  repas: RepasBibliotheque,
  part: number,
  cible: CibleRepas,
  catalogue: Catalogue,
): RepasBibliotheque {
  const vise = { kcal: cible.kcal * part, proteinG: (cible.proteinG ?? 0) * part };
  const avecProteines = cible.proteinG !== null;
  const prot = (l: LignePerso) => estProteique(l.foodId, catalogue);
  const piece = (l: LignePerso) => catalogue[l.foodId]?.unit === 'unité';
  const utiles = repas.lignes.filter((l) => catalogue[l.foodId] !== undefined && l.qty !== null);

  // 1er passage : tout le repas, pour fixer les pièces.
  const t = resoudre(
    vise,
    pese(utiles.filter(prot), catalogue),
    pese(
      utiles.filter((l) => !prot(l)),
      catalogue,
    ),
    avecProteines,
  );
  const fixees = new Map<LignePerso, number>();
  for (const l of utiles.filter(piece)) {
    fixees.set(l, arrondir(l.qty! * (prot(l) ? t.a : t.b), 'unité'));
  }
  const poidsFixes = pese(
    [...fixees].map(([l, qty]) => ({ foodId: l.foodId, qty })),
    catalogue,
  );

  // 2e passage : les aliments pesés visent ce qui reste.
  const pesees = utiles.filter((l) => !piece(l));
  const t2 = resoudre(
    { kcal: vise.kcal - poidsFixes.kcal, proteinG: vise.proteinG - poidsFixes.proteinG },
    pese(pesees.filter(prot), catalogue),
    pese(
      pesees.filter((l) => !prot(l)),
      catalogue,
    ),
    avecProteines,
  );

  return {
    ...repas,
    lignes: repas.lignes.map((l) => {
      const f = catalogue[l.foodId];
      if (f === undefined || l.qty === null) return l;
      const qty = fixees.get(l) ?? arrondir(l.qty * (prot(l) ? t2.a : t2.b), f.unit);
      return { foodId: l.foodId, qty };
    }),
  };
}

/** §3 — le repas ajusté tient-il sa part, à la tolérance près ? */
export function tientSaPart(
  ajuste: RepasBibliotheque,
  part: number,
  cible: CibleRepas,
  catalogue: Catalogue,
): boolean {
  const vise = cible.kcal * part;
  return Math.abs(pese(ajuste.lignes, catalogue).kcal / vise - 1) <= TOLERANCE_PART;
}

/**
 * §3 — l'écart aux protéines du repas ajusté, par tranches de 10 % de sa
 * part (0 = à moins de 5 %). Sans protéines dans la cible : 0 partout.
 */
function ecartProteines(
  r: RepasBibliotheque,
  part: number,
  cible: CibleRepas,
  catalogue: Catalogue,
): number {
  if (cible.proteinG === null || cible.proteinG <= 0) return 0;
  const vise = cible.proteinG * part;
  const p = pese(ajusterRepas(r, part, cible, catalogue).lignes, catalogue).proteinG;
  return Math.round(Math.abs(p / vise - 1) * 10);
}

/** Part des aliments du repas que la personne a déclarés (0 à 1). */
function scoreDe(repas: RepasBibliotheque, preferes: ReadonlySet<string>): number {
  if (repas.lignes.length === 0) return 0;
  return repas.lignes.filter((l) => preferes.has(l.foodId)).length / repas.lignes.length;
}

/** §3 — les identifiants des repas choisis, jour par jour, créneau par créneau. */
export function choisirRepasSemaine(
  preferes: readonly string[],
  cible: CibleRepas,
  catalogue: Catalogue,
  /** §4 — les aliments que la personne ne mange pas. */
  exclus: ReadonlySet<string> = new Set(),
): readonly Partial<Record<RepasId, string>>[] {
  const aime = new Set(preferes);
  const servis = new Map<string, number>();
  const ordre = new Map(BIBLIOTHEQUE_REPAS.map((r, i) => [r.id, i]));
  const jours: Partial<Record<RepasId, string>>[] = [];

  for (let j = 0; j < 7; j++) {
    const jour: Partial<Record<RepasId, string>> = {};
    const aujourdhui = new Set<string>();
    for (const { repas: creneau, part } of CRENEAUX_AUTO) {
      const veille = jours[j - 1]?.[creneau];
      // Un repas qui ne tient pas sa part n'entre pas dans la semaine (il
      // reste dans la bibliothèque) ; à défaut, on relâche les règles une à
      // une plutôt que de laisser le créneau vide.
      // §4 — un repas écarté n'entre jamais, même pour remplir un créneau.
      const tous = repasPourCreneau(creneau).filter((r) => !repasExclu(r, exclus));
      const tenus = tous.filter((r) =>
        tientSaPart(ajusterRepas(r, part, cible, catalogue), part, cible, catalogue),
      );
      const libres = (l: RepasBibliotheque[]) => l.filter((r) => !aujourdhui.has(r.id));
      const pool =
        [
          libres(tenus).filter((r) => r.id !== veille),
          libres(tenus),
          libres(tous).filter((r) => r.id !== veille),
          libres(tous),
        ].find((l) => l.length > 0) ?? tous;
      const ecartP = new Map(pool.map((r) => [r.id, ecartProteines(r, part, cible, catalogue)]));
      const choisi = [...pool].sort(
        (x, y) =>
          ecartP.get(x.id)! - ecartP.get(y.id)! ||
          (servis.get(x.id) ?? 0) - (servis.get(y.id) ?? 0) ||
          scoreDe(y, aime) - scoreDe(x, aime) ||
          ordre.get(x.id)! - ordre.get(y.id)!,
      )[0];
      if (choisi === undefined) continue;
      jour[creneau] = choisi.id;
      aujourdhui.add(choisi.id);
      servis.set(choisi.id, (servis.get(choisi.id) ?? 0) + 1);
    }
    jours.push(jour);
  }
  return jours;
}

/** La semaine complète, quantités ajustées. */
export function composerSemaine(
  cible: CibleRepas,
  preferes: readonly string[],
  catalogue: Catalogue,
  aujourdhui: string,
  exclus: ReadonlySet<string> = new Set(),
): SemaineRepas {
  const parId = new Map(BIBLIOTHEQUE_REPAS.map((r) => [r.id, r]));
  const jours = choisirRepasSemaine(preferes, cible, catalogue, exclus).map((choix) => {
    const journee: Partial<Record<RepasId, readonly LignePerso[]>> = {};
    for (const { repas: creneau, part } of CRENEAUX_AUTO) {
      const r = parId.get(choix[creneau] ?? '');
      if (r !== undefined) journee[creneau] = ajusterRepas(r, part, cible, catalogue).lignes;
    }
    return journee as JourneePerso;
  });
  return { jours, cible, creeLe: aujourdhui };
}

/** La cible a-t-elle changé depuis que la semaine a été composée ? */
export function cibleAChange(semaine: SemaineRepas, actuelle: CibleRepas | null): boolean {
  return (
    actuelle !== null &&
    (actuelle.kcal !== semaine.cible.kcal || actuelle.proteinG !== semaine.cible.proteinG)
  );
}

/** Le jour de la semaine d'une date AAAA-MM-JJ, 0 = lundi. */
export function jourDeSemaine(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  return (new Date(Date.UTC(y!, m! - 1, d!)).getUTCDay() + 6) % 7;
}

/**
 * Les repas COCHÉS « mangé » (Guillaume, 26 novembre : cocher un repas fait,
 * plutôt que de le ressaisir dans « Ce que j'ai mangé »). Ils vivent dans le
 * journal des repas pris (`mealLog`), sous une clé préfixée : aucun
 * identifiant du plan historique ne peut s'y confondre.
 */
const PREFIXE_FAIT = 'semaine:';

export const cleRepasFait = (repas: RepasId): string => `${PREFIXE_FAIT}${repas}`;

/** Les créneaux cochés, parmi les repas pris d'une date. */
export function repasFaits(pris: ReadonlySet<string>): Set<RepasId> {
  const out = new Set<RepasId>();
  for (const id of pris) {
    if (id.startsWith(PREFIXE_FAIT)) out.add(id.slice(PREFIXE_FAIT.length) as RepasId);
  }
  return out;
}

/** Ce que pèsent les repas cochés d'une journée — tels qu'ils sont à l'écran. */
export function mangeDesRepas(
  journee: JourneePerso,
  faits: ReadonlySet<RepasId>,
  catalogue: Catalogue,
): { kcal: number; proteinG: number; carbsG: number; fatG: number } {
  const t = { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 };
  for (const repas of faits) {
    for (const l of journee[repas] ?? []) {
      const m = macrosDeLigne(l, catalogue);
      t.kcal += m.kcal;
      t.proteinG += m.proteinG;
      t.carbsG += m.carbsG;
      t.fatG += m.fatG;
    }
  }
  return t;
}
