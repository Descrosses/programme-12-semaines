import { useEffect, useState } from 'react';
import type { SetRow } from '../db/db';
import { fr, gripHint, loadLine, restLabel } from '../engine/format';
import type { ResolvedExercise } from '../engine/getSession';
import type { RestTimer } from '../state/useRestTimer';
import { ExerciseMediaButton, type MediaContext } from './ExerciseMedia';
import { ExerciseNote, type NoteContext } from './ExerciseNote';
import { PainWatch } from './PainWatch';
import { Stepper, stepValue } from './Stepper';
import { KG_MAX, KG_MIN, loadEntryFor, parseKg } from '../engine/loadEntry';
import { lastPerformance } from '../engine/lastPerformance';
import { replacementChip, type CustomRow } from '../engine/customExercise';
import {
  hasUnitChoice,
  lastMeasureIn,
  lastUnitUsed,
  unitConfig,
  UNIT_CHOICE,
  valueForUnit,
  type MeasureUnitId,
} from '../engine/measureUnit';
import type { Occurrence } from '../engine/types';
import type { DayIndex } from '../data/types';
import styles from '../screens/Session.module.css';

export interface SetPayload {
  setIndex: number;
  actualKg: number | null;
  actualReps: number | null;
  actualRpe: number | null;
  measureValue: number | null;
  /**
   * L'unité de `measureValue`, telle qu'elle était choisie au moment de
   * valider. Stockée avec la série et jamais convertie : douze pas sur place
   * ne valent pas douze mètres.
   */
  measureUnit: string | null;
  failed: boolean;
}

/**
 * Configuration du stepper de mesure pour les exercices qui ne comptent pas
 * des reps.
 *
 * Chrono au dixième : sur 10 ou 20 m, l'écart entre deux séances se joue à
 * 0,1 s. Et comme un chrono vidéo donne des centièmes, ces mesures acceptent
 * aussi la saisie clavier (appui sur la valeur) — contrairement aux reps, à la
 * charge et au RPE, où la grille du stepper est le bon outil.
 */
const MEASURE = {
  cm: { label: 'Distance', unit: 'cm', step: 5, min: 50, max: 400 },
  s: { label: 'Temps', unit: 's', step: 0.1, min: 0.5, max: 60 },
  m: { label: 'Distance', unit: 'm', step: 5, min: 5, max: 200 },
  /*
   * Une tenue isométrique, et non un chrono de sprint : le pas est de 5 s et
   * non d'un dixième. Personne n'a besoin de noter 24,7 s sur un gainage, et
   * 250 appuis pour atteindre 25 s au pas de 0,1 rendrait le champ inutile.
   */
  tenue: { label: 'Tenue', unit: 's', step: 5, min: 0, max: 180 },
  kg: { label: 'Charge', unit: 'kg', step: 2.5, min: 0, max: 300 },
  reps: { label: 'Reps', unit: '', step: 1, min: 0, max: 60 },
} as const;

export function ExerciseCard({
  ex,
  savedSets,
  overrideKg,
  history,
  timer,
  media,
  note,
  hideSets = false,
  custom = null,
  prevReplacement = null,
  onReplace,
  onCancelCustom,
  onSaveSet,
  onOverride,
}: {
  ex: ResolvedExercise;
  savedSets: SetRow[];
  overrideKg: number | null;
  timer: RestTimer;
  /**
   * Les occurrences réelles de CET exercice, telles que §11 les lit. On ne
   * refait pas la requête : c'est la même matière, donc le même chiffre que
   * celui sur lequel la suggestion de charge est calculée.
   */
  history: Occurrence[] | undefined;
  /** Où l'on se trouve dans le programme, pour dater photos et traces vidéo. */
  media: MediaContext | null;
  /**
   * Semaine et jour de la séance. Séparé de `media` à dessein : les photos ont
   * besoin d'une date en base, la remarque non — elle se range sous (exercice,
   * semaine, jour). Les lier avait un effet de bord silencieux : tant que la
   * date de début du programme n'était pas réglée, `media` valait `null` et le
   * champ de remarque disparaissait de toutes les séances.
   */
  note: NoteContext;
  /**
   * Masque les lignes de série et le sélecteur d'unité : ils sont saisis
   * ailleurs.
   *
   * Sert au bloc d'alternance, qui regroupe les séries des DEUX mouvements
   * dans l'ordre où ils se font. La fiche de l'exercice — ce qu'il a fait la
   * dernière fois, sa remarque, son suivi de douleur, ses consignes — reste
   * entière : c'est seulement la saisie qui a déménagé.
   */
  hideSets?: boolean;
  /**
   * La ligne qui a mis cet exercice là, quand il n'est pas au programme :
   * un remplacement ou un ajout. `null` pour un exercice prescrit.
   */
  custom?: { row: CustomRow; originalName: string | null } | null;
  /**
   * Le dernier remplacement fait sur ce créneau les semaines passées, pour la
   * puce « Remplacé par … ». Jamais appliqué : seulement affiché.
   */
  prevReplacement?: CustomRow | null;
  /** Ouvre le panneau de remplacement. Absent = pas remplaçable. */
  onReplace?: () => void;
  /** Annule le remplacement ou l'ajout qui a mis cet exercice là. */
  onCancelCustom?: () => void;
  onSaveSet: (ex: ResolvedExercise, payload: SetPayload) => Promise<void>;
  onOverride: (exId: string, kg: number | null) => void;
}) {
  const [openCues, setOpenCues] = useState(false);
  const [refusing, setRefusing] = useState(false);
  const [manualKg, setManualKg] = useState<number>(ex.load.kg ?? 0);
  /*
   * L'unité est choisie une fois pour l'exercice, pas série par série : on ne
   * change pas de façon de compter entre la deuxième et la troisième série.
   * Elle s'ouvre sur la dernière réellement utilisée sur ce mouvement — le
   * jour où la salle est pleine, Guillaume passe en pas une fois et l'appli
   * s'en souvient la semaine suivante.
   */
  const choixUnite = hasUnitChoice(measureOf(ex)?.unit);
  const [unite, setUnite] = useState<MeasureUnitId>(() => lastUnitUsed(history));

  const plannedKg = overrideKg ?? ex.load.kg;
  const shownLoadLine = buildLoadLine(ex, plannedKg);
  const allDone = savedSets.length >= ex.sets && ex.sets > 0;
  const suggestion = ex.suggestion;
  const showSuggestion =
    suggestion?.requiresConfirm &&
    suggestion.suggestedKg !== null &&
    overrideKg === null &&
    savedSets.length === 0;

  return (
    <article className={`${styles.exercise} ${allDone ? styles.exerciseDone : ''}`}>
      <div className={styles.exHead}>
        <div className={styles.exName}>{ex.name}</div>
        <div className={`${styles.loadLine} tnum`}>{shownLoadLine}</div>

        <div className={styles.exSub}>
          {ex.targetRPE && <span>{ex.targetRPE.label}</span>}
          {ex.restSec > 0 && (
            <span>
              Repos <b>{restLabel(ex.restSec)}</b>
            </span>
          )}
          {overrideKg !== null && (
            <span style={{ color: 'var(--accent-ink)' }}>charge ajustée</span>
          )}
        </div>

        {/*
          Le rappel « une ou deux haltères », juste sous la ligne de charge :
          l'endroit qu'on lit avant d'aller chercher le matériel. Deux portés
          du programme se ressemblent — Farmer à deux mains le vendredi,
          Suitcase à une main le samedi — et se confondent sans ça.
        */}
        {gripHint(ex.load) && <div className={styles.gripHint}>{gripHint(ex.load)}</div>}

        {ex.contrast && (
          <div className={styles.adjust}>
            <b>Contraste</b> — {ex.contrast.cycleLabel}. Série lourde →{' '}
            {restLabel(ex.contrast.restAfterHeavySec)} → {ex.contrast.explosive} ×{' '}
            {ex.contrast.explosiveReps} → {restLabel(ex.contrast.restAfterExplosiveSec)} → série
            suivante. Ce n’est pas un superset.
          </div>
        )}

        {ex.adjustments.map((a, i) => (
          <div
            key={i}
            className={`${styles.adjust} ${a.source === 'rouge' ? styles.adjustRouge : ''}`}
          >
            <b>{a.what}</b> — {a.why}
          </div>
        ))}

        {ex.notes.map((n, i) => (
          <div key={i} className={styles.exSub} style={{ color: 'var(--ink-2)' }}>
            {n}
          </div>
        ))}
      </div>

      {/*
        Cet exercice n'est pas au programme : il faut le dire, et dire ce
        qu'il remplace. Sans ça, relire la séance trois semaines plus tard
        donnerait l'impression que le programme prescrivait un Hack Squat.
      */}
      {custom && (
        <div className={styles.customBanner}>
          <span className={styles.customBannerText}>
            {custom.row.kind === 'replace'
              ? `À la place de ${custom.originalName ?? custom.row.originalExerciseId}`
              : 'Ajouté à cette séance'}
            {' — hors programme, rien n’est modifié pour la semaine prochaine.'}
          </span>
          {onCancelCustom && (
            <button type="button" className={styles.customCancel} onClick={onCancelCustom}>
              Annuler
            </button>
          )}
        </div>
      )}

      {/*
        Ce qui avait été fait à la place, la dernière fois. Affiché, jamais
        appliqué : le programme prescrit toujours l'exercice d'origine.
      */}
      {prevReplacement && (
        <div className={styles.prevCustom}>
          🔁 {replacementChip(prevReplacement)}{' '}
          <span className={styles.prevCustomWhen}>(S{prevReplacement.week})</span>
        </div>
      )}

      <LastTime
        ex={ex}
        history={history}
        seance={{ week: note.week, day: note.day }}
        plannedKg={plannedKg}
      />

      {media && <ExerciseMediaButton exerciseId={ex.id} exerciseName={ex.name} context={media} />}

      {showSuggestion && (
        <div className={styles.suggestion}>
          <div className={styles.suggestionText}>{suggestion.reason}</div>
          {!refusing ? (
            <div className={styles.suggestionActions}>
              <button
                type="button"
                className={styles.accept}
                onClick={() => onOverride(ex.id, suggestion.suggestedKg)}
              >
                Accepter {fr(suggestion.suggestedKg!)} kg
              </button>
              <button
                type="button"
                className={styles.refuse}
                onClick={() => {
                  setManualKg(plannedKg ?? 0);
                  setRefusing(true);
                }}
              >
                Refuser
              </button>
            </div>
          ) : (
            <>
              <div className={styles.suggestionActions} style={{ marginTop: 12 }}>
                <Stepper
                  label="Ma charge"
                  value={manualKg}
                  step={ex.load.step}
                  min={0}
                  max={300}
                  unit="kg"
                  tone="accent"
                  onStep={(d) => setManualKg((v) => stepValue(v, d, 0, 300))}
                />
              </div>
              <div className={styles.suggestionActions}>
                <button
                  type="button"
                  className={styles.accept}
                  onClick={() => {
                    onOverride(ex.id, manualKg);
                    setRefusing(false);
                  }}
                >
                  Utiliser {fr(manualKg)} kg
                </button>
                <button type="button" className={styles.refuse} onClick={() => setRefusing(false)}>
                  Annuler
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {ex.ramp && (
        <div className={styles.adjust} style={{ margin: '0 var(--pad) 12px' }}>
          <b>Paliers</b> —{' '}
          {ex.ramp
            .map(
              (r) =>
                `${r.added ? '+' : ''}${fr(r.kg)}${r.reps > 1 ? `×${r.reps}` : ''}${r.optional ? ' ?' : ''}`,
            )
            .join(' / ')}
        </div>
      )}

      {/*
        Mètres ou pas sur place. Le plan prescrit toujours des mètres : ce
        sélecteur dit comment la séance a été FAITE, il ne modifie pas le plan.
        Rien n'est converti — changer d'unité remet le champ sur une valeur qui
        a du sens dans la nouvelle, jamais sur le même chiffre.
      */}
      {!hideSets && choixUnite && ex.sets > 0 && (
        <div className={styles.uniteRow}>
          <span className={styles.uniteLabel}>Je compte en</span>
          <div className={styles.uniteChoice} role="group" aria-label="Unité de mesure">
            {UNIT_CHOICE.map((u) => (
              <button
                key={u.id}
                type="button"
                className={`${styles.uniteButton} ${unite === u.id ? styles.uniteOn : ''}`}
                onClick={() => setUnite(u.id)}
                aria-pressed={unite === u.id}
              >
                {u.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {!hideSets && ex.sets > 0 && (
        <div className={styles.sets}>
          {Array.from({ length: ex.sets }, (_, i) => (
            <SetEntry
              key={i}
              ex={ex}
              index={i}
              plannedKg={plannedKg}
              saved={savedSets.find((s) => s.setIndex === i) ?? null}
              unite={choixUnite ? unite : null}
              lastInUnit={choixUnite ? lastMeasureIn(history, unite) : null}
              timer={timer}
              onSave={onSaveSet}
            />
          ))}
        </div>
      )}

      {hideSets && ex.sets > 0 && (
        <div className={styles.setsAilleurs}>Séries saisies dans l’alternance, au-dessus.</div>
      )}

      {onReplace && (
        <button type="button" className={styles.replaceButton} onClick={onReplace}>
          ⇄ Remplacer cet exercice
        </button>
      )}

      {/* Remarque libre sur ce mouvement, sous les séries. Toujours là. */}
      <ExerciseNote exerciseId={ex.id} context={note} />

      {/*
        Suivi de douleur — seulement sur les mouvements dont la fiche en
        demande un. Il n'apparaît pas ailleurs : un curseur de douleur sous
        chaque exercice ferait du programme un questionnaire.
      */}
      {ex.def.painWatch && (
        <PainWatch exerciseId={ex.id} consigne={ex.def.painWatch} date={note.date} />
      )}

      {/*
        L'intention suffit à ouvrir le bloc. Avant, il fallait une consigne, une
        alternative ou une règle de progression : un exercice qui n'avait que
        son intention — Explosive Cable Row, One-Arm Cable Row, Cable Chop… —
        ne montrait donc RIEN, alors que le .md écrit bien quelque chose sur lui.
      */}
      {(ex.def.intent || ex.def.cues?.length || ex.def.altBasicFit || ex.def.progressionRule) && (
        <>
          <button
            type="button"
            className={styles.disclosure}
            onClick={() => setOpenCues((v) => !v)}
            aria-expanded={openCues}
          >
            {openCues
              ? '▲ Masquer les consignes'
              : ex.def.altBasicFit
                ? '▼ Consignes et alternative Basic-Fit'
                : '▼ Consignes'}
          </button>
          {openCues && (
            <div className={styles.cues}>
              {ex.def.intent && (
                <p>
                  <b>Intention :</b> {ex.def.intent}
                </p>
              )}
              {ex.def.cues?.map((c, i) => (
                <p key={i}>{c}</p>
              ))}
              {ex.def.progressionRule && (
                <p>
                  <b>Progression :</b> {ex.def.progressionRule}
                </p>
              )}
              {ex.def.altBasicFit && (
                <p>
                  <b>Alternative Basic-Fit :</b> {ex.def.altBasicFit}
                </p>
              )}
            </div>
          )}
        </>
      )}
    </article>
  );
}

// ---------------------------------------------------------------------------

/**
 * « La dernière fois : tant. »
 *
 * Entre la ligne de charge prévue et les champs de saisie — à l'endroit exact
 * où la question se pose, juste avant de charger la barre. Sans ça il fallait
 * quitter la séance pour l'onglet Progrès, ce que personne ne fait entre deux
 * séries.
 *
 * Rien à la première occurrence d'un mouvement, plutôt qu'un encart vide : en
 * semaine 1, neuf exercices afficheraient neuf lignes identiques sans
 * information, qui repousseraient les champs de saisie hors de l'écran. Un
 * encart qui ne dit rien vaut moins que pas d'encart.
 */
function LastTime({
  ex,
  history,
  seance,
  plannedKg,
}: {
  ex: ResolvedExercise;
  history: Occurrence[] | undefined;
  seance: { week: number; day: DayIndex };
  /** La charge réellement affichée aujourd'hui — ajustement et override compris. */
  plannedKg: number | null;
}) {
  const perf = lastPerformance(history, {
    exerciseId: ex.id,
    measureUnit: measureOf(ex)?.unit ?? null,
    before: seance,
  });
  if (perf === null) return null;

  /*
   * `down` n'a pas de classe à lui : une semaine de deload EST une baisse de
   * charge, un ajustement orange aussi. Les peindre en rouge apprendrait à
   * Guillaume à ignorer la couleur le jour où elle compte vraiment.
   */
  const fleche = perf.trend === 'up' ? '↑' : perf.delta === null ? '—' : '';

  /*
   * Le format du jour, à côté de celui de la dernière fois.
   *
   * C'est la comparaison qui manquait : « 115 kg · RPE 8 » ne dit pas si la
   * séance d'alors tenait cinq séries de trois ou deux séries de trois, et
   * sans ça on ne sait pas si monter la charge a du sens. Les deux lignes
   * côte à côte répondent à la question sans quitter l'écran.
   */
  const prevu = buildLoadLine(ex, plannedKg);

  return (
    <div className={styles.lastTime}>
      <div className={styles.lastTimeRow}>
        <span className={styles.lastTimeWhen}>📊 Semaine {perf.week}</span>
        <span className={`${styles.lastTimeValue} tnum`}>{perf.value}</span>
        {perf.rpe && <span className={styles.lastTimeRpe}>{perf.rpe}</span>}
        {(perf.delta || fleche) && (
          <span
            className={`${styles.lastTimeDelta} ${perf.trend === 'up' ? styles.lastTimeUp : ''} tnum`}
          >
            {fleche}
            {fleche && perf.delta ? ' ' : ''}
            {perf.delta}
          </span>
        )}
      </div>

      {perf.format && (
        <div className={`${styles.lastTimeFormat} tnum`}>
          Fait : <b>{perf.format}</b>
        </div>
      )}
      <div className={`${styles.lastTimePlan} tnum`}>
        Prévu : <b>{prevu}</b>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

/**
 * Une ligne de série — exportée parce que le bloc d'alternance la réutilise
 * telle quelle.
 *
 * La réécrire là-bas aurait voulu dire reperdre, une par une, la charge au
 * poids du corps, le RPE, la mesure et son unité, le drapeau « rep ratée », la
 * correction d'une série déjà validée, et le démarrage du chrono. Elle reste
 * donc le seul endroit où une série se saisit.
 */
export function SetEntry({
  ex,
  index,
  plannedKg,
  saved,
  unite,
  lastInUnit,
  timer,
  onSave,
}: {
  ex: ResolvedExercise;
  index: number;
  plannedKg: number | null;
  saved: SetRow | null;
  /** L'unité choisie pour l'exercice, ou `null` quand il n'y a pas de choix. */
  unite: MeasureUnitId | null;
  /** Dernière mesure enregistrée DANS cette unité, pour pré-remplir le champ. */
  lastInUnit: number | null;
  timer: RestTimer;
  onSave: (ex: ResolvedExercise, payload: SetPayload) => Promise<void>;
}) {
  const plannedReps = plannedRepsOf(ex);
  const measureBase = measureOf(ex);
  /*
   * Le curseur suit l'unité : les pas montent plus haut et avancent plus fin
   * que les mètres. Garder la grille des mètres pour compter des pas aurait
   * demandé quarante appuis pour une série ordinaire.
   */
  /*
   * `UnitOption` nomme son libellé `label`, `MEASURE` le nomme `unit` : les
   * recopier en bloc laissait le curseur affiché « DISTANCE · M » alors que
   * le sélecteur était sur « pas ». On reprend donc champ par champ.
   */
  const measure =
    measureBase && unite
      ? {
          label: unitConfig(unite).fieldLabel,
          unit: unitConfig(unite).label,
          step: unitConfig(unite).step,
          min: unitConfig(unite).min,
          max: unitConfig(unite).max,
        }
      : measureBase;
  const showLoad = showsLoadField(ex);

  const [editing, setEditing] = useState(false);
  const [reps, setReps] = useState<number>(saved?.actualReps ?? plannedReps ?? 1);
  /*
   * Le champ de charge existe sur TOUS les exercices, y compris au poids du
   * corps — il sert alors à noter un lest. Sa valeur de départ et son pas sont
   * décidés dans l'engine (`loadEntryFor`), pas ici : c'est ce qui les rend
   * testables sans monter un rendu React.
   *
   * `null` et non 0 : un « 0 kg » affiché ressemble à une charge prescrite,
   * alors que le programme n'en donne aucune sur ces mouvements-là.
   */
  const entry = loadEntryFor(ex, saved?.actualKg ?? plannedKg ?? undefined);
  const [kg, setKg] = useState<number | null>(entry.initialKg);
  const [rpeValue, setRpe] = useState<number>(saved?.actualRpe ?? ex.targetRPE?.max ?? 7);
  /*
   * Le champ de mesure s'ouvre sur ce qui a le plus de chances d'être juste,
   * dans cet ordre : ce qui a déjà été saisi pour cette série, la valeur que
   * le plan prescrit, la dernière réellement faite, et seulement en dernier
   * recours le minimum du curseur.
   *
   * Il démarrait au minimum. Valider un Suitcase Carry sans toucher au
   * curseur enregistrait donc 5 m au lieu des 30 m du plan — et l'encart de
   * comparaison répétait ensuite ce 5 m semaine après semaine.
   */
  const [value, setValue] = useState<number>(
    saved?.measureValue ?? plannedMeasureOf(ex) ?? ex.lastMeasure ?? measure?.min ?? 0,
  );
  const [failed, setFailed] = useState<boolean>(saved?.failed ?? false);

  /*
   * Changer d'unité remet le champ sur une valeur qui a du sens dans la
   * NOUVELLE unité. Surtout pas sur la même : passer de 12 m à « 12 pas » en
   * changeant seulement l'étiquette écrirait un chiffre que personne n'a fait.
   *
   * Une série déjà validée n'est pas touchée : elle porte son unité, et la
   * relire ne la réécrit pas.
   */
  useEffect(() => {
    if (saved !== null || unite === null) return;
    setValue(valueForUnit(unite, { lastInUnit, plannedMeters: plannedMeasureOf(ex) }));
  }, [unite, lastInUnit, saved, ex]);

  // Quand la charge du plan change — suggestion acceptée, feu tricolore, charge
  // saisie à la main — les séries pas encore validées se réalignent dessus.
  useEffect(() => {
    if (saved === null && plannedKg !== null) setKg(plannedKg);
  }, [plannedKg, saved]);

  const done = saved !== null && !editing;

  async function validate() {
    timer.prime();
    await onSave(ex, {
      setIndex: index,
      /*
       * Pas de champ, pas de charge : sans ça un saut hériterait de la dernière
       * charge connue et la traînerait dans l'historique.
       */
      actualKg: showLoad ? kg : null,
      actualReps: measure ? null : reps,
      actualRpe: ex.targetRPE ? rpeValue : null,
      measureValue: measure ? value : null,
      measureUnit: measure ? (unite ?? measureBase?.unit ?? null) : null,
      failed,
    });
    setEditing(false);
    if (ex.restSec > 0) {
      const label = ex.contrast
        ? `→ ${ex.contrast.explosive} × ${ex.contrast.explosiveReps}`
        : `${ex.name} — série ${index + 1}`;
      timer.start(ex.contrast?.restAfterHeavySec ?? ex.restSec, label);
    }
  }

  if (done) {
    return (
      <div className={`${styles.setRow} ${styles.setDone}`}>
        <div className={styles.setIndex}>{index + 1}</div>
        <button type="button" className={styles.setSummary} onClick={() => setEditing(true)}>
          {saved.actualReps !== null && (
            <span className={`${styles.setSummaryValue} tnum`}>
              {saved.actualReps} <span className={styles.setSummaryUnit}>reps</span>
            </span>
          )}
          {saved.measureValue !== null && measure && (
            <span className={`${styles.setSummaryValue} tnum`}>
              {fr(saved.measureValue)}{' '}
              {/*
                L'unité de la SÉRIE, pas celle du sélecteur. Changer le
                sélecteur après avoir validé en mètres ne doit pas relabelliser
                une série en pas — le chiffre, lui, n'a pas bougé.
              */}
              <span className={styles.setSummaryUnit}>{saved.measureUnit ?? measure.unit}</span>
            </span>
          )}
          {saved.actualKg !== null && (
            <span className={`${styles.setSummaryValue} tnum`}>
              {fr(saved.actualKg)} <span className={styles.setSummaryUnit}>kg</span>
            </span>
          )}
          {saved.actualRpe !== null && (
            <span className={`${styles.setSummaryValue} tnum`}>
              {fr(saved.actualRpe)} <span className={styles.setSummaryUnit}>RPE</span>
            </span>
          )}
          {saved.failed && <span className={styles.failFlag}>Rep ratée</span>}
        </button>
      </div>
    );
  }

  // Trois champs au maximum — reps/mesure, charge, RPE. Dès qu'il y en a un
  // nombre impair, le dernier prend toute la largeur pour que les boutons
  // gardent leurs 48 px.
  const hasRpe = ex.targetRPE !== null;
  const count = (showLoad ? 2 : 1) + (hasRpe ? 1 : 0);
  const wide = (position: number) =>
    count % 2 === 1 && position === count ? styles.stepperWide : '';

  return (
    <div className={styles.setRow}>
      <div className={styles.setIndex}>{index + 1}</div>
      <div className={styles.fields}>
        <div className={styles.steppers}>
          <div className={wide(1)}>
            {measure ? (
              <Stepper
                label={measure.label}
                value={value}
                step={measure.step}
                min={measure.min}
                max={measure.max}
                unit={measure.unit}
                tone="accent"
                onStep={(d) => setValue((v) => stepValue(v, d, measure.min, measure.max))}
                onCommit={(v) => setValue(v ?? measure.min)}
              />
            ) : (
              <Stepper
                label="Reps"
                value={reps}
                step={1}
                min={0}
                max={60}
                onStep={(d) => setReps((v) => stepValue(v, d, 0, 60))}
              />
            )}
          </div>

          {showLoad && (
            <div className={wide(2)}>
              <Stepper
                label={ex.load.shape === 'added' ? 'Lest' : 'Charge'}
                value={kg}
                emptyLabel={entry.emptyLabel}
                step={entry.step}
                min={KG_MIN}
                max={KG_MAX}
                unit="kg"
                onStep={(d) => setKg((v) => stepValue(v ?? 0, d, KG_MIN, KG_MAX))}
                /*
                 * `onCommit` ouvre le pavé numérique sur la valeur. Le Stepper
                 * rend la chaîne brute : c'est `parseKg` qui décide, et sa règle
                 * est « en cas de doute, on garde ce qu'il y avait ». Une faute
                 * de frappe ne doit jamais écrire un NaN ni un 0 dans
                 * l'historique — un 0 passerait pour une série faite à vide.
                 */
                onCommitText={(brut: string) => setKg((v) => parseKg(brut, v))}
              />
            </div>
          )}

          {hasRpe && (
            <div className={wide(count)}>
              <Stepper
                label="RPE"
                value={rpeValue}
                step={0.5}
                min={4}
                max={10}
                onStep={(d) => setRpe((v) => stepValue(v, d, 4, 10))}
              />
            </div>
          )}
        </div>

        {ex.def.role === 'main' && (
          <button
            type="button"
            className={`${styles.failToggle} ${failed ? styles.failToggleOn : ''}`}
            onClick={() => setFailed((f) => !f)}
            aria-pressed={failed}
          >
            {failed ? '✓ Rep ratée' : 'Rep ratée ?'}
          </button>
        )}

        <button type="button" className={styles.validate} onClick={() => void validate()}>
          Valider la série {index + 1}
        </button>

        {ex.contrast && (
          <button
            type="button"
            className={styles.failToggle}
            onClick={() =>
              timer.start(
                ex.contrast!.restAfterExplosiveSec,
                `${ex.contrast!.explosive} fait → série suivante`,
              )
            }
          >
            {ex.contrast.explosive} × {ex.contrast.explosiveReps} fait
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

/**
 * La mesure que le programme prescrit, quand il en prescrit une.
 *
 * Les portés sont chiffrés en mètres par le plan (« 4 × 25 m »), donc la
 * valeur existe. Un saut, non : le programme ne dit pas à quelle distance
 * sauter, c'est la mesure du jour. D'où le repli sur la dernière réalisée.
 */
function plannedMeasureOf(ex: ResolvedExercise): number | null {
  if (ex.work.kind === 'distance') return ex.work.meters;
  // Une tenue s'ouvre sur la durée prescrite : c'est elle qu'on valide le
  // plus souvent, et la saisie ne doit demander aucun appui dans ce cas.
  if (ex.work.kind === 'time') return ex.work.seconds;
  return null;
}

function plannedRepsOf(ex: ResolvedExercise): number | null {
  if (ex.work.kind !== 'reps') return null;
  const r = ex.work.reps;
  if (r === 'max') return null;
  return typeof r === 'number' ? r : r.max;
}

/**
 * Mesures qui remplacent le compte de reps : une distance, un temps.
 *
 * `kg` n'en fait pas partie — une charge se note dans le champ de charge, pas
 * une deuxième fois à côté.
 */
const MESURE_CHIFFREE = new Set(['cm', 'm', 's']);

export function measureOf(ex: ResolvedExercise): (typeof MEASURE)[keyof typeof MEASURE] | null {
  if (ex.work.kind === 'distance') return MEASURE.m;
  /*
   * Une tenue se note en secondes, pas en reps. Le conditioning est exclu :
   * ses douze minutes ne se saisissent pas série par série, et son unique
   * « série » n'a rien à enregistrer.
   */
  if (ex.work.kind === 'time' && ex.def.role !== 'conditioning') return MEASURE.tenue;
  /*
   * Un saut se note par sa distance, et pas seulement en semaine de combine.
   * Un « 5 × 2 » de Broad Jump sans champ de distance ne garde rien de la
   * séance : c'est le seul chiffre qui progresse d'une semaine à l'autre.
   */
  const m = ex.def.measure;
  if (m && MESURE_CHIFFREE.has(m)) return MEASURE[m];
  if (ex.def.role !== 'test') return null;
  return m ? MEASURE[m] : MEASURE.reps;
}

/**
 * Le champ de charge a-t-il un sens sur cet exercice ?
 *
 * Il est là partout ailleurs, y compris au poids du corps, où il sert à noter
 * un lest. Mais sur un saut ou un sprint il n'y a rien à lester et rien à
 * porter : « PDC » y prend la moitié de la ligne pour ne jamais rien dire,
 * alors que la distance, elle, est la seule valeur de la séance.
 *
 * Un porté garde ses deux champs : sa charge existe (`shape` vaut `dbPair`) et
 * sa distance aussi.
 */
export function showsLoadField(ex: ResolvedExercise): boolean {
  if (ex.load.shape !== 'none') return true;
  const m = ex.def.measure;
  return !(m !== undefined && MESURE_CHIFFREE.has(m));
}

/** Reprend la ligne de charge en tenant compte d'une charge ajustée. */
function buildLoadLine(ex: ResolvedExercise, kg: number | null): string {
  if (kg === null || kg === ex.load.kg) return ex.loadLine;
  return loadLine(ex.sets, ex.work, { ...ex.load, kg });
}
