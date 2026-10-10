/**
 * Vue d'ensemble du poids sur les douze semaines.
 *
 * Existait déjà : la carte de tendance de l'onglet Nutrition, qui compare les
 * sept derniers jours aux sept précédents. Elle répond à « est-ce que je mange
 * assez cette semaine ? ». Elle ne répond pas à « où j'en suis depuis le
 * combine ? », et c'est à ça que sert cet écran.
 *
 * Rien n'est interprété ici. Le .md ne donne qu'une cible de poids (§13) ;
 * aucun seuil de « trop vite » ou de « pas assez » n'est inventé — celui qui
 * existe vit dans `nutritionAdvice`, avec les règles du .md derrière.
 *
 * Aucune migration de base : tout vient de la table `measurements` déjà
 * remplie par l'onglet Nutrition, déjà incluse dans l'export JSON.
 */

import { useEffect, useMemo, useState } from 'react';
import { WeightChart, WaistChart } from './WeightChart';
import { BANDE_CIBLE_POIDS, BLOCKS, WEEK_BLOCKS, type Block, type WeekIndex } from '../data/program';
import { fr } from '../engine/format';
import type { Measurement } from '../engine/nutrition';
import {
  fenetre,
  PERIODES,
  resumePoids,
  semainesDuProgramme,
  type Periode,
} from '../engine/weightHistory';
import { allMeasurements, getSettingsRow } from '../db/repo';
import styles from '../screens/Screens.module.css';
import local from './WeightOverview.module.css';

/** Les blocs dans l'ordre où le programme les traverse, pour la légende. */
const BLOCS_LEGENDE: Block[] = [...new Set(Object.values(WEEK_BLOCKS))];

export function WeightOverview() {
  const [entries, setEntries] = useState<Measurement[] | null>(null);
  const [startDate, setStartDate] = useState('');
  const [periode, setPeriode] = useState<Periode>('12s');

  const todayIso = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    void (async () => {
      const [rows, settings] = await Promise.all([allMeasurements(), getSettingsRow()]);
      setEntries(
        rows.map((r) => ({ date: r.date, weightKg: r.weightKg, waistCm: r.waistCm })),
      );
      setStartDate(settings.startDate);
    })();
  }, []);

  const vue = useMemo(() => {
    if (!entries) return null;
    const ancre = startDate || null;
    return {
      cadre: { ...fenetre(periode, todayIso, entries, ancre), startDate: ancre },
      resume: startDate
        ? resumePoids(entries, startDate, todayIso)
        : { depart: null, actuel: null, ecartTotal: null },
      semaines: startDate ? semainesDuProgramme(entries, startDate, todayIso) : [],
    };
  }, [entries, startDate, periode, todayIso]);

  if (!entries || !vue) return <p className={local.vide}>Chargement…</p>;

  return (
    <>
      {/* --- Les trois chiffres, en gros ------------------------------------ */}
      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Poids de corps</h2>
        <p className={styles.cardSub}>
          Cible du programme : {fr(BANDE_CIBLE_POIDS.min)} à {fr(BANDE_CIBLE_POIDS.max)} kg.
        </p>
        <div className={local.chiffres}>
          <Chiffre label="Départ (combine)" valeur={vue.resume.depart} unite="kg" />
          <Chiffre label="Moyenne 7 jours" valeur={vue.resume.actuel} unite="kg" />
          <Chiffre label="Écart total" valeur={vue.resume.ecartTotal} unite="kg" signe />
        </div>
        {!startDate && (
          <p className={styles.cardSub}>
            Règle la date de début du programme dans Réglages pour voir les semaines.
          </p>
        )}
      </section>

      {/* --- Le sélecteur de période --------------------------------------- */}
      <div className={local.periodes} role="group" aria-label="Période affichée">
        {PERIODES.map((p) => (
          <button
            key={p.cle}
            type="button"
            className={`${local.periode} ${periode === p.cle ? local.periodeOn : ''}`}
            onClick={() => setPeriode(p.cle)}
            aria-pressed={periode === p.cle}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* --- Le graphique -------------------------------------------------- */}
      <section className={styles.card}>
        <WeightChart entries={entries} cadre={vue.cadre} bande={BANDE_CIBLE_POIDS} />
        {startDate && (
          <div className={local.blocs}>
            {BLOCS_LEGENDE.map((b) => (
              <span key={b} className={local.bloc}>
                <span className={local.blocPastille} style={{ background: BLOCKS[b].color }} />
                {BLOCKS[b].short}
              </span>
            ))}
          </div>
        )}
      </section>

      {/* --- Le tour de taille, même axe du temps, pas de second axe Y ------ */}
      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Tour de taille</h2>
        <p className={styles.cardSub}>En cm, sur la même période.</p>
        <WaistChart entries={entries} cadre={vue.cadre} />
      </section>

      {/* --- Le tableau semaine par semaine -------------------------------- */}
      {vue.semaines.length > 0 && (
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Semaine par semaine</h2>
          <p className={styles.cardSub}>
            Moyenne des pesées de la semaine. Une semaine sans pesée affiche « — ».
          </p>
          <div className={local.tableWrap}>
            <table className={local.table}>
              <thead>
                <tr>
                  <th scope="col">Sem.</th>
                  <th scope="col">Poids</th>
                  <th scope="col">Écart</th>
                  <th scope="col">Pesées</th>
                  <th scope="col">Taille</th>
                </tr>
              </thead>
              <tbody>
                {[...vue.semaines].reverse().map((s) => (
                  <tr key={s.week}>
                    <th scope="row" className={local.sem}>
                      <span
                        className={local.semTrait}
                        style={{ background: BLOCKS[WEEK_BLOCKS[s.week as WeekIndex]].color }}
                      />
                      {s.week === 0 ? 'Comb.' : `S${s.week}`}
                    </th>
                    <td>{s.moyenne === null ? '—' : `${fr(s.moyenne)} kg`}</td>
                    <td className={local.ecart}>{s.ecart === null ? '—' : signe(s.ecart)}</td>
                    <td>{s.pesees === 0 ? '—' : s.pesees}</td>
                    <td>{s.tourDeTaille === null ? '—' : `${fr(s.tourDeTaille)} cm`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}

/** Un des trois chiffres de l'en-tête. « — » et jamais 0 quand rien n'est su. */
function Chiffre({
  label,
  valeur,
  unite,
  signe: avecSigne = false,
}: {
  label: string;
  valeur: number | null;
  unite: string;
  signe?: boolean;
}) {
  return (
    <div className={local.chiffre}>
      <div className={local.chiffreValeur}>
        {valeur === null ? '—' : avecSigne ? signe(valeur) : fr(valeur)}
      </div>
      <div className={local.chiffreUnite}>{valeur === null ? '' : unite}</div>
      <div className={local.chiffreLabel}>{label}</div>
    </div>
  );
}

/** « +1,2 », « −0,4 », « 0 » — le signe est l'information, il reste visible. */
function signe(n: number): string {
  if (n === 0) return '0';
  return n > 0 ? `+${fr(n)}` : `−${fr(Math.abs(n))}`;
}

/*
 * Pas de vert ni de rouge sur l'écart : ce serait un jugement. Prendre du poids
 * est l'objectif du programme, et une baisse en semaine de deload est normale.
 * Le signe suffit à dire la direction ; le .md ne dit pas si elle est bonne.
 */
