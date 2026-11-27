/**
 * Transcription du §4 de `regles-repas-automatiques.md` (ce que la personne
 * ne mange pas) — aucune logique. Relu ligne par ligne par
 * `exclusionsRepas.test.ts`.
 */

export const EXCLUSIONS = [
  {
    id: 'viande',
    nom: 'Viande',
    aliments: ['poulet', 'dinde', 'boeuf', 'steakHache5', 'jambonBlanc'],
    mots: ['végétarien', 'végétalien', 'vegan'],
  },
  {
    id: 'poisson',
    nom: 'Poisson',
    aliments: ['poissonBlanc', 'saumon', 'thon'],
    mots: ['poisson', 'saumon', 'thon', 'cabillaud', 'végétarien', 'végétalien', 'vegan'],
  },
  {
    id: 'oeufs',
    nom: 'Œufs',
    aliments: ['oeuf'],
    mots: ['œuf', 'oeuf', 'végétalien', 'vegan'],
  },
  {
    id: 'laitiers',
    nom: 'Produits laitiers',
    // La whey est une protéine DE LAIT : écartée avec les laitiers (27 novembre).
    aliments: ['lait', 'skyr', 'fromageBlanc', 'fromageFrais', 'yaourtGrec', 'whey'],
    mots: ['lactose', 'lait', 'laitier', 'laitiers', 'plv', 'végétalien', 'vegan'],
  },
  {
    id: 'arachide',
    nom: 'Arachide',
    aliments: ['beurreCacahuete'],
    mots: ['arachide', 'arachides', 'cacahuète', 'cacahuètes'],
  },
  {
    id: 'fruitsCoque',
    nom: 'Fruits à coque',
    aliments: ['amandes', 'noix'],
    mots: ['fruits à coque', 'fruit à coque', 'noix', 'amande', 'amandes', 'noisette', 'noisettes'],
  },
  {
    id: 'gluten',
    nom: 'Gluten',
    aliments: ['pain', 'pates', 'semoule', 'avoine', 'floconsCroustillants', 'boulgour'],
    mots: ['gluten', 'blé', 'coeliaque', 'cœliaque', 'maladie coeliaque'],
  },
] as const;

export type ExclusionId = (typeof EXCLUSIONS)[number]['id'];

/** §4 — ce qui, écrit dans les allergies, ne désigne aucune allergie. */
export const PAS_UNE_ALLERGIE: readonly string[] = ['aucune', 'aucun', 'rien', 'non', 'ras'];
