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
