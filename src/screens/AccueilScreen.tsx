/**
 * L'accueil Dcross-fit — le premier écran de la plateforme.
 *
 * ── Ce qu'il répond ────────────────────────────────────────────────────────
 *
 * Une seule question : « où j'en suis, et qu'est-ce que je fais maintenant ».
 * Le reste — le catalogue, les autres programmes — est à un appui, pas sur
 * cet écran.
 *
 * ── Pourquoi il existe ─────────────────────────────────────────────────────
 *
 * Tant qu'il n'y avait qu'un programme, l'application pouvait ouvrir
 * directement sur la séance du jour : il n'y avait rien d'autre à montrer.
 * Dès qu'il y a un catalogue et plusieurs cycles, il faut un endroit qui dise
 * lequel est en cours, sinon l'utilisateur ne sait plus ce qu'il regarde.
 *
 * Le coût est un geste de plus au démarrage. Il est compensé en mettant
 * l'action du jour en premier, en gros, avant tout le reste.
 */

import { useEffect, useState } from 'react';
import { Icon } from '../components/Icon';
import { ScreenHeader } from '../components/ScreenHeader';
import { programmeParId, type ProgrammeDefinition } from '../data/catalogue';
import type { DayIndex, WeekIndex } from '../data/types';
import { locateToday, schedule } from '../engine/calendar';
import { allSessions, cycleActif, getSettingsRow } from '../db/repo';
import type { CycleRow } from '../db/db';
import { getSession as buildSession } from '../engine/getSession';
import { EMPTY_CONTEXT } from '../engine/types';
import styles from './Screens.module.css';
import local from './Accueil.module.css';

interface Etat {
  cycle: CycleRow | null;
  programme: ProgrammeDefinition | null;
  faites: number;
  total: number;
  prochaine: { week: WeekIndex; day: DayIndex; titre: string; date: string } | null;
}

const VIDE: Etat = { cycle: null, programme: null, faites: 0, total: 0, prochaine: null };

export function AccueilScreen({
  onReprendre,
  onCatalogue,
}: {
  onReprendre: () => void;
  onCatalogue: () => void;
}) {
  const [etat, setEtat] = useState<Etat>(VIDE);
  const [pret, setPret] = useState(false);

  useEffect(() => {
    let vivant = true;
    void (async () => {
      const [cycle, reglages, seances] = await Promise.all([
        cycleActif(),
        getSettingsRow(),
        allSessions(),
      ]);
      if (!vivant) return;

      const programme = cycle === null ? null : programmeParId(cycle.programmeId);
      const debut = cycle?.startDate ?? reglages.startDate;
      const planifiees = debut === '' ? [] : schedule(debut);
      const faites = seances.filter((s) => s.status === 'done').length;

      /*
       * La prochaine séance est celle d'aujourd'hui quand il y en a une, sinon
       * la suivante au calendrier. On ne l'invente pas : sans date de début,
       * il n'y a pas de calendrier, donc pas de prochaine séance.
       */
      let prochaine: Etat['prochaine'] = null;
      if (debut !== '') {
        const aujourdhui = new Date().toISOString().slice(0, 10);
        const ici = locateToday(debut, aujourdhui);
        const cible =
          ici?.kind === 'session'
            ? ici.session
            : (planifiees.find((p) => p.date >= aujourdhui) ?? null);
        if (cible) {
          const resolue = buildSession(cible.week, cible.day, EMPTY_CONTEXT);
          prochaine = {
            week: cible.week,
            day: cible.day,
            titre: resolue?.title ?? 'Séance',
            date: cible.date,
          };
        }
      }

      setEtat({ cycle, programme, faites, total: planifiees.length, prochaine });
      setPret(true);
    })();
    return () => {
      vivant = false;
    };
  }, []);

  const pourcent = etat.total === 0 ? 0 : Math.round((etat.faites / etat.total) * 100);
  const jourLong = (iso: string) =>
    new Date(`${iso}T12:00:00`).toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });

  return (
    <div className={styles.screen}>
      <ScreenHeader
        eyebrow="Dcross-fit"
        title={etat.cycle === null ? 'Bienvenue' : 'Bon retour'}
        subtitle={
          etat.cycle === null ? 'Choisis un programme pour commencer' : 'Ton programme en cours'
        }
        visuel="stade"
        prioritaire
        compact
      />

      {!pret && <p className={styles.hint}>Lecture de tes données…</p>}

      {pret && etat.cycle !== null && (
        <>
          <section className={styles.card}>
            <h2 className={local.nomProgramme}>
              {etat.programme?.nom ?? etat.cycle.programmeId}
              <span className={local.version}> · version {etat.cycle.programmeVersion}</span>
            </h2>
            <p className={local.famille}>{etat.programme?.resume ?? 'Programme en cours'}</p>

            {etat.total > 0 && (
              <>
                <div className={local.jauge} aria-hidden="true">
                  <i style={{ width: `${pourcent}%` }} />
                </div>
                <p className={styles.cardSub}>
                  {etat.faites} séance{etat.faites > 1 ? 's' : ''} faite
                  {etat.faites > 1 ? 's' : ''} sur {etat.total} · {pourcent} %
                </p>
              </>
            )}
          </section>

          {etat.prochaine !== null && (
            <button type="button" className={local.principal} onClick={onReprendre}>
              <span className={local.principalIcone}>
                <Icon name="play" size="20px" />
              </span>
              <span className={local.principalTexte}>
                <b>{etat.prochaine.titre}</b>
                <s>
                  {jourLong(etat.prochaine.date)} · semaine {etat.prochaine.week}
                </s>
              </span>
              <Icon name="arrow-right" size="18px" />
            </button>
          )}

          {etat.prochaine === null && (
            <button type="button" className={local.principal} onClick={onReprendre}>
              <span className={local.principalTexte}>
                <b>Reprendre le programme</b>
                <s>Pose ta date de début pour voir ton calendrier</s>
              </span>
              <Icon name="arrow-right" size="18px" />
            </button>
          )}
        </>
      )}

      {pret && etat.cycle === null && (
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Aucun programme en cours</h2>
          <p className={styles.cardSub}>
            Le catalogue dit ce qui existe et ce qui est prêt. Un seul programme est jouable
            aujourd’hui : POWER 12.
          </p>
        </section>
      )}

      <button type="button" className={local.lien} onClick={onCatalogue}>
        <span className={local.lienIcone}>
          <Icon name="book" size="19px" />
        </span>
        <span className={local.lienTexte}>
          <b>Catalogue</b>
          <s>POWER · MASS · Femmes à venir</s>
        </span>
        <Icon name="arrow-right" size="17px" />
      </button>
    </div>
  );
}
