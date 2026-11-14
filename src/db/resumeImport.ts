/**
 * Ce qu'une restauration va faire, dit AVANT de le faire (P1-D, lot de
 * stabilisation).
 *
 * Régression : choisir un fichier remplaçait aussitôt toutes les données du
 * téléphone ; seul un texte d'aide prévenait. L'écran passe désormais par une
 * confirmation, et ces phrases disent ce que le fichier contient, ce qui sera
 * remplacé et ce qui ne sera pas touché.
 */
import { humanDate } from '../engine/calendar';
import type { AnyExportFile } from './export';

export interface ResumeImport {
  /** « Fichier du 14 novembre : 12 séances, 180 séries, 4 références du combiné. » */
  contenu: string;
  /** Ce qui sera remplacé — tout, et le dire. */
  remplace: string;
  /** Ce qui ne sera pas touché. */
  garde: string;
  /** Le libellé du bouton qui confirme. */
  bouton: string;
}

const n = (k: number, un: string, plusieurs: string) => `${k} ${k > 1 ? plusieurs : un}`;

function dateDu(iso: string): string {
  const jour = iso.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(jour) ? `Fichier du ${humanDate(jour)}` : 'Fichier';
}

export function resumeImport(f: AnyExportFile): ResumeImport {
  if (f.kind === 'photos') {
    const p = f.file;
    return {
      contenu: `${dateDu(p.exportedAt)} : ${n(p.progressPhotos.length, 'photo de suivi', 'photos de suivi')}, ${n(p.exerciseMedia.length, 'photo d’exercice', 'photos d’exercice')}, ${n((p.exerciseReference ?? []).length, 'fiche technique', 'fiches techniques')}.`,
      remplace: 'Il remplacera TOUTES les photos de ce téléphone.',
      garde: 'Ton historique d’entraînement n’est pas touché.',
      bouton: 'Remplacer mes photos',
    };
  }
  const d = f.file;
  return {
    contenu: `${dateDu(d.exportedAt)} : ${n(d.sessions.length, 'séance', 'séances')}, ${n(d.sets.length, 'série', 'séries')}, ${n((d.referencesForce ?? []).length, 'référence du combiné', 'références du combiné')}.`,
    remplace:
      'Il remplacera TOUTES les données d’entraînement de ce téléphone : cycles, séances, séries, réglages, références du combiné, nutrition et remarques.',
    garde: 'Les photos ne sont pas touchées.',
    bouton: 'Remplacer mes données',
  };
}
