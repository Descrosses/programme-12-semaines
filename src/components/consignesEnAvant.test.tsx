/**
 * MASS CONGESTION — les consignes d'exécution en tête de carte (Guillaume,
 * 27 novembre : « c'est la bonne exécution des consignes qui fait que le
 * programme est bon […] il ne se voit pas assez »).
 *
 * Ce que ces tests figent : l'encadré est TOUJOURS visible (aucun tiroir à
 * ouvrir), il dit le texte du document mot pour mot, une consigne qui répète
 * la technique n'est dite qu'une fois, le tiroir ne répète pas l'encadré, et
 * ni POWER ni MASS FORCE ne bougent.
 */
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { DayIndex } from '../data/types';
import type { SetRow } from '../db/db';
import type { ResolvedExercise } from '../engine/getSession';
import { EMPTY_CONTEXT } from '../engine/types';
import { EXERCICES_MASS4, TECHNIQUES } from '../programmes/mass4/exercices';
import { moduleParId } from '../programmes/registre';
import type { RestTimer } from '../state/useRestTimer';
import { ExerciseCard } from './ExerciseCard';

const timer = { state: null, start: () => {} } as unknown as RestTimer;

const exercices = (id: string, week: number, jours: DayIndex[]) =>
  jours.flatMap((d) => moduleParId(id)!.getSession(week, d, EMPTY_CONTEXT)?.exercises ?? []);

const carte = (ex: ResolvedExercise) =>
  renderToStaticMarkup(
    <ExerciseCard
      ex={ex}
      savedSets={[]}
      overrideKg={null}
      timer={timer}
      history={undefined}
      media={null}
      note={{ week: 1, day: 0, date: '' }}
      onSaveSet={async () => {}}
      onOverride={() => {}}
    />,
  );

const mass4 = exercices('mass4', 1, [0, 1, 3, 5]);
const trouve = (id: string) => mass4.find((e) => e.id === id)!;

describe('CONGESTION — consignes d’exécution en tête de carte', () => {
  it('chaque mouvement qui a une consigne ou une technique porte l’encadré, visible sans rien ouvrir', () => {
    const avec = mass4.filter(
      // La 4e série facultative n'est pas une consigne d'exécution : elle
      // reste dans le tiroir.
      (e) =>
        EXERCICES_MASS4[e.id]?.consigne !== undefined ||
        e.notes.some((n) => Object.values(TECHNIQUES).includes(n)),
    );
    expect(avec.length).toBeGreaterThan(15);
    for (const e of avec) {
      const h = carte(e);
      expect(h, e.id).toContain('data-consignes-en-avant');
      expect(h, e.id).toContain('Consignes d’exécution');
      // Avant les séries : lu avant la première série.
      expect(h.indexOf('data-consignes-en-avant'), e.id).toBeLessThan(h.indexOf('Valider'));
    }
  });

  it('mot pour mot : la frise des séries, puis la consigne du mouvement', () => {
    const e = trouve('oiseau-machine');
    const h = carte(e);
    // Le texte de la technique est COUPÉ, jamais réécrit : recollé, il
    // redonne la phrase du document au caractère près.
    const etapes = e.def.etapesExecution!;
    expect(etapes.mode).toBe('series');
    expect(etapes.etapes.map((x) => `${x.titre!} : ${x.texte}`).join(' ')).toBe(
      TECHNIQUES['trois-series'],
    );
    expect(h.indexOf('Série 1')).toBeLessThan(h.indexOf('Reverse pec deck.'));
    expect(h).toContain('data-etapes="series"');
  });

  it('variante C : la série en cours s’allume, les faites sont cochées', () => {
    const e = trouve('oiseau-machine');
    const avant = carte(e);
    expect(avant.match(/data-etat="en-cours"/g)).toHaveLength(1);
    expect(avant).toContain('Série 1 — maintenant');
    expect(avant.match(/data-etat="a-venir"/g)).toHaveLength(2);
    const apres = renderToStaticMarkup(
      <ExerciseCard
        ex={e}
        savedSets={[{ exerciseId: e.id, setIndex: 0 } as SetRow]}
        overrideKg={null}
        timer={timer}
        history={undefined}
        media={null}
        note={{ week: 1, day: 0, date: '' }}
        onSaveSet={async () => {}}
        onOverride={() => {}}
      />,
    );
    expect(apres).toContain('Série 1 — faite');
    expect(apres).toContain('Série 2 — maintenant');
    expect(apres).toContain('aria-current="step"');
  });

  it('dégressives : deux temps coupés devant « puis aussitôt », sans série allumée', () => {
    for (const id of ['developpe-militaire-smith', 'elevations-laterales']) {
      const e = trouve(id);
      const etapes = e.def.etapesExecution!;
      expect(etapes.mode, id).toBe('temps');
      expect(etapes.etapes).toHaveLength(2);
      expect(etapes.etapes[1]!.texte.startsWith('puis aussitôt'), id).toBe(true);
      expect(etapes.etapes.map((x) => x.texte).join(', '), id).toBe(e.def.consignesEnAvant![0]);
      const h = carte(e);
      expect(h, id).not.toContain('data-etat="en-cours"');
      expect(h, id).toContain('data-etapes="temps"');
    }
  });

  it('séries droites et superset : pas de frise, l’encadré simple', () => {
    for (const e of mass4.filter((x) => x.def.consignesEnAvant !== undefined)) {
      const techniqueAEtapes = e.notes.some(
        (n) =>
          n === TECHNIQUES['trois-series'] ||
          n === TECHNIQUES['lourde-degressive'] ||
          n === TECHNIQUES['degressive-max'],
      );
      expect(e.def.etapesExecution !== undefined, e.id).toBe(techniqueAEtapes);
    }
  });

  it('une consigne qui répète la technique (dégressive) n’est dite qu’une fois', () => {
    const e = trouve('developpe-militaire-smith');
    expect(e.def.consignesEnAvant).toEqual([TECHNIQUES['lourde-degressive']]);
    expect(carte(e).match(/6 reps lourdes/g)).toHaveLength(1);
  });

  it('le tiroir « Consignes » ne répète pas l’encadré (il disparaît s’il n’a plus rien)', () => {
    for (const e of mass4) {
      const enAvant = e.def.consignesEnAvant ?? [];
      const tiroir = e.notes.filter((n) => !enAvant.includes(n));
      const intent = e.def.intent !== undefined && !enAvant.includes(e.def.intent);
      const h = carte(e);
      expect(h.includes('>Consignes</button>'), e.id).toBe(tiroir.length > 0 || intent);
    }
  });

  it('POWER et MASS FORCE : aucune carte ne change', () => {
    const autres = [
      ...exercices('power12', 1, [0, 1, 2, 3, 4, 5, 6]),
      ...exercices('mass-force', 1, [0, 1, 3, 4]),
    ];
    expect(autres.length).toBeGreaterThan(30);
    for (const e of autres) {
      expect(e.def.consignesEnAvant, e.id).toBeUndefined();
      expect(carte(e), e.id).not.toContain('data-consignes-en-avant');
    }
  });

  it('le style fort est confiné à la séance MASS (bord bordeaux, halo)', () => {
    const css = readFileSync(new URL('../screens/Session.module.css', import.meta.url), 'utf8');
    expect(css).toMatch(
      /:global\(\[data-theme='mass'\]\) \.ecranSeance \.consignesEnAvant \{[^}]*border: 2px solid var\(--mass-rouge\)[^}]*box-shadow: var\(--mass-halo-action\)/,
    );
  });
});
