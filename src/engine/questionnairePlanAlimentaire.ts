/**
 * Le questionnaire « Votre plan alimentaire » : sa logique, transcrite du
 * site d'origine (`docs/questionnaires/plan-alimentaire/app.js`). Pur : aucun
 * React, aucune base, aucun stockage.
 *
 * Ce qui ne bouge pas par rapport au site, et que le test vérifie en faisant
 * tourner le code d'origine à côté :
 * - les questions demandées selon les réponses (durée et type de sport
 *   seulement avec au moins une séance, rythme seulement hors maintien,
 *   grossesse seulement pour une femme) ;
 * - les messages d'erreur, mot pour mot ;
 * - le RÉSUMÉ envoyé au coach, au caractère près : c'est lui que Guillaume
 *   lit, et sa dernière ligne (« IDENTIFIANTS : … ») est relue par ses
 *   outils.
 *
 * Une réponse absente n'est jamais 0 : elle s'écrit « non renseigné ».
 */

import {
  ALIMENTS,
  CATEGORIES,
  CLES_PROFIL,
  ERREURS,
  ETAPES_PROFIL,
  NOMBRES,
  OPTIONS,
  type CategorieAliments,
  type CleChoix,
  type CleNombre,
  type CleProfil,
  type EtapeProfil,
} from '../data/questionnairePlanAlimentaire';
import { alimentPour } from '../data/questionnaireAliments';

export type Profil = Record<Exclude<CleProfil, 'sportType'>, string | null> & {
  sportType: string[];
};

export interface AlimentAjoute {
  id: string;
  name: string;
  category: CategorieAliments['id'];
  custom: true;
}

/** `intro`, les quatre écrans de profil, les cinq catégories (0 à 4), le récapitulatif, la fin. */
export type Etape = 'intro' | EtapeProfil | number | 'recap' | 'done';

export interface EtatQuestionnaire {
  step: Etape;
  selected: string[];
  customFoods: AlimentAjoute[];
  profile: Profil;
}

const VIDES_TEXTE: readonly CleProfil[] = [
  'age',
  'height',
  'weight',
  'waist',
  'weight4w',
  'allergies',
];

export function profilVide(): Profil {
  const p = {} as Profil;
  for (const k of CLES_PROFIL) {
    if (k === 'sportType') p.sportType = [];
    else p[k] = VIDES_TEXTE.includes(k) ? '' : null;
  }
  return p;
}

export function etatVide(): EtatQuestionnaire {
  return { step: 'intro', selected: [], customFoods: [], profile: profilVide() };
}

// ------------------------------------------------------------ utilitaires --

/** « 72,5 » comme « 72.5 ». `null` si ce n'est pas un nombre. */
export function nombre(v: string | null): number | null {
  const x = parseFloat(String(v).replace(',', '.').trim());
  return Number.isFinite(x) ? x : null;
}

const norm = (t: string) =>
  t
    .toLowerCase()
    .replace(/œ/g, 'oe')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
const cap = (t: string) => (t ? t.charAt(0).toUpperCase() + t.slice(1) : t);

export const estFemme = (p: Profil) => p.sex === 'femme';
export const faitDuSport = (p: Profil) => p.sessions != null && p.sessions !== '0';

export function libelle(cle: CleChoix, v: string): string {
  return OPTIONS[cle].find((o) => o[0] === v)?.[1] ?? v;
}

/** Les aliments d'une catégorie : ceux du questionnaire, puis ceux ajoutés. */
export function alimentsDe(
  etat: EtatQuestionnaire,
  cat: CategorieAliments['id'],
): { id: string; name: string; custom?: true }[] {
  return [...ALIMENTS, ...etat.customFoods].filter((f) => f.category === cat);
}

const estChoisi = (etat: EtatQuestionnaire, id: string) => etat.selected.includes(id);

// ------------------------------------------------------- champs à remplir --

export interface Exigences {
  choice: CleChoix[];
  nums: CleNombre[];
  optNums: CleNombre[];
}

/** Ce que chaque écran exige, selon les réponses déjà données. */
export function exigences(etape: EtapeProfil, p: Profil): Exigences {
  if (etape === 'p0')
    return { choice: ['sex'], nums: ['age', 'height', 'weight'], optNums: ['waist'] };
  if (etape === 'p1') {
    return {
      choice: (['job', 'steps', 'sessions'] as CleChoix[]).concat(
        faitDuSport(p) ? ['duration', 'sportType'] : [],
      ),
      nums: [],
      optNums: [],
    };
  }
  if (etape === 'p2') {
    return {
      choice: (['goal'] as CleChoix[])
        .concat(p.goal && p.goal !== 'maintien' ? ['pace'] : [])
        .concat(['trend']),
      nums: [],
      optNums: ['weight4w'],
    };
  }
  return {
    choice: (estFemme(p) ? (['pregnant'] as CleChoix[]) : []).concat(['medical', 'eating']),
    nums: [],
    optNums: [],
  };
}

/** Les erreurs d'un écran, par champ. Vide = on peut continuer. */
export function erreursDe(etape: EtapeProfil, p: Profil): Partial<Record<CleProfil, string>> {
  const r = exigences(etape, p);
  const err: Partial<Record<CleProfil, string>> = {};
  for (const k of r.choice) {
    const v = p[k];
    if (Array.isArray(v) ? v.length === 0 : v == null) err[k] = ERREURS.choix;
  }
  for (const k of [...r.nums, ...r.optNums]) {
    const brut = p[k];
    const d = NOMBRES[k];
    if (!brut) {
      if (r.nums.includes(k)) err[k] = ERREURS.valeur;
      continue;
    }
    const x = nombre(brut);
    if (x == null) err[k] = `Saisissez un nombre (ex. ${d.int ? '175' : '72,5'}).`;
    else if (k === 'age' && x < 18) err[k] = ERREURS.adultes;
    else if (x < d.min || x > d.max)
      err[k] = `Valeur à vérifier (entre ${d.min} et ${d.max} ${d.unit}).`;
  }
  return err;
}

/** « 2 réponses à compléter ou corriger. » */
export function phraseErreurs(n: number): string | null {
  if (n === 0) return null;
  return n > 1 ? `${n} réponses à compléter ou corriger.` : 'Une réponse à compléter ou corriger.';
}

export const alerteSecurite = (p: Profil) =>
  p.pregnant === 'oui' || p.medical === 'oui' || p.eating === 'oui' || p.eating === 'oral';

// ------------------------------------------------------------- navigation --

export function etapeSuivante(etape: Etape): Etape {
  if (etape === 'intro') return 'p0';
  if (typeof etape === 'string' && (ETAPES_PROFIL as readonly string[]).includes(etape)) {
    const i = ETAPES_PROFIL.indexOf(etape as EtapeProfil);
    return i === ETAPES_PROFIL.length - 1 ? 0 : ETAPES_PROFIL[i + 1]!;
  }
  if (typeof etape === 'number') return etape === CATEGORIES.length - 1 ? 'recap' : etape + 1;
  if (etape === 'recap') return 'done';
  return etape;
}

export function etapePrecedente(etape: Etape): Etape {
  if (typeof etape === 'string' && (ETAPES_PROFIL as readonly string[]).includes(etape)) {
    const i = ETAPES_PROFIL.indexOf(etape as EtapeProfil);
    return i === 0 ? 'intro' : ETAPES_PROFIL[i - 1]!;
  }
  if (typeof etape === 'number')
    return etape === 0 ? ETAPES_PROFIL[ETAPES_PROFIL.length - 1]! : etape - 1;
  if (etape === 'recap') return CATEGORIES.length - 1;
  if (etape === 'done') return 'recap';
  return 'intro';
}

// ------------------------------------------------------- sélection d'aliments --

export function basculer(etat: EtatQuestionnaire, id: string): EtatQuestionnaire {
  if (estChoisi(etat, id)) {
    return {
      ...etat,
      selected: etat.selected.filter((x) => x !== id),
      // Un aliment ajouté qu'on décoche disparaît : il n'existait que choisi.
      customFoods: etat.customFoods.filter((f) => f.id !== id),
    };
  }
  return { ...etat, selected: [...etat.selected, id] };
}

export function toutChoisir(
  etat: EtatQuestionnaire,
  cat: CategorieAliments['id'],
): EtatQuestionnaire {
  const manquants = alimentsDe(etat, cat)
    .map((f) => f.id)
    .filter((id) => !estChoisi(etat, id));
  return { ...etat, selected: [...etat.selected, ...manquants] };
}

export function reinitialiser(
  etat: EtatQuestionnaire,
  cat: CategorieAliments['id'],
): EtatQuestionnaire {
  const ids = alimentsDe(etat, cat).map((f) => f.id);
  return {
    ...etat,
    selected: etat.selected.filter((id) => !ids.includes(id)),
    customFoods: etat.customFoods.filter((f) => f.category !== cat),
  };
}

/**
 * « + Ajouter un aliment ». Un nom déjà connu (casse et accents ignorés) est
 * simplement coché ; sinon l'aliment est ajouté SANS valeur nutritionnelle.
 */
export function ajouter(
  etat: EtatQuestionnaire,
  cat: CategorieAliments['id'],
  brut: string,
  maintenant: number = Date.now(),
): EtatQuestionnaire {
  const name = brut.trim();
  if (!name) return etat;
  const connu =
    ALIMENTS.find((f) => norm(f.name) === norm(name)) ??
    etat.customFoods.find((f) => norm(f.name) === norm(name));
  if (connu)
    return estChoisi(etat, connu.id) ? etat : { ...etat, selected: [...etat.selected, connu.id] };
  const f: AlimentAjoute = {
    id: `perso-${maintenant.toString(36)}`,
    name: cap(name),
    category: cat,
    custom: true,
  };
  return { ...etat, customFoods: [...etat.customFoods, f], selected: [...etat.selected, f.id] };
}

// --------------------------------------------------------------- le résumé --

const NR = 'non renseigné';

/** Les lignes du profil, dans l'ordre du site. Les six premières sont montrées au récapitulatif. */
export function lignesProfil(p: Profil): [string, string][] {
  const n = (k: CleNombre) => (p[k] ? `${String(p[k]).replace('.', ',')} ${NOMBRES[k].unit}` : NR);
  const sport = faitDuSport(p)
    ? `${libelle('sessions', p.sessions!)} / semaine · ${p.duration ? libelle('duration', p.duration) : NR} · ${
        p.sportType.length ? p.sportType.map((v) => libelle('sportType', v)).join(', ') : NR
      }`
    : p.sessions === '0'
      ? 'Aucune séance'
      : NR;
  const goal = p.goal
    ? libelle('goal', p.goal) +
      (p.goal !== 'maintien'
        ? ` · rythme : ${p.pace ? libelle('pace', p.pace).toLowerCase() : NR}`
        : '')
    : NR;
  return [
    ['Sexe', p.sex ? libelle('sex', p.sex) : NR],
    ['Âge', n('age')],
    ['Taille', n('height')],
    ['Poids', n('weight')],
    ['Travail', p.job ? libelle('job', p.job) : NR],
    ['Objectif', goal],
    ['Tour de taille', n('waist')],
    ['Pas par jour', p.steps ? libelle('steps', p.steps) : NR],
    ['Sport', sport],
    [
      'Poids sur 4 semaines',
      (p.trend ? libelle('trend', p.trend) : NR) +
        (p.weight4w ? ` (il y a 4 semaines : ${n('weight4w')})` : ''),
    ],
  ];
}

export function lignesSecurite(p: Profil): [string, string][] {
  const out: [string, string][] = [];
  if (estFemme(p)) {
    out.push([
      'Grossesse, allaitement ou accouchement récent',
      p.pregnant ? libelle('pregnant', p.pregnant) : NR,
    ]);
  }
  out.push([
    "Maladie ou traitement influençant l'alimentation",
    p.medical ? libelle('medical', p.medical) : NR,
  ]);
  out.push(['Relation compliquée avec la nourriture', p.eating ? libelle('eating', p.eating) : NR]);
  out.push(['Allergies ou intolérances', (p.allergies ?? '').trim() || 'aucune signalée']);
  return out;
}

/** Le texte envoyé au coach — identique, au caractère près, à celui du site. */
export function resume(etat: EtatQuestionnaire): string {
  const lignes = ['MON PROFIL'];
  for (const [k, v] of lignesProfil(etat.profile)) lignes.push(`${k} : ${v}`);
  lignes.push(
    '',
    'SÉCURITÉ' +
      (alerteSecurite(etat.profile) ? ' — À VOIR AVEC GUILLAUME AVANT TOUTE PROPOSITION' : ''),
  );
  for (const [k, v] of lignesSecurite(etat.profile)) lignes.push(`${k} : ${v}`);
  lignes.push('', `MES ALIMENTS PRÉFÉRÉS (${etat.selected.length})`, '');
  for (const cat of CATEGORIES) {
    const liste = alimentsDe(etat, cat.id).filter((f) => estChoisi(etat, f.id));
    lignes.push(
      `${cat.label.toUpperCase()} (${liste.length}) : ` +
        (liste.length
          ? liste
              .map((f) => f.name + (f.custom ? ' [ajouté, valeurs à renseigner]' : ''))
              .join(', ')
          : 'aucun'),
    );
  }
  lignes.push('', 'IDENTIFIANTS : ' + etat.selected.join(','));
  return lignes.join('\n');
}

// ------------------------------------------------------ vers « Mon plan » --

/**
 * Les aliments choisis, traduits dans le catalogue de l'appli, pour « Mon
 * plan ». Les aliments ajoutés à la main n'y entrent pas : ils n'ont aucune
 * valeur, l'appli ne saurait pas les compter.
 */
export function alimentsPourMonPlan(etat: EtatQuestionnaire): string[] {
  const out: string[] = [];
  for (const id of etat.selected) {
    const majk = alimentPour(id);
    if (majk !== undefined && !out.includes(majk)) out.push(majk);
  }
  return out;
}

/** Combien d'aliments ajoutés à la main restent hors de « Mon plan ». */
export function ajoutesHorsPlan(etat: EtatQuestionnaire): number {
  return etat.selected.filter((id) => etat.customFoods.some((f) => f.id === id)).length;
}
