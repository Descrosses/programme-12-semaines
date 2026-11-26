/**
 * ME, MYSELF & I — importer un programme (lot 5 de l'ADR).
 *
 * Le fichier est lu et VALIDÉ avant toute écriture, et ce qu'il contient est
 * montré avant de l'enregistrer : le suivi (complet ou partiel), les
 * consignes qui resteront à lire, ce que le document ne disait pas, et la
 * durée. Quand le document ne fixe pas sa durée, la question est posée, sans
 * réponse proposée d'office.
 *
 * Une archive .zip apporte en plus ses illustrations (montrées avant
 * l'enregistrement), ou complète un programme déjà importé. Pour tout import,
 * les fiches déjà dans MAJK au nom identique sont PROPOSÉES, cochées, à
 * décocher si ce n'est pas le même mouvement.
 */

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { candidatesDisponibles, type Candidate } from '../../db/fichesRetrouvees';
import {
  completerIllustrations,
  importerProgramme,
  type ImageAEnregistrer,
  type ResultatImport,
} from '../../db/programmesImportes';
import {
  proposerFiches,
  type FicheProposee,
  type LienStocke,
} from '../../engine/perso/illustrations';
import {
  LIMITES,
  type ErreurValidation,
  type ProgrammeNormalise,
  type ResultatValidation,
} from '../../engine/perso/types';
import { validerProgramme } from '../../engine/perso/valider';
import { estUneArchive } from '../../media/archive';
import { preparerIllustration } from '../../media/illustration';
import { analyserArchive, type ResultatAnalyse } from '../../programmes/perso/archiveIllustree';
import { lireMemoire, programmeEnMemoire } from '../../programmes/perso/memoire';
import { THEME_IMPORTE_DEFAUT, type ThemeImporte } from '../../data/themesImportes';
import { ApercuIllustrations, cleProposition, exercicesDe, FichesProposees } from './Illustrations';
import styles from '../../screens/Screens.module.css';
import local from './Perso.module.css';
import { phraseSuivi } from './suivi';
import { ThemeProgramme } from './ThemeProgramme';

/** Les sujets des décisions, dits en français. */
export const SUJETS: Record<string, string> = {
  jours: 'Jours',
  exclusion: 'Exclusion',
  identite: 'Même exercice',
  convention: 'Convention',
  texte: 'Texte',
};

type Lu =
  | { genre: 'json'; texte: string; validation: ResultatValidation }
  | { genre: 'archive'; analyse: ResultatAnalyse };

type Proposition = FicheProposee & { candidate: Candidate };

/** Le programme déjà importé (version la plus récente) que désigne un uid. */
function programmeDeja(uid: string): ProgrammeNormalise | null {
  const versions = lireMemoire().programmes.filter((r) => r.uid === uid);
  const derniere = versions.reduce<(typeof versions)[number] | null>(
    (max, r) => (max === null || r.rev > max.rev ? r : max),
    null,
  );
  return derniere?.document ?? null;
}

export function ImportProgramme({ onImporte }: { onImporte: (cle: string) => void }) {
  const [lu, setLu] = useState<Lu | null>(null);
  const [duree, setDuree] = useState<number | null>(null);
  const [resultat, setResultat] = useState<ResultatImport | { statut: 'introuvable' } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [erreurs, setErreurs] = useState<ErreurValidation[] | null>(null);
  const [propositions, setPropositions] = useState<Proposition[]>([]);
  const [choisies, setChoisies] = useState<ReadonlySet<string>>(new Set());
  const [enCours, setEnCours] = useState(false);
  /*
   * Le programme qu'on vient d'importer, et son thème. Guillaume (26
   * novembre) : « annoncer la possibilité de choisir son thème dès le début,
   * juste après avoir importé son programme ». Le choix est PROPOSÉ ici, pas
   * imposé : sans geste, le programme garde son thème (ME, MYSELF & I, ou
   * celui de la version précédente), et ses Réglages le changent ensuite.
   */
  const [importe, setImporte] = useState<{ cle: string; theme: ThemeImporte } | null>(null);

  // Le programme et les exercices déjà illustrés de ce qu'on vient de lire.
  const lecture = useMemo(() => {
    if (lu === null) return null;
    if (lu.genre === 'json') {
      return lu.validation.ok
        ? { programme: lu.validation.programme, lies: new Set<string>() }
        : null;
    }
    if (!lu.analyse.ok) return null;
    const a = lu.analyse.analyse;
    // Un exercice que le fichier mentionne (même avec null) est décidé par lui.
    return { programme: a.programme, lies: new Set(Object.keys(a.manifeste.liens)) };
  }, [lu]);

  // Les fiches déjà dans MAJK, au nom identique : proposées, cochées.
  useEffect(() => {
    setPropositions([]);
    setChoisies(new Set());
    if (lecture === null) return;
    let vivant = true;
    void candidatesDisponibles().then((candidates) => {
      if (!vivant) return;
      const p = proposerFiches(
        exercicesDe(lecture.programme),
        lecture.lies,
        candidates,
      ) as Proposition[];
      setPropositions(p);
      setChoisies(new Set(p.map(cleProposition)));
    });
    return () => {
      vivant = false;
    };
  }, [lecture]);

  async function lire(fichier: File) {
    setResultat(null);
    setDuree(null);
    setMessage(null);
    setErreurs(null);
    const octets = new Uint8Array(await fichier.arrayBuffer());
    if (estUneArchive(octets)) {
      setLu({ genre: 'archive', analyse: await analyserArchive(octets, programmeDeja) });
    } else {
      const texte = new TextDecoder().decode(octets);
      setLu({ genre: 'json', texte, validation: validerProgramme(texte) });
    }
  }

  async function importer(confirmer: boolean, remplacer = false) {
    if (lu === null || lecture === null) return;
    setEnCours(true);
    try {
      // Les liens et images de l'archive, puis les fiches retrouvées laissées cochées.
      const liens: Record<string, LienStocke> = {};
      const images = new Map<string, ImageAEnregistrer>();
      if (lu.genre === 'archive' && lu.analyse.ok) {
        const a = lu.analyse.analyse;
        Object.assign(liens, a.liens.liens);
        for (const i of a.illustrations) {
          try {
            const pr = await preparerIllustration(i.octets, i.entete.type);
            images.set(i.empreinte, {
              empreinte: i.empreinte,
              blob: pr.blob,
              type: pr.blob.type,
              largeur: pr.largeur,
              hauteur: pr.hauteur,
            });
          } catch {
            setErreurs([
              {
                code: 'image-invalide',
                chemin: i.fichier,
                message: `« ${i.fichier} » : le téléphone ne sait pas afficher cette image.`,
              },
            ]);
            return;
          }
        }
      }
      for (const p of propositions) {
        if (!choisies.has(cleProposition(p))) continue;
        for (const id of p.exercices) liens[id] = p.candidate.lien;
        if (p.candidate.copie !== undefined)
          images.set(p.candidate.copie.empreinte, p.candidate.copie);
      }
      const options = {
        liens,
        images: [...images.values()],
        remplacerIllustrations: remplacer,
      };

      const r =
        lu.genre === 'archive' && lu.analyse.ok && lu.analyse.analyse.texteProgramme === null
          ? await completerIllustrations(lecture.programme.uid, options)
          : await importerProgramme(
              lu.genre === 'json'
                ? lu.texte
                : ((lu.analyse.ok ? lu.analyse.analyse.texteProgramme : null) ?? ''),
              { ...options, dureeSemaines: duree, confirmerNouvelleVersion: confirmer },
            );
      setResultat(r);
      const nom = lecture.programme.nom;
      if (r.statut === 'importe') {
        setMessage(`« ${nom} » est importé.`);
        setImporte({
          cle: r.cle,
          theme: programmeEnMemoire(r.cle)?.theme ?? THEME_IMPORTE_DEFAUT,
        });
        setLu(null);
        onImporte(r.cle);
      } else if (r.statut === 'deja-importe') {
        setMessage('Ce programme est déjà importé, à l’identique : rien n’a été ajouté.');
        setLu(null);
      } else if (r.statut === 'illustrations-ajoutees') {
        setMessage(`Les illustrations de « ${nom} » sont en place.`);
        setLu(null);
      } else if (r.statut === 'introuvable') {
        setErreurs([
          {
            code: 'programme-different',
            chemin: 'programme.json',
            message: `« ${nom} » n’est plus importé : ajoute programme.json à l’archive.`,
          },
        ]);
      } else if (r.statut === 'refuse') {
        // Relu à l'enregistrement : on montre ses erreurs.
        setErreurs(r.erreurs);
      }
    } finally {
      setEnCours(false);
    }
  }

  const refus: ErreurValidation[] | null =
    erreurs ??
    (lu === null
      ? null
      : lu.genre === 'json'
        ? lu.validation.ok
          ? null
          : lu.validation.erreurs
        : lu.analyse.ok
          ? null
          : lu.analyse.erreurs);

  const archive = lu?.genre === 'archive' && lu.analyse.ok ? lu.analyse.analyse : null;
  const validation: Extract<ResultatValidation, { ok: true }> | null =
    lu?.genre === 'json' && lu.validation.ok
      ? lu.validation
      : archive !== null && archive.rapport !== null
        ? { ok: true, programme: archive.programme, rapport: archive.rapport }
        : null;

  const extra = (
    <>
      {archive !== null && <ApercuIllustrations analyse={archive} />}
      <FichesProposees
        propositions={propositions}
        choisies={choisies}
        onChoix={(cle, oui) =>
          setChoisies((avant) => {
            const apres = new Set(avant);
            if (oui) apres.add(cle);
            else apres.delete(cle);
            return apres;
          })
        }
      />
    </>
  );

  const confirmationRemplacement =
    resultat?.statut === 'illustrations-a-remplacer' ? (
      <div className={local.confirme}>
        <p>
          « {resultat.nom} » a déjà des illustrations. Les remplacer par celles-ci ? Les fiches que
          tu as ajoutées toi-même ne changent pas.
        </p>
        <button
          type="button"
          className={styles.primary}
          disabled={enCours}
          onClick={() => void importer(true, true)}
        >
          Remplacer les illustrations
        </button>
        <button type="button" className={styles.secondary} onClick={() => setLu(null)}>
          Annuler
        </button>
      </div>
    ) : null;

  return (
    <div className={local.panneau}>
      <h3 className={local.titre}>Importer un programme</h3>
      <p className={styles.cardSub}>
        Un fichier .json au format MAJK, préparé à partir du PDF de ton coach — ou une archive .zip
        qui y joint ses illustrations. Rien n’est enregistré avant ta confirmation.
      </p>
      <label className={local.fichier}>
        Choisir un fichier
        <input
          type="file"
          accept="application/json,.json,application/zip,.zip"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            setImporte(null);
            if (f) void lire(f);
          }}
        />
      </label>

      {message && (
        <p className={local.ok} role="status">
          {message}
        </p>
      )}

      {importe !== null && (
        <div className={local.themeApresImport}>
          <p className={local.annonceTheme}>
            Choisis dès maintenant son thème. Tu pourras le changer quand tu veux dans ses Réglages.
          </p>
          <ThemeProgramme
            cle={importe.cle}
            actuel={importe.theme}
            onChange={() =>
              setImporte({
                cle: importe.cle,
                theme: programmeEnMemoire(importe.cle)?.theme ?? THEME_IMPORTE_DEFAUT,
              })
            }
          />
        </div>
      )}

      {refus !== null && (
        <div className={local.refus} role="alert">
          <p>
            <b>Fichier refusé</b> ({refus.length} erreur{refus.length > 1 ? 's' : ''}). Rien n’a été
            enregistré.
          </p>
          <ul>
            {refus.slice(0, 20).map((e, i) => (
              <li key={i}>
                {e.message} <span className={local.chemin}>{e.chemin}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {refus === null && validation !== null && (
        <ApercuImport
          validation={validation}
          duree={duree}
          onDuree={setDuree}
          resultat={resultat?.statut === 'introuvable' ? null : resultat}
          onImporter={(confirmer) => void importer(confirmer)}
          onAnnuler={() => setLu(null)}
          extra={extra}
          confirmation={confirmationRemplacement}
          occupe={enCours}
        />
      )}

      {refus === null && archive !== null && archive.texteProgramme === null && (
        <div className={local.apercu}>
          <p className={local.nom}>{archive.programme.nom}</p>
          <p className={local.meta}>
            Déjà importé : l’archive ajoute ses illustrations à la version la plus récente.
          </p>
          {extra}
          {confirmationRemplacement ?? (
            <button
              type="button"
              className={styles.primary}
              disabled={enCours}
              onClick={() => void importer(false)}
            >
              Ajouter les illustrations
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** Chaque texte une fois, avec son nombre d'apparitions, dans l'ordre. */
function compter(textes: readonly string[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const t of textes) m.set(t, (m.get(t) ?? 0) + 1);
  return m;
}

/**
 * Ce que contient le fichier, AVANT l'enregistrement. Le bouton d'import
 * reste désactivé tant que la durée manque : aucune réponse n'est proposée
 * d'office (« Choisir »), et une absence n'est jamais remplacée par un nombre.
 */
export function ApercuImport({
  validation: v,
  duree,
  onDuree,
  resultat,
  onImporter,
  onAnnuler,
  extra,
  confirmation,
  occupe = false,
}: {
  validation: Extract<ResultatValidation, { ok: true }>;
  duree: number | null;
  onDuree: (duree: number | null) => void;
  resultat: ResultatImport | null;
  onImporter: (confirmer: boolean) => void;
  onAnnuler: () => void;
  /** Les illustrations de l'archive et les fiches retrouvées. */
  extra?: ReactNode;
  /** Une question en attente (remplacer les illustrations) : elle remplace le bouton. */
  confirmation?: ReactNode;
  /** Pendant la préparation des images et l'écriture : boutons désactivés. */
  occupe?: boolean;
}) {
  const p = v.programme;
  const dureeOk = p.dureeSemaines !== null || duree !== null;
  return (
    <div className={local.apercu}>
      <p className={local.nom}>{p.nom}</p>
      <p className={local.meta}>
        {p.semaines[0]?.seances.length ?? 0} séance
        {(p.semaines[0]?.seances.length ?? 0) > 1 ? 's' : ''} par semaine
      </p>
      <p className={v.rapport.suiviComplet ? local.complet : local.partiel}>{phraseSuivi(p)}</p>
      {/*
        Le détail de la conversion — consignes hors suivi, choix faits à la
        place du document — reste consultable, mais REPLIÉ : à l'import, la
        personne veut savoir si le programme se suit, pas relire 89 lignes
        (retour de Guillaume, 25 novembre). Une consigne répétée ne s'écrit
        qu'une fois, avec son nombre.
      */}
      {(v.rapport.consultables.length > 0 || p.decisions.length > 0) && (
        <details className={local.replie}>
          <summary>Voir le détail de l’import</summary>
          {v.rapport.consultables.length > 0 && (
            <>
              <p className={local.sous}>À lire, hors suivi :</p>
              <ul className={local.puces}>
                {[...compter(v.rapport.consultables.map((c) => c.texteOriginal))].map(
                  ([texte, n]) => (
                    <li key={texte}>
                      {texte}
                      {n > 1 ? ` (× ${String(n)})` : ''}
                    </li>
                  ),
                )}
              </ul>
            </>
          )}
          {p.decisions.length > 0 && (
            <>
              <p className={local.sous}>Ce que le document ne disait pas :</p>
              <ul className={local.puces}>
                {p.decisions.map((d, i) => (
                  <li key={i}>
                    <b>{SUJETS[d.sujet] ?? d.sujet}</b> — {d.texte}
                  </li>
                ))}
              </ul>
            </>
          )}
        </details>
      )}

      {extra}

      {p.dureeSemaines !== null ? (
        <p className={local.meta}>Durée : {p.dureeSemaines} semaines, écrite par le document.</p>
      ) : (
        <label className={local.question}>
          <span>
            Le document ne fixe pas de durée. Combien de semaines veux-tu suivre ce programme ?
          </span>
          <select
            value={duree ?? ''}
            onChange={(e) => onDuree(e.target.value === '' ? null : Number(e.target.value))}
          >
            <option value="">Choisir</option>
            {Array.from({ length: LIMITES.semainesMax }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n} semaine{n > 1 ? 's' : ''}
              </option>
            ))}
          </select>
        </label>
      )}

      {confirmation ??
        (resultat?.statut === 'nouvelle-version-a-confirmer' ? (
          <div className={local.confirme}>
            <p>
              « {resultat.actuelle.nom} » est déjà importé. Celui-ci sera une NOUVELLE version : les
              cycles commencés gardent la leur.
            </p>
            <button
              type="button"
              className={styles.primary}
              disabled={occupe}
              onClick={() => onImporter(true)}
            >
              Importer la nouvelle version
            </button>
            <button type="button" className={styles.secondary} onClick={onAnnuler}>
              Annuler
            </button>
          </div>
        ) : (
          <button
            type="button"
            className={styles.primary}
            disabled={!dureeOk || occupe}
            onClick={() => onImporter(false)}
          >
            Importer ce programme
          </button>
        ))}
    </div>
  );
}
