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

import { useMemo, useState } from 'react';
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
        <section className={s.carte}>
          <h2 className={s.carteTitre}>
            Semaine {etat.semaine} · {phase.name}
          </h2>
          <p className={s.carteTexte}>{phase.objective}</p>
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

  return (
    <div className={s.page}>
      <Bandeau
        surTitre="Programme"
        surTitreRose
        titre={`SEMAINE ${etat.semaine}`}
        taille="xl"
        sousTitre={`Phase ${phase.id} · ${phase.name}`}
      />

      <div className={s.semaines}>
        {WEEKS.map((w) => (
          <button
            key={w}
            type="button"
            className={`${s.sem} ${w === etat.semaine ? s.semActive : ''}`}
            onClick={() => onSemaine(w)}
            aria-current={w === etat.semaine ? 'true' : undefined}
          >
            {w}
          </button>
        ))}
      </div>

      <div className={s.corps}>
        <section className={s.carte}>
          <h2 className={`${s.carteTitre} ${s.carteTitreIcone}`}>
            <span className={s.icoRose}>
              <Ico nom="cible" taille={37} />
            </span>
            Objectif de la semaine
          </h2>
          <p className={s.carteTexte}>{phase.objective}</p>
        </section>

        <section className={s.carte}>
          <p className={`${s.gros} ${s.grosCaps}`}>
            {seance.tours} tours × {seance.slots.length}
          </p>
          <p className={s.carteTexte}>
            {jours.length} séances de {phase.durationLabel}, repos {restLabel(seance.restSec)} entre
            les tours.
          </p>
        </section>

        <div className={s.lignes}>
          {jours.map((d, i) => (
            <button key={d} type="button" className={s.jour} onClick={() => onJour(d)}>
              <span className={s.jourCode}>{CODES[i]}</span>
              <span>
                <span className={s.jourNom}>{NOMS[i]}</span>
                <span className={s.jourDetail}>
                  Séance {i + 1} · {phase.durationLabel}
                </span>
              </span>
              {/* Faite, prévue (la prochaine à faire), ou à faire. */}
              {estFaite(donnees.seances, etat.semaine, d) ? (
                <span className={`${s.etat} ${s.etatFaite}`}>Faite</span>
              ) : estSautee(donnees.seances, etat.semaine, d) ? (
                <span className={`${s.etat} ${s.etatSautee}`}>Non faite</span>
              ) : prochaine?.semaine === etat.semaine && prochaine.jour === d ? (
                <span className={`${s.etat} ${s.etatPrevu}`}>Prévue</span>
              ) : (
                <span className={s.etat}>À faire</span>
              )}
              <span className={s.jourChevron}>
                <Ico nom="chevron" taille={22} />
              </span>
            </button>
          ))}
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
