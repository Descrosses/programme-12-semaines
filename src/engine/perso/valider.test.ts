/**
 * Le validateur des programmes importés — lot 1 de l'ADR ME, MYSELF & I.
 *
 * Ce que ces tests figent :
 * - « Training 1 », converti à la main depuis le vrai PDF (annexe B de
 *   l'ADR), est accepté : 44 lignes compatibles sur 44, durée à demander ;
 * - une erreur par classe : JSON, version, structure, identifiant,
 *   prescription — et toutes collectées en une passe ;
 * - une valeur absente n'est jamais 0 ; un texte n'est jamais retouché ;
 * - une pyramide est compatible, un AMRAP au temps reste consultable ;
 * - la forme canonique ignore l'ordre des clés, pas le contenu.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { formeCanonique } from './canonique';
import type { CodeErreur, ResultatValidation } from './types';
import { validerProgramme } from './valider';

const TRAINING1 = readFileSync(new URL('./__fixtures__/training1.json', import.meta.url), 'utf8');

/** Un programme minimal valide, à abîmer test par test. */
function base(): Record<string, any> {
  return {
    format: 'majk-programme',
    schemaVersion: 1,
    programme: { uid: 'testprog01', nom: 'Test', source: { document: 'test.pdf' } },
    exercices: [
      { id: 'squat', nom: 'Squat' },
      { id: 'gainage', nom: 'Gainage' },
    ],
    semaines: [
      {
        seances: [
          {
            id: 'lundi',
            jour: 0,
            titre: 'Jambes',
            lignes: [
              {
                exerciceId: 'squat',
                texteOriginal: 'Squat | 2min | 4 x 8',
                prescription: { series: 4, objectif: { type: 'reps', reps: 8 }, reposSec: 120 },
              },
            ],
          },
        ],
      },
    ],
  };
}

const valider = (o: unknown) => validerProgramme(JSON.stringify(o));
const codes = (r: ResultatValidation): CodeErreur[] => (r.ok ? [] : r.erreurs.map((x) => x.code));
function accepte(r: ResultatValidation) {
  if (!r.ok) throw new Error(JSON.stringify(r.erreurs, null, 2));
  return r;
}

describe('Training 1 (vrai PDF, annexe B)', () => {
  const r = accepte(validerProgramme(TRAINING1));

  it('est accepté en entier : 44 lignes compatibles sur 44', () => {
    expect(r.rapport.lignes).toBe(44);
    expect(r.rapport.compatibles).toBe(44);
    expect(r.rapport.consultables).toEqual([]);
    expect(r.rapport.suiviComplet).toBe(true);
  });

  it('ne fixe pas de durée : MAJK la demandera, sans valeur par défaut', () => {
    expect(r.programme.dureeSemaines).toBeNull();
    expect(r.rapport.dureeADemander).toBe(true);
    expect(r.programme.semaines).toHaveLength(1);
    expect(r.programme.semaines[0]!.numeros).toBeNull();
  });

  it('garde ses 30 exercices, ses 5 jours, ses 3 consignes et ses 5 décisions', () => {
    expect(r.programme.exercices).toHaveLength(30);
    expect(r.programme.semaines[0]!.seances.map((s) => s.jour)).toEqual([0, 1, 3, 4, 5]);
    expect(r.programme.consignes).toHaveLength(3);
    expect(r.programme.decisions.map((d) => d.sujet)).toEqual([
      'exclusion',
      'convention',
      'identite',
      'convention',
      'texte',
    ]);
  });

  it('garde le texte verbatim, fautes comprises', () => {
    expect(r.programme.consignes[0]).toContain('une pique de concertation est obligatoire');
    const lundi = r.programme.semaines[0]!.seances[0]!;
    expect(lundi.lignes.find((l) => l.exerciceId === 'releve-buste')?.texteOriginal).toContain(
      'sur potine',
    );
  });

  it('garde le rythme du circuit d’abdos : 0, 0, 0 puis 60 s, quatre tours', () => {
    const abdos = r.programme.semaines[0]!.seances[0]!.lignes.filter((l) => l.groupe === 'abdos');
    expect(abdos.map((l) => l.prescription?.reposSec)).toEqual([0, 0, 0, 60]);
    expect(abdos.map((l) => l.prescription?.series.length)).toEqual([4, 4, 4, 4]);
    expect(abdos[3]!.prescription!.series[0]!.objectif).toEqual({ type: 'duree', secondes: 60 });
  });

  it('garde les fourchettes, le côté et l’absence de charge', () => {
    const mardi = r.programme.semaines[0]!.seances[1]!;
    const fentes = mardi.lignes[0]!.prescription!;
    expect(fentes.cote).toBe('jambe');
    const lundi = r.programme.semaines[0]!.seances[0]!;
    expect(lundi.lignes[1]!.prescription!.series[0]).toEqual({
      objectif: { type: 'reps', reps: { min: 6, max: 8 } },
      chargeKg: null,
    });
  });
});

describe('une erreur par classe', () => {
  it('json-invalide : syntaxe, et fichier trop lourd', () => {
    expect(codes(validerProgramme('{'))).toEqual(['json-invalide']);
    expect(codes(validerProgramme(' '.repeat(1_000_001)))).toEqual(['json-invalide']);
  });

  it('version-inconnue : autre format, version plus récente', () => {
    expect(codes(valider({ ...base(), format: 'programme-12-semaines' }))).toEqual([
      'version-inconnue',
    ]);
    const r = valider({ ...base(), schemaVersion: 2 });
    expect(codes(r)).toEqual(['version-inconnue']);
    expect(r.ok ? '' : r.erreurs[0]!.message).toMatch(/mets l’application à jour/);
  });

  it('structure-invalide : champ manquant, clé inconnue, clé interdite', () => {
    const sansNom = base();
    delete sansNom.programme.nom;
    expect(codes(valider(sansNom))).toEqual(['structure-invalide']);

    const inconnue = base();
    inconnue.semaines[0].seances[0].lignes[0].tempo = '3-1-1';
    expect(codes(valider(inconnue))).toEqual(['structure-invalide']);

    const proto = JSON.stringify(base()).replace('"nom":"Test"', '"nom":"Test","__proto__":{}');
    expect(codes(validerProgramme(proto))).toEqual(['structure-invalide']);
  });

  it('structure-invalide : nombres faux, texte vide, deux formes, natures mélangées', () => {
    const cas: ((p: Record<string, any>) => void)[] = [
      (p) => (p.semaines[0].seances[0].lignes[0].prescription.objectif.reps = -3),
      (p) => (p.semaines[0].seances[0].lignes[0].prescription.series = 2.5),
      (p) => (p.semaines[0].seances[0].lignes[0].texteOriginal = '   '),
      (p) => (p.semaines[0].seances[0].lignes[0].prescription.objectif.reps = { min: 10, max: 8 }),
      (p) =>
        (p.semaines[0].seances[0].lignes[0].prescription.detail = [
          { objectif: { type: 'reps', reps: 8 } },
        ]),
      (p) =>
        (p.semaines[0].seances[0].lignes[0].prescription = {
          detail: [
            { objectif: { type: 'reps', reps: 10 } },
            { objectif: { type: 'duree', secondes: 30 } },
          ],
        }),
    ];
    for (const abimer of cas) {
      const p = base();
      abimer(p);
      expect(codes(valider(p)), abimer.toString()).toEqual(['structure-invalide']);
    }
  });

  it('structure-invalide : un groupe séparé, seul, ou sans repos écrit', () => {
    const ligne = (id: string, groupe?: string, reposSec?: number) => ({
      exerciceId: id,
      texteOriginal: id,
      ...(groupe ? { groupe } : {}),
      prescription: {
        series: 3,
        objectif: { type: 'reps', reps: 10 },
        ...(reposSec === undefined ? {} : { reposSec }),
      },
    });
    const avec = (lignes: unknown[]) => {
      const p = base();
      p.exercices.push({ id: 'pompes', nom: 'Pompes' });
      p.semaines[0].seances[0].lignes = lignes;
      return valider(p);
    };
    // Accepté : deux lignes consécutives, chacune avec son repos.
    expect(avec([ligne('squat', 'g', 0), ligne('gainage', 'g', 60)]).ok).toBe(true);
    // Séparées par une troisième ligne.
    expect(
      codes(avec([ligne('squat', 'g', 0), ligne('pompes'), ligne('gainage', 'g', 60)])),
    ).toEqual(['structure-invalide']);
    // Un groupe d'une seule ligne.
    expect(codes(avec([ligne('squat', 'g', 0), ligne('gainage')]))).toEqual(['structure-invalide']);
    // Un repos absent dans un groupe : il n'est jamais pris pour 0.
    expect(codes(avec([ligne('squat', 'g'), ligne('gainage', 'g', 60)]))).toEqual([
      'structure-invalide',
    ]);
  });

  it('identifiant-duplique : exercice, séance, exercice deux fois dans une séance', () => {
    const exo = base();
    exo.exercices.push({ id: 'squat', nom: 'Autre squat' });
    expect(codes(valider(exo))).toEqual(['identifiant-duplique']);

    const seance = base();
    seance.semaines[0].seances.push({ ...seance.semaines[0].seances[0], jour: 2 });
    expect(codes(valider(seance))).toEqual(['identifiant-duplique']);

    const deuxFois = base();
    const l = deuxFois.semaines[0].seances[0].lignes;
    l.push({ ...l[0] });
    expect(codes(valider(deuxFois))).toEqual(['identifiant-duplique']);
  });

  it('prescription-incompatible : 13 semaines, deux séances un même jour, exercice non déclaré', () => {
    const treize = base();
    treize.programme.dureeSemaines = 13;
    treize.semaines[0].numeros = Array.from({ length: 13 }, (_, i) => i + 1);
    expect(codes(valider(treize))).toEqual(['prescription-incompatible']);

    const memeJour = base();
    memeJour.semaines[0].seances.push({ ...memeJour.semaines[0].seances[0], id: 'abdos' });
    expect(codes(valider(memeJour))).toEqual(['prescription-incompatible']);

    const inconnu = base();
    inconnu.semaines[0].seances[0].lignes[0].exerciceId = 'deadlift';
    expect(codes(valider(inconnu))).toEqual(['prescription-incompatible']);
  });

  it('collecte toutes les erreurs en une passe', () => {
    const p = base();
    delete p.programme.nom;
    p.exercices.push({ id: 'squat', nom: 'Doublon' });
    p.semaines[0].seances[0].lignes[0].exerciceId = 'deadlift';
    expect(codes(valider(p)).sort()).toEqual([
      'identifiant-duplique',
      'prescription-incompatible',
      'structure-invalide',
    ]);
  });
});

describe('les semaines', () => {
  it('avec une durée : chaque semaine est décrite une fois, ni plus ni moins', () => {
    const ok = base();
    ok.programme.dureeSemaines = 4;
    ok.semaines[0].numeros = [1, 2, 3, 4];
    expect(accepte(valider(ok)).rapport.dureeADemander).toBe(false);

    const trou = base();
    trou.programme.dureeSemaines = 4;
    trou.semaines[0].numeros = [1, 2, 4];
    expect(codes(valider(trou))).toEqual(['structure-invalide']);

    const sansNumeros = base();
    sansNumeros.programme.dureeSemaines = 4;
    expect(codes(valider(sansNumeros))).toEqual(['structure-invalide']);
  });

  it('sans durée : une seule semaine type, sans numéros', () => {
    const deux = base();
    deux.semaines.push(deux.semaines[0]);
    expect(codes(valider(deux))).toContain('structure-invalide');

    const numerotee = base();
    numerotee.semaines[0].numeros = [1];
    expect(codes(valider(numerotee))).toEqual(['structure-invalide']);
  });
});

describe('une absence n’est jamais zéro', () => {
  it('repos, charge, durée, auteur absents restent null', () => {
    const p = base();
    delete p.semaines[0].seances[0].lignes[0].prescription.reposSec;
    const r = accepte(valider(p));
    const presc = r.programme.semaines[0]!.seances[0]!.lignes[0]!.prescription!;
    expect(presc.reposSec).toBeNull();
    expect(presc.cote).toBeNull();
    expect(presc.series[0]!.chargeKg).toBeNull();
    expect(r.programme.dureeSemaines).toBeNull();
    expect(r.programme.source.auteur).toBeNull();
    expect(r.programme.semaines[0]!.seances[0]!.dureeMinutes).toBeNull();
  });

  it('un null vaut une absence, un 0 écrit reste 0', () => {
    const p = base();
    p.semaines[0].seances[0].lignes[0].prescription.reposSec = null;
    expect(
      accepte(valider(p)).programme.semaines[0]!.seances[0]!.lignes[0]!.prescription!.reposSec,
    ).toBeNull();
    p.semaines[0].seances[0].lignes[0].prescription.reposSec = 0;
    expect(
      accepte(valider(p)).programme.semaines[0]!.seances[0]!.lignes[0]!.prescription!.reposSec,
    ).toBe(0);
  });
});

describe('le classement', () => {
  it('une pyramide 12/10/8/6 est compatible, série par série', () => {
    const p = base();
    p.semaines[0].seances[0].lignes[0].prescription = {
      detail: [12, 10, 8, 6].map((reps) => ({ objectif: { type: 'reps', reps } })),
      reposSec: 90,
    };
    const r = accepte(valider(p));
    const l = r.programme.semaines[0]!.seances[0]!.lignes[0]!;
    expect(l.etat).toBe('compatible');
    expect(l.prescription!.series.map((s) => s.objectif)).toEqual(
      [12, 10, 8, 6].map((reps) => ({ type: 'reps', reps })),
    );
  });

  it('un AMRAP au temps reste consultable : texte gardé, aucune série, suivi partiel', () => {
    const p = base();
    p.semaines[0].seances[0].lignes.push({
      exerciceId: 'gainage',
      texteOriginal: 'Max de pompes en 60 s',
    });
    const r = accepte(valider(p));
    expect(r.rapport.lignes).toBe(2);
    expect(r.rapport.compatibles).toBe(1);
    expect(r.rapport.suiviComplet).toBe(false);
    expect(r.rapport.consultables).toEqual([
      {
        chemin: 'semaines[0].seances[0].lignes[1]',
        exerciceId: 'gainage',
        texteOriginal: 'Max de pompes en 60 s',
      },
    ]);
    const l = r.programme.semaines[0]!.seances[0]!.lignes[1]!;
    expect(l.etat).toBe('consultable');
    expect(l.prescription).toBeNull();
  });
});

describe('la forme canonique', () => {
  it('ignore la mise en page, pas le contenu', () => {
    const a = accepte(validerProgramme(TRAINING1)).programme;
    // Le même programme sur une seule ligne, sans aucune indentation.
    const b = accepte(validerProgramme(JSON.stringify(JSON.parse(TRAINING1)))).programme;
    expect(formeCanonique(a)).toBe(formeCanonique(b));

    const autre = JSON.parse(TRAINING1);
    autre.semaines[0].seances[1].lignes[1].prescription.objectif.reps = 6;
    expect(formeCanonique(accepte(valider(autre)).programme)).not.toBe(formeCanonique(a));
  });

  it('ne dépend pas de l’ordre des clés du fichier', () => {
    const p = base();
    const inverse = {
      semaines: p.semaines,
      exercices: p.exercices,
      programme: { source: p.programme.source, nom: 'Test', uid: 'testprog01' },
      schemaVersion: 1,
      format: 'majk-programme',
    };
    expect(formeCanonique(accepte(valider(inverse)).programme)).toBe(
      formeCanonique(accepte(valider(p)).programme),
    );
  });
});

describe('isolement', () => {
  it('le validateur ne dépend ni de React, ni de la base, ni d’un autre programme', () => {
    for (const f of ['valider.ts', 'canonique.ts', 'types.ts']) {
      const src = readFileSync(new URL(`./${f}`, import.meta.url), 'utf8');
      expect(src, f).not.toMatch(/from 'react'|from 'dexie'|\/db\/|\/programmes\//);
    }
  });
});

describe('circuits minutés (Top Body Challenge, 25 novembre) — champs FACULTATIFS', () => {
  /** Un circuit de deux lignes : squat puis gainage. */
  function circuit(premiere: Record<string, unknown>, derniere: Record<string, unknown>) {
    const o = base();
    const lignes = [
      {
        exerciceId: 'squat',
        texteOriginal: '20 lentes + 20 rapides',
        groupe: 'circuit-1',
        prescription: { series: 2, objectif: { type: 'reps', reps: 40 }, reposSec: 20 },
        ...premiere,
      },
      {
        exerciceId: 'gainage',
        texteOriginal: '3 reps / 20 SEC (20sec repos entre)',
        groupe: 'circuit-1',
        prescription: { series: 2, objectif: { type: 'duree', secondes: 60 }, reposSec: 20 },
        ...derniere,
      },
    ];
    o.semaines[0].seances[0].lignes = lignes;
    return o;
  }

  it('durée du circuit sur la 1re ligne, repos après le dernier tour sur la dernière, passage écrit', () => {
    const r = valider(
      circuit(
        {
          minutesBloc: 10,
          prescription: {
            series: 2,
            objectif: { type: 'reps', reps: 40 },
            reposSec: 20,
            affichage: '20 lentes + 20 rapides',
          },
        },
        { reposApresBloc: 120 },
      ),
    );
    const lignes = accepte(r).programme.semaines[0]!.seances[0]!.lignes;
    expect(lignes[0]).toMatchObject({ minutesBloc: 10 });
    expect(lignes[0]!.prescription!.affichage).toBe('20 lentes + 20 rapides');
    expect(lignes[1]).toMatchObject({ reposApresBloc: 120 });
  });

  it('absents, ils n’apparaissent pas : un ancien fichier garde EXACTEMENT sa forme', () => {
    const lignes = accepte(valider(circuit({}, {}))).programme.semaines[0]!.seances[0]!.lignes;
    for (const l of lignes) {
      expect(l).not.toHaveProperty('minutesBloc');
      expect(l).not.toHaveProperty('reposApresBloc');
      expect(l.prescription).not.toHaveProperty('affichage');
    }
    // Training 1 (importé avant ces champs) : même forme canonique qu'avant.
    const t1 = validerProgramme(TRAINING1);
    expect(t1.ok && formeCanonique(t1.programme)).not.toContain('minutesBloc');
  });

  it('mal placés ou hors d’un groupe : refusé', () => {
    expect(codes(valider(circuit({ reposApresBloc: 120 }, {})))).toContain('structure-invalide');
    expect(codes(valider(circuit({}, { minutesBloc: 10 })))).toContain('structure-invalide');
    const seul = base();
    seul.semaines[0].seances[0].lignes[0].minutesBloc = 10;
    expect(codes(valider(seul))).toContain('structure-invalide');
    expect(codes(valider(circuit({ minutesBloc: 0 }, {})))).toContain('structure-invalide');
    expect(
      codes(
        valider(
          circuit(
            {
              prescription: {
                series: 2,
                objectif: { type: 'reps', reps: 40 },
                reposSec: 20,
                affichage: '',
              },
            },
            {},
          ),
        ),
      ),
    ).toContain('structure-invalide');
  });
});
