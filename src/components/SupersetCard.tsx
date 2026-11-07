import { Fragment, type ReactNode } from 'react';
import { Icon } from './Icon';
import type { SetRow } from '../db/db';
import type { ResolvedExercise } from '../engine/getSession';
import {
  avancement,
  consigneRythme,
  lettreStation,
  titreRythme,
  tourActif,
  travailCourt,
  type Circuit,
} from '../engine/superset';
import { restLabel } from '../engine/format';
import type { RestTimer } from '../state/useRestTimer';
import { SetEntry, type SetPayload } from './ExerciseCard';
import styles from '../screens/Session.module.css';

/**
 * Plusieurs mouvements menés ensemble, dans un seul encadré.
 *
 * Deux reste le cas ordinaire — POWER 12 et MASS 4 n'ont que des paires. Mais
 * la carte compte ses stations au lieu de les nommer `a` et `b` : un circuit
 * de trois s'affiche A, B, C sans rien de plus, et c'est ce que réclament les
 * programmes en circuit qu'on importera.
 *
 * ── Ce que ça change concrètement ──────────────────────────────────────────
 *
 * Le programme écrit « une série de chaque, 45 s entre les stations ». À
 * l'écran, c'étaient deux cartes de trois séries : suivre la consigne
 * demandait six allers-retours de défilement par séance, les mains pleines,
 * entre deux repos de 45 s. Ici les séries sont rangées dans l'ordre où elles
 * se font — tour 1 : A puis B ; tour 2 : A puis B — et il n'y a plus rien à
 * faire défiler.
 *
 * ── Ce que ça NE change pas ────────────────────────────────────────────────
 *
 * Chaque mouvement reste un exercice à part entière : son propre historique,
 * sa propre progression, sa propre remarque, son propre suivi de douleur. Les
 * séries s'enregistrent exactement comme avant, une par une, sous leur
 * exercice. Et le chrono est celui que porte chaque créneau — c'est
 * `SetEntry` qui le lance, pas ce composant : le rythme vient des repos
 * écrits dans le programme, pas d'une décision d'affichage.
 *
 * Un seul tour est déplié à la fois. Trois tours ouverts remettraient à
 * l'écran les six champs qu'on cherchait justement à ranger.
 */
export function SupersetCard({
  circuit,
  savedSets,
  overrides,
  timer,
  onSaveSet,
  fiches,
}: {
  circuit: Circuit;
  savedSets: Record<string, SetRow[]>;
  overrides: Record<string, number>;
  timer: RestTimer;
  onSaveSet: (ex: ResolvedExercise, payload: SetPayload) => Promise<void>;
  /**
   * Les fiches d'exercice, une par station, rendues sous les tours.
   *
   * Passées en `ReactNode` plutôt que construites ici : elles portent la
   * remarque, le suivi de douleur, le remplacement et les consignes, c'est-à-
   * dire tout ce que `ExerciseCard` sait déjà faire. Les recopier aurait
   * fabriqué une deuxième carte d'exercice à maintenir en parallèle.
   */
  fiches: ReactNode;
}) {
  const { exs, tours, rythme } = circuit;
  const titre = titreRythme(rythme, exs.length);

  const serie = (ex: ResolvedExercise, i: number) =>
    (savedSets[ex.id] ?? []).find((s) => s.setIndex === i) ?? null;
  /*
   * Un tour est fait quand TOUTES ses stations le sont. Une station qui a
   * moins de séries que le tour en cours — un deload qui n'allège qu'un des
   * mouvements — ne doit pas retenir le tour : elle n'a rien à y saisir.
   */
  const tourFait = (i: number) => exs.every((ex) => i >= ex.sets || serie(ex, i) !== null);
  const actif = tourActif(tours, tourFait);
  const { faites, total } = avancement(circuit, (ex) => (savedSets[ex.id] ?? []).length);
  const fini = faites >= total;

  return (
    <section
      className={`${styles.superset} ${fini ? styles.supersetDone : ''}`}
      aria-label={`${titre} : ${exs.map((e) => e.name).join(', ')}`}
    >
      <div className={styles.supersetHead}>
        <span className={styles.supersetBadge}>{titre.toUpperCase()}</span>
        <h3 className={styles.supersetTitle}>
          {exs.map((ex, i) => (
            <span key={ex.id}>
              {i > 0 && <span className={styles.supersetPlus}> + </span>}
              {ex.name}
            </span>
          ))}
        </h3>
        <div className={`${styles.supersetFormat} tnum`}>
          {tours} tour{tours > 1 ? 's' : ''} · {exs.map((e) => travailCourt(e.work)).join(' · ')}
        </div>
        <p className={styles.supersetConsigne}>{consigneRythme(circuit)}</p>
        <div className={`${styles.supersetCount} tnum`}>
          {faites} / {total} séries
        </div>
      </div>

      {Array.from({ length: tours }, (_, i) => {
        const ouvert = i === actif;
        return (
          <div
            key={i}
            className={`${styles.tour} ${ouvert ? styles.tourOuvert : ''} ${
              tourFait(i) ? styles.tourFait : ''
            }`}
          >
            <div className={styles.tourHead}>
              <span className={styles.setIndex}>{i + 1}</span>
              <span className={styles.tourTitre}>
                Tour {i + 1} sur {tours}
              </span>
              {tourFait(i) && (
                <span className={styles.tourFlag}>
                  <Icon name="check" size="15px" /> fait
                </span>
              )}
            </div>

            {exs.map((ex, station) => (
              <Fragment key={ex.id}>
                {/*
                  Ce qui sépare deux stations, dit en toutes lettres, et répété
                  entre CHAQUE paire de stations — sur un circuit de trois, on
                  ne lit pas la consigne une fois pour deux passages. Sur un
                  enchaînement c'est « aucun repos » ; sur une alternance c'est
                  le repos du programme. Les deux sont des consignes, pas de la
                  décoration.
                */}
                {station > 0 && (
                  <div className={styles.tourChain}>
                    <span />
                    {rythme === 'enchaine' ? (
                      'ENCHAÎNE, SANS REPOS'
                    ) : (
                      <>
                        <Icon name="arrow-down" size="15px" />
                        {restLabel(circuit.restSec)}
                        <Icon name="arrow-down" size="15px" />
                      </>
                    )}
                    <span />
                  </div>
                )}
                <Station
                  ex={ex}
                  lettre={lettreStation(station)}
                  index={i}
                  overrides={overrides}
                  saved={serie(ex, i)}
                  timer={timer}
                  onSaveSet={onSaveSet}
                />
              </Fragment>
            ))}
          </div>
        );
      })}

      <div className={styles.supersetFiches}>{fiches}</div>
    </section>
  );
}

/**
 * Une station du tour : le nom du mouvement, puis sa ligne de série.
 *
 * Le nom est répété à chaque tour, et c'est voulu : au troisième tour, les
 * deux premiers ont défilé hors de l'écran, et « A » tout seul ne dit plus
 * lequel des deux mouvements on est en train de faire.
 *
 * Une station dont le mouvement a moins de séries que l'autre — un deload qui
 * n'allège qu'un des deux — n'affiche rien : il n'y a pas de série à saisir.
 */
function Station({
  ex,
  lettre,
  index,
  overrides,
  saved,
  timer,
  onSaveSet,
}: {
  ex: ResolvedExercise;
  /** A, B, C… — fournie par `lettreStation`, pas devinée ici. */
  lettre: string;
  index: number;
  overrides: Record<string, number>;
  saved: SetRow | null;
  timer: RestTimer;
  onSaveSet: (ex: ResolvedExercise, payload: SetPayload) => Promise<void>;
}) {
  if (index >= ex.sets) {
    return (
      <div className={styles.stationVide}>
        {lettre} · {ex.name} — pas de série à ce tour
      </div>
    );
  }

  return (
    <div className={styles.station}>
      {/*
        Le nom, et rien d'autre. Répéter « 3 × 8 — poids du corps » à chaque
        tour écrivait trois fois une prescription qui ne change pas, juste
        au-dessus du champ qui, lui, change. La fiche du mouvement est en bas
        du bloc, et le curseur de charge dit déjà ce qu'on porte.
      */}
      <div className={styles.stationNom}>
        <span className={styles.stationLettre}>{lettre}</span>
        {ex.name}
      </div>
      <SetEntry
        ex={ex}
        index={index}
        plannedKg={overrides[ex.id] ?? ex.load.kg}
        saved={saved}
        unite={null}
        lastInUnit={null}
        timer={timer}
        onSave={onSaveSet}
      />
    </div>
  );
}
