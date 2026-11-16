/**
 * ME, MYSELF & I, lot 5 : la page d'import et de gestion des programmes.
 *
 * Ce que ces tests figent :
 * - la durée manquante est DEMANDÉE, sans réponse par défaut : « Choisir »
 *   est sélectionné et le bouton d'import reste désactivé tant qu'aucun
 *   nombre n'est choisi ; on ne propose jamais plus de 12 semaines ;
 * - une durée écrite par le document ne se redemande pas ;
 * - le rapport dit « Suivi complet » ou « Suivi partiel : X exercices sur Y »,
 *   et montre ce que le document ne disait pas ;
 * - au catalogue, la famille ME, MYSELF & I propose le panneau d'import,
 *   n'est jamais « À venir », liste les programmes importés et range les
 *   archivés à part ; les autres familles n'ont pas de panneau d'import ;
 * - un programme importé n'ouvre aucun raccourci vers une nutrition.
 */
import 'fake-indexeddb/auto';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vitest';
import type { ProgrammeImporteRow } from '../../db/db';
import { validerProgramme } from '../../engine/perso/valider';
import { remplirMemoire, viderMemoire } from '../../programmes/perso/memoire';
import { moduleParId } from '../../programmes/registre';
import { textesCycle } from '../../programmes/textesCycle';
import { CatalogueScreen } from '../../screens/CatalogueScreen';
import { ApercuImport } from './ImportProgramme';
import { phraseSuivi } from './suivi';

const TEXTE = readFileSync(
  new URL('../../engine/perso/__fixtures__/training1.json', import.meta.url),
  'utf8',
);
const CLE = 'perso-training1guillaume201005-1';

function valide(texte: string) {
  const v = validerProgramme(texte);
  if (!v.ok) throw new Error(JSON.stringify(v.erreurs));
  return v;
}

function ligne(archive = false): ProgrammeImporteRow {
  const v = valide(TEXTE);
  return {
    cle: CLE,
    uid: v.programme.uid,
    rev: 1,
    nom: v.programme.nom,
    importeLe: '2026-11-16',
    archive,
    texte: TEXTE,
    document: v.programme,
    reponses: { dureeSemaines: 8 },
  };
}

const rien = () => {};
const apercu = (texte: string, duree: number | null) =>
  renderToStaticMarkup(
    <ApercuImport
      validation={valide(texte)}
      duree={duree}
      onDuree={rien}
      resultat={null}
      onImporter={rien}
      onAnnuler={rien}
    />,
  );
const boutonImport = (html: string) =>
  /<button[^>]*>Importer ce programme<\/button>/.exec(html)![0];

afterEach(() => viderMemoire());

describe('la question de la durée', () => {
  it('posée sans réponse par défaut, bouton désactivé', () => {
    const html = apercu(TEXTE, null);
    expect(html).toContain('Le document ne fixe pas de durée');
    expect(html).toMatch(/<option value="" selected="">Choisir<\/option>/);
    expect(boutonImport(html)).toContain('disabled');
  });

  it('de 1 à 12 semaines, jamais plus', () => {
    const valeurs = [...apercu(TEXTE, null).matchAll(/<option value="(\d+)"/g)].map((m) =>
      Number(m[1]),
    );
    expect(valeurs).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });

  it('une fois choisie, le bouton s’ouvre', () => {
    const html = apercu(TEXTE, 8);
    expect(html).toMatch(/<option value="8" selected="">/);
    expect(boutonImport(html)).not.toContain('disabled');
  });

  it('écrite par le document, elle ne se redemande pas', () => {
    const o = JSON.parse(TEXTE);
    o.programme.dureeSemaines = 6;
    o.semaines[0].numeros = [1, 2, 3, 4, 5, 6];
    const html = apercu(JSON.stringify(o), null);
    expect(html).not.toContain('<select');
    expect(html).toContain('Durée : 6 semaines, écrite par le document.');
    expect(boutonImport(html)).not.toContain('disabled');
  });
});

describe('le rapport, avant l’enregistrement', () => {
  it('Training 1 : suivi complet, et ses cinq décisions', () => {
    const v = valide(TEXTE);
    expect(phraseSuivi(v.programme)).toBe('Suivi complet');
    const html = apercu(TEXTE, null);
    expect(html).toContain('Suivi complet');
    expect(html).toContain('Ce que le document ne disait pas');
    expect(html.match(/<li><b>/g)).toHaveLength(v.programme.decisions.length);
    expect(v.programme.decisions).toHaveLength(5);
  });

  it('une ligne consultable : « Suivi partiel : 43 exercices sur 44 », et son texte', () => {
    const o = JSON.parse(TEXTE);
    delete o.semaines[0].seances[1].lignes[5].prescription;
    o.semaines[0].seances[1].lignes[5].texteOriginal = 'Mollets : AMRAP 60 s';
    const texte = JSON.stringify(o);
    expect(phraseSuivi(valide(texte).programme)).toBe('Suivi partiel : 43 exercices sur 44');
    const html = apercu(texte, null);
    expect(html).toContain('Suivi partiel : 43 exercices sur 44');
    expect(html).toContain('À lire, hors suivi');
    expect(html).toContain('Mollets : AMRAP 60 s');
  });
});

describe('au catalogue', () => {
  const famille = (html: string, id: string) => {
    const debut = html.indexOf(`id="famille-${id}"`);
    const fin = html.indexOf('<section', debut + 1);
    return html.slice(debut, fin === -1 ? undefined : fin);
  };
  const catalogue = (ouverte: 'perso' | 'power') =>
    renderToStaticMarkup(
      <CatalogueScreen familleOuverte={ouverte} onOuvrirProgramme={rien} onDataChanged={rien} />,
    );

  it('vide : le panneau d’import, et jamais « À venir »', () => {
    remplirMemoire([]);
    const html = famille(catalogue('perso'), 'perso');
    expect(html).toContain('Importer un programme');
    expect(html).toContain('Aucun programme importé pour l’instant.');
    expect(html).not.toContain('À venir');
  });

  it('un programme importé est listé, disponible, avec sa durée choisie', () => {
    remplirMemoire([ligne()]);
    const html = famille(catalogue('perso'), 'perso');
    expect(html).toContain('Training 1');
    expect(html).toContain('8 semaines');
    expect(html).toContain('Disponible');
    expect(html).not.toContain('Aucun programme importé');
    expect(html).not.toContain('Archivés');
  });

  it('archivé : hors de la liste, rangé sous « Archivés », avec « Désarchiver »', () => {
    remplirMemoire([ligne(true)]);
    const html = famille(catalogue('perso'), 'perso');
    expect(html).toContain('Aucun programme importé pour l’instant.');
    const archives = html.slice(html.indexOf('Archivés'));
    expect(archives).toContain('Training 1');
    expect(archives).toContain('Désarchiver');
    expect(archives).toContain('Suivi complet');
  });

  it('les autres familles n’ont pas de panneau d’import', () => {
    remplirMemoire([ligne()]);
    const html = catalogue('power');
    expect(famille(html, 'power')).not.toContain('Importer un programme');
    expect(famille(html, 'power')).toContain('CYCLE 1');
  });
});

describe('hors séance', () => {
  it('un programme importé n’ouvre aucun raccourci vers une nutrition', () => {
    remplirMemoire([ligne()]);
    expect(textesCycle(moduleParId(CLE))).toMatchObject({
      raccourciNutrition: false,
      comparerCombines: false,
      fin: '8 semaines bouclées',
    });
  });
});
