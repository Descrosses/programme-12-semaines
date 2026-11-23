/**
 * L'écran Semaine FEMMES, planche « Rosée Sculptée » (lot 1/6, 23 novembre).
 *
 * La planche montre des exemples de POWER (« Bloc Congestion », « Jambes &
 * Fessiers », cinq séances « Faite », un dimanche). L'écran, lui, doit
 * rester branché sur le programme FEMMES : phases, jours, tours et états
 * RÉELS. Ces tests tombent si un texte de la planche est recopié, ou si un
 * état est figé.
 */
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { FemmesSeanceRow } from '../../db/db';
import { PHASES, phaseOf } from '../../data/femmes/phases';
import { WEEKS, type WeekIndex } from '../../data/femmes/types';
import { avancement } from '../../engine/femmes/avancement';
import { getSession } from '../../engine/femmes/getSession';
import { EMPTY_CONTEXT } from '../../engine/femmes/types';
import { ETAT_INITIAL, FemmesSemaine } from './FemmesScreens';

const ligne = (
  semaine: number,
  jour: 0 | 1 | 2 | 3,
  date: string,
  o: Partial<FemmesSeanceRow> = {},
): FemmesSeanceRow =>
  ({ cycleId: 1, semaine, jour, version: 'maison', date, terminee: true, ...o }) as FemmesSeanceRow;

/* S1 faite en entier ; S2 : lundi fait, mercredi passé sans être fait. */
const SEANCES = [
  ligne(1, 0, '2026-11-02'),
  ligne(1, 1, '2026-11-04'),
  ligne(1, 2, '2026-11-06'),
  ligne(2, 0, '2026-11-09'),
  ligne(2, 1, '2026-11-11', { terminee: false, sautee: true }),
];

function ecran(semaine: WeekIndex, seances: FemmesSeanceRow[] = SEANCES) {
  const html = renderToStaticMarkup(
    <FemmesSemaine
      etat={{ ...ETAT_INITIAL, semaine }}
      donnees={{
        ctx: EMPTY_CONTEXT,
        seances,
        avance: avancement(seances),
        depuis: '2026-11-02',
      }}
      onSemaine={() => {}}
      onJour={() => {}}
      onAller={() => {}}
    />,
  );
  // Les lignes de séance, dans l'ordre : leur texte seul.
  const lignes = [...html.matchAll(/aria-label="[^"]*, séance \d"[^>]*>(.*?)<\/button>/g)].map(
    (m) =>
      m[1]!
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim(),
  );
  return { html, lignes };
}

describe('écran Semaine FEMMES — branché sur le programme, pas sur la planche', () => {
  it('les états sont les VRAIS : faite, non faite, prévue, à faire', () => {
    const s2 = ecran(2).lignes;
    expect(s2).toHaveLength(3);
    expect(s2[0]).toMatch(/^LUN Séance 1 ≈ 20 min · 9 novembre Faite$/);
    expect(s2[1]).toMatch(/^MER Séance 2 ≈ 20 min · 11 novembre Non faite$/);
    expect(s2[2]).toMatch(/^VEN Séance 3 ≈ 20 min Prévue$/);
    // Une semaine à venir : tout est « À faire », sans date.
    for (const l of ecran(6).lignes) expect(l).toMatch(/Séance \d ≈ 35-45 min À faire$/);
  });

  it('la date ne s’écrit qu’une fois la séance faite ou passée (aucune date prévue)', () => {
    const vide = ecran(1, []).lignes;
    expect(vide[0]).toMatch(/Prévue$/);
    for (const l of vide) expect(l).not.toMatch(/novembre|septembre/);
  });

  it('trois séances en phase 1, quatre ensuite — jamais de dimanche', () => {
    expect(ecran(1).lignes.map((l) => l.slice(0, 3))).toEqual(['LUN', 'MER', 'VEN']);
    expect(ecran(3).lignes.map((l) => l.slice(0, 3))).toEqual(['LUN', 'MER', 'VEN', 'SAM']);
    for (const w of WEEKS) expect(ecran(w).html).not.toMatch(/>DIM</);
  });

  it('le bandeau et la carte disent la phase, ses tours, son repos et son objectif', () => {
    for (const w of [1, 4, 7] as WeekIndex[]) {
      const { html } = ecran(w);
      const p = phaseOf(w);
      const se = getSession(w, 0, 'maison', EMPTY_CONTEXT, ETAT_INITIAL.niveau);
      expect(html).toContain(`Phase ${p.id} · ${p.name}`);
      expect(html).toContain(`SEMAINE ${w}`);
      expect(html).toContain(`${se.tours} tours × ${se.slots.length}`);
      expect(html).toContain(p.objective.replace(/’/g, '&#x27;').replace(/'/g, '&#x27;'));
    }
  });

  it('huit cases de semaine, chacune avec le nom de SA phase, une seule choisie', () => {
    const { html } = ecran(4);
    const cases = [...html.matchAll(/aria-label="Semaine (\d), phase (\d) · ([^"]+)"/g)];
    expect(cases.map((c) => Number(c[1]))).toEqual([...WEEKS]);
    for (const c of cases) expect(c[3]).toBe(PHASES[Number(c[2]) as 1 | 2 | 3].name);
    expect(html.match(/aria-current="true"/g)).toHaveLength(1);
    expect(html).toMatch(/aria-current="true"[^>]*aria-label="Semaine 4,/);
  });

  it('aucun texte de la planche n’est recopié', () => {
    for (const w of WEEKS) {
      const { html } = ecran(w);
      for (const exemple of [
        'Congestion',
        'Deload',
        'Jambes',
        'Fessiers',
        'Full Body',
        'Tonification',
        '71-79',
        'septembre',
      ]) {
        expect({ w, exemple, present: html.includes(exemple) }).toEqual({
          w,
          exemple,
          present: false,
        });
      }
    }
  });
});
