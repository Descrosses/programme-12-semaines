/**
 * « Programme indisponible » — un cycle dont MAJK ne connaît plus le
 * programme (lot 3 de l'ADR ME, MYSELF & I).
 *
 * Avant, l'application retombait sur POWER 12 en silence : elle aurait joué
 * les séances de POWER et enregistré leurs séries sous ce cycle. L'écran dit
 * maintenant ce qui se passe, et que rien n'a été effacé.
 */

import { ScreenHeader } from '../components/ScreenHeader';
import styles from './Screens.module.css';

export function ProgrammeIndisponibleScreen({
  onReglages,
  onAccueil,
}: {
  onReglages: () => void;
  onAccueil: () => void;
}) {
  return (
    <div className={styles.screen}>
      <ScreenHeader title="Programme indisponible" subtitle="Rien n’a été effacé" />
      <section className={styles.card}>
        <p className={styles.cardSub}>
          Le programme de ce cycle n’est plus dans MAJK. Tes séances et tes séries sont toujours
          enregistrées.
        </p>
        <p className={styles.cardSub}>
          Pour le retrouver, restaure une sauvegarde qui le contient, dans Réglages. Tu peux aussi
          choisir un autre programme depuis l’accueil.
        </p>
        <button type="button" className={styles.primary} onClick={onReglages}>
          Restaurer une sauvegarde
        </button>
        <button type="button" className={styles.secondary} onClick={onAccueil}>
          Revenir à l’accueil
        </button>
      </section>
    </div>
  );
}
