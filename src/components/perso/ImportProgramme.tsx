/**
 * ME, MYSELF & I — importer un programme (lot 5 de l'ADR).
 *
 * Le fichier est lu et VALIDÉ avant toute écriture, et ce qu'il contient est
 * montré avant de l'enregistrer : le suivi (complet ou partiel), les
 * consignes qui resteront à lire, ce que le document ne disait pas, et la
 * durée. Quand le document ne fixe pas sa durée, la question est posée, sans
 * réponse proposée d'office.
 */

import { useState } from 'react';
import { importerProgramme, type ResultatImport } from '../../db/programmesImportes';
import { LIMITES, type ResultatValidation } from '../../engine/perso/types';
import { validerProgramme } from '../../engine/perso/valider';
import styles from '../../screens/Screens.module.css';
import local from './Perso.module.css';
import { lignesDe, phraseSuivi } from './suivi';

/** Les sujets des décisions, dits en français. */
export const SUJETS: Record<string, string> = {
  jours: 'Jours',
  exclusion: 'Exclusion',
  identite: 'Même exercice',
  convention: 'Convention',
  texte: 'Texte',
};

type Lu = { texte: string; nomFichier: string; validation: ResultatValidation };

export function ImportProgramme({ onImporte }: { onImporte: (cle: string) => void }) {
  const [lu, setLu] = useState<Lu | null>(null);
  const [duree, setDuree] = useState<number | null>(null);
  const [resultat, setResultat] = useState<ResultatImport | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function lire(fichier: File) {
    setResultat(null);
    setDuree(null);
    setMessage(null);
    const texte = await fichier.text();
    setLu({ texte, nomFichier: fichier.name, validation: validerProgramme(texte) });
  }

  async function importer(confirmer: boolean) {
    if (lu === null) return;
    const r = await importerProgramme(lu.texte, {
      dureeSemaines: duree,
      confirmerNouvelleVersion: confirmer,
    });
    setResultat(r);
    if (r.statut === 'importe') {
      setMessage(`« ${lu.validation.ok ? lu.validation.programme.nom : ''} » est importé.`);
      setLu(null);
      onImporte(r.cle);
    } else if (r.statut === 'deja-importe') {
      setMessage('Ce programme est déjà importé, à l’identique : rien n’a été ajouté.');
      setLu(null);
    } else if (r.statut === 'refuse') {
      // Le fichier a été relu à l'enregistrement : on montre ses erreurs.
      setLu({ ...lu, validation: { ok: false, erreurs: r.erreurs } });
    }
  }

  const v = lu?.validation ?? null;

  return (
    <div className={local.panneau}>
      <h3 className={local.titre}>Importer un programme</h3>
      <p className={styles.cardSub}>
        Un fichier .json au format MAJK, préparé à partir du PDF de ton coach. Rien n’est enregistré
        avant ta confirmation.
      </p>
      <label className={local.fichier}>
        Choisir un fichier
        <input
          type="file"
          accept="application/json,.json"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (f) void lire(f);
          }}
        />
      </label>

      {message && (
        <p className={local.ok} role="status">
          {message}
        </p>
      )}

      {v !== null && !v.ok && (
        <div className={local.refus} role="alert">
          <p>
            <b>Fichier refusé</b> ({v.erreurs.length} erreur{v.erreurs.length > 1 ? 's' : ''}). Rien
            n’a été enregistré.
          </p>
          <ul>
            {v.erreurs.slice(0, 20).map((e, i) => (
              <li key={i}>
                {e.message} <span className={local.chemin}>{e.chemin}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {v?.ok && (
        <ApercuImport
          validation={v}
          duree={duree}
          onDuree={setDuree}
          resultat={resultat}
          onImporter={(confirmer) => void importer(confirmer)}
          onAnnuler={() => setLu(null)}
        />
      )}
    </div>
  );
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
}: {
  validation: Extract<ResultatValidation, { ok: true }>;
  duree: number | null;
  onDuree: (duree: number | null) => void;
  resultat: ResultatImport | null;
  onImporter: (confirmer: boolean) => void;
  onAnnuler: () => void;
}) {
  const p = v.programme;
  const dureeOk = p.dureeSemaines !== null || duree !== null;
  return (
    <div className={local.apercu}>
      <p className={local.nom}>{p.nom}</p>
      <p className={local.meta}>
        {p.source.document} · {p.semaines[0]?.seances.length ?? 0} séance
        {(p.semaines[0]?.seances.length ?? 0) > 1 ? 's' : ''} par semaine · {lignesDe(p).length}{' '}
        exercices
      </p>
      <p className={v.rapport.suiviComplet ? local.complet : local.partiel}>{phraseSuivi(p)}</p>
      {v.rapport.consultables.length > 0 && (
        <>
          <p className={local.sous}>À lire, hors suivi :</p>
          <ul className={local.puces}>
            {v.rapport.consultables.map((c) => (
              <li key={c.chemin}>{c.texteOriginal}</li>
            ))}
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

      {resultat?.statut === 'nouvelle-version-a-confirmer' ? (
        <div className={local.confirme}>
          <p>
            « {resultat.actuelle.nom} » est déjà importé. Celui-ci sera une NOUVELLE version : les
            cycles commencés gardent la leur.
          </p>
          <button type="button" className={styles.primary} onClick={() => onImporter(true)}>
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
          disabled={!dureeOk}
          onClick={() => onImporter(false)}
        >
          Importer ce programme
        </button>
      )}
    </div>
  );
}
