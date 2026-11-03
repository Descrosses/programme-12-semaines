/**
 * L'accueil Dcross-fit — le premier écran de la plateforme.
 *
 * ── Ce qu'il répond ────────────────────────────────────────────────────────
 *
 * Trois questions, dans cet ordre : où j'en suis, qu'est-ce que je fais
 * maintenant, et qu'est-ce qui existe d'autre. Le reste est à un appui.
 *
 * ── Pourquoi il a été refait ───────────────────────────────────────────────
 *
 * Il portait le thème de POWER 12 : bleu nuit, et une photo de stade en tête
 * d'écran. Tant que l'application ÉTAIT POWER 12, c'était cohérent. Avec trois
 * familles au catalogue, l'accueil annonçait l'une d'elles au lieu d'annoncer
 * la plateforme — et habiller le hall d'entrée aux couleurs d'un seul des
 * programmes qu'il héberge revient à en désigner un favori.
 *
 * La structure suit la maquette de Guillaume : logo, bienvenue, programme en
 * cours, prochaine séance, familles, parcours. Les chiffres, eux, viennent du
 * système existant — cycle actif, calendrier du programme, séances faites.
 * Aucun n'est décoratif.
 */

import { useEffect, useState, type CSSProperties } from 'react';
import { EnTetePlateforme } from '../components/EnTetePlateforme';
import { Icon } from '../components/Icon';
import { Visuel } from '../components/Visuel';
import { FAMILLES, programmeParId, type ProgrammeDefinition } from '../data/catalogue';
import { HABILLAGE } from '../data/famillesVisuel';
import type { DayIndex, WeekIndex } from '../data/types';
import { locateToday, schedule } from '../engine/calendar';
import { modulePourCycle } from '../programmes/registre';
import { allSessions, cycleActif, getSettingsRow } from '../db/repo';
import type { CycleRow } from '../db/db';
import { EMPTY_CONTEXT } from '../engine/types';
import styles from './Accueil.module.css';

interface Etat {
  cycle: CycleRow | null;
  programme: ProgrammeDefinition | null;
  faites: number;
  total: number;
  semaine: WeekIndex | null;
  semaines: number;
  prochaine: { week: WeekIndex; day: DayIndex; titre: string; date: string; duree: string } | null;
}

const VIDE: Etat = {
  cycle: null,
  programme: null,
  faites: 0,
  total: 0,
  semaine: null,
  semaines: 0,
  prochaine: null,
};

export function AccueilScreen({
  onReprendre,
  onCatalogue,
  onParcours,
}: {
  onReprendre: () => void;
  onCatalogue: () => void;
  onParcours: () => void;
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
      // Le calendrier d'un cycle est celui de SON programme : quatre semaines
      // pour MASS 4, treize pour POWER 12.
      const module = modulePourCycle(cycle?.programmeId ?? null);
      const debut = cycle?.startDate ?? reglages.startDate;
      const planifiees = debut === '' ? [] : schedule(debut, module);
      const faites = seances.filter((s) => s.status === 'done').length;

      /*
       * La prochaine séance est celle d'aujourd'hui quand il y en a une, sinon
       * la suivante au calendrier. On ne l'invente pas : sans date de début,
       * il n'y a pas de calendrier, donc pas de prochaine séance.
       */
      let prochaine: Etat['prochaine'] = null;
      if (debut !== '') {
        const aujourdhui = new Date().toISOString().slice(0, 10);
        const ici = locateToday(debut, aujourdhui, module);
        const cible =
          ici?.kind === 'session'
            ? ici.session
            : (planifiees.find((p) => p.date >= aujourdhui) ?? null);
        if (cible) {
          const resolue = module.getSession(cible.week, cible.day, EMPTY_CONTEXT);
          prochaine = {
            week: cible.week,
            day: cible.day,
            titre: resolue?.title ?? 'Séance',
            date: cible.date,
            duree: resolue?.durationLabel ?? '',
          };
        }
      }

      setEtat({
        cycle,
        programme,
        faites,
        total: planifiees.length,
        semaine: prochaine?.week ?? null,
        semaines: module.dureeSemaines,
        prochaine,
      });
      setPret(true);
    })();
    return () => {
      vivant = false;
    };
  }, []);

  const pourcent = etat.total === 0 ? 0 : Math.round((etat.faites / etat.total) * 100);
  const photoDuCycle =
    etat.programme === null ? undefined : HABILLAGE[etat.programme.familleId].photo;

  return (
    <div className={styles.ecran}>
      {/* ------------------------------------------------- en-tête ------- */}
      <EnTetePlateforme prioritaire />

      <div className={styles.corps}>
        <div className={styles.bienvenue}>
          <p className={styles.bonjour}>
            <span className={styles.bonjourLigne}>
              Bonjour Guillaume <span aria-hidden="true">👋</span>
            </span>
            <span className={styles.sousBienvenue}>Ton espace d’entraînement personnalisé.</span>
          </p>
          {/*
          L'emplacement du profil, tel qu'il figure dans la maquette.
          Ce n'est PAS un bouton : il n'y a pas de comptes utilisateurs dans
          cette application, et le brief interdit d'en inventer. Un rond
          cliquable qui n'ouvre rien serait un piège ; celui-ci garde la place
          du jour où la fonctionnalité existera.
        */}
          <span className={styles.profil} aria-hidden="true">
            <Icon name="profil" size="20px" />
          </span>
        </div>

        {!pret && <p className={styles.attente}>Lecture de tes données…</p>}

        {/* --------------------------------------- programme en cours ------ */}
        {pret && etat.cycle !== null && (
          <button type="button" className={styles.enCours} onClick={onReprendre}>
            {photoDuCycle !== undefined && (
              <span className={styles.enCoursPhoto} aria-hidden="true">
                <Visuel nom={photoDuCycle} sizes="420px" prioritaire />
              </span>
            )}
            <span className={styles.enCoursVoile} aria-hidden="true" />
            <span className={styles.enCoursCorps}>
              <span className={styles.badge}>En cours</span>
              <span className={styles.enCoursNom}>
                {etat.programme?.nom ?? etat.cycle.programmeId}
              </span>
              {etat.semaine !== null && (
                <span className={styles.enCoursSemaine}>
                  Semaine <b>{etat.semaine}</b> / {etat.semaines}
                </span>
              )}
              {etat.total > 0 && (
                <>
                  <span className={styles.jauge} aria-hidden="true">
                    <i style={{ width: `${pourcent}%` }} />
                  </span>
                  <span className={styles.enCoursChiffres}>
                    {etat.faites} séance{etat.faites > 1 ? 's' : ''} sur {etat.total} · {pourcent} %
                  </span>
                </>
              )}
            </span>
            <span className={styles.chevronCarte} aria-hidden="true">
              <Icon name="arrow-right" size="18px" />
            </span>
          </button>
        )}

        {/* ------------------------------------------ prochaine séance ----- */}
        {pret && etat.cycle !== null && etat.prochaine !== null && (
          <button type="button" className={styles.prochaine} onClick={onReprendre}>
            <span className={styles.prochaineIcone} aria-hidden="true">
              <Icon name="calendar" size="20px" />
            </span>
            <span className={styles.prochaineTexte}>
              <span className={styles.prochaineEtiquette}>Prochaine séance</span>
              <b>{etat.prochaine.titre}</b>
              <span className={styles.prochaineMeta}>
                {etat.prochaine.duree !== '' && (
                  <span>
                    <Icon name="stopwatch" size="14px" />
                    {etat.prochaine.duree} ·
                  </span>
                )}
                <span>{jourLong(etat.prochaine.date)}</span>
              </span>
            </span>
            <span className={styles.lecture} aria-hidden="true">
              <Icon name="play" size="18px" />
            </span>
          </button>
        )}

        {pret && etat.cycle !== null && etat.prochaine === null && (
          <button type="button" className={styles.prochaine} onClick={onReprendre}>
            <span className={styles.prochaineIcone} aria-hidden="true">
              <Icon name="calendar" size="20px" />
            </span>
            <span className={styles.prochaineTexte}>
              <b>Reprendre le programme</b>
              <span className={styles.prochaineMeta}>
                Pose ta date de début pour voir ton calendrier
              </span>
            </span>
            <span className={styles.lecture} aria-hidden="true">
              <Icon name="arrow-right" size="18px" />
            </span>
          </button>
        )}

        {pret && etat.cycle === null && (
          <button type="button" className={styles.prochaine} onClick={onCatalogue}>
            <span className={styles.prochaineIcone} aria-hidden="true">
              <Icon name="book" size="20px" />
            </span>
            <span className={styles.prochaineTexte}>
              <b>Aucun programme en cours</b>
              <span className={styles.prochaineMeta}>Ouvre le catalogue pour en démarrer un</span>
            </span>
            <span className={styles.lecture} aria-hidden="true">
              <Icon name="arrow-right" size="18px" />
            </span>
          </button>
        )}

        {/* ----------------------------------------------- familles -------- */}
        <div className={styles.sectionTete}>
          <h2 className={styles.sectionTitre}>Mes programmes</h2>
          <button type="button" className={styles.sectionLien} onClick={onCatalogue}>
            Tous les programmes
            <Icon name="arrow-right" size="15px" />
          </button>
        </div>

        <div className={styles.familles}>
          {FAMILLES.map((famille) => {
            const habillage = HABILLAGE[famille.id];
            const aVenir =
              famille.programmes.length === 0 ||
              famille.programmes.every((p) => p.statut === 'a-venir');
            return (
              <button
                key={famille.id}
                type="button"
                className={styles.famille}
                style={{ '--teinte': habillage.teinte } as CSSProperties}
                onClick={onCatalogue}
              >
                {habillage.photo !== undefined && (
                  <span className={styles.famillePhoto} aria-hidden="true">
                    <Visuel nom={habillage.photo} sizes="220px" />
                  </span>
                )}
                <span className={styles.familleVoile} aria-hidden="true" />
                {aVenir && <span className={styles.familleBadge}>À venir</span>}
                <span className={styles.familleTexte}>
                  <span className={styles.familleNom}>{famille.nom}</span>
                  <span className={styles.familleSous}>{famille.sousTitre}</span>
                  <span className={styles.barres} aria-hidden="true">
                    <i />
                    <i />
                    <i />
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        {/* ----------------------------------------------- parcours -------- */}
        <button type="button" className={styles.parcours} onClick={onParcours}>
          <span className={styles.parcoursIcone} aria-hidden="true">
            <Icon name="repeat" size="20px" />
          </span>
          <span className={styles.prochaineTexte}>
            <b>Mon parcours</b>
            <span className={styles.prochaineMeta}>Mes cycles, mes bilans, ma progression</span>
          </span>
          <span className={styles.chevron} aria-hidden="true">
            <Icon name="arrow-right" size="17px" />
          </span>
        </button>
      </div>
    </div>
  );
}

/**
 * « Mercredi 4 novembre ».
 *
 * La capitale initiale est posée à la main : `toLocaleDateString` rend le jour
 * en minuscules en français, et la maquette l'écrit en capitale. Une règle CSS
 * `text-transform: capitalize` aurait aussi mis une capitale à « Novembre ».
 */
function jourLong(iso: string): string {
  const texte = new Date(`${iso}T12:00:00`).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  return texte.charAt(0).toUpperCase() + texte.slice(1);
}
