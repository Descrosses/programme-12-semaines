/**
 * Relire le résumé que le questionnaire « Votre plan alimentaire » fait
 * envoyer au coach (`resume()` du moteur du questionnaire, identique au
 * site au caractère près).
 *
 * On colle souvent le MESSAGE ENTIER (bonjour, signature, résumé) : chaque
 * ligne utile est cherchée n'importe où dans le texte. Les libellés sont
 * relus avec ceux du questionnaire (`OPTIONS`) : un libellé inconnu laisse
 * la donnée absente, jamais devinée. Pur : aucun React, aucune base.
 */

import { alimentPour } from '../data/questionnaireAliments';
import { OPTIONS, type CleChoix } from '../data/questionnairePlanAlimentaire';
import type {
  DureeSeance,
  Objectif,
  Pas,
  Rythme,
  Travail,
} from '../data/reglesCiblesNutrition';
import type { ProfilCalcul } from './calculCibles';

export interface LectureResume {
  /** Le texte ressemble-t-il à un résumé du questionnaire ? */
  trouve: boolean;
  /** Le profil complet, ou `null` s'il manque une donnée nécessaire au calcul. */
  profil: ProfilCalcul | null;
  /** Les données nécessaires au calcul qui manquent ou sont illisibles. */
  manquants: string[];
  /** Les aliments choisis, traduits dans le catalogue de l'appli. */
  aliments: string[];
  /** Les identifiants que le catalogue ne connaît pas (aliments ajoutés à la main…). */
  inconnus: string[];
}

/** Apostrophes et espaces normalisés : un message recopié en change souvent. */
const norm = (t: string) =>
  t
    .replace(/[’‘]/g, "'")
    .replace(/[  ]/g, ' ')
    .replace(/[ \t]+/g, ' ');

function ligne(texte: string, cle: string): string | null {
  const re = new RegExp(`^\\s*${cle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*:\\s*(.+?)\\s*$`, 'mi');
  return re.exec(texte)?.[1] ?? null;
}

/** Le libellé affiché → la valeur enregistrée, pour une question du questionnaire. */
function valeur(cle: CleChoix, libelle: string | null, minuscule = false): string | null {
  if (libelle === null) return null;
  const l = norm(libelle).trim();
  const o = OPTIONS[cle].find(([, lib]) => {
    const x = norm(lib);
    return minuscule ? x.toLowerCase() === l.toLowerCase() : x === l;
  });
  return o?.[0] ?? null;
}

/** « 82,5 kg » → 82,5 ; « non renseigné » → null. */
function nombre(brut: string | null): number | null {
  if (brut === null) return null;
  const m = /^(\d+(?:[.,]\d+)?)/.exec(brut.trim());
  return m ? Number(m[1]!.replace(',', '.')) : null;
}

export function lireResume(brut: string): LectureResume {
  const texte = norm(brut);
  const trouve = /^\s*MON PROFIL\s*$/m.test(texte) || /^\s*IDENTIFIANTS\s*:/m.test(texte);

  const manquants: string[] = [];
  const sexe = valeur('sex', ligne(texte, 'Sexe')) as ProfilCalcul['sexe'] | null;
  const age = nombre(ligne(texte, 'Âge'));
  const tailleCm = nombre(ligne(texte, 'Taille'));
  const poidsKg = nombre(ligne(texte, 'Poids'));
  const travail = valeur('job', ligne(texte, 'Travail')) as Travail | null;
  const pas = valeur('steps', ligne(texte, 'Pas par jour')) as Pas | null;

  // « Objectif : Perdre du poids · rythme : modéré »
  const objBrut = ligne(texte, 'Objectif');
  const [objLib, rythmePart] = (objBrut ?? '').split(' · rythme : ');
  const objectif = valeur('goal', objLib ?? null) as Objectif | null;
  const rythme = valeur('pace', rythmePart ?? null, true) as Rythme | null;

  // « Sport : 4 / semaine · 45 à 75 min · Musculation » ou « Aucune séance »
  const sport = ligne(texte, 'Sport');
  let seances: string | null = null;
  let duree: DureeSeance | null = null;
  if (sport !== null && /^Aucune séance$/i.test(sport.trim())) seances = '0';
  else if (sport !== null) {
    const [s, d] = sport.split(' · ');
    seances = valeur('sessions', (s ?? '').replace(/\s*\/\s*semaine\s*$/, ''));
    duree = valeur('duration', d ?? null) as DureeSeance | null;
  }

  const grossesse = valeur('pregnant', ligne(texte, 'Grossesse, allaitement ou accouchement récent'));
  const maladie = valeur('medical', ligne(texte, "Maladie ou traitement influençant l'alimentation"));
  const relation = valeur('eating', ligne(texte, 'Relation compliquée avec la nourriture'));

  if (sexe === null) manquants.push('sexe');
  if (age === null) manquants.push('âge');
  if (tailleCm === null) manquants.push('taille');
  if (poidsKg === null) manquants.push('poids');
  if (travail === null) manquants.push('travail');
  if (pas === null) manquants.push('pas par jour');
  if (seances === null) manquants.push('séances de sport');
  else if (seances !== '0' && duree === null) manquants.push('durée des séances');
  if (objectif === null) manquants.push('objectif');
  else if (objectif !== 'maintien' && rythme === null) manquants.push('rythme');

  const ids = (ligne(texte, 'IDENTIFIANTS') ?? '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
  const aliments: string[] = [];
  const inconnus: string[] = [];
  for (const id of ids) {
    const majk = alimentPour(id);
    if (majk === undefined) inconnus.push(id);
    else if (!aliments.includes(majk)) aliments.push(majk);
  }

  const profil: ProfilCalcul | null =
    manquants.length === 0
      ? {
          sexe: sexe!,
          age: age!,
          tailleCm: tailleCm!,
          poidsKg: poidsKg!,
          travail: travail!,
          pas: pas!,
          seances: seances!,
          duree,
          objectif: objectif!,
          rythme: objectif === 'maintien' ? null : rythme,
          grossesse,
          maladie,
          relation,
        }
      : null;

  return { trouve, profil, manquants, aliments, inconnus };
}
