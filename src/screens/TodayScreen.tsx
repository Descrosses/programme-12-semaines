import { useEffect, useState, type CSSProperties } from 'react';
import type { DayKind } from '../data/nutrition';
import { cibleDuJour } from '../engine/cibleDuJour';
import { WEEK_BLOCKS, blocInfo, isCombineDay } from '../data/program';
import { modulePourCycle, nutritionChiffree } from '../programmes/registre';
import type { ModuleProgramme } from '../programmes/types';
import { DAY_LABELS, type DayIndex, type WeekIndex } from '../data/types';
import {
  humanDate,
  isMonday,
  locateToday,
  nearestMonday,
  type TodayState,
} from '../engine/calendar';
import { fr } from '../engine/format';

import {
  allegementAccepte,
  decisionEnAttente,
  explosiveTrend,
  type ExplosiveTrend,
} from '../engine/trends';
import { apercuSeance, type LigneApercu } from '../engine/apercuSeance';
import {
  cycleActif,
  allReadiness,
  allSessions,
  allSets,
  buildHistoryIndex,
  getSettingsRow,
  saveSettings,
  toEngineSettings,
  toReadinessRecords,
} from '../db/repo';
import type { SessionRow, SettingsRow } from '../db/db';
import { Icon } from '../components/Icon';
import { ScreenHeader } from '../components/ScreenHeader';
import { PeseeDuJour } from '../components/PeseeDuJour';
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
  /** Le programme du cycle en cours : c'est lui qui dit s'il y a un bloc. */
  const [programme, setProgramme] = useState<ModuleProgramme | null>(null);
  useEffect(() => {
    void cycleActif().then((c) => setProgramme(modulePourCycle(c?.programmeId ?? null)));
  }, []);

  const [state, setState] = useState<{
    loading: boolean;
    today: TodayState | null;
    title: string;
    intensity: string;
    duration: string;
    /** La séance annoncée, exercice par exercice — vide quand il n'y en a pas. */
    apercu: LigneApercu[];
    /** Vrai si les charges annoncées bougeront encore après le readiness test. */
    apercuAvantReadiness: boolean;
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
    apercu: [],
    apercuAvantReadiness: false,
    rows: [],
    trend: {
      declining: false,
      consecutiveDrops: 0,
      suggestEarlyDeload: false,
      weekly: [],
      message: '',
      debut: null,
    },
    startDate: '',
    combineAhead: false,
    bodyweightKg: null,
    settingsRow: null,
  });
  /* Relance le chargement après une réponse à l'alerte « sauts en baisse ». */
  const [version, setVersion] = useState(0);

  useEffect(() => {
    void (async () => {
      const settingsRow = await getSettingsRow();
      const settings = toEngineSettings(settingsRow);
      const todayIso = new Date().toISOString().slice(0, 10);
      /*
        Le calendrier et la séance viennent du PROGRAMME du cycle. Sans ça,
        un cycle MASS 4 annonçait « Upper Strength — bench + tractions » un
        mercredi, qui est un jour de repos chez lui : les noms comme les jours
        étaient ceux de POWER 12.
      */
      const module = modulePourCycle((await cycleActif())?.programmeId ?? null);
      const today = locateToday(settings.startDate, todayIso, module);

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
      let apercu: LigneApercu[] = [];
      let apercuAvantReadiness = false;
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
        const s = module.getSession(target.week, target.day, {
          settings,
          history,
          readiness: null,
          explosiveDecline: allegementAccepte(trend, settingsRow.decisionSauts),
        });
        title = s?.title ?? '';
        intensity = s?.intensity ?? '';
        duration = s?.durationLabel ?? '';
        apercu = s ? apercuSeance(s.exercises) : [];
        apercuAvantReadiness = s?.readinessTest ?? false;
      }

      setState({
        loading: false,
        today,
        title,
        intensity,
        duration,
        apercu,
        apercuAvantReadiness,
        rows,
        trend,
        startDate: settings.startDate,
        combineAhead: target ? isCombineDay(target.week, target.day) : false,
        bodyweightKg: settingsRow.bodyweightKg,
        settingsRow,
      });
    })();
  }, [version]);

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
   * La cible du raccourci nutrition vient de la MÊME source que l'onglet :
   * les menus quand ils sont affichés, les chiffres saisis sinon. Lire le
   * plan en dur ici l'annonçait à des gens qui ne le voient nulle part
   * ailleurs.
   */
  const cibleNutrition =
    state.settingsRow === null
      ? null
      : (cibleDuJour(todayKind, {
          menus: state.settingsRow.legacyNutritionPlan,
          cibles: state.settingsRow.ciblesNutrition,
        })?.cible ?? null);

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

  /*
   * Le bloc vient du PROGRAMME du cycle, pas de POWER 12. Un programme sans
   * périodisation — MASS 4 — rend `null`, et la pastille de bloc disparaît au
   * lieu d'emprunter celle du voisin.
   */
  const blocSemaine =
    programme === null || semaineDuJour === null ? null : programme.blocDeLaSemaine(semaineDuJour);
  const bloc = blocInfo(blocSemaine);

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
        {...(programme === null || programme.id === 'power12'
          ? { visuel: visuelDuJour(today, semaineDuJour) }
          : {})}
        prioritaire
      >
        {today.kind === 'session' && (
          <div className={styles.meta}>
            <span
              className={`${styles.metaItem} ${styles.metaBloc}`}
              style={
                {
                  '--bloc': programme?.couleurDuBloc(today.session.week) ?? 'transparent',
                } as CSSProperties
              }
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
        La pesée du jour, tout de suite sous l'en-tête : c'est le geste du
        réveil, et « Aujourd'hui » est l'écran qui s'ouvre avec le programme.
        Elle était d'abord sur l'écran Semaine, où il fallait un appui de plus
        pour la trouver. C'est la même donnée que dans Nutrition.
      */}
      <PeseeDuJour />

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
          <b>Nutrition — {todayKind === 'train' ? 'jour d’entraînement' : 'jour de repos'}</b>
          <span>
            {/*
              CE RACCOURCI ANNONÇAIT LES CHIFFRES DE GUILLAUME À TOUT LE MONDE.
              Il lisait `NUTRITION_TARGETS` en dur, hors de toute condition :
              une installation neuve, qui ne voit pourtant aucun plan dans
              l'onglet Nutrition, se faisait annoncer ici 3 226 kcal et 190 g
              de protéines — la diète de quelqu'un d'autre.
              Il lit maintenant la même source que l'onglet : les menus quand
              ils sont affichés, les cibles saisies sinon, et rien du tout
              quand il n'y a ni l'un ni l'autre.
            */}
            {programme !== null && !nutritionChiffree(programme)
              ? 'Des principes, pas de calories ni de grammes'
              : cibleNutrition === null
                ? 'Pose tes cibles dans les Réglages'
                : `${cibleNutrition.kcal.toLocaleString('fr-FR')} kcal · ${String(cibleNutrition.proteinG)} g de protéines`}
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

      {trend.declining && trend.debut !== null && (
        /*
         * Les sauts baissent : on DEMANDE avant d'alléger (§11 cas 7).
         * Une fois la réponse donnée, la carte dit clairement ce qui
         * s'applique — séance allégée ou séance normale — et permet de
         * changer d'avis. C'est la réponse à « je ne sais pas si
         * l'entraînement est plus soft ou pas ».
         */
        <section
          className={`${styles.alert} ${styles.alertQuestion} ${trend.suggestEarlyDeload ? styles.alertRouge : ''}`}
          aria-label="Sauts en baisse"
        >
          <span className={styles.alertIcon} aria-hidden="true">
            <Icon name="chart" size="18px" />
          </span>
          <div className={styles.alertCorps}>
            <p>{trend.message}</p>
            {decisionEnAttente(trend, state.settingsRow?.decisionSauts) ? (
              <>
                <p>
                  <b>Alléger tes séances ?</b> Lifts principaux ramenés à 3 séries, conditioning
                  supprimé, tant que les sauts n’ont pas remonté. Si tes relevés de readiness sont
                  incomplets, la baisse peut être fausse : garde le programme normal.
                </p>
                <div className={styles.alertBoutons}>
                  <button
                    type="button"
                    className={styles.alertOui}
                    onClick={() =>
                      void (async () => {
                        await saveSettings({
                          decisionSauts: { debut: trend.debut!, accepte: true },
                        });
                        setVersion((v) => v + 1);
                      })()
                    }
                  >
                    Alléger
                  </button>
                  <button
                    type="button"
                    className={styles.alertNon}
                    onClick={() =>
                      void (async () => {
                        await saveSettings({
                          decisionSauts: { debut: trend.debut!, accepte: false },
                        });
                        setVersion((v) => v + 1);
                      })()
                    }
                  >
                    Garder le programme
                  </button>
                </div>
              </>
            ) : (
              <p>
                {allegementAccepte(trend, state.settingsRow?.decisionSauts) ? (
                  <b>Séances allégées : lifts principaux à 3 séries, sans conditioning.</b>
                ) : (
                  <b>Tu as gardé le programme normal.</b>
                )}{' '}
                <button
                  type="button"
                  className={styles.alertLien}
                  onClick={() =>
                    void (async () => {
                      await saveSettings({ decisionSauts: null });
                      setVersion((v) => v + 1);
                    })()
                  }
                >
                  Changer d’avis
                </button>
              </p>
            )}
          </div>
        </section>
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

      {/*
        La séance annoncée, avant d'y entrer. Commune à tous les programmes :
        elle ne lit que ce que `getSession` rend. Les charges sont celles du
        plan — le readiness test, quand la séance en a un, peut encore les
        changer, et la carte le dit plutôt que de laisser croire le contraire.
      */}
      {today.kind !== 'finished' && state.apercu.length > 0 && (
        <section className={styles.apercu} aria-labelledby="apercu-titre">
          <div className={styles.apercuTete}>
            <h2 id="apercu-titre" className={styles.apercuTitre}>
              Au programme
            </h2>
            <span className={styles.apercuCompte}>
              {state.apercu.length} exercice{state.apercu.length > 1 ? 's' : ''}
            </span>
          </div>
          <ol className={styles.apercuListe}>
            {state.apercu.map((l) => (
              <li key={l.numero} className={styles.apercuLigne}>
                <span className={`${styles.apercuNumero} tnum`} aria-hidden="true">
                  {l.numero}
                </span>
                <span className={styles.apercuNom}>
                  {l.nom}
                  {l.etiquette !== null && (
                    <span className={styles.apercuEtiquette}>{l.etiquette}</span>
                  )}
                </span>
                <span className={`${styles.apercuPrescription} tnum`}>{l.prescription}</span>
              </li>
            ))}
          </ol>
          {state.apercuAvantReadiness && (
            <p className={styles.apercuNote}>
              Charges du plan : le readiness test du début de séance peut encore les ajuster.
            </p>
          )}
        </section>
      )}
    </div>
  );
}
