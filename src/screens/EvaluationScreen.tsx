/**
 * Le combiné d'évaluation de MASS FORCE (lot 3).
 *
 * ── Ce que l'écran fait ───────────────────────────────────────────────────
 *
 * Quatre tests — développé couché, tirage vertical, squat, push press. Pour
 * chacun : le matériel (liste fermée), la modalité (test direct du 1RM, ou
 * série sous-maximale), la charge, les répétitions, la date. « Enregistrer »
 * AJOUTE une référence datée ; rien n'est jamais remplacé.
 *
 * ── Ce qu'il ne fait PAS, volontairement ──────────────────────────────────
 *
 * - Aucune estimation de 1RM à partir d'une série sous-maximale : aucune
 *   formule n'est validée (décision de Guillaume). Seules la charge et les
 *   répétitions sont gardées, et l'écran le dit.
 * - Aucun protocole ni critère d'éligibilité : ils ne sont pas validés non
 *   plus. Le test direct porte la phrase de Guillaume, rien de plus.
 * - Aucune conversion de matériel : une référence à la barre ne dit rien de
 *   la Smith, et l'écran le dit au lieu de transposer.
 *
 * Mise en page : les briques de l'écran de séance (`Session.module.css`,
 * `Stepper`), pour que le combiné se lise comme le reste de l'app.
 */

import { useEffect, useState } from 'react';
import { Icon } from '../components/Icon';
import { Stepper } from '../components/Stepper';
import { Visuel } from '../components/Visuel';
import { HABILLAGE } from '../data/famillesVisuel';
import {
  COMBINE_MASS_FORCE,
  VARIANTES,
  estVariante,
  type TestCombine,
  type Variante,
} from '../data/combineMass';
import type { ReferenceForceRow } from '../db/db';
import { ajouterReference, toutesLesReferences } from '../db/references';
import { cycleActif } from '../db/repo';
import { humanDateShort } from '../engine/calendar';
import { fr } from '../engine/format';
import { etatReference, historiqueReferences } from '../engine/references';
import styles from './Session.module.css';
import local from './Evaluation.module.css';

const nomVariante = (v: string) => (estVariante(v) ? VARIANTES[v] : v);
const aujourdhui = () => new Date().toISOString().slice(0, 10);

/** « 100 kg × 1 — test direct » ou « 70 kg × 6 — sous-maximal, donnée brute ». */
function resumeReference(r: ReferenceForceRow): string {
  return r.modalite === 'direct'
    ? `${fr(r.chargeKg)} kg — test direct (1RM)`
    : `${fr(r.chargeKg)} kg × ${r.reps} — sous-maximal, donnée brute`;
}

/**
 * `onRetour` absent : l'écran est l'onglet « Combiné » d'un cycle MASS FORCE,
 * sans bouton retour (la barre du bas en tient lieu), et chaque test est
 * rattaché au cycle en cours.
 */
export function EvaluationScreen({ onRetour }: { onRetour?: () => void }) {
  const dansCycle = onRetour === undefined;
  const [lignes, setLignes] = useState<ReferenceForceRow[] | null>(null);
  const relire = async () => setLignes(await toutesLesReferences());

  useEffect(() => {
    void relire();
  }, []);

  return (
    <div className={styles.screen}>
      <header className={`${styles.header} ${local.entete}`}>
        {dansCycle && HABILLAGE.mass.entetes !== undefined && (
          <Visuel
            nom={HABILLAGE.mass.entetes.combine}
            className={`${styles.enteteFond} ${local.photo}`}
            sizes="100vw"
            prioritaire
          />
        )}
        {onRetour !== undefined && (
          <button type="button" className={`${styles.back} ${local.retour}`} onClick={onRetour}>
            <Icon name="arrow-left" size="18px" />
            MASS
          </button>
        )}
        {/* Le programme dont on passe le combiné. Dans le cycle, la navigation
            se fait par les onglets : c'est une étiquette, pas un bouton. */}
        {dansCycle && <p className={local.surtitre}>MASS FORCE</p>}
        <h1 className={`${styles.title} ${local.titre}`}>Combiné d’évaluation</h1>
        <span className={`${styles.titleRule} ${local.trait}`} aria-hidden="true" />
        <p className={`${styles.note} ${local.encadre}`}>
          <Icon name="haltere" size="26px" />
          <span>
            Quatre tests avant MASS FORCE. Pour chacun : le matériel utilisé, puis un test direct du
            1RM ou une série sous-maximale.
          </span>
        </p>
        {!dansCycle ? (
          <p className={`${styles.note} ${local.encadre}`}>
            <Icon name="calendar" size="24px" />
            <span>
              MASS FORCE n’est pas encore disponible. Ces tests restent enregistrés et datés : ils
              serviront de référence.
            </span>
          </p>
        ) : (
          <p className={`${styles.note} ${local.encadre}`}>
            <Icon name="calendar" size="24px" />
            <span>
              Les séances s’ouvrent quand chaque mouvement évalué a une référence avec le matériel
              choisi pour ce cycle.
            </span>
          </p>
        )}
        <p className={`${styles.note} ${local.encadre}`}>
          <Icon name="chart" size="24px" />
          <span>
            Une série sous-maximale ne donne lieu à aucune estimation : la méthode n’est pas encore
            validée. Seules la charge et les répétitions sont gardées.
          </span>
        </p>
      </header>

      {lignes === null
        ? null
        : COMBINE_MASS_FORCE.map((t, i) => (
            <CarteTest
              key={t.exercice}
              test={t}
              rang={i}
              lignes={lignes}
              dansCycle={dansCycle}
              onEnregistre={relire}
            />
          ))}
    </div>
  );
}

function CarteTest({
  test,
  rang,
  lignes,
  dansCycle,
  onEnregistre,
}: {
  test: TestCombine;
  rang: number;
  lignes: readonly ReferenceForceRow[];
  dansCycle: boolean;
  onEnregistre: () => Promise<void>;
}) {
  const historique = historiqueReferences(lignes, test.exercice);
  /* Le matériel de la dernière évaluation, sinon le premier proposé. */
  const dernier = historique[0]?.variante;
  const [variante, setVariante] = useState<Variante>(
    dernier !== undefined && estVariante(dernier) && test.variantes.includes(dernier)
      ? dernier
      : test.variantes[0]!,
  );
  const [modalite, setModalite] = useState<ReferenceForceRow['modalite']>('sous-maximal');
  const [charge, setCharge] = useState<number | null>(null);
  const [reps, setReps] = useState<number | null>(null);
  const [date, setDate] = useState(aujourdhui());
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [historiqueOuvert, setHistoriqueOuvert] = useState(false);

  const etat = etatReference(lignes, test.exercice, variante);
  const repsEffectives = modalite === 'direct' ? 1 : reps;
  const pret = charge !== null && charge > 0 && repsEffectives !== null && repsEffectives >= 1;

  async function enregistrer() {
    if (!pret || envoi) return;
    setEnvoi(true);
    setErreur(null);
    try {
      await ajouterReference({
        exercice: test.exercice,
        variante,
        modalite,
        chargeKg: charge!,
        reps: repsEffectives!,
        date,
        programmeId: 'mass-force',
        cycleId: dansCycle ? ((await cycleActif())?.id ?? null) : null,
        note: '',
      });
      setCharge(null);
      setReps(null);
      await onEnregistre();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : 'Enregistrement impossible.');
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <article
      className={`${styles.exercise} ${local.carte}`}
      aria-label={`Test ${rang + 1} : ${test.nom}`}
    >
      <div className={styles.exHead}>
        <p className={`${styles.exRepere} ${local.repere}`}>Test {rang + 1}</p>
        <div className={`${styles.exName} ${local.nom}`}>{test.nom}</div>

        {/* Ce que l'on sait déjà, pour CE matériel. */}
        <p className={local.etat} role="status">
          {etat.kind === 'courante' && (
            <>
              Référence en cours : <b>{resumeReference(etat.reference)}</b>, le{' '}
              {humanDateShort(etat.reference.date)}.
            </>
          )}
          {etat.kind === 'autre-materiel' && (
            <>
              Évalué avec : {etat.variantes.map(nomVariante).join(', ')} — jamais avec{' '}
              {nomVariante(variante)}. <b>Une nouvelle évaluation est recommandée</b> : aucune
              charge n’est transposée d’un matériel à l’autre.
            </>
          )}
          {etat.kind === 'aucune' && <>Jamais évalué.</>}
        </p>
      </div>

      <p className={local.legende}>Matériel</p>
      <div className={styles.tiroirs} role="group" aria-label={`Matériel — ${test.nom}`}>
        {test.variantes.map((v) => (
          <button
            key={v}
            type="button"
            className={`${styles.tiroir} ${local.option} ${variante === v ? local.choisi : ''}`}
            onClick={() => setVariante(v)}
            aria-pressed={variante === v}
          >
            {VARIANTES[v]}
          </button>
        ))}
      </div>

      <p className={local.legende}>Modalité</p>
      <div className={styles.tiroirs} role="group" aria-label={`Modalité — ${test.nom}`}>
        <button
          type="button"
          className={`${styles.tiroir} ${local.option} ${modalite === 'sous-maximal' ? local.choisi : ''}`}
          onClick={() => setModalite('sous-maximal')}
          aria-pressed={modalite === 'sous-maximal'}
        >
          Sous-maximal
        </button>
        <button
          type="button"
          className={`${styles.tiroir} ${local.option} ${modalite === 'direct' ? local.choisi : ''}`}
          onClick={() => setModalite('direct')}
          aria-pressed={modalite === 'direct'}
        >
          Test direct (1RM)
        </button>
      </div>
      {modalite === 'direct' && (
        /* Les mots de Guillaume, sans critère ajouté : aucun n'est validé. */
        <p className={local.avertissement}>
          Test direct du 1RM : pour les pratiquants expérimentés, dans des conditions appropriées.
        </p>
      )}

      <div className={styles.setRow}>
        <div className={`${styles.setIndex} ${local.rang}`}>{rang + 1}</div>
        <div className={styles.fields}>
          <div
            className={`${styles.steppersLigne} ${local.steppers}`}
            style={{ gridTemplateColumns: `repeat(${modalite === 'direct' ? 1 : 2}, auto)` }}
          >
            <Stepper
              compact
              label="Charge kg"
              value={charge}
              step={2.5}
              min={0}
              max={400}
              onStep={(d) => setCharge((v) => Math.min(400, Math.max(0, (v ?? 0) + d)))}
              onCommit={(v) => setCharge(v)}
            />
            {modalite === 'sous-maximal' && (
              <Stepper
                compact
                label="Reps"
                value={reps}
                step={1}
                min={1}
                max={30}
                onStep={(d) => setReps((v) => Math.min(30, Math.max(1, (v ?? 0) + d)))}
                onCommit={(v) => setReps(v)}
              />
            )}
          </div>
          <label className={local.date}>
            Date du test
            <span className={local.champDate}>
              <Icon name="calendar" size="22px" />
              <input
                type="date"
                value={date}
                max={aujourdhui()}
                onChange={(e) => setDate(e.target.value)}
              />
            </span>
          </label>
          <button
            type="button"
            className={`${styles.validate} ${local.valider}`}
            onClick={() => void enregistrer()}
            disabled={!pret || envoi}
          >
            Enregistrer le test
          </button>
          {erreur !== null && <p className={local.erreur}>{erreur}</p>}
        </div>
      </div>

      {historique.length > 0 && (
        <>
          <div className={styles.tiroirs}>
            <button
              type="button"
              className={`${styles.tiroir} ${historiqueOuvert ? styles.tiroirOuvert : ''}`}
              onClick={() => setHistoriqueOuvert((o) => !o)}
              aria-expanded={historiqueOuvert}
            >
              Historique ({historique.length})
            </button>
          </div>
          {historiqueOuvert && (
            <ul className={local.historique}>
              {historique.map((r) => (
                <li key={r.id}>
                  <span className={local.histDate}>{humanDateShort(r.date)}</span>
                  <span>
                    {nomVariante(r.variante)} · {resumeReference(r)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </article>
  );
}
