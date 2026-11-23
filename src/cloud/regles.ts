/**
 * Les règles de la sauvegarde en ligne. Fonctions PURES : aucune requête,
 * aucune base, aucun React — tout ce qui décide se teste sans réseau.
 *
 * ── Le danger qu'elles ferment ─────────────────────────────────────────────
 *
 * Une sauvegarde automatique REMPLACE la précédente. Le scénario qui détruit
 * tout : un téléphone neuf, l'appli installée, on se connecte… et l'appli,
 * vide, envoie aussitôt sa base vide par-dessus douze semaines d'historique.
 *
 * D'où trois règles :
 * 1. une base vierge n'est JAMAIS envoyée ;
 * 2. une base qui contient MOINS que la sauvegarde en ligne n'est pas
 *    envoyée automatiquement : l'écran demande (restaurer, ou remplacer
 *    quand même) ;
 * 3. la sauvegarde précédente est gardée à côté de la nouvelle (une seule
 *    génération), au cas où la règle 2 ne verrait pas une perte.
 */

import type { ExportFile } from '../db/export';

/** Ce qu'on sait d'une sauvegarde sans la télécharger : quelques octets. */
export interface ResumeSauvegarde {
  exporteLe: string;
  /** Lignes saisies, table par table, pour comparer deux sauvegardes. */
  series: number;
  seances: number;
  repas: number;
  pesees: number;
  /** Tout le reste (remarques, aliments, cycles, références…). */
  autres: number;
}

export function resumeDe(f: ExportFile): ResumeSauvegarde {
  const n = (a: readonly unknown[] | undefined) => a?.length ?? 0;
  return {
    exporteLe: f.exportedAt,
    series: n(f.sets) + n(f.femmesSeances),
    seances: n(f.sessions),
    repas: n(f.mealLog) + n(f.extraFoods),
    pesees: n(f.measurements),
    autres:
      n(f.readiness) +
      n(f.combines) +
      n(f.notes) +
      n(f.exerciseNotes) +
      n(f.sessionExercises) +
      n(f.referencesForce) +
      n(f.programmesImportes) +
      n(f.customFoods) +
      n(f.foodOverrides) +
      n(f.dayKind),
  };
}

/** Le poids d'une sauvegarde : le nombre total de lignes saisies. */
export function volume(r: ResumeSauvegarde): number {
  return r.series + r.seances + r.repas + r.pesees + r.autres;
}

/**
 * Vierge = rien n'a été saisi. Les réglages et un cycle démarré ne comptent
 * pas : une appli fraîchement installée en a déjà.
 */
export function estVierge(r: ResumeSauvegarde): boolean {
  return r.series + r.seances + r.repas + r.pesees === 0;
}

export type DecisionEnvoi =
  | { envoyer: true }
  | { envoyer: false; raison: 'base-vierge' }
  | { envoyer: false; raison: 'moins-que-en-ligne'; local: number; enLigne: number };

/**
 * Envoyer, ou pas ?
 *
 * `forcer` est le « Remplacer quand même » de l'écran, après avertissement :
 * il passe outre la règle 2, jamais la règle 1 (envoyer une base vide n'est
 * jamais ce qu'on veut — pour effacer, il y a « Supprimer mes données »).
 */
export function decisionEnvoi(
  local: ResumeSauvegarde,
  enLigne: ResumeSauvegarde | null,
  forcer = false,
): DecisionEnvoi {
  if (estVierge(local)) return { envoyer: false, raison: 'base-vierge' };
  if (enLigne === null || forcer) return { envoyer: true };
  // Les séries d'abord : c'est l'historique qui pilote la progression.
  if (local.series < enLigne.series || volume(local) < volume(enLigne)) {
    return {
      envoyer: false,
      raison: 'moins-que-en-ligne',
      local: volume(local),
      enLigne: volume(enLigne),
    };
  }
  return { envoyer: true };
}

/** Une journée, en millisecondes. */
const JOUR = 24 * 60 * 60 * 1000;

/**
 * À l'ouverture de l'appli : sauvegarder si la dernière réussite date de plus
 * de 24 h (les repas et les pesées des jours sans séance), ou si un envoi
 * précédent a échoué (pas de réseau) et attend.
 */
export function aSauvegarderALouverture(
  derniereReussite: string | null,
  enAttente: boolean,
  maintenant: Date,
): boolean {
  if (enAttente) return true;
  if (derniereReussite === null) return true;
  const t = Date.parse(derniereReussite);
  return Number.isNaN(t) || maintenant.getTime() - t >= JOUR;
}

/** Les chemins dans le stockage : un dossier par compte, nommé par son identifiant. */
export function chemins(uid: string) {
  return {
    derniere: `${uid}/sauvegarde.json`,
    precedente: `${uid}/sauvegarde-precedente.json`,
    resume: `${uid}/resume.json`,
  };
}

/** Une adresse e-mail plausible — le serveur reste juge, ceci évite un aller-retour inutile. */
export function emailValide(e: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());
}

/** Le code reçu par e-mail : 6 à 10 chiffres selon le réglage du projet. */
export function codeValide(c: string): boolean {
  return /^\d{6,10}$/.test(c.trim());
}
