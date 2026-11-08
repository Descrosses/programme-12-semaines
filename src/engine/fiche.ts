/**
 * LA FICHE — un texte court qui porte des cibles et des aliments.
 *
 * ── À quoi elle sert ───────────────────────────────────────────────────────
 *
 * Guillaume lit le questionnaire d'une personne, décide ses cibles, et doit
 * les lui faire arriver sur son téléphone. Sans compte et sans serveur, il
 * reste le message : WhatsApp, SMS, mail. La fiche est ce qu'on colle dans ce
 * message, et que l'appli sait relire.
 *
 * Huit nombres dictés de vive voix se retapent en deux minutes — et se
 * retapent faux : 240 pour 2 400, et la cible est absurde sans que personne
 * ne le voie. C'est cette faute-là que la fiche supprime, pas le temps de
 * saisie.
 *
 * ── Pourquoi du texte, et pas un fichier ──────────────────────────────────
 *
 * Sur iPhone, recevoir un fichier par WhatsApp et le retrouver dans
 * l'application Fichiers demande cinq gestes et un peu de chance. Un texte se
 * colle en deux. Et il reste lisible par un humain au passage, ce qui permet
 * de voir ce qu'on envoie.
 *
 * ── Elle se cherche dans le message, elle ne l'est pas ────────────────────
 *
 * Personne ne colle une fiche nue : on colle le message entier, avec le
 * bonjour et la signature. `lireFiche` cherche donc le marqueur n'importe où
 * dans le texte et ignore le reste. Exiger un collage propre aurait fait
 * échouer un geste sur deux, pour une raison invisible.
 *
 * ── Deux dialectes, un seul analyseur ─────────────────────────────────────
 *
 * Les aliments peuvent arriver sous leur identifiant MAJK (`pommesDeTerre`)
 * ou sous celui du questionnaire (`pomme-de-terre`). Les deux sont acceptés :
 * `alimentPour` fait la traduction quand il le faut. Une seule porte d'entrée
 * pour la fiche que Guillaume génère ET pour une liste venue du questionnaire.
 */

import { FOOD_LIBRARY } from '../data/foodLibrary';
import { alimentPour } from '../data/questionnaireAliments';
import { macrosValides, type CiblesMacros, type CiblesNutrition } from '../data/ciblesNutrition';

/** Le marqueur, suivi de la version du format. */
export const MARQUEUR = 'MAJK1';

export interface ContenuFiche {
  cibles: CiblesNutrition | null;
  /** Identifiants MAJK, déjà traduits et vérifiés. */
  aliments: string[];
}

export interface LectureFiche {
  /** `false` quand le marqueur est introuvable : ce n'est pas une fiche. */
  trouvee: boolean;
  cibles: CiblesNutrition | null;
  aliments: string[];
  /** Ce que la fiche nommait et que le catalogue ne connaît pas. */
  inconnus: string[];
  /** Ce qui n'a pas pu être lu, en clair, pour l'afficher tel quel. */
  problemes: string[];
}

const VIDE: LectureFiche = {
  trouvee: false,
  cibles: null,
  aliments: [],
  inconnus: [],
  problemes: [],
};

function ecrireMacros(m: CiblesMacros): string | null {
  return macrosValides(m) ? `${m.kcal},${m.proteinG},${m.carbsG},${m.fatG}` : null;
}

/**
 * Le texte à coller dans un message.
 *
 * Une journée incomplète n'est pas écrite du tout : une fiche ne doit porter
 * que des cibles utilisables. Écrire « 2400,150,,  » obligerait le lecteur à
 * deviner, et deviner est précisément ce qu'on évite ici.
 */
export function genererFiche(contenu: ContenuFiche): string {
  const morceaux = [MARQUEUR];
  if (contenu.cibles !== null) {
    const t = ecrireMacros(contenu.cibles.train);
    const r = ecrireMacros(contenu.cibles.rest);
    if (t !== null) morceaux.push(`C=${t}`);
    if (r !== null) morceaux.push(`R=${r}`);
  }
  if (contenu.aliments.length > 0) morceaux.push(`A=${contenu.aliments.join(',')}`);
  return morceaux.join(' ');
}

function lireMacros(brut: string, journee: string, problemes: string[]): CiblesMacros | null {
  const parts = brut.split(',').map((x) => Number(x.trim()));
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) {
    problemes.push(`${journee} : quatre nombres attendus, « ${brut} » reçu.`);
    return null;
  }
  const m: CiblesMacros = {
    kcal: parts[0]!,
    proteinG: parts[1]!,
    carbsG: parts[2]!,
    fatG: parts[3]!,
  };
  if (!macrosValides(m)) {
    problemes.push(`${journee} : valeurs hors des bornes acceptées (« ${brut} »).`);
    return null;
  }
  return m;
}

/**
 * Lit une fiche dans un texte quelconque.
 *
 * Ne modifie rien et ne décide rien : elle rend ce qu'elle a compris, et ce
 * qu'elle n'a pas compris. C'est l'écran qui montre le résultat et demande
 * confirmation — écraser des cibles sans les montrer d'abord serait le genre
 * de perte qu'on a déjà payée une fois.
 */
export function lireFiche(texte: string): LectureFiche {
  const depart = texte.indexOf(MARQUEUR);
  if (depart === -1) return { ...VIDE };

  const problemes: string[] = [];
  const corps = texte.slice(depart + MARQUEUR.length);
  // Les jetons sont séparés par des espaces ou des retours à la ligne : un
  // message collé depuis WhatsApp peut porter les deux.
  const jetons = corps.split(/\s+/).filter(Boolean);

  let train: CiblesMacros | null = null;
  let rest: CiblesMacros | null = null;
  const aliments: string[] = [];
  const inconnus: string[] = [];

  for (const jeton of jetons) {
    const sep = jeton.indexOf('=');
    if (sep === -1) break; // fin de la fiche : la suite est du texte ordinaire
    const cle = jeton.slice(0, sep).toUpperCase();
    const valeur = jeton.slice(sep + 1);
    if (cle === 'C') train = lireMacros(valeur, 'Jour d’entraînement', problemes);
    else if (cle === 'R') rest = lireMacros(valeur, 'Jour de repos', problemes);
    else if (cle === 'A') {
      for (const brut of valeur
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean)) {
        // D'abord l'identifiant MAJK, puis celui du questionnaire.
        const id = brut in FOOD_LIBRARY ? brut : alimentPour(brut);
        if (id === undefined) inconnus.push(brut);
        else if (!aliments.includes(id)) aliments.push(id);
      }
    } else problemes.push(`Partie inconnue « ${cle} », ignorée.`);
  }

  /*
   * Une seule journée renseignée ne fait pas des cibles.
   *
   * L'écran Nutrition choisit son palier selon le jour ; n'en avoir qu'un
   * laisserait l'autre vide un jour sur deux, sans que la personne sache
   * pourquoi. Mieux vaut le dire tout de suite.
   */
  let cibles: CiblesNutrition | null = null;
  if (train !== null && rest !== null) cibles = { train, rest };
  else if (train !== null || rest !== null) {
    problemes.push(
      'Une seule journée est renseignée : il faut le jour d’entraînement ET le jour de repos.',
    );
  }

  return { trouvee: true, cibles, aliments, inconnus, problemes };
}

/**
 * Ce qu'« Appliquer cette fiche » écrit dans les réglages.
 *
 * ── Pourquoi c'est une fonction et pas trois lignes dans le bouton ────────
 *
 * Parce que la troisième ligne est une RÈGLE, pas un détail de formulaire :
 * appliquer une fiche masque le plan nutritionnel historique. Une règle se
 * teste ; un `onClick` ne se teste pas.
 *
 * ── Pourquoi elle masque le plan ──────────────────────────────────────────
 *
 * Sans ça, le geste n'avait aucun effet visible. `cibleDuJour` tranche en
 * faveur des menus quand ils sont affichés — à raison, ce sont eux qui
 * seront mangés — donc l'onglet Nutrition continuait d'annoncer les 3 226
 * kcal du plan au-dessus de cibles qu'on venait de poser à 2 800.
 * Techniquement juste, pratiquement inutilisable.
 *
 * Ce n'est pas un contournement de l'arbitrage, c'est son application. La
 * règle dit « les menus affichés font foi » ; coller une fiche dit « voici
 * mes chiffres maintenant ». Le plan s'efface donc devant eux, et l'écran
 * garde ce qu'on lui demande depuis le début : UNE seule vérité à la fois.
 *
 * RIEN N'EST EFFACÉ. `legacyNutritionPlan` est un interrupteur : les neuf
 * repas, les pesées et les aliments restent en base et reviennent tels quels
 * en le rallumant.
 *
 * ── Ce qu'elle ne touche pas ──────────────────────────────────────────────
 *
 * Une fiche qui ne porte QUE des aliments ne masque rien : elle ne dit rien
 * des calories, donc elle n'a pas à décider de ce qui les affiche.
 */
export interface PatchFiche {
  ciblesNutrition?: CiblesNutrition;
  alimentsPreferes?: string[];
  legacyNutritionPlan?: false;
}

export function patchDeFiche(lecture: LectureFiche): PatchFiche {
  return {
    ...(lecture.cibles !== null ? { ciblesNutrition: lecture.cibles } : {}),
    ...(lecture.aliments.length > 0 ? { alimentsPreferes: lecture.aliments } : {}),
    ...(lecture.cibles !== null ? { legacyNutritionPlan: false as const } : {}),
  };
}
