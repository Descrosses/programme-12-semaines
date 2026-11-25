/**
 * ME, MYSELF & I — ce que l'aperçu d'import montre des illustrations.
 *
 * - `ApercuIllustrations` : les images d'une archive, comptées, avec les
 *   exercices qui resteront sans illustration ;
 * - `FichesProposees` : les fiches déjà dans MAJK au nom identique. Cochées
 *   par défaut, chacune décochable : la personne voit l'image et décide que
 *   c'est le même mouvement (décision de Guillaume, 25 novembre). Rien n'est
 *   rattaché sans être passé sous ses yeux.
 */

import { useEffect, useMemo, useState } from 'react';
import { illustration } from '../../db/programmesImportes';
import type { FicheProposee } from '../../engine/perso/illustrations';
import type { ProgrammeNormalise } from '../../engine/perso/types';
import type { ArchiveAnalysee } from '../../programmes/perso/archiveIllustree';
import { useObjectUrl } from '../PhotoCapture';
import type { Candidate } from '../../db/fichesRetrouvees';
import local from './Perso.module.css';

/** Une vignette : un chemin livré, un Blob, ou une image en base par empreinte. */
function Vignette({ source, alt }: { source: string | Blob | { empreinte: string }; alt: string }) {
  const [lu, setLu] = useState<Blob | null>(null);
  const empreinte = typeof source === 'object' && 'empreinte' in source ? source.empreinte : null;
  useEffect(() => {
    if (empreinte === null) return;
    let vivant = true;
    void illustration(empreinte).then((i) => {
      if (vivant) setLu(i?.blob ?? null);
    });
    return () => {
      vivant = false;
    };
  }, [empreinte]);
  const blob = source instanceof Blob ? source : lu;
  const url = useObjectUrl(blob);
  const src = typeof source === 'string' ? `${import.meta.env.BASE_URL}${source}` : url;
  return (
    <span className={local.vignette}>
      {src !== null && <img src={src} alt={alt} loading="lazy" />}
    </span>
  );
}

/** La source d'image d'une candidate, pour sa vignette. */
function sourceDe(c: Candidate): string | Blob | { empreinte: string } {
  if (c.copie !== undefined) return c.copie.blob;
  return 'majk' in c.lien ? c.image : { empreinte: c.lien.empreinte };
}

const pluriel = (n: number, mot: string) => `${String(n)} ${mot}${n > 1 ? 's' : ''}`;

export function ApercuIllustrations({ analyse }: { analyse: ArchiveAnalysee }) {
  const p = analyse.programme;
  const liens = analyse.liens.liens;
  const illustres = Object.keys(liens).length;
  const sans = useMemo(() => {
    const noms = p.exercices.filter((e) => !Object.hasOwn(liens, e.id)).map((e) => e.nom);
    return [...new Set(noms)];
  }, [p, liens]);
  const blobs = useMemo(
    () =>
      analyse.illustrations.map((i) => ({
        id: i.id,
        nom: i.nom ?? i.id,
        blob: new Blob([new Uint8Array(i.octets)], { type: i.entete.type }),
      })),
    [analyse.illustrations],
  );
  return (
    <div className={local.illustrations}>
      <p className={local.complet}>
        {pluriel(analyse.illustrations.length, 'illustration')} pour{' '}
        {pluriel(illustres, 'exercice')}
        {sans.length > 0 ? ` · sans illustration : ${sans.join(', ')}` : ''}
      </p>
      {/* Les images une à une : repliées, comme le détail de l'import. */}
      <details className={local.replie}>
        <summary>Voir les illustrations</summary>
        <ul className={local.galerie} aria-label="Illustrations de l’archive">
          {blobs.map((b) => (
            <li key={b.id}>
              <Vignette source={b.blob} alt={b.nom} />
              <span>{b.nom}</span>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}

/** Une proposition se désigne par le nom normalisé de son exercice. */
export const cleProposition = (p: FicheProposee) => p.nom.toLowerCase();

export function FichesProposees({
  propositions,
  choisies,
  onChoix,
}: {
  propositions: readonly (FicheProposee & { candidate: Candidate })[];
  choisies: ReadonlySet<string>;
  onChoix: (cle: string, oui: boolean) => void;
}) {
  if (propositions.length === 0) return null;
  return (
    <div className={local.illustrations}>
      <p className={local.sous}>
        Fiches déjà dans MAJK ({propositions.length}) — décoche celles qui ne montrent pas le même
        mouvement
      </p>
      <ul className={local.propositions}>
        {propositions.map((p) => {
          const cle = cleProposition(p);
          return (
            <li key={cle}>
              <label>
                <input
                  type="checkbox"
                  checked={choisies.has(cle)}
                  onChange={(e) => onChoix(cle, e.target.checked)}
                />
                <Vignette source={sourceDe(p.candidate)} alt={`Fiche : ${p.candidate.nom}`} />
                <span>
                  <b>{p.nom}</b>
                  {p.exercices.length > 1 ? ` (${pluriel(p.exercices.length, 'exercice')})` : ''}
                  <br />
                  fiche de {p.candidate.origine} « {p.candidate.nom} »
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Les exercices d'un programme, pour les propositions. */
export const exercicesDe = (p: ProgrammeNormalise) =>
  p.exercices.map((e) => ({ id: e.id, nom: e.nom }));
