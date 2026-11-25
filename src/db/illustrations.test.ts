/**
 * Les illustrations des programmes importés en base (v26).
 *
 * Ce que ces tests figent (architecture validée par Guillaume, 25 novembre) :
 * - tout ou rien : un import qui échoue ne laisse ni programme ni image ;
 * - une image par EMPREINTE : 12 exercices, deux versions ou deux programmes
 *   qui partagent une image n'en stockent qu'une ;
 * - ajouter des illustrations ne crée pas de nouvelle version ; remplacer
 *   celles d'un programme se confirme ;
 * - plus aucune image orpheline après suppression ou remplacement ;
 * - les images voyagent dans le fichier de PHOTOS, jamais dans le fichier de
 *   données (celui qui part sur le compte en ligne).
 * Images : fabriquées. Jamais de contenu tiers dans le dépôt.
 */
import 'fake-indexeddb/auto';
import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { deleteDB } from './testSchemas';
import { ProgrammeDB } from './db';
import type { ImageAEnregistrer, OptionsImport } from './programmesImportes';

const NOM = 'illustrations-test';
const TRAINING1 = readFileSync(
  new URL('../engine/perso/__fixtures__/training1.json', import.meta.url),
  'utf8',
);
const UID = 'training1guillaume201005';
const H1 = '1'.repeat(64);
const H2 = '2'.repeat(64);
const H3 = '3'.repeat(64);

async function monterBaseJetable(): Promise<ProgrammeDB> {
  await deleteDB(NOM);
  const jetable = new ProgrammeDB(NOM);
  await jetable.open();
  const mod = await import('./db');
  Object.defineProperty(mod, 'db', { value: jetable, configurable: true, writable: true });
  return jetable;
}

const img = (empreinte: string, type = 'image/png'): ImageAEnregistrer => ({
  empreinte,
  blob: new Blob([empreinte.slice(0, 4)], { type }),
  type,
  largeur: 300,
  hauteur: 200,
});

const DUREE = { dureeSemaines: 8, aujourdhui: '2026-11-25' } as const;

function training1Modifie(): string {
  const o = JSON.parse(TRAINING1);
  o.semaines[0].seances[1].lignes[1].prescription.objectif.reps = 6;
  return JSON.stringify(o);
}

/*
 * L'export lit les images avec `FileReader`, absent sous Node : le strict
 * nécessaire (même procédé que `importPhotos.test.ts`).
 */
if (typeof globalThis.FileReader === 'undefined') {
  class FileReaderNode {
    result: string | null = null;
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    readAsDataURL(blob: Blob) {
      blob
        .arrayBuffer()
        .then((buf) => {
          const type = blob.type || 'application/octet-stream';
          this.result = `data:${type};base64,${Buffer.from(buf).toString('base64')}`;
          this.onload?.();
        })
        .catch(() => this.onerror?.());
    }
  }
  (globalThis as { FileReader?: unknown }).FileReader = FileReaderNode;
}

beforeEach(async () => {
  await deleteDB(NOM);
});

describe('importer un programme illustré', () => {
  it('une image par empreinte, les liens sur la ligne du programme', async () => {
    const base = await monterBaseJetable();
    const { importerProgramme } = await import('./programmesImportes');
    const r = await importerProgramme(TRAINING1, {
      ...DUREE,
      liens: {
        squat: { empreinte: H1 },
        fentes: { empreinte: H1 },
        arnold: { empreinte: H2 },
        'leg-curl': { majk: 'power12:back-squat' },
      },
      images: [img(H1), img(H2)],
    });
    expect(r.statut).toBe('importe');
    expect(await base.illustrations.count()).toBe(2);
    const [row] = await base.programmesImportes.toArray();
    expect(row!.illustrations).toEqual({
      liens: {
        squat: { empreinte: H1 },
        fentes: { empreinte: H1 },
        arnold: { empreinte: H2 },
        'leg-curl': { majk: 'power12:back-squat' },
      },
    });
    const [i] = await base.illustrations.where('empreinte').equals(H1).toArray();
    expect(i).toMatchObject({
      type: 'image/png',
      largeur: 300,
      hauteur: 200,
      ajouteLe: '2026-11-25',
    });
  });

  it('un .json sans illustrations s’importe exactement comme avant', async () => {
    const base = await monterBaseJetable();
    const { importerProgramme } = await import('./programmesImportes');
    expect((await importerProgramme(TRAINING1, DUREE)).statut).toBe('importe');
    const [row] = await base.programmesImportes.toArray();
    expect(row).not.toHaveProperty('illustrations');
    expect((await importerProgramme(TRAINING1, DUREE)).statut).toBe('deja-importe');
    expect(await base.illustrations.count()).toBe(0);
  });

  it('TOUT OU RIEN : une image désignée introuvable, rien n’est écrit', async () => {
    const base = await monterBaseJetable();
    const { importerProgramme } = await import('./programmesImportes');
    const r = await importerProgramme(TRAINING1, {
      ...DUREE,
      liens: { squat: { empreinte: H1 }, fentes: { empreinte: H2 } },
      images: [img(H1)],
    });
    expect(r.statut).toBe('refuse');
    expect(await base.programmesImportes.count()).toBe(0);
    expect(await base.illustrations.count()).toBe(0);
  });

  it('refusé avant toute écriture : image sans exercice, exercice inconnu, fiche inconnue, faux type', async () => {
    const base = await monterBaseJetable();
    const { importerProgramme } = await import('./programmesImportes');
    const essais: OptionsImport[] = [
      { liens: { squat: { empreinte: H1 } }, images: [img(H1), img(H2)] },
      { liens: { inconnu: { empreinte: H1 } }, images: [img(H1)] },
      { liens: { squat: { majk: 'power12:inconnu' } }, images: [] },
      { liens: { squat: { empreinte: H1 } }, images: [img(H1, 'image/svg+xml')] },
      { liens: { squat: { empreinte: H1 } }, images: [img(H1), img(H1)] },
    ];
    for (const options of essais) {
      expect((await importerProgramme(TRAINING1, { ...DUREE, ...options })).statut).toBe('refuse');
    }
    expect(await base.programmesImportes.count()).toBe(0);
    expect(await base.illustrations.count()).toBe(0);
  });
});

describe('réimporter, compléter, remplacer', () => {
  it('le même programme avec ses illustrations : posées sur la version en place, pas de version 2', async () => {
    const base = await monterBaseJetable();
    const { importerProgramme } = await import('./programmesImportes');
    await importerProgramme(TRAINING1, DUREE);
    const r = await importerProgramme(TRAINING1, {
      ...DUREE,
      liens: { squat: { empreinte: H1 } },
      images: [img(H1)],
    });
    expect(r).toEqual({ statut: 'illustrations-ajoutees', cle: `perso-${UID}-1` });
    expect(await base.programmesImportes.count()).toBe(1);
    // Le même paquet une seconde fois : rien ne bouge, rien ne double.
    await importerProgramme(TRAINING1, {
      ...DUREE,
      liens: { squat: { empreinte: H1 } },
      images: [img(H1)],
    });
    expect(await base.illustrations.count()).toBe(1);
  });

  it('d’AUTRES illustrations : la personne confirme, et l’ancienne image orpheline s’en va', async () => {
    const base = await monterBaseJetable();
    const { importerProgramme } = await import('./programmesImportes');
    await importerProgramme(TRAINING1, {
      ...DUREE,
      liens: { squat: { empreinte: H1 } },
      images: [img(H1)],
    });
    const autres = { ...DUREE, liens: { squat: { empreinte: H2 } }, images: [img(H2)] };
    expect(await importerProgramme(TRAINING1, autres)).toEqual({
      statut: 'illustrations-a-remplacer',
      cle: `perso-${UID}-1`,
      nom: 'Training 1',
    });
    expect(await base.illustrations.count()).toBe(1);
    expect(
      (await importerProgramme(TRAINING1, { ...autres, remplacerIllustrations: true })).statut,
    ).toBe('illustrations-ajoutees');
    expect((await base.illustrations.toArray()).map((i) => i.empreinte)).toEqual([H2]);
  });

  it('une nouvelle version qui reprend les mêmes images ne les duplique pas', async () => {
    const base = await monterBaseJetable();
    const { importerProgramme } = await import('./programmesImportes');
    const opts = { ...DUREE, liens: { squat: { empreinte: H1 } }, images: [img(H1)] };
    await importerProgramme(TRAINING1, opts);
    const r = await importerProgramme(training1Modifie(), {
      ...opts,
      confirmerNouvelleVersion: true,
    });
    expect(r.statut).toBe('importe');
    expect(await base.programmesImportes.count()).toBe(2);
    expect(await base.illustrations.count()).toBe(1);
  });

  it('une archive sans programme.json complète la version la plus récente', async () => {
    const base = await monterBaseJetable();
    const { completerIllustrations, importerProgramme } = await import('./programmesImportes');
    expect(await completerIllustrations(UID, { liens: {}, images: [] })).toEqual({
      statut: 'introuvable',
    });
    await importerProgramme(TRAINING1, DUREE);
    await importerProgramme(training1Modifie(), { ...DUREE, confirmerNouvelleVersion: true });
    const r = await completerIllustrations(UID, {
      liens: { squat: { empreinte: H3 } },
      images: [img(H3)],
    });
    expect(r).toEqual({ statut: 'illustrations-ajoutees', cle: `perso-${UID}-2` });
    const v1 = await base.programmesImportes.where('cle').equals(`perso-${UID}-1`).first();
    expect(v1).not.toHaveProperty('illustrations');
  });
});

describe('supprimer, sans laisser d’orpheline', () => {
  it('les images d’une version supprimée partent ; celles qu’une autre désigne restent', async () => {
    const base = await monterBaseJetable();
    const { importerProgramme, supprimerProgramme } = await import('./programmesImportes');
    await importerProgramme(TRAINING1, {
      ...DUREE,
      liens: { squat: { empreinte: H1 }, fentes: { empreinte: H2 } },
      images: [img(H1), img(H2)],
    });
    await importerProgramme(training1Modifie(), {
      ...DUREE,
      confirmerNouvelleVersion: true,
      liens: { squat: { empreinte: H1 } },
      images: [img(H1)],
    });
    expect(await supprimerProgramme(`perso-${UID}-1`)).toBe('supprime');
    expect((await base.illustrations.toArray()).map((i) => i.empreinte)).toEqual([H1]);
    expect(await supprimerProgramme(`perso-${UID}-2`)).toBe('supprime');
    expect(await base.illustrations.count()).toBe(0);
  });

  it('une version suivie par un cycle ne se supprime pas, ses images restent', async () => {
    const base = await monterBaseJetable();
    const { importerProgramme, supprimerProgramme } = await import('./programmesImportes');
    await importerProgramme(TRAINING1, {
      ...DUREE,
      liens: { squat: { empreinte: H1 } },
      images: [img(H1)],
    });
    await base.cycles.add({
      programmeId: `perso-${UID}-1`,
      programmeVersion: '1',
      startDate: '2026-11-23',
      statut: 'en-cours',
      endedAt: '',
      createdAt: '2026-11-23',
    });
    expect(await supprimerProgramme(`perso-${UID}-1`)).toBe('utilise-par-un-cycle');
    expect(await base.illustrations.count()).toBe(1);
  });
});

describe('sauvegarde et restauration', () => {
  it('le fichier de DONNÉES (celui du compte en ligne) ne contient aucune image', async () => {
    await monterBaseJetable();
    const { importerProgramme } = await import('./programmesImportes');
    const { exportAll } = await import('./export');
    await importerProgramme(TRAINING1, {
      ...DUREE,
      liens: { squat: { empreinte: H1 } },
      images: [img(H1)],
    });
    const texte = JSON.stringify(await exportAll());
    expect(texte).not.toContain('data:image');
    expect(texte).not.toContain('"illustrations":[');
    // Les liens, eux, y sont : quelques octets, sans image.
    expect(texte).toContain(H1);
  });

  it('le fichier de PHOTOS les emporte et les rend', async () => {
    const base = await monterBaseJetable();
    const { importerProgramme } = await import('./programmesImportes');
    const { exportPhotos, importPhotos } = await import('./export');
    const { demarrerCycle } = await import('./repo');
    await demarrerCycle({ programmeId: 'power12', programmeVersion: '1', startDate: '2026-11-23' });
    await importerProgramme(TRAINING1, {
      ...DUREE,
      liens: { squat: { empreinte: H1 } },
      images: [img(H1)],
    });
    const fichier = await exportPhotos();
    expect(fichier.illustrations).toHaveLength(1);
    expect(fichier.illustrations![0]).toMatchObject({ empreinte: H1, largeur: 300, hauteur: 200 });
    await base.illustrations.clear();
    const rapport = await importPhotos(JSON.parse(JSON.stringify(fichier)));
    expect(rapport.illustrations).toBe(1);
    const [i] = await base.illustrations.toArray();
    expect(i).toMatchObject({ empreinte: H1, type: 'image/png' });
  });

  it('un fichier de photos d’avant les illustrations n’y touche pas', async () => {
    const base = await monterBaseJetable();
    const { importerProgramme } = await import('./programmesImportes');
    const { exportPhotos, importPhotos } = await import('./export');
    const { demarrerCycle } = await import('./repo');
    await demarrerCycle({ programmeId: 'power12', programmeVersion: '1', startDate: '2026-11-23' });
    await importerProgramme(TRAINING1, {
      ...DUREE,
      liens: { squat: { empreinte: H1 } },
      images: [img(H1)],
    });
    const { illustrations: _sans, ...ancien } = await exportPhotos();
    expect((await importPhotos(ancien)).illustrations).toBeNull();
    expect(await base.illustrations.count()).toBe(1);
  });

  it('une illustration illisible : fichier refusé, RIEN n’est effacé', async () => {
    const base = await monterBaseJetable();
    const { importerProgramme } = await import('./programmesImportes');
    const { exportPhotos, importPhotos } = await import('./export');
    const { demarrerCycle } = await import('./repo');
    await demarrerCycle({ programmeId: 'power12', programmeVersion: '1', startDate: '2026-11-23' });
    await importerProgramme(TRAINING1, {
      ...DUREE,
      liens: { squat: { empreinte: H1 } },
      images: [img(H1)],
    });
    const f = await exportPhotos();
    const abime = {
      ...f,
      illustrations: [{ ...f.illustrations![0]!, empreinte: 'pas-une-empreinte' }],
    };
    await expect(importPhotos(abime)).rejects.toThrow('empreinte illisible');
    expect(await base.illustrations.count()).toBe(1);
  });

  it('les liens d’une sauvegarde de données sont relus, ou la sauvegarde refusée', async () => {
    await monterBaseJetable();
    const { programmesDeSauvegarde } = await import('./programmesImportes');
    const ligne = {
      cle: `perso-${UID}-1`,
      texte: TRAINING1,
      reponses: { dureeSemaines: 8 },
      importeLe: '2026-11-25',
      archive: false,
    };
    const ok = programmesDeSauvegarde(
      [{ ...ligne, illustrations: { liens: { squat: { empreinte: H1 } } } }],
      [],
    );
    expect(ok[0]!.illustrations).toEqual({ liens: { squat: { empreinte: H1 } } });
    expect(programmesDeSauvegarde([ligne], [])[0]).not.toHaveProperty('illustrations');
    expect(() =>
      programmesDeSauvegarde(
        [{ ...ligne, illustrations: { liens: { inconnu: { empreinte: H1 } } } }],
        [],
      ),
    ).toThrow('illustrations illisibles');
  });
});
