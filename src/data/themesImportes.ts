/**
 * ME, MYSELF & I — le thème d'un programme importé (Guillaume, 26 novembre :
 * « proposer aux utilisateurs de ME, MYSELF & I de choisir le thème de leur
 * programme »).
 *
 * Lot 1 : les trois identités qui habillent DÉJÀ les écrans d'un programme
 * importé (Aujourd'hui, Semaine, Séance, Réglages). LADIES vient au lot 2 :
 * son identité vit surtout dans ses propres écrans, et posée telle quelle
 * elle donnerait un « POWER en rose ».
 *
 * Le thème est un HABILLAGE : couleurs et bandeaux photo. Le programme, ses
 * textes et le titre « ME, MYSELF & I » ne changent pas.
 *
 * Aucune logique ici : la liste, ses mots et les couleurs de l'aperçu.
 */

export type ThemeImporte = 'perso' | 'power' | 'mass' | 'femmes';

/** Le thème d'un programme importé qui n'en a pas choisi. */
export const THEME_IMPORTE_DEFAUT: ThemeImporte = 'perso';

export interface ChoixTheme {
  readonly id: ThemeImporte;
  readonly nom: string;
  readonly description: string;
  /** Trois teintes de l'aperçu : fond, couleur d'action, accent. */
  readonly apercu: readonly [string, string, string];
}

export const THEMES_IMPORTES: readonly ChoixTheme[] = [
  {
    id: 'perso',
    nom: 'ME, MYSELF & I',
    description: 'Ivoire, chocolat et champagne',
    apercu: ['#f5f0e6', '#49352b', '#c5a775'],
  },
  {
    id: 'power',
    nom: 'POWER',
    description: 'Bleu nuit et rouge',
    apercu: ['#061426', '#d50a20', '#f4f1ea'],
  },
  {
    id: 'mass',
    nom: 'MASS',
    description: 'Noir chaud et bordeaux',
    apercu: ['#141212', '#a5313f', '#f6f1ed'],
  },
  {
    id: 'femmes',
    nom: 'LADIES',
    description: 'Rose poudré',
    apercu: ['#fdf7f5', '#b14f6e', '#e4b7a7'],
  },
];

/** Une valeur lue en base ou dans une sauvegarde : inconnue = pas de choix. */
export function lireThemeImporte(brut: unknown): ThemeImporte | undefined {
  return THEMES_IMPORTES.some((t) => t.id === brut) ? (brut as ThemeImporte) : undefined;
}
