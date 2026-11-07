/**
 * Chargement d'une séance : réglages, historique, readiness, séries déjà
 * saisies. Tout vient de la base locale, rien du réseau.
 */

import { useCallback, useEffect, useState } from 'react';
import type { DayIndex, WeekIndex } from '../data/types';
import { dateFor } from '../engine/calendar';
import { missingPrescribedSets } from '../engine/partialSession';
import { type ResolvedSession } from '../engine/getSession';
import { modulePourCycle } from '../programmes/registre';
import { readiness as computeReadiness } from '../engine/readiness';
import { explosiveTrend, type ExplosiveTrend } from '../engine/trends';
import type { HistoryIndex, ReadinessResult } from '../engine/types';
import type { ReadinessRow, SessionRow, SetRow } from '../db/db';
import {
  cycleActif,
  allReadiness,
  allSessionExercises,
  buildHistoryIndex,
  allSets,
  allSessions,
  ensureSession,
  getSession,
  getReadiness,
  getSettingsRow,
  toEngineSettings,
  toReadinessRecords,
} from '../db/repo';
import { EXERCISES } from '../data/exercises';
import { applyCustom, type CustomRow, type Replaced } from '../engine/customExercise';
import type { SessionExerciseRow } from '../db/db';

export interface SessionData {
  loading: boolean;
  /** `null` = pas de séance ce jour-là. */
  session: ResolvedSession | null;
  row: SessionRow | null;
  /** Séries déjà enregistrées, groupées par exercice. */
  savedSets: Record<string, SetRow[]>;
  previousSession: SessionRow | null;
  previousSets: SetRow[];
  previousBlock: string | null;
  previousIncompleteExerciseIds: string[];
  /**
   * Les occurrences réelles des 12 semaines, déjà construites ici pour §11.
   * L'encart « la dernière fois » lit la MÊME chose : une seule requête, une
   * seule vérité. Deux sources finiraient par se contredire.
   */
  history: HistoryIndex;
  readinessRow: ReadinessRow | null;
  readiness: ReadinessResult | null;
  baselineCm: number | null;
  trend: ExplosiveTrend;
  date: string;
  /**
   * TOUTES les lignes d'exercices de séance, les douze semaines.
   *
   * Les puces « remplacé par » et « ajouté la semaine dernière » regardent les
   * séances passées du même jour : l'écran a donc besoin de l'ensemble, pas
   * seulement de la séance du jour.
   */
  customRows: SessionExerciseRow[];
  /** Ce que le programme prévoyait et qu'un remplacement a mis de côté. */
  replaced: Replaced[];
  /**
   * L'identifiant de la ligne de séance, créée MAINTENANT si elle n'existe
   * pas encore — et avec elle le cycle, s'il n'y en avait aucun.
   *
   * À n'appeler que depuis un geste qui écrit : valider une série, cocher un
   * échauffement, démarrer le chrono. Jamais à l'affichage.
   *
   * `null` quand le jour ne porte aucune séance ou que la date de début n'est
   * pas posée : il n'y a alors rien à créer.
   */
  ensureRow: () => Promise<number | null>;
  reload: () => Promise<void>;
}

export function useSessionData(week: WeekIndex, day: DayIndex): SessionData {
  const [state, setState] = useState<Omit<SessionData, 'reload' | 'ensureRow'>>(() => empty());

  const reload = useCallback(async () => {
    const settingsRow = await getSettingsRow();
    const settings = toEngineSettings(settingsRow);

    const [sets, readinessRows, readinessRow, customRows, cycle, sessions] = await Promise.all([
      allSets(),
      allReadiness(),
      getReadiness(week, day),
      allSessionExercises(),
      cycleActif(),
      allSessions(),
    ]);

    /*
     * La séance ne vient plus « du moteur » mais DU PROGRAMME du cycle en
     * cours. C'est toute la couture : l'application ne sait plus à quel
     * programme elle parle, elle demande au module de répondre.
     */
    const programme = modulePourCycle(cycle?.programmeId ?? null);

    /*
     * La date se calcule AVEC ce programme : l'origine du calendrier est sa
     * première semaine, qui n'est la semaine 0 que pour POWER 12. Sans lui,
     * les séances d'un cycle MASS étaient datées d'une semaine trop tard.
     */
    const date = settings.startDate ? dateFor(settings.startDate, week, day, programme) : '';

    const history = buildHistoryIndex(sets);
    const trend = explosiveTrend(toReadinessRecords(readinessRows), date || undefined);

    const readinessResult = readinessRow
      ? computeReadiness(settings.broadJumpBaselineCm, readinessRow.jumpCm)
      : null;

    const prescrite = programme.getSession(week, day, {
      settings,
      history,
      readiness: readinessResult,
      explosiveDecline: trend.declining,
    });

    /*
     * CONSULTER N'EST PAS COMMENCER — et ça allait plus loin que le chrono.
     *
     * La ligne de séance était CRÉÉE ici, au simple affichage de l'écran. Et
     * `ensureSession` a besoin d'un cycle pour y rattacher sa ligne : ouvrir
     * la séance d'un jour pour y jeter un œil démarrait donc un cycle en
     * base. Deux conséquences, vues toutes les deux : « Mon parcours »
     * affichait un cycle que Guillaume n'avait jamais lancé, et ce cycle
     * portait aussitôt une séance — donc une trace — ce qui faisait refuser sa
     * suppression.
     *
     * Ici on ne fait plus que LIRE. La ligne naît au premier geste qui écrit,
     * par `ensureRow` ci-dessous.
     */
    const row = prescrite && date ? ((await getSession(week, day)) ?? null) : null;

    /*
     * Les remplacements et ajouts s'appliquent APRÈS la séance prescrite, et
     * seulement ceux de cette séance-là. L'ordre compte : on part toujours de
     * ce que le programme dit, puis on y pose ce qui a été décidé sur place.
     * L'inverse — garder une séance modifiée en base — aurait fait du
     * remplacement une correction du programme, qu'il n'est pas.
     */
    const duJour = customRows.filter((r) => r.sessionId === row?.id);
    const applique =
      prescrite === null
        ? { exercises: [], replaced: [] }
        : applyCustom(prescrite.exercises, duJour as CustomRow[], (id) => EXERCISES[id]);
    const session = prescrite === null ? null : { ...prescrite, exercises: applique.exercises };

    const savedSets: Record<string, SetRow[]> = {};
    if (row?.id !== undefined) {
      for (const s of sets.filter((x) => x.sessionId === row.id)) {
        (savedSets[s.exerciseId] ??= []).push(s);
      }
      for (const list of Object.values(savedSets)) list.sort((a, b) => a.setIndex - b.setIndex);
    }

    const previousSession =
      sessions.find((s) => s.cycleId === cycle?.id && s.week === week - 1 && s.day === day) ?? null;
    const previousSets =
      previousSession?.id === undefined
        ? []
        : sets.filter((s) => s.sessionId === previousSession.id);
    // Le programme du cycle fait autorité, y compris pour MASS (jamais WEEK_BLOCKS de POWER).
    const previousPrescribed =
      previousSession && (previousSession.startedAt !== undefined || previousSets.length > 0)
        ? programme.getSession(previousSession.week, previousSession.day, {
            settings,
            history,
            readiness: null,
            explosiveDecline: false,
          })
        : null;
    const previousSaved: Record<string, SetRow[]> = {};
    for (const set of previousSets) (previousSaved[set.exerciseId] ??= []).push(set);
    const previousIncompleteExerciseIds = previousPrescribed
      ? missingPrescribedSets(previousPrescribed.exercises, previousSaved)
      : [];
    setState({
      loading: false,
      previousSession,
      previousSets,
      previousBlock: previousPrescribed?.block ?? null,
      previousIncompleteExerciseIds,
      session,
      row,
      savedSets,
      readinessRow: readinessRow ?? null,
      readiness: readinessResult,
      baselineCm: settings.broadJumpBaselineCm,
      trend,
      date,
      history,
      customRows,
      replaced: applique.replaced,
    });
  }, [week, day]);

  /*
   * La création à la demande. Elle relit la date par les mêmes règles que
   * `reload` — l'ancre des Réglages et le programme du cycle — pour que la
   * ligne naisse avec la bonne date même si Guillaume vient de corriger sa
   * date de début.
   */
  const ensureRow = useCallback(async (): Promise<number | null> => {
    if (state.row?.id !== undefined) return state.row.id;
    if (state.session === null || state.date === '') return null;
    const cree = await ensureSession(week, day, state.date);
    return cree.id ?? null;
  }, [state.row, state.session, state.date, week, day]);

  useEffect(() => {
    setState(empty());
    void reload();
  }, [reload]);

  return { ...state, ensureRow, reload };
}

function empty(): Omit<SessionData, 'reload' | 'ensureRow'> {
  return {
    loading: true,
    session: null,
    row: null,
    savedSets: {},
    previousSession: null,
    previousSets: [],
    previousBlock: null,
    previousIncompleteExerciseIds: [],
    readinessRow: null,
    readiness: null,
    baselineCm: null,
    trend: {
      declining: false,
      consecutiveDrops: 0,
      suggestEarlyDeload: false,
      weekly: [],
      message: '',
    },
    date: '',
    history: {},
    customRows: [],
    replaced: [],
  };
}
