/**
 * Le compte en ligne, vu de l'appli : une interface courte, et son
 * implémentation Supabase.
 *
 * L'interface existe pour les tests : l'orchestration (`sauvegarde.ts`) se
 * rejoue avec un faux service en mémoire, sans réseau. L'implémentation
 * charge `@supabase/supabase-js` à la DEMANDE (import dynamique) : qui n'a
 * pas de compte ne télécharge pas une ligne de ce client.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { configCloud } from './config';
import { chemins, type ResumeSauvegarde } from './regles';

export interface CompteConnecte {
  uid: string;
  email: string;
}

export interface ServiceCloud {
  /** Le compte connecté sur ce téléphone, ou `null`. */
  compte(): Promise<CompteConnecte | null>;
  /** Envoie le code de connexion. Crée le compte s'il n'existe pas. */
  envoyerCode(email: string, consentementLe: string): Promise<void>;
  verifierCode(email: string, code: string): Promise<CompteConnecte>;
  deconnecter(): Promise<void>;
  /** Le résumé de la dernière sauvegarde en ligne, ou `null` s'il n'y en a pas. */
  lireResume(uid: string): Promise<ResumeSauvegarde | null>;
  /** Range l'actuelle en « précédente », puis écrit la nouvelle et son résumé. */
  envoyer(uid: string, texte: string, resume: ResumeSauvegarde): Promise<void>;
  /** Le texte de la dernière sauvegarde, ou `null`. */
  telecharger(uid: string): Promise<string | null>;
  /** Efface les fichiers du compte, puis le compte lui-même (RGPD). */
  supprimerTout(uid: string): Promise<void>;
}

const BUCKET = 'sauvegardes';

/** Une erreur « fichier absent » de Supabase Storage : elle n'en est pas une ici. */
function absent(e: unknown): boolean {
  const m = e instanceof Error ? e.message : JSON.stringify(e);
  return /not.?found|does not exist|404|Object not found/i.test(m);
}

/** Un message lisible, en français, pour les erreurs qu'on rencontre vraiment. */
export function messageErreur(e: unknown): string {
  const m = e instanceof Error ? e.message : String(e);
  if (/Failed to fetch|NetworkError|Load failed|network/i.test(m)) {
    return 'Pas de connexion : la sauvegarde partira dès que le réseau revient.';
  }
  if (/expired|invalid.*(otp|token)|Token has expired/i.test(m)) {
    return 'Code incorrect ou expiré. Redemande un code.';
  }
  if (/rate limit|too many/i.test(m)) {
    return 'Trop de demandes de code : attends quelques minutes avant de réessayer.';
  }
  if (/not authorized|Email address not authorized/i.test(m)) {
    return 'Cette adresse ne peut pas encore recevoir de code (envoi d’e-mails pas encore ouvert à tous).';
  }
  return `Le serveur a refusé : ${m}`;
}

let client: Promise<SupabaseClient> | null = null;

function supabase(): Promise<SupabaseClient> {
  const conf = configCloud();
  if (conf === null) return Promise.reject(new Error('Compte en ligne non configuré.'));
  client ??= import('@supabase/supabase-js').then(({ createClient }) =>
    createClient(conf.url, conf.cle, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
    }),
  );
  return client;
}

export const serviceSupabase: ServiceCloud = {
  async compte() {
    const s = await supabase();
    const { data } = await s.auth.getSession();
    const u = data.session?.user;
    return u ? { uid: u.id, email: u.email ?? '' } : null;
  },

  async envoyerCode(email, consentementLe) {
    const s = await supabase();
    const { error } = await s.auth.signInWithOtp({
      email: email.trim(),
      // La date du consentement est gardée sur le compte, côté serveur.
      options: { shouldCreateUser: true, data: { consentement_le: consentementLe } },
    });
    if (error) throw error;
  },

  async verifierCode(email, code) {
    const s = await supabase();
    const { data, error } = await s.auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: 'email',
    });
    if (error) throw error;
    const u = data.user;
    if (!u) throw new Error('Connexion refusée.');
    return { uid: u.id, email: u.email ?? email.trim() };
  },

  async deconnecter() {
    const s = await supabase();
    await s.auth.signOut();
  },

  async lireResume(uid) {
    const s = await supabase();
    const { data, error } = await s.storage.from(BUCKET).download(chemins(uid).resume);
    if (error) {
      if (absent(error)) return null;
      throw error;
    }
    return JSON.parse(await data.text()) as ResumeSauvegarde;
  },

  async envoyer(uid, texte, resume) {
    const s = await supabase();
    const st = s.storage.from(BUCKET);
    const c = chemins(uid);
    // Une génération d'avance : l'actuelle devient la précédente.
    const { error: errSuppr } = await st.remove([c.precedente]);
    if (errSuppr && !absent(errSuppr)) throw errSuppr;
    const { error: errCopie } = await st.copy(c.derniere, c.precedente);
    if (errCopie && !absent(errCopie)) throw errCopie;
    const json = (t: string) => new Blob([t], { type: 'application/json' });
    const { error } = await st.upload(c.derniere, json(texte), {
      upsert: true,
      contentType: 'application/json',
    });
    if (error) throw error;
    // Le résumé APRÈS la sauvegarde : s'il manque, on compare à rien, jamais à faux.
    const { error: errResume } = await st.upload(c.resume, json(JSON.stringify(resume)), {
      upsert: true,
      contentType: 'application/json',
    });
    if (errResume) throw errResume;
  },

  async telecharger(uid) {
    const s = await supabase();
    const { data, error } = await s.storage.from(BUCKET).download(chemins(uid).derniere);
    if (error) {
      if (absent(error)) return null;
      throw error;
    }
    return data.text();
  },

  async supprimerTout(uid) {
    const s = await supabase();
    const c = chemins(uid);
    const { error } = await s.storage.from(BUCKET).remove([c.derniere, c.precedente, c.resume]);
    if (error && !absent(error)) throw error;
    // Le compte lui-même : fonction SQL `supprimer_mon_compte` (supabase/setup.sql).
    const { error: errCompte } = await s.rpc('supprimer_mon_compte');
    if (errCompte) throw errCompte;
    await s.auth.signOut();
  },
};
