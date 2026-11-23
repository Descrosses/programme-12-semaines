# Orienter vers un programme à partir du bilan sportif

> **Statut : BROUILLON révision 2 (23 novembre 2026) — rien n'est codé.**
> Réponses de Guillaume intégrées (A, B, C, D, E, F, G) ; une question reste
> ouverte sur la branche MASS (§3).
> À corriger par Guillaume. Une fois validé, ce fichier deviendra la source
> de vérité : le code le transcrira et des tests le reliront, comme pour
> `regles-cibles-nutrition.md`.
>
> Chaque règle cite **d'où elle vient** : la fiche du programme au catalogue
> (`src/data/catalogue.ts`, ses « prérequis »), le `.md` du programme, ou
> **une proposition de Claude** à valider. Aucune de ces règles ne sort d'une
> étude : ce sont des choix de l'appli.

---

## 0. Ce que l'orientation fait, et ce qu'elle ne fait pas

- À la fin du bilan, dans l'appli, un encart **« Les programmes qui te
  correspondent »** montre **au plus deux** programmes, chacun avec ses
  raisons (« objectif : devenir plus fort · 5 séances possibles · salle »).
- C'est une **indication**. La phrase de l'écran : *« Selon tes réponses.
  Guillaume confirme après avoir lu ton bilan. »*
- Le bouton ouvre la fiche du programme au catalogue (**« Voir le
  programme »**). Il ne **démarre** rien et ne **verrouille** rien : tous les
  programmes disponibles restent démarrables, suggérés ou non.
- Le **résumé envoyé au coach ne change pas** : il reste identique au site,
  au caractère près (il a déjà sa ligne « bases candidates »).
- Rien n'est enregistré en base : l'orientation se recalcule à partir des
  réponses du bilan, gardées sur le téléphone.

---

## 1. Les réponses utilisées

| Réponse du bilan | Question | Usage |
|---|---|---|
| Niveau de vigilance (rouge / orange / vert) | S1 à S6, 6, 7, 8, situations | §2 — avant tout |
| Objectif principal | 3 | correspondance |
| Méthodes souhaitées | 3b | correspondance |
| Niveau | 9 | prérequis |
| Exercices maîtrisés | 11 | prérequis (technique des barres) |
| Séances par semaine | 12 | prérequis |
| Disponibilités jour par jour | 13 | prérequis (durée des séances) |
| Lieu | 14 | prérequis (matériel) |
| Sexe | 2 | **jamais utilisé** (§5) |

**Non utilisés, volontairement :** le matériel (question 15) et l'objectif
chiffré (4) sont du texte libre ; l'appli ne les interprète pas. Les repères
de force (30 à 33) non plus : aucune formule n'est validée (règle de MASS
FORCE). Guillaume les lit dans le résumé.

---

## 2. Avant tout : la sécurité

| Niveau | Ce que l'écran montre |
|---|---|
| ROUGE | Rien : le questionnaire s'est déjà arrêté (écran « Avant de poursuivre »). |
| Hors périmètre (grossesse, moins de 18 ans, post-partum, reprise après blessure, senior) | Rien : le questionnaire s'est déjà arrêté. |
| **ORANGE** | **Aucune suggestion** (Guillaume, réponse A). À la place : *« Une de tes réponses demande l'avis de Guillaume avant de choisir un programme. Il te répondra après avoir lu ton bilan. »* |
| VERT | Les suggestions du §3. |


---

## 3. Programme par programme

Un programme est **suggéré** quand **toutes** ses conditions sont remplies.
Pas de score, pas de pondération : chaque raison s'affiche telle quelle.
Si plus de deux programmes passent, on garde l'ordre du tableau.

### POWER CYCLE 1 (`power12`)

| Condition | Valeur | Source |
|---|---|---|
| Objectif | « Devenir plus fort », « Améliorer explosivité / vitesse / qualités athlétiques » ou « Préparation à un sport ou une épreuve » | catalogue (objectifs : force maximale, explosivité) |
| Niveau | Intermédiaire, Confirmé ou Avancé | catalogue : « Technique maîtrisée sur les trois barres » |
| Exercices maîtrisés | Squat avec barre **et** Développé couché **et** Soulevé de terre | catalogue : « Technique maîtrisée sur les trois barres » |
| Séances par semaine | 5 ou plus | Guillaume (réponse B) |
| Disponibilités | au moins 5 jours à 60 min ou plus (séances visées : 60 à 75 min) | Guillaume (réponse B) |
| Lieu | Salle ou Plusieurs lieux | **proposition de Claude** (barres, rack, ceinture de lest) |

**À savoir (réponse B) :** le §3 de POWER annonce des séances de 45 à
85 min, et l'appli calcule jusqu'à 81 min le vendredi en S5-7. Quelqu'un
qui a 75 min tout juste dépassera certains jours. La règle reste la tienne :
c'est une indication, pas un verrou.

### La famille MASS — chemin conseillé : HYPERTROPHIE → FORCE → CONGESTION

**Décision de Guillaume (réponses C et D) :** la suggestion suit le chemin
déjà écrit au catalogue. Le point de départ du chemin MASS, et le programme
des débutants, est **MASS HYPERTROPHIE 1.0** (`mass8`, pas encore créé).
MASS FORCE peut être suggéré même en version de travail.

**Question H (ouverte) :** tant que HYPERTROPHIE n'existe pas, que montre
l'écran à quelqu'un qui veut prendre du muscle ? Proposition de Claude :
« MASS HYPERTROPHIE — le point de départ conseillé, bientôt disponible »,
et en attendant le programme disponible qui suit sur le chemin.

### MASS CONGESTION (`mass4`)

| Condition | Valeur | Source |
|---|---|---|
| Objectif | « Prendre du muscle » | catalogue : « Prise de masse musculaire et congestion » |
| Niveau | Débutant (moins d'1 an), Intermédiaire ou Confirmé ; « Jamais pratiqué » écarté | catalogue + Guillaume (réponse C) |
| Séances par semaine | 4 ou plus | catalogue : « Quatre séances par semaine » |
| Disponibilités | au moins 4 jours à 60 min ou plus | catalogue : « environ 60 minutes » |
| Lieu | Salle ou Plusieurs lieux | catalogue : « Smith machine, poulies, machines guidées et haltères » |

### MASS FORCE (`mass-force`)

**Suggéré, même en version de travail** (Guillaume, réponse D : « programme
à compléter, mais chemin déjà écrit comme ça »). Ses conditions dépendent de
la question H.

### MASS HYPERTROPHIE (`mass8`)

Le point de départ du chemin MASS et le programme des débutants (réponse C).
Ses conditions s'écriront avec le programme ; d'ici là, voir la question H.

### Transitions et cycles suivants (POWER, FEMMES)

Jamais suggérés : « à venir », ils ne se démarrent pas, et le parcours les
ouvre après l'étape précédente.

### FEMMES CYCLE 1 (`femmes8`)

| Condition | Valeur | Source |
|---|---|---|
| Objectif | « Me renforcer musculairement (sans viser la prise de masse) », « Reprendre le sport », « Santé / bien-être », « Améliorer condition physique / endurance » ou « Prendre du muscle » (prise de masse, volume des fessiers) | Guillaume (réponse E) |
| Sexe | Femme | Guillaume (réponses E et F) |
| Séances par semaine | 3 ou plus | catalogue : « Trois créneaux… par semaine » |
| Disponibilités | au moins 3 jours à 20 min ou plus | catalogue : « de 20 à 45 minutes » |
| Lieu | n'importe lequel | catalogue : « Un tapis, une paire d'haltères légers et un kettlebell — ou une salle de sport » |
| Niveau | n'importe lequel | le programme a trois niveaux (débutante, intermédiaire, confirmée) |

### ME, MYSELF & I

Jamais suggéré : il accueille un programme que la personne apporte.

---

## 4. Quand rien ne correspond

*« Aucun programme de l'appli ne correspond encore à tes réponses.
Guillaume te proposera un programme adapté après avoir lu ton bilan. »*

**Ce sera fréquent, et il faut le savoir :** les objectifs **« Perdre du
poids / de la masse grasse »** et **« Améliorer ma mobilité / ma posture »**,
et la méthode **Pilates**, n'ont **aucun programme** dans l'appli aujourd'hui.
Ton site les prévoit pourtant comme « bases » (Perte de poids homme/femme,
Pilates). Le seul cycle de perte de poids écrit au catalogue est FEMMES
CYCLE 3, « à venir ».

---

## 5. Le sexe : seulement pour FEMMES

**Décision de Guillaume (réponses E et F) :** FEMMES CYCLE 1 n'est suggéré
qu'à une personne qui a répondu « Femme ». Pour POWER et MASS, le sexe ne
compte jamais.

C'est un écart assumé à la phrase du site (« sexe : information, ne décide
jamais seul ») : ici il ne décide pas seul non plus, puisque l'objectif, les
séances et les disponibilités doivent aussi correspondre. « Autre » et
« Préfère ne pas répondre » ne reçoivent pas FEMMES (lecture stricte de « si
c'est une femme »).

---

## 6. Réponses de Guillaume (23 novembre)

| | Question | Réponse |
|---|---|---|
| A | Orange : suggérer quand même ? | Non |
| B | POWER : jours et minutes ? | 5 jours à 60-75 min |
| C | MASS CONGESTION : « Débutant (moins d'1 an) » suffit ? | Oui, mais départ MASS et débutants → HYPERTROPHIE 1.0 (à créer) |
| D | MASS FORCE en version de travail : suggéré ? | Oui, le chemin est déjà écrit ainsi |
| E | FEMMES CYCLE 1 : quels objectifs ? | Renforcement, reprise, santé, condition physique, et prise de masse / volume des fessiers si c'est une femme |
| F | FEMMES CYCLE 1 à un homme qui correspond ? | Non |
| G | Au plus deux suggestions ? | Oui |
| H | MASS tant que HYPERTROPHIE n'existe pas ? | **Ouverte** (§3) |
