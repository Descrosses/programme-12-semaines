/**
 * Une archive de programme illustré, analysée de bout en bout avant tout
 * enregistrement. Programme : Training 1 (le fichier d'exemple du dépôt).
 * Images : fabriquées — jamais de contenu tiers dans le dépôt.
 */
import { readFileSync } from 'node:fs';
import { strToU8, zipSync, type Zippable } from 'fflate';
import { describe, expect, it } from 'vitest';
import { validerProgramme } from '../../engine/perso/valider';
import { pngFactice } from '../../media/imagesFactices';
import { analyserArchive } from './archiveIllustree';

const T1 = readFileSync(
  new URL('../../engine/perso/__fixtures__/training1.json', import.meta.url),
  'utf8',
);
const UID = 'training1guillaume201005';
const doc = (() => {
  const v = validerProgramme(T1);
  if (!v.ok) throw new Error('fixture');
  return v.programme;
})();

const liensDe = (l: Record<string, unknown>) => ({
  format: 'majk-illustrations',
  schemaVersion: 1,
  programmeUid: UID,
  illustrations: [
    { id: 'oiseau', fichier: 'images/oiseau.png', nom: 'Oiseau' },
    { id: 'squat', fichier: 'images/squat.png' },
  ],
  liens: l,
});
const BONS = liensDe({
  'oiseau-poulie-haute': 'oiseau',
  'oiseau-banc-incline': 'oiseau',
  squat: 'squat',
  'leg-curl': { majk: 'power12:back-squat' },
  fentes: null,
});

const archive = (manifeste: unknown, extra: Zippable = {}, avecProgramme = true) =>
  zipSync({
    ...(avecProgramme ? { 'programme.json': strToU8(T1) } : {}),
    'majk-illustrations.json': strToU8(JSON.stringify(manifeste)),
    'images/oiseau.png': pngFactice(548, 210, 1),
    'images/squat.png': pngFactice(303, 255, 2),
    ...extra,
  });

const rien = () => null;

describe('archive illustrée — acceptée', () => {
  it('programme validé, liens par EMPREINTE, une image par contenu distinct', async () => {
    const r = await analyserArchive(archive(BONS), rien);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const { analyse } = r;
    expect(analyse.programme.uid).toBe(UID);
    expect(analyse.texteProgramme).toBe(T1);
    expect(analyse.illustrations.map((i) => [i.id, i.entete])).toEqual([
      ['oiseau', { type: 'image/png', largeur: 548, hauteur: 210 }],
      ['squat', { type: 'image/png', largeur: 303, hauteur: 255 }],
    ]);
    const [oiseau, squat] = analyse.illustrations;
    expect(analyse.liens.liens).toEqual({
      'oiseau-poulie-haute': { empreinte: oiseau!.empreinte },
      'oiseau-banc-incline': { empreinte: oiseau!.empreinte },
      squat: { empreinte: squat!.empreinte },
      'leg-curl': { majk: 'power12:back-squat' },
    });
    // Le null déclaré ne s'enregistre pas : pas de lien = pas d'illustration.
    expect(analyse.liens.liens).not.toHaveProperty('fentes');
  });

  it('deux fichiers au contenu identique ne donnent qu’une image', async () => {
    const m = {
      ...BONS,
      illustrations: [
        ...BONS.illustrations,
        { id: 'oiseau-bis', fichier: 'images/oiseau-bis.png' },
      ],
      liens: { ...BONS.liens, arnold: 'oiseau-bis' },
    };
    const r = await analyserArchive(
      archive(m, { 'images/oiseau-bis.png': pngFactice(548, 210, 1) }),
      rien,
    );
    expect(r.ok && r.analyse.illustrations).toHaveLength(2);
    expect(r.ok && r.analyse.liens.liens['arnold']).toEqual(
      r.ok && r.analyse.liens.liens['oiseau-poulie-haute'],
    );
  });

  it('sans programme.json : complète la version déjà importée que désigne le fichier', async () => {
    const r = await analyserArchive(archive(BONS, {}, false), (uid) => (uid === UID ? doc : null));
    expect(r.ok && r.analyse.texteProgramme).toBeNull();
    expect(r.ok && r.analyse.programme.uid).toBe(UID);
  });
});

describe('archive illustrée — refusée en entier', () => {
  const erreurs = async (o: Uint8Array, deja = rien) => {
    const r = await analyserArchive(o, deja);
    return r.ok ? [] : r.erreurs;
  };

  it('sans programme.json, pour un programme jamais importé', async () => {
    const e = await erreurs(archive(BONS, {}, false));
    expect(e[0]!.message).toContain('n’est pas importé');
  });

  it('un programme.json invalide : les erreurs du validateur, situées', async () => {
    const o = zipSync({
      'programme.json': strToU8('{"format":"majk-programme","schemaVersion":1}'),
      'majk-illustrations.json': strToU8(JSON.stringify(BONS)),
    });
    const e = await erreurs(o);
    expect(e.length).toBeGreaterThan(0);
    expect(e.every((x) => x.chemin.startsWith('programme.json › '))).toBe(true);
  });

  it('les liens d’un autre programme', async () => {
    const e = await erreurs(archive({ ...BONS, programmeUid: 'topbodychallenge01' }));
    expect(e.map((x) => x.code)).toEqual(['programme-different']);
  });

  it('une image de l’archive qu’aucune illustration ne déclare', async () => {
    const e = await erreurs(archive(BONS, { 'images/orpheline.png': pngFactice(5, 5) }));
    expect(e.map((x) => [x.code, x.chemin])).toEqual([
      ['illustration-inutilisee', 'images/orpheline.png'],
    ]);
  });

  it('un « .png » qui n’est pas une image', async () => {
    const o = archive(BONS, { 'images/squat.png': strToU8('<script>alert(1)</script>') });
    const e = await erreurs(o);
    expect(e.map((x) => [x.code, x.chemin])).toEqual([['image-invalide', 'images/squat.png']]);
  });

  it('une image démesurée, refusée avant d’être dépliée en mémoire', async () => {
    const o = archive(BONS, { 'images/squat.png': pngFactice(4097, 10) });
    const e = await erreurs(o);
    expect(e[0]!.message).toContain('4097 × 10 px');
  });
});
