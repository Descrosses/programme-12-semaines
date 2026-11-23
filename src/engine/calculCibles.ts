/**
 * Le calcul des cibles nutritionnelles (`regles-cibles-nutrition.md`). Pur :
 * aucune base, aucun React.
 *
 * Il rend TOUJOURS le détail de chaque étape, pour qu'on lise d'où vient le
 * chiffre — une cible est une estimation, jamais une mesure (§0). Il dit
 * aussi si la cible pourrait être PROPOSÉE à la personne : jamais dans les
 * cas du §6 (exclusions, sous un plancher). Le coach, lui, voit tout et
 * décide.
 */

import {
  ACTIVITE_QUOTIDIENNE,
  AGE_MIN,
  AJUSTEMENT,
  ARRONDI,
  COEFFICIENT_MAX,
  GLUCIDES_ALERTE_G_KG,
  IMC_MIN_PERTE,
  IMC_POIDS_REFERENCE,
  LIPIDES,
  PAR_SEANCE,
  PLANCHERS_KCAL,
  PROTEINES_G_KG,
  SEANCES_MAX,
  type DureeSeance,
  type Objectif,
  type Pas,
  type Rythme,
  type Travail,
} from '../data/reglesCiblesNutrition';

export interface ProfilCalcul {
  sexe: 'homme' | 'femme';
  age: number;
  tailleCm: number;
  poidsKg: number;
  travail: Travail;
  pas: Pas;
  /** « 0 » à « 5 », ou « 6+ ». */
  seances: string;
  /** Exigée dès qu'il y a au moins une séance. */
  duree: DureeSeance | null;
  objectif: Objectif;
  /** Exigé hors maintien. */
  rythme: Rythme | null;
  /** Réponses de sécurité du questionnaire (`null` = non renseigné). */
  grossesse: string | null;
  maladie: string | null;
  relation: string | null;
}

export interface EtapeCalcul {
  libelle: string;
  calcul: string;
  resultat: string;
}

export interface ResultatCibles {
  kcal: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
  etapes: EtapeCalcul[];
  /** §6 — pourquoi l'appli ne proposerait PAS ce calcul à la personne. */
  exclusions: string[];
  /** Ce qui mérite un coup d'œil (glucides bas, plancher). */
  alertes: string[];
  /** La cible pourrait-elle être proposée telle quelle à la personne ? */
  proposable: boolean;
}

/** Arrondi au pas, la moitié vers le haut ; tolère le bruit des flottants. */
export function arrondi(x: number, pas: number): number {
  return Math.round(x / pas + 1e-9) * pas;
}

const fr = (n: number, d = 1) =>
  n.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: d });

export function imc(p: Pick<ProfilCalcul, 'poidsKg' | 'tailleCm'>): number {
  const m = p.tailleCm / 100;
  return p.poidsKg / (m * m);
}

/** §5 — le poids qui sert aux g/kg : le réel, ou celui d'un IMC de 25 au-delà de 30. */
export function poidsDeReference(p: Pick<ProfilCalcul, 'poidsKg' | 'tailleCm'>): number {
  if (imc(p) < IMC_POIDS_REFERENCE.seuil) return p.poidsKg;
  const m = p.tailleCm / 100;
  return m * m * IMC_POIDS_REFERENCE.reference;
}

/** §2 — Mifflin-St Jeor. */
export function depenseAuRepos(
  p: Pick<ProfilCalcul, 'sexe' | 'poidsKg' | 'tailleCm' | 'age'>,
): number {
  return 10 * p.poidsKg + 6.25 * p.tailleCm - 5 * p.age + (p.sexe === 'homme' ? 5 : -161);
}

/** §3 — coefficient d'activité, plafonné. */
export function coefficient(p: Pick<ProfilCalcul, 'travail' | 'pas' | 'seances' | 'duree'>): {
  quotidien: number;
  entrainement: number;
  total: number;
} {
  const quotidien = ACTIVITE_QUOTIDIENNE[p.travail][p.pas];
  const n = p.seances === '6+' ? SEANCES_MAX : Math.min(Number(p.seances) || 0, SEANCES_MAX);
  const entrainement = n > 0 && p.duree !== null ? n * PAR_SEANCE[p.duree] : 0;
  return { quotidien, entrainement, total: Math.min(quotidien + entrainement, COEFFICIENT_MAX) };
}

/** §4 — ajustement selon l'objectif et le rythme. */
export function ajustement(objectif: Objectif, rythme: Rythme | null): number {
  if (objectif === 'maintien' || rythme === null) return 0;
  return AJUSTEMENT[objectif][rythme];
}

/** §6 — les raisons de ne pas proposer de calcul à la personne. */
export function exclusions(p: ProfilCalcul): string[] {
  const out: string[] = [];
  if (p.grossesse === 'oui') out.push('Grossesse, allaitement ou accouchement récent');
  if (p.maladie === 'oui') out.push('Maladie ou traitement influençant l’alimentation');
  if (p.relation === 'oui' || p.relation === 'oral') {
    out.push('Relation compliquée avec la nourriture (ou à voir de vive voix)');
  }
  if (p.objectif === 'perte' && imc(p) < IMC_MIN_PERTE) {
    out.push(`Perte de poids demandée avec un IMC de ${fr(imc(p))} (sous ${fr(IMC_MIN_PERTE)})`);
  }
  if (p.age < AGE_MIN) out.push(`Moins de ${AGE_MIN} ans`);
  return out;
}

const SIGNES = (x: number) =>
  x > 0 ? `+ ${fr(x * 100, 0)} %` : x < 0 ? `− ${fr(-x * 100, 0)} %` : '0 %';

/** Le calcul complet, étape par étape. */
export function calculerCibles(p: ProfilCalcul): ResultatCibles {
  const repos = depenseAuRepos(p);
  const coef = coefficient(p);
  const totale = repos * coef.total;
  const aj = ajustement(p.objectif, p.rythme);
  const kcal = arrondi(totale * (1 + aj), ARRONDI.kcal);

  const ref = poidsDeReference(p);
  const surRef = ref !== p.poidsKg;
  const gKgProt = p.objectif === 'perte' ? PROTEINES_G_KG.perte : PROTEINES_G_KG.defaut;
  const proteinG = arrondi(gKgProt * ref, ARRONDI.macroG);
  const lipPart = (LIPIDES.part * kcal) / 9;
  const lipMin = LIPIDES.minGKg * ref;
  const fatG = arrondi(Math.max(lipPart, lipMin), ARRONDI.macroG);
  const carbsG = arrondi((kcal - proteinG * 4 - fatG * 9) / 4, ARRONDI.macroG);

  const poidsLu = surRef
    ? `${fr(ref)} kg (poids de référence : IMC ${fr(imc(p))} ≥ ${IMC_POIDS_REFERENCE.seuil})`
    : `${fr(p.poidsKg)} kg`;

  const etapes: EtapeCalcul[] = [
    {
      libelle: 'Dépense au repos',
      calcul: `10 × ${fr(p.poidsKg)} + 6,25 × ${fr(p.tailleCm)} − 5 × ${p.age} ${p.sexe === 'homme' ? '+ 5' : '− 161'}`,
      resultat: `${fr(repos, 0)} kcal`,
    },
    {
      libelle: 'Coefficient d’activité',
      calcul:
        coef.entrainement > 0
          ? `${fr(coef.quotidien, 3)} + ${fr(coef.entrainement, 3)}${coef.total < coef.quotidien + coef.entrainement ? ` (plafond ${fr(COEFFICIENT_MAX, 2)})` : ''}`
          : `${fr(coef.quotidien, 3)}`,
      resultat: fr(coef.total, 3),
    },
    {
      libelle: 'Dépense totale',
      calcul: `${fr(repos, 0)} × ${fr(coef.total, 3)}`,
      resultat: `${fr(totale, 0)} kcal`,
    },
    {
      libelle: 'Objectif',
      calcul: `${fr(totale, 0)} ${SIGNES(aj)}`,
      resultat: `${kcal.toLocaleString('fr-FR')} kcal`,
    },
    {
      libelle: 'Protéines',
      calcul: `${fr(gKgProt)} g/kg × ${poidsLu}`,
      resultat: `${proteinG} g`,
    },
    {
      libelle: 'Lipides',
      calcul: `25 % des calories (${fr(lipPart)} g), au moins ${fr(LIPIDES.minGKg)} g/kg (${fr(lipMin)} g)`,
      resultat: `${fatG} g`,
    },
    {
      libelle: 'Glucides',
      calcul: `(${kcal.toLocaleString('fr-FR')} − ${proteinG} × 4 − ${fatG} × 9) / 4`,
      resultat: `${carbsG} g (${fr(carbsG / ref)} g/kg)`,
    },
  ];

  const alertes: string[] = [];
  const plancher = Math.max(PLANCHERS_KCAL[p.sexe], repos);
  const sousPlancher = kcal < plancher;
  if (sousPlancher) {
    alertes.push(
      `Sous le plancher de l’appli (${fr(plancher, 0)} kcal : ${PLANCHERS_KCAL[p.sexe].toLocaleString('fr-FR')} pour ${p.sexe === 'homme' ? 'un homme' : 'une femme'}, ou la dépense au repos) : la cible ne serait pas proposée automatiquement.`,
    );
  }
  if (carbsG < GLUCIDES_ALERTE_G_KG * ref) {
    alertes.push(`Glucides sous ${GLUCIDES_ALERTE_G_KG} g/kg.`);
  }

  const excl = exclusions(p);
  return {
    kcal,
    proteinG,
    fatG,
    carbsG,
    etapes,
    exclusions: excl,
    alertes,
    proposable: excl.length === 0 && !sousPlancher,
  };
}
