/**
 * MASS FORCE, lot 6 — la progression S1 → S4 (§1 ter du .md).
 *
 * Chaque anomalie corrigée a son scénario chiffré, puis les trois profils de
 * la simulation sont rejoués de bout en bout par le module, comme l'écran les
 * verrait.
 */
import { describe, expect, it } from 'vitest';
import type { ReferenceForceRow, SetRow } from '../../db/db';
import type { ChargeCible } from '../../engine/getSession';
import { EMPTY_CONTEXT } from '../../engine/types';
import { chargePour } from './charges';
import { MASS_FORCE } from './module';
import { conseilComplementaire, passagesDe, pctSuivant } from './progression';
import { SEANCES_FORCE } from './seances';

let horloge = 1000;
const tic = () => ++horloge;

const ref = (exercice: string, variante: string, chargeKg: number): ReferenceForceRow => ({
  id: tic(),
  exercice,
  variante,
  modalite: 'direct',
  chargeKg,
  reps: 1,
  date: '2026-11-01',
  programmeId: 'mass-force',
  cycleId: 1,
  note: '',
  creeLe: tic(),
});

/** Une séance : une ligne par série, avec la cible qu'elle portait. */
function seance(
  week: number,
  exerciseId: string,
  reps: (number | null)[],
  kg: number | null,
  o: { pct?: number; kgCible?: number; rir?: number | null; day?: number; ratee?: number } = {},
): SetRow[] {
  return reps.map((r, i) => ({
    cycleId: 1,
    sessionId: week,
    exerciseId,
    week,
    day: (o.day ?? 0) as 0,
    date: '2026-11-16',
    setIndex: i,
    plannedKg: null,
    plannedReps: null,
    targetRpeMin: null,
    targetRpeMax: null,
    targetRpeLabel: null,
    actualKg: kg,
    actualReps: r,
    actualRpe: null,
    measureValue: null,
    failed: o.ratee === i,
    secondReps: null,
    secondKg: null,
    doneAt: tic(),
    ...(o.pct === undefined ? {} : { pctPrescrit: o.pct, kgCible: o.kgCible ?? null }),
    ...(i === reps.length - 1 && o.rir != null ? { rirSaisi: o.rir } : {}),
  }));
}

const lignes = SEANCES_FORCE.flatMap((s) => s.lignes);
const ligne = (cle: string) => lignes.find((l) => l.cle === cle)!;
const bench = ligne('lun-developpe');
const barre = bench.options[0]!;
const smith = bench.options[1]!;
const tirage = ligne('mar-tirage');
const poulie = tirage.options[0]!;

/** La cible du développé couché barre pour la semaine `w`. */
const cible = (refs: ReferenceForceRow[], series: SetRow[], w: number) =>
  chargePour(bench, barre, refs, w, series);
const kgCible = (c: ChargeCible | null) => (c?.kind === 'calculee' ? c.kgCible : null);
const pctCible = (c: ChargeCible | null) => (c?.kind === 'calculee' ? c.pctCible : null);
const B = 'mf-developpe-couche-barre';
const cinq = [5, 5, 5, 5];

describe('correction 1 — séance sous la charge prescrite', () => {
  it('S2 prescrite à 77,5 kg, faite à 70 kg : S3 reste à 77,5 kg (et non 80)', () => {
    const refs = [ref('developpe-couche', 'barre', 100)];
    const series = [
      ...seance(1, B, cinq, 75, { pct: 75, kgCible: 75, rir: 2 }),
      ...seance(2, B, cinq, 70, { pct: 77.5, kgCible: 77.5, rir: 2 }),
    ];
    expect(kgCible(cible(refs, series, 3))).toBe(77.5);
    expect(cible(refs, series, 3)).toMatchObject({ motif: expect.stringMatching(/sous la cible/) });
  });

  it('tolérance de 2,5 points : 75 kg pour une cible à 77,5 % reste conforme', () => {
    const refs = [ref('developpe-couche', 'barre', 100)];
    const series = seance(1, B, cinq, 75, { pct: 77.5, kgCible: 77.5, rir: 2 });
    expect(pctCible(cible(refs, series, 2))).toBe(80);
  });

  it('charge non saisie : on ne peut pas juger, la cible reste la même', () => {
    const refs = [ref('developpe-couche', 'barre', 100)];
    const series = seance(1, B, cinq, null, { pct: 75, kgCible: 75, rir: 2 });
    expect(pctCible(cible(refs, series, 2))).toBe(75);
  });

  it('faire plus lourd que prévu n’accélère pas : 85 kg pour 75 % → 77,5 %', () => {
    const refs = [ref('developpe-couche', 'barre', 100)];
    const series = seance(1, B, cinq, 85, { pct: 75, kgCible: 75, rir: 3 });
    expect(pctCible(cible(refs, series, 2))).toBe(77.5);
  });
});

describe('correction 2 — nouveau 1RM en cours de cycle', () => {
  const avant = () => {
    const refs = [ref('developpe-couche', 'barre', 100)];
    const series = [
      ...seance(1, B, cinq, 75, { pct: 75, kgCible: 75, rir: 2 }),
      ...seance(2, B, cinq, 77.5, { pct: 77.5, kgCible: 77.5, rir: 2 }),
    ];
    return { refs, series };
  };

  it('plus haut (110) : l’ancre reste 100, S3 = 80 kg (et non 88)', () => {
    const { refs, series } = avant();
    refs.push(ref('developpe-couche', 'barre', 110));
    const c = cible(refs, series, 3);
    expect(c).toMatchObject({ kind: 'calculee', pctCible: 80, kgCible: 80 });
    expect(c).toMatchObject({ motif: expect.stringMatching(/prochain cycle/) });
  });

  it('plus bas (90) : appliqué tout de suite, S3 = 72 kg', () => {
    const { refs, series } = avant();
    refs.push(ref('developpe-couche', 'barre', 90));
    expect(cible(refs, series, 3)).toMatchObject({
      pctCible: 80,
      kgCible: 72,
      motif: expect.stringMatching(/plus bas/),
    });
  });

  it('l’ancre se relit exactement depuis les séances : 1RM 93, cible 69,75 kg', () => {
    const refs = [ref('developpe-couche', 'barre', 93)];
    const s1 = cible(refs, [], 1);
    expect(kgCible(s1)).toBeCloseTo(69.75, 10);
    const series = seance(1, B, cinq, 70, { pct: 75, kgCible: 69.75, rir: 2 });
    expect(kgCible(cible(refs, series, 2))).toBeCloseTo(72.075, 10);
  });
});

describe('correction 3 — échecs répétés', () => {
  it('deux échecs au bas : suspendu, puis un nouveau test repart du bas', () => {
    const refs = [ref('developpe-couche', 'barre', 100)];
    const series = [
      ...seance(1, B, [5, 5, 5, 4], 75, { pct: 75, kgCible: 75 }),
      ...seance(2, B, [5, 5, 4, 3], 75, { pct: 75, kgCible: 75 }),
    ];
    expect(cible(refs, series, 3)).toMatchObject({
      kind: 'suspendue',
      motif: expect.stringMatching(/réévaluer/),
    });
    refs.push(ref('developpe-couche', 'barre', 92));
    expect(cible(refs, series, 3)).toMatchObject({ kind: 'calculee', pctCible: 75, kgCible: 69 });
  });

  it('deux échecs à 80 % : −5 %, soit 75 %', () => {
    const refs = [ref('developpe-couche', 'barre', 100)];
    const series = [
      ...seance(1, B, [5, 5, 4, 4], 80, { pct: 80, kgCible: 80 }),
      ...seance(2, B, [5, 4, 4, 3], 80, { pct: 80, kgCible: 80 }),
    ];
    expect(pctCible(cible(refs, series, 3))).toBe(75);
  });

  it('un seul échec : même cible', () => {
    const refs = [ref('developpe-couche', 'barre', 100)];
    const series = seance(1, B, [5, 5, 5, 4], 75, { pct: 75, kgCible: 75 });
    expect(pctCible(cible(refs, series, 2))).toBe(75);
  });
});

describe('« Rep ratée » (P0-B) : une série marquée ratée est un échec', () => {
  it('4 × 5 complètes mais la dernière marquée ratée : même cible, motif « manquées »', () => {
    const refs = [ref('developpe-couche', 'barre', 100)];
    const series = seance(1, B, cinq, 75, { pct: 75, kgCible: 75, rir: 2, ratee: 3 });
    expect(cible(refs, series, 2)).toMatchObject({
      pctCible: 75,
      motif: expect.stringMatching(/manquées/),
    });
  });

  it('deux séances de suite avec une série ratée à 80 % : −5 %', () => {
    const refs = [ref('developpe-couche', 'barre', 100)];
    const series = [
      ...seance(1, B, cinq, 80, { pct: 80, kgCible: 80, ratee: 1 }),
      ...seance(2, B, cinq, 80, { pct: 80, kgCible: 80, ratee: 2 }),
    ];
    expect(pctCible(cible(refs, series, 3))).toBe(75);
  });

  it('complémentaires : une série ratée garde la charge, deux séances de suite la baissent', () => {
    const F = 'mf-barre-au-front';
    const une = seance(1, F, [8, 8, 8, 8], 30, { ratee: 0 });
    const conseil = (s: SetRow[]) => conseilComplementaire(ligne('lun-front'), passagesDe(s, F, 9));
    expect(conseil(une)).toMatch(/Série manquée : garde/);
    expect(conseil([...une, ...seance(2, F, [8, 8, 8, 8], 30, { ratee: 1 })])).toMatch(/baisse/);
  });
});

describe('correction 4 — sans RIR', () => {
  it('une réussite sans RIR ne monte pas ; deux de suite au même %, oui', () => {
    const refs = [ref('developpe-couche', 'barre', 100)];
    const s1 = seance(1, B, cinq, 75, { pct: 75, kgCible: 75 });
    expect(pctCible(cible(refs, s1, 2))).toBe(75);
    const s2 = [...s1, ...seance(2, B, cinq, 75, { pct: 75, kgCible: 75 })];
    expect(pctCible(cible(refs, s2, 3))).toBe(77.5);
  });

  it('RIR 0 saisi : même cible, même si toutes les répétitions sont faites', () => {
    const refs = [ref('developpe-couche', 'barre', 100)];
    const series = seance(1, B, cinq, 75, { pct: 75, kgCible: 75, rir: 0 });
    expect(pctCible(cible(refs, series, 2))).toBe(75);
  });
});

describe('correction 5 — séances incomplètes et non faites', () => {
  it('deux séries sur quatre : même cible, jamais une réussite', () => {
    const refs = [ref('developpe-couche', 'barre', 100)];
    const series = seance(1, B, [5, 5], 75, { pct: 75, kgCible: 75, rir: 3 });
    expect(cible(refs, series, 2)).toMatchObject({
      pctCible: 75,
      motif: expect.stringMatching(/incomplète/),
    });
  });

  it('une série manquée dans une séance incomplète reste un échec', () => {
    const refs = [ref('developpe-couche', 'barre', 100)];
    const series = seance(1, B, [5, 3], 75, { pct: 75, kgCible: 75 });
    expect(cible(refs, series, 2)).toMatchObject({ motif: expect.stringMatching(/manquées/) });
  });

  it('échec, incomplète, échec : pas deux échecs de suite, pas de baisse', () => {
    const refs = [ref('developpe-couche', 'barre', 100)];
    const series = [
      ...seance(1, B, [5, 5, 5, 4], 80, { pct: 80, kgCible: 80 }),
      ...seance(2, B, [5, 5], 80, { pct: 80, kgCible: 80 }),
      ...seance(3, B, [5, 5, 5, 4], 80, { pct: 80, kgCible: 80 }),
    ];
    expect(pctCible(cible(refs, series, 4))).toBe(80);
  });

  it('une séance non faite ne compte pas : la cible reste celle d’avant', () => {
    const refs = [ref('developpe-couche', 'barre', 100)];
    const series = seance(1, B, cinq, 75, { pct: 75, kgCible: 75, rir: 2 });
    // S2 non faite : aucune série. S3 = ce que S2 aurait été.
    expect(pctCible(cible(refs, series, 3))).toBe(77.5);
  });

  it('une séance ne se prescrit jamais à partir d’elle-même', () => {
    const refs = [ref('developpe-couche', 'barre', 100)];
    const series = seance(2, B, cinq, 75, { pct: 75, kgCible: 75, rir: 3 });
    expect(pctCible(cible(refs, series, 2))).toBe(75);
  });
});

describe('correction 6 — matériel et paliers', () => {
  it('le plafond tient même si un pas ne tombe pas pile sur le haut', () => {
    const f = { min: 75, max: 82.5 };
    expect(pctSuivant(81, 'reussite', null, f).pct).toBe(82.5);
    expect(pctSuivant(76, 'echec', { pct: 76, classement: 'echec' }, f).pct).toBe(75);
  });

  it('la progression à la barre ne passe jamais à la Smith', () => {
    const refs = [ref('developpe-couche', 'barre', 100), ref('developpe-couche', 'smith', 95)];
    const series = [
      ...seance(1, B, cinq, 75, { pct: 75, kgCible: 75, rir: 2 }),
      ...seance(2, B, cinq, 77.5, { pct: 77.5, kgCible: 77.5, rir: 2 }),
    ];
    expect(chargePour(bench, smith, refs, 3, series)).toMatchObject({
      pctCible: 75,
      kgCible: 71.25,
    });
    expect(chargePour(bench, smith, [ref('developpe-couche', 'barre', 100)], 3, series)?.kind).toBe(
      'a-completer',
    );
  });

  it('poulie 1RM 80, pile 59/66 kg : le cran du dessous hors tolérance fait refaire la semaine', () => {
    const P = 'mf-tirage-vertical-poulie';
    const refs = [ref('tirage-vertical', 'poulie', 80)];
    const s1 = seance(1, P, cinq, 59, { pct: 75, kgCible: 60, rir: 2, day: 1 });
    expect(chargePour(tirage, poulie, refs, 2, s1)).toMatchObject({ pctCible: 77.5, kgCible: 62 });
    const dessous = [...s1, ...seance(2, P, cinq, 59, { pct: 77.5, kgCible: 62, rir: 2, day: 1 })];
    expect(chargePour(tirage, poulie, refs, 3, dessous)).toMatchObject({ pctCible: 77.5 });
    const dessus = [...s1, ...seance(2, P, cinq, 66, { pct: 77.5, kgCible: 62, rir: 2, day: 1 })];
    expect(chargePour(tirage, poulie, refs, 3, dessus)).toMatchObject({
      pctCible: 80,
      kgCible: 64,
    });
  });

  it('plafond : réussite au haut de la fourchette, on y reste et l’écran le dit', () => {
    const refs = [ref('developpe-couche', 'barre', 100)];
    const series = seance(1, B, cinq, 82.5, { pct: 82.5, kgCible: 82.5, rir: 2 });
    expect(cible(refs, series, 2)).toMatchObject({
      pctCible: 82.5,
      motif: expect.stringMatching(/combiné au prochain cycle/),
    });
  });
});

type Jeu = (c: ChargeCible) => { reps: number[]; kg: number | null; rir: number | null };

/**
 * Rejoue un profil de bout en bout par le module, comme l'écran le verrait.
 * `avant` : ce que l'utilisateur fait avant d'ouvrir la séance (un test au
 * combiné, par exemple).
 */
function simuler(
  refs: ReferenceForceRow[],
  semaines: (Jeu | { avant: () => void; jouer: Jeu })[],
): ChargeCible[] {
  const series: SetRow[] = [];
  const vues: ChargeCible[] = [];
  const ouvrir = (w: number) =>
    MASS_FORCE.getSession(w, 0, {
      ...EMPTY_CONTEXT,
      referencesForce: refs,
      seriesCycle: series,
    })!.exercises[0]!;
  semaines.forEach((etape, i) => {
    const w = i + 1;
    let ex = ouvrir(w);
    let jouer = etape as Jeu;
    if (typeof etape !== 'function') {
      vues.push(ex.chargeCible!); // ce que l'écran montrait avant
      etape.avant();
      ex = ouvrir(w);
      jouer = etape.jouer;
    }
    const c = ex.chargeCible!;
    vues.push(c);
    const fait = jouer(c);
    series.push(
      ...seance(w, ex.id, fait.reps, fait.kg, {
        ...(c.kind === 'calculee' ? { pct: c.pctCible, kgCible: c.kgCible } : {}),
        rir: fait.rir,
      }),
    );
  });
  // L'état après S4, tel que la séance suivante le lirait.
  vues.push(chargePour(bench, barre, refs, 5, series)!);
  return vues;
}

describe('simulation S1 → S4, développé couché barre, 1RM mesuré 100 kg', () => {
  const resume = (vues: ChargeCible[]) =>
    vues.map((c) => (c.kind === 'calculee' ? `${c.pctCible}% ${c.kgCible}kg` : c.kind));

  it('profil 1, progression normale : 75 → 77,5 → 80 → 82,5, puis plafond', () => {
    const rirs = [3, 2, 1, 1];
    const vues = simuler(
      [ref('developpe-couche', 'barre', 100)],
      rirs.map((rir) => (c) => ({ reps: cinq, kg: kgCible(c), rir })),
    );
    expect(resume(vues)).toEqual([
      '75% 75kg',
      '77.5% 77.5kg',
      '80% 80kg',
      '82.5% 82.5kg',
      '82.5% 82.5kg',
    ]);
    expect(vues[4]).toMatchObject({ motif: expect.stringMatching(/prochain cycle/) });
  });

  it('profil 2, progression difficile : 75 → 75 → 77,5 → 77,5', () => {
    const vues = simuler(
      [ref('developpe-couche', 'barre', 100)],
      [
        (c) => ({ reps: cinq, kg: kgCible(c), rir: null }),
        (c) => ({ reps: cinq, kg: kgCible(c), rir: null }),
        (c) => ({ reps: cinq, kg: kgCible(c), rir: 0 }),
        () => ({ reps: cinq, kg: 72.5, rir: 1 }),
      ],
    );
    expect(resume(vues)).toEqual([
      '75% 75kg',
      '75% 75kg',
      '77.5% 77.5kg',
      '77.5% 77.5kg',
      '77.5% 77.5kg',
    ]);
  });

  it('profil 3, échecs répétés : suspendu en S3, nouveau test à 92 kg, reprise à 69 kg', () => {
    const refs = [ref('developpe-couche', 'barre', 100)];
    const vues = simuler(refs, [
      () => ({ reps: [5, 5, 5, 4], kg: 75, rir: null }),
      () => ({ reps: [5, 5, 4, 3], kg: 75, rir: null }),
      {
        // S3 s'ouvre suspendue ; l'utilisateur refait un test direct, puis rouvre.
        avant: () => refs.push(ref('developpe-couche', 'barre', 92)),
        jouer: (c) => ({ reps: cinq, kg: kgCible(c), rir: 2 }),
      },
      () => ({ reps: cinq, kg: 70, rir: 1 }),
    ]);
    expect(resume(vues)).toEqual([
      '75% 75kg',
      '75% 75kg',
      'suspendue',
      '75% 69kg',
      '77.5% 71.3kg',
      '80% 73.6kg',
    ]);
  });
});

describe('exercices complémentaires et push press', () => {
  const E = 'mf-ecarte-couche';
  const conseil = (cle: string, series: SetRow[], id: string) =>
    conseilComplementaire(ligne(cle), passagesDe(series, id, 9));

  it('plage (écarté 3 × 10) : garde, puis augmente quand toutes les séries sont à 12', () => {
    expect(conseil('lun-ecarte', [], E)).toMatch(/10 à 12/);
    expect(conseil('lun-ecarte', seance(1, E, [11, 10, 10], 12), E)).toMatch(/Garde la charge/);
    expect(conseil('lun-ecarte', seance(1, E, [12, 12, 12], 12), E)).toMatch(/augmente la charge/);
    expect(conseil('lun-ecarte', seance(1, E, [10, 10], 12), E)).toMatch(/incomplète/);
  });

  it('plage : sous le bas deux séances de suite → baisse', () => {
    const une = seance(1, E, [10, 9, 9], 14);
    expect(conseil('lun-ecarte', une, E)).toMatch(/garde/);
    expect(conseil('lun-ecarte', [...une, ...seance(2, E, [9, 8, 8], 14)], E)).toMatch(/baisse/);
  });

  it('fentes : la plage se lit par jambe, 12 à 14', () => {
    expect(conseil('jeu-fentes', [], 'mf-fentes-avant')).toMatch(/12 à 14/);
  });

  it('fixe (barre au front, RPE 8) : deux séances complètes à la même charge pour augmenter', () => {
    const F = 'mf-barre-au-front';
    const une = seance(1, F, [8, 8, 8, 8], 30);
    expect(conseil('lun-front', une, F)).toMatch(/encore une séance/);
    expect(conseil('lun-front', [...une, ...seance(2, F, [8, 8, 8, 8], 30)], F)).toMatch(
      /augmente/,
    );
    expect(conseil('lun-front', [...une, ...seance(2, F, [8, 8, 8, 8], 32.5)], F)).toMatch(
      /encore une séance/,
    );
    // Jamais de plage : aller au-delà de 8 ferait dépasser le RPE 8 écrit.
    expect(conseil('lun-front', [], F)).not.toMatch(/à 10/);
  });

  it('superset biceps : les deux mouvements en répétitions fixes', () => {
    expect(ligne('mar-curl-w').progression).toBe('fixe');
    expect(ligne('mar-curl-halteres').progression).toBe('fixe');
  });

  it('push press : sans RIR on garde, RIR 2 ou plus on augmente, RIR 1 on garde', () => {
    const PP = 'mf-push-press-smith';
    const q = [4, 4, 4, 4];
    expect(conseil('ven-push-press', seance(1, PP, q, 50), PP)).toMatch(/Sans RIR/);
    expect(conseil('ven-push-press', seance(1, PP, q, 50, { rir: 2 }), PP)).toMatch(/augmente/);
    expect(conseil('ven-push-press', seance(1, PP, q, 50, { rir: 1 }), PP)).toMatch(/garde/);
    expect(conseil('ven-push-press', seance(1, PP, [4, 4, 3, 4], 50, { rir: 3 }), PP)).toMatch(
      /garde/,
    );
  });

  it('aucun conseil ne prescrit de kilos', () => {
    for (const l of lignes.filter((x) => x.progression !== 'pourcentage')) {
      const id = l.options[0]!.id;
      for (const s of [[], seance(1, id, [99, 99, 99, 99], 10, { rir: 3 })]) {
        expect(conseilComplementaire(l, passagesDe(s, id, 9)) ?? '', l.cle).not.toMatch(/kg/);
      }
    }
  });
});

describe('le RIR est demandé là où il pilote une progression, et nulle part ailleurs', () => {
  it('bench avec 1RM et push press : oui ; écarté et bench sans 1RM : non', () => {
    const avec = MASS_FORCE.getSession(1, 0, {
      ...EMPTY_CONTEXT,
      referencesForce: [ref('developpe-couche', 'barre', 100)],
    })!;
    expect(avec.exercises[0]!.demandeRir).toBe(true);
    expect(avec.exercises.find((e) => e.id === 'mf-ecarte-couche')!.demandeRir).toBeUndefined();
    expect(MASS_FORCE.getSession(1, 0, EMPTY_CONTEXT)!.exercises[0]!.demandeRir).toBeUndefined();
    expect(MASS_FORCE.getSession(1, 4, EMPTY_CONTEXT)!.exercises[0]!.demandeRir).toBe(true);
  });
});
