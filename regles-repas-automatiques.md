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

| Repas | Part des calories et des protéines |
|---|---|
| Petit-déjeuner | 25 % |
| Déjeuner | 30 % |
| Collation de l'après-midi | 15 % |
| Dîner | 30 % |

La collation du matin reste vide : on peut y poser un repas à la main.

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

Pour chaque jour, dans l'ordre des repas du §1, parmi les repas de la
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

## 4. Ce qui n'est pas encore fait

- La liste de courses (lot 3) : elle demande des coefficients cru → cuit
  validés.
- Le réajustement toutes les deux semaines (lot 4).
