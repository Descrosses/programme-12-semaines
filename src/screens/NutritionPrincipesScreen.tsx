/**
 * Nutrition de MASS : les principes du programme, et la cible calculée.
 *
 * ── D'où l'on vient ───────────────────────────────────────────────────────
 *
 * Le document de MASS CONGESTION ne chiffrait RIEN, et le disait en une
 * phrase : « Les règles du pilote s'appliquent : pas de calories, pas de
 * macros chiffrées, pas de grammes. » Cet écran n'affichait donc que six
 * principes et la pesée.
 *
 * ── Ce qui a changé (Guillaume, 27 novembre, « go MASS lot 1 ») ───────────
 *
 * MASS reçoit le calcul de l'appli, lu avec le regard MASS
 * (`regles-nutrition-mass.md`) : cible proposée à la fin du questionnaire,
 * semaine de repas, point des deux semaines. Sa décision sur les principes
 * de CONGESTION : « garder » — ils restent EN TÊTE d'écran, le calcul vient
 * dessous. MASS FORCE n'a pas de principes à lui : il n'a que le calcul.
 *
 * Ce qui ne change PAS : ni le plan historique de Guillaume, ni ses menus,
 * ne s'affichent sous MASS (`sansPlanHistorique`) — c'était le défaut
 * d'origine, quand un cycle MASS héritait des 3 226 kcal de POWER.
 *
 * ── Ce qui est transcrit, et d'où ─────────────────────────────────────────
 *
 * Les six principes viennent du document de MASS CONGESTION, un par ligne,
 * sans ajout. L'application de référence en affiche huit, mais deux sont
 * adressés nommément à la personne pour qui elle a été écrite (« tes 2 L par
 * jour », « ton questionnaire nutrition ») : ils n'ont pas leur place dans
 * un programme que quelqu'un d'autre suit.
 */

import { useState } from 'react';
import { ScreenHeader } from '../components/ScreenHeader';
import type { DayIndex, WeekIndex } from '../data/types';
import type { VisuelNom } from '../data/visuels';
import type { DayKind } from '../data/nutrition';
import { REPERES_HORAIRES_MASS } from '../data/reglesNutritionMass';
import { NutritionScreen } from './NutritionScreen';
import styles from './Screens.module.css';

/**
 * Les principes, transcrits du document de MASS CONGESTION.
 *
 * Le titre est la règle telle qu'elle est écrite ; le texte qui suit ne
 * l'étend pas, il dit seulement comment l'appliquer. Aucune quantité n'y
 * figure : les chiffres sont ceux de la cible, plus bas.
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

/**
 * La carte des six principes. Ouverte tant qu'aucune cible n'est posée — ils
 * sont alors tout le plan ; repliée ensuite (ils restent en tête d'écran, à
 * un geste), pour que la journée chiffrée ne soit pas un écran plus bas.
 */
export function PrincipesMass({ ciblePosee }: { ciblePosee: boolean }) {
  const [ouvert, setOuvert] = useState(!ciblePosee);
  return (
    <section className={styles.card} data-principes-mass>
      <h2 className={styles.cardTitle}>Les principes</h2>
      <p className={styles.cardSub}>
        {ciblePosee
          ? 'Les six règles de MASS CONGESTION. Ta cible chiffrée, juste en dessous, les complète : elle ne les remplace pas.'
          : 'Les six règles de MASS CONGESTION. Tu peux t’en tenir là, ou faire calculer une cible chiffrée juste en dessous.'}
      </p>
      {ouvert &&
        PRINCIPES.map((p) => (
          <div key={p.titre} className={`${styles.field} ${styles.principe}`}>
            <b>{p.titre}</b>
            <p className={styles.fieldHint}>{p.texte}</p>
          </div>
        ))}
      {ouvert && (
        // « Compléments : aucun avis ici » a été retiré le 27 novembre : la
        // carte « Créatine » existe désormais, en bas de cet écran.
        <p className={styles.fieldHint}>
          Ces principes sont généraux et ne remplacent pas un conseil de santé individuel.
        </p>
      )}
      {ciblePosee && (
        <button
          type="button"
          className={styles.secondary}
          style={{ width: '100%', margin: '12px 0 0' }}
          aria-expanded={ouvert}
          onClick={() => setOuvert(!ouvert)}
        >
          {ouvert ? 'Replier les principes' : `Voir les ${String(PRINCIPES.length)} principes`}
        </button>
      )}
    </section>
  );
}

/**
 * Les deux repères d'horaires de MASS (`regles-nutrition-mass.md`, §8) : des
 * conseils en bas d'écran, jamais une contrainte ni un rappel.
 */
export function ReperesHoraires() {
  return (
    <section className={styles.card} data-reperes-horaires>
      <h2 className={styles.cardTitle}>Repères d’horaires</h2>
      {REPERES_HORAIRES_MASS.map((r) => (
        <p key={r} className={styles.cardSub}>
          {r}
        </p>
      ))}
    </section>
  );
}

export function NutritionPrincipesScreen({
  todayKind,
  kindProgramme,
  todayDay,
  todayWeek,
  onDayKindChange,
  programmeId,
  principes,
  visuel,
}: {
  todayKind: DayKind;
  kindProgramme: DayKind;
  todayDay: DayIndex | null;
  todayWeek: WeekIndex | null;
  onDayKindChange: () => void;
  /** `mass4`, `mass-force`… : décide du nombre de repas par défaut. */
  programmeId: string;
  /** MASS CONGESTION : ses six principes en tête. MASS FORCE : le calcul seul. */
  principes: boolean;
  /** Le bandeau de la famille (MASS), s'il existe. */
  visuel?: VisuelNom;
}) {
  return (
    <NutritionScreen
      todayKind={todayKind}
      kindProgramme={kindProgramme}
      todayDay={todayDay}
      todayWeek={todayWeek}
      onDayKindChange={onDayKindChange}
      // Jamais le plan historique de Guillaume sous MASS.
      sansPlanHistorique
      programmeId={programmeId}
      creatine
      apres={<ReperesHoraires />}
      entete={
        <ScreenHeader
          eyebrow={todayKind === 'train' ? 'jour d’entraînement' : 'jour de repos'}
          title="Nutrition"
          subtitle={principes ? 'Tes principes et ta cible' : 'Ta cible et tes repas'}
          {...(visuel === undefined ? {} : { visuel })}
        />
      }
      {...(principes
        ? { avant: ({ ciblePosee }) => <PrincipesMass ciblePosee={ciblePosee} /> }
        : {})}
    />
  );
}
