/**
 * ME, MYSELF & I — le validateur d'un programme importé (ADR D1, §2).
 *
 * ── Ce qu'il garantit ─────────────────────────────────────────────────────
 *
 * MAJK ne voit jamais le PDF : il ne peut pas garantir qu'un fichier lui est
 * fidèle. Il garantit autre chose — rien de ce que contient le fichier n'est
 * modifié, complété ou perdu. Un texte est gardé au caractère près ; une
 * valeur absente reste absente (`null`), elle ne devient jamais 0.
 *
 * ── Comment il répond ─────────────────────────────────────────────────────
 *
 * Il ne lève jamais d'exception. Il rend soit TOUTES les erreurs (pour
 * corriger le fichier en une passe), soit le programme normalisé et son
 * rapport de compatibilité. Il n'y a pas d'import partiel : un fichier qui
 * porte une seule erreur est refusé en entier.
 *
 * Deux erreurs arrêtent tout, parce qu'au-delà rien n'a de sens : un texte
 * qui n'est pas du JSON, un fichier qui n'est pas un programme MAJK de la
 * version connue. Les autres sont toutes collectées.
 *
 * Pur : aucun React, aucune base, aucune dépendance.
 */

import type { DayIndex } from '../../data/types';
import {
  LIMITES,
  type BlocNormalise,
  type CodeErreur,
  type DecisionConversion,
  type ErreurValidation,
  type ExerciceNormalise,
  type LigneConsultable,
  type LigneNormalisee,
  type Objectif,
  type PrescriptionNormalisee,
  type ProgrammeNormalise,
  type ResultatValidation,
  type SeanceNormalisee,
  type SerieNormalisee,
  type SujetDecision,
} from './types';

type Brut = Record<string, unknown>;

/** Identifiant local : minuscules, chiffres, tirets. Il entre dans `perso-<clé>-<id>`. */
const ID_LOCAL = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ID_MAX = 40;
const UID = /^[a-z0-9]{8,24}$/;
const SUJETS: readonly SujetDecision[] = ['jours', 'exclusion', 'identite', 'convention', 'texte'];
/** Des noms que JSON.parse crée comme clés ordinaires, mais qu'on ne recopie jamais. */
const CLES_INTERDITES = new Set(['__proto__', 'constructor', 'prototype']);

class Erreurs {
  readonly liste: ErreurValidation[] = [];
  ajoute(code: CodeErreur, chemin: string, message: string): void {
    this.liste.push({ code, chemin, message });
  }
}

const estObjet = (v: unknown): v is Brut =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/** `null` et l'absence disent la même chose : « non précisé par le document ». */
function lire(o: Brut, cle: string): unknown {
  return Object.hasOwn(o, cle) ? (o[cle] ?? undefined) : undefined;
}

const sous = (chemin: string, cle: string) => (chemin === '' ? cle : `${chemin}.${cle}`);

/**
 * Un objet dont chaque clé est connue. Une clé inconnue est une erreur, pas
 * un oubli toléré : une clé ignorée serait une consigne perdue sans bruit.
 */
function objetStrict(
  v: unknown,
  chemin: string,
  autorisees: readonly string[],
  obligatoires: readonly string[],
  e: Erreurs,
): Brut | null {
  if (!estObjet(v)) {
    e.ajoute('structure-invalide', chemin || 'racine', 'Un objet est attendu ici.');
    return null;
  }
  for (const cle of Object.keys(v)) {
    if (CLES_INTERDITES.has(cle)) {
      e.ajoute('structure-invalide', sous(chemin, cle), `La clé « ${cle} » est interdite.`);
    } else if (!autorisees.includes(cle)) {
      e.ajoute('structure-invalide', sous(chemin, cle), `Clé inconnue « ${cle} ».`);
    }
  }
  for (const cle of obligatoires) {
    if (lire(v, cle) === undefined) {
      e.ajoute('structure-invalide', sous(chemin, cle), `Le champ « ${cle} » est obligatoire.`);
    }
  }
  return v;
}

/** Un texte non vide, gardé TEL QUEL : aucun `trim`, aucune correction. */
function texte(v: unknown, chemin: string, e: Erreurs): string | null {
  if (v === undefined) return null;
  if (typeof v !== 'string') {
    e.ajoute('structure-invalide', chemin, 'Un texte est attendu.');
    return null;
  }
  if (v.trim() === '') {
    e.ajoute('structure-invalide', chemin, 'Ce texte est vide.');
    return null;
  }
  if (v.length > LIMITES.caracteres) {
    e.ajoute(
      'structure-invalide',
      chemin,
      `Ce texte dépasse ${String(LIMITES.caracteres)} caractères.`,
    );
    return null;
  }
  return v;
}

function textes(v: unknown, chemin: string, e: Erreurs): string[] {
  if (v === undefined) return [];
  if (!Array.isArray(v)) {
    e.ajoute('structure-invalide', chemin, 'Une liste de textes est attendue.');
    return [];
  }
  const out: string[] = [];
  v.forEach((x, i) => {
    // Un `null` dans une liste n'est pas une absence : c'est un texte manquant.
    const t = texte(x ?? 0, `${chemin}[${String(i)}]`, e);
    if (t !== null) out.push(t);
  });
  return out;
}

function entier(v: unknown, chemin: string, e: Erreurs, min: number, max?: number): number | null {
  if (v === undefined) return null;
  if (typeof v !== 'number' || !Number.isInteger(v)) {
    e.ajoute('structure-invalide', chemin, 'Un nombre entier est attendu.');
    return null;
  }
  if (v < min || (max !== undefined && v > max)) {
    const borne =
      max === undefined ? `${String(min)} ou plus` : `de ${String(min)} à ${String(max)}`;
    e.ajoute('structure-invalide', chemin, `Valeur ${String(v)} hors bornes (attendu : ${borne}).`);
    return null;
  }
  return v;
}

function positif(v: unknown, chemin: string, e: Erreurs): number | null {
  if (v === undefined) return null;
  if (typeof v !== 'number' || !Number.isFinite(v) || v <= 0) {
    e.ajoute('structure-invalide', chemin, 'Un nombre strictement positif est attendu.');
    return null;
  }
  return v;
}

function idLocal(v: unknown, chemin: string, e: Erreurs): string | null {
  if (v === undefined) return null;
  if (typeof v !== 'string' || v.length > ID_MAX || !ID_LOCAL.test(v)) {
    e.ajoute(
      'structure-invalide',
      chemin,
      `Identifiant invalide : minuscules, chiffres et tirets, ${String(ID_MAX)} caractères au plus.`,
    );
    return null;
  }
  return v;
}

function liste(v: unknown, chemin: string, e: Erreurs, nonVide: boolean): unknown[] {
  if (v === undefined) return [];
  if (!Array.isArray(v)) {
    e.ajoute('structure-invalide', chemin, 'Une liste est attendue.');
    return [];
  }
  if (nonVide && v.length === 0) e.ajoute('structure-invalide', chemin, 'Cette liste est vide.');
  return v;
}

// ------------------------------------------------------------ prescription --

function objectif(v: unknown, chemin: string, e: Erreurs): Objectif | null {
  if (!estObjet(v)) {
    e.ajoute('structure-invalide', chemin, 'Un objectif est attendu.');
    return null;
  }
  const type = lire(v, 'type');
  if (type === 'reps') {
    const o = objetStrict(v, chemin, ['type', 'reps'], ['reps'], e);
    const r = o === null ? undefined : lire(o, 'reps');
    if (r === undefined) return null;
    if (r === 'max') return { type: 'reps', reps: 'max' };
    if (estObjet(r)) {
      const f = objetStrict(r, sous(chemin, 'reps'), ['min', 'max'], ['min', 'max'], e);
      if (f === null) return null;
      const min = entier(lire(f, 'min'), sous(chemin, 'reps.min'), e, 1);
      const max = entier(lire(f, 'max'), sous(chemin, 'reps.max'), e, 1);
      if (min === null || max === null) return null;
      if (min >= max) {
        e.ajoute(
          'structure-invalide',
          sous(chemin, 'reps'),
          'Une fourchette va du plus petit au plus grand.',
        );
        return null;
      }
      return { type: 'reps', reps: { min, max } };
    }
    const n = entier(r, sous(chemin, 'reps'), e, 1);
    return n === null ? null : { type: 'reps', reps: n };
  }
  if (type === 'duree') {
    const o = objetStrict(v, chemin, ['type', 'secondes'], ['secondes'], e);
    const s = o === null ? null : positif(lire(o, 'secondes'), sous(chemin, 'secondes'), e);
    return s === null ? null : { type: 'duree', secondes: s };
  }
  if (type === 'distance') {
    const o = objetStrict(v, chemin, ['type', 'metres'], ['metres'], e);
    const m = o === null ? null : positif(lire(o, 'metres'), sous(chemin, 'metres'), e);
    return m === null ? null : { type: 'distance', metres: m };
  }
  e.ajoute(
    'structure-invalide',
    sous(chemin, 'type'),
    'Type attendu : « reps », « duree » ou « distance ».',
  );
  return null;
}

function serie(v: unknown, chemin: string, e: Erreurs): SerieNormalisee | null {
  const o = objetStrict(v, chemin, ['objectif', 'chargeKg'], ['objectif'], e);
  if (o === null) return null;
  const obj = objectif(lire(o, 'objectif'), sous(chemin, 'objectif'), e);
  const charge = positif(lire(o, 'chargeKg'), sous(chemin, 'chargeKg'), e);
  return obj === null ? null : { objectif: obj, chargeKg: charge };
}

/**
 * Deux formes exclusives : `series` + `objectif` (séries identiques), ou
 * `detail` (série par série — une pyramide). Les deux finissent en la même
 * liste de séries.
 */
function prescription(v: unknown, chemin: string, e: Erreurs): PrescriptionNormalisee | null {
  const o = objetStrict(
    v,
    chemin,
    ['series', 'objectif', 'chargeKg', 'detail', 'cote', 'reposSec', 'affichage'],
    [],
    e,
  );
  if (o === null) return null;
  const uniforme = lire(o, 'series') !== undefined || lire(o, 'objectif') !== undefined;
  const detaille = lire(o, 'detail') !== undefined;

  let series: SerieNormalisee[] | null = null;
  if (uniforme && detaille) {
    e.ajoute(
      'structure-invalide',
      chemin,
      'Deux formes à la fois : « series » ou « detail », pas les deux.',
    );
  } else if (detaille) {
    if (lire(o, 'chargeKg') !== undefined) {
      e.ajoute(
        'structure-invalide',
        sous(chemin, 'chargeKg'),
        'Avec « detail », la charge s’écrit dans chaque série.',
      );
    }
    const brutes = liste(lire(o, 'detail'), sous(chemin, 'detail'), e, true);
    const lues = brutes.map((x, i) => serie(x, `${sous(chemin, 'detail')}[${String(i)}]`, e));
    if (lues.length > 0 && lues.every((x): x is SerieNormalisee => x !== null)) series = lues;
  } else if (uniforme) {
    const n = entier(lire(o, 'series'), sous(chemin, 'series'), e, 1);
    if (lire(o, 'series') === undefined) {
      e.ajoute(
        'structure-invalide',
        sous(chemin, 'series'),
        'Le nombre de séries est obligatoire.',
      );
    }
    const obj =
      lire(o, 'objectif') === undefined
        ? (e.ajoute('structure-invalide', sous(chemin, 'objectif'), 'L’objectif est obligatoire.'),
          null)
        : objectif(lire(o, 'objectif'), sous(chemin, 'objectif'), e);
    const charge = positif(lire(o, 'chargeKg'), sous(chemin, 'chargeKg'), e);
    if (n !== null && obj !== null) {
      series = Array.from({ length: n }, () => ({ objectif: obj, chargeKg: charge }));
    }
  } else {
    e.ajoute(
      'structure-invalide',
      chemin,
      'Une prescription porte « series » et « objectif », ou « detail ».',
    );
  }

  if (series !== null && new Set(series.map((s) => s.objectif.type)).size > 1) {
    e.ajoute(
      'structure-invalide',
      chemin,
      'Toutes les séries d’une ligne ont un objectif de même nature. Sinon, ne pas structurer : la ligne reste consultable.',
    );
    series = null;
  }

  const coteBrut = lire(o, 'cote');
  let cote: 'côté' | 'jambe' | null = null;
  if (coteBrut === 'côté' || coteBrut === 'jambe') cote = coteBrut;
  else if (coteBrut !== undefined) {
    e.ajoute(
      'structure-invalide',
      sous(chemin, 'cote'),
      'Valeur attendue : « côté » ou « jambe ».',
    );
  }

  const reposSec = entier(lire(o, 'reposSec'), sous(chemin, 'reposSec'), e, 0);
  const affichage = texte(lire(o, 'affichage'), sous(chemin, 'affichage'), e);
  if (series === null) return null;
  return { series, cote, reposSec, ...(affichage === null ? {} : { affichage }) };
}

// ----------------------------------------------------------------- séances --

function ligneDe(
  v: unknown,
  chemin: string,
  exercices: ReadonlySet<string>,
  e: Erreurs,
): LigneNormalisee | null {
  const o = objetStrict(
    v,
    chemin,
    [
      'exerciceId',
      'section',
      'texteOriginal',
      'prescription',
      'groupe',
      'minutesBloc',
      'reposApresBloc',
    ],
    ['exerciceId', 'texteOriginal'],
    e,
  );
  if (o === null) return null;
  const exerciceId = idLocal(lire(o, 'exerciceId'), sous(chemin, 'exerciceId'), e);
  if (exerciceId !== null && !exercices.has(exerciceId)) {
    e.ajoute(
      'prescription-incompatible',
      sous(chemin, 'exerciceId'),
      `L’exercice « ${exerciceId} » n’est pas déclaré dans « exercices ».`,
    );
  }
  const section = texte(lire(o, 'section'), sous(chemin, 'section'), e);
  const texteOriginal = texte(lire(o, 'texteOriginal'), sous(chemin, 'texteOriginal'), e);
  const groupe = idLocal(lire(o, 'groupe'), sous(chemin, 'groupe'), e);
  const brute = lire(o, 'prescription');
  const presc = brute === undefined ? null : prescription(brute, sous(chemin, 'prescription'), e);
  const minutesBloc = entier(lire(o, 'minutesBloc'), sous(chemin, 'minutesBloc'), e, 1, 120);
  const reposApresBloc = entier(
    lire(o, 'reposApresBloc'),
    sous(chemin, 'reposApresBloc'),
    e,
    0,
    1800,
  );
  if ((minutesBloc !== null || reposApresBloc !== null) && groupe === null) {
    e.ajoute(
      'structure-invalide',
      chemin,
      '« minutesBloc » et « reposApresBloc » ne s’écrivent que sur une ligne d’un groupe.',
    );
  }
  if (exerciceId === null || texteOriginal === null) return null;
  return {
    exerciceId,
    section,
    texteOriginal,
    groupe,
    prescription: presc,
    etat: presc === null ? 'consultable' : 'compatible',
    ...(minutesBloc === null ? {} : { minutesBloc }),
    ...(reposApresBloc === null ? {} : { reposApresBloc }),
  };
}

/**
 * Un groupe (superset, circuit) : des lignes CONSÉCUTIVES, deux au moins, et
 * chacune avec son repos écrit. Le moteur déduit le rythme des repos
 * (`engine/superset.ts`) : un repos absent pris pour 0 inventerait un
 * enchaînement que le document n'écrit pas.
 */
function verifierGroupes(
  lignes: readonly (LigneNormalisee | null)[],
  chemin: string,
  e: Erreurs,
): void {
  const positions = new Map<string, number[]>();
  lignes.forEach((l, i) => {
    if (l?.groupe) positions.set(l.groupe, [...(positions.get(l.groupe) ?? []), i]);
  });
  for (const [groupe, pos] of positions) {
    const premier = pos[0]!;
    if (pos.length < 2) {
      e.ajoute(
        'structure-invalide',
        `${chemin}[${String(premier)}].groupe`,
        `Le groupe « ${groupe} » n’a qu’une ligne.`,
      );
      continue;
    }
    if (pos[pos.length - 1]! - premier !== pos.length - 1) {
      e.ajoute(
        'structure-invalide',
        `${chemin}[${String(premier)}].groupe`,
        `Les lignes du groupe « ${groupe} » doivent se suivre.`,
      );
    }
    for (const [rang, i] of pos.entries()) {
      const l = lignes[i];
      if (l?.minutesBloc !== undefined && rang !== 0) {
        e.ajoute(
          'structure-invalide',
          `${chemin}[${String(i)}].minutesBloc`,
          `Dans le groupe « ${groupe} », la durée du bloc s’écrit sur sa première ligne.`,
        );
      }
      if (l?.reposApresBloc !== undefined && rang !== pos.length - 1) {
        e.ajoute(
          'structure-invalide',
          `${chemin}[${String(i)}].reposApresBloc`,
          `Dans le groupe « ${groupe} », le repos après le bloc s’écrit sur sa dernière ligne.`,
        );
      }
      if (l && l.prescription?.reposSec == null) {
        e.ajoute(
          'structure-invalide',
          `${chemin}[${String(i)}].prescription.reposSec`,
          `Dans le groupe « ${groupe} », chaque ligne porte son repos (0 compris) : il fixe le rythme.`,
        );
      }
    }
  }
}

function seanceDe(
  v: unknown,
  chemin: string,
  exercices: ReadonlySet<string>,
  e: Erreurs,
): SeanceNormalisee | null {
  const o = objetStrict(
    v,
    chemin,
    ['id', 'jour', 'titre', 'dureeMinutes', 'notes', 'lignes'],
    ['id', 'jour', 'titre', 'lignes'],
    e,
  );
  if (o === null) return null;
  const id = idLocal(lire(o, 'id'), sous(chemin, 'id'), e);
  const jour = entier(lire(o, 'jour'), sous(chemin, 'jour'), e, 0, 6);
  const titre = texte(lire(o, 'titre'), sous(chemin, 'titre'), e);
  const dureeMinutes = entier(lire(o, 'dureeMinutes'), sous(chemin, 'dureeMinutes'), e, 1);
  const notes = textes(lire(o, 'notes'), sous(chemin, 'notes'), e);
  const cheminLignes = sous(chemin, 'lignes');
  const brutes = liste(lire(o, 'lignes'), cheminLignes, e, true);
  if (brutes.length > LIMITES.lignesParSeance) {
    e.ajoute(
      'structure-invalide',
      cheminLignes,
      `Plus de ${String(LIMITES.lignesParSeance)} lignes dans une séance.`,
    );
  }
  const lignes = brutes.map((x, i) => ligneDe(x, `${cheminLignes}[${String(i)}]`, exercices, e));
  verifierGroupes(lignes, cheminLignes, e);

  const vus = new Set<string>();
  lignes.forEach((l, i) => {
    if (!l) return;
    if (vus.has(l.exerciceId)) {
      e.ajoute(
        'identifiant-duplique',
        `${cheminLignes}[${String(i)}].exerciceId`,
        `L’exercice « ${l.exerciceId} » figure deux fois dans cette séance.`,
      );
    }
    vus.add(l.exerciceId);
  });

  if (id === null || jour === null || titre === null) return null;
  if (!lignes.every((l): l is LigneNormalisee => l !== null)) return null;
  return { id, jour: jour as DayIndex, titre, dureeMinutes, notes, lignes };
}

// ---------------------------------------------------------------- semaines --

function semainesDe(
  v: unknown,
  duree: number | null,
  exercices: ReadonlySet<string>,
  e: Erreurs,
): BlocNormalise[] {
  const brutes = liste(v, 'semaines', e, true);
  if (duree === null && brutes.length > 1) {
    e.ajoute(
      'structure-invalide',
      'semaines',
      'Sans « dureeSemaines », le fichier décrit une seule semaine type, répétée sur la durée choisie à l’import.',
    );
  }
  const idsSeances = new Set<string>();
  const couvertes = new Map<number, string>();
  // Un bloc sans numéros a déjà son erreur : vérifier la couverture ensuite
  // ajouterait « semaine N non décrite » pour chaque semaine, en cascade.
  let numerosManquants = false;
  const blocs: BlocNormalise[] = [];

  brutes.forEach((b, i) => {
    const chemin = `semaines[${String(i)}]`;
    const o = objetStrict(b, chemin, ['numeros', 'libelle', 'seances'], ['seances'], e);
    if (o === null) return;

    let numeros: number[] | null = null;
    const numBruts = lire(o, 'numeros');
    if (duree === null && numBruts !== undefined) {
      e.ajoute(
        'structure-invalide',
        sous(chemin, 'numeros'),
        'Sans « dureeSemaines », la semaine type n’a pas de numéros.',
      );
    } else if (duree !== null && numBruts === undefined) {
      numerosManquants = true;
      e.ajoute(
        'structure-invalide',
        sous(chemin, 'numeros'),
        'Avec « dureeSemaines », chaque bloc dit quelles semaines il couvre.',
      );
    } else if (numBruts !== undefined) {
      const lus = liste(numBruts, sous(chemin, 'numeros'), e, true).map((n, j) =>
        entier(n, `${sous(chemin, 'numeros')}[${String(j)}]`, e, 1, duree ?? undefined),
      );
      numeros = lus.filter((n): n is number => n !== null);
      for (const n of numeros) {
        if (couvertes.has(n)) {
          e.ajoute(
            'identifiant-duplique',
            sous(chemin, 'numeros'),
            `La semaine ${String(n)} est décrite deux fois.`,
          );
        }
        couvertes.set(n, chemin);
      }
    }

    const libelle = texte(lire(o, 'libelle'), sous(chemin, 'libelle'), e);
    const cheminSeances = sous(chemin, 'seances');
    // Une semaine de repos est une liste vide : elle reste permise.
    const seances = liste(lire(o, 'seances'), cheminSeances, e, false).map((s, j) =>
      seanceDe(s, `${cheminSeances}[${String(j)}]`, exercices, e),
    );

    const jours = new Set<number>();
    seances.forEach((s, j) => {
      if (!s) return;
      if (jours.has(s.jour)) {
        e.ajoute(
          'prescription-incompatible',
          `${cheminSeances}[${String(j)}].jour`,
          'Deux séances le même jour : MAJK en suit une par jour. Juxtaposer les blocs du jour dans une seule séance.',
        );
      }
      jours.add(s.jour);
      if (idsSeances.has(s.id)) {
        e.ajoute(
          'identifiant-duplique',
          `${cheminSeances}[${String(j)}].id`,
          `La séance « ${s.id} » existe déjà.`,
        );
      }
      idsSeances.add(s.id);
    });

    if (seances.every((s): s is SeanceNormalisee => s !== null)) {
      blocs.push({ numeros, libelle, seances });
    }
  });

  if (duree !== null && duree <= LIMITES.semainesMax && !numerosManquants) {
    for (let n = 1; n <= duree; n++) {
      if (!couvertes.has(n)) {
        e.ajoute(
          'structure-invalide',
          'semaines',
          `La semaine ${String(n)} n’est décrite par aucun bloc.`,
        );
      }
    }
  }
  return blocs;
}

// --------------------------------------------------------------- programme --

function rapportDe(p: ProgrammeNormalise) {
  const consultables: LigneConsultable[] = [];
  let lignes = 0;
  p.semaines.forEach((b, i) =>
    b.seances.forEach((s, j) =>
      s.lignes.forEach((l, k) => {
        lignes++;
        if (l.etat === 'consultable') {
          consultables.push({
            chemin: `semaines[${String(i)}].seances[${String(j)}].lignes[${String(k)}]`,
            exerciceId: l.exerciceId,
            texteOriginal: l.texteOriginal,
          });
        }
      }),
    ),
  );
  return {
    lignes,
    compatibles: lignes - consultables.length,
    consultables,
    suiviComplet: consultables.length === 0,
    dureeADemander: p.dureeSemaines === null,
  };
}

export function validerProgramme(contenu: string): ResultatValidation {
  const e = new Erreurs();
  const refus = () => ({ ok: false as const, erreurs: e.liste });

  if (new TextEncoder().encode(contenu).length > LIMITES.octets) {
    e.ajoute(
      'json-invalide',
      'racine',
      `Le fichier dépasse ${String(LIMITES.octets / 1_000_000)} Mo.`,
    );
    return refus();
  }
  let racine: unknown;
  try {
    racine = JSON.parse(contenu);
  } catch {
    e.ajoute('json-invalide', 'racine', 'Ce fichier n’est pas du JSON valide.');
    return refus();
  }
  if (!estObjet(racine) || lire(racine, 'format') !== 'majk-programme') {
    e.ajoute('version-inconnue', 'format', 'Ce fichier n’est pas un programme MAJK.');
    return refus();
  }
  const version = lire(racine, 'schemaVersion');
  if (version !== 1) {
    e.ajoute(
      'version-inconnue',
      'schemaVersion',
      typeof version === 'number' && version > 1
        ? 'Ce programme vient d’une version plus récente de MAJK : mets l’application à jour.'
        : 'Version de format inconnue.',
    );
    return refus();
  }

  const r = objetStrict(
    racine,
    '',
    ['format', 'schemaVersion', 'programme', 'exercices', 'semaines'],
    ['programme', 'exercices', 'semaines'],
    e,
  )!;

  // ---- programme
  const po = objetStrict(
    lire(r, 'programme'),
    'programme',
    ['uid', 'nom', 'versionSource', 'source', 'dureeSemaines', 'consignes', 'decisions'],
    ['uid', 'nom', 'source'],
    e,
  );
  let uid: string | null = null;
  let nom: string | null = null;
  let versionSource: string | null = null;
  let source: ProgrammeNormalise['source'] | null = null;
  let duree: number | null = null;
  let consignes: string[] = [];
  const decisions: DecisionConversion[] = [];
  if (po !== null) {
    const u = lire(po, 'uid');
    if (u !== undefined && (typeof u !== 'string' || !UID.test(u))) {
      e.ajoute(
        'structure-invalide',
        'programme.uid',
        'L’uid compte 8 à 24 minuscules ou chiffres.',
      );
    } else if (typeof u === 'string') uid = u;
    nom = texte(lire(po, 'nom'), 'programme.nom', e);
    versionSource = texte(lire(po, 'versionSource'), 'programme.versionSource', e);
    const so = objetStrict(
      lire(po, 'source'),
      'programme.source',
      ['document', 'auteur'],
      ['document'],
      e,
    );
    if (so !== null) {
      const document = texte(lire(so, 'document'), 'programme.source.document', e);
      const auteur = texte(lire(so, 'auteur'), 'programme.source.auteur', e);
      if (document !== null) source = { document, auteur };
    }
    duree = entier(lire(po, 'dureeSemaines'), 'programme.dureeSemaines', e, 1);
    if (duree !== null && duree > LIMITES.semainesMax) {
      e.ajoute(
        'prescription-incompatible',
        'programme.dureeSemaines',
        `Le programme dure ${String(duree)} semaines ; MAJK en suit ${String(LIMITES.semainesMax)} au plus.`,
      );
    }
    consignes = textes(lire(po, 'consignes'), 'programme.consignes', e);
    liste(lire(po, 'decisions'), 'programme.decisions', e, false).forEach((d, i) => {
      const chemin = `programme.decisions[${String(i)}]`;
      const o = objetStrict(d, chemin, ['sujet', 'texte'], ['sujet', 'texte'], e);
      if (o === null) return;
      const sujet = lire(o, 'sujet');
      const t = texte(lire(o, 'texte'), sous(chemin, 'texte'), e);
      if (!SUJETS.includes(sujet as SujetDecision)) {
        e.ajoute(
          'structure-invalide',
          sous(chemin, 'sujet'),
          `Sujet attendu : ${SUJETS.join(', ')}.`,
        );
      } else if (t !== null) decisions.push({ sujet: sujet as SujetDecision, texte: t });
    });
  }

  // ---- exercices
  const exercices: ExerciceNormalise[] = [];
  const idsExercices = new Set<string>();
  liste(lire(r, 'exercices'), 'exercices', e, true).forEach((x, i) => {
    const chemin = `exercices[${String(i)}]`;
    const o = objetStrict(x, chemin, ['id', 'nom', 'consignes'], ['id', 'nom'], e);
    if (o === null) return;
    const id = idLocal(lire(o, 'id'), sous(chemin, 'id'), e);
    const n = texte(lire(o, 'nom'), sous(chemin, 'nom'), e);
    const c = textes(lire(o, 'consignes'), sous(chemin, 'consignes'), e);
    if (id === null || n === null) return;
    if (idsExercices.has(id)) {
      e.ajoute(
        'identifiant-duplique',
        sous(chemin, 'id'),
        `L’exercice « ${id} » est déclaré deux fois.`,
      );
      return;
    }
    idsExercices.add(id);
    exercices.push({ id, nom: n, consignes: c });
  });

  // ---- semaines
  const dureeLue = po === null ? null : duree;
  const semaines = semainesDe(lire(r, 'semaines'), dureeLue, idsExercices, e);

  if (e.liste.length > 0 || uid === null || nom === null || source === null) return refus();

  const programme: ProgrammeNormalise = {
    schemaVersion: 1,
    uid,
    nom,
    versionSource,
    source,
    dureeSemaines: duree,
    consignes,
    decisions,
    exercices,
    semaines,
  };
  return { ok: true, programme, rapport: rapportDe(programme) };
}
