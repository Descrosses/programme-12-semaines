/**
 * La montée en charge, en tête de la carte du premier mouvement lourd de la
 * séance (§6 du .md POWER, §2 bis de MASS FORCE ; décision de Guillaume,
 * 23 novembre).
 *
 * Pensée pour un débutant : le principe est dit en une phrase avant les
 * chiffres. Chaque palier a son bouton « Fait », qui lance la minute de
 * repos. Rien n'est enregistré : ces séries d'approche ne comptent pas dans
 * les séries prescrites, et ne doivent jamais toucher la progression.
 *
 * Le bloc disparaît dès que la première série de travail est validée.
 *
 * REPLIÉ par défaut (Guillaume, 23 novembre : « menu repliable ») : une
 * ligne dit les paliers ; on l'ouvre pour les kilos et les boutons. Replier
 * ne perd pas les paliers déjà faits.
 */

import { useState } from 'react';
import { POURQUOI_MONTEE, REPOS_MONTEE_SEC } from '../data/monteeEnCharge';
import { paliersMontee } from '../engine/monteeEnCharge';
import type { RestTimer } from '../state/useRestTimer';
import styles from '../screens/Session.module.css';

export function MonteeEnCharge({
  chargeTravail,
  pas,
  timer,
}: {
  /** La charge de la première série de travail, ou `null` si elle n'est pas connue. */
  chargeTravail: number | null;
  pas: number;
  timer: Pick<RestTimer, 'start'>;
}) {
  const [faits, setFaits] = useState<ReadonlySet<number>>(new Set());
  const [ouvert, setOuvert] = useState(false);
  const paliers = paliersMontee(chargeTravail, pas);
  const resume = `${paliers.map((p) => p.reps).join(' · ')} reps · 1 min entre chaque${
    faits.size ? ` · ${faits.size}/${paliers.length} faits` : ''
  }`;
  return (
    <section className={styles.montee} aria-label="Montée en charge">
      <button
        type="button"
        className={styles.monteeEntete}
        aria-expanded={ouvert}
        aria-controls="montee-paliers"
        onClick={() => setOuvert((o) => !o)}
      >
        <span className={styles.monteeEnteteTexte}>
          <span className={styles.monteeTitre}>Montée en charge · avant tes séries</span>
          <span className={`${styles.monteeResume} tnum`}>{resume}</span>
        </span>
        <span
          className={`${styles.monteeChevron} ${ouvert ? styles.monteeChevronOuvert : ''}`}
          aria-hidden="true"
        >
          ⌄
        </span>
      </button>
      <div id="montee-paliers" hidden={!ouvert}>
        <p className={styles.monteeTexte}>
          Sur ce premier mouvement lourd, quelques séries d’approche mènent à ta charge de travail,
          1 min de repos entre chacune. {POURQUOI_MONTEE} Elles ne comptent pas dans tes séries.
        </p>
        {chargeTravail === null && (
          <p className={styles.monteeTexte}>
            Ta charge de travail n’est pas encore connue : calcule chaque palier sur celle que tu
            vas utiliser.
          </p>
        )}
        <ol className={styles.monteePaliers}>
          {paliers.map((p, i) => {
            const fait = faits.has(i);
            return (
              <li key={i} className={`${styles.monteePalier} ${fait ? styles.monteeFait : ''}`}>
                <span className={`${styles.monteeReps} tnum`}>{p.reps} reps</span>
                <span className={styles.monteeChargeBloc}>
                  <span className={`${styles.monteeCharge} tnum`}>{p.kg ?? p.pct}</span>
                  {p.kg !== null && <span className={styles.monteePct}>{p.pct}</span>}
                </span>
                <button
                  type="button"
                  className={styles.monteeBouton}
                  aria-pressed={fait}
                  aria-label={`Palier ${i + 1} : ${p.reps} reps à ${p.kg ?? p.pct}${fait ? ', fait' : ''}`}
                  onClick={() => {
                    if (fait) return;
                    setFaits((f) => new Set(f).add(i));
                    timer.start(REPOS_MONTEE_SEC, `Palier ${i + 1}/${paliers.length}`);
                  }}
                >
                  {fait ? 'Fait' : 'Fait → 1 min'}
                </button>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
