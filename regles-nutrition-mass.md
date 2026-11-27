# Règles de la nutrition MASS

> **Statut : source de vérité, CODÉE en entier le 27 novembre 2026.**
> Cinq points tranchés par Guillaume (« 1 garder, 2 : 2 g, 3 oui, 4 tous les
> programmes, 5 : la créatine est essentielle pour MASS et POWER »), marqués
> « Décidé » dans le texte.
>
> - **Lot 1** (« texte validé, go MASS lot 1 ») : le calcul, §1 à §6, §9, §12.
> - **Lots 2 à 5** (« go MASS lot 2-3-4-5 ») : collations à boire (§6),
>   remplacement à apport égal (§7), repères d'horaires (§8), carte
>   « Créatine » (§11).
>
> Le code transcrit ce fichier ; des tests relisent ses tableaux, rejouent
> ses exemples et comparent ses textes mot pour mot
> (`data/reglesNutritionMass.test.tsx`, `components/massLots2a5.test.tsx`).
> Pour changer une règle ou un mot : changer ce fichier ET le code.
>
> Comme `regles-cibles-nutrition.md`, chaque section sépare **ce que disent
> les études** des **choix de l'appli**.

---

## 0. Le principe : un regard, pas un second système

**Pourquoi un regard MASS** (Guillaume, 27 novembre) : MASS construit du
muscle avec des efforts modérés ; POWER vise la performance sur des efforts
intenses. Les besoins ne se lisent pas de la même façon.

**Ce que ça change vraiment :** peu de chiffres. Le calcul de
`regles-cibles-nutrition.md` sait déjà faire une prise de masse ; MASS en est
seulement exclu aujourd'hui (§0 de ce fichier-là : « MASS CONGESTION garde
ses six principes sans chiffres »).

**Choix proposé :** MASS reçoit **le même calcul** — dépense au repos,
activité, sécurité, réajustement, exclusions — et ce fichier ne dit que **ce
qui diffère**. Tout ce qui n'est pas écrit ici se lit dans
`regles-cibles-nutrition.md` et `regles-repas-automatiques.md`.

**Origine.** Le regard de départ est un ebook de prise de masse apporté par
Guillaume. Ses conditions interdisent de le reproduire ou de l'adapter :
**aucun de ses chiffres, de ses menus, de ses tableaux ni de ses textes
n'est repris ici**, et il n'entre pas dans le dépôt. Seules des idées
générales ont été retenues (§6, §7), avec nos propres valeurs.

**Programmes concernés :** MASS FORCE, MASS CONGESTION, et MASS HYPERTROPHIE
quand il existera.

### Les valeurs du regard MASS

| Réglage | Règles communes | MASS en prise de masse |
|---|---|---|
| Protéines | 1,8 g/kg | 2,0 g/kg |
| Alerte glucides | sous 2 g/kg | sous 3 g/kg |

| Programme MASS | Repas par défaut en prise de masse |
|---|---|
| MASS HYPERTROPHIE | 5 |
| MASS FORCE | 5 |
| MASS CONGESTION | 4 |

Hors prise de masse, et hors MASS : 4 repas par défaut, comme partout.

---

## 1. Quand les réglages MASS s'appliquent

**Choix proposé :** quand la personne suit un programme MASS **et** répond
« Prendre du poids (muscle) » au questionnaire. Si elle répond « Perdre » ou
« Maintenir », ce sont les règles communes qui s'appliquent, sans rien de
propre à MASS.

L'appli ne devine pas l'objectif à la place de la personne : le questionnaire
(copie du site) pose déjà la question.

**Le regard suit la cible.** Il est noté dans le profil gardé quand la cible
calculée est acceptée : le point des deux semaines refait alors la
répartition avec les mêmes règles (protéines à 2,0 g/kg). Une cible acceptée
sous un autre programme, ou posée à la main, garde les règles communes tant
que la personne ne refait pas calculer sa cible sous MASS.

**Jamais le plan historique.** Sous MASS, ni les menus ni les chiffres du
plan personnel de Guillaume ne s'affichent, quel que soit le réglage.

**Décidé (Guillaume, 27 novembre : « garder »).** MASS CONGESTION garde ses
six principes en tête d'écran ; le calcul s'ajoute dessous.

---

## 2. Surplus calorique

**Ce que disent les études :** surplus d'environ 10 à 20 % au-dessus du
maintien, pour une prise d'environ 0,25 à 0,5 % du poids par semaine chez les
débutants et intermédiaires ; les pratiquants avancés doivent viser plus bas
(Iraki 2019).

**Choix proposé :** **rien ne change.** Le tableau commun reste : + 5 %
(progressif), + 10 % (modéré), + 15 % (le plus vite possible).

Pour mémoire, les journées types de l'ebook correspondent, pour un homme de
80 à 90 kg, à un surplus plus fort que notre rythme « le plus vite
possible ». Ce n'est pas repris : une prise plus rapide expose à prendre du
gras en trop (Iraki 2019).

---

## 3. Protéines

**Ce que disent les études :**

- 1,6 à 2,2 g/kg/j pour les sportifs de force et de physique hors saison
  (Iraki 2019) ;
- au minimum 1,6 g/kg/j ; viser près de 2,2 g/kg peut assurer une réponse
  optimisée chez une plus grande part des athlètes (Iraki 2019, d'après
  Morton 2018 : 2,2 est la borne haute de l'intervalle de confiance) ;
- des apports très supérieurs (4,4 puis 3,4 g/kg/j) ont donné autant de
  masse maigre, pas plus : sans gras supplémentaire malgré plus de calories
  dans un essai, avec une plus grande perte de gras dans le suivant (Antonio
  2014 et 2015, cités par Iraki 2019).

**Choix de l'appli (Guillaume, 27 novembre : « 2 g »)** : **2,0 g/kg/j** en
prise de masse sous MASS, contre 1,8 dans les règles communes. Même poids de
référence au-delà d'un IMC de 30. C'est un choix à l'intérieur de la
fourchette des études, pas une valeur d'étude.

Coût, pour 80 kg : 16 g de protéines en plus par jour, 16 g de glucides en
moins.

---

## 4. Lipides

**Ce que disent les études :** 0,5 à 1,5 g/kg/j (Iraki 2019).

**Choix proposé :** **rien ne change** — 25 % des calories, jamais sous
0,6 g/kg/j. Pour 80 kg à 3 000 kcal : 85 g, soit 1,06 g/kg, dans la
fourchette.

---

## 5. Glucides

**Ce que disent les études :** le reste des calories, en visant si possible
3 à 5 g/kg/j ou plus (Iraki 2019). Les quantités optimales ne sont pas
établies pour la musculation ; les régimes très pauvres en glucides peuvent
nuire à l'entraînement.

**Choix proposé :** le reste des calories, comme dans les règles communes.
Seul le **seuil d'alerte** change : l'écran le signale sous **3 g/kg/j** en
prise de masse MASS, contre 2 g/kg/j ailleurs.

---

## 6. Nombre de repas et collation à boire

**Ce que disent les études :** répartir les protéines sur 3 à 6 repas, à
raison de 0,40 à 0,55 g/kg par repas, dont un dans l'heure ou les deux
heures avant et après la séance (Iraki 2019) ; 0,4 g/kg par repas sur au
moins quatre repas pour atteindre 1,6 g/kg/j, 0,55 g/kg par repas pour
2,2 g/kg/j (Schoenfeld et Aragon 2018).

**Choix proposés :**

- **5 repas par jour par défaut** quand la semaine est composée pour la
  première fois sous MASS FORCE ou MASS HYPERTROPHIE en prise de masse (4
  ailleurs). La personne garde le choix 4 · 5 · 6
  (`regles-repas-automatiques.md`, §1), et un nombre que la cible ne tient
  pas n'est jamais composé.
- **MASS CONGESTION reste à 4 par défaut** : le premier de ses six principes
  écrit « 4 prises par jour ». **Décidé** (Guillaume, 27 novembre : « 4
  repas, conseillé 5 pour une meilleure répartition des macros mais 4 est
  possible »).
- **Le conseil des 5 repas.** Sous MASS en prise de masse, tant que la
  semaine compte moins de **5 repas** conseillés et que la cible en tient 5
  (`regles-repas-automatiques.md`, §1), l'écran le dit au-dessus de
  « + Ajouter un repas », mot pour mot :

  > 5 repas par jour sont conseillés pour mieux répartir tes protéines, tes
  > glucides et tes lipides. 4 restent possibles.

  Un conseil, jamais une contrainte : rien ne se recompose tout seul.
  Pourquoi 5 répartit mieux, avec 2,0 g/kg : à 4 repas les repas principaux
  portent 0,50 à 0,60 g/kg de protéines (au-dessus du repère de 0,55) ; à 5,
  ils en portent 0,40 à 0,50.
- **Des collations à boire** dans la bibliothèque : flocons d'avoine mixés,
  une source de protéines, un fruit, un peu de gras. Elles servent aux
  grosses cibles, où manger toutes ses calories devient difficile. Idée
  retenue de l'ebook ; recettes et quantités sont les nôtres, ajustées par le
  moteur comme n'importe quel repas.

Limite connue : avec 2,0 g/kg répartis sur 5 repas (parts 20 / 15 / 25 / 15
/ 25 %), les deux collations portent 0,30 g/kg chacune, sous le repère de
0,40. Les trois repas principaux sont entre 0,40 et 0,50.

**Décidé (Guillaume, 27 novembre : « oui »).** Deux collations à boire avec
whey (protéine en poudre, déjà au catalogue) et deux sans (lait ou skyr à
la place), proposées à **tous** les programmes — la bibliothèque est
commune. La whey rejoint l'exclusion « Produits laitiers ».

### Les quatre collations à boire (codées le 27 novembre)

| Collation à boire | Assiette de référence |
|---|---|
| Flocons d'avoine, whey, banane | avoine 60 g, whey 30 g, banane 1 |
| Flocons d'avoine, whey, lait, beurre de cacahuète | avoine 50 g, whey 30 g, lait 250 ml, beurre de cacahuète 15 g |
| Skyr, lait, flocons d'avoine, fruits rouges | skyr 200 g, lait 200 ml, avoine 50 g, fruits rouges 100 g |
| Lait, banane, flocons d'avoine, amandes | lait 300 ml, banane 1, avoine 50 g, amandes 20 g |

- Proposées aux **collations seulement** (matin, après-midi, soir) : ni au
  petit-déjeuner, ni en plat.
- Recettes et quantités sont celles de l'appli (choix de conception, à
  corriger par Guillaume s'il le souhaite) ; le moteur les ajuste à la part
  du repas comme n'importe quel plat.
- Les quatre contiennent du lait et de l'avoine : elles sont écartées pour
  qui ne mange ni laitiers ni gluten. Une collation à boire végétale attend
  la grille de la bibliothèque (boisson au soja).
- **Photos à venir** (générées par Guillaume) : en attendant, l'écran montre
  une vignette neutre « Photo à venir », jamais un cadre cassé.
- Liste de courses : la whey est rangée à l'épicerie (`regles-courses.md`).

---

## 7. Remplacer un aliment à apport égal

**Choix proposé** (idée retenue de l'ebook, calculée sur notre catalogue) :
quand la personne remplace un aliment par un autre du même groupe, l'appli
**propose** la quantité qui garde le même apport :

| Groupe de l'aliment remplacé | Ce que la nouvelle quantité conserve |
|---|---|
| Protéines | les protéines |
| Glucides (féculents) | les glucides |
| Lipides | les lipides |
| Fruits et légumes | la quantité, inchangée |

Exemple, avec les valeurs de notre catalogue : 150 g de poulet cuit
(46,5 g de protéines) → 210 g de poisson blanc cuit.

La quantité est arrondie comme le reste (5 g ; une pièce reste entière) et
reste modifiable. L'écran dit d'où elle vient, sous la ligne : « Quantité
proposée : 210 g, pour les mêmes protéines que 150 g de Poulet cuit. Tu peux
la changer. »

Précisions (codées le 27 novembre) :

- **Dans les deux modes** : la semaine de repas et « Mon plan ». Dans « Mon
  plan », ce n'est pas une quantité inventée : c'est la quantité que la
  personne avait posée, convertie.
- **Rien à convertir** (le comportement d'avant : même quantité si l'unité
  est la même, sinon « à poser ») quand les deux aliments ne sont pas du
  même groupe, quand la quantité n'était pas posée, quand le nouvel aliment
  est déjà dans le repas (sa ligne garde sa quantité), ou quand l'un des
  deux ne contient pas la macro du groupe.

**Décidé (Guillaume, 27 novembre) : pour tous les programmes.** Le geste
« Remplacer » est le même partout.

---

## 8. Repères d'horaires

**Ce que disent les études :** répartir les protéines régulièrement dans la
journée, dont un repas dans l'heure ou les deux heures avant et après la
séance (Iraki 2019).

**Choix de l'appli (codé le 27 novembre) :** deux phrases de conseil en bas
de l'écran Nutrition de MASS, quel que soit l'objectif — jamais une
contrainte ni un rappel :

- « Répartis tes repas dans la journée plutôt que de tout regrouper. »
- « Place un repas avec des protéines dans les deux heures avant ou après ta
  séance. »

Les autres repères de l'ebook (écart fixe entre deux repas, délai avant le
coucher) ne sont pas repris : je n'ai pas de source à mettre en face.

---

## 9. Ce qui ne change pas

- **Jour d'entraînement et jour de repos :** même cible les deux jours.
- **Réajustement toutes les deux semaines :** + 100 kcal sous 0,25 % de prise
  par semaine, − 100 kcal au-dessus de 0,5 %, sur la moyenne des pesées.
- **Sécurité :** mêmes cas où l'appli ne calcule pas, mêmes planchers.
- **Exclusions (« Je ne mange pas ») :** inchangées.

---

## 10. Ce qui n'est pas repris

- **Des paliers fixes selon le poids seul.** Notre calcul tient compte du
  sexe, de l'âge, de la taille et de l'activité.
- **Le passage au palier supérieur** faute de résultat. Notre réajustement
  avance par 100 kcal, sur une mesure.
- **Une journée unique répétée.** La semaine de repas en compose sept.
- **Les compléments alimentaires de marque, et leur liste.** Seule la
  créatine a sa place dans l'appli (§11), sans marque.

---

## 11. Créatine — MASS et POWER

> **Texte VALIDÉ par Guillaume le 27 novembre 2026** (« texte validé ») et
> CODÉ le même jour (lot 5). Sa décision : « pour MASS et POWER, la créatine
> est essentielle. C'est LE complément alimentaire. »

**Ce que disent les études et les textes :**

- la créatine monohydrate est le complément le plus efficace disponible
  pour la capacité d'effort à haute intensité et la masse maigre pendant
  l'entraînement (ISSN, Kreider 2017) ;
- **3 à 5 g par jour** remplissent les réserves du muscle en 3 à 4 semaines ;
  une phase de charge (environ 0,3 g/kg/j pendant 5 à 7 jours) va plus vite
  mais n'est pas nécessaire (ISSN 2017) ; 3 à 5 g/j pour la musculation hors
  saison (Iraki 2019) ;
- seul effet indésirable rapporté de façon constante : une prise de poids ;
  aucune preuve solide d'un effet néfaste sur les reins chez des personnes
  en bonne santé — certains conseillent, par prudence, un avis médical en cas
  de maladie rénale (ISSN 2017) ;
- **en Europe**, l'allégation de santé autorisée (« la créatine améliore les
  capacités physiques lors de séries successives d'exercices de courte durée
  et de haute intensité ») vaut pour **3 g par jour** (registre de l'UE,
  règlement 432/2012) : c'est la dose que portent la plupart des étiquettes ;
- la norme **NF EN 17444** (2021, qui remplace la NF V94-001) encadre la
  fabrication des compléments pour sportifs afin d'éviter les substances
  dopantes.

« Essentielle » est le mot de Guillaume. Les études disent « la plus
efficace », pas « indispensable » : l'écran dit les deux.

**Choix proposés :**

- **Où** : une carte repliée « Créatine » en bas de l'écran Nutrition, sous
  POWER et sous MASS. Rien sous LADIES ni ME, MYSELF & I tant que Guillaume
  ne le demande pas. Repliée, elle ne montre que son titre : la dose ne
  s'affiche jamais sans la phrase de prudence.
- **Aucune marque, aucun lien, aucun code promo.** L'appli donne des
  critères de choix, pas un produit (voir « Pourquoi aucune marque »).
- **Le texte**, mot pour mot :

  > **Créatine**
  >
  > La créatine monohydrate est le complément le mieux étudié pour les
  > efforts courts et intenses et pour la prise de muscle. Elle aide ; elle
  > ne remplace ni l'entraînement ni l'assiette.
  >
  > **3 à 5 g par jour, tous les jours**, au moment qui t'arrange. Pas
  > besoin de phase de charge : l'effet s'installe en 3 à 4 semaines.
  >
  > Choisis une créatine **monohydrate**, sans mélange. Un produit conforme
  > à la norme antidopage NF EN 17444 limite le risque de substances
  > interdites. MAJK ne recommande aucune marque.
  >
  > Demande l'avis de ton médecin avant d'en prendre si tu as une maladie
  > des reins, un traitement en cours, ou si tu es enceinte ou allaitante.

- **La phrase de prudence est montrée à tout le monde**, avec le reste du
  texte : l'appli ne garde pas les réponses de sécurité du questionnaire,
  elle ne peut donc pas savoir à qui la réserver.
- Sous MASS CONGESTION, la phrase « Compléments : aucun avis ici » de la
  carte des principes est retirée : elle contredirait cette carte.
- Le plan historique de Guillaume garde sa propre note (« 5 g par jour ») :
  c'est son plan personnel, il n'est pas touché.

**Pourquoi aucune marque** (ma recommandation) :

1. **L'indépendance.** Dès qu'une appli nomme une marque, tous ses conseils
   de nutrition deviennent suspects. C'est la faiblesse de l'ebook de
   départ : neuf produits d'une même marque et un code promo.
2. **La responsabilité.** L'appli ne contrôle ni les lots, ni la formule, ni
   la qualité d'un produit ; une marque peut changer sa recette sans prévenir.
3. **Le cadre légal.** Un lien commercial (commission, partenariat) doit
   être annoncé clairement comme de la publicité. À faire vérifier par un
   juriste le jour où la question se pose.

Si Guillaume veut un jour un partenariat, ce sera une décision d'affaires à
part : un encart séparé, annoncé comme tel, jamais mêlé aux conseils.

---

## 12. Exemple calculé (homme, 30 ans, 180 cm, 80 kg)

Réponses : assis, 5 000–8 000 pas, 5 séances de 45 à 75 min, prendre du
poids à rythme modéré, programme MASS.

| Étape | Calcul | Résultat |
|---|---|---|
| Dépense au repos | 10 × 80 + 6,25 × 180 − 5 × 30 + 5 | 1 780 kcal |
| Coefficient | 1,35 (assis, 5–8 k pas) + 5 × 0,035 | 1,525 |
| Dépense totale | 1 780 × 1,525 | 2 715 kcal |
| Objectif (prise modérée) | 2 715 × 1,10 = 2 986 | **3 000 kcal** |
| Protéines (MASS : 2,0 g/kg) | 2,0 × 80 | **160 g** (640 kcal) |
| Lipides (25 %) | 25 % × 3 000 / 9 = 83,3 (plancher 48) | **85 g** (765 kcal) |
| Glucides (le reste) | (3 000 − 640 − 765) / 4 = 398,8 | **400 g** (5,0 g/kg) |

La même personne sous POWER : 3 000 kcal, 145 g de protéines, 85 g de
lipides, 415 g de glucides.

Rythme attendu : 285 kcal de surplus par jour, environ 0,26 kg par semaine
(7 700 kcal ≈ 1 kg), soit **0,32 % du poids** — dans la fourchette de 0,25 à
0,5 % (Iraki 2019).

---

## 13. Lots de code — tous FAITS le 27 novembre 2026

1. **Ouvrir le calcul à MASS** : protéines à 2,0 g/kg en prise, alerte
   glucides à 3 g/kg, repas par défaut et conseil des 5 repas, écran
   Nutrition MASS (les six principes de CONGESTION gardés en tête, repliés
   une fois la cible posée).
2. **Collations à boire** : quatre dans la bibliothèque, pour tous les
   programmes. Reste à faire : leurs quatre photos.
3. **Remplacer à apport égal**, pour tous les programmes, dans les deux
   modes.
4. **Repères d'horaires**, en bas de l'écran Nutrition de MASS.
5. **Carte « Créatine »** sous POWER et MASS.

Pas fait : le calcul du coach (`#/admin`) reste aux règles communes.

---

## Références

- Iraki J, Fitschen P, Espinar S, Helms E. *Nutrition Recommendations for
  Bodybuilders in the Off-Season: A Narrative Review.* Sports, 2019 —
  surplus de 10 à 20 %, prise de 0,25 à 0,5 %/sem. ; protéines 1,6 à
  2,2 g/kg/j, 0,40 à 0,55 g/kg par repas sur 3 à 6 repas ; lipides 0,5 à
  1,5 g/kg/j ; glucides ≥ 3 à 5 g/kg/j ; créatine 3 à 5 g/j.
- Schoenfeld BJ, Aragon AA. *How much protein can the body use in a single
  meal for muscle-building? Implications for daily protein distribution.*
  JISSN, 2018 — 0,4 g/kg par repas sur au moins quatre repas ; au plus
  0,55 g/kg par repas.
- Morton RW et al. *Br J Sports Med*, 2018 — point de rupture autour de
  1,6 g/kg/j, borne haute de l'intervalle de confiance à 2,2.
- Antonio J et al. *J Int Soc Sports Nutr*, 2014 et 2015 — apports de 4,4 et
  3,4 g/kg/j chez des pratiquants entraînés (cités par Iraki 2019).
- Kreider RB et al. *International Society of Sports Nutrition position
  stand: safety and efficacy of creatine supplementation in exercise, sport,
  and medicine.* JISSN, 2017 — créatine monohydrate, 3 à 5 g/j, sécurité.
- Commission européenne, registre des allégations de santé (règlement (UE)
  n° 432/2012) — créatine : effet obtenu avec 3 g par jour.
- AFNOR, norme NF EN 17444 (2021) — prévention du dopage, bonnes pratiques
  de fabrication des denrées et compléments pour sportifs.
