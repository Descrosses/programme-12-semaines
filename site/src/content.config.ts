/**
 * Définition d'une fiche produit.
 *
 * Chaque fichier .md de `src/content/produits/` est vérifié avec ce modèle.
 * Si un champ manque ou est mal écrit, `npm run dev` / `npm run build`
 * affiche un message qui dit quel fichier et quel champ corriger.
 * Tu n'as normalement pas besoin de modifier ce fichier.
 */
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const produits = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/produits' }),
  schema: z.object({
    titre: z.string(),
    sousTitre: z.string(),
    // Une seule catégorie : sert au filtre du catalogue.
    categorie: z.enum(['musculation', 'diete', 'pack']),
    // Texte court affiché sur les cartes et utilisé par Google.
    resume: z.string().max(200),

    // Prix en euros TTC (ex. 49 ou 49.90). Tant qu'il n'est pas fixé : 'PRIX_A_DEFINIR'.
    prix: z.union([z.number().positive(), z.literal('PRIX_A_DEFINIR')]),
    // Lien Stripe Payment Link (commence par https://buy.stripe.com/).
    lienStripe: z.url(),

    // Fiche technique.
    duree: z.string(),
    niveau: z.string(),
    frequence: z.string(),
    lieu: z.string(),

    // Pour un pack : liste des fichiers produits inclus (sans le .md).
    // Le site calcule tout seul le prix « achetés séparément ».
    contient: z.array(z.string()).default([]),

    // Liste « Ce que contient le programme ».
    inclus: z.array(z.string()).min(1),
    // Images d'aperçu placées dans public/apercus/.
    apercus: z.array(z.object({ image: z.string(), legende: z.string() })).default([]),
    faq: z.array(z.object({ question: z.string(), reponse: z.string() })).default([]),

    // true = affiché sur la page d'accueil.
    misEnAvant: z.boolean().default(false),
    // Ordre d'affichage (le plus petit en premier).
    ordre: z.number().default(100),
    // true = avertissement santé renforcé (post-partum, reprise après blessure…).
    avertissementRenforce: z.boolean().default(false),
    // false = produit masqué du site sans supprimer le fichier.
    publie: z.boolean().default(true),

    // Page après paiement. Mets un code difficile à deviner, ex. 'force-k7p2x9'.
    // L'adresse sera /merci/<codeMerci> : c'est celle à coller dans Stripe.
    codeMerci: z.string().regex(/^[a-z0-9-]+$/, 'minuscules, chiffres et tirets uniquement'),
    // Lien de téléchargement du PDF (Google Drive, Dropbox…) donné après paiement.
    lienTelechargement: z.string(),
  }),
});

export const collections = { produits };
