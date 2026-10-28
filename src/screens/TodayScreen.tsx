import { useEffect, useState, type CSSProperties } from 'react';
import { NUTRITION_TARGETS, type DayKind } from '../data/nutrition';
import { BLOCKS, WEEK_BLOCKS, isCombineDay } from '../data/program';
import { DAY_LABELS, type DayIndex, type WeekIndex } from '../data/types';
import {
  humanDate,
  isMonday,
  locateToday,
  nearestMonday,
  type TodayState,
} from '../engine/calendar';
import { fr } from '../engine/format';
import { getSession } from '../engine/getSession';
import { explosiveTrend, type ExplosiveTrend } from '../engine/trends';
import {
  allReadiness,
  allSessions,
  allSets,
  buildHistoryIndex,
  getSettingsRow,
  toEngineSettings,
  toReadinessRecords,
} from '../db/repo';
import type { SessionRow, SettingsRow } from '../db/db';
import { Icon } from '../components/Icon';
import { ScreenHeader } from '../components/ScreenHeader';
import { OnboardingScreen } from './OnboardingScreen';
import type { VisuelNom } from '../data/visuels';
import styles from './Today.module.css';

/**
 * La photo de l'en-tête dit ce que la journée contient.
 *
 * Elle n'est pas un papier peint : un jour de force montre une barre, un jour
 * de puissance montre un départ, un jour de combine montre une réception, un
 * jour de repos montre le stade vide. On sait ce qui attend avant d'avoir lu
 * le titre — et c'est exactement ce qu'on regarde en ouvrant l'appli le matin.
 */
function visuelDuJour(today: TodayState, week: WeekIndex | null): VisuelNom {
  if (today.kind === 'finished') return 'athlete';
  if (today.kind !== 'session') return 'stade';
  if (week === 0) return 'reception';
  switch (WEEK_BLOCKS[week ?? 1]) {
    case 'power':
    case 'taper':
      return 'sprint';
    case 'test':
      return 'reception';
    case 'maxforce':
      return 'squat';
    default:
      return 'force';
  }
}

/**
 * Écran d'ouverture.
 *
 * Défaut n°11 du prototype : il fallait retrouver la bonne semaine et le bon
 * jour à la main. Ici la date fait tout le travail, et le bouton reste
 * disponible pour les jours où le programme décale.
 */
export function TodayScreen({
  onOpen,
  onGoWeek,
  onGoSettings,
  onGoNutrition,
  onDataChanged,
  todayKind,
}: {
  onOpen: (week: WeekIndex, day: DayIndex) => void;
  onGoWeek: (week: WeekIndex) => void;
  onGoSettings: () => void;
  onGoNutrition: () => void;
  /**
   * Prévient l'application qu'un réglage vient de changer.
   *
   * Indispensable après la saisie de la date de début : le palier alimentaire
   * du jour (`todayKind`) est calculé au-dessus, à partir de cette date. Sans
   * ce signal, la carte Nutrition resterait sur « jour de repos » alors qu'une
   * séance est déjà prévue aujourd'hui.
   */
  onDataChanged: () => void;
  /** Palier alimentaire du jour affiché — pas celui d'une semaine entière. */
  todayKind: DayKind;
}) {
  const [state, setState] = useState<{
    loading: boolean;
    today: TodayState | null;
    title: string;
    intensity: string;
    duration: string;
    rows: SessionRow[];
    trend: ExplosiveTrend;
    /** Ancre du calendrier, telle qu'elle est en base. */
    startDate: string;
    /** Le combine est aujourd'hui ou c'est la prochaine séance. */
    combineAhead: boolean;
    bodyweightKg: number | null;
    /** Les réglages complets — le parcours d'accueil en a besoin en entier. */
    settingsRow: SettingsRow | null;
    /** Le combine a mesuré des 1RM qui ne pilotent pas encore les charges. */
  }>({
    loading: true,
    today: null,
    title: '',
    intensity: '',
    duration: '',
    rows: [],
    trend: {
      declining: false,
      consecutiveDrops: 0,
      suggestEarlyDeload: false,
      weekly: [],
      message: '',
    },
    startDate: '',
    combineAhead: false,
    bodyweightKg: null,
    settingsRow: null,
  });

  useEffect(() => {
    void (async () => {
      const settingsRow = await getSettingsRow();
      const settings = toEngineSettings(settingsRow);
      const todayIso = new Date().toISOString().slice(0, 10);
      const today = locateToday(settings.startDate, todayIso);

      const [sets, readinessRows, rows] = await Promise.all([
        allSets(),
        allReadiness(),
        allSessions(),
      ]);
      const history = buildHistoryIndex(sets);
      const trend = explosiveTrend(toReadinessRecords(readinessRows), todayIso);

      // Aperçu de la séance : seul l'en-tête nous intéresse ici.
      let title = '';
      let intensity = '';
      let duration = '';
      // « before » compte aussi : c'est le meilleur moment pour rappeler le
      // relevé de poids, quelques jours avant le premier test.
      const target =
        today?.kind === 'session'
          ? today.session
          : today?.kind === 'rest'
            ? today.next
            : today?.kind === 'before'
              ? today.first
              : null;
      if (target) {
        const s = getSession(target.week, target.day, {
          settings,
          history,
          readiness: null,
          explosiveDecline: trend.declining,
        });
        title = s?.title ?? '';
        intensity = s?.intensity ?? '';
        duration = s?.durationLabel ?? '';
      }

      setState({
        loading: false,
        today,
        title,
        intensity,
        duration,
        rows,
        trend,
        startDate: settings.startDate,
        combineAhead: target ? isCombineDay(target.week, target.day) : false,
        bodyweightKg: settingsRow.bodyweightKg,
        settingsRow,
      });
    })();
  }, []);

  if (state.loading) return <div className={styles.loading}>Chargement…</div>;

  const { today, trend } = state;

  /*
   * Premier lancement : le parcours d'accueil prend la main. Il demande
   * l'ancre du calendrier — sans elle rien ne peut s'afficher — puis propose
   * les maxima et les mesures facultatives, sans jamais rien préremplir.
   */
  if (!today && state.settingsRow) {
    return <OnboardingScreen row={state.settingsRow} onFini={onDataChanged} />;
  }
  if (!today) return <div className={styles.loading}>Chargement…</div>;

  const status = (week: number, day: DayIndex) =>
    state.rows.find((r) => r.week === week && r.day === day)?.status ?? 'planned';

  /*
   * L'en-tête ne décide de rien : il reçoit un sur-titre, un titre et un
   * sous-titre déjà choisis ici, à partir du même `today` qu'avant. Les
   * quatre cas de journée sont strictement les mêmes qu'avant la refonte.
   */
  const semaineDuJour: WeekIndex | null =
    today.kind === 'session'
      ? today.session.week
      : today.kind === 'rest'
        ? today.next.week
        : today.kind === 'before'
          ? today.first.week
          : today.last.week;

  const bloc = semaineDuJour === null ? null : BLOCKS[WEEK_BLOCKS[semaineDuJour]];

  const entete =
    today.kind === 'session'
      ? { titre: state.title, sous: bloc ? bloc.name : undefined }
      : today.kind === 'rest'
        ? { titre: 'Repos', sous: 'Récupération' }
        : today.kind === 'before'
          ? { titre: 'Ça commence bientôt', sous: 'Combine initial' }
          : { titre: '12 semaines bouclées', sous: 'Programme terminé' };

  return (
    <div className={styles.screen}>
      <ScreenHeader
        eyebrow={humanDate(new Date().toISOString().slice(0, 10))}
        title={entete.titre}
        subtitle={entete.sous}
        visuel={visuelDuJour(today, semaineDuJour)}
        prioritaire
      >
        {today.kind === 'session' && (
          <div className={styles.meta}>
            <span
              className={`${styles.metaItem} ${styles.metaBloc}`}
              style={{ '--bloc': BLOCKS[WEEK_BLOCKS[today.session.week]].color } as CSSProperties}
            >
              {state.intensity}
            </span>
            <span className={styles.metaItem}>
              Semaine <b>{today.session.week === 0 ? 'de test' : today.session.week}</b>
            </span>
            <span className={styles.metaItem}>{DAY_LABELS[today.session.day]}</span>
            <span className={styles.metaItem}>
              <Icon name="stopwatch" size="14px" />
              <b>{state.duration}</b>
            </span>
          </div>
        )}

        {today.kind === 'rest' && (
          <p className={styles.lead}>
            Prochaine séance {today.daysUntil === 1 ? 'demain' : `dans ${today.daysUntil} jours`},{' '}
            <b>{DAY_LABELS[today.next.day].toLowerCase()}</b> : {state.title}.
          </p>
        )}

        {today.kind === 'before' && (
          <p className={styles.lead}>
            Premier jour du combine initial dans {today.daysUntil} jour
            {today.daysUntil > 1 ? 's' : ''}, le {humanDate(today.first.date)}.
          </p>
        )}

        {today.kind === 'finished' && (
          <p className={styles.lead}>
            Dernière séance le {humanDate(today.last.date)}. Regarde l’écran Progression pour
            comparer tes trois combines.
          </p>
        )}
      </ScreenHeader>

      {/*
        Raccourci nutrition. Il vit ici et nulle part ailleurs : l'écran Semaine
        mélange des jours d'entraînement et des jours de repos, donc une carte
        unique y afficherait une cible fausse pour au moins un des jours listés.
      */}
      <button type="button" className={styles.nutriCard} onClick={onGoNutrition}>
        <span className={styles.nutriIcon} aria-hidden="true">
          <Icon name="meal" size="22px" />
        </span>
        <span className={styles.nutriText}>
          <b>Nutrition — {NUTRITION_TARGETS[todayKind].label.toLowerCase()}</b>
          <span>
            {NUTRITION_TARGETS[todayKind].kcal.toLocaleString('fr-FR')} kcal ·{' '}
            {NUTRITION_TARGETS[todayKind].proteinG} g de protéines
          </span>
        </span>
        <span className={styles.nutriChevron} aria-hidden="true">
          <Icon name="arrow-right" size="20px" />
        </span>
      </button>

      {state.startDate !== '' && !isMonday(state.startDate) && (
        <button
          type="button"
          className={`${styles.alert} ${styles.alertRouge}`}
          onClick={onGoSettings}
        >
          <span className={styles.alertIcon} aria-hidden="true">
            <Icon name="alert" size="18px" />
          </span>
          <span>
            Ta date de début est un {humanDate(state.startDate).split(' ')[0]}, pas un lundi :
            toutes les séances tombent le mauvais jour. Appuie ici pour la corriger en{' '}
            {humanDate(nearestMonday(state.startDate))}.
          </span>
        </button>
      )}

      {/* §12 — la moyenne de 3 matins se prépare avant, pas à Basic-Fit. */}
      {state.combineAhead && (
        <button type="button" className={styles.alert} onClick={onGoSettings}>
          <span className={styles.alertIcon} aria-hidden="true">
            <Icon name="alert" size="18px" />
          </span>
          <span>
            {state.bodyweightKg === null
              ? 'Combine : n’oublie pas ta moyenne de poids de corps (3 matins, à jeun). Elle se saisit dans Réglages, pas en salle.'
              : `Combine : poids de corps enregistré à ${fr(state.bodyweightKg)} kg. À mettre à jour dans Réglages si ta moyenne a bougé.`}
          </span>
        </button>
      )}

      {trend.declining && (
        <p className={`${styles.alert} ${trend.suggestEarlyDeload ? styles.alertRouge : ''}`}>
          <span className={styles.alertIcon} aria-hidden="true">
            <Icon name="chart" size="18px" />
          </span>
          <span>{trend.message}</span>
        </p>
      )}

      {today.kind === 'session' && (
        <>
          {status(today.session.week, today.session.day) === 'done' ? (
            <>
              <p className={`${styles.alert} ${styles.alertVert}`}>
                <span className={styles.alertIcon} aria-hidden="true">
                  <Icon name="check" size="18px" />
                </span>
                <span>
                  Séance déjà marquée comme terminée. Tu peux la rouvrir pour corriger une saisie.
                </span>
              </p>
              <button
                type="button"
                className={styles.secondary}
                onClick={() => onOpen(today.session.week, today.session.day)}
              >
                <Icon name="repeat" size="18px" />
                Rouvrir la séance
              </button>
            </>
          ) : (
            <button
              type="button"
              className={styles.primary}
              onClick={() => onOpen(today.session.week, today.session.day)}
            >
              <Icon name="play" size="22px" />
              Commencer la séance
            </button>
          )}
          <button
            type="button"
            className={styles.secondary}
            onClick={() => onGoWeek(today.session.week)}
          >
            <Icon name="calendar" size="18px" />
            Voir la semaine · changer de jour
          </button>
        </>
      )}

      {(today.kind === 'rest' || today.kind === 'before') && (
        <>
          <button
            type="button"
            className={styles.primary}
            onClick={() =>
              onOpen(
                today.kind === 'rest' ? today.next.week : today.first.week,
                today.kind === 'rest' ? today.next.day : today.first.day,
              )
            }
          >
            <Icon name="play" size="22px" />
            Ouvrir la prochaine séance
          </button>
          <button
            type="button"
            className={styles.secondary}
            onClick={() => onGoWeek(today.kind === 'rest' ? today.next.week : today.first.week)}
          >
            <Icon name="calendar" size="18px" />
            Voir la semaine · changer de jour
          </button>
        </>
      )}
    </div>
  );
}
