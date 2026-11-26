/**
 * « Il te reste aujourd'hui » — la carte du haut de l'onglet Nutrition, en
 * mode semaine de repas (refonte « Journal », maquette C de Guillaume, 26
 * novembre).
 *
 * UNE question, UNE réponse : ce qu'il reste à manger, en grand. Dessous, ce
 * qui a été mangé face à la cible, en barres — une par chiffre posé. Elle
 * remplace à la fois « Ta cible aujourd'hui » et « Mon compte du jour » : les
 * deux disaient la même journée en deux cartes.
 *
 * - une macro NON POSÉE dans la cible n'a pas de barre (jamais 0) ;
 * - au-delà de la cible, la carte le dit en mots (« Tu as dépassé… ») : une
 *   barre pleine seule ne distinguerait pas 100 % de 130 % ;
 * - sans cible, elle montre ce qui a été mangé, sans reste ni barre.
 */

import type { CibleSaisie } from '../data/ciblesNutrition';
import styles from './ResteDuJour.module.css';

interface Mange {
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

const fr = (n: number) => Math.round(n).toLocaleString('fr-FR');

function Barre({
  nom,
  mange,
  cible,
  unite,
  ton,
}: {
  nom: string;
  mange: number;
  cible: number;
  unite: string;
  ton: 'kcal' | 'proteines' | 'glucides' | 'lipides';
}) {
  const part = cible > 0 ? Math.min(100, Math.round((mange / cible) * 100)) : 0;
  return (
    <div className={styles.ligne} data-barre={ton}>
      <span>{nom}</span>
      <span className={styles.piste} aria-hidden="true">
        <span className={styles.rempli} data-ton={ton} style={{ width: `${String(part)}%` }} />
      </span>
      <b className="tnum">
        {fr(mange)} / {fr(cible)}
        {unite}
      </b>
    </div>
  );
}

export function ResteDuJour({
  cible,
  mange,
  repas,
  enPlus,
}: {
  cible: CibleSaisie | null;
  mange: Mange;
  /** Les repas cochés, sur ceux que la journée prévoit. */
  repas: { faits: number; prevus: number };
  /** Les aliments ajoutés hors des repas. */
  enPlus: number;
}) {
  const reste = cible === null ? null : Math.round(cible.kcal) - Math.round(mange.kcal);
  const compte = [
    cible === null ? null : `${fr(mange.kcal)} mangées sur ${fr(cible.kcal)}`,
    `${String(repas.faits)} repas sur ${String(repas.prevus)}`,
    enPlus > 0 ? `${String(enPlus)} aliment${enPlus > 1 ? 's' : ''} en plus` : null,
  ].filter((x): x is string => x !== null);

  return (
    <section
      className={styles.carte}
      aria-label="Ce qu’il te reste aujourd’hui"
      data-compte-du-jour
      data-reste={reste === null ? 'sans-cible' : reste < 0 ? 'depasse' : 'reste'}
    >
      <p className={styles.label}>
        {reste === null
          ? 'Mangé aujourd’hui'
          : reste < 0
            ? 'Tu as dépassé ta cible de'
            : 'Il te reste aujourd’hui'}
      </p>
      <p className={`${styles.gros} tnum`}>
        {fr(reste === null ? mange.kcal : Math.abs(reste))}
        <small>kcal</small>
      </p>
      <p className={styles.compte}>{compte.join(' · ')}</p>
      {repas.faits === 0 && enPlus === 0 && (
        <p className={styles.aide}>
          Coche tes repas au fil de la journée : le compte se fait tout seul.
        </p>
      )}
      {cible !== null && (
        <div className={styles.barres}>
          <Barre nom="Calories" mange={mange.kcal} cible={cible.kcal} unite="" ton="kcal" />
          {cible.proteinG !== null && (
            <Barre
              nom="Protéines"
              mange={mange.proteinG}
              cible={cible.proteinG}
              unite=" g"
              ton="proteines"
            />
          )}
          {cible.carbsG !== null && (
            <Barre
              nom="Glucides"
              mange={mange.carbsG}
              cible={cible.carbsG}
              unite=" g"
              ton="glucides"
            />
          )}
          {cible.fatG !== null && (
            <Barre nom="Lipides" mange={mange.fatG} cible={cible.fatG} unite=" g" ton="lipides" />
          )}
        </div>
      )}
    </section>
  );
}
