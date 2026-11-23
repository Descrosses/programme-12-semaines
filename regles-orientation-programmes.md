# Orienter vers un programme à partir du bilan sportif

> **Statut : BROUILLON du 23 novembre 2026 — rien n'est codé.**
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
| **ORANGE** | **Aucune suggestion.** À la place : *« Une de tes réponses demande l'avis de Guillaume avant de choisir un programme. Il te répondra après avoir lu ton bilan. »* |
| VERT | Les suggestions du §3. |

**Proposition de Claude (question A) :** pas de suggestion en orange.
Montrer un programme à quelqu'un qui a déclaré une douleur ou un traitement,
c'est l'inviter à le démarrer avant que tu aies lu son bilan.

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
| Séances par semaine | 4 ou plus | catalogue : « Quatre à cinq séances par semaine » |
| Disponibilités | au moins 4 jours à 60 min ou plus | **proposition de Claude** (§3 du programme : séances de 45 à 85 min) — question B |
| Lieu | Salle ou Plusieurs lieux | **proposition de Claude** (barres, rack, ceinture de lest) |

### MASS CONGESTION (`mass4`)

| Condition | Valeur | Source |
|---|---|---|
| Objectif | « Prendre du muscle » | catalogue : « Prise de masse musculaire et congestion » |
| Niveau | Débutant (moins d'1 an), Intermédiaire ou Confirmé | catalogue : « Niveau débutant avancé ou intermédiaire, déjà entraîné » — question C |
| Séances par semaine | 4 ou plus | catalogue : « Quatre séances par semaine » |
| Disponibilités | au moins 4 jours à 60 min ou plus | catalogue : « environ 60 minutes » |
| Lieu | Salle ou Plusieurs lieux | catalogue : « Smith machine, poulies, machines guidées et haltères » |

### MASS FORCE (`mass-force`)

**Proposition de Claude (question D) : jamais suggéré tant que c'est une
version de travail** (seule la semaine 1 est écrite). Le suggérer, c'est
envoyer quelqu'un sur un programme qui s'arrête au bout de 7 jours.

### MASS HYPERTROPHIE, transitions, cycles suivants

Jamais suggérés : « à venir », ils ne se démarrent pas.

### FEMMES CYCLE 1 (`femmes8`)

| Condition | Valeur | Source |
|---|---|---|
| Objectif | « Me renforcer musculairement (sans viser la prise de masse) », « Reprendre le sport », « Santé / bien-être » ou « Améliorer condition physique / endurance » | catalogue : « Reprendre ou construire une base de force complète, sans matériel lourd » — question E |
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

## 5. Le sexe ne décide jamais

Ni pour suggérer, ni pour écarter, conformément à ton site (« sexe :
information, ne décide jamais seul ») et à la règle du dépôt (« un programme
ne se justifie pas par le sexe seul »).

**Conséquence à trancher (question F) :** un homme dont les réponses
correspondent à FEMMES CYCLE 1 (reprise, 3 séances courtes, maison) se le
verra suggérer. **Proposition de Claude :** le garder. C'est la structure
du programme qui correspond (circuits courts, matériel léger), et le nom de
la famille est une étiquette.

---

## 6. Questions pour Guillaume

Chaque question a une proposition ; réponds « ok » ou corrige.

| | Question | Proposition de Claude |
|---|---|---|
| A | Orange : suggérer quand même, ou rien ? | Rien, message « Guillaume te répondra » |
| B | POWER : combien de jours, combien de minutes ? | 4 jours à 60 min ou plus |
| C | MASS CONGESTION : « Débutant (moins d'1 an) » suffit-il pour « débutant avancé » ? | Oui ; « Jamais pratiqué » écarté |
| D | MASS FORCE en version de travail : suggéré ? | Non, tant que S2-S4 ne sont pas écrites |
| E | FEMMES CYCLE 1 : quels objectifs ? | Renforcement, reprise, santé, condition physique |
| F | FEMMES CYCLE 1 suggéré à un homme qui correspond ? | Oui, le sexe ne décide jamais |
| G | Au plus deux suggestions : le bon nombre ? | Oui |
