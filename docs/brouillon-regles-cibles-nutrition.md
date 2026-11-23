# Règles de calcul des cibles nutritionnelles — BROUILLON (révision 2)

> **Statut : brouillon, rien n'est codé.** Révision 2 du 23 novembre :
> sources relues et corrigées par Guillaume (relecture externe), qui a
> **validé** la formule de dépense au repos et les fourchettes des études.
>
> Chaque section sépare deux choses :
> - **Ce que disent les études** — référence exacte, avec son contexte ;
> - **Choix de l'appli** — une valeur de conception, raisonnable mais qui ne
>   sort d'aucune étude. Celles marquées **[À DÉCIDER]** attendent Guillaume.
>
> Une fois tout décidé, ce fichier devient la source de vérité, comme
> `programme-final-12-semaines.md` : le code le transcrit, des tests le
> relisent.

---

## 0. Ce que l'appli fera, et ce qu'elle ne fera pas

- Elle **propose** une cible (calories, puis protéines, lipides, glucides) à
  partir des réponses du questionnaire. La personne voit le détail du calcul
  et **l'accepte ou la modifie**. Rien n'est imposé.
- Toute cible est présentée comme une **estimation**, jamais comme une mesure.
- Elle **ne calcule rien** dans les cas du §6 : la cible reste à poser par
  Guillaume, l'écran le dit.
- Elle **réajuste** toutes les deux semaines selon le poids réel (§7),
  toujours en proposition.
- Elle ne prescrit **aucune quantité d'aliment** (règle actuelle inchangée).

---

## 1. Les données d'entrée — déjà dans le questionnaire

| Donnée | Question du questionnaire | Usage |
|---|---|---|
| Sexe, âge, taille, poids | écran « Vous » | dépense au repos, protéines, lipides, IMC |
| Travail, pas par jour | écran « Votre activité » | activité quotidienne |
| Séances par semaine, durée | écran « Votre activité » | activité sportive |
| Objectif, rythme | écran « Votre objectif » | déficit ou surplus |
| Tendance du poids sur 4 semaines | écran « Votre objectif » | contrôle de cohérence (§7) |
| Grossesse, maladie, relation à la nourriture | écran « Sécurité » | exclusions (§6) |

**Manque côté appli (technique) :** un **profil** gardé en base (sexe, âge,
taille, activité, objectif), le poids étant lu dans les pesées. Aujourd'hui
les réponses restent dans le questionnaire, sur le téléphone.

---

## 2. Dépense au repos — VALIDÉ

**Équation de Mifflin-St Jeor (1990)** :

    Homme : 10 × poids (kg) + 6,25 × taille (cm) − 5 × âge + 5
    Femme : 10 × poids (kg) + 6,25 × taille (cm) − 5 × âge − 161

Une estimation de départ à partir du poids, de la taille, de l'âge et du
sexe — présentée comme telle à l'écran.

---

## 3. Coefficient d'activité — choix de l'appli **[À DÉCIDER]**

**Ce que disent les études :** les niveaux d'activité physique de la
FAO/OMS donnent des ordres de grandeur (sédentaire 1,40–1,69, actif
1,70–1,99). Aucune étude ne donne une grille travail × pas × séances.

**Choix de l'appli (proposition) :** deux parts additionnées.

**3a. Activité quotidienne**

| Travail \ Pas | < 5 000 | 5 000–8 000 | 8 000–12 000 | > 12 000 | Je ne sais pas |
|---|---|---|---|---|---|
| Assis | 1,25 | 1,35 | 1,45 | 1,55 | 1,30 |
| Debout | 1,35 | 1,45 | 1,55 | 1,60 | 1,40 |
| Physique | 1,45 | 1,55 | 1,65 | 1,70 | 1,50 |

**3b. Entraînement, par séance hebdomadaire** : + 0,025 (< 45 min),
+ 0,035 (45–75 min), + 0,05 (> 75 min). « 6 ou plus » compte pour 6.
Plafond du coefficient total : 1,95.

    Dépense totale = dépense au repos × (3a + 3b)

---

## 4. Objectif et rythme

**Ce que disent les études :**

- **Perte : environ 0,5 à 1 % du poids par semaine** (Helms 2014). Contexte :
  préparation de compétition de bodybuilders naturels. Garde-fou utile pour
  un sportif entraîné, à adapter au niveau et à la tolérance.
- **Prise : environ 0,25 à 0,5 % du poids par semaine**, avec un surplus
  modéré d'environ 10 à 20 % (Iraki 2019). Contexte : bodybuilders hors
  saison ; les athlètes avancés visent le bas de la fourchette.
- **Repère général** (NHLBI, *Aim for a Healthy Weight*) : un déficit de 500
  à 1 000 kcal par jour pour perdre 0,5 à 1 kg par semaine.

**Choix de l'appli [À DÉCIDER] :**

| Objectif | Progressif | Modéré | Le plus vite possible |
|---|---|---|---|
| Perdre du poids | − 10 % | − 15 % | − 20 % |
| Maintenir | 0 | 0 | 0 |
| Prendre du poids (muscle) | + 5 % | + 10 % | + 15 % |

Les fourchettes de rythme ci-dessus servent de garde-fou au réajustement (§7).

---

## 5. Répartition des macros

### Protéines

**Ce que disent les études :**

- **ISSN 2017** : 1,4 à 2,0 g/kg/j pour la plupart des personnes physiquement
  actives.
- **Morton 2018** : point de rupture autour de **1,6 g/kg/j** pour les gains
  de masse maigre avec entraînement en résistance (ce n'est pas une
  fourchette de prescription).
- **Iraki 2019** : 1,6 à 2,2 g/kg/j pour les sportifs de force et de physique
  (bodybuilders hors saison).

**Choix de l'appli :**

- Par défaut : **[À DÉCIDER] une valeur entre 1,6 et 2,0 g/kg/j** (la
  révision 1 proposait 2,0).
- En déficit, pour retenir la masse maigre : **[À DÉCIDER] une valeur entre
  2,0 et 2,2 g/kg/j** — et dans quels déficits (tous, ou « rapide » seulement).
- **IMC ≥ 30 : calcul sur le poids correspondant à un IMC de 25.** Adaptation
  pratique de l'appli, pas une recommandation des études citées. Validée
  comme règle.

### Lipides

**Ce que disent les études :** **20 à 35 % de l'énergie totale**
(ACSM / Academy of Nutrition and Dietetics / Dietitians of Canada, 2016).

**Choix de l'appli :** **25 % des calories** par défaut (dans la
fourchette), avec un garde-fou pratique : **jamais sous 0,6 g/kg/j**. Ce
plancher est un choix de l'appli, pas une valeur de l'ACSM.

### Glucides

**Choix de l'appli :** le reste des calories. Si le reste passe sous
**2 g/kg/j**, l'écran le signale (repère : l'ACSM 2016 indique 3 à 5 g/kg/j
pour une activité légère à modérée).

### Jour d'entraînement et jour de repos **[À DÉCIDER]**

- **Option A (proposée)** : même cible les deux jours.
- **Option B** : jour de repos = jour d'entraînement − 10 %, pris sur les
  glucides ; protéines et lipides inchangés.

Aucune des deux ne sort d'une étude citée ; A est la plus simple.

### Arrondis

Calories à 50 kcal près, macros à 5 g près.

---

## 6. Sécurité

### Quand l'appli NE CALCULE PAS (choix de l'appli)

L'écran affiche « Ta cible sera posée par Guillaume » si :

- grossesse, allaitement ou accouchement récent = Oui ;
- maladie ou traitement influençant l'alimentation = Oui ;
- relation compliquée avec la nourriture = Oui ou « en parler de vive voix » ;
- perte de poids demandée avec un IMC < 18,5 ;
- moins de 18 ans (déjà refusé par le questionnaire).

### Planchers caloriques

**Ce que disent les références :** il n'existe **pas de seuil universel**.
Les régimes hypocaloriques usuels sont de l'ordre de **1 200–1 500 kcal/j
chez les femmes** et **1 500–1 800 kcal/j chez les hommes** (MedlinePlus) ;
les besoins dépendent du poids, de la taille, de l'âge, du sexe, de
l'activité et de l'état de santé. Un suivi professionnel est approprié pour
les apports très bas, notamment **sous 800 kcal/j** (l'appli refuse déjà
toute cible sous 800 kcal).

**Choix de prudence de l'appli [À DÉCIDER] :** ne jamais **proposer**
automatiquement moins de **1 500 kcal (homme)** ni **1 200 kcal (femme)**, ni
moins que la dépense au repos. Ce sont des garde-fous de l'appli, présentés
comme tels — pas des seuils médicaux. En dessous, l'écran renvoie vers
Guillaume.

---

## 7. Réajustement toutes les deux semaines

**Validé comme règle opérationnelle.** Sur la moyenne des pesées de 7 jours
(déjà calculée par l'écran Progrès) :

| Constat sur 2 semaines | Proposition |
|---|---|
| Perte : moins de 0,5 %/sem. | − 100 kcal (sur glucides et lipides) |
| Perte : plus de 1 %/sem. | + 100 kcal |
| Prise : moins de 0,25 %/sem. | + 100 kcal |
| Prise : plus de 0,5 %/sem. | − 100 kcal |
| Maintien : écart de plus de 1 % | ± 100 kcal |
| Moins de 4 pesées sur 7 jours | aucune proposition (« pèse-toi plus souvent ») |

Les **paliers de ± 100 kcal** sont un choix de conception de l'appli, simple
et progressif — pas une valeur chiffrée issue des études citées. Les
protéines suivent le poids ; le reste ne bouge qu'avec les calories.
Toujours une proposition, à accepter.

---

## 8. Exemple calculé (homme, 34 ans, 180 cm, 82,5 kg)

Réponses : assis, 5 000–8 000 pas, 4 séances de 45 à 75 min, perdre du
poids à rythme modéré. Avec les valeurs proposées (protéines 2,0 g/kg,
lipides 25 %) :

| Étape | Calcul | Résultat |
|---|---|---|
| Dépense au repos | 10 × 82,5 + 6,25 × 180 − 5 × 34 + 5 | 1 785 kcal |
| Coefficient | 1,35 (assis, 5–8 k pas) + 4 × 0,035 | 1,49 |
| Dépense totale | 1 785 × 1,49 | 2 660 kcal |
| Objectif (perte modérée) | 2 660 × 0,85 | 2 261 → **2 250 kcal** |
| Protéines | 2,0 × 82,5 | **165 g** (660 kcal) |
| Lipides | 25 % × 2 250 / 9 = 62,5 | **60 g** (540 kcal) |
| Glucides | (2 250 − 660 − 540) / 4 = 262,5 | **265 g** (3,2 g/kg) |

Rythme attendu : environ 410 kcal de déficit par jour, soit environ
0,37 kg par semaine (7 700 kcal ≈ 1 kg), **0,45 % du poids** — juste **sous**
la fourchette de 0,5 à 1 % (Helms 2014). Soit « modéré » à − 15 % est un peu
lent pour ce profil, soit c'est voulu et le réajustement (§7) corrige après
deux semaines.

---

## 9. État des décisions

| # | Sujet | État |
|---|---|---|
| 1 | Mifflin-St Jeor | **Validé** |
| 2 | Grille d'activité (§3) | À décider |
| 3 | Pourcentages déficit / surplus (§4) | À décider |
| 4 | Protéines par défaut (1,6 à 2,0 g/kg) | À décider : une valeur |
| 5 | Protéines en déficit (2,0 à 2,2 g/kg), et pour quels rythmes | À décider |
| 6 | Protéines sur poids de référence si IMC ≥ 30 | **Validé** |
| 7 | Lipides 25 %, plancher 0,6 g/kg ; glucides en complément | Validé comme choix de l'appli |
| 8 | Jour de repos : A (identique) ou B (− 10 % glucides) | À décider |
| 9 | Exclusions du §6 | À confirmer |
| 10 | Planchers 1 200 / 1 500 kcal comme garde-fous de l'appli | À décider |
| 11 | Réajustement toutes les 2 semaines, ± 100 kcal | **Validé** comme règle opérationnelle |
| 12 | Familles concernées : POWER, FEMMES, importés ; MASS CONGESTION garde ses principes | À confirmer |

---

## Références

- Mifflin MD, St Jeor ST et al. *A new predictive equation for resting energy
  expenditure in healthy individuals.* Am J Clin Nutr, 1990.
- FAO/OMS/UNU. *Human energy requirements*, 2004 (niveaux d'activité physique).
- Jäger R et al. *International Society of Sports Nutrition Position Stand:
  protein and exercise.* JISSN, 2017 — 1,4 à 2,0 g/kg/j.
- Morton RW et al. *Br J Sports Med*, 2018 — point de rupture autour de
  1,6 g/kg/j.
- Iraki J et al. *Nutrition recommendations for bodybuilders in the
  off-season.* Sports, 2019 — 1,6 à 2,2 g/kg/j ; prise de 0,25 à 0,5 %/sem. ;
  surplus de 10 à 20 %.
- Helms ER, Aragon AA, Fitschen PJ. *Evidence-based recommendations for
  natural bodybuilding contest preparation: nutrition and supplementation.*
  JISSN, 2014 — perte de 0,5 à 1 %/sem.
- Thomas DT, Erdman KA, Burke LM. *Nutrition and Athletic Performance.*
  ACSM / Academy of Nutrition and Dietetics / Dietitians of Canada, 2016 —
  lipides 20 à 35 % de l'énergie.
- NHLBI. *Aim for a Healthy Weight* — déficit de 500 à 1 000 kcal/j pour 0,5 à
  1 kg/sem.
- MedlinePlus — régimes hypocaloriques usuels : 1 200–1 500 kcal/j (femmes),
  1 500–1 800 kcal/j (hommes).
