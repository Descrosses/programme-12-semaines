# Règles de calcul des cibles nutritionnelles

> **Statut : VALIDÉ par Guillaume le 23 novembre 2026 — source de vérité.**
> Le code transcrit ce fichier, il ne le réinterprète pas ; des tests le
> relisent. Pour changer une règle : changer ce fichier ET le code.
> **Codé côté coach** (`#/admin`, 23 novembre) : moteur `engine/calculCibles.ts`,
> valeurs `data/reglesCiblesNutrition.ts`. **Côté utilisateur, lot 1 (26
> novembre)** : la cible est proposée à la fin du questionnaire (§0, §6),
> `engine/cibleProposee.ts`. Pas encore : le profil en base et le
> réajustement (§1, §7).
>
> Chaque section sépare **ce que disent les études** (référence exacte et son
> contexte) des **choix de l'appli** (valeurs de conception validées par
> Guillaume, qui ne sortent d'aucune étude).

---

## 0. Ce que l'appli fait, et ce qu'elle ne fait pas

- Elle **propose** une cible (calories, protéines, lipides, glucides) à partir
  des réponses du questionnaire. La personne voit le détail du calcul et
  **l'accepte ou la modifie**. Rien n'est imposé.
- Toute cible est présentée comme une **estimation**, jamais comme une mesure.
- Elle **ne calcule rien** dans les cas du §6 : la cible est posée par
  Guillaume, l'écran le dit.
- Elle **réajuste** toutes les deux semaines selon le poids réel (§7),
  toujours en proposition.
- Elle ne prescrit **aucune quantité d'aliment**.
- **Familles concernées** : POWER, FEMMES, programmes importés.
  **MASS CONGESTION** garde ses six principes sans chiffres.

---

## 1. Les données d'entrée — celles du questionnaire

| Donnée | Question du questionnaire | Usage |
|---|---|---|
| Sexe, âge, taille, poids | écran « Vous » | dépense au repos, protéines, lipides, IMC |
| Travail, pas par jour | écran « Votre activité » | activité quotidienne |
| Séances par semaine, durée | écran « Votre activité » | activité sportive |
| Objectif, rythme | écran « Votre objectif » | déficit ou surplus |
| Tendance du poids sur 4 semaines | écran « Votre objectif » | contrôle de cohérence (§7) |
| Grossesse, maladie, relation à la nourriture | écran « Sécurité » | exclusions (§6) |

L'appli devra garder un **profil** en base (sexe, âge, taille, activité,
objectif) ; le poids est lu dans les pesées.

---

## 2. Dépense au repos

**Équation de Mifflin-St Jeor (1990)** :

    Homme : 10 × poids (kg) + 6,25 × taille (cm) − 5 × âge + 5
    Femme : 10 × poids (kg) + 6,25 × taille (cm) − 5 × âge − 161

---

## 3. Coefficient d'activité

**Ce que disent les études :** les niveaux d'activité physique de la
FAO/OMS donnent des ordres de grandeur (sédentaire 1,40–1,69, actif
1,70–1,99). Aucune étude ne donne une grille travail × pas × séances.

**Choix de l'appli :** deux parts additionnées.

**3a. Activité quotidienne**

| Travail \ Pas | < 5 000 | 5 000–8 000 | 8 000–12 000 | > 12 000 | Je ne sais pas |
|---|---|---|---|---|---|
| Assis | 1,25 | 1,35 | 1,45 | 1,55 | 1,30 |
| Debout | 1,35 | 1,45 | 1,55 | 1,60 | 1,40 |
| Physique | 1,45 | 1,55 | 1,65 | 1,70 | 1,50 |

**3b. Entraînement, par séance hebdomadaire**

| Durée moyenne | + par séance / semaine |
|---|---|
| < 45 min | + 0,025 |
| 45–75 min | + 0,035 |
| > 75 min | + 0,05 |

« 6 ou plus » compte pour 6. Plafond du coefficient total : **1,95**.

    Dépense totale = dépense au repos × (3a + 3b)

---

## 4. Objectif et rythme

**Ce que disent les études :**

- **Perte : environ 0,5 à 1 % du poids par semaine** (Helms 2014 —
  préparation de compétition de bodybuilders naturels ; garde-fou à adapter
  au niveau et à la tolérance).
- **Prise : environ 0,25 à 0,5 % du poids par semaine**, surplus modéré
  d'environ 10 à 20 % (Iraki 2019 — bodybuilders hors saison ; les athlètes
  avancés visent le bas de la fourchette).
- **Repère général** (NHLBI) : déficit de 500 à 1 000 kcal par jour pour
  perdre 0,5 à 1 kg par semaine.

**Choix de l'appli :**

| Objectif | Progressif | Modéré | Le plus vite possible |
|---|---|---|---|
| Perdre du poids | − 15 % | − 20 % | − 25 % |
| Maintenir | 0 | 0 | 0 |
| Prendre du poids (muscle) | + 5 % | + 10 % | + 15 % |

Les fourchettes de rythme ci-dessus servent de garde-fou au réajustement (§7).

---

## 5. Répartition des macros

### Protéines

**Ce que disent les études :** ISSN 2017, 1,4 à 2,0 g/kg/j pour la plupart
des personnes physiquement actives ; Morton 2018, point de rupture autour de
1,6 g/kg/j (pas une fourchette de prescription) ; Iraki 2019, 1,6 à
2,2 g/kg/j pour les sportifs de force et de physique.

**Choix de l'appli :**

- **1,8 g/kg/j** par défaut (maintien et prise) ;
- **2,2 g/kg/j** pour **toute** perte de poids, quel que soit le rythme
  (rétention de la masse maigre) ;
- **IMC ≥ 30** : calcul sur le **poids de référence** correspondant à un IMC
  de 25 (taille² × 25) — adaptation pratique de l'appli.

### Lipides

**Ce que disent les études :** 20 à 35 % de l'énergie totale (ACSM / Academy
of Nutrition and Dietetics / Dietitians of Canada, 2016).

**Choix de l'appli :** **25 % des calories**, jamais sous **0,6 g/kg/j**
(garde-fou de l'appli, pas une valeur de l'ACSM ; même poids de référence
que les protéines).

### Glucides

**Choix de l'appli :** le reste des calories. Si le reste passe sous
**2 g/kg/j** (même poids de référence), l'écran le signale (repère : ACSM
2016, 3 à 5 g/kg/j pour une activité légère à modérée).

### Jour d'entraînement et jour de repos

**Choix de l'appli :** **même cible les deux jours.**

### Arrondis

Calories à 50 kcal près, puis chaque macro à 5 g près (moitié vers le haut),
dans cet ordre : calories, protéines, lipides, glucides. Les arrondis peuvent
écarter le total des macros de quelques kcal de la cible : c'est attendu.

---

## 6. Sécurité

### Quand l'appli NE CALCULE PAS

L'écran affiche « Ta cible sera posée par Guillaume » si :

- grossesse, allaitement ou accouchement récent = Oui ;
- maladie ou traitement influençant l'alimentation = Oui ;
- relation compliquée avec la nourriture = Oui ou « en parler de vive voix » ;
- perte de poids demandée avec un IMC < 18,5 ;
- moins de 18 ans (déjà refusé par le questionnaire).

### Planchers caloriques

**Ce que disent les références :** pas de seuil universel. Régimes
hypocaloriques usuels : 1 200–1 500 kcal/j chez les femmes, 1 500–1 800 kcal/j
chez les hommes (MedlinePlus) ; besoins individuels. Suivi professionnel
approprié pour les apports très bas, notamment sous 800 kcal/j (l'appli
refuse déjà toute cible sous 800 kcal).

**Choix de prudence de l'appli :** ne jamais **proposer** automatiquement
moins de **1 500 kcal (homme)** ni **1 200 kcal (femme)**, ni moins que la
dépense au repos. En dessous, l'écran renvoie vers Guillaume. Garde-fous de
l'appli, présentés comme tels — pas des seuils médicaux.

---

## 7. Réajustement toutes les deux semaines

Règle opérationnelle de l'appli. Sur la moyenne des pesées de 7 jours :

| Constat sur 2 semaines | Proposition |
|---|---|
| Perte : moins de 0,5 %/sem. | − 100 kcal (sur glucides et lipides) |
| Perte : plus de 1 %/sem. | + 100 kcal |
| Prise : moins de 0,25 %/sem. | + 100 kcal |
| Prise : plus de 0,5 %/sem. | − 100 kcal |
| Maintien : écart de plus de 1 % | ± 100 kcal |
| Moins de 4 pesées sur 7 jours | aucune proposition (« pèse-toi plus souvent ») |

Les paliers de ± 100 kcal sont un choix de conception, pas une valeur des
études citées. Les protéines suivent le poids ; le reste ne bouge qu'avec
les calories. Les planchers du §6 s'appliquent aussi au réajustement.
Toujours une proposition, à accepter.

### Précisions de calcul

> **Statut : PROPOSÉ le 26 novembre 2026 — à valider par Guillaume**
> (« go lot 4 »). Ce que le tableau ci-dessus ne disait pas.

- **Quand** : 14 jours après la cible acceptée, puis 14 jours après chaque
  point (proposition acceptée, refusée ou « on ne change rien »).
- **Les deux moyennes** : semaine récente = les 7 derniers jours (aujourd'hui
  compris) ; semaine précédente = les 7 jours d'avant. Il faut **au moins 4
  pesées dans chacune**, sinon aucune proposition.
- **Le rythme** : (moyenne récente − moyenne précédente) ÷ moyenne
  précédente, en % par semaine. Entre les deux bornes de l'objectif, bornes
  comprises : on ne change rien.
- **Maintien** : poids monté de plus de 1 % → − 100 kcal ; descendu de plus
  de 1 % → + 100 kcal.
- **La nouvelle cible** : les calories actuelles ± 100, puis la répartition
  du §5 refaite sur ces calories et sur le **poids moyen de la semaine
  récente** (protéines en g/kg, lipides 25 % avec leur plancher, glucides le
  reste, mêmes arrondis). La même les deux jours.
- **Sécurité** : si la nouvelle cible passe sous un plancher du §6 (calculé
  sur le poids actuel), ou si une perte est en cours avec un IMC passé sous
  18,5, l'appli ne propose rien et renvoie vers Guillaume, sans chiffre.
- **Le profil** gardé en base (§1) : sexe, âge et date de la réponse, taille,
  travail, pas, séances, durée, objectif, rythme, date du dernier point.
  Enregistré quand la cible calculée est acceptée — jamais les réponses de
  sécurité. Sans profil (cible posée à la main ou par Guillaume) : pas de
  point.
- **Pas encore fait** : le contrôle de cohérence avec la tendance déclarée
  sur 4 semaines (§1).

---

## 8. Exemple calculé (homme, 34 ans, 180 cm, 82,5 kg)

Réponses : assis, 5 000–8 000 pas, 4 séances de 45 à 75 min, perdre du
poids à rythme modéré. IMC 25,5 : poids réel utilisé.

| Étape | Calcul | Résultat |
|---|---|---|
| Dépense au repos | 10 × 82,5 + 6,25 × 180 − 5 × 34 + 5 | 1 785 kcal |
| Coefficient | 1,35 (assis, 5–8 k pas) + 4 × 0,035 | 1,49 |
| Dépense totale | 1 785 × 1,49 | 2 660 kcal |
| Objectif (perte modérée) | 2 660 × 0,80 = 2 128 | **2 150 kcal** |
| Protéines (perte : 2,2 g/kg) | 2,2 × 82,5 = 181,5 | **180 g** (720 kcal) |
| Lipides (25 %) | 25 % × 2 150 / 9 = 59,7 (plancher 49,5) | **60 g** (540 kcal) |
| Glucides (le reste) | (2 150 − 720 − 540) / 4 = 222,5 | **225 g** (2,7 g/kg) |
| Planchers | 2 150 ≥ 1 500 et ≥ 1 785 | respectés |

Rythme attendu : 510 kcal de déficit par jour, environ 0,46 kg par semaine
(7 700 kcal ≈ 1 kg), soit **0,56 % du poids** — dans la fourchette de 0,5 à
1 % (Helms 2014).

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
