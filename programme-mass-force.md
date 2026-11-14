# MASS FORCE — semaine type (S1)

Version de travail V1, validée par Guillaume. **Seule la semaine type S1 est
validée.** La progression S2–S4 et les pourcentages de 1RM ne le sont pas :
ils ne figurent pas ici, et l'application ne les invente pas. Tant qu'ils
manquent, MASS FORCE reste « à venir ».

Ce fichier est la source de vérité. Le code le transcrit (`src/programmes/massforce/`)
et un test le relit case par case.

## 1. Semaine type

Lecture : séries × répétitions · charge · repos en secondes. « À définir » :
la fourchette en %1RM n'est pas validée — en attendant, la charge est libre.
« Libre » : charge choisie par l'utilisateur.

| Séance | Exercice | Matériel autorisé | Test de référence | S1 |
|---|---|---|---|---|
| Lundi — Pecs / Triceps | Développé couché | Barre libre / Smith | Bench | 4×5 · À définir · 240s |
| Lundi — Pecs / Triceps | Développé incliné haltères | Haltères | Aucun | 4×8 · Libre · 150s |
| Lundi — Pecs / Triceps | Écarté couché | Haltères | Aucun | 3×10 · Libre · 90s |
| Lundi — Pecs / Triceps | Barre au front | Barre EZ / W | Aucun | 4×8 · Libre · 120s |
| Lundi — Pecs / Triceps | Extension triceps allongé | Haltères | Aucun | 3×10 · Libre · 90s |
| Mardi — Dos / Biceps | Tirage vertical | Poulie / Machine guidée | Tirage vertical | 4×5 · À définir · 240s |
| Mardi — Dos / Biceps | Rowing buste penché / Tirage horizontal large | Barre / Poulie | Aucun | 4×8 · Libre · 150s |
| Mardi — Dos / Biceps | Tirage vertical supination | Poulie / Machine guidée | Aucun | 3×10 · Libre · 120s |
| Mardi — Dos / Biceps | Pull-over poulie haute | Poulie | Aucun | 3×15 · Libre · 90s |
| Mardi — Dos / Biceps | Curl barre W | Barre W | Aucun | 4×8 · Libre · 15s |
| Mardi — Dos / Biceps | Curl haltères | Haltères | Aucun | 4×12 · Libre · 120s |
| Jeudi — Jambes | Squat | Barre libre / Smith | Squat | 4×6 · À définir · 180s |
| Jeudi — Jambes | Leg extension | Machine | Aucun | 3×8 · Libre · 120s |
| Jeudi — Jambes | Leg curl | Machine | Aucun | 3×8 · Libre · 120s |
| Jeudi — Jambes | Fentes avant / arrière / bulgares | À préciser | Aucun | 3×12/jambe · Libre · 120s |
| Vendredi — Épaules | Push press | Smith / Barre libre | Push press | 4×4 · À définir · 240s |
| Vendredi — Épaules | Élévations frontales | À préciser | Aucun | 3×10 · Libre · 120s |
| Vendredi — Épaules | Élévations latérales | À préciser | Aucun | 4×12 · Libre · 120s |
| Vendredi — Épaules | Oiseau penché / Pec fly inversée | Haltères / Machine | Aucun | 3×15 · Libre · 60s |

Décisions de Guillaume :

- **Squat** : barre libre ou Smith, au choix (et non la Smith seule).
- **Tirage vertical supination** : un exercice distinct du tirage vertical, à
  charge choisie par l'utilisateur, sans lien avec le combiné.
- **Lignes « A / B »** (rowing / tirage horizontal, fentes, oiseau / pec fly)
  et **matériel au choix** (développé couché, tirage vertical, tirage
  supination, squat, push press) : chaque possibilité est un exercice à part,
  avec son propre historique. Le choix se fait une fois par cycle, au
  démarrage.
- **Fentes** : 12 répétitions **par jambe**.
- **RPE 8** : une consigne, pas un champ à saisir.

## 2. Superset

Mardi — biceps : Curl barre W (A1) → **15 s de transition** → Curl haltères
(A2) → **120 s de repos** → tour suivant. Quatre tours. Les deux exercices
s'enregistrent séparément, liés au même superset ; le chrono distingue la
transition du repos.

## 3. Consignes techniques et vigilance

| Exercice | Consignes techniques | Vigilance |
|---|---|---|
| Développé couché | Exécution contrôlée, amplitude reproductible. | Ne pas transférer les charges entre barre et Smith. Prévoir des sécurités adaptées. |
| Développé incliné haltères | Amplitude contrôlée, trajectoire stable. | Éviter de sacrifier le contrôle pour augmenter les charges. |
| Écarté couché | Mouvement contrôlé. | Ne pas rechercher une amplitude excessive sous charge. |
| Barre au front | RPE 8. | Surveiller la tolérance des coudes. |
| Extension triceps allongé | Mouvement contrôlé. | Attention à la fatigue des coudes après la barre au front. |
| Tirage vertical | Amplitude reproductible, sans élan excessif. | Une charge élevée ne doit pas transformer le mouvement en tirage avec tout le corps. |
| Rowing / tirage horizontal | RPE 8. Prise large en pronation pour le tirage horizontal. | Le rowing penché demande davantage de stabilisation du tronc. |
| Tirage vertical supination | Contraction maintenue 1 seconde. La qualité prime sur la charge. | Ne pas augmenter la charge au détriment de la contraction recherchée. |
| Pull-over poulie haute | Contrôle du mouvement. | Éviter les compensations du tronc. |
| Curl barre W | RPE 8, excentrique 2 secondes, contrôle total. | Ne pas accélérer la descente sous l’effet de la fatigue. |
| Curl haltères | Intention de vitesse maximale, mouvement complet, prise au choix. | Intention rapide ne signifie pas mouvement désordonné. |
| Squat | 4×6 avec intention de force, pas une série facile. | Amplitude adaptée et reproductible, sécurités réglées. Le tempo excentrique reste à confirmer. |
| Leg extension | Excentrique 3 secondes, pic de contraction. | Éviter les mouvements brusques. |
| Leg curl | Excentrique 3 secondes, pic de contraction. | Maintenir une position stable. |
| Fentes | Avant, arrière ou bulgares au choix. | 12 répétitions par jambe. |
| Push press | 4×4, Smith ou barre selon le choix de l’utilisateur. | Exercice technique : nécessité d’une fiche claire et d’une variante adaptée. |
| Élévations frontales | 3×10. | Éviter l’élan excessif. |
| Élévations latérales | 4×12. | Éviter les compensations du tronc. |
| Oiseau / pec fly inversée | Pic de contraction. | Conserver une amplitude maîtrisée. |

## 4. Non validé — ne rien transcrire

- Progression S2, S3, S4.
- Fourchettes de %1RM des quatre mouvements évalués.
- Formules d'estimation du 1RM, protocole du combiné.
- Séries fractionnées (4 + 4 avec 5 à 10 s de pause) : à l'étude.
