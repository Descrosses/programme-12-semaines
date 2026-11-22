/**
 * Le rappel de sauvegarde, en bas de la séance du dernier jour
 * d'entraînement de la semaine (décision de Guillaume).
 *
 * Placé juste au-dessus de « Séance terminée » : c'est là qu'on arrive en
 * fin de séance, et le bouton lance l'export sans passer par les Réglages.
 * Il se tait dès qu'un export a été fait aujourd'hui, d'où qu'il parte.
 */

import { useState } from 'react';
import { downloadExport } from '../db/export';
import { etatRappelSauvegarde } from '../engine/rappelSauvegarde';
import { aujourdhuiLocal, lireDernierExport } from '../state/dernierExport';
import styles from '../screens/Session.module.css';

export function RappelSauvegarde({
  joursDeLaSemaine,
  jour,
}: {
  joursDeLaSemaine: readonly number[];
  jour: number;
}) {
  const [dernierExport, setDernierExport] = useState(lireDernierExport);
  const [erreur, setErreur] = useState(false);
  const etat = etatRappelSauvegarde({
    joursDeLaSemaine,
    jour,
    dernierExport,
    aujourdhui: aujourdhuiLocal(),
  });
  if (etat === null) return null;

  if (etat === 'fait') {
    return (
      <section className={styles.guidance} role="status">
        <strong>Sauvegarde faite ✓</strong>
        <p>Tes données de la semaine sont à l’abri dans ton fichier d’export.</p>
      </section>
    );
  }

  return (
    <section className={styles.guidance}>
      <strong>Dernière séance de la semaine : sauvegarde tes données 💾</strong>
      <p>
        Un export par semaine, et en cas de pépin (téléphone perdu, données effacées) tu ne perds
        jamais plus d’une semaine. Range le fichier hors du téléphone (mail, cloud).
      </p>
      {erreur && <p role="alert">L’export n’a pas pu se faire. Réessaie depuis les Réglages.</p>}
      <div className={styles.guidanceActions}>
        <button
          type="button"
          onClick={() =>
            void downloadExport().then(
              () => setDernierExport(lireDernierExport()),
              () => setErreur(true),
            )
          }
        >
          Exporter mes données
        </button>
      </div>
    </section>
  );
}
