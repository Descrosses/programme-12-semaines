# Règles de la liste de courses

> **Statut : VALIDÉ par Guillaume le 26 novembre 2026 (« facteurs validés,
> déploie ») — source de vérité.**
> Source de vérité : le code transcrit ce fichier, un test relit ses tableaux
> (`data/reglesCourses.test.ts`). Pour changer un chiffre : changer ce
> fichier ET le code.
>
> Chaque ligne dit d'où vient son chiffre. **Ce qui ne vient pas d'une table
> publiée est marqué « choix de l'appli ».**

---

## 0. Ce que fait la liste

- Elle additionne **les 7 jours de la semaine de repas** (lot 2), tels qu'ils
  sont à l'écran, changements faits à la main compris.
- Les repas de l'appli sont pesés **cuits** (riz, pâtes, viandes…). La liste
  les convertit en **poids cru, celui qu'on achète** :
  `poids cru = poids cuit ÷ facteur de rendement`.
- Le poids cru est le poids **prêt à cuire** : épluchures, os et parures en
  plus (Bognár ne les compte pas). L'écran le dit.
- Elle ne donne **aucun prix**.

---

## 1. Les facteurs de rendement (poids cuit ÷ poids cru)

Source principale : **Bognár A. (2002)**, *Tables on weight yield of food
and retention factors of food constituents for the calculation of nutrient
composition of cooked foods (dishes)*, BFE-R-02-03, Bundesforschungsanstalt
für Ernährung, Karlsruhe — facteur « edible part », produit prêt à cuire,
eau de cuisson et matière grasse non comptées. n = nombre de données de la
table.

| Aliment de l'appli | À acheter | Facteur | Ligne de la source | n |
|---|---|---|---|---|
| Riz cuit | Riz blanc (cru) | 2,98 | Bognár t. 29 — Rice, long corn, polished, boiled | — |
| Pâtes cuites | Pâtes (crues) | 2,10 | Bognár t. 30 — Noodles, hard wheat (egg-free pasta), boiled | 4 |
| Semoule cuite | Semoule (crue) | 2,93 | **Choix de l'appli** : rapport des calories, 351 kcal cru (médiane Open Food Facts, semoules de blé dur) ÷ 120 kcal cuit (catalogue de l'appli) | — |
| Pommes de terre cuites | Pommes de terre (crues, épluchées) | 1,00 | Bognár t. 21 — Potato, without peel, boiled | 272 |
| Lentilles cuites | Lentilles (sèches) | 2,73 | Bognár t. 20 — Lentils, boiled / stewed | 6 |
| Haricots rouges cuits | Haricots rouges (secs) | 2,50 | Bognár t. 20 — Beans (white and red), boiled / stewed | 10 |
| Poulet cuit | Blanc de poulet (cru) | 0,80 | Bognár t. 9 — Escallop of chicken (breast), pan fried | 3 |
| Dinde cuite | Escalope de dinde (crue) | 0,74 | Bognár t. 9 — Escallop of turkey (breast), pan fried | 20 |
| Bœuf maigre cuit | Bœuf maigre (cru) | 0,73 | Bognár t. 4 — Steak (beef), medium, pan fried (n = 1) ; Roast beef, medium : 0,72 (n = 21) | 1 |
| Poisson blanc cuit | Filet de poisson blanc (cru) | 0,80 | Bognár t. 13 — Fish fillet (cod, red fish, pollack), fried | 10 |
| Saumon | Pavé de saumon (cru) | 0,80 | **À défaut** : même ligne que le poisson blanc (Bognár n'a pas de saumon) | 10 |
| Brocolis cuits | Brocolis (crus) | 1,11 | Bognár t. 19 — Broccoli, boiled | 3 |
| Haricots verts cuits | Haricots verts (crus) | 0,93 | Bognár t. 20 — Green beans, boiled | 120 |
| Carottes cuites | Carottes (crues) | 0,94 | Bognár t. 17 — Carrot, boiled | 103 |
| Courgettes cuites | Courgettes (crues) | 0,73 | **Donnée faible** : Bognár t. 19 — Zucchini, stew, recette avec ingrédients | 3 |
| Aubergine cuite | Aubergine (crue) | 0,80 | **Donnée faible** : Bognár t. 19 — Egg-plants, stew, recette avec ingrédients | 3 |

Tout autre aliment (pesé cru ou « tel quel » : skyr, flocons, amandes,
pain, fruits, crudités, aliments ajoutés à la main…) garde son poids.

Les légumineuses existent aussi **en conserve** : leur poids égoutté est
proche du poids cuit. L'écran le rappelle sous ces deux lignes.

---

## 2. Arrondis à l'affichage (choix de l'appli)

On arrondit **toujours vers le haut** : mieux vaut un reste qu'un manque.

| Quantité | Arrondi | Affichage |
|---|---|---|
| moins de 1 000 g ou ml | 10 supérieur | « 480 g », « 310 ml » |
| 1 000 g ou ml et plus | 50 supérieur | « 1,25 kg », « 1,5 L » |
| à la pièce | somme exacte | « 7 », « 30 œufs » |

---

## 3. Les rayons (choix de l'appli)

| Rayon | Familles du catalogue |
|---|---|
| Viandes et poissons | protéines (sauf œufs) |
| Crèmerie et œufs | laitiers, œufs |
| Fruits et légumes | fruits, légumes |
| Épicerie | féculents (sauf pain), légumineuses, matières grasses, autres |
| Boulangerie | pain |

Dans un rayon, les articles sont rangés par ordre alphabétique.

---

## 4. À l'écran

- Bouton « Ma liste de courses » sous les repas de la semaine.
- Une case à cocher par article ; les cases cochées sont gardées sur ce
  téléphone (pas en base, pas dans la sauvegarde) et repartent à zéro quand
  la semaine est recomposée.
- « Partager la liste » : la feuille de partage du téléphone (texte simple),
  sinon copie dans le presse-papiers.
