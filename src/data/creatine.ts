/**
 * La carte « Créatine » — texte VALIDÉ par Guillaume le 27 novembre 2026
 * (« texte validé »), transcrit mot pour mot du §11 de
 * `regles-nutrition-mass.md`. Un test compare les deux
 * (`components/carteCreatine.test.tsx`) : pour changer un mot, changer le
 * `.md` ET ce fichier.
 *
 * AUCUNE marque, aucun lien, aucun code promo : l'appli donne des critères
 * de choix, pas un produit. La dernière phrase (avis du médecin) est montrée
 * à tout le monde : l'appli ne garde pas les réponses de sécurité du
 * questionnaire, elle ne peut pas savoir à qui la réserver.
 */

/** Un paragraphe : des morceaux de texte, dont certains en gras. */
export type Paragraphe = ReadonlyArray<string | { gras: string }>;

export const CREATINE: { titre: string; paragraphes: readonly Paragraphe[] } = {
  titre: 'Créatine',
  paragraphes: [
    [
      'La créatine monohydrate est le complément le mieux étudié pour les efforts courts et intenses et pour la prise de muscle. Elle aide ; elle ne remplace ni l’entraînement ni l’assiette.',
    ],
    [
      { gras: '3 à 5 g par jour, tous les jours' },
      ', au moment qui t’arrange. Pas besoin de phase de charge : l’effet s’installe en 3 à 4 semaines.',
    ],
    [
      'Choisis une créatine ',
      { gras: 'monohydrate' },
      ', sans mélange. Un produit conforme à la norme antidopage NF EN 17444 limite le risque de substances interdites. MAJK ne recommande aucune marque.',
    ],
    [
      'Demande l’avis de ton médecin avant d’en prendre si tu as une maladie des reins, un traitement en cours, ou si tu es enceinte ou allaitante.',
    ],
  ],
};
