/**
 * Le fichier de liens d'un programme illustré (`majk-illustrations.json`).
 *
 * Règles de Guillaume (25 novembre) : l'association repose sur des
 * identifiants, jamais sur une ressemblance de noms ; aucune association
 * incertaine n'est faite en silence ; un fichier fautif est refusé en entier.
 */
import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  nomNormalise,
  proposerFiches,
  relireLiensStockes,
  validerManifeste,
  empreintesDe,
  type ContexteManifeste,
  type FicheCandidate,
} from './illustrations';
import {
  clesFichesNatives,
  ficheNative,
  fichesNatives,
} from '../../programmes/perso/fichesNatives';

const CTX: ContexteManifeste = {
  uid: 'topbodychallenge01',
  exercices: new Set(['bridge-c1t1e1', 'bridge-c1t2e1', 'squat-c1t1e1', 'cardio']),
  fichiers: new Set(['images/bridge.png', 'images/squat.png']),
  fichesMajk: new Set(['power12:back-squat']),
};

const BON = {
  format: 'majk-illustrations',
  schemaVersion: 1,
  programmeUid: 'topbodychallenge01',
  illustrations: [
    { id: 'bridge', fichier: 'images/bridge.png', nom: 'Bridge' },
    { id: 'squat', fichier: 'images/squat.png' },
  ],
  liens: {
    'bridge-c1t1e1': 'bridge',
    'bridge-c1t2e1': 'bridge',
    'squat-c1t1e1': 'squat',
    cardio: null,
  },
};

const avec = (patch: Record<string, unknown>) => JSON.stringify({ ...BON, ...patch });
const erreursDe = (contenu: string, ctx = CTX) => {
  const r = validerManifeste(contenu, ctx);
  return r.ok ? [] : r.erreurs;
};
const codes = (contenu: string, ctx = CTX) => erreursDe(contenu, ctx).map((e) => e.code);

describe('le fichier de liens — accepté', () => {
  it('relie chaque exercice à son illustration, par identifiant', () => {
    const r = validerManifeste(JSON.stringify(BON), CTX);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.manifeste.liens).toEqual({
      'bridge-c1t1e1': { type: 'image', illustration: 'bridge' },
      'bridge-c1t2e1': { type: 'image', illustration: 'bridge' },
      'squat-c1t1e1': { type: 'image', illustration: 'squat' },
      cardio: { type: 'aucune' },
    });
    expect(r.manifeste.illustrations).toEqual([
      { id: 'bridge', fichier: 'images/bridge.png', nom: 'Bridge' },
      { id: 'squat', fichier: 'images/squat.png', nom: null },
    ]);
    expect(r.manifeste.nonMentionnes).toEqual([]);
  });

  it('un exercice que le fichier ne mentionne pas n’a pas d’illustration, et c’est dit', () => {
    const liens = { 'bridge-c1t1e1': 'bridge', 'bridge-c1t2e1': 'bridge', 'squat-c1t1e1': 'squat' };
    const r = validerManifeste(avec({ liens }), CTX);
    expect(r.ok && r.manifeste.nonMentionnes).toEqual(['cardio']);
  });

  it('une fiche de MAJK se désigne par sa clé', () => {
    const liens = { ...BON.liens, 'squat-c1t1e1': { majk: 'power12:back-squat' } };
    const r = validerManifeste(avec({ liens, illustrations: [BON.illustrations[0]] }), CTX);
    expect(r.ok && r.manifeste.liens['squat-c1t1e1']).toEqual({
      type: 'majk',
      fiche: 'power12:back-squat',
    });
  });
});

describe('le fichier de liens — refusé, en entier', () => {
  it('un fichier qui n’est pas un fichier d’illustrations', () => {
    expect(codes('pas du json')).toEqual(['json-invalide']);
    expect(codes(avec({ format: 'majk-programme' }))).toEqual(['version-inconnue']);
    expect(erreursDe(avec({ schemaVersion: 2 }))[0]!.message).toContain(
      'mets l’application à jour',
    );
  });

  it('les illustrations d’un AUTRE programme', () => {
    expect(codes(avec({ programmeUid: 'training1guillaume' }))).toEqual(['programme-different']);
  });

  it('une clé inconnue (une consigne perdue sans bruit)', () => {
    expect(codes(avec({ correspondances: {} }))).toEqual(['structure-invalide']);
    const illus = [{ ...BON.illustrations[0], page: 14 }, BON.illustrations[1]];
    expect(erreursDe(avec({ illustrations: illus }))[0]!.chemin).toBe('illustrations[0].page');
  });

  it('une image absente de l’archive', () => {
    const ctx = { ...CTX, fichiers: new Set(['images/bridge.png']) };
    const e = erreursDe(JSON.stringify(BON), ctx);
    expect(e.map((x) => x.code)).toContain('fichier-manquant');
    expect(e.find((x) => x.code === 'fichier-manquant')!.message).toContain('images/squat.png');
  });

  it('un chemin qui sort de l’archive, ou un format d’image non accepté', () => {
    for (const fichier of [
      '../images/bridge.png',
      '/images/bridge.png',
      'images/../bridge.png',
      './images/bridge.png',
      'images/bridge.svg',
      'images/bridge.gif',
      'images\\bridge.png',
    ]) {
      const illus = [{ id: 'bridge', fichier }, BON.illustrations[1]];
      expect({ fichier, codes: codes(avec({ illustrations: illus })) }).toMatchObject({
        fichier,
        codes: expect.arrayContaining(['structure-invalide']),
      });
    }
  });

  it('une illustration ou une image déclarée deux fois (pas de doublon)', () => {
    const memeId = [BON.illustrations[0], { id: 'bridge', fichier: 'images/squat.png' }];
    expect(codes(avec({ illustrations: memeId }))).toContain('identifiant-duplique');
    const memeFichier = [BON.illustrations[0], { id: 'squat', fichier: 'images/bridge.png' }];
    expect(codes(avec({ illustrations: memeFichier }))).toContain('identifiant-duplique');
  });

  it('un lien vers un exercice que le programme n’a pas', () => {
    expect(codes(avec({ liens: { ...BON.liens, 'plank-c9': 'bridge' } }))).toEqual([
      'exercice-inconnu',
    ]);
  });

  it('un lien vers une illustration non déclarée, ou une fiche de MAJK inconnue', () => {
    expect(codes(avec({ liens: { ...BON.liens, cardio: 'velo' } }))).toEqual(['fichier-manquant']);
    expect(codes(avec({ liens: { ...BON.liens, cardio: { majk: 'power12:inconnu' } } }))).toEqual([
      'fichier-manquant',
    ]);
    expect(codes(avec({ liens: { ...BON.liens, cardio: { majk: 'x', autre: 1 } } }))).toEqual([
      'structure-invalide',
    ]);
    expect(codes(avec({ liens: { ...BON.liens, cardio: 3 } }))).toEqual(['structure-invalide']);
  });

  it('une image que rien n’utilise est un oubli de lien', () => {
    const liens = { ...BON.liens, 'squat-c1t1e1': null };
    expect(codes(avec({ liens }))).toEqual(['illustration-inutilisee']);
  });

  it('pas de liens du tout', () => {
    const { liens: _liens, ...sansLiens } = BON;
    expect(codes(JSON.stringify(sansLiens))).toEqual(['structure-invalide']);
  });

  it('une clé piégée (__proto__) ne passe pas', () => {
    const contenu = JSON.stringify(BON).replace('"cardio":null', '"__proto__":"bridge"');
    expect(codes(contenu)).toContain('structure-invalide');
  });

  it('toutes les erreurs d’un coup, pour corriger le fichier en une passe', () => {
    const contenu = avec({
      programmeUid: 'autre12345',
      liens: { ...BON.liens, inconnu: 'bridge', cardio: 'velo' },
    });
    expect(codes(contenu).sort()).toEqual(
      ['exercice-inconnu', 'fichier-manquant', 'programme-different'].sort(),
    );
  });

  it('un fichier trop lourd est refusé avant d’être lu', () => {
    const lourd = avec({ illustrations: BON.illustrations, x: 'a'.repeat(600_000) });
    expect(codes(lourd)).toEqual(['json-invalide']);
  });
});

describe('les liens enregistrés (relus à la restauration)', () => {
  const ex = new Set(['bridge-c1t1e1', 'squat-c1t1e1']);
  const majk = new Set(['power12:back-squat']);
  const h = 'a'.repeat(64);

  it('relit une empreinte ou une fiche de MAJK', () => {
    const v = {
      liens: { 'bridge-c1t1e1': { empreinte: h }, 'squat-c1t1e1': { majk: 'power12:back-squat' } },
    };
    expect(relireLiensStockes(v, ex, majk)).toEqual(v);
    expect(empreintesDe(relireLiensStockes(v, ex, majk)!)).toEqual(new Set([h]));
  });

  it('refuse tout le reste, sans garder de moitié', () => {
    for (const v of [
      null,
      { liens: { inconnu: { empreinte: h } } },
      { liens: { 'bridge-c1t1e1': { empreinte: 'zz' } } },
      { liens: { 'bridge-c1t1e1': { majk: 'power12:inconnu' } } },
      { liens: { 'bridge-c1t1e1': { empreinte: h, majk: 'power12:back-squat' } } },
      { liens: {}, autre: 1 },
    ]) {
      expect(relireLiensStockes(v, ex, majk)).toBeNull();
    }
  });
});

describe('les fiches retrouvées par nom — des PROPOSITIONS', () => {
  const c = (nom: string, image: string, origine = 'POWER'): FicheCandidate => ({
    nom,
    image,
    origine,
    lien: { majk: `power12:${image}` },
  });

  it('nom strictement identique, accents et casse mis à part', () => {
    expect(nomNormalise('  Corde  à   SAUTER ')).toBe('corde a sauter');
    const p = proposerFiches(
      [
        { id: 'corde-c1', nom: 'Corde à sauter' },
        { id: 'corde-c2', nom: 'corde a sauter' },
        { id: 'squat-c1', nom: 'Squat' },
      ],
      new Set(),
      [c('Corde à sauter', 'corde'), c('Back Squat', 'back-squat')],
    );
    expect(p).toEqual([
      {
        nom: 'Corde à sauter',
        exercices: ['corde-c1', 'corde-c2'],
        candidate: c('Corde à sauter', 'corde'),
      },
    ]);
  });

  it('jamais de ressemblance : un pluriel, un mot en plus, c’est un autre nom', () => {
    const p = proposerFiches(
      [
        { id: 'a', nom: 'Sit up' },
        { id: 'b', nom: 'Squat' },
      ],
      new Set(),
      [c('Sit ups', 'situps'), c('Squat barre', 'sq')],
    );
    expect(p).toEqual([]);
  });

  it('deux planches différentes sous le même nom : rien (ce serait un pari)', () => {
    const p = proposerFiches([{ id: 'a', nom: 'Curl' }], new Set(), [
      c('Curl', 'curl-barre'),
      c('Curl', 'curl-halteres', 'MASS'),
    ]);
    expect(p).toEqual([]);
  });

  it('la même planche trouvée deux fois reste une seule proposition', () => {
    const p = proposerFiches([{ id: 'a', nom: 'Curl' }], new Set(), [
      c('Curl', 'x'),
      c('curl', 'x'),
    ]);
    expect(p).toHaveLength(1);
  });

  it('un exercice qui a déjà son illustration n’est pas concerné', () => {
    const p = proposerFiches([{ id: 'a', nom: 'Curl' }], new Set(['a']), [c('Curl', 'x')]);
    expect(p).toEqual([]);
  });
});

describe('les fiches de MAJK désignables', () => {
  it('POWER, MASS CONGESTION et MASS FORCE, une clé par exercice, aucune de LADIES', () => {
    const f = fichesNatives();
    expect(new Set(f.map((x) => x.cle)).size).toBe(f.length);
    const programmes = new Set(f.map((x) => x.programme));
    expect([...programmes].sort()).toEqual(['MASS CONGESTION', 'MASS FORCE', 'POWER']);
    expect(f.some((x) => /femmes|ladies/i.test(x.cle))).toBe(false);
    expect(clesFichesNatives().has('power12:back-squat')).toBe(true);
  });

  it('chaque fiche désignable existe sur le disque', () => {
    for (const x of fichesNatives()) {
      expect({
        cle: x.cle,
        existe: existsSync(new URL(`../../../public/${x.fiche}`, import.meta.url)),
      }).toEqual({
        cle: x.cle,
        existe: true,
      });
    }
    expect(ficheNative('power12:back-squat')).toMatch(/^fiches\/.+\.webp$/);
    expect(ficheNative('power12:inconnu')).toBeUndefined();
  });
});
