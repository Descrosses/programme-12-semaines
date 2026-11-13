/**
 * Références de force : aucune conversion de matériel, aucune formule, rien
 * qui s'efface. Les trois règles de Guillaume, une par bloc.
 */
import { describe, expect, it } from 'vitest';
import * as moteur from './references';
import {
  erreurReference,
  etatReference,
  historiqueReferences,
  referenceCourante,
  variantesEvaluees,
} from './references';
import type { ReferenceForceRow } from '../db/db';

const ref = (p: Partial<ReferenceForceRow>): ReferenceForceRow => ({
  id: 1,
  exercice: 'developpe-couche',
  variante: 'barre',
  modalite: 'direct',
  chargeKg: 100,
  reps: 1,
  date: '2026-11-01',
  programmeId: 'mass-force',
  cycleId: null,
  note: '',
  creeLe: 1,
  ...p,
});

describe('saisie d’une référence', () => {
  const ok = ref({});
  it('accepte un test direct à une répétition', () => {
    expect(erreurReference(ok)).toBeNull();
  });
  it('refuse un « 1RM » à plusieurs répétitions', () => {
    expect(erreurReference({ ...ok, reps: 3 })).toMatch(/une seule répétition/);
  });
  it('accepte un sous-maximal à plusieurs répétitions', () => {
    expect(erreurReference({ ...ok, modalite: 'sous-maximal', chargeKg: 80, reps: 6 })).toBeNull();
  });
  it('refuse un matériel hors de la liste fermée', () => {
    expect(erreurReference({ ...ok, variante: 'kettlebell' })).toMatch(/inconnu/);
  });

  it('refuse une charge nulle, un matériel vide, une date mal formée', () => {
    expect(erreurReference({ ...ok, chargeKg: 0 })).not.toBeNull();
    expect(erreurReference({ ...ok, variante: ' ' })).not.toBeNull();
    expect(erreurReference({ ...ok, date: '01/11/2026' })).not.toBeNull();
  });
});

describe('aucune conversion de matériel', () => {
  const lignes = [ref({ id: 1, variante: 'barre', chargeKg: 100 })];
  it('une référence à la barre ne donne RIEN pour la Smith', () => {
    expect(referenceCourante(lignes, 'developpe-couche', 'smith')).toBeNull();
  });
  it('mais dit avec quel matériel l’exercice a déjà été évalué', () => {
    expect(variantesEvaluees(lignes, 'developpe-couche')).toEqual(['barre']);
  });
});

describe('rien ne s’efface : la plus récente fait foi, les autres restent', () => {
  const lignes = [
    ref({ id: 1, date: '2026-09-01', chargeKg: 90, creeLe: 1 }),
    ref({ id: 2, date: '2026-11-01', chargeKg: 100, creeLe: 2 }),
    ref({ id: 3, date: '2026-10-01', chargeKg: 95, creeLe: 3 }),
  ];
  it('la référence en cours est la plus récente PAR DATE de test', () => {
    expect(referenceCourante(lignes, 'developpe-couche', 'barre')?.chargeKg).toBe(100);
  });
  it('deux tests le même jour : le dernier saisi l’emporte', () => {
    const memeJour = [
      ref({ id: 1, date: '2026-11-01', chargeKg: 100, creeLe: 10 }),
      ref({ id: 2, date: '2026-11-01', chargeKg: 102.5, creeLe: 20 }),
    ];
    expect(referenceCourante(memeJour, 'developpe-couche', 'barre')?.chargeKg).toBe(102.5);
  });
  it('l’historique garde toutes les évaluations, datées, de la plus récente à la plus ancienne', () => {
    expect(historiqueReferences(lignes, 'developpe-couche').map((r) => r.date)).toEqual([
      '2026-11-01',
      '2026-10-01',
      '2026-09-01',
    ]);
  });
});

describe('aucune formule d’estimation', () => {
  it('le moteur n’expose rien qui estime un 1RM', () => {
    for (const nom of Object.keys(moteur)) expect(nom).not.toMatch(/estim|1rm|unrm|epley|brzycki/i);
  });
});

describe('ce que l’écran dit d’une référence', () => {
  const lignes = [ref({ id: 1, variante: 'barre', chargeKg: 100, date: '2026-11-01' })];
  it('courante : ce matériel a une référence', () => {
    const e = etatReference(lignes, 'developpe-couche', 'barre');
    expect(e.kind).toBe('courante');
  });
  it('autre matériel : évalué ailleurs, rien de transposé', () => {
    expect(etatReference(lignes, 'developpe-couche', 'smith')).toEqual({
      kind: 'autre-materiel',
      variantes: ['barre'],
    });
  });
  it('aucune : jamais évalué', () => {
    expect(etatReference(lignes, 'squat', 'barre')).toEqual({ kind: 'aucune' });
  });
});
