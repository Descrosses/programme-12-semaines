import { useEffect, useState } from 'react';
import type { SetRow } from '../db/db';
import { fr, gripHint, loadLine, restLabel } from '../engine/format';
import type { ResolvedExercise } from '../engine/getSession';
import type { RestTimer } from '../state/useRestTimer';
import { ExerciseMediaButton, type MediaContext } from './ExerciseMedia';
import { FicheTechnique } from './FicheTechnique';
import { ExerciseNote, type NoteContext } from './ExerciseNote';
import { Icon } from './Icon';
import { Stepper, stepValue } from './Stepper';
import { KG_MAX, KG_MIN, loadEntryFor, parseKg } from '../engine/loadEntry';
import { lastPerformance } from '../engine/lastPerformance';
import { premierePhrase } from '../engine/apercuSeance';
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
import type { VisuelNom } from '../data/visuels';
import { EXERCISES } from '../data/exercises';
import { fonctionTronc } from '../data/fonctionsTronc';
import {
  estAlignable,
  propositionAlignement,
  type DecisionAlignement,
} from '../engine/alignementReps';
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
  /**
   * La deuxième partie de la série : les reps, et la charge allégée s'il y en
   * a une. `secondKg` à `null` se lit « la même charge », pas « aucune ».
   */
  secondReps: number | null;
  secondKg: number | null;
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
  repere = null,
  ambiance,
  ensuite = null,
  custom = null,
  prevReplacement = null,
  onReplace,
  onCancelCustom,
  onSaveSet,
  onOverride,
  alignement,
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
   * « Exercice 06 · Explosif » — la place du mouvement dans la séance, et son
   * étiquette quand il en a une. `null` quand l'écran n'en donne pas : la
   * carte reste alors exactement ce qu'elle était.
   */
  repere?: string | null;
  /** La photo d'ambiance du programme, pour le bloc fiche technique sans fiche. */
  ambiance?: VisuelNom;
  /** Le mouvement suivant de la séance, quand il y en a un. */
  ensuite?: { id: string; nom: string; prescription: string } | null;
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
  /**
   * L'alignement des reps : la réponse déjà donnée pour cet exercice, et de
   * quoi enregistrer la suivante. Absent, aucune proposition n'est faite.
   */
  alignement?: {
    decision: DecisionAlignement | undefined;
    onDecider: (d: DecisionAlignement) => void;
  };
}) {
  const [openCues, setOpenCues] = useState(false);
  const [openNote, setOpenNote] = useState(false);
  const [openMedia, setOpenMedia] = useState(false);
  const [ficheVersion, setFicheVersion] = useState(0);
  /* Les séries « à venir » que la personne a choisi d'ouvrir à l'avance. */
  const [ouvertes, setOuvertes] = useState<ReadonlySet<number>>(() => new Set());
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

  /*
   * La série à faire : la première qui n'a rien d'enregistré. Elle seule est
   * ouverte ; les validées tiennent sur une ligne, les suivantes se lisent
   * « à venir » et s'ouvrent au toucher — pour noter une série dans le
   * désordre, rien n'est verrouillé.
   */
  const courante = Array.from({ length: ex.sets }, (_, i) => i).find(
    (i) => !savedSets.some((s) => s.setIndex === i),
  );

  /*
   * Tout ce qui EXPLIQUE, rangé sous « Consignes » : le pourquoi des
   * ajustements, le détail du contraste, les notes du programme, puis les
   * consignes du mouvement. Ce qui CHANGE la séance reste visible au-dessus —
   * le « quoi » de chaque ajustement, le rappel du contraste, l'alerte rouge
   * en entier.
   */
  const fonction = fonctionTronc(ex.id);

  /*
   * « Tu as fait 3 × 10 au lieu de 3 × 6 : aligner l'attendu ? » — seulement
   * avant la première série du jour, et pour un accessoire ou un exercice de
   * tronc compté en reps.
   */
  const proposition =
    alignement &&
    savedSets.length === 0 &&
    ex.work.kind === 'reps' &&
    typeof ex.work.reps === 'number' &&
    estAlignable(ex.def.role, ex.work.kind, ex.work.reps)
      ? propositionAlignement(ex.work.reps, history, note.week, alignement.decision)
      : null;

  const aDesConsignes =
    ex.adjustments.some((a) => a.source !== 'rouge') ||
    ex.contrast !== undefined ||
    ex.notes.length > 0 ||
    !!(ex.def.intent || ex.def.cues?.length || ex.def.altBasicFit || ex.def.progressionRule);

  return (
    <article
      id={`exercice-${ex.id}`}
      className={`${styles.exercise} ${allDone ? styles.exerciseDone : ''}`}
    >
      <div className={styles.exHead}>
        {repere !== null && <p className={styles.exRepere}>{repere}</p>}
        <div className={styles.exName}>{ex.name}</div>
        <div className={`${styles.loadLine} tnum`}>{shownLoadLine}</div>
        {ex.def.vigilance && (
          <p className={styles.vigilance}>
            <b>Vigilance</b> — {ex.def.vigilance}
          </p>
        )}

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

        {/*
          À quoi sert ce mouvement de tronc. Visible sur la carte, pas rangé
          sous Consignes : c'est ce qui distingue un Pallof Press d'un Ab
          Wheel, et on le lit AVANT de se placer.
        */}
        {fonction !== null && (
          <div className={styles.fonctionTronc}>
            <span className={styles.fonctionNom}>{fonction.nom}</span>
            <span className={styles.fonctionTexte}>
              {fonction.role} {fonction.utilite}
            </span>
          </div>
        )}

        {/*
          Le contraste change la façon d'enchaîner : la séquence reste écrite
          en entier sur la carte, en une ligne qu'on suit des yeux entre deux
          séries. Seule la mise en garde « ce n'est pas un superset » passe
          sous Consignes.
        */}
        {ex.contrast && (
          <div className={styles.adjust}>
            <b>Contraste</b> — {ex.contrast.cycleLabel}
            <span className={styles.adjustSuite}>
              Série lourde → {restLabel(ex.contrast.restAfterHeavySec)} →{' '}
              {EXERCISES[ex.contrast.explosive]?.name ?? ex.contrast.explosive} ×{' '}
              {ex.contrast.explosiveReps} → {restLabel(ex.contrast.restAfterExplosiveSec)} → série
              suivante
            </span>
          </div>
        )}

        {/*
          Chaque ajustement de charge garde son pourquoi visible — sa première
          phrase, celle qui dit d'où vient le chiffre. La suite de
          l'explication est sous Consignes. Le rouge reste entier : c'est une
          consigne de sécurité.
        */}
        {ex.adjustments.map((a, i) => (
          <div
            key={i}
            className={`${styles.adjust} ${a.source === 'rouge' ? styles.adjustRouge : ''}`}
          >
            <b>{a.what}</b> — {a.source === 'rouge' ? a.why : premierePhrase(a.why)}
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

      {proposition && alignement && (
        <div className={styles.suggestion}>
          <div className={styles.suggestionText}>
            En semaine {proposition.semaine}, tu as tenu <b>{proposition.propose} reps</b> à chacun
            de tes {proposition.nbTours} tours, au lieu de {proposition.prevu}. Aligner l’attendu
            sur {proposition.propose} reps pour la suite du programme ?
          </div>
          <div className={styles.suggestionActions}>
            <button
              type="button"
              className={styles.accept}
              onClick={() => alignement.onDecider({ reps: proposition.propose, accepte: true })}
            >
              Passer à {proposition.propose} reps
            </button>
            <button
              type="button"
              className={styles.refuse}
              onClick={() => alignement.onDecider({ reps: proposition.propose, accepte: false })}
            >
              Garder {proposition.prevu}
            </button>
          </div>
        </div>
      )}

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

      <FicheTechnique
        def={ex.def}
        {...(ambiance === undefined ? {} : { ambiance })}
        version={ficheVersion}
        onAjouter={() => setOpenMedia(true)}
      />

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
          {Array.from({ length: ex.sets }, (_, i) => {
            const saved = savedSets.find((s) => s.setIndex === i) ?? null;
            if (saved === null && i !== courante && !ouvertes.has(i)) {
              return (
                <button
                  key={i}
                  type="button"
                  className={`${styles.setRow} ${styles.setAVenir}`}
                  onClick={() => setOuvertes((o) => new Set(o).add(i))}
                  aria-label={`Série ${i + 1} à venir — ouvrir pour la saisir maintenant`}
                >
                  <span className={styles.setIndex}>{i + 1}</span>
                  <span className={styles.setAVenirTexte}>à venir</span>
                </button>
              );
            }
            return (
              <SetEntry
                key={i}
                ex={ex}
                index={i}
                plannedKg={plannedKg}
                saved={saved}
                courante={i === courante}
                unite={choixUnite ? unite : null}
                lastInUnit={choixUnite ? lastMeasureIn(history, unite) : null}
                timer={timer}
                onSave={onSaveSet}
              />
            );
          })}
        </div>
      )}

      {hideSets && ex.sets > 0 && (
        <div className={styles.setsAilleurs}>Séries saisies dans l’alternance, au-dessus.</div>
      )}

      {/*
        L'alternance une jambe / deux jambes, quand le mouvement alterne.

        Elle change le nombre de séries à faire et pas seulement la manière :
        elle reste donc visible, hors des consignes. La frise des quatre
        semaines rend visible que les deux exercices de jambes alternent EN
        OPPOSITION, ce que le document dit et qu'on ne croit pas tant qu'on ne
        le voit pas.
      */}
      {ex.def.alternance && (
        <div
          className={`${styles.alternance} ${
            ex.def.alternance.mode === 'unilateral' ? styles.alternanceUni : styles.alternanceBi
          }`}
        >
          <p className={styles.alternanceTitre}>
            {ex.def.alternance.mode === 'unilateral'
              ? 'Cette semaine : une jambe à la fois'
              : 'Cette semaine : les deux jambes'}
          </p>
          <ol className={styles.frise}>
            {ex.def.alternance.frise.map((s) => (
              <li
                key={s.semaine}
                className={s.mode === 'unilateral' ? styles.friseUni : styles.friseBi}
                aria-label={`Semaine ${s.semaine} : ${
                  s.mode === 'unilateral' ? 'une jambe' : 'les deux jambes'
                }`}
              >
                S{s.semaine}
              </li>
            ))}
          </ol>
        </div>
      )}

      {/*
        Les trois tiroirs de la carte, côte à côte : ce qu'il faut savoir, ce
        qu'on veut noter, ce qu'on veut garder en image. Un seul ouvert à la
        fois n'est pas imposé — on peut relire les consignes en écrivant.
      */}
      <div className={styles.tiroirs}>
        {aDesConsignes && (
          <button
            type="button"
            className={`${styles.tiroir} ${openCues ? styles.tiroirOuvert : ''}`}
            onClick={() => setOpenCues((v) => !v)}
            aria-expanded={openCues}
          >
            Consignes
          </button>
        )}
        <button
          type="button"
          className={`${styles.tiroir} ${openNote ? styles.tiroirOuvert : ''}`}
          onClick={() => setOpenNote((v) => !v)}
          aria-expanded={openNote}
        >
          Remarque
        </button>
        {media && (
          <button
            type="button"
            className={`${styles.tiroir} ${openMedia ? styles.tiroirOuvert : ''}`}
            onClick={() => setOpenMedia((v) => !v)}
            aria-expanded={openMedia}
          >
            Documenter
          </button>
        )}
      </div>

      {openCues && (
        <div className={styles.cues}>
          {ex.contrast && (
            <p>
              <b>Contraste</b> — {ex.contrast.cycleLabel}. Série lourde →{' '}
              {restLabel(ex.contrast.restAfterHeavySec)} →{' '}
              {EXERCISES[ex.contrast.explosive]?.name ?? ex.contrast.explosive} ×{' '}
              {ex.contrast.explosiveReps} → {restLabel(ex.contrast.restAfterExplosiveSec)} → série
              suivante. Ce n’est pas un superset.
            </p>
          )}
          {ex.adjustments
            .filter((a) => a.source !== 'rouge')
            .map((a, i) => (
              <p key={i}>
                <b>{a.what}</b> — {a.why}
              </p>
            ))}
          {ex.notes.map((n, i) => (
            <p key={`n${i}`}>{n}</p>
          ))}
          {ex.def.intent && (
            <p>
              <b>Intention :</b> {ex.def.intent}
            </p>
          )}
          {ex.def.cues?.map((c, i) => (
            <p key={`c${i}`}>{c}</p>
          ))}
          {ex.def.progressionRule && (
            <p>
              <b>Progression :</b> {ex.def.progressionRule}
            </p>
          )}
          {ex.def.altBasicFit && (
            <p>
              <b>Alternative en salle :</b> {ex.def.altBasicFit}
            </p>
          )}
        </div>
      )}

      {/* Remarque libre sur ce mouvement — derrière son bouton, jamais perdue :
          le brouillon est enregistré à chaque frappe et repris à la réouverture. */}
      {openNote && <ExerciseNote exerciseId={ex.id} context={note} />}

      {media && (
        <ExerciseMediaButton
          exerciseId={ex.id}
          exerciseName={ex.name}
          context={media}
          ouvert={openMedia}
          sansBouton
          onFicheChange={() => setFicheVersion((v) => v + 1)}
        />
      )}

      {onReplace && (
        <button type="button" className={styles.replaceButton} onClick={onReplace}>
          <Icon name="swap" size="18px" />
          Remplacer cet exercice
        </button>
      )}

      {/* Le mouvement suivant : un appui y descend, sans chercher sa carte. */}
      {ensuite && (
        <button
          type="button"
          className={styles.ensuite}
          onClick={() =>
            document
              .getElementById(`exercice-${ensuite.id}`)
              ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }
        >
          <span className={styles.ensuiteLabel}>Ensuite</span>
          <span className={styles.ensuiteNom}>
            {ensuite.nom} · <span className="tnum">{ensuite.prescription}</span>
          </span>
          <Icon name="arrow-right" size="18px" />
        </button>
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
  const [detail, setDetail] = useState(false);
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

  /*
   * Une ligne, et le détail au toucher. La comparaison « Fait / Prévu » reste
   * à un appui : c'est elle qui dit si monter la charge a du sens, mais elle
   * n'a pas à repousser la saisie hors de l'écran à chaque série.
   */
  return (
    <div className={styles.lastTime}>
      <button
        type="button"
        className={styles.lastTimeRow}
        onClick={() => setDetail((v) => !v)}
        aria-expanded={detail}
      >
        <span className={styles.lastTimeWhen}>Dernière fois · S{perf.week}</span>
        <span className={styles.lastTimeDroite}>
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
          <Icon name={detail ? 'chevron-up' : 'chevron-down'} size="16px" />
        </span>
      </button>

      {detail && (
        <>
          {perf.format && (
            <div className={`${styles.lastTimeFormat} tnum`}>
              Fait : <b>{perf.format}</b>
            </div>
          )}
          <div className={`${styles.lastTimePlan} tnum`}>
            Prévu : <b>{prevu}</b>
          </div>
        </>
      )}
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
  courante = false,
  unite,
  lastInUnit,
  timer,
  onSave,
  libelleRepos,
}: {
  ex: ResolvedExercise;
  index: number;
  plannedKg: number | null;
  /** Le libellé du chrono, quand ce n'est pas un repos (transition de superset). */
  libelleRepos?: string;
  saved: SetRow | null;
  /** La série à faire maintenant : elle seule est mise en avant. */
  courante?: boolean;
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
  /*
   * Contraste (S9-11) : la série lourde est validée, le mouvement explosif
   * reste à faire. Tant que c'est vrai, la ligne validée porte un SECOND
   * bouton — « Box Jump × 2 fait ».
   *
   * Avant, ce bouton vivait dans le formulaire de la série lourde, et
   * disparaissait avec lui dès qu'on la validait : au moment précis où l'on
   * venait de sauter, il n'y avait plus rien à toucher pour lancer le repos.
   *
   * État d'écran, pas de base : ce qui s'enregistre, c'est la série lourde.
   * Le saut ne porte ni charge ni mesure, il ne fait que rythmer le repos.
   */
  const [attenteExplosif, setAttenteExplosif] = useState(false);
  const nomExplosif = ex.contrast
    ? (EXERCISES[ex.contrast.explosive]?.name ?? ex.contrast.explosive)
    : null;
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
   * La deuxième partie de la série, quand le programme en prescrit une SUR
   * CETTE SÉRIE. `onSets` absent vaut « sur toutes » ; MASS 4 s'en sert pour
   * sa technique à trois séries, dont seules la première et la troisième se
   * jouent en deux temps.
   *
   * Les champs partent vides, jamais préremplis : une dégressive non saisie
   * doit rester absente de l'historique plutôt que d'y inscrire un chiffre
   * que personne n'a fait.
   */
  const seconde =
    ex.def.secondPart && (ex.def.secondPart.onSets?.includes(index) ?? true)
      ? ex.def.secondPart
      : null;
  const [secondReps, setSecondReps] = useState<number | null>(saved?.secondReps ?? null);
  const [secondKg, setSecondKg] = useState<number | null>(saved?.secondKg ?? null);

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
      secondReps: seconde ? secondReps : null,
      // Pas de champ de charge : on écrit `null`, qui se lit « la même charge
      // que la première partie » et non « aucune charge ».
      secondKg: seconde?.withLoad ? secondKg : null,
    });
    setEditing(false);
    if (ex.restSec > 0) {
      const label = ex.contrast
        ? `→ ${nomExplosif} × ${ex.contrast.explosiveReps}`
        : (libelleRepos ?? `${ex.name} — série ${index + 1}`);
      timer.start(ex.contrast?.restAfterHeavySec ?? ex.restSec, label);
    }
    if (ex.contrast) setAttenteExplosif(true);
  }

  if (done) {
    return (
      <div className={`${styles.setRow} ${styles.setDone}`}>
        <div className={styles.setIndex}>{index + 1}</div>
        <button
          type="button"
          className={styles.setSummary}
          onClick={() => setEditing(true)}
          aria-label={`Série ${index + 1} validée — toucher pour corriger`}
        >
          {/*
            Une ligne : « 57,5 kg × 2 · RPE 6 ». La charge et les reps en grand,
            ce qui se compare d'une série à l'autre ; le RPE en petit. Seuls
            les champs réellement saisis apparaissent — jamais un zéro inventé.
          */}
          <span className={`${styles.setSummaryValue} tnum`}>
            {saved.actualKg !== null && (
              <>
                {fr(saved.actualKg)} <span className={styles.setSummaryUnit}>kg</span>
              </>
            )}
            {saved.actualKg !== null && saved.actualReps !== null && ' × '}
            {saved.actualReps !== null &&
              (saved.actualKg !== null ? (
                saved.actualReps
              ) : (
                <>
                  {saved.actualReps} <span className={styles.setSummaryUnit}>reps</span>
                </>
              ))}
            {saved.measureValue !== null && measure && (
              <>
                {saved.actualKg !== null ? ' · ' : ''}
                {fr(saved.measureValue)}{' '}
                {/*
                  L'unité de la SÉRIE, pas celle du sélecteur. Changer le
                  sélecteur après avoir validé en mètres ne doit pas
                  relabelliser une série en pas — le chiffre, lui, n'a pas bougé.
                */}
                <span className={styles.setSummaryUnit}>{saved.measureUnit ?? measure.unit}</span>
              </>
            )}
          </span>
          {saved.actualRpe !== null && (
            <span className={`${styles.setSummaryUnit} tnum`}>· RPE {fr(saved.actualRpe)}</span>
          )}
          {saved.secondReps !== null && saved.secondReps !== undefined && (
            <span className={`${styles.setSummaryUnit} tnum`}>
              puis {saved.secondReps} reps
              {saved.secondKg !== null && saved.secondKg !== undefined
                ? ` à ${fr(saved.secondKg)} kg`
                : ''}
            </span>
          )}
          {saved.failed && <span className={styles.failFlag}>Rep ratée</span>}
        </button>
        {ex.contrast && attenteExplosif && (
          /* Le second bouton du contraste : il valide le saut et lance le
             repos avant la série lourde suivante. */
          <button
            type="button"
            className={`${styles.validate} ${styles.validateContraste}`}
            onClick={() => {
              timer.start(
                ex.contrast!.restAfterExplosiveSec,
                `${nomExplosif} fait → série suivante`,
              );
              setAttenteExplosif(false);
            }}
          >
            {nomExplosif} × {ex.contrast.explosiveReps} fait — valider la série {index + 1}
          </button>
        )}
      </div>
    );
  }

  /*
   * Trois champs au maximum, sur UNE ligne — charge, reps (ou mesure), RPE —
   * en sélecteurs compacts. La charge d'abord : c'est ce qu'on règle sur la
   * barre avant de soulever.
   */
  const hasRpe = ex.targetRPE !== null;
  const count = (showLoad ? 2 : 1) + (hasRpe ? 1 : 0);

  const champCharge = showLoad && (
    <Stepper
      compact
      label={ex.load.shape === 'added' ? 'Lest kg' : 'Charge kg'}
      value={kg}
      emptyLabel={entry.emptyLabel}
      step={entry.step}
      min={KG_MIN}
      max={KG_MAX}
      onStep={(d) => setKg((v) => stepValue(v ?? 0, d, KG_MIN, KG_MAX))}
      /*
       * `onCommit` ouvre le pavé numérique sur la valeur. Le Stepper rend la
       * chaîne brute : c'est `parseKg` qui décide, et sa règle est « en cas de
       * doute, on garde ce qu'il y avait ». Une faute de frappe ne doit jamais
       * écrire un NaN ni un 0 dans l'historique — un 0 passerait pour une
       * série faite à vide.
       */
      onCommitText={(brut: string) => setKg((v) => parseKg(brut, v))}
    />
  );

  return (
    <div className={`${styles.setRow} ${courante ? styles.setCourante : ''}`}>
      <div className={styles.setIndex}>{index + 1}</div>
      <div className={styles.fields}>
        <div
          className={styles.steppersLigne}
          /*
           * Colonnes `auto` et non égales : chacune prend la place de son
           * chiffre, puis le reste se partage. « 142,5 » a besoin de plus que
           * « 2 » — en colonnes égales, la charge débordait à 390 px.
           */
          style={{ gridTemplateColumns: `repeat(${count}, auto)` }}
        >
          {champCharge}
          {measure ? (
            <Stepper
              compact
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
              compact
              label="Reps"
              value={reps}
              step={1}
              min={0}
              max={60}
              onStep={(d) => setReps((v) => stepValue(v, d, 0, 60))}
            />
          )}
          {hasRpe && (
            <Stepper
              compact
              label="RPE"
              value={rpeValue}
              step={0.5}
              min={4}
              max={10}
              onStep={(d) => setRpe((v) => stepValue(v, d, 4, 10))}
            />
          )}
        </div>

        {ex.def.role === 'main' && (
          <button
            type="button"
            className={`${styles.failToggle} ${failed ? styles.failToggleOn : ''}`}
            onClick={() => setFailed((f) => !f)}
            aria-pressed={failed}
          >
            {failed && <Icon name="check" size="16px" />}
            {failed ? 'Rep ratée' : 'Rep ratée ?'}
          </button>
        )}

        {seconde !== null && (
          <div className={styles.seconde}>
            <p className={styles.secondeTitre}>
              {seconde.label}
              {!seconde.withLoad && (
                /*
                 * Dit sous le titre et non à côté du champ : placé dans la
                 * rangée des champs, « la même » se lisait comme un second
                 * champ qu'on aurait oublié de remplir.
                 */
                <span className={styles.secondeMemeCharge}>Charge : la même</span>
              )}
            </p>
            <div className={styles.steppers}>
              <div className={seconde.withLoad ? '' : styles.stepperWide}>
                <Stepper
                  label={seconde.withLoad ? 'Reps' : 'Échec — reps'}
                  value={secondReps}
                  step={1}
                  min={0}
                  max={60}
                  /*
                   * Un tiret, et non « à saisir » : dans la dégressive les
                   * deux champs sont côte à côte sur une demi-largeur, et le
                   * texte débordait de son cadre en se coupant en deux. Les
                   * étiquettes au-dessus disent déjà ce qu'on attend.
                   */
                  emptyLabel="—"
                  onStep={(d) => setSecondReps((v) => stepValue(v, d, 0, 60))}
                  onCommit={(v) => setSecondReps(v)}
                />
              </div>
              {seconde.withLoad && (
                <div>
                  <Stepper
                    label="Charge · kg"
                    value={secondKg}
                    step={2.5}
                    min={KG_MIN}
                    max={KG_MAX}
                    emptyLabel="—"
                    onStep={(d) => setSecondKg((v) => stepValue(v, d, KG_MIN, KG_MAX))}
                    onCommit={(v) => setSecondKg(v)}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        <button type="button" className={styles.validate} onClick={() => void validate()}>
          {ex.contrast
            ? `Valider ${ex.name} — série ${index + 1}`
            : `Valider la série ${index + 1}`}
        </button>
        {ex.contrast && (
          <p className={styles.contrasteAide}>
            Ensuite : {nomExplosif} × {ex.contrast.explosiveReps}, avec son propre bouton.
          </p>
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
