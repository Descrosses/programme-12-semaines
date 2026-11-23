/**
 * Le calcul des cibles, pour le coach (`#/admin`), à partir du résumé du
 * questionnaire collé tel quel.
 *
 * Règles (`regles-cibles-nutrition.md`) : chaque étape est montrée, la cible
 * est une ESTIMATION ; dans les cas du §6 (exclusions, sous un plancher)
 * l'écran dit que l'appli ne la proposerait pas — le coach voit quand même
 * les chiffres et décide. Rien n'est enregistré : « Reprendre ces chiffres »
 * remplit seulement les champs de la fiche, la même cible les deux jours (§5).
 */

import { OPTIONS } from '../data/questionnairePlanAlimentaire';
import { calculerCibles, imc, type ResultatCibles } from '../engine/calculCibles';
import type { LectureResume } from '../engine/lireResumeQuestionnaire';
import styles from './CalculCoach.module.css';

const lib = (cle: keyof typeof OPTIONS, v: string | null) =>
  OPTIONS[cle].find(([x]) => x === v)?.[1] ?? '';

const fr = (n: number, d = 1) => n.toLocaleString('fr-FR', { maximumFractionDigits: d });

export function CalculCoach({
  lecture,
  onReprendre,
}: {
  lecture: LectureResume;
  onReprendre: (r: ResultatCibles) => void;
}) {
  if (lecture.profil === null) {
    return (
      <div className={styles.bloc} data-calcul="incomplet">
        <p className={styles.titre}>Questionnaire reconnu, calcul impossible</p>
        <p className={styles.texte}>
          Il manque : {lecture.manquants.join(', ')}. Rien n’est deviné : demande-lui de compléter,
          ou pose la cible toi-même.
        </p>
      </div>
    );
  }

  const p = lecture.profil;
  const r = calculerCibles(p);
  const activite =
    p.seances === '0'
      ? 'aucune séance'
      : `${lib('sessions', p.seances)} séance${p.seances === '1' ? '' : 's'} de ${lib('duration', p.duree).toLowerCase()}`;
  const objectif =
    lib('goal', p.objectif) + (p.rythme ? ` · ${lib('pace', p.rythme).toLowerCase()}` : '');

  return (
    <div className={styles.bloc} data-calcul={r.proposable ? 'proposable' : 'a-voir'}>
      <p className={styles.titre}>Le calcul de l’appli</p>
      <p className={styles.profil}>
        {lib('sex', p.sexe)}, {p.age} ans, {fr(p.tailleCm)} cm, {fr(p.poidsKg)} kg (IMC {fr(imc(p))}
        ) · {lib('job', p.travail).toLowerCase()}, {lib('steps', p.pas).toLowerCase()} pas ·{' '}
        {activite} · {objectif}
      </p>

      {r.exclusions.length > 0 && (
        <div className={styles.alerte} role="note">
          <p className={styles.alerteTitre}>L’appli ne le proposerait pas à la personne</p>
          <ul className={styles.liste}>
            {r.exclusions.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
          <p className={styles.texte}>Les chiffres restent affichés : c’est toi qui décides.</p>
        </div>
      )}

      <table className={styles.etapes}>
        <tbody>
          {r.etapes.map((e) => (
            <tr key={e.libelle}>
              <th scope="row">{e.libelle}</th>
              <td className={styles.calcul}>{e.calcul}</td>
              <td className={styles.resultat}>{e.resultat}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {r.alertes.map((a) => (
        <p key={a} className={styles.attention}>
          {a}
        </p>
      ))}

      <p className={styles.cible}>
        <b>{r.kcal.toLocaleString('fr-FR')} kcal</b> · {r.proteinG} g P · {r.carbsG} g G · {r.fatG}{' '}
        g L
      </p>
      <p className={styles.texte}>
        Une estimation, pas une mesure. Même cible les jours d’entraînement et de repos ; à
        réajuster sur le poids réel toutes les deux semaines.
      </p>
      <button type="button" className={styles.bouton} onClick={() => onReprendre(r)}>
        Reprendre ces chiffres pour les deux journées
      </button>
    </div>
  );
}
