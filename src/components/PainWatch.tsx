/**
 * Suivi de douleur, exercice par exercice (§14).
 *
 * ── Ce que ce bloc n'est pas ───────────────────────────────────────────────
 *
 * Ce n'est pas un dossier médical et ça ne pose aucun diagnostic. Il
 * enregistre trois chiffres, une charge et une amplitude — ce que Guillaume
 * ressent et ce qu'il a réellement toléré. Rien n'en est déduit
 * automatiquement : aucune règle de l'application ne lit ces notes pour
 * changer une charge. C'est une matière à regarder, pas un pilote.
 *
 * ── Pourquoi trois moments et pas un ───────────────────────────────────────
 *
 * Une gêne qui disparaît en sortant de la salle ne dit pas la même chose
 * qu'une gêne qu'on retrouve au réveil. C'est précisément l'écart entre les
 * trois qui renseigne, et une note unique l'effacerait.
 *
 * Le champ « le lendemain » ne peut évidemment pas se remplir pendant la
 * séance : il se remplit en rouvrant la séance de la veille, depuis l'onglet
 * Semaine. Le bloc le dit lui-même plutôt que de laisser un champ vide sans
 * explication.
 */

import { useEffect, useState } from 'react';
import type { PainLogRow } from '../db/db';
import { painLogFor, savePain } from '../db/repo';
import { fr } from '../engine/format';
import { Stepper, stepValue } from './Stepper';
import styles from './PainWatch.module.css';

const AMPLITUDES = [
  { cle: 'complete', label: 'Complète' },
  { cle: 'partielle', label: 'Partielle' },
  { cle: 'reduite', label: 'Réduite' },
] as const;

type Rom = (typeof AMPLITUDES)[number]['cle'];

export function PainWatch({
  exerciseId,
  consigne,
  date,
}: {
  exerciseId: string;
  /** Le texte `painWatch` de la fiche : il dit QUOI surveiller. */
  consigne: string;
  /** `YYYY-MM-DD` de la séance. Vide = séance hors calendrier, pas de suivi. */
  date: string;
}) {
  const [ouvert, setOuvert] = useState(false);
  const [row, setRow] = useState<PainLogRow | null>(null);
  const [historique, setHistorique] = useState<PainLogRow[]>([]);

  useEffect(() => {
    if (!date) return;
    void (async () => {
      const tout = await painLogFor(exerciseId);
      setRow(tout.find((r) => r.date === date) ?? null);
      setHistorique(tout.filter((r) => r.date !== date).slice(-3));
    })();
  }, [exerciseId, date]);

  if (!date) return null;

  const ecrire = (patch: Partial<Omit<PainLogRow, 'id' | 'date' | 'exId'>>) => {
    // Optimiste : le curseur doit répondre au doigt, pas à la base.
    setRow((r) => ({
      date,
      exId: exerciseId,
      during: null,
      after: null,
      nextDay: null,
      toleratedKg: null,
      rom: null,
      ...r,
      ...patch,
    }));
    void savePain(date, exerciseId, patch).then((enregistre) => setRow(enregistre));
  };

  const resume = [
    row?.during !== null && row?.during !== undefined ? `pendant ${row.during}` : null,
    row?.after !== null && row?.after !== undefined ? `après ${row.after}` : null,
    row?.nextDay !== null && row?.nextDay !== undefined ? `lendemain ${row.nextDay}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className={styles.bloc}>
      <button
        type="button"
        className={styles.entete}
        onClick={() => setOuvert((v) => !v)}
        aria-expanded={ouvert}
      >
        <span className={styles.titre}>Suivi douleur</span>
        <span className={styles.resume}>{resume || 'rien de noté'}</span>
        <span className={styles.chevron}>{ouvert ? '▲' : '▼'}</span>
      </button>

      {ouvert && (
        <div className={styles.corps}>
          <p className={styles.consigne}>{consigne}</p>

          <div className={styles.curseurs}>
            <Stepper
              label="Pendant"
              value={row?.during ?? null}
              step={1}
              min={0}
              max={10}
              onStep={(d) => ecrire({ during: stepValue(row?.during ?? 0, d, 0, 10) })}
            />
            <Stepper
              label="Après la séance"
              value={row?.after ?? null}
              step={1}
              min={0}
              max={10}
              onStep={(d) => ecrire({ after: stepValue(row?.after ?? 0, d, 0, 10) })}
            />
            <Stepper
              label="Le lendemain"
              value={row?.nextDay ?? null}
              step={1}
              min={0}
              max={10}
              onStep={(d) => ecrire({ nextDay: stepValue(row?.nextDay ?? 0, d, 0, 10) })}
            />
            <Stepper
              label="Charge tolérée"
              value={row?.toleratedKg ?? null}
              step={2.5}
              min={0}
              max={300}
              unit="kg"
              onStep={(d) => ecrire({ toleratedKg: stepValue(row?.toleratedKg ?? 0, d, 0, 300) })}
              onCommit={(v) => ecrire({ toleratedKg: v })}
            />
          </div>

          <div className={styles.amplitude} role="group" aria-label="Amplitude tolérée">
            <span className={styles.amplitudeLabel}>Amplitude</span>
            {AMPLITUDES.map((a) => (
              <button
                key={a.cle}
                type="button"
                className={`${styles.chip} ${row?.rom === a.cle ? styles.chipOn : ''}`}
                aria-pressed={row?.rom === a.cle}
                // Réappuyer sur le choix courant l'efface : « pas noté » doit
                // rester atteignable, sinon une erreur de doigt est définitive.
                onClick={() => ecrire({ rom: row?.rom === a.cle ? null : (a.cle as Rom) })}
              >
                {a.label}
              </button>
            ))}
          </div>

          <p className={styles.aide}>
            « Le lendemain » se remplit en rouvrant cette séance depuis l’onglet Semaine.
          </p>

          {historique.length > 0 && (
            <div className={styles.historique}>
              <span className={styles.historiqueTitre}>Dernières fois</span>
              {historique.map((h) => (
                <span key={h.date} className={styles.ligne}>
                  {h.date.slice(8, 10)}/{h.date.slice(5, 7)} ·{' '}
                  {[h.during, h.after, h.nextDay].map((v) => (v === null ? '—' : v)).join(' / ')}
                  {h.toleratedKg !== null && ` · ${fr(h.toleratedKg)} kg`}
                </span>
              ))}
            </div>
          )}

          <p className={styles.avertissement}>
            Ces notes servent au suivi. Elles ne constituent pas un diagnostic : une douleur
            importante, croissante ou qui modifie ta technique doit faire réduire ou interrompre
            l’exercice, et mérite l’avis d’un kiné du sport.
          </p>
        </div>
      )}
    </div>
  );
}
