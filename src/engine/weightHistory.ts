/**
 * Le poids de corps sur toute la durée du programme, pas sur sept jours.
 *
 * ── Ce que ce module ne fait pas ────────────────────────────────────────────
 *
 * Il ne recalcule PAS la moyenne glissante : il appelle `windowAverage`, celle
 * de l'onglet Nutrition. Deux implémentations de la même moyenne finiraient par
 * donner deux chiffres différents sur le même écran, et c'est le genre de
 * contradiction qu'on a déjà payée ailleurs dans cette appli.
 *
 * Il n'interprète rien non plus. Le .md donne une cible de poids et rien
 * d'autre ; inventer un seuil de « trop vite » ou de « trop lent » ici
 * doublerait la règle d'ajustement qui vit déjà dans `nutritionAdvice`, avec le
 * risque qu'elles se contredisent.
 *
 * ── Les trous ne sont pas comblés ───────────────────────────────────────────
 *
 * Une semaine sans pesée rend `null`, jamais 0 et jamais la valeur d'à côté.
 * Une courbe qui relie deux points séparés de trois semaines dessine une
 * progression qui n'a jamais été mesurée.
 */

import { addDays, daysBetween } from './calendar';
import { windowAverage, type Measurement } from './nutrition';

/** Les trois fenêtres du sélecteur. */
export type Periode = '4s' | '12s' | 'tout';

export const PERIODES: { cle: Periode; label: string; semaines: number | null }[] = [
  { cle: '4s', label: '4 semaines', semaines: 4 },
  { cle: '12s', label: '12 semaines', semaines: 12 },
  // `null` = aucune borne : « Tout » inclut les pesées d'avant la semaine 1.
  { cle: 'tout', label: 'Tout', semaines: null },
];

/** Un point de la courbe : une date, et la moyenne qui s'y termine. */
export interface PointMoyenne {
  date: string;
  /** `null` = aucune pesée dans les 7 jours : la ligne s'interrompt ici. */
  average: number | null;
}

/**
 * La moyenne glissante, jour par jour, de `debutIso` à `finIso`.
 *
 * Un point par JOUR et non par pesée : c'est ce qui fait apparaître les trous.
 * Avec un point par pesée, deux mesures séparées de trois semaines se
 * relieraient par un trait droit, qui raconterait une progression que personne
 * n'a mesurée.
 */
export function serieMoyenne(
  entries: Measurement[],
  debutIso: string,
  finIso: string,
): PointMoyenne[] {
  const jours = daysBetween(debutIso, finIso);
  if (jours < 0) return [];
  const out: PointMoyenne[] = [];
  for (let i = 0; i <= jours; i++) {
    const date = addDays(debutIso, i);
    out.push({ date, average: windowAverage(entries, date, 7) });
  }
  return out;
}

/** Une ligne du tableau hebdomadaire. */
export interface LigneSemaine {
  /** Numéro de semaine de programme. 0 = combine initial. */
  week: number;
  /** Premier et dernier jour de la semaine, inclus. */
  debut: string;
  fin: string;
  /** Moyenne des pesées de la semaine, `null` si aucune. */
  moyenne: number | null;
  /** Écart avec la semaine précédente, `null` si l'une des deux manque. */
  ecart: number | null;
  /** Nombre de pesées de la semaine — dit ce que vaut la moyenne. */
  pesees: number;
  /** Tour de taille moyen de la semaine, `null` si aucun relevé. */
  tourDeTaille: number | null;
}

/**
 * Le tableau semaine par semaine, de la semaine 0 à la dernière entamée.
 *
 * La moyenne d'une semaine est celle de SES pesées, pas une moyenne glissante :
 * les deux répondent à deux questions, et mélanger les deux dans un tableau qui
 * dit « semaine 4 » serait trompeur.
 *
 * L'écart se mesure avec la semaine juste avant, même si elle est vide — et il
 * vaut alors `null`. Sauter par-dessus les semaines creuses pour comparer à la
 * dernière semaine pesée ferait passer trois semaines d'écart pour une.
 */
export function semainesDuProgramme(
  entries: Measurement[],
  startDate: string,
  todayIso: string,
): LigneSemaine[] {
  if (!startDate) return [];
  const derniere = Math.floor(daysBetween(startDate, todayIso) / 7);
  if (derniere < 0) return [];

  const out: LigneSemaine[] = [];
  for (let w = 0; w <= Math.min(12, derniere); w++) {
    const debut = addDays(startDate, w * 7);
    const fin = addDays(startDate, w * 7 + 6);
    const dedans = entries.filter((e) => e.date >= debut && e.date <= fin);

    const poids = dedans.map((e) => e.weightKg).filter((v): v is number => v !== null);
    const tailles = dedans.map((e) => e.waistCm).filter((v): v is number => v !== null);
    const moyenne = poids.length > 0 ? arrondi(somme(poids) / poids.length) : null;
    const precedente = out[out.length - 1]?.moyenne ?? null;

    out.push({
      week: w,
      debut,
      fin,
      moyenne,
      ecart: moyenne !== null && precedente !== null ? arrondi(moyenne - precedente) : null,
      pesees: poids.length,
      tourDeTaille: tailles.length > 0 ? arrondi(somme(tailles) / tailles.length) : null,
    });
  }
  return out;
}

/** Les trois chiffres de l'en-tête. */
export interface ResumePoids {
  /** Poids de départ : la moyenne de la semaine 0, le combine initial. */
  depart: number | null;
  /** Moyenne glissante d'aujourd'hui — le même chiffre que l'onglet Nutrition. */
  actuel: number | null;
  /** `actuel − depart`, `null` si l'un des deux manque. */
  ecartTotal: number | null;
}

export function resumePoids(
  entries: Measurement[],
  startDate: string,
  todayIso: string,
): ResumePoids {
  const semaines = semainesDuProgramme(entries, startDate, todayIso);
  const depart = semaines[0]?.moyenne ?? null;
  const actuel = windowAverage(entries, todayIso, 7);
  return {
    depart,
    actuel,
    ecartTotal: depart !== null && actuel !== null ? arrondi(actuel - depart) : null,
  };
}

const somme = (v: number[]) => v.reduce((a, b) => a + b, 0);
const arrondi = (n: number) => Math.round(n * 100) / 100;

/** Les deux bornes de l'axe du temps, pour une période donnée. */
export interface Fenetre {
  debut: string;
  fin: string;
}

/**
 * L'axe du temps du graphique.
 *
 * Un cadre qui s'arrêterait à la dernière pesée laisserait croire que le
 * programme s'arrête là : il va toujours jusqu'à aujourd'hui.
 *
 * ── Le cadre ne remonte jamais avant le combine ────────────────────────────
 *
 * « 4 semaines » et « 12 semaines » sont bornées par le début du programme.
 * Pendant le premier mois, douze semaines en arrière tombent deux mois avant
 * le combine : le graphique passait alors la moitié de sa largeur sur du vide,
 * et la courbe réelle se tassait dans le tiers droit.
 *
 * Conséquence assumée : au tout début du programme, les deux boutons bornés
 * montrent la même chose. C'est juste — il n'existe rien d'autre à montrer.
 *
 * « Tout » reste la seule vue sans borne gauche : elle part de la plus
 * ancienne des deux dates, début du programme ou première pesée, pour qu'une
 * pesée d'avant la semaine 1 reste visible.
 */
export function fenetre(
  periode: Periode,
  todayIso: string,
  entries: Measurement[],
  startDate: string | null,
): Fenetre {
  const semaines = PERIODES.find((p) => p.cle === periode)?.semaines ?? null;
  const dates = entries.map((e) => e.date).sort();
  const fin = dates.length > 0 && dates[dates.length - 1]! > todayIso
    ? dates[dates.length - 1]!
    : todayIso;

  if (semaines !== null) {
    // −27 et non −28 : quatre semaines font vingt-huit jours bornes incluses.
    const recule = addDays(todayIso, -(semaines * 7 - 1));
    // Une date de début dans le futur — programme pas encore commencé — ne
    // doit pas renvoyer un cadre à l'envers : on la laisse de côté.
    const borne = startDate && startDate <= todayIso && startDate > recule;
    return { debut: borne ? startDate! : recule, fin };
  }
  const candidats = [dates[0], startDate || null].filter((d): d is string => !!d);
  const debut = candidats.length > 0 ? candidats.sort()[0]! : todayIso;
  return { debut: debut < fin ? debut : fin, fin };
}

/**
 * La courbe découpée en tronçons continus.
 *
 * Chaque tronçon est une suite de jours qui ont tous une moyenne. Un jour sans
 * moyenne — aucune pesée dans les sept jours qui précèdent — ferme le tronçon
 * en cours : la ligne s'interrompt à l'écran au lieu de traverser le trou.
 */
export function troncons(points: PointMoyenne[]): { date: string; average: number }[][] {
  const out: { date: string; average: number }[][] = [];
  let courant: { date: string; average: number }[] = [];
  for (const p of points) {
    if (p.average === null) {
      if (courant.length > 0) out.push(courant);
      courant = [];
    } else {
      courant.push({ date: p.date, average: p.average });
    }
  }
  if (courant.length > 0) out.push(courant);
  return out;
}

/** Un relevé de tour de taille placé sur l'axe du temps. */
export interface PointTaille {
  date: string;
  value: number;
}

/**
 * Le tour de taille, en tronçons continus lui aussi.
 *
 * Pas de moyenne glissante ici : le .md ne demande qu'un relevé hebdomadaire,
 * et lisser quatre points par mois ne dirait rien de plus. En revanche la même
 * règle de trou s'applique — au-delà de `ecartMaxJours` entre deux relevés, la
 * ligne s'arrête plutôt que de tracer une pente qui n'a pas été mesurée.
 */
export function serieTaille(
  entries: Measurement[],
  debutIso: string,
  finIso: string,
  ecartMaxJours = 7,
): PointTaille[][] {
  const releves = entries
    .filter((e) => e.waistCm !== null && e.date >= debutIso && e.date <= finIso)
    .map((e) => ({ date: e.date, value: e.waistCm! }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const out: PointTaille[][] = [];
  let courant: PointTaille[] = [];
  for (const r of releves) {
    const precedent = courant[courant.length - 1];
    if (precedent && daysBetween(precedent.date, r.date) > ecartMaxJours) {
      out.push(courant);
      courant = [];
    }
    courant.push(r);
  }
  if (courant.length > 0) out.push(courant);
  return out;
}
