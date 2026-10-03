# Modèle de référence — format d'un programme de 12 semaines

**Ce document décrit un FORMAT, pas une méthode d'entraînement.**

Il est extrait d'un programme réel conçu pour un profil **avancé, préparation
athlétique** (force + puissance, cinq séances par semaine, plusieurs années de
pratique). Les règles qui en viennent sont marquées comme telles. Reprendre la
structure est sûr ; reprendre les seuils, les pourcentages et les volumes sans
les adapter ne l'est pas.

Toutes les valeurs personnelles — charges, performances, poids, dates — sont
remplacées par des variables `{{nom}}`. Le tableau des variables est en
section 11.

**Légende** :
🔵 **général** — transposable à n'importe quel programme écrit dans ce format.
🔶 **propre au profil** — dépend du niveau, de la disponibilité ou des objectifs
de l'athlète d'origine ; à recalculer pour quelqu'un d'autre.

---

## 1. Structure globale

🔵 Le programme se lit comme **un seul fichier Markdown numéroté de 1 à 13**,
qui est la source de vérité. Tout le reste — application, tests, écrans — n'en
est qu'une transcription. C'est la pièce centrale du format : une valeur qui
n'est pas dans le `.md` n'existe pas.

### 1.1 Découpage en blocs

🔶 Le découpage ci-dessous est un modèle classique de périodisation par blocs,
mais ses pourcentages supposent des 1RM connus et un athlète capable de tenir
des séries à RPE 8-9.

| Semaines | Bloc | Intensité lifts principaux | Volume | Objectif |
|---|---|---|---|---|
| 1-3 | Accumulation | 71-79 % | Élevé | Base de force, technique, apprentissage des sauts |
| 4 | Deload | 65 % | −50 % | Dissipation de fatigue |
| 5-7 | Force maximale | 82-90 % | Moyen | Force absolue, longs repos |
| 8 | Deload + combine intermédiaire | 70 % | −50 % | Récupération + tests athlétiques (sans 1RM) |
| 9-11 | Conversion force → puissance | 84-89 % + vitesse 55-60 % | Bas | Contraste, RFD, fraîcheur |
| 12 | Taper + combine final | Léger | Minimal | Tests |

🔵 **Le rôle de chaque semaine est écrit, pas déduit.** Chacune appartient à un
bloc nommé, et le bloc décide des modifications appliquées à la semaine type.

### 1.2 Une semaine 0

🔵 Le programme compte en réalité **13 semaines** : une semaine 0 de tests
précède la semaine 1. Elle n'est pas numérotée « semaine 1 » parce qu'elle
n'entraîne pas — elle mesure. Dans l'application, elle occupe l'index 0 du
calendrier.

### 1.3 Le diagnostic en ouverture

🔵 Le programme s'ouvre sur une section « Diagnostic et priorités » qui dit,
en quelques lignes :
- ce qui est déjà fort et qu'on se contente d'entretenir ;
- ce qui est en retard, et **pourquoi c'est la priorité n°1** ;
- ce qui n'a jamais été entraîné ;
- le ratio hebdomadaire retenu, avec sa justification pratique (métier,
  famille, récupération).

🔶 Dans le programme d'origine, l'anomalie identifiée est un deadlift
(`{{deadlift_1rm_initial}}`) inférieur au squat (`{{squat_1rm_initial}}`), d'où
une priorité chaîne postérieure. Le diagnostic d'un autre athlète donnera une
autre priorité — c'est la **présence** du diagnostic qui est le format, pas son
contenu.

---

## 2. La semaine de tests (semaine 0)

🔵 Les charges du programme ne sont pas inventées : elles sont **calculées à
partir de maxima mesurés** pendant une semaine de tests préalable. C'est ce qui
rend le reste du document falsifiable.

### 2.1 Ce qui est mesuré

| Catégorie | Tests |
|---|---|
| Force maximale | 1RM squat, 1RM développé couché, 1RM soulevé de terre, 1RM tractions lestées |
| Puissance | Broad jump (3 essais), vertical jump (5 essais) |
| Vitesse | Sprint 10 m et 20 m (3-4 essais) |
| Endurance de force | Tractions strictes max, ab wheel max, hanging leg raise max |
| Portés | Farmer carry à charge fixe, distance max |
| Anthropométrie | Poids (moyenne de 3 matins, à jeun), tour de taille |

### 2.2 Protocole

🔵 **Mêmes conditions à chaque combine** : même lieu, mêmes chaussures, même
protocole, idéalement même heure. Le programme écrit explicitement que la
comparabilité prime sur la perfection du protocole — un test imparfait mais
identique aux trois combines reste exploitable.

🔵 **Une règle de répartition explicite**, avec sa raison. Ici : *jamais deux
efforts de tirage ou de préhension à moins de 48 h*. Elle produit la
répartition sur six jours :

```
lundi      sauts, sprints, 1RM squat
mardi      1RM tractions lestées, seul
mercredi   repos
jeudi      1RM soulevé de terre, seul      ← 48 h après les tractions
vendredi   1RM développé couché, ab wheel max
samedi     tractions strictes max, leg raise max, farmer carry
dimanche   repos complet
lundi      début de la semaine 1, à froid
```

🔵 **Le test le plus structurant est le mieux protégé.** Ici le soulevé de terre
a un jour de repos complet la veille, parce que son 1RM alimente tout le tableau
de charges : le tester bas fausserait douze semaines.

🔵 **Le poids de corps ne se mesure pas en séance** : c'est une moyenne de
plusieurs matins, relevée à la maison et saisie à part.

### 2.3 Paliers de montée en charge

🔵 Chaque test de 1RM a des **paliers écrits en kilos**, pas en pourcentages à
calculer sur place :

```
Échauffement : ~43 % × 5 → ~57 % × 3 → ~71 % × 2 → ~82 % × 1 → ~93 % × 1
Essais       : ~102 % → ~105 % si le précédent monte vite
```

🔵 Deux jeux de paliers coexistent : ceux du **test initial**, calculés sur des
maxima estimés, et ceux du **test final**, recalculés sur les maxima réellement
mesurés. Réutiliser les premiers en semaine 12 ferait monter l'échauffement
au-dessus du maximum réel.

🔵 Les essais du test final vont **du record personnel à la cible de fin de
programme**, de sorte que le protocole permette d'atteindre l'objectif annoncé.

### 2.4 Comment les résultats règlent les charges

🔵 C'est le point le plus important du format, et celui que le programme
d'origine a dû corriger en cours de route :

> **Les charges du tableau semaine par semaine sont des kilos écrits, pas un
> pourcentage recalculé à l'affichage.** Les maxima mesurés servent à
> **recalculer le tableau une fois**, à la main, et la seule chose qui modifie
> ensuite une charge est la règle de progression (section 5).

🔶 Dans le programme d'origine, la première version indexait les charges sur le
1RM saisi dans les réglages. Résultat : six semaines sur douze demandaient plus
de 100 % du maximum réel au squat, dont une série de travail au 1RM exact. La
correction a consisté à figer les kilos et à ajouter un test automatisé qui
échoue si un réglage modifie une charge planifiée.

🔵 Méthode de recalcul employée, applicable telle quelle : **conserver le
pourcentage** que le programme visait, et l'appliquer au maximum mesuré, arrondi
au pas de disque le plus proche (2,5 kg). Jamais mettre à l'échelle les anciens
kilos.

---

## 3. Semaine type

🔶 Cinq séances, deux jours de repos. Ce volume suppose un athlète avancé qui
récupère bien ; c'est aussi le plafond que le programme s'impose explicitement
(« cinq séances RPE 8-9 avec un métier et deux enfants = plafond garanti en
semaine 5 »).

| Jour | Séance | Durée | Charge |
|---|---|---|---|
| Lundi | Lower Strength — squat | 65-70 min | DUR |
| Mardi | repos | — | — |
| Mercredi | Upper Strength — développé + tractions | 65 min | DUR |
| Jeudi | repos | — | — |
| Vendredi | Total Body Power — sauts, vitesse | 60 min | RAPIDE, peu de fatigue |
| Samedi | Posterior Chain — soulevé de terre | 90 min | DUR |
| Dimanche | Upper Athletic + tronc + conditioning | 80-90 min | MODÉRÉ |

🔵 **L'ordre est justifié dans le document**, pas seulement posé : la séance
neuronale du vendredi potentialise le samedi lourd ; le dimanche est un jour de
haut du corps pour que les jambes récupèrent entre le soulevé de terre du samedi
et le squat du lundi.

### 3.1 Répartition des qualités

| Qualité | Où elle vit | Part |
|---|---|---|
| Force maximale | Lundi (squat), mercredi (développé, tractions), samedi (soulevé de terre) | 3 séances sur 5 |
| Explosivité / puissance | Vendredi en séance dédiée, + sauts en ouverture du lundi et du samedi | 1 séance + ouvertures |
| Chaîne postérieure | Samedi en entier, + RDL le lundi, + hip thrust, nordic, single-leg RDL | 1 séance + accessoires quotidiens |
| Gainage / tronc | Fin de chaque séance (ab wheel, dead bug, pallof, copenhagen, leg raise, bear crawl) | 1 à 2 exercices par séance |
| Portés | Vendredi (bilatéral) et samedi (unilatéral) | 2 séances |
| Conditioning | Dimanche uniquement, supprimé en deload et en bloc puissance | 1 séance |

🔵 **Chaque séance s'ouvre par ce qui demande le plus de fraîcheur nerveuse**
(sauts, mouvements explosifs), puis le lift principal, puis les accessoires,
puis le tronc. Un exercice chargé et technique passe avant les bonds, qui
coûtent peu.

---

## 4. Format d'une séance

🔵 Chaque séance est décrite dans le `.md` par un bloc de la forme :

```markdown
### JOUR — Nom de la séance

[Note de séance éventuelle, une phrase.]

**A. Nom de l'exercice — séries × reps × charge** — RPE — Repos —
Consigne technique en une ou deux phrases.
Progression : critère explicite de passage à la charge suivante.

**B. ...**
```

### 4.1 Les composants, dans l'ordre

| Composant | Contenu | Obligatoire |
|---|---|---|
| **Échauffement** | Deux routines seulement — « avant Lower » et « avant Upper », 7 à 10 min, listées exercice par exercice avec les répétitions, suivies des montées de charge | oui |
| **Readiness test** | Avant les séances jambes uniquement (voir section 6) | sur 3 séances / 5 |
| **Lettre de bloc** | A, B, C… qui ordonnent la séance | oui |
| **Prescription** | `séries × reps × charge`, ou `séries × reps` au poids du corps, ou `séries × distance` pour un porté | oui |
| **Intensité** | RPE cible, fourchette RPE, ou plafond (« RPE ≤ 7 ») — **absent volontairement** sur les mouvements de vitesse, où c'est la vitesse de barre qui pilote | selon le mouvement |
| **Repos** | En secondes ou minutes, chiffré, jamais « 1 à 3 min » | oui |
| **Note technique** | Une à deux phrases : l'intention d'exécution, puis le défaut à éviter | oui |
| **Tempo** | Notation à quatre chiffres (`3-0-X`, `3-1-X-0`) quand le tempo fait partie de la prescription | selon le bloc |
| **Règle de progression** | Sur les exercices autorégulés, le critère de montée est écrit sous l'exercice | selon le mouvement |
| **Alternative matériel** | Repli quand la salle n'a pas l'équipement | quand pertinent |

### 4.2 Exemple de structure (valeurs anonymisées)

```markdown
### LUNDI — Lower Strength (squat)

**A. Pogo Jumps — 3 × 10** — Repos 45 s — Contacts très courts, chevilles
rigides, peu de flexion du genou.

**B. Box Jump — 4 × 3** — Repos 90 s — Hauteur où tu atterris souple sans
rentrer les genoux ({{box_hauteur}}). Alternative : vertical jump sur cible.

**C. Back Squat — 5 × 5 × {{squat_s1}}** — RPE 7 — Repos 3 min 30
Tempo 3-0-X : descente 3 s sur les semaines 1-3, remontée avec intention
d'accélération maximale.

**D. Bulgarian Split Squat — 3 × 8/jambe, haltères 2 × {{bulgarian_s1}}** —
RPE 7-8 — Repos 90 s — Tempo 3-1-X-0.
Progression : 8 reps propres à RPE ≤ 7,5 → +2 kg par haltère.

**E. Romanian Deadlift — 3 × 8 × {{rdl_s1}}** — RPE 7 — Repos 2 min 30 —
Tempo 3-1-X-1
Descends jusqu'à l'étirement maximal des ischios sans perdre la neutralité
lombaire.

**F. Ab Wheel — 3 × 8** — Repos 60 s — Bassin en rétroversion, jamais
d'extension lombaire.
```

### 4.3 Le tableau de charges

🔵 Les mouvements principaux ne répètent pas leur charge dans chaque séance :
une **section dédiée** donne un tableau de 12 lignes (une par semaine) × une
colonne par mouvement indexé, avec `séries × reps × charge – RPE`. La trame de
séance y renvoie.

🔵 **Tous les mouvements ne sont pas dans ce tableau.** Ceux qui ont leur propre
règle de progression (push press, portés, accessoires autorégulés) sont chiffrés
dans la trame, avec leur critère de montée. C'est une distinction à conserver :
mélanger les deux fait croire qu'une charge est indexée alors qu'elle ne l'est
pas.

### 4.4 Modifications par bloc

🔵 Les séances **ne sont pas réécrites douze fois**. La trame est écrite une
fois (bloc accumulation), et une section « Modifications par bloc » décrit ce
qui change :

- **Deload (semaines 4 et 8)** 🔶 : lifts principaux 3 × 3 à 65-70 % ;
  accessoires à 2 séries au lieu de 3-4, −20 % ; volume de sauts divisé par 2,
  intention maximale conservée ; zéro série au-dessus de RPE 6 ; suppression des
  exercices les plus coûteux (nordic, conditioning).
- **Force maximale (5-7)** 🔶 : schéma de séries resserré, repos allongés
  (4 min sur squat/soulevé, 3 min 30 sur développé), fin du tempo lent,
  accessoires du haut à +10 % sur moins de reps.
- **Puissance (9-11)** 🔶 : méthode de **contraste** — série lourde → repos →
  mouvement explosif → repos → série lourde suivante, avec les durées de repos
  des deux transitions écrites, et la mention explicite « ce n'est pas un
  superset ». Les sauts d'ouverture passent dans le contraste et disparaissent
  du début de séance.
- **Taper (12)** 🔶 : volume minimal, puis tests.

🔵 Ces modifications sont écrites **par jour**, ce qui les rend applicables
mécaniquement : « lundi : … », « mercredi : … ».

### 4.5 Temps de repos

🔵 Une table unique, par type de travail et non par exercice :

| Travail | Repos |
|---|---|
| Tronc léger, pogo | 45 s |
| Bounds, plyo push-up, box jump | 75-90 s |
| Broad jump, jump squat | 90 s à 2 min |
| Contraste | 2 min lourd → explosif, 2 min explosif → lourd |
| Squat / soulevé de terre à 71-79 % | 3 min 30 |
| Squat / soulevé de terre à 82-90 % | 4 min |
| Développé / tractions à 71-79 % | 3 min / 2 min 30 |
| Développé / tractions à 82-90 % | 3 min 30 / 3 min |
| Mouvements de vitesse | 60 s → 75 s → 90 s selon le bloc |
| Accessoires du haut, portés | 60-90 s |

🔵 Avec une phrase qui dit pourquoi c'est chronométré : *« un repos raccourci sur
un lift lourd transforme la force en fatigue »*. Et une règle de priorité : quand
la trame donne un repos exact et que la table donne une fourchette, la trame
prime ; quand la trame elle-même donne une fourchette, on retient la borne haute.

---

## 5. Règles de progression et de régression

🔵 Sept cas numérotés, repris ici **tels quels**. La numérotation est utile :
l'application affiche le numéro du cas appliqué, ce qui rend la suggestion
vérifiable.

> **Cas 1 — RPE atteint = RPE prévu** → programme inchangé.
>
> **Cas 2 — beaucoup trop facile (RPE 6-6,5 pour 8 prévu)** → séance suivante :
> +5 kg bas du corps, +2,5 kg haut du corps, pas davantage. On ne récompense pas
> une bonne journée en sabotant la semaine suivante.
>
> **Cas 3 — légèrement trop facile (RPE 7 pour 8 prévu)** → +2,5 kg sur les gros
> mouvements.
>
> **Cas 4 — RPE 9 pour 8 prévu** → répète la même charge la semaine suivante. Si
> ça se reproduit deux fois : recalcule le tableau à −5 %.
>
> **Cas 5 — rep ratée** → ne retente pas. −5 à −7,5 %, termine le volume à
> RPE ≤ 8. Semaine suivante : reconstruction sur 2 semaines. Les échecs sur les
> trois lifts principaux doivent être exceptionnels.
>
> **Cas 6 — mauvaise journée (travail, enfants, sommeil)** → feu tricolore
> (section 6). Ne saute pas la séance, adapte-la.
>
> **Cas 7 — performances explosives en baisse deux semaines de suite** (broad
> jump, box jump, vitesse de barre) → lifts principaux à 3 séries, suppression du
> conditioning. Si ça persiste 10 jours : deload anticipé.
>
> **Règle générale** : un exercice progresse quand la dernière série sort au RPE
> prévu avec la même technique que la première.

🔶 Les incréments (+2,5 / +5 kg) et les seuils de RPE supposent un athlète
avancé, capable d'évaluer son RPE avec fiabilité. Pour un débutant, l'écart entre
RPE perçu et RPE réel rend ces règles inopérantes.

### 5.1 Propriétés du mécanisme

🔵 Trois propriétés à conserver, indépendantes des chiffres :

1. **Progression cumulative.** L'écart entre la charge réellement faite et la
   charge planifiée est reporté de semaine en semaine, et ajouté à la case
   suivante du tableau. Le plan reste intact ; c'est la suggestion qui se décale.
2. **Suggestion, jamais imposition.** La règle propose une charge et affiche le
   numéro du cas ; l'athlète confirme ou saisit autre chose.
3. **Pas de règle sans RPE.** Sur les blocs où la colonne RPE est vide (contraste,
   taper, mouvements de vitesse), aucune règle ne s'applique : l'écart est
   reporté, et c'est la vitesse de barre qui décide.

🔵 **Les cas 6 et 7 ne sont pas des règles de charge** : le cas 6 renvoie au feu
tricolore (décision de séance), le cas 7 à une tendance sur plusieurs semaines
(décision de bloc). Les séparer évite de chercher dans la progression ce qui
relève de la fatigue.

---

## 6. Test de readiness

🔵 Un test **objectif et chiffré**, pas un questionnaire subjectif. C'est un
choix de format fort : la mesure remplace l'auto-évaluation.

### 6.1 Protocole

Après l'échauffement, avant la première série de travail, sur les séances
jambes uniquement (lundi, vendredi, samedi) :
**3 broad jumps, 1 min de repos entre chaque, on garde le meilleur.**

La référence est le meilleur saut du combine initial, figée pour les douze
semaines. 🔵 Le programme précise de la construire sur les deux premières
semaines si le combine n'a pas eu lieu.

### 6.2 Scoring

| Écart à la référence | Niveau | Décision |
|---|---|---|
| ≥ −2 % | 🟢 VERT | Séance complète, rien ne change |
| entre −2 % et −5 % | 🟠 ORANGE | −5 % sur les gros mouvements, une série de moins sur les accessoires |
| ≤ −5 % | 🔴 ROUGE | Pas de travail RPE 8+. Lift principal remplacé par 3 × 3 à 60-70 % du 1RM, tronc, mobilité, et on rentre |

🔵 **Les bornes sont inclusives du côté défavorable** : à exactement −5 %, c'est
rouge. C'est la seule lecture qui rende les deux bornes non contradictoires, et
elle est documentée dans le code.

### 6.3 Déclenchement manuel

🔵 Le rouge se déclenche aussi **sans test**, si trois conditions sont réunies
**cumulativement** : moins de 5 h de sommeil **+** courbatures généralisées **+**
échauffement anormalement lourd.

### 6.4 Principe directeur

🔵 *« Ne saute pas la séance, adapte-la. »* Le rouge n'annule pas la séance, il la
remplace par une version technique. C'est ce qui distingue ce dispositif d'un
simple interrupteur marche/arrêt.

---

## 7. L'onglet « Combiné »

🔵 Le combine est un **écran à part**, pas une séance comme les autres. Rôle :
rassembler les trois mesures de référence au même endroit pour les comparer.

### 7.1 Organisation

Trois phases, en onglets :

| Phase | Quand | Contenu |
|---|---|---|
| **Initial** | Avant la semaine 1 | Tous les tests, 1RM compris |
| **Intermédiaire** | Semaine 8 | Tests athlétiques **sans 1RM** — on ne teste pas un maximum en semaine de deload |
| **Final** | Semaine 12 | Tous les tests, 1RM compris, avec des paliers recalculés |

### 7.2 Ce que l'écran affiche par mesure

- Le nom du test et son intention ;
- Les **paliers de montée en charge** pour les tests de 1RM, propres à la phase ;
- Un champ de saisie avec l'unité et le pas adaptés (kg, cm, s, m, reps) ;
- La **comparaison entre phases**, avec une flèche dont le sens s'inverse pour
  les mesures où un chiffre plus bas est meilleur (sprints) ;
- La **cible à 12 semaines**, issue d'une section dédiée du `.md`.

### 7.3 La section « le programme fonctionne si… »

🔵 Le `.md` se termine par un tableau `Paramètre | Départ mesuré | Cible à 12
semaines`, et surtout par l'énoncé du **vrai critère** — celui qui dit si le
bloc a réussi, au-delà des chiffres individuels.

🔶 Dans le programme d'origine : *« le vrai critère est l'écart soulevé de terre
− squat ; s'il devient nul ou positif, la chaîne postérieure a rattrapé son
retard. Si les 1RM montent mais que les sauts stagnent, le programme n'a produit
que de la force : demi-échec. »*

🔵 Les cibles sont obtenues en appliquant au départ mesuré **la progression
relative que le programme visait**, pas en reprenant des valeurs absolues
écrites avant les tests. Et quand une cible devient irréaliste après recalcul,
le document le dit au lieu de la masquer — le programme d'origine marque une
ligne comme « borne haute plutôt qu'objectif ».

---

## 8. Fonctionnalités de l'application

L'application est une **PWA hors ligne** : toutes les données restent sur
l'appareil, pas de compte, pas de serveur.

### 8.1 Les six onglets

| Onglet | Rôle |
|---|---|
| **Aujourd'hui** | La séance du jour déduite de la date de début, ou un écran de repos, ou un écran d'accueil tant que la date n'est pas réglée |
| **Semaine** | Les 5 jours d'une semaine, avec navigation de semaine en semaine (la semaine consultée est mémorisée d'un onglet à l'autre et d'une session à l'autre) |
| **Nutrition** | Voir section 9 |
| **Progrès** | Courbes de charge par lift, courbe de broad jump (readiness), RPE moyen par séance, suivi visuel |
| **Combiné** | Voir section 7 |
| **Réglages** | Date de début, poids de corps, référence broad jump, 1RM testés, son et vibration de fin de repos, sauvegarde/restauration, encombrement des photos, remise à zéro |

### 8.2 Écran de séance

- **Échauffement** à cocher item par item ;
- **Readiness** : saisie des 3 sauts, verdict et effet appliqué automatiquement ;
- **Carte par exercice** : nom, ligne de prescription, intention, consignes
  dépliables, alternative matériel ;
- **Saisie par série** : reps ou mesure (distance / temps), charge, RPE, drapeau
  « rep ratée » ;
- **Chrono de repos** : démarré automatiquement à la validation d'une série,
  avec la durée prescrite ; il stocke **l'horodatage de fin** et recalcule le
  temps restant à chaque affichage, donc il survit au verrouillage de l'écran et
  à la mise en arrière-plan ; son et vibration optionnels ;
- **Remarque libre par exercice**, facultative, écrite immédiatement, relisible
  les semaines suivantes via un badge ;
- **Comparaison avec la dernière occurrence réelle** du même mouvement, affichée
  sous la prescription — charge et RPE, ou distance, ou les deux pour un porté,
  avec l'écart ;
- **Documentation du mouvement** : une fiche technique (une image, valable pour
  toutes les semaines) et des photos datées d'exécution, comparables dans le
  temps ; une trace de vidéo (date seulement, le fichier reste dans la pellicule) ;
- **Note de fin de séance**, globale, distincte des remarques par exercice.

### 8.3 Principes d'interface à retenir

🔵 Quatre choix transposables :

1. **Écriture immédiate.** Aucune saisie n'attend un bouton « enregistrer ».
2. **En cas de doute, on garde la valeur précédente.** Une saisie illisible ou
   vide ne doit jamais écrire un zéro ou un `NaN` dans l'historique — un zéro
   passerait pour une série faite à vide et fausserait la progression suivante.
3. **Les champs s'ouvrent sur une valeur plausible** : ce qui est déjà saisi,
   puis la valeur du plan, puis la dernière réellement faite, puis seulement le
   minimum du curseur.
4. **Les rappels sont déduits de la donnée, pas écrits à la main.** Exemple : un
   mouvement à une seule haltère affiche « 1 SEULE haltère » parce que sa forme
   de charge le dit, donc aucun ne peut oublier son rappel.

---

## 9. Plan alimentaire

🔵 Il existe, dans un **second fichier Markdown** distinct du programme
d'entraînement, et suit la même règle : le `.md` est la source, le code
transcrit.

### 9.1 Structure du document

| Section | Contenu |
|---|---|
| En-tête | Cible chiffrée : `{{kcal_train}}` kcal, `{{proteines_g}}` g de protéines, `{{glucides_g}}` g de glucides, `{{lipides_g}}` g de lipides |
| Principe général | L'orientation en quelques lignes, et ce qu'elle n'est pas |
| Journée type — jour d'entraînement | 6 prises, détaillées |
| Journée type — jour de repos | Les mêmes 6 prises, allégées |
| Liste de courses hebdomadaire | Par catégorie : protéines, glucides, lipides, légumes |
| Suivi et ajustement | La règle de pilotage |

### 9.2 Principes de structure

🔵 **Deux paliers seulement** — jour d'entraînement et jour de repos — avec la
justification : une périodisation plus fine demanderait de peser chaque aliment,
ce qui ne tiendrait pas dans la durée.

🔵 **Le jour de repos garde le même nombre de prises et les mêmes protéines** :
on n'allège que les féculents. Supprimer un repas est explicitement écarté.

🔵 **Chaque prise est détaillée ligne par ligne**, avec quantité, unité et un
total approximatif en kcal et en protéines. Les lignes sont des aliments
courants, sans produit exotique.

🔵 **Les quantités sont des repères, pas des lois** — le document le dit, et
assume que les totaux affichés ne tombent pas exactement sur la somme des
macronutriments.

### 9.3 Règle d'ajustement

🔵 Le pilotage ne se fait **pas sur une pesée isolée** mais sur la moyenne des
7 derniers jours, comparée à celle de la semaine précédente :

- Moyenne stable (< 150-200 g de variation) sur 2-3 semaines → ajouter 50 g de
  féculent au dîner.
- Moyenne qui monte de plus de 400-500 g/semaine plusieurs semaines de suite,
  **avec le tour de taille qui suit** → retirer 50 g de féculent au dîner.

🔶 L'objectif de vitesse de prise (`{{prise_kg_semaine}}` par semaine) et la
cible de poids (`{{poids_cible}}`) sont propres au profil et à l'objectif de
prise de masse de ce programme.

🔵 Le **tour de taille sert d'arbitre** quand le poids seul est ambigu : poids
qui monte + taille stable = bon ; poids qui monte + taille qui suit = la prise
n'est pas que musculaire.

### 9.4 Côté application

- Deux cibles affichées selon que le jour porte une séance ou non ;
- Les douze repas (6 × 2 jours) détaillés aliment par aliment ;
- **Chaque aliment est modifiable** : quantité, et composition pour 100 g ou par
  unité — les champs d'une étiquette de produit, pour les recopier sans
  convertir ;
- La composition est partagée entre toutes les lignes du même produit, la
  quantité reste propre à la ligne ;
- Les totaux sont recalculés depuis les aliments, avec détection d'une étiquette
  incohérente (kcal qui ne correspondent pas aux macronutriments) ;
- Retour aux valeurs d'origine en un bouton ;
- Journal de poids et de tour de taille, avec moyenne glissante et suggestion
  d'ajustement.

---

## 10. Historique des modifications importantes

Résumé de `git log` (62 commits). 🔵 L'historique est lui-même instructif : il
montre **quelles erreurs ce format a permis d'attraper**.

### 10.1 Construction initiale

1. Données, moteur, écran de séance, PWA.
2. Écrans Aujourd'hui, Semaine, Progression, Combiné, Réglages.
3. Bandeau de mise à jour au lieu d'un rechargement silencieux.
4. Onglet Nutrition : cibles, suivi de poids, suggestion d'ajustement.
5. Suivi visuel et documentation des mouvements.

### 10.2 Corrections de structure du programme

6. **Restructuration du combine initial sur six jours** — la version à trois
   jours enchaînait deux efforts de tirage maximal sans récupération.
7. Regroupement du combine en semaine 0, distincte de la semaine 1.
8. Élargissement du calendrier de 5 à 7 jours réels (le combine occupe un mardi
   et un jeudi), avec migration des données déjà saisies.

### 10.3 La correction la plus importante — les charges

9. **Les charges du tableau ne dépendent plus du 1RM saisi dans les réglages.**
   Le tableau traitait chaque case comme un pourcentage d'un maximum estimé,
   puis la recalait : le plan affiché n'était plus celui du document.
10. **Recalage de tout le tableau sur les maxima réellement testés.** Six
    semaines sur douze demandaient au squat plus de 100 % du maximum réel.
11. Recalage des colonnes dérivées (speed squat, front squat), qui avaient été
    écrites sur l'ancien maximum supposé.
12. **Recalage des cibles à 12 semaines** — l'écran Combiné affichait encore des
    objectifs calculés avant les tests.
13. **Recalage des paliers du test final**, qui réutilisaient ceux du test
    initial et faisaient monter l'échauffement au-dessus du maximum réel.

🔵 Enseignement de format : *une valeur dérivée d'un maximum estimé doit être
recensée et recalculée en entier quand le maximum réel arrive.* Les cinq commits
ci-dessus sont cinq endroits où la même estimation s'était propagée.

### 10.4 Saisie et fidélité de l'historique

14. Un champ de charge sur chaque exercice, avec pavé numérique.
15. Les sauts se notent en distance, pas en « poids du corps ».
16. Remarque libre par exercice, distincte de la note de séance.
17. Comparaison avec la dernière performance réelle sous chaque exercice.
18. **Une occurrence est une séance, pas une semaine** — le seul mouvement
    présent deux fois dans la semaine perdait la première des deux.
19. Les portés affichent leurs deux métriques, distance et charge.
20. La distance se pré-remplit sur la valeur du plan au lieu du minimum.

### 10.5 Plan alimentaire

21. Refonte pour atteindre réellement les cibles annoncées.
22. Jour de repos : six prises allégées plutôt qu'une prise supprimée.
23. Aliments modifiables un par un, puis sur les douze repas.
24. Distinction de l'excédent et du déficit (l'alerte annonçait un manque dans
    les deux cas).
25. Détection d'une étiquette dont les kcal contredisent les macronutriments.

### 10.6 Ajout de contenu

26. Ajout d'un mouvement au programme (hang high pull, vendredi), avec sa place
    dans la séance, sa progression bootstrap et ses modifications par bloc.

---

## 11. Variables à renseigner

| Variable | Ce qu'elle représente |
|---|---|
| `{{taille}}`, `{{poids_initial}}`, `{{age}}` | Anthropométrie de départ |
| `{{squat_1rm_initial}}` | 1RM squat mesuré au combine initial |
| `{{bench_1rm_initial}}` | 1RM développé couché mesuré |
| `{{deadlift_1rm_initial}}` | 1RM soulevé de terre mesuré |
| `{{tractions_lestees_1rm}}` | 1RM tractions lestées mesuré |
| `{{tractions_strictes_max}}` | Tractions strictes max |
| `{{broad_jump_reference}}` | Meilleur broad jump du combine — référence du readiness |
| `{{vertical_jump_reference}}`, `{{sprint_10m}}`, `{{sprint_20m}}` | Autres mesures de référence |
| `{{squat_s1}}` … `{{squat_s12}}` | Charge de squat, semaine par semaine |
| `{{bench_s1}}` … , `{{deadlift_s1}}` … | Idem pour les autres lifts indexés |
| `{{rdl_s1}}`, `{{bulgarian_s1}}`, `{{hip_thrust_s1}}` | Charges de départ des accessoires |
| `{{box_hauteur}}` | Hauteur de box jump |
| `{{date_debut}}` | Lundi de la semaine 1 |
| `{{squat_cible}}`, `{{bench_cible}}`, `{{deadlift_cible}}` | Cibles à 12 semaines |
| `{{poids_cible}}`, `{{prise_kg_semaine}}` | Objectifs de poids |
| `{{kcal_train}}`, `{{kcal_repos}}` | Cibles caloriques des deux paliers |
| `{{proteines_g}}`, `{{glucides_g}}`, `{{lipides_g}}` | Macronutriments cibles |

---

## 12. Points à confirmer

Ce qui est absent du dépôt, ambigu, ou que je n'ai pas pu établir par lecture.

1. **Origine des pourcentages de périodisation.** Le tableau de la section 2
   donne des bandes (71-79 %, 82-90 %, 84-89 %). Aucune source ni justification
   n'est écrite. Je ne sais pas si elles viennent d'une méthode identifiée ou
   d'un choix de l'auteur.

2. **Méthode de calcul initiale du tableau de charges.** Le document donne les
   kilos semaine par semaine, mais pas la formule qui les a produits avant le
   recalage. Les pourcentages sont reconstituables a posteriori, pas donnés.

3. **Deux colonnes sans pourcentage écrit.** Le front squat et quelques
   accessoires sont chiffrés en kilos sans que le document dise à quel
   pourcentage de quoi ils correspondent. Le recalage a dû procéder par rapport
   relatif, ce qui est documenté dans le code mais reste une inférence.

4. **Le soulevé de terre dépasse ses bandes.** Quatre semaines sur douze sortent
   des pourcentages annoncés en section 2. Le code le constate et le documente
   plutôt que de le corriger, en l'attribuant à une compensation volontaire d'un
   maximum sous-estimé. Je n'ai pas de confirmation de l'auteur.

5. **Pas de questionnaire de readiness subjectif.** Le programme n'utilise que le
   broad jump et le déclencheur manuel à trois conditions. Si un questionnaire
   (sommeil, courbatures, humeur, stress) existe ailleurs, il n'est pas dans ce
   dépôt.

6. **Progression des mouvements au poids du corps.** Rien n'est écrit sur la façon
   de progresser en tractions strictes, ab wheel ou nordic curl au-delà des
   séries et répétitions. Le champ de lest existe dans l'application, mais aucune
   règle ne le pilote.

7. **Conduite à tenir après une blessure ou une interruption.** Le cas 5 couvre
   une rep ratée, le cas 7 une baisse de performance explosive, mais aucune
   section ne traite une coupure de plusieurs semaines ni une reprise.

8. **Suite des 12 semaines.** La section 13 mentionne qu'un demi-échec
   orienterait « le bloc suivant » vers la vitesse, mais ce bloc suivant n'est
   écrit nulle part.

9. **Durée réelle des séances.** Les durées annoncées (60 à 90 min) ne sont pas
   recoupées avec la somme des séries et des temps de repos. L'application ne
   mesure pas la durée effective.

10. **Échauffement des séances de puissance.** Deux routines seulement sont
    écrites — « avant Lower » et « avant Upper ». La séance du vendredi
    (total body) utilise la routine Lower dans le code ; le document ne le dit
    pas explicitement.

11. **Choix du modèle de nutrition.** Le document qualifie son orientation de
    « style NFL, pas culturiste » sans développer ce que recouvre cette
    distinction ni d'où elle vient.

12. **Pas de séance de mobilité ou de récupération dédiée.** La mobilité
    n'apparaît que dans l'échauffement et dans la version rouge d'une séance.
