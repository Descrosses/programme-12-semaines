# Règles de calcul des cibles nutritionnelles — BROUILLON

> **Statut : brouillon du 23 novembre, rien n'est codé.** Rédigé par Claude à
> partir des références publiées citées en fin de document. Chaque valeur
> marquée **[À VALIDER]** est un choix de coach que Guillaume confirme,
> corrige ou remplace. Une fois validé, ce fichier devient la source de
> vérité, comme `programme-final-12-semaines.md` : le code le transcrit, des
> tests le relisent.

---

## 0. Ce que l'appli fera, et ce qu'elle ne fera pas

- Elle **propose** une cible (calories, puis protéines, lipides, glucides) à
  partir des réponses du questionnaire. La personne la voit, avec le détail
  du calcul, et **l'accepte ou la modifie**. Rien n'est imposé.
- Elle **ne calcule rien** dans les cas du §6 (sécurité) : la cible reste à
  poser par Guillaume, l'écran le dit.
- Elle **réajuste** la cible toutes les deux semaines selon l'évolution
  réelle du poids (§7), toujours en proposition.
- Elle ne prescrit **aucune quantité d'aliment** : la règle actuelle reste
  (« MAJK additionne et affiche l'écart »).

---

## 1. Les données d'entrée — déjà dans le questionnaire

| Donnée | Question du questionnaire | Usage |
|---|---|---|
| Sexe | « Sexe » | formule de dépense au repos |
| Âge | « Âge » (18 ans et plus) | formule |
| Taille | « Taille » | formule, IMC |
| Poids | « Poids » (moyenne de 3 matins) | formule, protéines, lipides |
| Travail | « Votre travail » | activité quotidienne |
| Pas | « Pas par jour en moyenne » | activité quotidienne |
| Séances | « Séances de sport par semaine » + « Durée moyenne » | activité sportive |
| Objectif | « Votre objectif » + « À quel rythme ? » | déficit ou surplus |
| Tendance | « Votre poids des 4 dernières semaines » (+ poids il y a 4 semaines) | contrôle de cohérence (§7) |
| Sécurité | grossesse, maladie / traitement, relation à la nourriture | exclusions (§6) |

**Manque côté appli (technique, pas une décision) :** aujourd'hui ces
réponses restent dans le questionnaire, sur le téléphone. Pour calculer puis
réajuster, l'appli devra garder un **profil** (sexe, date de naissance ou âge,
taille, activité, objectif) en base, avec le poids lu dans les pesées.

---

## 2. Dépense au repos — formule de Mifflin-St Jeor

    Homme : 10 × poids (kg) + 6,25 × taille (cm) − 5 × âge + 5
    Femme : 10 × poids (kg) + 6,25 × taille (cm) − 5 × âge − 161

Choisie parce qu'elle est la plus juste des équations simples chez l'adulte
en population générale (Frankenfield 2005). **[À VALIDER]**

---

## 3. Coefficient d'activité

Deux parts, additionnées.

### 3a. Activité quotidienne (travail + pas) **[À VALIDER — grille proposée]**

| Travail \ Pas | < 5 000 | 5 000–8 000 | 8 000–12 000 | > 12 000 | Je ne sais pas |
|---|---|---|---|---|---|
| Assis | 1,25 | 1,35 | 1,45 | 1,55 | 1,30 |
| Debout | 1,35 | 1,45 | 1,55 | 1,60 | 1,40 |
| Physique | 1,45 | 1,55 | 1,65 | 1,70 | 1,50 |

### 3b. Entraînement : + par séance hebdomadaire **[À VALIDER]**

| Durée moyenne | + par séance / semaine |
|---|---|
| < 45 min | + 0,025 |
| 45–75 min | + 0,035 |
| > 75 min | + 0,05 |

« 6 ou plus » compte pour 6. Plafond du coefficient total : **1,95**.

Ordres de grandeur cohérents avec les niveaux d'activité physique de la
FAO/OMS (sédentaire 1,40–1,69, actif 1,70–1,99) ; la grille elle-même est
une proposition, aucune étude ne donne ce tableau case par case.

    Dépense totale = dépense au repos × (3a + 3b)

---

## 4. Ajustement selon l'objectif et le rythme **[À VALIDER]**

| Objectif | Progressif | Modéré | Le plus vite possible |
|---|---|---|---|
| Perdre du poids | − 10 % | − 15 % | − 20 % |
| Maintenir | 0 | 0 | 0 |
| Prendre du poids (muscle) | + 5 % | + 10 % | + 15 % |

Garde-fous de rythme (vérifiés au réajustement, §7) :

- perte : **0,5 à 1 % du poids par semaine** au plus (Helms 2014) ;
- prise : **0,25 à 0,5 % du poids par semaine** au plus (Iraki 2019) — au-delà,
  le surplus part surtout en gras.

---

## 5. Répartition des macros **[À VALIDER — chaque ligne]**

1. **Protéines** : **2,0 g/kg** de poids (fourchette des études : 1,6 à
   2,2 ; Morton 2018, ISSN 2017). En perte rapide : **2,2 g/kg** (Helms 2014
   recommande plus haut en déficit).
   *Personne en forte surcharge (IMC ≥ 30) :* calcul sur le poids
   correspondant à un IMC de 25, pas sur le poids réel. **[À VALIDER]**
2. **Lipides** : **25 % des calories**, jamais sous **0,6 g/kg**
   (ACSM 2016 : 20 à 35 % des calories).
3. **Glucides** : le reste. Contrôle : si le reste passe sous **2 g/kg**,
   l'écran le signale (ACSM 2016 : 3 à 5 g/kg pour une activité modérée).

### Jour d'entraînement et jour de repos **[À VALIDER — 1 choix]**

- **Option A (proposée)** : même cible les deux jours. Le plus simple, et les
  études ne montrent pas d'avantage clair à faire varier.
- **Option B** : jour de repos = jour d'entraînement − 10 %, pris sur les
  glucides ; protéines et lipides inchangés.

### Arrondis

Calories à 50 kcal près, macros à 5 g près.

---

## 6. Sécurité : quand l'appli NE CALCULE PAS **[À VALIDER]**

L'écran affiche « Ta cible sera posée par Guillaume » et rien d'autre si :

- grossesse, allaitement ou accouchement récent = Oui ;
- maladie ou traitement influençant l'alimentation = Oui ;
- relation compliquée avec la nourriture = Oui ou « en parler de vive voix » ;
- perte de poids demandée avec un IMC < 18,5 ;
- moins de 18 ans (déjà refusé par le questionnaire).

Planchers, même hors exclusion : jamais sous **1 500 kcal (homme)** ni
**1 200 kcal (femme)** (repères NIH/NHLBI), ni sous la dépense au repos.

---

## 7. Réajustement toutes les deux semaines **[À VALIDER]**

Sur la moyenne des pesées de 7 jours (déjà calculée par l'écran Progrès) :

| Constat sur 2 semaines | Proposition |
|---|---|
| Perte : moins de 0,5 %/sem. | − 100 kcal (sur glucides et lipides) |
| Perte : plus de 1 %/sem. | + 100 kcal |
| Prise : moins de 0,25 %/sem. | + 100 kcal |
| Prise : plus de 0,5 %/sem. | − 100 kcal |
| Maintien : écart de plus de 1 % | ± 100 kcal |
| Moins de 4 pesées sur 7 jours | aucune proposition (« pèse-toi plus souvent ») |

Les protéines suivent le poids, les autres ne bougent qu'avec les calories.
Toujours une **proposition**, à accepter.

---

## 8. Exemple calculé (homme, 34 ans, 180 cm, 82,5 kg)

Réponses : assis, 5 000–8 000 pas, 4 séances de 45 à 75 min, perdre du
poids à rythme modéré.

| Étape | Calcul | Résultat |
|---|---|---|
| Dépense au repos | 10 × 82,5 + 6,25 × 180 − 5 × 34 + 5 | 1 785 kcal |
| Coefficient | 1,35 (assis, 5–8 k pas) + 4 × 0,035 | 1,49 |
| Dépense totale | 1 785 × 1,49 | 2 660 kcal |
| Objectif (perte modérée) | 2 660 × 0,85 | 2 261 → **2 250 kcal** |
| Protéines | 2,0 × 82,5 | 165 g → **165 g** (660 kcal) |
| Lipides | 25 % × 2 250 / 9 | 62,5 g → **60 g** (540 kcal) |
| Glucides | (2 250 − 660 − 540) / 4 | 262,5 g → **265 g** (3,2 g/kg) |

Rythme attendu : environ 410 kcal de déficit par jour, soit environ
0,37 kg par semaine (7 700 kcal ≈ 1 kg), c'est-à-dire **0,45 % du poids** —
juste **sous** la fourchette de 0,5 à 1 % du §4. Deux lectures possibles :
« modéré » à − 15 % est un peu lent pour ce profil (passer à − 20 % ?), ou
c'est voulu et le réajustement du §7 corrigera après deux semaines de pesées.
**[À VALIDER]**

---

## 9. Les décisions de Guillaume, en une liste

1. Formule de Mifflin-St Jeor : oui / non.
2. Grille d'activité du §3 : valider ou corriger les chiffres.
3. Pourcentages du §4 (perte / prise selon le rythme).
4. Protéines : 2,0 g/kg (2,2 en perte rapide) ; règle IMC ≥ 30.
5. Lipides 25 %, plancher 0,6 g/kg ; glucides en complément.
6. Jour de repos : option A (même cible) ou B (− 10 % sur les glucides).
7. Exclusions et planchers du §6.
8. Réajustement du §7 (rythme, pas de 100 kcal, 2 semaines).
9. Familles concernées : POWER, FEMMES, programmes importés ; **MASS
   CONGESTION garde ses principes sans chiffres** — à confirmer.

---

## Références

- Mifflin MD, St Jeor ST et al. *A new predictive equation for resting energy
  expenditure in healthy individuals.* Am J Clin Nutr, 1990.
- Frankenfield D et al. *Comparison of predictive equations for resting
  metabolic rate in healthy nonobese and obese adults.* J Am Diet Assoc, 2005.
- FAO/OMS/UNU. *Human energy requirements*, 2004 (niveaux d'activité physique).
- Jäger R et al. *ISSN Position Stand: protein and exercise*, JISSN, 2017.
- Morton RW et al. *A systematic review, meta-analysis and meta-regression of
  the effect of protein supplementation on resistance training-induced gains.*
  Br J Sports Med, 2018.
- Helms ER, Aragon AA, Fitschen PJ. *Evidence-based recommendations for
  natural bodybuilding contest preparation: nutrition and supplementation.*
  JISSN, 2014.
- Iraki J et al. *Nutrition recommendations for bodybuilders in the
  off-season.* Sports, 2019.
- Thomas DT, Erdman KA, Burke LM. *ACSM / Academy of Nutrition and Dietetics /
  Dietitians of Canada joint position: nutrition and athletic performance.*
  2016.
- NIH / NHLBI. Repères de planchers caloriques pour les régimes hypocaloriques
  sans suivi médical.
