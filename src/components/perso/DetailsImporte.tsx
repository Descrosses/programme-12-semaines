/**
 * ME, MYSELF & I — ce qu'on sait d'un programme importé, et ce qu'on peut en
 * faire (lot 5 de l'ADR).
 *
 * Archiver est la voie normale : la version sort de la liste, ses cycles la
 * gardent. Supprimer est refusé tant qu'un cycle la désigne — ses séries
 * resteraient sans programme —, et l'écran le dit au lieu de griser.
 */

import { useState } from 'react';
import type { ProgrammeImporteRow } from '../../db/db';
import { archiverProgramme, supprimerProgramme } from '../../db/programmesImportes';
import local from './Perso.module.css';
import { SUJETS } from './ImportProgramme';
import { phraseSuivi } from './suivi';

export function DetailsImporte({ row }: { row: ProgrammeImporteRow }) {
  const [confirmer, setConfirmer] = useState(false);
  const [refus, setRefus] = useState<string | null>(null);
  const doc = row.document;
  const duree = row.reponses.dureeSemaines ?? doc.dureeSemaines ?? 0;

  async function supprimer() {
    const r = await supprimerProgramme(row.cle);
    setConfirmer(false);
    if (r === 'utilise-par-un-cycle') {
      setRefus(
        'Un cycle suit ce programme : le supprimer laisserait ses séances sans programme. Archive-le plutôt.',
      );
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

      {confirmer ? (
        <div className={local.confirme}>
          <p>
            Supprimer « {row.nom} » ? Le fichier importé disparaît de MAJK. Cette action ne se
            défait pas.
          </p>
          <button type="button" className={local.danger} onClick={() => void supprimer()}>
            Supprimer définitivement
          </button>
          <button type="button" className={local.secondaire} onClick={() => setConfirmer(false)}>
            Annuler
          </button>
        </div>
      ) : (
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
          <button
            type="button"
            className={local.secondaire}
            onClick={() => {
              setRefus(null);
              setConfirmer(true);
            }}
          >
            Supprimer
          </button>
        </div>
      )}
    </div>
  );
}
