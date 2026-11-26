/**
 * ME, MYSELF & I — ce qu'on sait d'un programme importé, et ce qu'on peut en
 * faire (lot 5 de l'ADR).
 *
 * Archiver est la voie douce : la version sort de la liste, ses cycles la
 * gardent. Supprimer une version qu'aucun cycle ne suit se confirme une fois.
 *
 * Supprimer une version qu'un cycle suit était REFUSÉ ; Guillaume (26
 * novembre) : « demander une confirmation à l'utilisateur s'il est sûr de
 * son choix, mais après sa seconde confirmation, on supprime ». Deux
 * confirmations, donc : la première dit exactement ce qui part avec le
 * programme (cycles, séances faites, séries), la seconde est la dernière
 * chance. Le programme ET ses cycles partent ensemble (`avecSesCycles`) :
 * un cycle sans son programme rendrait les sauvegardes irrestaurables.
 */

import { useState } from 'react';
import type { ProgrammeImporteRow } from '../../db/db';
import {
  archiverProgramme,
  bilanSuppression,
  supprimerProgramme,
  type BilanSuppression,
} from '../../db/programmesImportes';
import local from './Perso.module.css';
import { SUJETS } from './ImportProgramme';
import { phraseSuivi } from './suivi';

const pluriel = (n: number, mot: string) => `${String(n)} ${mot}${n > 1 ? 's' : ''}`;

/** Ce qui part avec le programme, dit en clair (première confirmation). */
export function phraseBilan(nom: string, b: BilanSuppression): string {
  const qui = b.cycles > 1 ? `${String(b.cycles)} cycles suivent` : 'Un cycle suit';
  return `${qui} « ${nom} » : ${pluriel(b.seances, 'séance')} faite${b.seances > 1 ? 's' : ''} et ${pluriel(b.series, 'série')} enregistrée${b.series > 1 ? 's' : ''}. Supprimer le programme efface aussi ${b.cycles > 1 ? 'ces cycles' : 'ce cycle'} et tout ce qui y a été noté : séances, séries, remarques, photos de suivi.`;
}

/**
 * `aucune` : rien d'ouvert. `simple` : aucune trace, une confirmation.
 * `premiere` puis `seconde` : un cycle suit, deux confirmations.
 */
type Etape = 'aucune' | 'simple' | 'premiere' | 'seconde';

export function DetailsImporte({ row }: { row: ProgrammeImporteRow }) {
  const [etape, setEtape] = useState<Etape>('aucune');
  const [bilan, setBilan] = useState<BilanSuppression | null>(null);
  const [refus, setRefus] = useState<string | null>(null);
  const doc = row.document;
  const duree = row.reponses.dureeSemaines ?? doc.dureeSemaines ?? 0;

  async function demander() {
    setRefus(null);
    const b = await bilanSuppression(row.cle);
    setBilan(b);
    setEtape(b.cycles > 0 ? 'premiere' : 'simple');
  }

  async function supprimer() {
    const r = await supprimerProgramme(row.cle, { avecSesCycles: etape === 'seconde' });
    setEtape('aucune');
    if (r === 'utilise-par-un-cycle') {
      // Un cycle est apparu entre la confirmation simple et la suppression :
      // on repart par les deux confirmations.
      void demander();
    } else if (r === 'introuvable') {
      setRefus('Ce programme a déjà été supprimé.');
    }
  }

  return (
    <div className={local.detail}>
      <p className={local.meta}>
        Importé le {row.importeLe.split('-').reverse().join('/')} · version {row.rev} · {duree}{' '}
        semaine{duree > 1 ? 's' : ''}
        {doc.dureeSemaines === null ? ' (ton choix)' : ''}
      </p>
      <p className={phraseSuivi(doc) === 'Suivi complet' ? local.complet : local.partiel}>
        {phraseSuivi(doc)}
      </p>

      {doc.decisions.length > 0 && (
        <>
          <p className={local.sous}>Ce que le document ne disait pas :</p>
          <ul className={local.puces}>
            {doc.decisions.map((d, i) => (
              <li key={i}>
                <b>{SUJETS[d.sujet] ?? d.sujet}</b> — {d.texte}
              </li>
            ))}
          </ul>
        </>
      )}

      {refus && (
        <p className={local.refusCourt} role="alert">
          {refus}
        </p>
      )}

      {etape === 'simple' && (
        <div className={local.confirme}>
          <p>
            Supprimer « {row.nom} » ? Le fichier importé disparaît de MAJK. Cette action ne se
            défait pas.
          </p>
          <button type="button" className={local.danger} onClick={() => void supprimer()}>
            Supprimer définitivement
          </button>
          <button type="button" className={local.secondaire} onClick={() => setEtape('aucune')}>
            Annuler
          </button>
        </div>
      )}

      {etape === 'premiere' && bilan !== null && (
        <div className={local.confirme} role="alert">
          <p>{phraseBilan(row.nom, bilan)}</p>
          <button type="button" className={local.danger} onClick={() => setEtape('seconde')}>
            Continuer
          </button>
          <button type="button" className={local.secondaire} onClick={() => setEtape('aucune')}>
            Annuler
          </button>
        </div>
      )}

      {etape === 'seconde' && (
        <div className={local.confirme} role="alert">
          <p>
            <b>Dernière confirmation.</b> Le programme « {row.nom} » et{' '}
            {bilan !== null && bilan.cycles > 1 ? 'ses cycles' : 'son cycle'} seront effacés de ce
            téléphone. Cette action ne se défait pas. Pour en garder une trace, exporte d’abord tes
            données (Réglages).
          </p>
          <button type="button" className={local.danger} onClick={() => void supprimer()}>
            Oui, tout supprimer
          </button>
          <button type="button" className={local.secondaire} onClick={() => setEtape('aucune')}>
            Annuler
          </button>
        </div>
      )}

      {etape === 'aucune' && (
        <div className={local.gestes}>
          <button
            type="button"
            className={local.secondaire}
            onClick={() => {
              setRefus(null);
              void archiverProgramme(row.cle, !row.archive);
            }}
          >
            {row.archive ? 'Désarchiver' : 'Archiver'}
          </button>
          <button type="button" className={local.secondaire} onClick={() => void demander()}>
            Supprimer
          </button>
        </div>
      )}
    </div>
  );
}
