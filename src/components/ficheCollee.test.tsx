/**
 * « Fiche collée » (Guillaume, 26 novembre) : dans un superset, un tri-set ou
 * un circuit, la fiche d'un mouvement est dans le tour EN COURS, juste
 * au-dessus des boutons de saisie de ce mouvement — plus empilée en tête de
 * bloc, loin des séries. Ces tests figent :
 * - l'image est dans le tour en cours, une fois par station, et nulle part
 *   ailleurs ; le tour fait, elle passe au suivant ; le bloc fini, elle
 *   reste au dernier ;
 * - dans la station : nom, puis fiche, puis boutons ;
 * - une station sans fiche n'a pas de cadre vide ;
 * - la carte du haut du bloc ne garde que « Ajouter la fiche technique ».
 *
 * Valable pour tous les programmes : `SupersetCard` est partagé par POWER,
 * MASS et les programmes importés.
 */
import 'fake-indexeddb/auto';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { SetRow } from '../db/db';
import type { ResolvedExercise } from '../engine/getSession';
import { groupSupersets, type Circuit } from '../engine/superset';
import { EMPTY_CONTEXT } from '../engine/types';
import { moduleParId } from '../programmes/registre';
import type { RestTimer } from '../state/useRestTimer';
import { FicheTechnique } from './FicheTechnique';
import { SupersetCard } from './SupersetCard';

const timer = { state: null, start: () => {} } as unknown as RestTimer;

/** Le superset de tronc du lundi S11 : Ab Wheel + Roman Side Bench, deux planches. */
const lundi = moduleParId('power12')!.getSession(11, 0, EMPTY_CONTEXT)!;
const circuit = groupSupersets(lundi.exercises).find(
  (b): b is Circuit => b.kind === 'circuit' && b.exs.some((e) => e.id === 'roman-side-bench'),
)!;

const bloc = (c: Circuit, savedSets: Record<string, SetRow[]> = {}) =>
  renderToStaticMarkup(
    <SupersetCard
      circuit={c}
      week={11}
      day={0}
      savedSets={savedSets}
      overrides={{}}
      timer={timer}
      onSaveSet={async () => {}}
      fiches={<p>CARTES-DU-BLOC</p>}
    />,
  );

/** Les séries validées des `n` premiers tours, pour chaque station. */
const faits = (c: Circuit, n: number) =>
  Object.fromEntries(
    c.exs.map((e) => [
      e.id,
      Array.from({ length: n }, (_, i) => ({ exerciseId: e.id, setIndex: i }) as SetRow),
    ]),
  );

/** Les positions des planches dans le HTML. */
const planches = (html: string) =>
  [...html.matchAll(/src="[^"]*power12-(ab-wheel|roman-side-bench)\.webp"/g)].map((m) => ({
    nom: m[1]!,
    at: m.index,
  }));

describe('fiche collée : la planche dans le tour en cours', () => {
  it('le superset a bien deux stations à planche, et plusieurs tours', () => {
    expect(circuit.exs.map((e) => e.def.fiche !== undefined)).toEqual([true, true]);
    expect(circuit.tours).toBeGreaterThanOrEqual(2);
  });

  it('au départ : une planche par station, toutes dans le tour 1, après les cartes du bloc', () => {
    const html = bloc(circuit);
    const p = planches(html);
    expect(p.map((x) => x.nom).sort()).toEqual(['ab-wheel', 'roman-side-bench']);
    for (const x of p) {
      expect(x.at).toBeGreaterThan(html.indexOf('CARTES-DU-BLOC'));
      expect(x.at).toBeGreaterThan(html.indexOf('Tour 1 sur'));
      expect(x.at).toBeLessThan(html.indexOf('Tour 2 sur'));
    }
  });

  it('collée aux boutons : nom de la station, puis planche, puis « Valider »', () => {
    const html = bloc(circuit);
    for (const ex of circuit.exs) {
      const nom = html.indexOf(`</span>${ex.name}</div>`);
      // `src=` : React 19 précharge aussi les images en tête (`<link href=`).
      const planche = html.indexOf(`src="/${ex.def.fiche!}"`);
      const valider = html.indexOf('Valider', planche);
      expect(nom).toBeGreaterThan(-1);
      expect(planche).toBeGreaterThan(nom);
      // Rien d'autre qu'elle entre la planche et les boutons de sa station.
      expect(html.slice(planche, valider)).not.toContain('_stationNom_');
    }
  });

  it('le tour 1 fait, elle passe au tour 2 ; le bloc fini, elle reste au dernier', () => {
    const apres1 = bloc(circuit, faits(circuit, 1));
    for (const x of planches(apres1)) expect(x.at).toBeGreaterThan(apres1.indexOf('Tour 2 sur'));
    expect(planches(apres1)).toHaveLength(2);

    const fini = bloc(circuit, faits(circuit, circuit.tours));
    const dernier = fini.indexOf(`Tour ${String(circuit.tours)} sur`);
    expect(planches(fini)).toHaveLength(2);
    for (const x of planches(fini)) expect(x.at).toBeGreaterThan(dernier);
  });

  it('une station sans fiche n’a pas de cadre vide, ni de bouton d’ajout dans le tour', () => {
    const sansFiche = circuit.exs.map((e) => ({ ...e, def: { ...e.def, fiche: undefined } }));
    const html = bloc({ ...circuit, exs: sansFiche as ResolvedExercise[] });
    expect(html).not.toContain('_fiche_');
    expect(html).not.toContain('Ajouter la fiche technique');
  });
});

describe('les trois manières d’afficher une fiche', () => {
  const ab = circuit.exs[0]!.def;
  const sans = { ...ab, fiche: undefined };
  const rendu = (def: typeof ab, affichage?: 'image' | 'ajout') =>
    renderToStaticMarkup(
      <FicheTechnique
        def={def}
        version={0}
        onAjouter={() => {}}
        {...(affichage === undefined ? {} : { affichage })}
      />,
    );

  it('complète (carte seule) : la planche, sinon le bouton d’ajout — comme avant', () => {
    expect(rendu(ab)).toContain('power12-ab-wheel.webp');
    expect(rendu(sans)).toContain('Ajouter la fiche technique');
  });

  it('« image » (station) : la planche, sinon RIEN', () => {
    expect(rendu(ab, 'image')).toContain('power12-ab-wheel.webp');
    expect(rendu(sans, 'image')).toBe('');
  });

  it('« ajout » (carte du haut du bloc) : jamais l’image', () => {
    expect(rendu(ab, 'ajout')).toBe('');
    // Sans fiche connue d'avance, il attend la base avant de proposer l'ajout.
    expect(rendu(sans, 'ajout')).toBe('');
  });

  it('la carte d’un bloc prend « ajout » ; une carte seule reste « complète »', () => {
    const carte = readFileSync(new URL('./ExerciseCard.tsx', import.meta.url), 'utf8');
    expect(carte).toMatch(/\{\.\.\.\(hideSets \? \{ affichage: 'ajout' as const \} : \{\}\)\}/);
    // Déposer une fiche la fait relire partout où elle est montrée.
    expect(carte).toMatch(/annoncerFicheChangee\(ex\.def\.id\)/);
  });
});
