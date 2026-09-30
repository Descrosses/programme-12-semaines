# Site vitrine — programmes fitness

Site 100 % statique (Astro + Tailwind CSS). Aucun serveur, aucune base de données :
les paiements passent par **Stripe Payment Links**, l'hébergement par **Netlify** (gratuit).

> Tous les éléments à remplir sont repérables :
> `PRIX_A_DEFINIR`, `REMPLACER…`, `[À COMPLÉTER…]`.
> Pour en voir la liste complète : `npm run check-placeholders`.

---

## Sommaire

1. [Où se trouve quoi](#1-où-se-trouve-quoi)
2. [Modifier un prix](#2-modifier-un-prix)
3. [Changer un lien Stripe (et régler Stripe)](#3-changer-un-lien-stripe-et-régler-stripe)
4. [Ajouter un produit](#4-ajouter-un-produit)
5. [Autres modifications courantes](#5-autres-modifications-courantes)
6. [Voir le site sur ton ordinateur](#6-voir-le-site-sur-ton-ordinateur)
7. [Mettre le site en ligne (Netlify)](#7-mettre-le-site-en-ligne-netlify)
8. [Checklist avant d'ouvrir les ventes](#8-checklist-avant-douvrir-les-ventes)

---

## 1. Où se trouve quoi

| Je veux modifier…                               | Fichier                                   |
| ----------------------------------------------- | ----------------------------------------- |
| Un prix, un lien Stripe, le texte d'un produit  | `src/content/produits/<produit>.md`       |
| Mon email, mon nom, SIRET, adresse, médiateur…  | `src/config.ts`                           |
| Les témoignages                                 | `src/data/temoignages.ts`                 |
| Le texte de la page d'accueil / FAQ d'accueil   | `src/pages/index.astro`                   |
| Mon parcours (À propos)                         | `src/pages/a-propos.astro`                |
| CGV, mentions légales, confidentialité, santé   | `src/pages/cgv.astro`, etc.               |
| La couleur d'accent                             | `src/styles/global.css` (`--color-accent`) |
| L'adresse du site (pour Google)                 | `astro.config.mjs` (`site:`) + `public/robots.txt` |
| Les aperçus de pages PDF                        | `public/apercus/`                          |

Le reste (`components/`, `layouts/`) est la mécanique du site : pas besoin d'y toucher.

**Tu peux tout modifier directement sur GitHub**, sans rien installer : ouvre le fichier sur
github.com → icône crayon ✏️ → modifie → bouton **Commit changes**. Netlify remet le site à jour
automatiquement en 1 à 2 minutes.

---

## 2. Modifier un prix

1. Ouvre le fichier du produit dans `src/content/produits/`, par exemple
   `force-explosivite-12-semaines.md`.
2. Change la ligne `prix:` :

   ```yaml
   prix: 49          # 49 €
   prix: 39.90       # 39,90 € (point, pas virgule)
   ```

3. Enregistre (Commit). C'est tout.

⚠️ **Change aussi le prix dans Stripe** : le site affiche le prix, mais c'est Stripe qui
encaisse. Dans Stripe, un prix ne se modifie pas : il faut créer un nouveau Payment Link
avec le nouveau prix, puis coller ce nouveau lien dans le fichier (voir section 3).

**Pack** : le prix « au lieu de X € achetés séparément » est calculé automatiquement
à partir des prix des produits listés dans `contient:`. Il ne s'affiche que si tous les prix
sont renseignés et si le pack est réellement moins cher.

Tant qu'un prix vaut `PRIX_A_DEFINIR`, le site affiche « Prix à venir » et le bouton
« Bientôt disponible » (non cliquable).

---

## 3. Changer un lien Stripe (et régler Stripe)

### Changer le lien

Dans le fichier du produit, remplace la ligne `lienStripe:` :

```yaml
lienStripe: "https://buy.stripe.com/abc123XYZ"
```

Tant que le lien contient `REMPLACER`, le bouton reste désactivé.

### Créer un Payment Link dans Stripe (une fois par produit)

Les libellés exacts peuvent varier légèrement, Stripe fait évoluer son interface.

1. **Stripe → Catalogue de produits → Ajouter un produit** : nom, prix, paiement **ponctuel**.
2. **Payment Links → Nouveau** : choisis le produit.
3. Onglet **Après le paiement** → **Rediriger les clients vers votre site web** → colle
   l'adresse de la page de remerciement du produit :

   ```
   https://TON-SITE.netlify.app/merci/<codeMerci>
   ```

   (`<codeMerci>` = la valeur du champ `codeMerci:` du fichier produit.)
4. Options : active **« Demander aux clients d'accepter vos conditions d'utilisation »**
   (il faut d'abord renseigner l'adresse de tes CGV, `https://TON-SITE.netlify.app/cgv`,
   dans les paramètres publics du compte Stripe).
5. Ajoute un **texte personnalisé** (sur la page de paiement et/ou dans l'email de reçu) du type :
   *« Vous avez demandé l'accès immédiat à ce contenu numérique et renoncé à votre droit
   de rétractation. »* — la loi demande que cette renonciation soit **confirmée** au client
   par écrit (email).
6. Active l'envoi des **reçus par email** (Paramètres → Emails clients).
7. Copie le lien (`https://buy.stripe.com/…`) et colle-le dans le fichier produit.

### Livraison du PDF : comment ça marche

Après paiement, Stripe renvoie le client vers `/merci/<codeMerci>`, qui affiche un bouton
de téléchargement pointant vers `lienTelechargement:` (ex. un lien de partage Google Drive
ou Dropbox en « lecture seule, toute personne disposant du lien »).

- Choisis un `codeMerci` **difficile à deviner** (ex. `force-k7p2x9`), en minuscules.
- Cette page est exclue de Google et du sitemap.
- **Limite honnête** : quelqu'un qui connaît l'adresse peut la partager. C'est acceptable
  pour démarrer. Si tu constates du partage, change le `codeMerci` (et l'adresse de redirection
  dans Stripe) ainsi que le lien du PDF.

---

## 4. Ajouter un produit

1. Dans `src/content/produits/`, **duplique** un fichier existant proche de ce que tu veux
   (sur GitHub : ouvre-le, copie tout le contenu, puis **Add file → Create new file**).
2. Nomme le nouveau fichier en minuscules, avec des tirets, sans accents :
   `mobilite-6-semaines.md`. Ce nom devient l'adresse de la page :
   `/programmes/mobilite-6-semaines`.
3. Modifie les champs :

   | Champ                   | Rôle                                                                 |
   | ----------------------- | -------------------------------------------------------------------- |
   | `titre`, `sousTitre`    | Nom et accroche                                                      |
   | `categorie`             | `musculation`, `diete` ou `pack` (utilisé par le filtre)             |
   | `resume`                | 1–2 phrases pour la carte et Google (200 caractères max)             |
   | `prix`                  | Nombre, ou `PRIX_A_DEFINIR`                                          |
   | `lienStripe`            | Lien Payment Link                                                    |
   | `duree`, `niveau`, `frequence`, `lieu` | Fiche technique                                       |
   | `contient`              | Pour un pack seulement : noms des fichiers inclus (sans `.md`)       |
   | `inclus`                | Liste « Ce que tu reçois »                                           |
   | `apercus`               | Images dans `public/apercus/` + légende                              |
   | `faq`                   | Questions / réponses                                                 |
   | `misEnAvant`            | `true` = affiché sur l'accueil (les 3 premiers selon `ordre`)        |
   | `ordre`                 | Ordre d'affichage (petit = en premier)                               |
   | `avertissementRenforce` | `true` = encadré santé renforcé (post-partum, reprise après blessure) |
   | `publie`                | `false` = masquer le produit sans supprimer le fichier               |
   | `codeMerci`             | Code de la page après paiement                                       |
   | `lienTelechargement`    | Lien du PDF                                                          |

4. Sous la deuxième ligne `---`, écris la description (texte normal, un paragraphe par
   ligne vide).
5. Enregistre. La page produit, la carte du catalogue et la page de remerciement sont créées
   automatiquement.

**Si tu oublies un champ ou fais une faute** (ex. `categorie: dietes`), la mise en ligne
échoue avec un message qui indique le fichier et le champ. L'ancienne version du site reste
en ligne : rien n'est cassé pour tes visiteurs. Corrige et réenregistre.

Règles d'écriture : **aucun résultat chiffré promis** (« -10 kg », « +20 kg au squat »),
pas de promesse de transformation. Décris le contenu, pas le résultat.

---

## 5. Autres modifications courantes

- **Aperçus de pages** : exporte 2–3 pages de ton PDF en image (JPG, ~600 px de large),
  mets-les dans `public/apercus/`, et indique leur nom dans `apercus:` du produit
  (ex. `image: "/apercus/force-1.jpg"`). Supprime ensuite les `.svg` d'exemple.
- **Photo de la page À propos** : place `photo.jpg` dans `public/` et suis le commentaire
  en haut de `src/pages/a-propos.astro`.
- **Témoignages** : ajoute-les dans `src/data/temoignages.ts`. Tant que la liste est vide,
  la section est masquée en ligne. **Uniquement de vrais avis, avec accord écrit.**
- **Image de partage réseaux sociaux** : remplace `public/og-image.png` (1200 × 630 px).

---

## 6. Voir le site sur ton ordinateur

Facultatif (utile pour vérifier avant de publier). Il faut installer
[Node.js](https://nodejs.org) version 22 ou plus, puis, dans un terminal :

```bash
cd site
npm install          # une seule fois
npm run dev          # ouvre http://localhost:4321
```

En local, des repères rouges signalent ce qui reste à compléter (ils n'apparaissent pas en ligne).

Autres commandes :

```bash
npm run build               # génère le site final dans dist/
npm run check-placeholders  # liste tout ce qu'il reste à compléter
```

---

## 7. Mettre le site en ligne (Netlify)

Le fichier `netlify.toml` contient déjà tous les réglages : tu n'as rien à configurer.

1. Crée un compte sur [netlify.com](https://www.netlify.com) avec **« Sign up with GitHub »**.
2. **Add new site → Import an existing project → GitHub**.
3. Autorise Netlify et choisis le dépôt **programme-12-semaines**.
4. Branche : `main` (une fois cette branche fusionnée).
5. Netlify détecte `netlify.toml` (dossier `site`, commande `npm run build`, dossier `dist`).
   Ne change rien → **Deploy**.
6. Après 1–2 minutes, ton site est en ligne à une adresse du type `https://xxx.netlify.app`.
7. **Site configuration → Change site name** pour choisir une adresse plus lisible.
8. Reporte cette adresse dans :
   - `astro.config.mjs` → ligne `site:` ;
   - `public/robots.txt` → ligne `Sitemap:` ;
   - les redirections « Après le paiement » de tes Payment Links Stripe.
9. (Optionnel) **Domain management → Add a domain** pour un nom de domaine à toi
   (~10 €/an chez OVH, Gandi…). Netlify fournit le HTTPS gratuitement.

Ensuite, **chaque modification enregistrée sur GitHub met le site à jour automatiquement**.

> Ce dépôt contient aussi l'appli PWA « Programme 12 semaines » (publiée sur GitHub Pages).
> Les deux sont indépendantes : le site vitrine vit uniquement dans le dossier `site/`.

**Soumettre à Google** (une fois en ligne) : [Google Search Console](https://search.google.com/search-console)
→ ajoute ton site → **Sitemaps** → `sitemap-index.xml`.

---

## 8. Checklist avant d'ouvrir les ventes

- [ ] `npm run check-placeholders` n'affiche plus rien (ou relis tous les `[À COMPLÉTER]` sur GitHub).
- [ ] Prix, liens Stripe, `codeMerci` et `lienTelechargement` renseignés pour chaque produit.
- [ ] Un achat test réalisé en **mode test Stripe** (carte `4242 4242 4242 4242`), redirection
      vers la page merci et téléchargement vérifiés.
- [ ] Statut d'entreprise déclaré (micro-entreprise), SIRET dans `src/config.ts`.
- [ ] **TVA** : vérifie avec ton comptable / l'URSSAF ta situation (franchise en base, ventes
      de contenus numériques à des particuliers d'autres pays de l'UE).
- [ ] **Médiateur de la consommation** choisi et renseigné (obligatoire pour vendre à des particuliers).
- [ ] CGV, mentions légales et confidentialité relues par un professionnel.
- [ ] Contenu du programme post-partum relu par un professionnel de santé (sage-femme,
      kinésithérapeute spécialisé).
