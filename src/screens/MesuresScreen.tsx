/**
 * Mesures — l'onglet de MASS 4 qui remplace le combine de POWER 12.
 *
 * ── Pourquoi un autre écran, et pas le combine avec moins de lignes ───────
 *
 * Le combine de POWER 12 relève onze mesures : quatre 1RM, deux sprints, un
 * broad jump, un lancer, et le reste. Il affiche l'écart deadlift–squat, les
 * paliers du §9, et il réclame « un deadlift et un squat 1RM » pour calculer
 * quoi que ce soit.
 *
 * MASS 4 ne contient ni squat barre, ni deadlift, ni développé couché, et ne
 * prescrit aucun kilo. Un cycle MASS ouvrant cet écran ne voyait donc pas un
 * combine incomplet : il voyait un écran qui lui posait des questions sans
 * rapport avec son programme, et qui affichait les maximums d'un autre.
 *
 * Ce que MASS mesure tient en une phrase de son document — poids de corps et
 * tour de bras, en semaine 1 et en semaine 4 — et c'est exactement ce que cet
 * écran demande.
 *
 * ── Là où les deux écrans se ressemblent, et pourquoi c'est voulu ─────────
 *
 * La comparaison début/fin, le sélecteur de relevé, le stepper : la mise en
 * page est celle du combine, parce que c'est la même tâche — figer une mesure
 * pour la comparer plus tard — et qu'un second vocabulaire visuel pour la
 * même tâche n'aurait servi personne.
 */

import { useEffect, useState } from 'react';
import { ScreenHeader } from '../components/ScreenHeader';
import { Stepper, stepValue } from '../components/Stepper';
import { fr } from '../engine/format';
import { allCombines, getSettingsRow, saveCombine } from '../db/repo';
import type { CombinePhase, CombineRow } from '../db/db';
import { DEFINITIONS_MESURES, RELEVES_MASS4 } from '../programmes/mass4/mesures';
import styles from './Screens.module.css';

export function MesuresScreen() {
  const [rows, setRows] = useState<CombineRow[] | null>(null);
  const [releve, setReleve] = useState<CombinePhase>('initial');
  const [brouillon, setBrouillon] = useState<Record<string, number | null>>({});
  /** Le poids des Réglages : il se relève à la maison, pas en salle. */
  const [poidsReglages, setPoidsReglages] = useState<number | null>(null);
  const [enregistre, setEnregistre] = useState(false);

  useEffect(() => {
    void (async () => {
      setRows(await allCombines());
      setPoidsReglages((await getSettingsRow()).bodyweightKg);
    })();
  }, []);

  useEffect(() => {
    if (rows === null) return;
    setBrouillon(rows.find((r) => r.phase === releve)?.metrics ?? {});
    setEnregistre(false);
  }, [rows, releve]);

  if (rows === null) return <div className={styles.loading}>Chargement…</div>;

  const duReleve = (p: CombinePhase): Record<string, number | null> =>
    rows.find((r) => r.phase === p)?.metrics ?? {};

  async function enregistrer() {
    await saveCombine(releve, {
      metrics: brouillon,
      date: new Date().toISOString().slice(0, 10),
    });
    setRows(await allCombines());
    setEnregistre(true);
  }

  return (
    <div className={styles.screen}>
      <ScreenHeader eyebrow="MASS 4" title="Mesures" subtitle="Semaine 1 et semaine 4" />

      <p className={styles.lead}>
        Poids de corps et tour de bras, au début et à la fin du cycle. Mêmes conditions les deux
        fois, sinon la comparaison ne veut rien dire.
      </p>

      <div className={styles.weeks} role="group" aria-label="Relevé">
        {RELEVES_MASS4.map((r) => (
          <button
            key={r.id}
            type="button"
            className={`${styles.week} ${releve === r.id ? styles.weekOn : ''}`}
            style={{ width: 'auto', padding: '0 14px' }}
            onClick={() => setReleve(r.id)}
            aria-pressed={releve === r.id}
          >
            <span className={styles.weekNum} style={{ fontSize: '1rem' }}>
              {r.label}
            </span>
            <span className={styles.weekTag}>{r.quand}</span>
          </button>
        ))}
      </div>

      {/* --- Ce qui a bougé entre les deux relevés ------------------------- */}
      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Comparaison</h2>
        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Mesure</th>
                <th>S1</th>
                <th>S4</th>
              </tr>
            </thead>
            <tbody>
              {DEFINITIONS_MESURES.map((m) => {
                const debut = duReleve('initial')[m.id];
                const fin = duReleve('final')[m.id];
                /*
                 * Le tour de bras qui monte est une bonne nouvelle. Le poids
                 * de corps qui monte dépend de l'objectif, et l'écran n'a pas
                 * à en juger : il reste donc sans couleur.
                 */
                const juge = m.id === 'test-arm-cm';
                const monte =
                  typeof debut === 'number' && typeof fin === 'number' && fin !== debut
                    ? fin > debut
                    : null;
                return (
                  <tr key={m.id}>
                    <td>{m.nom}</td>
                    <td>{valeur(debut)}</td>
                    <td
                      className={
                        !juge || monte === null ? '' : monte ? styles.deltaUp : styles.deltaDown
                      }
                    >
                      {valeur(fin)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* --- La saisie du relevé choisi ------------------------------------ */}
      <h2 className={styles.sectionTitle}>
        Saisie — {RELEVES_MASS4.find((r) => r.id === releve)?.label.toLowerCase()} de cycle
      </h2>

      {DEFINITIONS_MESURES.map((m) => {
        const v = brouillon[m.id] ?? null;
        return (
          <section key={m.id} className={styles.card}>
            <h3 className={styles.cardTitle}>{m.nom}</h3>
            <p className={styles.cardSub}>{m.consigne}</p>
            <div className={styles.field}>
              <Stepper
                label={m.nom}
                value={v}
                step={m.pas}
                min={m.min}
                max={m.max}
                unit={m.unite}
                tone="accent"
                emptyLabel="à relever"
                onStep={(d) =>
                  setBrouillon((prev) => ({
                    ...prev,
                    [m.id]: stepValue(prev[m.id] ?? null, d, m.min, m.max),
                  }))
                }
                onCommit={(val) => setBrouillon((prev) => ({ ...prev, [m.id]: val }))}
              />
            </div>
            {m.id === 'test-bodyweight' && poidsReglages !== null && v !== poidsReglages && (
              <button
                type="button"
                className={styles.secondary}
                style={{ width: '100%' }}
                onClick={() =>
                  setBrouillon((prev) => ({ ...prev, 'test-bodyweight': poidsReglages }))
                }
              >
                Reprendre {fr(poidsReglages)} kg des Réglages
              </button>
            )}
          </section>
        );
      })}

      <button type="button" className={styles.primary} onClick={() => void enregistrer()}>
        Enregistrer le relevé
      </button>
      {enregistre && <p className={styles.hint}>Relevé enregistré.</p>}
    </div>
  );
}

/** La valeur, ou « — » quand rien n'a été relevé. On n'affiche pas un zéro. */
function valeur(v: number | null | undefined): string {
  return typeof v === 'number' ? fr(v) : '—';
}
