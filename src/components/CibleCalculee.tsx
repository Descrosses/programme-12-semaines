/**
 * « Ta cible » — la cible calculée, proposée à la fin du questionnaire
 * alimentaire (lot 1 de la nutrition automatique ; règles :
 * `regles-cibles-nutrition.md`, moteur : `engine/cibleProposee.ts`).
 *
 * Décisions d'ergonomie (Guillaume, 26 novembre : « je compte sur toi ») :
 * - le chiffre d'abord, le détail du calcul REPLIÉ (« Comment on l'a
 *   calculée ») : on le lit si on veut, il ne barre pas la route ;
 * - UN bouton, « Utiliser cette cible ». La modifier se fait ensuite dans la
 *   carte « Mes cibles nutritionnelles », que l'écran nomme (§0 : la
 *   personne l'accepte ou la modifie) ;
 * - cas du §6 : « Ta cible sera posée par Guillaume », SANS aucun chiffre ni
 *   la raison détaillée (une réponse sur la relation à la nourriture ne se
 *   renvoie pas à l'écran) ;
 * - une cible déjà posée est annoncée avant d'être remplacée ; si le plan
 *   historique est affiché, l'écran dit qu'il sera masqué (même règle que
 *   l'import d'une fiche : rien n'est effacé).
 *
 * Rien n'est écrit en base avant le bouton.
 */

import { useEffect, useState } from 'react';
import { programmeParId, type FamilleId } from '../data/catalogue';
import type { CiblesNutrition, MacrosCompletes } from '../data/ciblesNutrition';
import { cycleActif, getSettingsRow, saveSettings } from '../db/repo';
import { macrosDe, proposerCible, type PropositionCible } from '../engine/cibleProposee';
import type { EtatQuestionnaire } from '../engine/questionnairePlanAlimentaire';
import styles from './CibleCalculee.module.css';

const kcalFr = (n: number) => n.toLocaleString('fr-FR');

/** La cible enregistrée est-elle exactement celle-ci, les deux jours ? */
export function dejaEnregistree(actuelle: CiblesNutrition | null, m: MacrosCompletes): boolean {
  if (actuelle === null) return false;
  return (['train', 'rest'] as const).every((k) => {
    const j = actuelle[k];
    return (
      j.kcal === m.kcal && j.proteinG === m.proteinG && j.carbsG === m.carbsG && j.fatG === m.fatG
    );
  });
}

export function CibleCalculee({
  proposition,
  actuelle,
  planHistoriqueAffiche,
  onUtiliser,
}: {
  proposition: PropositionCible;
  actuelle: CiblesNutrition | null;
  planHistoriqueAffiche: boolean;
  onUtiliser: (m: MacrosCompletes) => void;
}) {
  if (proposition.cas === 'sans-objet') return null;

  if (proposition.cas === 'incomplet') {
    return (
      <section className={styles.carte} aria-label="Ta cible" data-cible="incomplet">
        <h2 className={styles.titre}>Ta cible</h2>
        <p className={styles.texte}>
          Le calcul n’est pas possible : il manque {proposition.manquants.join(', ')}. Complète tes
          réponses, ou envoie ton résumé à Guillaume.
        </p>
      </section>
    );
  }

  if (proposition.cas === 'coach') {
    return (
      <section className={styles.carte} aria-label="Ta cible" data-cible="coach">
        <h2 className={styles.titre}>Ta cible sera posée par Guillaume</h2>
        <p className={styles.texte}>
          Certaines de tes réponses demandent un avis personnel plutôt qu’un calcul automatique.
          Envoie-lui ton résumé ci-dessous : il te répondra avec ta cible.
        </p>
      </section>
    );
  }

  const r = proposition.resultat;
  const m = macrosDe(r);
  const enregistree = dejaEnregistree(actuelle, m);
  const ancienneKcal = actuelle?.train.kcal ?? actuelle?.rest.kcal ?? null;

  return (
    <section className={styles.carte} aria-label="Ta cible" data-cible="proposee">
      <p className={styles.badge}>Calculée pour toi</p>
      <p className={styles.kcal}>
        <b className="tnum">{kcalFr(r.kcal)}</b> kcal / jour
      </p>
      <div className={styles.macros}>
        <p>
          <span>Protéines</span>
          <b className="tnum">{r.proteinG} g</b>
        </p>
        <p>
          <span>Glucides</span>
          <b className="tnum">{r.carbsG} g</b>
        </p>
        <p>
          <span>Lipides</span>
          <b className="tnum">{r.fatG} g</b>
        </p>
      </div>
      <p className={styles.texte}>
        Une estimation à partir de tes réponses, pas une mesure. Même cible les jours d’entraînement
        et de repos.
      </p>

      <details className={styles.detail}>
        <summary>Comment on l’a calculée</summary>
        <table className={styles.etapes}>
          <tbody>
            {r.etapes.map((e) => (
              <tr key={e.libelle}>
                <th scope="row">
                  {e.libelle}
                  <span>{e.calcul}</span>
                </th>
                <td className="tnum">{e.resultat}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {r.alertes.map((a) => (
          <p key={a} className={styles.alerte}>
            {a}
          </p>
        ))}
      </details>

      {enregistree ? (
        <p className={styles.fait} role="status">
          ✓ Ta cible est enregistrée : l’onglet Nutrition s’en sert. Tu peux la modifier quand tu
          veux dans la carte « Mes cibles nutritionnelles ».
        </p>
      ) : (
        <>
          {ancienneKcal !== null && (
            <p className={styles.texte}>
              Elle remplacera ta cible actuelle ({kcalFr(ancienneKcal)} kcal).
            </p>
          )}
          {planHistoriqueAffiche && (
            <p className={styles.texte}>
              <b>Ton plan nutritionnel sera masqué</b> : c’est cette cible qui pilotera l’onglet
              Nutrition. Rien n’est effacé, tu peux rallumer le plan dans tes réglages.
            </p>
          )}
          <button type="button" className={styles.bouton} onClick={() => onUtiliser(m)}>
            Utiliser cette cible
          </button>
          <p className={styles.note}>
            Tu pourras la modifier quand tu veux dans la carte « Mes cibles nutritionnelles ».
          </p>
        </>
      )}
      <p className={styles.note}>
        Un repère calculé à partir de règles générales, pas un avis médical.
      </p>
    </section>
  );
}

/** La carte branchée : lit la famille du cycle et les cibles, enregistre au bouton. */
export function CibleDuQuestionnaire({ etat }: { etat: EtatQuestionnaire }) {
  const [lu, setLu] = useState<{
    famille: FamilleId | null;
    actuelle: CiblesNutrition | null;
    planHistorique: boolean;
  } | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let vivant = true;
    void (async () => {
      const [cycle, row] = await Promise.all([cycleActif(), getSettingsRow()]);
      const famille =
        cycle === null ? null : (programmeParId(cycle.programmeId)?.familleId ?? null);
      if (!vivant) return;
      setLu({
        famille,
        actuelle: row.ciblesNutrition,
        // LADIES n'affiche jamais le plan historique (`sansPlanHistorique`).
        planHistorique: famille !== 'femmes' && row.legacyNutritionPlan,
      });
    })();
    return () => {
      vivant = false;
    };
  }, [version]);

  if (lu === null) return null;
  return (
    <CibleCalculee
      proposition={proposerCible(etat, lu.famille)}
      actuelle={lu.actuelle}
      planHistoriqueAffiche={lu.planHistorique}
      onUtiliser={(m) =>
        void (async () => {
          await saveSettings({
            ciblesNutrition: { train: { ...m }, rest: { ...m } },
            ...(lu.planHistorique ? { legacyNutritionPlan: false } : {}),
          });
          setVersion((v) => v + 1);
        })()
      }
    />
  );
}
