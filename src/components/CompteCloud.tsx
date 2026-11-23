/**
 * « Mon compte » — facultatif (lot 1 du compte en ligne).
 *
 * Sans compte, rien ne change : tout reste sur le téléphone. Avec un compte,
 * une copie des données part après chaque séance terminée et une fois par
 * jour à l'ouverture — sans photos ni vidéos.
 *
 * Le consentement est EXPLICITE (case à cocher, non cochée d'office) : ce
 * sont des données de santé au sens du RGPD (poids, réponses de sécurité).
 * Sa date part avec la demande de code et reste sur le compte.
 *
 * Connexion par code reçu par e-mail, sans mot de passe : un lien magique
 * ouvrirait Safari, pas l'appli installée sur l'écran d'accueil.
 */

import { useEffect, useState } from 'react';
import {
  cloudDisponible,
  sauvegarder,
  serviceCourant,
  type ResultatEnvoi,
} from '../cloud/sauvegarde';
import { codeValide, emailValide, type ResumeSauvegarde } from '../cloud/regles';
import { messageErreur, type CompteConnecte } from '../cloud/service';
import { lireEtatCloud, oublierEtatCloud, type EtatCloud } from '../state/cloudEtat';
import styles from '../screens/Screens.module.css';

/** Le texte du consentement, mot pour mot ce que la personne accepte. */
export const TEXTE_CONSENTEMENT =
  'J’accepte que mes données d’entraînement et de nutrition — dont mon poids et mes réponses de sécurité — soient envoyées et conservées sur un serveur situé en Europe, pour être sauvegardées. Les photos et vidéos restent sur ce téléphone. Je peux tout supprimer à tout moment depuis cet écran.';

function dateHeure(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
}

/** « 1 série », « 4 séries ». */
export function nombre(n: number, un: string, plusieurs = `${un}s`): string {
  return `${n} ${n > 1 ? plusieurs : un}`;
}

/** Ce que dit l'écran après un envoi, en une phrase. */
export function phraseEnvoi(r: ResultatEnvoi): { texte: string; ok: boolean } | null {
  switch (r.statut) {
    case 'envoyee':
      return { texte: 'Sauvegarde envoyée sur ton compte.', ok: true };
    case 'base-vierge':
      return {
        texte:
          'Rien à sauvegarder : ce téléphone ne contient encore aucune séance, aucun repas, aucune pesée. Si ton compte a une sauvegarde, restaure-la.',
        ok: true,
      };
    case 'moins-que-en-ligne':
      return null; // l'encadré de conflit le dit, avec ses deux choix
    case 'erreur':
      return { texte: r.message, ok: false };
    default:
      return null;
  }
}

export function CompteCloud({ onRestaurer }: { onRestaurer: (texte: string) => void }) {
  const disponible = cloudDisponible();
  const [compte, setCompte] = useState<CompteConnecte | null | 'chargement'>('chargement');
  const [etat, setEtat] = useState<EtatCloud>(lireEtatCloud);
  const [enLigne, setEnLigne] = useState<ResumeSauvegarde | null>(null);
  const [message, setMessage] = useState<{ texte: string; ok: boolean } | null>(null);
  const [occupe, setOccupe] = useState(false);

  // Connexion
  const [email, setEmail] = useState('');
  const [accord, setAccord] = useState(false);
  const [codeEnvoye, setCodeEnvoye] = useState(false);
  const [code, setCode] = useState('');
  const [confirmerSuppression, setConfirmerSuppression] = useState(false);

  async function relire(c: CompteConnecte | null) {
    setEtat(lireEtatCloud());
    if (c === null) {
      setEnLigne(null);
      return;
    }
    try {
      setEnLigne(await serviceCourant().lireResume(c.uid));
    } catch {
      setEnLigne(null);
    }
  }

  useEffect(() => {
    if (!disponible) return;
    let vivant = true;
    void (async () => {
      try {
        const c = await serviceCourant().compte();
        if (!vivant) return;
        setCompte(c);
        await relire(c);
      } catch {
        if (vivant) setCompte(null);
      }
    })();
    return () => {
      vivant = false;
    };
  }, [disponible]);

  if (!disponible) return null;

  async function agir(f: () => Promise<void>) {
    setOccupe(true);
    setMessage(null);
    try {
      await f();
    } catch (e) {
      setMessage({ texte: messageErreur(e), ok: false });
    } finally {
      setOccupe(false);
    }
  }

  async function envoyer(forcer: boolean) {
    const r = await sauvegarder({ forcer });
    setMessage(phraseEnvoi(r));
    if (compte !== 'chargement') await relire(compte);
  }

  const titre = (
    <>
      <h2 className={styles.cardTitle}>Mon compte</h2>
      <p className={styles.cardSub}>
        Facultatif. Avec un compte, tes données sont sauvegardées automatiquement après chaque
        séance terminée et chaque jour, et se restaurent sur un nouveau téléphone. Sans compte, tout
        reste sur ce téléphone, comme avant.
      </p>
    </>
  );

  const alerte = message && (
    <p
      role="status"
      className={`${styles.alert} ${message.ok ? styles.alertVert : styles.alertRouge}`}
      style={{ margin: '12px 0 0' }}
    >
      {message.texte}
    </p>
  );

  if (compte === 'chargement') {
    return (
      <section className={styles.card}>
        {titre}
        <p className={styles.fieldHint}>Lecture du compte…</p>
      </section>
    );
  }

  // ------------------------------------------------------- pas de compte --
  if (compte === null) {
    return (
      <section className={styles.card} aria-label="Mon compte">
        {titre}
        {!codeEnvoye ? (
          <>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="compte-email">
                Adresse e-mail
              </label>
              <input
                id="compte-email"
                className={styles.input}
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <label className={styles.fieldHint} style={{ display: 'flex', gap: 10 }}>
              <input
                type="checkbox"
                checked={accord}
                onChange={(e) => setAccord(e.target.checked)}
                // La remise à zéro globale des champs (`appearance: none`)
                // effacerait la coche : la case garde son rendu natif.
                style={{
                  width: 22,
                  height: 22,
                  flex: '0 0 auto',
                  appearance: 'auto',
                  WebkitAppearance: 'checkbox',
                  accentColor: 'var(--accent)',
                }}
              />
              <span>{TEXTE_CONSENTEMENT}</span>
            </label>
            <button
              type="button"
              className={styles.primary}
              style={{ width: '100%', margin: '12px 0 0' }}
              disabled={occupe || !accord || !emailValide(email)}
              onClick={() =>
                void agir(async () => {
                  await serviceCourant().envoyerCode(email, new Date().toISOString());
                  setCodeEnvoye(true);
                })
              }
            >
              Recevoir un code par e-mail
            </button>
          </>
        ) : (
          <>
            <p className={styles.fieldHint}>
              Code envoyé à <b>{email.trim()}</b>. Regarde aussi dans les indésirables.
            </p>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="compte-code">
                Code reçu
              </label>
              <input
                id="compte-code"
                className={styles.input}
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              />
            </div>
            <button
              type="button"
              className={styles.primary}
              style={{ width: '100%', margin: '12px 0 0' }}
              disabled={occupe || !codeValide(code)}
              onClick={() =>
                void agir(async () => {
                  const c = await serviceCourant().verifierCode(email, code);
                  setCompte(c);
                  setCode('');
                  setCodeEnvoye(false);
                  // Première sauvegarde — ou, sur un téléphone neuf, rien
                  // n'est envoyé et l'écran propose de restaurer.
                  const r = await sauvegarder();
                  setMessage(phraseEnvoi(r));
                  await relire(c);
                })
              }
            >
              Me connecter
            </button>
            <button
              type="button"
              className={styles.secondary}
              style={{ width: '100%', margin: '10px 0 0' }}
              onClick={() => {
                setCodeEnvoye(false);
                setCode('');
              }}
            >
              Changer d’adresse
            </button>
          </>
        )}
        {alerte}
      </section>
    );
  }

  // ------------------------------------------------------------ connecté --
  return (
    <section className={styles.card} aria-label="Mon compte">
      {titre}
      <p className={styles.fieldHint}>
        Connecté : <b>{compte.email}</b>
      </p>
      <p className={styles.fieldHint}>
        {etat.derniereReussite
          ? `Dernière sauvegarde depuis ce téléphone : ${dateHeure(etat.derniereReussite)}.`
          : 'Aucune sauvegarde envoyée depuis ce téléphone pour l’instant.'}
        {etat.enAttente && ' Un envoi attend le retour du réseau.'}
      </p>
      {enLigne && (
        <p className={styles.fieldHint}>
          En ligne : {nombre(enLigne.series, 'série')}, {nombre(enLigne.seances, 'séance')},{' '}
          {nombre(enLigne.repas, 'repas', 'repas')}, {nombre(enLigne.pesees, 'pesée')} — du{' '}
          {dateHeure(enLigne.exporteLe)}.
        </p>
      )}

      {etat.conflit && (
        <div className={`${styles.alert} ${styles.alertRouge}`} style={{ margin: '12px 0 0' }}>
          <p style={{ margin: 0 }}>
            <b>Rien n’a été envoyé.</b> Ce téléphone contient moins de données ({etat.conflit.local}{' '}
            lignes) que la sauvegarde de ton compte ({etat.conflit.enLigne}). L’envoyer effacerait
            la différence.
          </p>
        </div>
      )}

      <button
        type="button"
        className={styles.secondary}
        style={{ width: '100%', margin: '12px 0 0' }}
        disabled={occupe}
        onClick={() => void agir(() => envoyer(false))}
      >
        Sauvegarder maintenant
      </button>
      {enLigne !== null && (
        <button
          type="button"
          className={styles.secondary}
          style={{ width: '100%', margin: '10px 0 0' }}
          disabled={occupe}
          onClick={() =>
            void agir(async () => {
              const texte = await serviceCourant().telecharger(compte.uid);
              if (texte === null) throw new Error('Aucune sauvegarde sur ton compte.');
              onRestaurer(texte);
            })
          }
        >
          Restaurer depuis mon compte
        </button>
      )}
      {etat.conflit && (
        <button
          type="button"
          className={styles.secondary}
          style={{ width: '100%', margin: '10px 0 0' }}
          disabled={occupe}
          onClick={() => void agir(() => envoyer(true))}
        >
          Remplacer la sauvegarde en ligne quand même
        </button>
      )}
      {alerte}

      <button
        type="button"
        className={styles.secondary}
        style={{ width: '100%', margin: '18px 0 0' }}
        disabled={occupe}
        onClick={() =>
          void agir(async () => {
            await serviceCourant().deconnecter();
            oublierEtatCloud();
            setCompte(null);
            await relire(null);
          })
        }
      >
        Me déconnecter
      </button>
      {!confirmerSuppression ? (
        <button
          type="button"
          className={styles.secondary}
          style={{ width: '100%', margin: '10px 0 0' }}
          disabled={occupe}
          onClick={() => setConfirmerSuppression(true)}
        >
          Supprimer mon compte et mes données en ligne
        </button>
      ) : (
        <div role="alertdialog" aria-label="Confirmer la suppression">
          <p className={styles.fieldHint} style={{ color: 'var(--rouge)', fontWeight: 700 }}>
            Ta sauvegarde en ligne et ton compte seront effacés. Irréversible. Les données de ce
            téléphone ne sont pas touchées.
          </p>
          <button
            type="button"
            className={styles.secondary}
            style={{
              width: '100%',
              margin: '10px 0 0',
              background: 'var(--rouge)',
              color: 'var(--ink-on-accent)',
            }}
            disabled={occupe}
            onClick={() =>
              void agir(async () => {
                await serviceCourant().supprimerTout(compte.uid);
                oublierEtatCloud();
                setConfirmerSuppression(false);
                setCompte(null);
                await relire(null);
                setMessage({ texte: 'Compte et sauvegarde en ligne supprimés.', ok: true });
              })
            }
          >
            Supprimer définitivement
          </button>
          <button
            type="button"
            className={styles.secondary}
            style={{ width: '100%', margin: '10px 0 0' }}
            onClick={() => setConfirmerSuppression(false)}
          >
            Annuler
          </button>
        </div>
      )}
      <p className={styles.fieldHint}>Les photos et vidéos ne quittent jamais ce téléphone.</p>
    </section>
  );
}
