/**
 * La lecture d'une archive de programme illustré, et ce qu'une image dit
 * d'elle-même. Toutes les images sont fabriquées (`imagesFactices.ts`).
 */
import { strToU8, zipSync, type Zippable } from 'fflate';
import { describe, expect, it } from 'vitest';
import { estUneArchive, lireArchive, OCTETS_ARCHIVE_MAX } from './archive';
import { empreinteDe, lireEnteteImage } from './enteteImage';
import { jpegFactice, pngFactice, webpFactice } from './imagesFactices';

const MANIFESTE = strToU8('{"format":"majk-illustrations"}');
const zip = (f: Zippable) => zipSync(f);
const codes = (o: Uint8Array) => {
  const r = lireArchive(o);
  return r.ok ? [] : r.erreurs.map((e) => e.message);
};

describe('une archive — acceptée', () => {
  it('programme, liens et images ; dossiers, fichiers cachés et __MACOSX ignorés', () => {
    const r = lireArchive(
      zip({
        'programme.json': strToU8('{}'),
        'majk-illustrations.json': MANIFESTE,
        'images/bridge.png': pngFactice(10, 10),
        'images/.DS_Store': strToU8('x'),
        '__MACOSX/images/._bridge.png': strToU8('x'),
      }),
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.contenu.programme).toBe('{}');
    expect([...r.contenu.images.keys()]).toEqual(['images/bridge.png']);
  });

  it('un dossier qui enveloppe tout (« Compresser » sur iPhone) est retiré des chemins', () => {
    const r = lireArchive(
      zip({
        'MAJK_TBC/majk-illustrations.json': MANIFESTE,
        'MAJK_TBC/images/bridge.png': pngFactice(10, 10),
      }),
    );
    expect(r.ok && [...r.contenu.images.keys()]).toEqual(['images/bridge.png']);
    expect(r.ok && r.contenu.programme).toBeNull();
  });
});

describe('une archive — refusée', () => {
  it('ce n’est pas un .zip', () => {
    expect(estUneArchive(strToU8('{"format":"majk-programme"}'))).toBe(false);
    expect(codes(strToU8('bonjour'))).toEqual(['Ce fichier n’est pas une archive .zip.']);
    const abime = zip({ 'majk-illustrations.json': MANIFESTE }).slice(0, 30);
    expect(codes(abime)[0]).toContain('illisible');
  });

  it('trop lourde, avant même d’être ouverte', () => {
    const o = new Uint8Array(OCTETS_ARCHIVE_MAX + 1);
    o.set([0x50, 0x4b, 0x03, 0x04]);
    expect(codes(o)[0]).toContain('dépasse');
  });

  it('sans fichier de liens', () => {
    expect(codes(zip({ 'images/a.png': pngFactice(1, 1) }))[0]).toContain(
      'majk-illustrations.json',
    );
  });

  it('un fichier inattendu est nommé (ex. les anciens exercices.json et correspondances)', () => {
    const m = codes(
      zip({
        'majk-illustrations.json': MANIFESTE,
        'exercices.json': strToU8('[]'),
        'images/a.gif': strToU8('GIF89a'),
      }),
    );
    expect(m).toHaveLength(2);
    expect(m[0]).toContain('« exercices.json » : fichier inattendu');
    expect(m[1]).toContain('« images/a.gif »');
  });

  it('bombe zip : une image qui se DÉCLARE trop lourde est refusée sans être extraite', () => {
    const m = codes(
      zip({ 'majk-illustrations.json': MANIFESTE, 'images/a.png': new Uint8Array(2_000_001) }),
    );
    expect(m).toEqual(['« images/a.png » dépasse 2 Mo.']);
  });

  it('le total décompressé est plafonné', () => {
    const f: Zippable = { 'majk-illustrations.json': MANIFESTE };
    for (let i = 0; i < 8; i++) f[`images/${String(i)}.png`] = new Uint8Array(1_999_000);
    expect(codes(zip(f)).at(-1)).toContain('Le contenu de l’archive dépasse 15 Mo');
  });

  it('un texte qui n’est pas en UTF-8', () => {
    const m = codes(zip({ 'majk-illustrations.json': new Uint8Array([0xff, 0xfe, 0x00]) }));
    expect(m[0]).toContain('UTF-8');
  });
});

describe('ce qu’une image dit d’elle-même', () => {
  it('PNG, JPEG, WebP : le type vient du contenu, avec les dimensions', () => {
    expect(lireEnteteImage(pngFactice(548, 210))).toEqual({
      type: 'image/png',
      largeur: 548,
      hauteur: 210,
    });
    expect(lireEnteteImage(jpegFactice(1200, 800))).toEqual({
      type: 'image/jpeg',
      largeur: 1200,
      hauteur: 800,
    });
    expect(lireEnteteImage(webpFactice(4096, 3))).toEqual({
      type: 'image/webp',
      largeur: 4096,
      hauteur: 3,
    });
  });

  it('un faux PNG, un GIF, un SVG, du vide : rien', () => {
    expect(lireEnteteImage(strToU8('<svg xmlns="http://www.w3.org/2000/svg"/>'))).toBeNull();
    expect(lireEnteteImage(strToU8('GIF89a\x01\x00\x01\x00'))).toBeNull();
    expect(lireEnteteImage(new Uint8Array(0))).toBeNull();
    expect(lireEnteteImage(pngFactice(0, 10))).toBeNull();
    expect(lireEnteteImage(pngFactice(10, 10).slice(0, 20))).toBeNull();
  });

  it('l’empreinte : même contenu, même empreinte ; un octet change, tout change', async () => {
    const a = await empreinteDe(pngFactice(10, 10, 1));
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(await empreinteDe(pngFactice(10, 10, 1))).toBe(a);
    expect(await empreinteDe(pngFactice(10, 10, 2))).not.toBe(a);
  });
});
