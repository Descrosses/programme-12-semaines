/**
 * La sauvegarde automatique : quand envoyer, et quoi faire si ça échoue.
 *
 * Deux déclencheurs, et un seul chemin d'envoi :
 * - « Séance terminée » (POWER, MASS, importés, FEMMES) ;
 * - l'ouverture de l'appli, si la dernière réussite a plus de 24 h ou si un
 *   envoi attend (repas et pesées des jours sans séance) — et le retour du
 *   réseau, pour un envoi qui attend.
 *
 * Ce qui part : le fichier de l'export « Exporter mes données », tel quel —
 * donc SANS photos ni vidéos (`photosIncluded: false`). La restauration
 * passe par le même `importAll` que le fichier, déjà éprouvé sur de vraies
 * sauvegardes.
 *
 * Rien ici ne lève d'exception vers l'écran de séance : une sauvegarde ratée
 * ne doit jamais empêcher de terminer une séance. Elle est notée « en
 * attente » et repart plus tard.
 */

import { exportAll } from '../db/export';
import { noterExport } from '../state/dernierExport';
import { lireEtatCloud, noterAttente, noterConflit, noterReussite } from '../state/cloudEtat';
import { configCloud } from './config';
import { aSauvegarderALouverture, decisionEnvoi, resumeDe, type ResumeSauvegarde } from './regles';
import { messageErreur, serviceSupabase, type ServiceCloud } from './service';

export type ResultatEnvoi =
  | { statut: 'envoyee'; resume: ResumeSauvegarde }
  | { statut: 'non-configure' }
  | { statut: 'non-connecte' }
  | { statut: 'base-vierge' }
  | { statut: 'moins-que-en-ligne'; local: number; enLigne: number }
  | { statut: 'erreur'; message: string };

let service: ServiceCloud = serviceSupabase;
let injecte = false;

/** Tests : remplace le service réseau par un faux. `null` remet Supabase. */
export function utiliserService(s: ServiceCloud | null): void {
  service = s ?? serviceSupabase;
  injecte = s !== null;
  enCours = null;
}

export function serviceCourant(): ServiceCloud {
  return service;
}

/** Un compte est-il possible dans cette version de l'appli ? */
export function cloudDisponible(): boolean {
  return injecte || configCloud() !== null;
}

let enCours: Promise<ResultatEnvoi> | null = null;

/**
 * Envoie la sauvegarde, si les règles le permettent (`decisionEnvoi`).
 * Deux appels rapprochés (séance terminée + retour du réseau) n'en font
 * qu'un.
 */
export function sauvegarder(
  options: { forcer?: boolean; maintenant?: Date } = {},
): Promise<ResultatEnvoi> {
  enCours ??= envoyer(options).finally(() => {
    enCours = null;
  });
  return enCours;
}

async function envoyer({
  forcer = false,
  maintenant = new Date(),
}: {
  forcer?: boolean;
  maintenant?: Date;
}): Promise<ResultatEnvoi> {
  if (!cloudDisponible()) return { statut: 'non-configure' };
  try {
    const compte = await service.compte();
    if (compte === null) return { statut: 'non-connecte' };
    const fichier = await exportAll();
    const resume = resumeDe(fichier);
    const enLigne = await service.lireResume(compte.uid);
    const d = decisionEnvoi(resume, enLigne, forcer);
    if (!d.envoyer) {
      if (d.raison === 'moins-que-en-ligne') {
        noterConflit(d.local, d.enLigne);
        return { statut: 'moins-que-en-ligne', local: d.local, enLigne: d.enLigne };
      }
      return { statut: 'base-vierge' };
    }
    await service.envoyer(compte.uid, JSON.stringify(fichier), resume);
    noterReussite(maintenant);
    // Une sauvegarde en ligne vaut un export : le rappel du jour se tait.
    noterExport(maintenant);
    return { statut: 'envoyee', resume };
  } catch (e) {
    noterAttente();
    return { statut: 'erreur', message: messageErreur(e) };
  }
}

/** « Séance terminée » : on envoie sans attendre la réponse, sans jamais bloquer. */
export function sauvegardeAuto(): void {
  if (!cloudDisponible()) return;
  void sauvegarder();
}

/**
 * À l'ouverture de l'appli : envoie si c'est dû, et retente au retour du
 * réseau. Ne fait rien sans compte configuré.
 */
export function demarrerSauvegardeAuto(maintenant: Date = new Date()): void {
  if (!cloudDisponible()) return;
  const etat = lireEtatCloud();
  if (aSauvegarderALouverture(etat.derniereReussite, etat.enAttente, maintenant)) {
    void sauvegarder({ maintenant });
  }
  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
      if (lireEtatCloud().enAttente) void sauvegarder();
    });
  }
}
