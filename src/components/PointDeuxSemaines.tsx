/**
 * Le point des deux semaines, dans l'onglet Nutrition
 * (`regles-cibles-nutrition.md` §7, moteur `engine/reajustement.ts`,
 * lot 4 de la nutrition automatique).
 *
 * Décisions d'ergonomie (Guillaume, 26 novembre : « je compte sur toi ») :
 * - tant que le point n'est pas dû, UNE ligne discrète : la date du prochain
 *   point et le geste utile (se peser 4 matins par semaine) ;
 * - le jour venu, une carte dit le constat (poids moyen, rythme) AVANT la
 *   proposition, et la raison en une phrase ;
 * - toujours une proposition : « Accepter cette cible » ou « Garder ma
 *   cible ». Les deux referment le point pour 2 semaines — un refus n'est
 *   pas redemandé tous les jours ;
 * - cas du §6 : « vu avec Guillaume », sans aucun chiffre.
 */

import type { MacrosCompletes } from '../data/ciblesNutrition';
import { REAJUSTEMENT, type Objectif } from '../data/reglesCiblesNutrition';
import type { PointDeuxSemaines as Point } from '../engine/reajustement';
import styles from './PointDeuxSemaines.module.css';

const kcalFr = (n: number) => n.toLocaleString('fr-FR');
const pct = (x: number, d = 1) => (x * 100).toLocaleString('fr-FR', { maximumFractionDigits: d });

/** « − 0,4 % par semaine », « + 0,2 % par semaine », « stable ». */
export function rythmeEnMots(rythme: number): string {
  const v = Math.round(rythme * 1000) / 1000;
  if (v === 0) return 'stable';
  return `${v > 0 ? '+' : '−'} ${pct(Math.abs(v))} % par semaine`;
}

/** §7 — la raison de la proposition, avec les bornes du .md. */
export function raisonDe(objectif: Objectif, delta: number): string {
  if (objectif === 'perte') {
    return delta < 0
      ? `Tu perds moins vite que prévu (moins de ${pct(REAJUSTEMENT.perte.min, 2)} % par semaine).`
      : `Tu perds plus vite que prévu (plus de ${pct(REAJUSTEMENT.perte.max, 2)} % par semaine).`;
  }
  if (objectif === 'prise') {
    return delta > 0
      ? `Tu prends moins vite que prévu (moins de ${pct(REAJUSTEMENT.prise.min, 2)} % par semaine).`
      : `Tu prends plus vite que prévu (plus de ${pct(REAJUSTEMENT.prise.max, 2)} % par semaine).`;
  }
  return delta < 0
    ? `Ton poids est monté de plus de ${pct(REAJUSTEMENT.maintienEcart, 2)} %.`
    : `Ton poids est descendu de plus de ${pct(REAJUSTEMENT.maintienEcart, 2)} %.`;
}

function dateEnMots(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y!, m! - 1, d!)).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  });
}

const kg = (x: number) => x.toLocaleString('fr-FR', { maximumFractionDigits: 1 });

export function PointDeuxSemaines({
  point,
  objectif,
  kcalActuelles,
  onAccepter,
  onGarder,
}: {
  point: Point;
  objectif: Objectif;
  kcalActuelles: number;
  onAccepter: (cible: MacrosCompletes) => void;
  /** Referme le point pour 2 semaines sans toucher à la cible. */
  onGarder: () => void;
}) {
  if (point.cas === 'pas-du') {
    return (
      <p className={styles.prochain} data-point="pas-du">
        Prochain point sur ta cible : le {dateEnMots(point.prochainLe)}. Pèse-toi au moins{' '}
        {REAJUSTEMENT.peseesMin} matins par semaine d’ici là.
      </p>
    );
  }

  if (point.cas === 'pesees') {
    return (
      <section className={styles.carte} aria-label="Point des 2 semaines" data-point="pesees">
        <h2 className={styles.titre}>Point des 2 semaines</h2>
        <p className={styles.texte}>
          Il manque des pesées pour faire le point : {point.recentes} sur les 7 derniers jours,{' '}
          {point.precedentes} la semaine d’avant. Il en faut au moins {REAJUSTEMENT.peseesMin} par
          semaine.
        </p>
        <p className={styles.note}>
          Pèse-toi plus souvent, le matin : le point se fera dès qu’il y en aura assez. Rien n’est
          deviné en attendant.
        </p>
      </section>
    );
  }

  if (point.cas === 'coach') {
    return (
      <section className={styles.carte} aria-label="Point des 2 semaines" data-point="coach">
        <h2 className={styles.titre}>Ton ajustement sera vu avec Guillaume</h2>
        <p className={styles.texte}>
          Tes pesées demandent un avis personnel plutôt qu’un ajustement automatique. Écris-lui : il
          te répondra avec ta cible.
        </p>
        <button type="button" className={styles.secondaire} onClick={onGarder}>
          Compris
        </button>
      </section>
    );
  }

  const constat = (
    <p className={styles.texte}>
      Ton poids moyen sur 7 jours : <b className="tnum">{kg(point.moyenneKg)} kg</b> (
      {rythmeEnMots(point.rythme)}).
    </p>
  );

  if (point.cas === 'stable') {
    return (
      <section className={styles.carte} aria-label="Point des 2 semaines" data-point="stable">
        <h2 className={styles.titre}>Point des 2 semaines : on ne change rien</h2>
        {constat}
        <p className={styles.texte}>
          C’est dans le rythme de ton objectif : ta cible reste à {kcalFr(kcalActuelles)} kcal.
        </p>
        <button type="button" className={styles.secondaire} onClick={onGarder}>
          Compris
        </button>
      </section>
    );
  }

  const c = point.cible;
  return (
    <section className={styles.carte} aria-label="Point des 2 semaines" data-point="proposition">
      <h2 className={styles.titre}>
        Point des 2 semaines : {point.delta > 0 ? '+' : '−'} {Math.abs(point.delta)} kcal ?
      </h2>
      {constat}
      <p className={styles.texte}>{raisonDe(objectif, point.delta)}</p>
      <p className={styles.cible}>
        <b className="tnum">{kcalFr(c.kcal)} kcal</b>
        <span>
          {c.proteinG} g P · {c.carbsG} g G · {c.fatG} g L
        </span>
        <span>au lieu de {kcalFr(kcalActuelles)} kcal</span>
      </p>
      <button type="button" className={styles.principal} onClick={() => onAccepter(c)}>
        Accepter cette cible
      </button>
      <button type="button" className={styles.secondaire} onClick={onGarder}>
        Garder ma cible
      </button>
      <p className={styles.note}>
        Une proposition, jamais une obligation. Prochain point dans 2 semaines, dans les deux cas.
      </p>
    </section>
  );
}
