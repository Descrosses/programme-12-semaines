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

import { useEffect, useState } from 'react';
import { ScreenHeader } from '../components/ScreenHeader';
import { programmeParId } from '../data/catalogue';
import { EXERCISES } from '../data/exercises';
import { COMBINE_METRICS } from '../data/testSessions';
import type { CombineRow, CycleRow } from '../db/db';
import { activerCycle, combinesDuCycle, resumesDesCycles, type ResumeCycle } from '../db/repo';
import { schedule } from '../engine/calendar';
import { modulePourCycle } from '../programmes/registre';
import { fr } from '../engine/format';
import { lowerIsBetter } from '../engine/lastPerformance';
import styles from './Screens.module.css';
import local from './Parcours.module.css';

interface Vue extends ResumeCycle {
  total: number;
  combines: CombineRow[];
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

const SECTIONS: Array<{ cle: CycleRow['statut']; titre: string; vide: string }> = [
  { cle: 'en-cours', titre: 'En cours', vide: 'Aucun programme en cours.' },
  { cle: 'termine', titre: 'Terminés', vide: 'Aucun programme terminé pour l’instant.' },
  { cle: 'prevu', titre: 'Prévus', vide: 'Aucun programme planifié.' },
];

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
          combines: r.cycle.id === undefined ? [] : await combinesDuCycle(r.cycle.id),
        })),
      );
      if (vivant) setVues(completes);
    })();
    return () => {
      vivant = false;
    };
  }, []);

  async function ouvrir(cycle: CycleRow) {
    if (cycle.id === undefined) return;
    await activerCycle(cycle.id);
    onDataChanged();
    onOuvrirProgramme();
  }

  return (
    <div className={styles.screen}>
      <ScreenHeader
        eyebrow="Plan d’ensemble"
        title="Mon parcours"
        subtitle="Tes cycles, du premier au dernier"
        visuel="sprint"
        compact
      />

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

      {vues !== null &&
        vues.length > 0 &&
        SECTIONS.map((section) => {
          const dedans = vues.filter((v) => v.cycle.statut === section.cle);
          return (
            <section key={section.cle}>
              <h2 className={styles.sectionTitle}>
                {section.titre}
                <span className={local.compte}> {dedans.length}</span>
              </h2>

              {dedans.length === 0 && <p className={styles.hint}>{section.vide}</p>}

              {dedans.map((v) => {
                const programme = programmeParId(v.cycle.programmeId);
                const pourcent = v.total === 0 ? 0 : Math.round((v.faites / v.total) * 100);
                const ouvert = bilanOuvert === v.cycle.id;
                const initial = v.combines.find((c) => c.phase === 'initial')?.metrics ?? {};
                const final = v.combines.find((c) => c.phase === 'final')?.metrics ?? {};
                const lignes = COMBINE_METRICS.map((id) => ({
                  id,
                  i: initial[id],
                  f: final[id],
                })).filter((l) => typeof l.i === 'number' || typeof l.f === 'number');

                return (
                  <article key={v.cycle.id} className={styles.card}>
                    <div className={local.entete}>
                      <h3 className={local.nom}>{programme?.nom ?? v.cycle.programmeId}</h3>
                      <span className={local.version}>version {v.cycle.programmeVersion}</span>
                    </div>

                    <p className={styles.cardSub}>
                      {programme?.dureeSemaines ?? '—'} semaines · {jour(v.cycle.startDate)}
                      {v.cycle.endedAt !== '' && ` → ${jour(v.cycle.endedAt)}`}
                    </p>

                    {v.total > 0 && (
                      <>
                        <div className={local.jauge} aria-hidden="true">
                          <i style={{ width: `${pourcent}%` }} />
                        </div>
                        <p className={local.chiffres}>
                          {v.faites} séance{v.faites > 1 ? 's' : ''} sur {v.total} · {pourcent} % de
                          complétion
                        </p>
                      </>
                    )}

                    {v.total === 0 && <p className={local.chiffres}>Date de début à poser.</p>}

                    <div className={local.actions}>
                      {section.cle !== 'termine' && (
                        <button
                          type="button"
                          className={local.ouvrir}
                          onClick={() => void ouvrir(v.cycle)}
                        >
                          Ouvrir ce cycle
                        </button>
                      )}

                      {lignes.length > 0 && (
                        <button
                          type="button"
                          className={local.secondaire}
                          onClick={() => setBilanOuvert(ouvert ? null : (v.cycle.id ?? null))}
                          aria-expanded={ouvert}
                        >
                          {ouvert ? 'Masquer le bilan' : 'Voir le bilan'}
                        </button>
                      )}
                    </div>

                    {lignes.length === 0 && (
                      <p className={local.sansBilan}>
                        Pas encore de bilan : il se construit à partir des combinés, et celui-ci
                        n’en a aucun de renseigné.
                      </p>
                    )}

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
                              chiffre && !SANS_JUGEMENT.has(id)
                                ? lowerIsBetter(id)
                                  ? f < i
                                  : f > i
                                : null;
                            /*
                             * L'écart garde le SIGNE du nombre, pas celui du
                             * jugement : un sprint qui passe de 1,86 à 1,80
                             * s'écrit −3 %, et c'est la couleur qui dit que
                             * c'est une progression. Écrire +3 % contredirait
                             * les deux chiffres de la même ligne.
                             */
                            const ecart =
                              chiffre && i !== 0 ? Math.round(((f - i) / i) * 1000) / 10 : null;
                            return (
                              <tr key={id}>
                                <td>{EXERCISES[id]?.name ?? id}</td>
                                <td>{typeof i === 'number' ? fr(i) : '—'}</td>
                                <td>{typeof f === 'number' ? fr(f) : '—'}</td>
                                <td
                                  className={
                                    mieux === null ? '' : mieux ? local.mieux : local.moins
                                  }
                                >
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
              })}
            </section>
          );
        })}
    </div>
  );
}
