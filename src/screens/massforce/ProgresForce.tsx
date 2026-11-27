/**
 * MASS FORCE — l'onglet Progrès (maquette validée par Guillaume le 27
 * novembre, « go code progrès FORCE »).
 *
 * Une carte par mouvement du combiné : la référence, la cible de la
 * prochaine séance, la fourchette, un graphique (une séance = un point en %
 * du 1RM, dans la bande de la fourchette) et la liste des séances faites.
 * Les chiffres viennent de `progresForce` (pur) : les mêmes que la séance.
 */
import { useEffect, useState } from 'react';
import { ScreenHeader } from '../../components/ScreenHeader';
import { enteteDe } from '../../data/famillesVisuel';
import { DAY_LABELS_SHORT, type DayIndex } from '../../data/types';
import type { ChargeCible } from '../../engine/getSession';
import { allSets, cycleActif } from '../../db/repo';
import { toutesLesReferences } from '../../db/references';
import {
  progresForce,
  type MouvementProgres,
  type ResultatSeance,
  type SeanceProgres,
} from '../../programmes/massforce/progres';
import styles from './ProgresForce.module.css';

const nombre = (x: number) => x.toLocaleString('fr-FR', { maximumFractionDigits: 1 });

function dateEnMots(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  });
}

const RESULTAT: Record<ResultatSeance, string> = {
  reussie: 'réussie',
  echec: 'échec',
  incomplete: 'incomplète',
  'sous-cible': 'sous la cible',
  'sans-cible': '',
};

const quand = (s: SeanceProgres) =>
  `S${String(s.semaine)} · ${DAY_LABELS_SHORT[s.jour as DayIndex].toLowerCase()}`;

function detail(s: SeanceProgres): string {
  const charge = s.kg === null ? 'charge non saisie' : `${nombre(s.kg)} kg`;
  const memes = s.reps.every((r) => r === s.reps[0]);
  const reps =
    s.reps.length === 0
      ? ''
      : memes
        ? `${String(s.series)} × ${String(s.reps[0])}`
        : s.reps.join(' · ');
  const ratees =
    s.ratees === 0 ? '' : `, ${String(s.ratees)} ${s.ratees > 1 ? 'reps ratées' : 'rep ratée'}`;
  return `${charge} · ${reps}${ratees}`;
}

function sousTitre(m: MouvementProgres): string {
  const r = m.reference;
  if (r === null) return `${m.materiel} · pas encore testé au combiné`;
  if (r.modalite === 'direct')
    return `${m.materiel} · 1RM mesuré ${nombre(r.chargeKg)} kg le ${dateEnMots(r.date)}`;
  return `${m.materiel} · test sous-maximal : ${nombre(r.chargeKg)} kg × ${String(r.reps)}`;
}

/** La cible de la prochaine séance, ou ce qui manque pour la calculer. */
function Cible({ m }: { m: MouvementProgres }) {
  if (m.cycleTermine)
    return <p className={styles.vide}>Les 4 semaines sont faites pour ce mouvement.</p>;
  const c: ChargeCible | null = m.prochaine;
  if (c === null || c.kind === 'a-determiner') return null;
  if (c.kind === 'calculee')
    return (
      <div className={styles.cible} data-cible>
        <span>{m.premiere ? 'Première séance' : 'Prochaine séance'}</span>
        <b className="tnum">
          {nombre(c.kgCible)} kg · {nombre(c.pctCible)} %
        </b>
      </div>
    );
  if (c.kind === 'suspendue') return <p className={styles.vide}>{c.motif}</p>;
  return (
    <p className={styles.vide}>
      Pas de 1RM mesuré : pas de charge en %. Un test direct au combiné l’ouvrira.
    </p>
  );
}

/** Une séance = un point, en % du 1RM, dans la bande de la fourchette. */
function Graphique({ m }: { m: MouvementProgres }) {
  const f = m.fourchette;
  const points = m.seances.filter((s) => s.pctReel !== null);
  if (f === null || points.length === 0) return null;
  const bas = Math.min(f.min, ...points.map((p) => p.pctReel as number)) - 1;
  const haut = Math.max(f.max, ...points.map((p) => p.pctReel as number)) + 1;
  const L = 340;
  const X0 = 48;
  const Y0 = 12;
  const H = 80;
  const y = (pct: number) => Y0 + ((haut - pct) / (haut - bas)) * H;
  // Les points restent loin des bords : leur légende (« S3 · lun ») tient.
  const gauche = X0 + 26;
  const droite = L - 30;
  const pas = (droite - gauche) / Math.max(1, points.length - 1);
  const x = (i: number) => (points.length === 1 ? (gauche + droite) / 2 : gauche + i * pas);
  return (
    <svg
      className={styles.graphique}
      viewBox={`0 0 ${String(L)} 122`}
      role="img"
      aria-label={`Tes séances en % de ton 1RM, dans la fourchette ${nombre(f.min)} à ${nombre(f.max)} %`}
    >
      <rect
        className={styles.bande}
        x={X0}
        y={y(f.max)}
        width={L - X0}
        height={y(f.min) - y(f.max)}
        rx="6"
      />
      <text className={styles.axe} x={X0 - 6} y={y(f.max) + 4} textAnchor="end">
        {nombre(f.max)} %
      </text>
      <text className={styles.axe} x={X0 - 6} y={y(f.min) + 4} textAnchor="end">
        {nombre(f.min)} %
      </text>
      {points.length > 1 && (
        <polyline
          className={styles.trace}
          points={points
            .map((p, i) => `${String(x(i))},${String(y(p.pctReel as number))}`)
            .join(' ')}
        />
      )}
      {points.map((p, i) => (
        <g key={`${String(p.semaine)}-${String(p.jour)}`}>
          <circle
            className={styles.point}
            data-resultat={p.resultat}
            cx={x(i)}
            cy={y(p.pctReel as number)}
            r="7"
          />
          <text className={styles.axe} x={x(i)} y="116" textAnchor="middle">
            {quand(p)}
          </text>
        </g>
      ))}
    </svg>
  );
}

function Carte({ m }: { m: MouvementProgres }) {
  return (
    <section className={styles.carte} aria-label={m.nom} data-mouvement={m.cle}>
      <h2 className={styles.nom}>{m.nom}</h2>
      <p className={styles.materiel}>{sousTitre(m)}</p>
      <Cible m={m} />
      {m.fourchette === null ? (
        <p className={styles.ligne}>
          <span>Fourchette du programme</span>
          <b>aucune</b>
        </p>
      ) : (
        <p className={styles.ligne}>
          <span>Fourchette du programme</span>
          <b className="tnum">
            {nombre(m.fourchette.min)} – {nombre(m.fourchette.max)} %
          </b>
        </p>
      )}
      <Graphique m={m} />
      {m.seances.length === 0 ? (
        <p className={styles.vide}>
          Aucune séance faite. Chaque séance s’ajoutera ici, avec sa charge et son résultat.
        </p>
      ) : (
        <ul className={styles.seances}>
          {m.seances.map((s) => (
            <li key={`${String(s.semaine)}-${String(s.jour)}`}>
              <i>{quand(s)}</i>
              <span>{detail(s)}</span>
              <em data-resultat={s.resultat}>
                {s.resultat === 'sans-cible'
                  ? s.rir === null
                    ? ''
                    : `RIR ${String(s.rir)}`
                  : RESULTAT[s.resultat]}
              </em>
            </li>
          ))}
        </ul>
      )}
      <p className={styles.note}>
        {m.fourchette === null
          ? 'Le programme ne donne pas de % pour ce mouvement : seules tes charges réelles.'
          : 'Bande rouge : la fourchette du programme. Un point par séance, en % de ton 1RM : vert réussie, rouge échec.'}
      </p>
    </section>
  );
}

export function ProgresForce({ mouvements }: { mouvements: readonly MouvementProgres[] }) {
  return (
    <div className={styles.cartes}>
      {mouvements.map((m) => (
        <Carte key={m.cle} m={m} />
      ))}
    </div>
  );
}

export function ProgresForceScreen({ programmeId }: { programmeId: string }) {
  const bandeau = enteteDe(programmeId, 'progres');
  const [mouvements, setMouvements] = useState<MouvementProgres[] | null>(null);
  useEffect(() => {
    void (async () => {
      const [cycle, series, references] = await Promise.all([
        cycleActif(),
        allSets(),
        toutesLesReferences(),
      ]);
      setMouvements(progresForce({ choix: cycle?.massForce?.choix, references, series }));
    })();
  }, []);
  return (
    <div className={styles.screen}>
      <ScreenHeader
        eyebrow="MASS FORCE"
        title="Progrès"
        subtitle="Tes 4 mouvements du combiné"
        {...(bandeau === undefined ? {} : { visuel: bandeau })}
      />
      {mouvements === null ? (
        <p className={styles.vide}>Chargement…</p>
      ) : (
        <ProgresForce mouvements={mouvements} />
      )}
    </div>
  );
}
