import type { ReactNode } from 'react';
import type { SetRow } from '../db/db';
import type { ResolvedExercise } from '../engine/getSession';
import {
  avancement,
  consigneRythme,
  titreRythme,
  tourActif,
  travailCourt,
  type Paire,
} from '../engine/superset';
import { restLabel } from '../engine/format';
import type { RestTimer } from '../state/useRestTimer';
import { SetEntry, type SetPayload } from './ExerciseCard';
import styles from '../screens/Session.module.css';

/**
 * Deux mouvements menés ensemble, dans un seul encadré.
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
  paire,
  savedSets,
  overrides,
  timer,
  onSaveSet,
  fiches,
}: {
  paire: Paire;
  savedSets: Record<string, SetRow[]>;
  overrides: Record<string, number>;
  timer: RestTimer;
  onSaveSet: (ex: ResolvedExercise, payload: SetPayload) => Promise<void>;
  /**
   * Les deux fiches d'exercice, rendues sous les tours.
   *
   * Passées en `ReactNode` plutôt que construites ici : elles portent la
   * remarque, le suivi de douleur, le remplacement et les consignes, c'est-à-
   * dire tout ce que `ExerciseCard` sait déjà faire. Les recopier aurait
   * fabriqué une deuxième carte d'exercice à maintenir en parallèle.
   */
  fiches: ReactNode;
}) {
  const { a, b, tours, rythme } = paire;

  const serie = (ex: ResolvedExercise, i: number) =>
    (savedSets[ex.id] ?? []).find((s) => s.setIndex === i) ?? null;
  const tourFait = (i: number) => serie(a, i) !== null && serie(b, i) !== null;
  const actif = tourActif(tours, tourFait);
  const { faites, total } = avancement(paire, (ex) => (savedSets[ex.id] ?? []).length);
  const fini = faites >= total;

  return (
    <section
      className={`${styles.superset} ${fini ? styles.supersetDone : ''}`}
      aria-label={`${titreRythme(rythme)} : ${a.name} et ${b.name}`}
    >
      <div className={styles.supersetHead}>
        <span className={styles.supersetBadge}>{titreRythme(rythme).toUpperCase()}</span>
        <h3 className={styles.supersetTitle}>
          {a.name} <span className={styles.supersetPlus}>+</span> {b.name}
        </h3>
        <div className={`${styles.supersetFormat} tnum`}>
          {tours} tour{tours > 1 ? 's' : ''} · {travailCourt(a.work)} et {travailCourt(b.work)}
        </div>
        <p className={styles.supersetConsigne}>{consigneRythme(paire)}</p>
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
              {tourFait(i) && <span className={styles.tourFlag}>✓ fait</span>}
            </div>

            <Station
              ex={a}
              lettre="A"
              index={i}
              overrides={overrides}
              saved={serie(a, i)}
              timer={timer}
              onSaveSet={onSaveSet}
            />

            {/*
              Ce qui sépare les deux stations, dit en toutes lettres. Sur un
              enchaînement, c'est « aucun repos » ; sur une alternance, c'est le
              repos du programme. Les deux sont des consignes, pas de la
              décoration.
            */}
            <div className={styles.tourChain}>
              <span />
              {rythme === 'enchaine' ? 'ENCHAÎNE, SANS REPOS' : `↓ ${restLabel(paire.restSec)} ↓`}
              <span />
            </div>

            <Station
              ex={b}
              lettre="B"
              index={i}
              overrides={overrides}
              saved={serie(b, i)}
              timer={timer}
              onSaveSet={onSaveSet}
            />
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
  lettre: 'A' | 'B';
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
