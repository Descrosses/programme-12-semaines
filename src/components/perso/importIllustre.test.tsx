/**
 * La page d'import d'un programme illustré (ME, MYSELF & I).
 *
 * - le sélecteur accepte un .json ET un .zip ;
 * - l'aperçu compte les illustrations et nomme les exercices sans image ;
 * - les fiches retrouvées sont des cases COCHÉES, chacune nommant d'où vient
 *   la fiche : rien n'est rattaché sans être passé sous les yeux.
 */
import { readFileSync } from 'node:fs';
import { strToU8, zipSync } from 'fflate';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { Candidate } from '../../db/fichesRetrouvees';
import { pngFactice } from '../../media/imagesFactices';
import { analyserArchive } from '../../programmes/perso/archiveIllustree';
import { ApercuIllustrations, cleProposition, FichesProposees } from './Illustrations';
import { ImportProgramme } from './ImportProgramme';

const T1 = readFileSync(
  new URL('../../engine/perso/__fixtures__/training1.json', import.meta.url),
  'utf8',
);

describe('le sélecteur de fichier', () => {
  it('accepte un programme .json et une archive .zip', () => {
    const html = renderToStaticMarkup(<ImportProgramme onImporte={() => {}} />);
    expect(html).toContain('accept="application/json,.json,application/zip,.zip"');
    expect(html).toContain('une archive .zip');
  });
});

describe('l’aperçu des illustrations', () => {
  it('compte les images et les exercices, et nomme ceux qui resteront sans image', async () => {
    const manifeste = {
      format: 'majk-illustrations',
      schemaVersion: 1,
      programmeUid: 'training1guillaume201005',
      illustrations: [
        { id: 'squat', fichier: 'images/squat.png', nom: 'Squat' },
        { id: 'fentes', fichier: 'images/fentes.png', nom: 'Fentes' },
      ],
      liens: { squat: 'squat', fentes: 'fentes', arnold: 'squat' },
    };
    const r = await analyserArchive(
      zipSync({
        'programme.json': strToU8(T1),
        'majk-illustrations.json': strToU8(JSON.stringify(manifeste)),
        'images/squat.png': pngFactice(300, 200, 1),
        'images/fentes.png': pngFactice(300, 200, 2),
      }),
      () => null,
    );
    if (!r.ok) throw new Error('archive');
    const html = renderToStaticMarkup(<ApercuIllustrations analyse={r.analyse} />);
    expect(html).toContain('2 illustrations pour 3 exercices · sans illustration : ');
    expect(html).toContain('Arrière épaule oiseau à la poulie haute');
    expect(html).not.toMatch(/sans illustration : [^<]*Fentes/);
    expect(html.match(/<li>/g)).toHaveLength(2);
  });
});

describe('les fiches retrouvées', () => {
  const candidate: Candidate = {
    image: 'fiches/curl-barre-ez.webp',
    nom: 'Curl barre EZ',
    origine: 'MASS CONGESTION',
    lien: { majk: 'mass4:curl-barre-ez' },
  };
  const proposition = { nom: 'Curl barre Ez', exercices: ['curl-ez', 'curl-ez-2'], candidate };

  it('une case par mouvement, cochée, qui dit d’où vient la fiche', () => {
    const html = renderToStaticMarkup(
      <FichesProposees
        propositions={[proposition]}
        choisies={new Set([cleProposition(proposition)])}
        onChoix={() => {}}
      />,
    );
    expect(html).toContain('décoche celles qui ne montrent pas le même mouvement');
    expect(html).toContain('type="checkbox" checked=""');
    expect(html).toContain('<b>Curl barre Ez</b> (2 exercices)');
    expect(html).toContain('fiche de MASS CONGESTION « Curl barre EZ »');
    expect(html).toMatch(/src="[^"]*\/fiches\/curl-barre-ez\.webp"/);
  });

  it('décochée, elle le reste ; sans proposition, rien ne s’affiche', () => {
    const html = renderToStaticMarkup(
      <FichesProposees propositions={[proposition]} choisies={new Set()} onChoix={() => {}} />,
    );
    expect(html).not.toContain('checked');
    expect(
      renderToStaticMarkup(
        <FichesProposees propositions={[]} choisies={new Set()} onChoix={() => {}} />,
      ),
    ).toBe('');
  });
});

describe('l’aperçu reste court (Guillaume, 25 novembre : « un utilisateur n’en a que faire »)', () => {
  it('le détail de l’import et la galerie sont REPLIÉS, une consigne répétée s’écrit une fois', async () => {
    const { ApercuImport } = await import('./ImportProgramme');
    const { validerProgramme } = await import('../../engine/perso/valider');
    const o = JSON.parse(T1);
    // Deux lignes hors groupe (une ligne de groupe doit garder son repos).
    const libres = o.semaines[0].seances
      .flatMap((s: { lignes: Record<string, unknown>[] }) => s.lignes)
      .filter((l: Record<string, unknown>) => l.groupe === undefined)
      .slice(0, 2);
    for (const l of libres) {
      delete l.prescription;
      l.texteOriginal = '20 lentes + 20 rapides';
    }
    const v = validerProgramme(JSON.stringify(o));
    if (!v.ok) throw new Error('fichier');
    const html = renderToStaticMarkup(
      <ApercuImport
        validation={v}
        duree={8}
        onDuree={() => {}}
        resultat={null}
        onImporter={() => {}}
        onAnnuler={() => {}}
      />,
    );
    expect(html).toMatch(/<details[^>]*><summary>Voir le détail de l’import<\/summary>/);
    expect(html).not.toMatch(/<details[^>]* open/);
    expect(html.match(/20 lentes \+ 20 rapides/g)).toHaveLength(1);
    expect(html).toContain('20 lentes + 20 rapides (× 2)');
    // Ni le nom du PDF ni le nombre de lignes : ils n'aident pas à décider.
    expect(html).not.toMatch(/exercices<\/p>/);
  });
});
