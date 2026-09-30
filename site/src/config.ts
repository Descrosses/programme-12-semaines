/**
 * ⭐ TES INFORMATIONS — le seul fichier à remplir pour personnaliser le site.
 *
 * Tout ce qui est entre crochets [À COMPLÉTER] doit être remplacé
 * avant la mise en ligne. Ces informations apparaissent dans l'en-tête,
 * le pied de page, la page Contact et les pages juridiques.
 */
export const SITE = {
  // Nom affiché dans l'en-tête et dans l'onglet du navigateur.
  nom: 'Prépa 12',
  // Phrase courte utilisée par Google et les réseaux sociaux si une page n'en a pas.
  description:
    "Programmes d'entraînement et de nutrition en PDF, construits par un père de famille passionné de préparation physique.",
  // Adresse email de contact (visible sur le site).
  email: '[À COMPLÉTER]@exemple.fr',
  // Délai de réponse annoncé sur la page Contact.
  delaiReponse: '48 h ouvrées',
  // Liens réseaux sociaux : laisse '' pour masquer.
  instagram: '',
};

/** Informations légales (mentions légales, CGV). Obligatoires pour vendre. */
export const LEGAL = {
  nomComplet: '[À COMPLÉTER : Prénom NOM]',
  statut: '[À COMPLÉTER : ex. Entrepreneur individuel (micro-entreprise)]',
  siret: '[À COMPLÉTER : numéro SIRET]',
  adresse: '[À COMPLÉTER : adresse postale]',
  // Si tu es en franchise de TVA, garde cette phrase. Sinon, remplace par ton n° de TVA.
  mentionTva: 'TVA non applicable, article 293 B du Code général des impôts.',
  // Médiateur de la consommation : obligatoire pour vendre à des particuliers.
  mediateur: '[À COMPLÉTER : nom, site web et adresse du médiateur de la consommation]',
  // Hébergeur du site (Netlify si tu suis le README).
  hebergeur:
    'Netlify, Inc. — 101 2nd Street, San Francisco, CA 94105, États-Unis — www.netlify.com [adresse à vérifier sur netlify.com]',
  dateMiseAJour: '[À COMPLÉTER : date]',
};

/** Menu principal (ordre d'affichage). */
export const NAVIGATION = [
  { libelle: 'Programmes', href: '/programmes' },
  { libelle: 'À propos', href: '/a-propos' },
  { libelle: 'Contact', href: '/contact' },
];
