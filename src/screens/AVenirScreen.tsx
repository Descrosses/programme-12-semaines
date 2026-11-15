/**
 * Un onglet dont la place est posée et le contenu pas encore écrit.
 *
 * MASS FORCE en a deux — Progrès et Nutrition (décision de Guillaume : « à
 * mettre en place quand même »). L'écran le dit en une phrase, sans aucun
 * chiffre : afficher la nutrition ou les courbes d'un autre programme serait
 * précisément la panne que les onglets par programme ont supprimée.
 */
import { ScreenHeader } from '../components/ScreenHeader';
import type { VisuelNom } from '../data/visuels';
import styles from './Screens.module.css';

export function AVenirScreen({
  titre,
  visuel,
}: {
  titre: string;
  /** Le bandeau de la famille pour cet onglet (MASS), s'il existe. */
  visuel?: VisuelNom;
}) {
  return (
    <div className={styles.screen}>
      <ScreenHeader
        title={titre}
        subtitle="Contenu à venir"
        {...(visuel === undefined ? {} : { visuel })}
      />
      <section className={styles.card}>
        <p className={styles.cardSub}>
          Cette partie du programme n’est pas encore écrite. Elle arrivera dans une prochaine
          version ; rien n’est affiché d’ici là.
        </p>
      </section>
    </div>
  );
}
