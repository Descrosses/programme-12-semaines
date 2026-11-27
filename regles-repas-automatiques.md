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
| 5 | 1 200 kcal |
| 6 | 1 200 kcal |

Sous ce seuil, le choix n'est pas proposé, et l'écran dit pourquoi.

**Pourquoi** (re-mesuré le 27 novembre avec la grille de la bibliothèque,
§5 : une cible tous les 10 kcal de 1 000 à 2 000, cinq niveaux de protéines
de 5 à 10 % des calories, sans exclusion). Les collations légères de la
grille (150 à 250 kcal) tiennent leur part des petites cibles. Dès 1 200 kcal
— le plus petit plancher du §6 des règles des cibles —, 5 et 6 repas font
aussi bien que 4 : pire jour à + 5,7 % en 5 repas et à + 6,1 % en 6 repas,
contre + 6,3 % en 4 repas ; dès 1 500 kcal, + 5,3 % au pire. En dessous,
seule une fiche de coach peut descendre, et les collations dépassent :
jusqu'à + 7,5 % en 5 repas et + 24 % en 6 repas à 1 000-1 050 kcal.

Mesure du 26 novembre, avant la grille (gardée pour mémoire) : seuils de
1 500 et 1 900 kcal ; à 1 200 kcal, + 16 % en 5 repas, + 45 % en 6 repas. Des
collations à 10 % de la journée ne tenaient qu'à partir de 2 600 kcal : elles
sont à 12,5 % et 15 %.

**Limite connue** : 34 repas de la bibliothèque se prennent en collation
(grille comprise, petits-déjeuners proposés aussi en collation compris).
À 5 et 6 repas, la même collation peut encore revenir plusieurs jours de la
semaine ; « Changer ce repas » reste là.

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

**Le même aliment plusieurs fois dans la journée : accepté.** Trois repas
aux œufs, du skyr matin et après-midi, saumon et pâtes midi et soir : aucune
règle ne l'interdit, et c'est voulu (Guillaume, 27 novembre : « ce n'est pas
si dérangeant […] l'utilisateur choisira »). « Changer ce repas » est là
pour ça. Ne pas ajouter de règle « une seule fois la même source ».

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
| Viande | poulet, dinde, bœuf, steak haché 5 %, jambon blanc | végétarien, végétalien, vegan |
| Poisson | poisson blanc, saumon, thon | poisson, saumon, thon, cabillaud, végétarien, végétalien, vegan |
| Œufs | œuf | œuf, oeuf, végétalien, vegan |
| Produits laitiers | lait, skyr, fromage blanc, fromage frais, yaourt grec, whey | lactose, lait, laitier, laitiers, plv, végétalien, vegan |
| Arachide | beurre de cacahuète | arachide, arachides, cacahuète, cacahuètes |
| Fruits à coque | amandes, noix | fruits à coque, fruit à coque, noix, amande, amandes, noisette, noisettes |
| Gluten | pain complet, pâtes, semoule, flocons d'avoine, flocons croustillants, boulgour | gluten, blé, coeliaque, cœliaque, maladie coeliaque |

- Un repas qui contient **un seul** aliment écarté n'entre plus dans la
  semaine, ni dans « Changer ce repas » (les deux modes : semaine et « Mon
  plan »).
- Un mot des allergies est reconnu s'il **contient** un mot du tableau
  (casse et accents ignorés) ; « aucune », « rien », « non » et « RAS » ne
  sont pas des allergies. Le reste est montré comme **non reconnu**.
- La whey (protéine en poudre des collations à boire) est une protéine de
  lait : elle est rangée avec les produits laitiers.
- L'avoine est rangée avec le gluten : sans mention « certifiée sans
  gluten », elle n'est pas sûre pour une personne cœliaque.
- L'écran le redit toujours : **les exclusions ne couvrent que ces familles ;
  avec une allergie, vérifie la composition de chaque repas.**
- Changer ses exclusions ne recompose rien : si la semaine contient un
  aliment écarté, un bandeau le dit et propose « Recomposer ».
- Si un créneau n'a plus aucun repas possible, il reste vide (jamais un
  repas écarté pour le remplir) : l'écart à la cible se voit.

---

## 5. La grille de la bibliothèque

> **Choix de l'appli, 27 novembre 2026** (Guillaume : « go grille
> bibliothèque, pas d'exclusion soja »). Une règle de sécurité autant que de
> confort : un test la vérifie pour chaque exclusion et chaque paire.

La bibliothèque doit permettre à chacun de composer sa semaine avec ce
qu'elle propose, quelles que soient ses exclusions. Un repas « possible »
est un repas qui ne contient aucun aliment écarté ; il est compté dans
chaque type où il peut se prendre (un petit-déjeuner proposé aussi en
collation compte dans les deux).

| Exclusions cochées | Repas possibles par type, au moins |
|---|---|
| une seule (chacune des 7) | 7 |
| deux (chacune des 21 paires) | 5 |

Les trois types : petit-déjeuner, collation, plat (déjeuner et dîner).

Retirer un repas ou ajouter un aliment écarté qui recrée un trou fait
échouer le déploiement. Au-delà de deux exclusions, rien n'est garanti
(végétalien sans gluten : 5 petits-déjeuners, 7 collations, 7 plats ; le
même repas peut revenir plusieurs fois dans la semaine).

Quatre aliments sont entrés au catalogue pour tenir cette grille. Source :
**NEVO-online 2025/9.0** (RIVM, Pays-Bas), pour 100 g ou 100 ml — la table
Ciqual de l'Anses était en maintenance le 27 novembre.

| Aliment | kcal | Protéines | Glucides | Lipides | Code NEVO |
|---|---|---|---|---|---|
| Tofu nature | 119 | 12,4 | 1,5 | 6,6 | 5519 |
| Boisson au soja nature | 35 | 3,4 | 1 | 1,8 | 870 |
| Yaourt au soja nature | 39 | 4 | 0 | 2,3 | 5247 |
| Galettes de riz soufflé | 390 | 6,6 | 81,8 | 3 | 3325 |

**Pas d'exclusion « soja »** (décision de Guillaume). Une personne allergique
au soja recevra des repas au tofu : le mot « soja » écrit dans ses allergies
lui est rendu comme **non reconnu**, et la phrase de prudence reste affichée.

Les 33 repas de la grille attendent leur photo : une vignette neutre les
montre en attendant.

---

## 6. Ce qui n'est pas encore fait

- Les régimes au-delà du tableau (sans porc : le jambon blanc est la seule
  viande de porc de la bibliothèque, dans 2 repas, et il est écarté avec la
  viande ; halal, casher : à décider par Guillaume).
