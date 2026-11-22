/**
 * Les outils de coach — hors de la vue des utilisateurs.
 *
 * Les programmes de MAJK sont faits pour ceux qui s'entraînent. Préparer la
 * fiche nutrition d'un client n'est pas leur affaire : ce formulaire n'avait
 * rien à faire dans les Réglages de chacun (décision de Guillaume).
 *
 * Aucun lien n'y mène dans l'application. On l'ouvre par son adresse,
 * `…/#/admin`, dans le navigateur. C'est sans conséquence : la carte
 * n'enregistre rien, elle n'a donc besoin d'aucune donnée de l'app installée.
 */

import { ScreenHeader } from '../components/ScreenHeader';
import { CarteFichePour } from './SettingsScreen';
import styles from './Screens.module.css';

export function AdminScreen({ onRetour }: { onRetour: () => void }) {
  return (
    <div className={styles.screen}>
      <ScreenHeader eyebrow="Coach" title="Admin" subtitle="Outils hors programme" />
      <CarteFichePour />
      <button
        type="button"
        className={styles.secondary}
        style={{ width: '100%', margin: '0 0 24px' }}
        onClick={onRetour}
      >
        Retour à l’accueil
      </button>
    </div>
  );
}
