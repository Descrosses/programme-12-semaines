import { useState } from 'react';
import { Icon } from '../components/Icon';
import { ScreenHeader } from '../components/ScreenHeader';
import { Stepper, stepValue } from '../components/Stepper';
import { bandePoids } from '../engine/ciblePoids';
import { humanDate } from '../engine/calendar';
import { poseMaximum } from '../engine/maxima';
import { fr } from '../engine/format';
import { saveSettings } from '../db/repo';
import type { SettingsRow } from '../db/db';
import styles from './Screens.module.css';
import local from './Onboarding.module.css';

/**
 * Les trois écrans qui précèdent la première séance.
 *
 * ── Pourquoi un parcours et plus un seul champ ─────────────────────────────
 *
 * L'accueil ne demandait que la date de début, et c'était cohérent tant que
 * l'application portait les performances de son auteur : tout le reste était
 * déjà rempli. Maintenant que plus rien ne l'est, un nouvel utilisateur
 * arrivait sur une application vide sans savoir ce qu'il devait lui donner.
 *
 * Trois étapes, donc, et une seule est obligatoire :
 *
 *   1. La date — elle date les 62 séances, rien ne peut s'afficher sans elle.
 *   2. Les maxima — soit on les connaît déjà, soit le combine les mesurera.
 *   3. Les mesures facultatives — poids, référence de saut, objectif de poids.
 *
 * ── Ce que le parcours ne fait jamais ──────────────────────────────────────
 *
 * Il ne propose aucune valeur. Pas de 1RM « typique », pas de poids de corps
 * conseillé, pas d'objectif par défaut : un champ laissé vide reste vide, et
 * l'application dira « à mesurer » plutôt que d'inventer un chiffre. Un zéro
 * serait pire qu'un vide — le moteur le lirait comme une performance.
 *
 * ── Pourquoi il ne prévient le reste de l'application qu'à la fin ──────────
 *
 * Enregistrer la date remonte l'information jusqu'à l'application, qui
 * recalcule tout et remonte l'écran : le parcours disparaîtrait au milieu de
 * l'étape 1. Il garde donc son avancée pour lui et n'appelle `onFini` qu'une
 * fois, à la sortie.
 */

/** Les quatre maxima que le combine mesure, dans l'ordre où il les teste. */
const MAXIMA = [
  { id: 'back-squat', label: 'Back Squat', jour: 'lundi' },
  { id: 'weighted-pullup', label: 'Tractions lestées', jour: 'mardi' },
  { id: 'deadlift', label: 'Deadlift', jour: 'jeudi' },
  { id: 'bench-press', label: 'Bench Press', jour: 'vendredi' },
] as const;

type Etape = 1 | 2 | 3;

export function OnboardingScreen({
  /** Les réglages actuels — vides au premier lancement. */
  row,
  /** Appelé une seule fois, à la sortie du parcours. */
  onFini,
}: {
  row: SettingsRow;
  onFini: () => void;
}) {
  const [etape, setEtape] = useState<Etape>(1);
  /** Copie locale : le parcours enregistre à chaque geste et se redessine seul. */
  const [reglages, setReglages] = useState<SettingsRow>(row);
  /** `null` tant que l'utilisateur n'a pas dit s'il connaît ses maxima. */
  const [connaitMaxima, setConnaitMaxima] = useState<boolean | null>(null);

  async function enregistre(patch: Partial<SettingsRow>) {
    setReglages(await saveSettings(patch));
  }

  function majMaxima(id: string, valeur: number | null) {
    return enregistre({ oneRM: poseMaximum(reglages.oneRM, id, valeur) });
  }

  const dateOk = reglages.startDate !== '';

  return (
    <div className={styles.screen}>
      <ScreenHeader
        eyebrow={`Étape ${etape} sur 3`}
        title={etape === 1 ? 'Bienvenue' : etape === 2 ? 'Tes maxima' : 'Presque fini'}
        subtitle={
          etape === 1
            ? 'Pose ton point de départ'
            : etape === 2
              ? 'Ce que tu soulèves aujourd’hui'
              : 'Trois mesures facultatives'
        }
        visuel={etape === 1 ? 'stade' : undefined}
        prioritaire={etape === 1}
        compact={etape !== 1}
      />

      <div className={local.etapes} aria-hidden="true">
        {([1, 2, 3] as const).map((n) => (
          <span
            key={n}
            className={`${local.etape} ${
              n === etape ? local.etapeOn : n < etape ? local.etapePassee : ''
            }`}
          />
        ))}
      </div>

      {etape === 1 && (
        <>
          <p className={styles.lead}>
            Il manque une seule chose pour démarrer : le <b>lundi</b> de ton combine initial. Tout
            le calendrier en découle, et il ne bougera plus ensuite.
          </p>
          <section className={styles.card}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="accueil-date">
                Lundi du combine initial
              </label>
              <input
                id="accueil-date"
                className={styles.input}
                type="date"
                value={reglages.startDate}
                onChange={(e) => void enregistre({ startDate: e.target.value })}
              />
              <p className={styles.fieldHint}>
                Six jours de tests : squat lundi, tractions lestées mardi, deadlift jeudi, bench
                vendredi, tractions max samedi. Dimanche repos, puis la semaine 1 démarre le lundi.
              </p>
            </div>
          </section>
          <div className={local.pied}>
            <button
              type="button"
              className={styles.primary}
              disabled={!dateOk}
              onClick={() => setEtape(2)}
            >
              Continuer
            </button>
            {!dateOk && (
              <p className={local.compteur}>
                Sans cette date, aucune séance ne peut être datée : c’est le seul champ obligatoire
                du parcours.
              </p>
            )}
          </div>
        </>
      )}

      {etape === 2 && (
        <>
          <p className={styles.lead}>
            Rien n’est prérempli : l’application ne connaît aucun de tes chiffres. Si tu arrives
            d’un autre programme et que tu connais déjà tes maxima, donne-les ; sinon le combine les
            mesurera.
          </p>
          <section className={styles.card}>
            <div className={local.choix}>
              <button
                type="button"
                className={`${local.option} ${connaitMaxima === false ? local.optionOn : ''}`}
                onClick={() => {
                  setConnaitMaxima(false);
                  // Dire « je les testerai » après avoir saisi quelque chose
                  // doit effacer ce quelque chose : sinon des maxima restent
                  // en base, invisibles, et pilotent les charges en silence.
                  if (Object.keys(reglages.oneRM).length > 0) void enregistre({ oneRM: {} });
                }}
                aria-pressed={connaitMaxima === false}
              >
                <span className={local.optionTitre}>
                  <span className={local.coche}>
                    {connaitMaxima === false && <Icon name="check" size="18px" />}
                  </span>
                  Je les testerai au combine
                </span>
                <span className={local.optionNote}>
                  Les six premiers jours servent à ça. L’application affichera « à mesurer » en
                  attendant.
                </span>
              </button>
              <button
                type="button"
                className={`${local.option} ${connaitMaxima === true ? local.optionOn : ''}`}
                onClick={() => setConnaitMaxima(true)}
                aria-pressed={connaitMaxima === true}
              >
                <span className={local.optionTitre}>
                  <span className={local.coche}>
                    {connaitMaxima === true && <Icon name="check" size="18px" />}
                  </span>
                  Je les connais déjà
                </span>
                <span className={local.optionNote}>
                  Saisis ceux dont tu es sûr. Les autres restent vides.
                </span>
              </button>
            </div>
          </section>

          {connaitMaxima === true && (
            <section className={styles.card}>
              <h2 className={styles.cardTitle}>Maxima connus</h2>
              <p className={styles.cardSub}>
                En kilos, barre comprise. Pour les tractions lestées, le <b>lest seul</b>. Laisse
                vide ce que tu n’as pas mesuré.
              </p>
              <p className={styles.cardSub}>
                Appuie sur la valeur pour la taper au clavier — plus rapide que les boutons pour un
                maximum.
              </p>
              {MAXIMA.map((m) => (
                <div key={m.id} className={styles.field}>
                  <Stepper
                    label={m.label}
                    value={reglages.oneRM[m.id] ?? null}
                    step={2.5}
                    min={0}
                    max={300}
                    unit="kg"
                    emptyLabel="à mesurer"
                    onStep={(d) =>
                      void majMaxima(m.id, stepValue(reglages.oneRM[m.id] ?? null, d, 0, 300))
                    }
                    onCommit={(v) => void majMaxima(m.id, v)}
                  />
                </div>
              ))}
            </section>
          )}

          <div className={local.pied}>
            <button type="button" className={styles.primary} onClick={() => setEtape(3)}>
              Continuer
            </button>
            <button type="button" className={local.retour} onClick={() => setEtape(1)}>
              <Icon name="arrow-left" size="14px" /> Revenir à la date
            </button>
          </div>
        </>
      )}

      {etape === 3 && (
        <>
          <p className={styles.lead}>
            Aucune n’est obligatoire, et aucune n’a de valeur par défaut. Tu peux toutes les remplir
            plus tard dans Réglages.
          </p>

          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Poids de corps</h2>
            <p className={styles.cardSub}>
              Moyenne de 3 matinées à jeun. Il sert au suivi, pas aux charges.
            </p>
            <div className={styles.field}>
              <Stepper
                label="Poids de corps"
                value={reglages.bodyweightKg}
                step={0.5}
                min={40}
                max={160}
                unit="kg"
                emptyLabel="aucun"
                tone="accent"
                onStep={(d) =>
                  void enregistre({
                    bodyweightKg: stepValue(reglages.bodyweightKg, d, 40, 160),
                    bodyweightDate: new Date().toISOString().slice(0, 10),
                  })
                }
                onCommit={(v) =>
                  void enregistre({
                    bodyweightKg: v,
                    bodyweightDate: v === null ? '' : new Date().toISOString().slice(0, 10),
                  })
                }
              />
            </div>
          </section>

          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Référence broad jump</h2>
            <p className={styles.cardSub}>
              Ton meilleur saut sans élan, en centimètres. C’est elle qui décide du feu tricolore
              avant chaque séance jambes — sans elle, aucun verdict n’est calculé.
            </p>
            <div className={styles.field}>
              <Stepper
                label="Référence"
                value={reglages.broadJumpBaselineCm}
                step={5}
                min={100}
                max={400}
                unit="cm"
                emptyLabel="à mesurer"
                onStep={(d) =>
                  void enregistre({
                    broadJumpBaselineCm: stepValue(reglages.broadJumpBaselineCm, d, 100, 400),
                  })
                }
                onCommit={(v) => void enregistre({ broadJumpBaselineCm: v })}
              />
              <p className={styles.fieldHint}>
                Tu la mesureras au combine du lundi si tu la laisses vide.
              </p>
            </div>
          </section>

          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Objectif de poids</h2>
            <p className={styles.cardSub}>
              Le programme n’en impose aucun : un objectif de poids dépend de ta taille, de ton
              poste et de ce que tu cherches.
            </p>
            <div className={styles.field}>
              <Stepper
                label="Objectif bas"
                value={reglages.ciblePoidsBasKg}
                step={0.5}
                min={40}
                max={160}
                unit="kg"
                emptyLabel="aucun"
                onStep={(d) =>
                  void enregistre({
                    ciblePoidsBasKg: stepValue(reglages.ciblePoidsBasKg, d, 40, 160),
                  })
                }
                onCommit={(v) => void enregistre({ ciblePoidsBasKg: v })}
              />
            </div>
            <div className={styles.field}>
              <Stepper
                label="Objectif haut"
                value={reglages.ciblePoidsHautKg}
                step={0.5}
                min={40}
                max={160}
                unit="kg"
                emptyLabel="aucun"
                onStep={(d) =>
                  void enregistre({
                    ciblePoidsHautKg: stepValue(reglages.ciblePoidsHautKg, d, 40, 160),
                  })
                }
                onCommit={(v) => void enregistre({ ciblePoidsHautKg: v })}
              />
            </div>
          </section>

          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Ce que l’application sait de toi</h2>
            <div className={local.recap}>
              <Recap nom="Début du programme" valeur={reglages.startDate || null} brut />
              {MAXIMA.map((m) => (
                <Recap
                  key={m.id}
                  nom={m.label}
                  valeur={
                    reglages.oneRM[m.id] === undefined ? null : `${fr(reglages.oneRM[m.id]!)} kg`
                  }
                  vide={`à mesurer ${m.jour}`}
                />
              ))}
              <Recap
                nom="Poids de corps"
                valeur={reglages.bodyweightKg === null ? null : `${fr(reglages.bodyweightKg)} kg`}
              />
              <Recap
                nom="Référence broad jump"
                valeur={
                  reglages.broadJumpBaselineCm === null
                    ? null
                    : `${fr(reglages.broadJumpBaselineCm)} cm`
                }
                vide="à mesurer lundi"
              />
              <Recap
                nom="Objectif de poids"
                valeur={(() => {
                  const b = bandePoids(reglages.ciblePoidsBasKg, reglages.ciblePoidsHautKg);
                  return b === null ? null : `${fr(b.min)} à ${fr(b.max)} kg`;
                })()}
                vide="aucun"
              />
            </div>
          </section>

          <div className={local.pied}>
            <button type="button" className={styles.primary} onClick={onFini}>
              C’est parti
            </button>
            <button type="button" className={local.retour} onClick={() => setEtape(2)}>
              <Icon name="arrow-left" size="14px" /> Revenir aux maxima
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Une ligne du récapitulatif.
 *
 * Une valeur absente ne s'affiche pas comme une valeur : elle est en italique
 * et dans la couleur des libellés, pour qu'on voie d'un coup d'œil ce qui
 * reste à mesurer.
 */
function Recap({
  nom,
  valeur,
  vide = 'à mesurer',
  brut = false,
}: {
  nom: string;
  valeur: string | null;
  vide?: string;
  brut?: boolean;
}) {
  return (
    <p className={local.ligne}>
      <span className={local.ligneNom}>{nom}</span>
      <span className={valeur === null ? local.ligneVide : local.ligneValeur}>
        {valeur === null ? vide : brut ? humanDate(valeur) : valeur}
      </span>
    </p>
  );
}
