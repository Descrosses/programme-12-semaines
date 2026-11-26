# Règles de la semaine de repas automatique

> **Statut : choix de l'appli, décidés le 26 novembre 2026** (Guillaume :
> « je compte sur toi […] pour prendre les bonnes décisions » ; « go lot 2 »).
> Source de vérité : le code transcrit ce fichier, un test relit ses tableaux
> (`data/reglesRepasAutomatiques.test.ts`). Pour changer une règle : changer
> ce fichier ET le code.
>
> Aucune valeur ci-dessous ne sort d'une étude : ce sont des **choix de
> conception** de l'appli, présentés comme tels.

---

## 0. Ce que l'appli fait, et ce qu'elle ne fait pas

- Pour les programmes **sans plan alimentaire propre** (POWER sans le plan
  historique, LADIES, programmes importés), l'appli **compose une semaine**
  de 7 jours avec les repas de sa bibliothèque et **ajuste les quantités** à
  la cible (`regles-cibles-nutrition.md`). La règle « aucune quantité
  proposée » est levée pour ces programmes-là (Guillaume, 26 novembre).
- La semaine se compose **une seule fois** : quand la cible est acceptée, ou
  au bouton « Composer ma semaine ». Elle ne bouge plus toute seule ensuite.
  Si la cible change, l'écran le dit et propose de recomposer.
- Tout reste modifiable : changer un repas, régler une quantité, remplacer
  ou retirer un aliment.
- Le plan historique de Guillaume n'est jamais touché. MASS n'est pas
  concerné.
- Ce n'est pas une prescription médicale : un repère, à ajuster.

---

## 1. Les repas de la journée et leur part de la cible

La personne choisit **4, 5 ou 6 repas par jour** (4 par défaut), dans
l'onglet Nutrition (Guillaume, 26 novembre : « la possibilité d'ajouter un
repas »). Changer ce nombre **recompose la semaine** : toutes les quantités
changent avec les parts, et c'est dit avant.

| Repas | 4 repas | 5 repas | 6 repas |
|---|---|---|---|
| Petit-déjeuner | 25 % | 20 % | 17,5 % |
| Collation du matin | — | 15 % | 12,5 % |
| Déjeuner | 30 % | 25 % | 22,5 % |
| Collation de l'après-midi | 15 % | 15 % | 12,5 % |
| Dîner | 30 % | 25 % | 22,5 % |
| Collation du soir | — | — | 12,5 % |

Un repas marqué « — » n'est pas composé, et l'écran ne l'affiche pas — sauf
s'il porte déjà quelque chose (rien de posé ne disparaît). Pour en avoir un
de plus : « + Ajouter un repas », sous le dernier repas de la journée.

La collation du soir puise dans les mêmes repas de la bibliothèque que la
collation de l'après-midi.

### Cible minimale pour 5 et 6 repas

| Nombre de repas | Cible minimale |
|---|---|
| 4 | aucune |
| 5 | 1 500 kcal |
| 6 | 1 900 kcal |

Sous ce seuil, le choix n'est pas proposé, et l'écran dit pourquoi.

**Pourquoi** (mesuré le 26 novembre, 24 cibles de 1 200 à 2 400 kcal, 7
répartitions essayées) : une collation de la bibliothèque ne descend pas
sous 150 à 200 kcal, même au plus bas de ses leviers. En dessous du seuil,
les collations dépassent leur part et la journée avec : jusqu'à + 16 % à
1 200 kcal en 5 repas, + 45 % en 6 repas. À partir du seuil, chaque jour
tient entre − 5 % et + 5 % de ses calories. Des collations à 10 % de la
journée ne tenaient qu'à partir de 2 600 kcal : elles sont à 12,5 % et 15 %.

**Limite connue** : la bibliothèque compte 11 collations. À 5 et 6 repas,
la même collation peut revenir tous les jours de la semaine ; « Changer ce
repas » reste là.

La cible utilisée est celle du **jour d'entraînement** (le calcul de l'appli
donne la même les deux jours, §5 des règles des cibles).

---

## 2. Ajuster un repas à sa part

Deux leviers, pour tomber à la fois sur les calories ET sur les protéines du
repas :

- les aliments **protéiques** (groupe « Protéines » : viandes, poissons,
  œufs, laitiers, légumineuses) sont multipliés par un facteur **a** ;
- **tous les autres** par un facteur **b**.

a et b sont la solution exacte des deux équations (calories, protéines),
puis bornés :

| Levier | Minimum | Maximum |
|---|---|---|
| a (protéiques) | × 0,6 | × 2 |
| b (le reste) | × 0,4 | × 2 |

**Les calories d'abord** : si un levier bute sur sa borne, l'autre rattrape
les calories, quitte à s'écarter des protéines.

Sans protéines dans la cible, ou si le repas n'a qu'un seul des deux types
d'aliments, un seul facteur pour tout le repas (calories seules), avec les
bornes du levier b.

**Les aliments à la pièce** (œuf, banane, pomme) ne se coupent pas : ils
sont arrondis en premier, puis les aliments pesés visent ce qui reste.

### Arrondis

| Unité | Arrondi | Minimum |
|---|---|---|
| g, ml | 5 | 5 |
| unité (œuf, banane…) | 1 | 1 |

Les totaux affichés sont **recalculés** sur les quantités arrondies : l'écart
à la cible est montré, jamais caché.

---

## 3. Choisir les repas de la semaine

Pour chaque jour, dans l'ordre des repas du §1 (ceux du nombre choisi), parmi les repas de la
bibliothèque prévus pour ce créneau **qui tiennent leur part à ± 10 % une
fois ajustés** (les autres restent dans la bibliothèque) :

1. jamais deux fois le même repas le même jour ;
2. jamais le même repas que la veille au même créneau ;
3. celui qui tient **le mieux ses protéines** une fois ajusté (écart compté
   par tranches de 10 % de sa part ; sans protéines dans la cible, règle
   sans effet) ;
4. à égalité, le repas **le moins servi** jusque-là dans la semaine ;
5. à égalité, celui qui contient **le plus d'aliments déclarés** dans le
   questionnaire ;
6. à égalité encore, l'ordre de la bibliothèque.

Si aucun repas ne passe, les règles se relâchent dans cet ordre plutôt que
de laisser le créneau vide : d'abord la règle 2 (la veille), puis la
tolérance de ± 10 %.

**Pourquoi les protéines avant la variété** (mesuré le 26 novembre, 7
profils de 1 200 à 4 000 kcal) : variété d'abord, les 27 plats tournent
mais un jour sur deux rate ses protéines d'un quart à un tiers (93 g pour
150 visés) ; protéines d'abord, chaque jour tient ses protéines à quelques
grammes près et ses calories entre − 5 % et + 5 %, avec 9 à 14 plats
différents sur la semaine. En perte de poids, rater les protéines coûte
plus cher qu'un plat qui revient ; « Changer ce repas » reste là.

Aucun hasard : les mêmes réponses donnent la même semaine.

---

## 4. Ce que la personne ne mange pas (exclusions)

> **Choix de l'appli, 26 novembre 2026** (Guillaume : « go exclusion »).
> Une question de sécurité : la liste ci-dessous se relit avant chaque
> déploiement qui la touche.

Le questionnaire n'a pas de question « régime » (il est la copie du site, son
résumé ne bouge pas) ; il a un champ libre « Allergies ou intolérances ».
L'appli ne devine donc rien : **la personne coche elle-même ce qu'elle ne
mange pas**, dans l'onglet Nutrition. Ses allergies écrites **pré-cochent**
les cases qu'elles nomment, au moment où elle accepte sa cible ; ce qui
n'est pas reconnu lui est dit, mot pour mot.

| Exclusion | Aliments écartés | Mots reconnus dans les allergies |
|---|---|---|
| Viande | poulet, dinde, bœuf | végétarien, végétalien, vegan |
| Poisson | poisson blanc, saumon, thon | poisson, saumon, thon, cabillaud, végétarien, végétalien, vegan |
| Œufs | œuf | œuf, oeuf, végétalien, vegan |
| Produits laitiers | lait, skyr, fromage blanc, fromage frais, yaourt grec | lactose, lait, laitier, laitiers, plv, végétalien, vegan |
| Arachide | beurre de cacahuète | arachide, arachides, cacahuète, cacahuètes |
| Fruits à coque | amandes | fruits à coque, fruit à coque, noix, amande, amandes, noisette, noisettes |
| Gluten | pain complet, pâtes, semoule, flocons d'avoine, flocons croustillants | gluten, blé, coeliaque, cœliaque, maladie coeliaque |

- Un repas qui contient **un seul** aliment écarté n'entre plus dans la
  semaine, ni dans « Changer ce repas » (les deux modes : semaine et « Mon
  plan »).
- Un mot des allergies est reconnu s'il **contient** un mot du tableau
  (casse et accents ignorés) ; « aucune », « rien », « non » et « RAS » ne
  sont pas des allergies. Le reste est montré comme **non reconnu**.
- L'avoine est rangée avec le gluten : sans mention « certifiée sans
  gluten », elle n'est pas sûre pour une personne cœliaque.
- L'écran le redit toujours : **les exclusions ne couvrent que ces familles ;
  avec une allergie, vérifie la composition de chaque repas.**
- Changer ses exclusions ne recompose rien : si la semaine contient un
  aliment écarté, un bandeau le dit et propose « Recomposer ».
- Si un créneau n'a plus aucun repas possible, il reste vide (jamais un
  repas écarté pour le remplir) : l'écart à la cible se voit.

---

## 5. Ce qui n'est pas encore fait

- Les régimes au-delà du tableau (sans porc : la bibliothèque n'a pas de
  porc ; halal, casher : à décider par Guillaume).
