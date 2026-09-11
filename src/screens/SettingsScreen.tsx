import { useEffect, useRef, useState } from 'react';
import { Stepper, stepValue } from '../components/Stepper';
import { dateFor, humanDate } from '../engine/calendar';
import { fr } from '../engine/format';
import { isWakeLockSupported } from '../timer/wakeLock';
import { downloadExport, importAll, parseExport, resetHistory } from '../db/export';
import { getSettingsRow, saveSettings } from '../db/repo';
import type { SettingsRow } from '../db/db';
import styles from './Screens.module.css';

const ONE_RM_FIELDS = [
  { id: 'back-squat', label: 'Back Squat', start: 140 },
  { id: 'bench-press', label: 'Bench Press', start: 120 },
  { id: 'deadlift', label: 'Deadlift', start: 130 },
  { id: 'weighted-pullup', label: 'Tractions lestées', start: 42 },
] as const;

export function SettingsScreen({ onChanged }: { onChanged: () => void }) {
  const [row, setRow] = useState<SettingsRow | null>(null);
  const [message, setMessage] = useState<{ text: string; kind: 'ok' | 'erreur' } | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void (async () => setRow(await getSettingsRow()))();
  }, []);

  if (!row) return <div className={styles.loading}>Chargement…</div>;

  async function patch(p: Partial<SettingsRow>) {
    const next = await saveSettings(p);
    setRow(next);
    onChanged();
  }

  async function handleImport(file: File) {
    try {
      const parsed = parseExport(await file.text());
      const report = await importAll(parsed);
      setRow(await getSettingsRow());
      onChanged();
      setMessage({
        text: `Import réussi : ${report.sets} séries, ${report.sessions} séances, ${report.readiness} readiness, ${report.combines} combines.`,
        kind: 'ok',
      });
    } catch (e) {
      setMessage({ text: e instanceof Error ? e.message : 'Import impossible.', kind: 'erreur' });
    }
  }

  const start = row.startDate;

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <h1 className={styles.h1}>Réglages</h1>
        <p className={styles.lead}>Tout est stocké sur ce téléphone. Rien ne part sur internet.</p>
      </header>

      {message && (
        <p className={`${styles.alert} ${message.kind === 'ok' ? styles.alertVert : styles.alertRouge}`}>
          {message.text}
        </p>
      )}

      {/* ------------------------------------------------ date de début -- */}
      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Date de début</h2>
        <p className={styles.cardSub}>
          Le <b>samedi</b> du combine initial. Tout le calendrier en découle : la semaine 1 commence
          le mercredi suivant.
        </p>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="start-date">
            Samedi du combine initial
          </label>
          <input
            id="start-date"
            className={styles.input}
            type="date"
            value={start}
            onChange={(e) => void patch({ startDate: e.target.value })}
          />
          {start && (
            <p className={styles.fieldHint}>
              Semaine 1 le {humanDate(dateFor(start, 1, 1))}, dernière séance le{' '}
              {humanDate(dateFor(start, 12, 4))}.
            </p>
          )}
        </div>
      </section>

      {/* --------------------------------------------- référence de saut -- */}
      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Référence broad jump</h2>
        <p className={styles.cardSub}>
          Meilleur des 3 essais du combine initial. Elle est figée : c’est elle qui décide du feu
          tricolore avant chaque séance jambes.
        </p>
        <div className={styles.field}>
          <Stepper
            label="Référence"
            value={row.broadJumpBaselineCm}
            step={5}
            min={100}
            max={400}
            unit="cm"
            tone="accent"
            onStep={(d) =>
              void patch({
                broadJumpBaselineCm: stepValue(row.broadJumpBaselineCm, d, 100, 400),
              })
            }
          />
          <p className={styles.fieldHint}>
            {row.broadJumpBaselineCm === null
              ? 'Non définie : aucun verdict de readiness ne sera calculé.'
              : `Orange en dessous de ${fr(Math.round(row.broadJumpBaselineCm * 0.98 * 10) / 10)} cm, rouge en dessous de ${fr(Math.round(row.broadJumpBaselineCm * 0.95 * 10) / 10)} cm.`}
          </p>
        </div>
      </section>

      {/* ------------------------------------------------------- 1RM ----- */}
      <section className={styles.card}>
        <h2 className={styles.cardTitle}>1RM testés</h2>
        <p className={styles.cardSub}>
          Servent au calcul des 65 % les jours de readiness rouge. À mettre à jour après le combine
          final — le combine de la semaine 8 ne teste aucun 1RM.
        </p>
        {ONE_RM_FIELDS.map((f) => (
          <div key={f.id} className={styles.field}>
            <Stepper
              label={f.label}
              value={row.oneRM[f.id] ?? f.start}
              step={2.5}
              min={0}
              max={300}
              unit="kg"
              onStep={(d) =>
                void patch({
                  oneRM: {
                    ...row.oneRM,
                    [f.id]: stepValue(row.oneRM[f.id] ?? f.start, d, 0, 300),
                  },
                })
              }
            />
          </div>
        ))}
      </section>

      {/* ---------------------------------------------------- alertes ---- */}
      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Fin de repos</h2>
        <button
          type="button"
          className={styles.toggle}
          onClick={() => void patch({ soundEnabled: !row.soundEnabled })}
          aria-pressed={row.soundEnabled}
        >
          Son
          <span className={`${styles.switch} ${row.soundEnabled ? styles.switchOn : ''}`}>
            {row.soundEnabled ? 'activé' : 'coupé'}
          </span>
        </button>
        <button
          type="button"
          className={styles.toggle}
          onClick={() => void patch({ vibrationEnabled: !row.vibrationEnabled })}
          aria-pressed={row.vibrationEnabled}
        >
          Vibration
          <span className={`${styles.switch} ${row.vibrationEnabled ? styles.switchOn : ''}`}>
            {row.vibrationEnabled ? 'activée' : 'coupée'}
          </span>
        </button>
        <p className={styles.fieldHint}>
          Sur iPhone, Safari ne permet pas la vibration : l’alerte sera le son et le passage de la
          barre au vert. Maintien de l’écran pendant le repos :{' '}
          <b>{isWakeLockSupported() ? 'disponible' : 'indisponible sur ce navigateur'}</b>.
        </p>
      </section>

      {/* ----------------------------------------------- export / import -- */}
      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Sauvegarde</h2>
        <p className={styles.cardSub}>
          Un fichier JSON contenant tout ton historique. Si le téléphone casse, c’est ce qui te
          permet de repartir sans rien perdre.
        </p>
        <button
          type="button"
          className={styles.secondary}
          style={{ width: '100%', margin: '12px 0 0' }}
          onClick={() => void downloadExport()}
        >
          Exporter mes données
        </button>
        <button
          type="button"
          className={styles.secondary}
          style={{ width: '100%', margin: '10px 0 0' }}
          onClick={() => fileInput.current?.click()}
        >
          Importer un fichier
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          className="visually-hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleImport(f);
            e.target.value = '';
          }}
        />
        <p className={styles.fieldHint}>
          L’import <b>remplace</b> tout ce qui est enregistré. Fusionner deux historiques créerait
          des séries en double et fausserait les règles de progression.
        </p>
      </section>

      {/* -------------------------------------------------- remise à zéro -- */}
      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Remise à zéro</h2>
        <p className={styles.cardSub}>
          Efface séances, séries, readiness et combines. Les réglages ci-dessus sont conservés.
        </p>
        {!confirmReset ? (
          <button
            type="button"
            className={styles.secondary}
            style={{ width: '100%', margin: '12px 0 0', color: 'var(--rouge)' }}
            onClick={() => setConfirmReset(true)}
          >
            Effacer tout l’historique
          </button>
        ) : (
          <>
            <p className={styles.fieldHint} style={{ color: 'var(--rouge)' }}>
              Irréversible. Exporte d’abord si tu veux garder une trace.
            </p>
            <button
              type="button"
              className={styles.secondary}
              style={{ width: '100%', margin: '10px 0 0', background: 'var(--rouge)', color: 'var(--ink-on-accent)' }}
              onClick={() =>
                void (async () => {
                  await resetHistory();
                  setConfirmReset(false);
                  onChanged();
                  setMessage({ text: 'Historique effacé.', kind: 'ok' });
                })()
              }
            >
              Oui, tout effacer
            </button>
            <button
              type="button"
              className={styles.secondary}
              style={{ width: '100%', margin: '10px 0 0' }}
              onClick={() => setConfirmReset(false)}
            >
              Annuler
            </button>
          </>
        )}
      </section>
    </div>
  );
}
