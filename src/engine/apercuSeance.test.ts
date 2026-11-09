import { describe, expect, it } from 'vitest';
import { reps, rpe } from '../data/types';
import { MODULES } from '../programmes/registre';
import {
  apercuSeance,
  etiquetteRole,
  premierePhrase,
  progressionSeance,
  recapAjustements,
} from './apercuSeance';
import type { ResolvedExercise } from './getSession';
import type { ProgressionResult } from './progression';
import { EMPTY_CONTEXT } from './types';

const ex = (over: Partial<ResolvedExercise> = {}): ResolvedExercise => ({
  def: { id: 'back-squat', name: 'Back Squat', fn: 'squat', role: 'main' },
  id: 'back-squat',
  name: 'Back Squat',
  sets: 4,
  work: reps(6),
  load: { kg: 120, shape: 'barbell', step: 2.5, source: 'programme' },
  targetRPE: rpe(8),
  restSec: 240,
  loadLine: '4 × 6 × 120 kg',
  notes: [],
  planKg: 120,
  lastKg: 115,
  lastMeasure: null,
  suggestion: null,
  adjustments: [],
  ...over,
});

const suggestion = (over: Partial<ProgressionResult> = {}): ProgressionResult => ({
  case: null,
  suggestedKg: 125,
  plannedKg: 120,
  offsetKg: 5,
  source: 'historique',
  reason: 'Trop facile la semaine dernière.',
  requiresConfirm: true,
  capped: false,
  ...over,
});

describe('étiquette d’un exercice', () => {
  it('traduit les rôles qui disent quelque chose', () => {
    expect(etiquetteRole('power')).toBe('Explosif');
    expect(etiquetteRole('main')).toBe('Principal');
    expect(etiquetteRole('core')).toBe('Tronc');
  });

  it('n’étiquette pas un accessoire — MASS y range tout, l’étiquette mentirait', () => {
    expect(etiquetteRole('accessory')).toBeNull();
  });
});

describe('aperçu de la séance', () => {
  it('numérote dans l’ordre prescrit et reprend la ligne de charge telle quelle', () => {
    const lignes = apercuSeance([
      ex({
        id: 'broad-jump',
        name: 'Broad Jump',
        loadLine: '5 × 2',
        def: { id: 'broad-jump', name: 'Broad Jump', fn: 'jump', role: 'power' },
      }),
      ex(),
    ]);
    expect(lignes).toEqual([
      { numero: '01', nom: 'Broad Jump', etiquette: 'Explosif', prescription: '5 × 2' },
      { numero: '02', nom: 'Back Squat', etiquette: 'Principal', prescription: '4 × 6 × 120 kg' },
    ]);
  });

  it('une séance vide donne une liste vide', () => {
    expect(apercuSeance([])).toEqual([]);
  });

  it('fonctionne pour chaque programme enregistré, sans rien lui demander de plus', () => {
    for (const module of MODULES) {
      const semaine = module.semaines.find((w) => module.joursDeLaSemaine(w).length > 0);
      expect(semaine).toBeDefined();
      const jour = module.joursDeLaSemaine(semaine!)[0]!;
      const session = module.getSession(semaine!, jour, EMPTY_CONTEXT);
      if (session === null) continue;
      const lignes = apercuSeance(session.exercises);
      expect(lignes).toHaveLength(session.exercises.length);
      for (const l of lignes) {
        expect(l.nom).not.toBe('');
        expect(l.prescription).toBe(session.exercises[Number(l.numero) - 1]!.loadLine);
      }
    }
  });
});

describe('récap des ajustements', () => {
  it('ne liste que les exercices où quelque chose a bougé', () => {
    expect(recapAjustements([ex()], {})).toEqual([]);
  });

  it('reprend les ajustements du moteur par leur libellé', () => {
    const r = recapAjustements(
      [
        ex({
          adjustments: [{ source: 'orange', what: '−5 % sur la charge', why: 'Readiness ORANGE.' }],
        }),
      ],
      {},
    );
    expect(r).toEqual([{ nom: 'Back Squat', details: ['−5 % sur la charge'] }]);
  });

  it('suggestion acceptée', () => {
    const r = recapAjustements([ex({ suggestion: suggestion() })], { 'back-squat': 125 });
    expect(r[0]!.details).toEqual(['Suggestion acceptée : 125 kg']);
  });

  it('suggestion remplacée par une autre charge', () => {
    const r = recapAjustements([ex({ suggestion: suggestion() })], { 'back-squat': 122.5 });
    expect(r[0]!.details).toEqual(['Suggestion 125 kg remplacée par 122,5 kg']);
  });

  it('suggestion sans réponse : jamais présentée comme refusée', () => {
    const r = recapAjustements([ex({ suggestion: suggestion() })], {});
    expect(r[0]!.details).toEqual(['Suggestion 125 kg sans réponse — charge du plan gardée']);
  });

  it('ignore une suggestion qui ne demandait pas de réponse', () => {
    const r = recapAjustements([ex({ suggestion: suggestion({ requiresConfirm: false }) })], {});
    expect(r).toEqual([]);
  });
});

describe('progression de la séance', () => {
  const a = ex({ id: 'a', sets: 3 });
  const b = ex({ id: 'b', sets: 2 });
  const c = ex({ id: 'c', sets: 4 });

  it('compte un exercice fait quand toutes ses séries prescrites sont validées', () => {
    const p = progressionSeance([a, b, c], { a: [1, 2, 3], b: [1] });
    expect(p).toEqual({ faits: 1, total: 3, etats: ['fait', 'en-cours', 'a-venir'] });
  });

  it('une série en plus du prescrit reste « fait »', () => {
    expect(progressionSeance([b], { b: [1, 2, 3] }).etats).toEqual(['fait']);
  });

  it('un exercice sans série prescrite n’est jamais compté fait d’office', () => {
    expect(progressionSeance([ex({ id: 'z', sets: 0 })], {}).etats).toEqual(['a-venir']);
  });

  it('séance vierge : rien de fait', () => {
    expect(progressionSeance([a, b], {})).toEqual({
      faits: 0,
      total: 2,
      etats: ['a-venir', 'a-venir'],
    });
  });
});

describe('première phrase d’une explication', () => {
  it('garde la phrase du constat et laisse le détail pour les consignes', () => {
    expect(
      premierePhrase(
        'Recalé sur ce que tu soulèves vraiment : en semaine 7 tu as fait 110 kg là où le plan ' +
          'annonçait 97,5 kg. Le programme demande un POURCENTAGE de ton maximum, donc ton écart ' +
          'le suit en proportion — 112,8 % du plan, cette semaine comme les autres.',
      ),
    ).toBe(
      'Recalé sur ce que tu soulèves vraiment : en semaine 7 tu as fait 110 kg là où le plan ' +
        'annonçait 97,5 kg.',
    );
  });

  it('ne coupe ni une décimale ni un renvoi de paragraphe', () => {
    expect(
      premierePhrase('Entrée en bloc force : 4 % de charge en plus (§8). Le RPE cible reste le juge.'),
    ).toBe('Entrée en bloc force : 4 % de charge en plus (§8).');
  });

  it('une seule phrase reste entière', () => {
    expect(premierePhrase('Readiness orange : −5 % sur les gros mouvements (§4).')).toBe(
      'Readiness orange : −5 % sur les gros mouvements (§4).',
    );
  });
});
