/**
 * Mon parcours — tous les cycles, et ce qu'ils ont donné.
 *
 * ── Ce qu'il montre ────────────────────────────────────────────────────────
 *
 * Trois sections : en cours, terminés, prévus. Pour chaque cycle, ce qui est
 * vrai et vérifiable — le programme, sa version, les dates, le nombre de
 * séances faites. Et pour un cycle terminé, le bilan : ce qui a bougé entre
 * le combine initial et le combine final.
 *
 * ── Ce qu'il ne montre pas ─────────────────────────────────────────────────
 *
 * Aucune statistique inventée, aucune projection, aucune comparaison entre
 * deux cycles. Le brief est explicite : pour la première version, un
 * historique FIABLE vaut mieux qu'une statistique impressionnante. Un cycle
 * qui n'a pas de combine final n'a pas de bilan, et l'écran le dit au lieu de
 * remplir le tableau avec ce qu'il a sous la main.
 *
 * ── Le bilan vient des combinés, pas des séances ───────────────────────────
 *
 * C'est la seule source comparable. Les charges d'entraînement varient avec
 * le bloc, la fatigue et le pourcentage du jour : y lire une progression
 * reviendrait à comparer une semaine de deload à une semaine de pic. Les
 * combinés, eux, sont mesurés dans les mêmes conditions, c'est leur raison
 * d'être.
 */

import { useEffect, useState, type CSSProperties } from 'react';
import { EnTetePlateforme } from '../components/EnTetePlateforme';
import { Icon } from '../components/Icon';
import { Visuel } from '../components/Visuel';
import { HABILLAGE } from '../data/famillesVisuel';
import { programmeParId } from '../data/catalogue';
import { EXERCISES } from '../data/exercises';
import { COMBINE_METRICS } from '../data/testSessions';
import type { CombineRow, CycleRow } from '../db/db';
import { activerCycle, combinesDuCycle, resumesDesCycles, supprimerCycleNonCommence, type ResumeCycle } from '../db/repo';
import { currentWeek, schedule } from '../engine/calendar';
import { modulePourCycle } from '../programmes/registre';
import { fr } from '../engine/format';
import { lowerIsBetter } from '../engine/lastPerformance';
import styles from './Screens.module.css';
import local from './Parcours.module.css';

interface Vue extends ResumeCycle {
  total: number;
  combines: CombineRow[];
  semaine: number | null;
  semaines: number;
}

/*
 * Les mesures qui n'ont PAS de bon sens en soi.
 *
 * Le poids de corps est le seul pour l'instant. Monter de 2 kg est une
 * réussite en prise de masse et un recul en sèche : l'application n'a aucun
 * moyen de trancher, et le colorier en vert parce que le nombre augmente
 * serait un jugement que la donnée ne porte pas. Le chiffre et l'écart
 * s'affichent ; la couleur, non.
 */
const SANS_JUGEMENT = new Set(['test-bodyweight']);

function jour(iso: string): string {
  if (iso === '') return '—';
  return new Date(`${iso}T12:00:00`).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  });
}

export function ParcoursScreen({
  onOuvrirProgramme,
  onDataChanged,
}: {
  onOuvrirProgramme: () => void;
  onDataChanged: () => void;
}) {
  const [vues, setVues] = useState<Vue[] | null>(null);
  const [bilanOuvert, setBilanOuvert] = useState<number | null>(null);
  const [suppressionEnCours, setSuppressionEnCours] = useState<number | null>(null);
  const [erreurSuppression, setErreurSuppression] = useState('');
  /**
   * Quelle des deux rubriques est ouverte, ou aucune.
   *
   * La maquette les montre fermées : l'écran doit tenir sur une hauteur
   * d'iPhone, et les cycles en cours — la raison pour laquelle on l'ouvre —
   * seraient sinon repoussés sous un historique qu'on consulte rarement.
   */
  const [rubrique, setRubrique] = useState<'bilans' | 'termines' | null>(null);

  useEffect(() => {
    let vivant = true;
    void (async () => {
      const resumes = await resumesDesCycles();
      const completes = await Promise.all(
        resumes.map(async (r) => ({
          ...r,
          total:
            r.cycle.startDate === ''
              ? 0
              : schedule(r.cycle.startDate, modulePourCycle(r.cycle.programmeId)).length,
          /*
           * La semaine où en est ce cycle, et le nombre qu'il en compte.
           * Calculés AVEC son propre programme : quatre semaines pour MASS 4,
           * douze pour POWER 12.
           */
          semaine:
            r.cycle.startDate === ''
              ? null
              : currentWeek(
                  r.cycle.startDate,
                  new Date().toISOString().slice(0, 10),
                  modulePourCycle(r.cycle.programmeId),
                ),
          semaines: modulePourCycle(r.cycle.programmeId).dureeSemaines,
          combines: r.cycle.id === undefined ? [] : await combinesDuCycle(r.cycle.id),
        })),
      );
      if (vivant) setVues(completes);
    })();
    return () => {
      vivant = false;
    };
  }, []);

  const enCours = (vues ?? []).filter((v) => v.cycle.statut === 'en-cours');
  const termines = (vues ?? []).filter((v) => v.cycle.statut === 'termine');
  const prevus = (vues ?? []).filter((v) => v.cycle.statut === 'prevu');
  /** Les cycles qui ont de quoi faire un bilan : au moins une mesure relevée. */
  const avecBilan = (vues ?? []).filter((v) => lignesDeBilan(v).length > 0);
  const totalFaites = (vues ?? []).reduce((n, v) => n + v.faites, 0);
  /*
   * « Progression du cycle » est celle du PREMIER cycle en cours, pas une
   * moyenne des cycles : une moyenne entre un cycle à 54 % et un cycle à 0 %
   * ne décrit aucun des deux.
   */
  const actif = enCours[0];
  const pourcentActif =
    actif === undefined || actif.total === 0 ? 0 : Math.round((actif.faites / actif.total) * 100);

  async function ouvrir(cycle: CycleRow) {
    if (cycle.id === undefined) return;
    await activerCycle(cycle.id);
    onDataChanged();
    onOuvrirProgramme();
  }

  async function supprimer(cycle: CycleRow) {
    if (cycle.id === undefined || suppressionEnCours !== null) return;
    const nom = programmeParId(cycle.programmeId)?.nom ?? cycle.programmeId;
    if (!window.confirm(`Supprimer « ${nom} » ?\\n\\nCette action est définitive. La suppression est refusée si des données sont enregistrées.`)) return;
    setSuppressionEnCours(cycle.id);
    setErreurSuppression('');
    try {
      const supprime = await supprimerCycleNonCommence(cycle.id);
      if (!supprime) {
        setErreurSuppression('Suppression refusée : ce programme contient des données ou ne peut pas être retiré sans perdre le cycle actif.');
        return;
      }
      setVues((prev) => prev?.filter((v) => v.cycle.id !== cycle.id) ?? null);
      onDataChanged();
    } catch {
      setErreurSuppression('Impossible de supprimer ce programme. Réessaie plus tard.');
    } finally {
      setSuppressionEnCours(null);
    }
  }

  return (
    <div className={styles.screen}>
      <EnTetePlateforme />

      <div className={local.titreEcran}>
        <h1 className={local.grandTitre}>
          <span className={local.barreTitre} aria-hidden="true" />
          Mon parcours
        </h1>
        <p className={local.sousTitreEcran}>Mes cycles, mes bilans, ma progression</p>
      </div>

      {vues === null && <p className={styles.hint}>Lecture de tes cycles…</p>}

      {vues !== null && vues.length === 0 && (
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Rien à montrer pour l’instant</h2>
          <p className={styles.cardSub}>
            Ton parcours se remplit tout seul : chaque programme commencé y laisse sa trace, et
            aucun n’en disparaît jamais.
          </p>
        </section>
      )}

      {vues !== null && vues.length > 0 && (
        <>
          {/* ------------------------------------------ cycles en cours -- */}
          <div className={local.enteteSection}>
            <h2 className={local.titreSection}>
              <span className={local.barreTitre} aria-hidden="true" />
              Cycles en cours
            </h2>
            <span className={local.compte}>
              {enCours.length} cycle{enCours.length > 1 ? 's' : ''}
            </span>
          </div>

          {enCours.length === 0 && <p className={styles.hint}>Aucun programme en cours.</p>}

          {enCours.map((v) => {
            const programme = programmeParId(v.cycle.programmeId);
            const habillage = programme === null ? null : HABILLAGE[programme.familleId];
            const pourcent = v.total === 0 ? 0 : Math.round((v.faites / v.total) * 100);
            return (
              <div key={v.cycle.id}>
              <button
                type="button"
                className={local.carteCycle}
                style={{ '--teinte': habillage?.teinte ?? 'var(--accent)' } as CSSProperties}
                onClick={() => void ouvrir(v.cycle)}
              >
                {habillage?.photo !== undefined && (
                  <span className={local.cyclePhoto} aria-hidden="true">
                    <Visuel nom={habillage.photo} sizes="100vw" />
                  </span>
                )}
                <span className={local.cycleVoile} aria-hidden="true" />
                <span className={local.cycleCorps}>
                  <span className={local.cycleNom}>{programme?.nom ?? v.cycle.programmeId}</span>
                  <span className={local.cycleSemaine}>
                    Semaine <b>{v.semaine ?? 0}</b> / {v.semaines}
                  </span>
                  <span className={local.jauge} aria-hidden="true">
                    <i style={{ width: `${pourcent}%` }} />
                  </span>
                  <span className={local.cycleChiffres}>
                    {v.total === 0
                      ? 'Date de début à poser.'
                      : `${v.faites} séance${v.faites > 1 ? 's' : ''} sur ${v.total} · ${pourcent} %`}
                  </span>
                </span>
                <span className={local.cycleChevron} aria-hidden="true">
                  <Icon name="arrow-right" size="18px" />
                </span>
              </button>
              {v.faites === 0 && (
                <button
                  type="button"
                  className={local.supprimerCycleEnCours}
                  disabled={suppressionEnCours !== null}
                  onClick={() => void supprimer(v.cycle)}
                >
                  {suppressionEnCours === v.cycle.id ? 'Suppression…' : 'Supprimer ce programme'}
                </button>
              )}
              </div>
            );
          })}

          {/* ------------------------------------------ les deux accès --- */}
          <button
            type="button"
            className={local.rubrique}
            onClick={() => setRubrique(rubrique === 'bilans' ? null : 'bilans')}
            aria-expanded={rubrique === 'bilans'}
          >
            <span className={local.rubriqueIcone} aria-hidden="true">
              <Icon name="chart" size="20px" />
            </span>
            <span className={local.rubriqueTexte}>
              <b>Mes bilans</b>
              <span>Mes résultats et mes évolutions</span>
            </span>
            <span className={local.rubriqueChevron} aria-hidden="true">
              <Icon name={rubrique === 'bilans' ? 'chevron-up' : 'arrow-right'} size="17px" />
            </span>
          </button>

          {rubrique === 'bilans' && (
            <div className={local.rubriqueCorps}>
              {avecBilan.length === 0 && (
                <p className={styles.hint}>
                  Aucun bilan pour l’instant : il se construit à partir des combinés, et aucun cycle
                  n’en a deux de renseignés.
                </p>
              )}
              {avecBilan.map((v) => bilanDuCycle(v, bilanOuvert, setBilanOuvert))}
            </div>
          )}

          <button
            type="button"
            className={local.rubrique}
            onClick={() => setRubrique(rubrique === 'termines' ? null : 'termines')}
            aria-expanded={rubrique === 'termines'}
          >
            <span className={local.rubriqueIcone} aria-hidden="true">
              <Icon name="calendar" size="20px" />
            </span>
            <span className={local.rubriqueTexte}>
              <b>Mes cycles terminés</b>
              <span>Historique de mes programmes</span>
            </span>
            <span className={local.rubriqueChevron} aria-hidden="true">
              <Icon name={rubrique === 'termines' ? 'chevron-up' : 'arrow-right'} size="17px" />
            </span>
          </button>

          {rubrique === 'termines' && (
            <div className={local.rubriqueCorps}>
              {termines.length === 0 && (
                <p className={styles.hint}>Aucun programme terminé pour l’instant.</p>
              )}
              {termines.map((v) => {
                const programme = programmeParId(v.cycle.programmeId);
                const pourcent = v.total === 0 ? 0 : Math.round((v.faites / v.total) * 100);
                return (
                  <article key={v.cycle.id} className={styles.card}>
                    <div className={local.entete}>
                      <h3 className={local.nom}>{programme?.nom ?? v.cycle.programmeId}</h3>
                      <span className={local.version}>version {v.cycle.programmeVersion}</span>
                    </div>
                    <p className={styles.cardSub}>
                      {jour(v.cycle.startDate)}
                      {v.cycle.endedAt !== '' && ` → ${jour(v.cycle.endedAt)}`} · {v.faites} séance
                      {v.faites > 1 ? 's' : ''} sur {v.total} · {pourcent} %
                    </p>
                  </article>
                );
              })}
              {erreurSuppression && <p role="alert" className={styles.hint}>{erreurSuppression}</p>}
              {prevus.length > 0 && (
                <>
                  <h3 className={styles.sectionTitle}>Prévus</h3>
                  {prevus.map((v) => (
                    <article key={v.cycle.id} className={styles.card}>
                      <div className={local.entete}>
                        <h3 className={local.nom}>
                          {programmeParId(v.cycle.programmeId)?.nom ?? v.cycle.programmeId}
                        </h3>
                      </div>
                      <p className={styles.cardSub}>Départ prévu le {jour(v.cycle.startDate)}</p>
                      <button
                        type="button"
                        className={local.ouvrir}
                        onClick={() => void ouvrir(v.cycle)}
                      >
                        Ouvrir ce cycle
                      </button>
                      <button
                        type="button"
                        className={local.supprimerCycle}
                        disabled={suppressionEnCours !== null}
                        onClick={() => void supprimer(v.cycle)}
                      >
                        {suppressionEnCours === v.cycle.id ? 'Suppression…' : 'Supprimer ce programme'}
                      </button>
                    </article>
                  ))}
                </>
              )}
            </div>
          )}

          {/* ---------------------------------------------- progression -- */}
          <div className={local.enteteSection}>
            <h2 className={local.titreSection}>
              <span className={local.barreTitre} aria-hidden="true" />
              Ma progression
            </h2>
          </div>

          {/*
            Trois chiffres, tous lus dans les données réelles. Aucun n'est une
            projection : « progression du cycle » est le pourcentage du cycle
            actif, pas une estimation de forme.
          */}
          <div className={local.tuiles}>
            <div className={local.tuile}>
              <span className={local.tuileIcone} aria-hidden="true">
                <Icon name="check" size="22px" />
              </span>
              <span className={local.tuileValeur}>{totalFaites}</span>
              <span className={local.tuileLibelle}>
                Séances
                <br />
                réalisées
              </span>
            </div>
            <div className={local.tuile}>
              <span className={local.tuileIcone} aria-hidden="true">
                <Icon name="chart" size="22px" />
              </span>
              <span className={local.tuileValeur}>{pourcentActif} %</span>
              <span className={local.tuileLibelle}>
                Progression
                <br />
                du cycle
              </span>
            </div>
            <div className={local.tuile}>
              <span className={local.tuileIcone} aria-hidden="true">
                <Icon name="repeat" size="22px" />
              </span>
              <span className={local.tuileValeur}>{enCours.length}</span>
              <span className={local.tuileLibelle}>
                Cycles
                <br />
                en cours
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/** Les mesures comparables d'un cycle : celles qui ont au moins un relevé. */
function lignesDeBilan(v: Vue): Array<{ id: string; i?: number | null; f?: number | null }> {
  const initial = v.combines.find((c) => c.phase === 'initial')?.metrics ?? {};
  const final = v.combines.find((c) => c.phase === 'final')?.metrics ?? {};
  return COMBINE_METRICS.map((id) => ({ id, i: initial[id], f: final[id] })).filter(
    (l) => typeof l.i === 'number' || typeof l.f === 'number',
  );
}

/**
 * Le bilan d'un cycle : le tableau initial / final / écart.
 *
 * Sorti du composant parce qu'il est désormais rendu depuis la rubrique
 * « Mes bilans » et non plus au fil des sections. La logique n'a pas changé —
 * mêmes mesures, même règle de couleur, même traitement du poids de corps.
 */
function bilanDuCycle(v: Vue, ouvertId: number | null, setOuvert: (id: number | null) => void) {
  const programme = programmeParId(v.cycle.programmeId);
  const ouvert = ouvertId === v.cycle.id;
  const lignes = lignesDeBilan(v);

  return (
    <article key={v.cycle.id} className={styles.card}>
      <div className={local.entete}>
        <h3 className={local.nom}>{programme?.nom ?? v.cycle.programmeId}</h3>
        <span className={local.version}>version {v.cycle.programmeVersion}</span>
      </div>
      <p className={styles.cardSub}>
        {jour(v.cycle.startDate)}
        {v.cycle.endedAt !== '' && ` → ${jour(v.cycle.endedAt)}`}
      </p>

      <button
        type="button"
        className={local.secondaire}
        onClick={() => setOuvert(ouvert ? null : (v.cycle.id ?? null))}
        aria-expanded={ouvert}
      >
        {ouvert ? 'Masquer le bilan' : 'Voir le bilan'}
      </button>

      {ouvert && (
        <table className={local.bilan}>
          <thead>
            <tr>
              <th scope="col">Mouvement</th>
              <th scope="col">Initial</th>
              <th scope="col">Final</th>
              <th scope="col">Écart</th>
            </tr>
          </thead>
          <tbody>
            {lignes.map(({ id, i, f }) => {
              const chiffre = typeof i === 'number' && typeof f === 'number';
              const mieux =
                chiffre && !SANS_JUGEMENT.has(id) ? (lowerIsBetter(id) ? f! < i! : f! > i!) : null;
              /*
               * L'écart garde le SIGNE du nombre, pas celui du jugement : un
               * sprint qui passe de 1,86 à 1,80 s'écrit −3 %, et c'est la
               * couleur qui dit que c'est une progression.
               */
              const ecart = chiffre && i !== 0 ? Math.round(((f! - i!) / i!) * 1000) / 10 : null;
              return (
                <tr key={id}>
                  <td>{EXERCISES[id]?.name ?? id}</td>
                  <td>{typeof i === 'number' ? fr(i) : '—'}</td>
                  <td>{typeof f === 'number' ? fr(f) : '—'}</td>
                  <td className={mieux === null ? '' : mieux ? local.mieux : local.moins}>
                    {ecart === null ? '—' : `${ecart > 0 ? '+' : ''}${fr(ecart)} %`}
                    {mieux !== null && (
                      <span className="visually-hidden">
                        {mieux ? ' — progression' : ' — recul'}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </article>
  );
}
