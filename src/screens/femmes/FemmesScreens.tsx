/**
 * Les quatre écrans de FEMMES 8.
 *
 * ── Ce qu'ils affichent, et ce qu'ils n'inventent pas ─────────────────────
 *
 * Tout vient du moteur : `getSession` résout le circuit pour une semaine, un
 * jour, une version et un niveau, contre-indications déjà appliquées. Aucun
 * exercice, aucune charge, aucune répétition n'est écrit dans ce fichier.
 *
 * Le programme sportif étant encore en cours de conception, ces écrans sont
 * une INTERFACE sur des données existantes, pas une validation de leur
 * contenu.
 *
 * ── Ce qui est enregistré ──────────────────────────────────────────────────
 *
 * Depuis que FEMMES 8 est jouable, chaque exercice validé (répétitions,
 * charge, ressenti, remarque) et chaque séance terminée sont écrits en base,
 * dans le cycle FEMMES en cours (`femmesSeances`). Les écrans ne font
 * qu'afficher et remonter les saisies : l'écriture est faite par
 * `EcransFemmes`, qui détient le cycle.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import type { FemmesSeanceRow } from '../../db/db';
import {
  NIVEAU_DEFS,
  NIVEAU_PAR_DEFAUT,
  NIVEAUX,
  niveauDef,
  type Niveau,
} from '../../data/femmes/niveaux';
import { phaseOf } from '../../data/femmes/phases';
import { SAFETY_CHECKS, WEEK_DAYS } from '../../data/femmes/programme';
import { WEEKS, type DayIndex, type Version, type WeekIndex } from '../../data/femmes/types';
import { getSession } from '../../engine/femmes/getSession';
import { restLabel } from '../../engine/femmes/format';
import { estFaite, estSautee, type Avancement } from '../../engine/femmes/avancement';
import type { SafetyAnswers, SessionContext } from '../../engine/femmes/types';
import { Bandeau, Ico, NavFemmes, type OngletFemmes } from './Pieces';
import s from './Femmes.module.css';

/* Les trois lettres du jour, dans l'ordre où les séances tombent. */
const CODES = ['LUN', 'MER', 'VEN', 'SAM'] as const;
const NOMS = ['Lundi', 'Mercredi', 'Vendredi', 'Samedi'] as const;

export interface EtatFemmes {
  semaine: WeekIndex;
  jour: DayIndex;
  version: Version;
  niveau: Niveau;
}

/**
 * Ce que la base dit de la pratiquante : son contexte pour le moteur (réponses
 * de sécurité, historique des charges), ses séances, où elle en est.
 */
export interface DonneesFemmes {
  ctx: SessionContext;
  seances: readonly FemmesSeanceRow[];
  avance: Avancement;
  /** `YYYY-MM-DD` du démarrage du cycle. */
  depuis: string;
}

/** Le nombre de jours depuis le démarrage, ou `null` sans date lisible. */
function joursDepuis(iso: string): number | null {
  const t = Date.parse(`${iso}T00:00:00`);
  if (Number.isNaN(t)) return null;
  const auj = Date.parse(`${new Date().toISOString().slice(0, 10)}T00:00:00`);
  return Math.max(0, Math.round((auj - t) / 86_400_000));
}

export const ETAT_INITIAL: EtatFemmes = {
  semaine: 1,
  jour: 0,
  version: 'maison',
  niveau: NIVEAU_PAR_DEFAUT,
};

/* ═══════════════════════════════════════════════ 1 — AUJOURD'HUI ═══════ */

export function FemmesAujourdhui({
  etat,
  donnees,
  onAller,
  onCommencer,
  onNonFaite,
}: {
  etat: EtatFemmes;
  donnees: DonneesFemmes;
  onAller: (o: OngletFemmes) => void;
  onCommencer: () => void;
  /** « Séance non faite » : passe à la suivante sans la faire. */
  onNonFaite: () => void;
}) {
  const phase = phaseOf(etat.semaine);
  const seance = useMemo(
    () => getSession(etat.semaine, etat.jour, etat.version, donnees.ctx, etat.niveau),
    [etat, donnees.ctx],
  );
  const { faites, total, termine } = donnees.avance;
  const jours = joursDepuis(donnees.depuis);
  const dejaFaite = estFaite(donnees.seances, etat.semaine, etat.jour);

  return (
    <div className={s.page}>
      <Bandeau logo titre="MAJK FEMMES" />

      {/* Les quatre pastilles de la planche : niveau, semaine, jour, durée. */}
      <div className={`${s.chips} ${s.chipsAccueil}`}>
        <span className={`${s.chip} ${s.chipCaps}`}>{niveauDef(etat.niveau).nom}</span>
        <span className={s.chip}>Semaine {etat.semaine}</span>
        <span className={s.chip}>{NOMS[etat.jour]}</span>
        <span className={s.chip}>
          <Ico nom="chrono" taille={14} />
          {phase.durationLabel}
        </span>
      </div>

      <div className={s.corps}>
        {/* La carte de phase, la même que sur l'écran Semaine. */}
        <section className={s.carteBloc}>
          <span className={s.carteBlocIco}>
            <Ico nom="haltere" taille={34} />
          </span>
          <span>
            <h2 className={s.carteBlocTitre}>
              Semaine {etat.semaine} · {phase.name}
            </h2>
            <p className={s.carteBlocTexte}>{phase.objective}</p>
          </span>
        </section>

        {termine && (
          <section className={`${s.carte} ${s.carteRose}`}>
            <h2 className={s.carteTitre}>Programme terminé</h2>
            <p className={s.carteTexte}>
              Les {total} séances sont faites. La transition 1 et le cycle 2 s’ouvrent au catalogue.
            </p>
          </section>
        )}

        {/* La carte d'action : jour et durée en tête, lieu en pastille à
            droite, volume en gros, bouton DANS la carte. */}
        <section className={`${s.carte} ${s.carteRose} ${s.carteAction}`}>
          <div className={s.carteBarre}>
            <span className={s.carteBarreGauche}>
              {NOMS[etat.jour]} · {phase.durationLabel}
            </span>
            <span className={s.lieu}>
              <Ico nom={etat.version === 'maison' ? 'maison' : 'boucle'} taille={19} />
              {etat.version === 'maison' ? 'Maison' : 'Salle'}
            </span>
          </div>
          <p className={`${s.gros} ${s.grosCaps}`}>
            {seance.tours} tours × {seance.slots.length}
          </p>
          <p className={s.carteTexte}>
            Repos {restLabel(seance.restSec)} entre les tours, Phase {phase.id} — {phase.name}.
          </p>
          <button type="button" className={`${s.cta} ${s.ctaDansCarte}`} onClick={onCommencer}>
            <Ico nom="play" />
            {dejaFaite ? 'Revoir la séance' : 'Commencer la séance'}
          </button>
        </section>

        {/* Le geste de côté : on laisse cette séance, on passe à la suivante.
            Elle ne compte pas comme faite, et le choix se défait depuis la
            semaine. */}
        {!dejaFaite && !termine && (
          <button type="button" className={s.secondaire} onClick={onNonFaite}>
            Séance non faite — passer à la suivante
          </button>
        )}

        <div className={s.duo}>
          <div className={s.tuile}>
            <p className={s.tuileValeur}>
              {faites} / {total}
            </p>
            <p className={s.tuileLabel}>Séances faites</p>
          </div>
          <div className={s.tuile}>
            <p className={s.tuileValeur}>{jours === null ? '—' : `${jours} j`}</p>
            <p className={s.tuileLabel}>Depuis le départ</p>
          </div>
        </div>

        <button type="button" className={s.secondaire} onClick={() => onAller('semaine')}>
          <Ico nom="calendrier" />
          Voir la semaine entière
        </button>
      </div>

      <NavFemmes actif="aujourdhui" onAller={onAller} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════ 2 — SEMAINE ═══════ */

/** « 14 septembre » : la date d'une séance faite (ou passée). */
function dateCourte(iso: string): string | null {
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
}

/** La couleur du trait d'une case de semaine : une par phase. */
const TRAIT_PHASE = { 1: s.semTrait1, 2: s.semTrait2, 3: s.semTrait3 } as const;

/**
 * L'écran Semaine, planche « Rosée Sculptée » (lot 1/6, 23 novembre).
 *
 * Tout ce qui s'affiche vient du programme : la phase, ses tours, son repos,
 * son objectif, les jours de la semaine et l'état RÉEL de chaque séance. Les
 * textes de la planche (« Bloc Congestion », « Jambes & Fessiers »…) sont des
 * exemples de POWER : aucun n'est repris. Une séance FEMMES n'a pas de date
 * prévue (la séance du jour est la première non faite) : la date ne s'écrit
 * qu'une fois la séance faite ou passée.
 */
export function FemmesSemaine({
  etat,
  donnees,
  onSemaine,
  onJour,
  onAller,
}: {
  etat: EtatFemmes;
  donnees: DonneesFemmes;
  onSemaine: (w: WeekIndex) => void;
  onJour: (d: DayIndex) => void;
  onAller: (o: OngletFemmes) => void;
}) {
  const phase = phaseOf(etat.semaine);
  const seance = getSession(etat.semaine, 0, etat.version, donnees.ctx, etat.niveau);
  const prochaine = donnees.avance.prochaine;
  const jours = WEEK_DAYS[etat.semaine];

  /* La semaine choisie reste visible dans la rangée qui défile. */
  const rangee = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const r = rangee.current;
    const c = r?.querySelector<HTMLElement>('[aria-current="true"]');
    if (!r || !c) return;
    r.scrollLeft = c.offsetLeft - (r.clientWidth - c.offsetWidth) / 2;
  }, [etat.semaine]);

  return (
    <div className={s.page}>
      <Bandeau
        surTitre={`Phase ${phase.id} · ${phase.name}`}
        titre={`SEMAINE ${etat.semaine}`}
        taille="xl"
        sousTitre={[
          `${jours.length} séances · ${phase.durationLabel}`,
          `${seance.tours} tours × ${seance.slots.length} · repos ${restLabel(seance.restSec)}`,
        ]}
      />

      <div className={s.semaines} ref={rangee}>
        {WEEKS.map((w) => {
          const p = phaseOf(w);
          const choisie = w === etat.semaine;
          return (
            <button
              key={w}
              type="button"
              className={`${s.sem} ${choisie ? s.semActive : ''}`}
              onClick={() => onSemaine(w)}
              aria-current={choisie ? 'true' : undefined}
              aria-label={`Semaine ${w}, phase ${p.id} · ${p.name}`}
            >
              <span className={s.semNum}>{w}</span>
              <span className={s.semPhase}>{p.name}</span>
              <span className={`${s.semTrait} ${TRAIT_PHASE[p.id]}`} />
            </button>
          );
        })}
      </div>

      <div className={s.corps}>
        <section className={s.carteBloc}>
          <span className={s.carteBlocIco}>
            <Ico nom="haltere" taille={34} />
          </span>
          <span>
            <h2 className={s.carteBlocTitre}>{phase.name}</h2>
            <p className={s.carteBlocTexte}>{phase.objective}</p>
          </span>
        </section>

        <div className={s.lignesSemaine}>
          {jours.map((d, i) => {
            const ligne = donnees.seances.find((r) => r.semaine === etat.semaine && r.jour === d);
            const faite = estFaite(donnees.seances, etat.semaine, d);
            const sautee = !faite && estSautee(donnees.seances, etat.semaine, d);
            const date = (faite || sautee) && ligne ? dateCourte(ligne.date) : null;
            return (
              <button
                key={d}
                type="button"
                className={s.jour}
                onClick={() => onJour(d)}
                aria-label={`${NOMS[i]}, séance ${i + 1}`}
              >
                <span className={s.jourCode}>{CODES[i]}</span>
                <span>
                  <span className={s.jourNom}>Séance {i + 1}</span>
                  <span className={s.jourDetail}>
                    <Ico nom="chrono" taille={15} />≈ {phase.durationLabel}
                    {date !== null && ` · ${date}`}
                  </span>
                </span>
                {/* Faite, non faite, prévue (la prochaine à faire), ou à faire. */}
                {faite ? (
                  <span className={`${s.etat} ${s.etatFaite}`}>Faite</span>
                ) : sautee ? (
                  <span className={`${s.etat} ${s.etatSautee}`}>Non faite</span>
                ) : prochaine?.semaine === etat.semaine && prochaine.jour === d ? (
                  <span className={`${s.etat} ${s.etatPrevu}`}>Prévue</span>
                ) : (
                  <span className={`${s.etat} ${s.etatAFaire}`}>À faire</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <NavFemmes actif="semaine" onAller={onAller} />
    </div>
  );
}

/*
 * 3 et 4 — la séance et ses exercices : depuis la refonte façon POWER, ils
 * vivent sur UN écran, `SeanceFemmes.tsx`.
 */

/* ═══════════════════════════════════════ profil : niveau et sécurité ═══ */

export interface ProfilSaisi {
  niveau: Niveau;
  safety: SafetyAnswers;
}

/**
 * Le niveau et les deux questions de sécurité.
 *
 * Le même écran sert deux fois : au DÉPART, où il est obligatoire — aucune
 * séance ne s'ouvre tant que les deux questions n'ont pas de réponse — puis
 * dans l'onglet Réglages, pour corriger une réponse quand la situation
 * change. Une réponse « non » ne retire rien : le moteur REMPLACE les
 * exercices concernés, et chaque remplacement est dit sur sa fiche.
 */
export function FemmesProfil({
  initial,
  depart,
  onValider,
  onAller,
}: {
  initial: ProfilSaisi | null;
  /** Vrai au démarrage du programme : le titre et le bouton changent. */
  depart: boolean;
  onValider: (p: ProfilSaisi) => Promise<void>;
  onAller: (o: OngletFemmes) => void;
}) {
  const [niveau, setNiveau] = useState<Niveau>(initial?.niveau ?? NIVEAU_PAR_DEFAUT);
  const [safety, setSafety] = useState<SafetyAnswers>(
    initial?.safety ?? { plancherPelvienOk: null, sansDouleurLimitante: null },
  );
  const [envoi, setEnvoi] = useState(false);
  const [enregistre, setEnregistre] = useState(false);
  const complet = SAFETY_CHECKS.every((c) => safety[c.key] !== null);

  async function valider() {
    if (!complet || envoi) return;
    setEnvoi(true);
    try {
      await onValider({ niveau, safety });
      setEnregistre(true);
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <div className={s.page}>
      <Bandeau
        surTitre={depart ? 'Avant de commencer' : 'Réglages'}
        titre={depart ? 'Ton départ' : 'Profil'}
      />
      <div className={s.corps}>
        <h2 className={s.titreSection}>Ton niveau</h2>
        <div className={s.lignes}>
          {NIVEAUX.map((n) => (
            <button
              key={n}
              type="button"
              className={`${s.carte} ${s.choix} ${niveau === n ? s.choixOn : ''}`}
              onClick={() => {
                setNiveau(n);
                setEnregistre(false);
              }}
              aria-pressed={niveau === n}
            >
              <span className={s.carteTitre}>{NIVEAU_DEFS[n].nom}</span>
              <span className={s.carteTexte}>{NIVEAU_DEFS[n].pourQui}</span>
            </button>
          ))}
        </div>

        <h2 className={s.titreSection}>Sécurité</h2>
        {SAFETY_CHECKS.map((c) => (
          <section key={c.key} className={s.carte}>
            <h3 className={s.carteTitre}>{c.question}</h3>
            <div className={s.ouiNon}>
              {[true, false].map((v) => (
                <button
                  key={String(v)}
                  type="button"
                  className={`${s.ressentiBtn} ${safety[c.key] === v ? s.ressentiOn : ''}`}
                  onClick={() => {
                    setSafety({ ...safety, [c.key]: v });
                    setEnregistre(false);
                  }}
                  aria-pressed={safety[c.key] === v}
                >
                  {v ? 'Oui' : 'Non'}
                </button>
              ))}
            </div>
            <p className={s.carteTexte}>{c.consequence}</p>
            <p className={s.notePetite}>{c.detail}</p>
          </section>
        ))}

        <button
          type="button"
          className={`${s.cta} ${s.ctaSobre}`}
          onClick={() => void valider()}
          disabled={!complet || envoi}
        >
          {depart ? 'Commencer le programme' : 'Enregistrer'}
          <Ico nom="coche" />
        </button>
        {!complet && <p className={s.notePetite}>Réponds aux deux questions pour continuer.</p>}
        {enregistre && !depart && <p className={s.notePetite}>Enregistré.</p>}
      </div>
      <NavFemmes actif="reglages" onAller={onAller} />
    </div>
  );
}
