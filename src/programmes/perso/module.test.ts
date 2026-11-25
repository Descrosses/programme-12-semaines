/**
 * Le module qui joue un programme importé — lot 4 de l'ADR ME, MYSELF & I.
 *
 * Ce que ces tests figent, sur Training 1 (le vrai PDF, annexe B) :
 * - chaque séance est la transcription du fichier, ligne pour ligne et série
 *   pour série, sous des identifiants préfixés par la version ;
 * - le circuit d'abdos sort en UN bloc de 4 stations, 4 tours, enchaîné,
 *   60 s ; les trois supersets sortent enchaînés ;
 * - les sections et les consignes générales s'affichent ;
 * - aucune intensité ni durée inventée ;
 * - un contexte rempli de 1RM ne change rien ; l'historique n'ajoute qu'un
 *   repère, jamais une valeur pré-remplie ; le champ de charge s'ouvre vide ;
 * - une ligne consultable n'a aucune série ; une pyramide garde ses séries.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { ProgrammeImporteRow } from '../../db/db';
import { aideChargeVide, loadEntryFor } from '../../engine/loadEntry';
import { validerProgramme } from '../../engine/perso/valider';
import { groupSupersets } from '../../engine/superset';
import { EMPTY_CONTEXT, type SessionContext } from '../../engine/types';
import { creerModuleImporte } from './module';

const TEXTE = readFileSync(
  new URL('../../engine/perso/__fixtures__/training1.json', import.meta.url),
  'utf8',
);
const CLE = 'perso-training1guillaume201005-1';

function ligneDe(texte: string, dureeSemaines: number | null, cle = CLE): ProgrammeImporteRow {
  const v = validerProgramme(texte);
  if (!v.ok) throw new Error(JSON.stringify(v.erreurs));
  return {
    cle,
    uid: v.programme.uid,
    rev: 1,
    nom: v.programme.nom,
    importeLe: '2026-11-16',
    archive: false,
    texte,
    document: v.programme,
    reponses: { dureeSemaines },
  };
}

const ROW = ligneDe(TEXTE, 8);
const T1 = ROW.document;
const M = creerModuleImporte(ROW);

describe('Training 1, sur 8 semaines choisies', () => {
  it('8 semaines, 5 jours chacune, rien au-delà', () => {
    expect(M.id).toBe(CLE);
    expect(M.semaines).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    for (const s of M.semaines) expect(M.joursDeLaSemaine(s)).toEqual([0, 1, 3, 4, 5]);
    expect(M.joursDeLaSemaine(9)).toEqual([]);
    expect(M.getSession(9, 0, EMPTY_CONTEXT)).toBeNull();
    expect(M.getSession(1, 2, EMPTY_CONTEXT)).toBeNull(); // mercredi : repos
  });

  it('chaque séance transcrit le fichier, ligne pour ligne, série pour série', () => {
    for (const seance of T1.semaines[0]!.seances) {
      const s = M.getSession(3, seance.jour, EMPTY_CONTEXT)!;
      expect(s.title).toBe(seance.titre);
      expect(s.exercises).toHaveLength(seance.lignes.length);
      seance.lignes.forEach((l, i) => {
        const ex = s.exercises[i]!;
        const p = l.prescription!;
        expect(ex.id).toBe(`${CLE}-${l.exerciceId}`);
        expect(ex.notes[0]).toBe(l.texteOriginal);
        expect(ex.sets).toBe(p.series.length);
        expect(ex.restSec).toBe(p.reposSec);
        expect(ex.objectifsParSerie).toBeUndefined(); // séries identiques
        const o = p.series[0]!.objectif;
        if (o.type === 'reps') {
          expect(ex.work).toMatchObject({ kind: 'reps', reps: o.reps, perSide: p.cote !== null });
        } else if (o.type === 'duree') {
          expect(ex.work).toMatchObject({ kind: 'time', seconds: o.secondes });
        }
        expect(ex.targetRPE).toBeNull();
        expect(ex.suggestion).toBeNull();
        expect(ex.def.role).toBe('accessory');
      });
    }
    expect(T1.semaines[0]!.seances.reduce((n, s) => n + s.lignes.length, 0)).toBe(44);
  });

  it('le circuit d’abdos : un bloc de 4 stations, 4 tours, enchaîné, 60 s', () => {
    for (const jour of [0, 3, 5] as const) {
      const blocs = groupSupersets(M.getSession(1, jour, EMPTY_CONTEXT)!.exercises);
      const abdos = blocs.find((b) => b.kind === 'circuit' && b.exs.length === 4)!;
      expect(abdos.kind).toBe('circuit');
      if (abdos.kind !== 'circuit') return;
      expect(abdos.exs.map((e) => e.name)).toEqual([
        'Relevé de buste pieds au sol avec un disque sur potine',
        'Relevé de jambes au sol',
        'Twist medcines ball ( ou haltère ou autre objet )',
        'La planche ( gainage )',
      ]);
      expect(abdos.tours).toBe(4);
      expect(abdos.rythme).toBe('enchaine');
      expect(abdos.restSec).toBe(60);
    }
  });

  it('les trois supersets sortent enchaînés, le repos après la paire', () => {
    const paires = [0, 1, 5].flatMap((jour) =>
      groupSupersets(M.getSession(1, jour as 0 | 1 | 5, EMPTY_CONTEXT)!.exercises).filter(
        (b) => b.kind === 'circuit' && b.exs.length === 2,
      ),
    );
    expect(paires).toHaveLength(3);
    for (const p of paires) {
      if (p.kind !== 'circuit') continue;
      expect(p.rythme).toBe('enchaine');
      expect(p.restSec).toBe(90);
    }
  });

  it('le jeudi est la séance 1 sans les bras (décision de Guillaume)', () => {
    const jeudi = M.getSession(1, 3, EMPTY_CONTEXT)!;
    expect(jeudi.exercises.map((e) => e.id)).not.toContain(`${CLE}-curl-ez`);
    expect(jeudi.exercises).toHaveLength(9);
  });

  it('sections et consignes générales en tête de chaque séance', () => {
    const lundi = M.getSession(1, 0, EMPTY_CONTEXT)!;
    expect(lundi.exercises[0]!.section).toBe('SEANCE 1 EPAULES BRAS');
    expect(lundi.exercises.at(-1)!.section).toBe('SEANCE ABDOS');
    expect(lundi.notes.slice(0, 3)).toEqual(T1.consignes);
    expect(lundi.notes[3]).toBe('Echauffement : 5 minutes de rameur');
  });

  it('aucune intensité ni durée inventée', () => {
    const s = M.getSession(1, 1, EMPTY_CONTEXT)!;
    expect(s.sansIntensite).toBe(true);
    expect(s.sansDuree).toBe(true);
    expect(s.durationLabel).toBe('');
    expect(s.plannedMin).toBe(0);
    expect(s.sansBloc).toBe(true);
  });
});

describe('ni charge, ni règle venue d’ailleurs', () => {
  it('un contexte rempli de 1RM ne change rien', () => {
    const plein: SessionContext = {
      ...EMPTY_CONTEXT,
      settings: {
        ...EMPTY_CONTEXT.settings,
        oneRM: { 'back-squat': 180, 'bench-press': 120, deadlift: 220 },
        broadJumpBaselineCm: 280,
      },
      explosiveDecline: true,
    };
    for (const jour of [0, 1, 3, 4, 5] as const) {
      expect(M.getSession(2, jour, plein)).toEqual(M.getSession(2, jour, EMPTY_CONTEXT));
    }
  });

  it('l’historique n’ajoute qu’un repère : le champ de charge s’ouvre vide', () => {
    const id = `${CLE}-squat`;
    const ctx: SessionContext = {
      ...EMPTY_CONTEXT,
      history: {
        [id]: [
          {
            exerciseId: id,
            week: 1,
            day: 1,
            kg: 62.5,
            plannedKg: null,
            rpe: null,
            failed: false,
            targetRPE: null,
            completed: true,
          },
        ],
      },
    };
    const squat = M.getSession(2, 1, ctx)!.exercises.find((e) => e.id === id)!;
    expect(squat.notes).toContain('Dernière fois : 62,5 kg');
    expect(squat.lastKg).toBeNull();
    expect(squat.load.kg).toBeNull();
    // Le champ s'ouvre vide : une série validée sans charge enregistre null.
    expect(loadEntryFor(squat).initialKg).toBeNull();
    // Et aucune consigne inventée sous la case vide.
    expect(aideChargeVide(squat, null)).toBeNull();
  });
});

describe('ce que Training 1 ne contient pas', () => {
  const base = JSON.parse(TEXTE);

  it('une pyramide garde ses séries et ses charges écrites', () => {
    const o = structuredClone(base);
    o.semaines[0].seances[1].lignes[1].prescription = {
      detail: [
        { objectif: { type: 'reps', reps: 12 }, chargeKg: 60 },
        { objectif: { type: 'reps', reps: 10 }, chargeKg: 70 },
        { objectif: { type: 'reps', reps: 8 }, chargeKg: 80 },
      ],
      reposSec: 120,
    };
    const m = creerModuleImporte(ligneDe(JSON.stringify(o), 4));
    const squat = m.getSession(1, 1, EMPTY_CONTEXT)!.exercises[1]!;
    expect(squat.sets).toBe(3);
    expect(squat.objectifsParSerie!.map((s) => [s.work, s.kg])).toEqual([
      [{ kind: 'reps', reps: 12, perSide: false }, 60],
      [{ kind: 'reps', reps: 10, perSide: false }, 70],
      [{ kind: 'reps', reps: 8, perSide: false }, 80],
    ]);
    expect(squat.loadLine).toBe('12 × 60 kg / 10 × 70 kg / 8 × 80 kg');
    expect(squat.planKg).toBeNull();
  });

  it('une ligne consultable n’a aucune série, et garde son texte', () => {
    const o = structuredClone(base);
    delete o.semaines[0].seances[1].lignes[5].prescription;
    o.semaines[0].seances[1].lignes[5].texteOriginal = 'Mollets : AMRAP 60 s';
    const m = creerModuleImporte(ligneDe(JSON.stringify(o), 4));
    const mollet = m.getSession(1, 1, EMPTY_CONTEXT)!.exercises[5]!;
    expect(mollet.sets).toBe(0);
    expect(mollet.notes[0]).toBe('Mollets : AMRAP 60 s');
    expect(mollet.loadLine).toBe('À lire, hors suivi');
  });

  it('une durée et des blocs numérotés écrits par le document sont suivis', () => {
    const o = structuredClone(base);
    o.programme.dureeSemaines = 2;
    o.semaines = [
      { numeros: [1], libelle: 'Phase 1', seances: [base.semaines[0].seances[1]] },
      { numeros: [2], libelle: 'Phase 2', seances: [base.semaines[0].seances[3]] },
    ];
    const m = creerModuleImporte(ligneDe(JSON.stringify(o), null));
    expect(m.semaines).toEqual([1, 2]);
    expect(m.joursDeLaSemaine(1)).toEqual([1]);
    expect(m.joursDeLaSemaine(2)).toEqual([4]);
    expect(m.blocDeLaSemaine(2)).toBe('Phase 2');
    expect(m.getSession(2, 4, EMPTY_CONTEXT)!.sansBloc).toBeUndefined();
  });
});

describe('les illustrations d’un programme importé', () => {
  const H = 'a'.repeat(64);
  const illustre = creerModuleImporte({
    ...ROW,
    illustrations: {
      liens: {
        'oiseau-poulie-haute': { empreinte: H },
        'militaire-smith': { majk: 'power12:back-squat' },
        arnold: { majk: 'power12:fiche-retiree-depuis' },
      },
    },
  });
  const defs = () => {
    const s = illustre.getSession(1, 0, EMPTY_CONTEXT)!;
    return Object.fromEntries(s.exercises.map((e) => [e.def.id.slice(CLE.length + 1), e.def]));
  };

  it('une image importée se pose par son empreinte, une fiche de MAJK par son chemin', () => {
    const d = defs();
    expect(d['oiseau-poulie-haute']!.illustration).toBe(H);
    expect(d['oiseau-poulie-haute']!.fiche).toBeUndefined();
    expect(d['militaire-smith']!.fiche).toMatch(/^fiches\/.+\.webp$/);
    expect(d['militaire-smith']!.illustration).toBeUndefined();
  });

  it('une fiche de MAJK qui n’existe plus ne casse rien : pas d’image, c’est tout', () => {
    expect(defs()['arnold']).not.toHaveProperty('fiche');
  });

  it('la prescription ne bouge pas d’un caractère', () => {
    const sans = M.getSession(1, 0, EMPTY_CONTEXT)!;
    const avec = illustre.getSession(1, 0, EMPTY_CONTEXT)!;
    const sansDef = (s: typeof sans) =>
      JSON.stringify(s.exercises.map(({ def: _def, ...reste }) => reste));
    expect(sansDef(avec)).toBe(sansDef(sans));
  });

  it('sans illustrations, l’exercice reste exactement celui d’avant', () => {
    for (const e of M.getSession(1, 0, EMPTY_CONTEXT)!.exercises) {
      expect(Object.keys(e.def).sort()).toEqual(['fn', 'id', 'name', 'role']);
    }
  });
});
