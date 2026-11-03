/**
 * Nutrition de MASS 4 : des principes, et aucun chiffre.
 *
 * ── Pourquoi un écran à part, et pas une variante de l'écran de POWER ──────
 *
 * Parce que le document de MASS 4 ne chiffre RIEN, et le dit en une phrase :
 * « Les règles du pilote s'appliquent : pas de calories, pas de macros
 * chiffrées, pas de grammes. »
 *
 * L'écran Nutrition de POWER 12 est l'exact opposé : un plan au gramme près,
 * des paliers de féculents par phase, un objectif de calories, trois barres de
 * macronutriments, un journal de repas. Tant que la barre du bas était écrite
 * en dur, un cycle MASS héritait de cet écran — il annonçait 3 226 kcal, 402 g
 * de glucides et 190 g de protéines à un programme qui n'en prescrit aucun.
 * Ce n'était pas un réglage à ajuster : c'était le mauvais écran.
 *
 * ── Ce qui est transcrit, et d'où ─────────────────────────────────────────
 *
 * Les six principes viennent du document de MASS 4, un par ligne, sans
 * ajout. L'application de référence en affiche huit, mais deux sont adressés
 * nommément à la personne pour qui elle a été écrite (« tes 2 L par jour »,
 * « ton questionnaire nutrition ») : ils n'ont pas leur place dans un
 * programme que quelqu'un d'autre suit.
 *
 * Le journal de pesée, lui, est repris : c'est le seul chiffre que le document
 * demande de suivre, et il le demande deux fois — ici au quotidien, et en
 * relevé officiel dans l'écran Mesures.
 */

import { useEffect, useState } from 'react';
import { ScreenHeader } from '../components/ScreenHeader';
import { Stepper, stepValue } from '../components/Stepper';
import type { DayKind } from '../data/nutrition';
import { humanDate } from '../engine/calendar';
import { fr } from '../engine/format';
import { allMeasurements, getMeasurement, saveMeasurement } from '../db/repo';
import type { MeasurementRow } from '../db/db';
import styles from './Screens.module.css';

/**
 * Les principes, transcrits du document de MASS 4.
 *
 * Le titre est la règle telle qu'elle est écrite ; le texte qui suit ne
 * l'étend pas, il dit seulement comment l'appliquer. Aucune quantité n'y
 * figure, et c'est volontaire : le document l'interdit.
 */
const PRINCIPES: Array<{ titre: string; texte: string }> = [
  {
    titre: '4 prises par jour, protéines à chaque prise',
    texte:
      'Petit-déjeuner, midi, collation, soir. Œufs, viande, poisson, laitages, légumineuses : une source à chaque fois.',
  },
  {
    titre: 'Un petit-déjeuner complet',
    texte:
      'Un féculent et une protéine. Un fruit seul ne suffit pas pour une matinée de prise de masse.',
  },
  {
    titre: 'Les féculents autour de la séance',
    texte: 'En priorité au repas qui précède l’entraînement et à celui qui le suit.',
  },
  {
    titre: 'Légumes et fruits à chaque repas principal',
    texte: 'Le midi et le soir. Les fruits vont bien en collation.',
  },
  {
    titre: 'Bien s’hydrater',
    texte: 'Davantage les jours de séance que les jours de repos.',
  },
  {
    titre: 'Des options transportables',
    texte:
      'Pour les jours en déplacement, deux ou trois choses prêtes d’avance plutôt qu’un repas sauté.',
  },
];

export function NutritionPrincipesScreen({ todayKind }: { todayKind: DayKind }) {
  const todayIso = new Date().toISOString().slice(0, 10);
  const [poids, setPoids] = useState<number | null>(null);
  const [historique, setHistorique] = useState<MeasurementRow[]>([]);
  const [charge, setCharge] = useState(true);

  async function recharger() {
    setPoids((await getMeasurement(todayIso))?.weightKg ?? null);
    const toutes = await allMeasurements();
    setHistorique(
      toutes
        .filter((r) => r.weightKg !== null)
        .slice(-7)
        .reverse(),
    );
    setCharge(false);
  }

  useEffect(() => {
    void recharger();
    // `todayIso` ne change pas pendant la vie de l'écran.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function enregistrer(v: number | null) {
    setPoids(v);
    await saveMeasurement(todayIso, { weightKg: v });
    await recharger();
  }

  if (charge) return <div className={styles.loading}>Chargement…</div>;

  return (
    <div className={styles.screen}>
      <ScreenHeader
        eyebrow={todayKind === 'train' ? 'jour d’entraînement' : 'jour de repos'}
        title="Nutrition"
        subtitle="Des principes, pas des grammes"
        compact
      />

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Les principes</h2>
        <p className={styles.cardSub}>
          MASS 4 ne chiffre ni les calories, ni les macronutriments, ni les grammes. Ces six règles
          sont tout le plan alimentaire du programme.
        </p>
        {PRINCIPES.map((p) => (
          <div key={p.titre} className={styles.field}>
            <b>{p.titre}</b>
            <p className={styles.fieldHint}>{p.texte}</p>
          </div>
        ))}
      </section>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Poids du matin</h2>
        <p className={styles.cardSub}>
          À jeun, au réveil, plusieurs matins par semaine. C’est la moyenne qui compte, jamais une
          pesée isolée : les courbes sont dans Progrès → Poids.
        </p>
        <div className={styles.field}>
          <Stepper
            label={`Poids — ${humanDate(todayIso)}`}
            value={poids}
            step={0.1}
            min={40}
            max={160}
            unit="kg"
            tone="accent"
            emptyLabel="non pesé"
            onStep={(d) => void enregistrer(stepValue(poids, d, 40, 160))}
            onCommit={(v) => void enregistrer(v)}
          />
          {historique.length > 0 && (
            <p className={styles.fieldHint}>
              Dernières pesées :{' '}
              {historique
                .flatMap((r) =>
                  r.weightKg === null
                    ? []
                    : [`${humanDate(r.date).split(' ').slice(1).join(' ')} ${fr(r.weightKg)}`],
                )
                .join(' · ')}
            </p>
          )}
        </div>
      </section>

      <p className={styles.hint}>
        Compléments : aucun avis ici, ce n’est pas le rôle de ce programme. Ces principes sont
        généraux et ne remplacent pas un conseil de santé individuel.
      </p>
    </div>
  );
}
