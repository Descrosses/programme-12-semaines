# MASS FORCE — semaine type (S1)

Version de travail V1, validée par Guillaume. La semaine type S1 (§1), ses
fourchettes de charge (§1 bis, lot 5) et la progression sur quatre semaines
(§1 ter, lot 6) sont validées.

Ce fichier est la source de vérité. Le code le transcrit (`src/programmes/massforce/`)
et un test le relit case par case.

## 1. Semaine type

Lecture : séries × répétitions · charge · repos en secondes. Un pourcentage :
fourchette en %1RM (voir §1 bis). « (Smith) » : la fourchette ne vaut que pour
ce matériel. « À définir » : aucune fourchette validée — charge à déterminer.
« Libre » : charge choisie par l'utilisateur.

| Séance | Exercice | Matériel autorisé | Test de référence | S1 |
|---|---|---|---|---|
| Lundi — Pecs / Triceps | Développé couché | Barre libre / Smith | Bench | 4×5 · 75–82,5 % · 240s |
| Lundi — Pecs / Triceps | Développé incliné haltères | Haltères | Aucun | 4×8 · Libre · 150s |
| Lundi — Pecs / Triceps | Écarté couché | Haltères | Aucun | 3×10 · Libre · 90s |
| Lundi — Pecs / Triceps | Barre au front | Barre EZ / W | Aucun | 4×8 · Libre · 120s |
| Lundi — Pecs / Triceps | Extension triceps allongé | Haltères | Aucun | 3×10 · Libre · 90s |
| Mardi — Dos / Biceps | Tirage vertical | Poulie / Machine guidée | Tirage vertical | 4×5 · 75–82,5 % · 240s |
| Mardi — Dos / Biceps | Rowing buste penché / Tirage horizontal large | Barre / Poulie | Aucun | 4×8 · Libre · 150s |
| Mardi — Dos / Biceps | Tirage vertical supination | Poulie / Machine guidée | Aucun | 3×10 · Libre · 120s |
| Mardi — Dos / Biceps | Pull-over poulie haute | Poulie | Aucun | 3×15 · Libre · 90s |
| Mardi — Dos / Biceps | Curl barre W | Barre W | Aucun | 4×8 · Libre · 15s |
| Mardi — Dos / Biceps | Curl haltères | Haltères | Aucun | 4×12 · Libre · 120s |
| Jeudi — Jambes | Squat | Barre libre / Smith | Squat | 4×6 · 70–80 % (Smith) · 180s |
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

## 1 bis. Fourchettes de charge (S1)

Décisions de Guillaume (lot 5). Charge = 1RM de référence × pourcentage :
une **fourchette**, jamais une charge unique, **sans arrondi** (les paliers de
disques ne sont pas connus).

- **Développé couché, tirage vertical** : 75–82,5 %, pour chacun des deux
  matériels, calculé sur le 1RM de CE matériel.
- **Squat** : 70–80 %, à la **Smith seulement**. À la barre libre : charge à
  déterminer.
- **Push press** : aucune fourchette. Rien n'est déduit du développé couché.
- **Référence exploitable** : le 1RM **mesuré** (test direct) le plus récent,
  même exercice, même matériel. Une série sous-maximale n'est jamais prise
  pour un 1RM : aucune formule d'estimation n'est validée. Sans 1RM mesuré :
  « Référence 1RM à compléter pour calculer votre fourchette de charges. »
- **Tirage vertical supination** : aucune fourchette, aucun lien avec le 1RM
  du tirage vertical.

Ces fourchettes sont le **couloir** de la progression (§1 ter) : la S1 part
du bas, la progression ne dépasse jamais le haut.

Cadrage scientifique (pas une source de calcul) : méta-régression *Sports
Medicine* 2024, 269 études, 7 289 participants — la relation répétitions /
%1RM varie selon les individus, les exercices et les conditions
(https://pmc.ncbi.nlm.nih.gov/articles/PMC10933212/). Les fourchettes
ci-dessus sont des choix de programmation, pas des moyennes de l'article.

## 1 ter. Progression S1 → S4 (lot 6)

**Prescription** : S2, S3 et S4 reprennent exactement la S1 (séries,
répétitions, repos, consignes). Ce qui évolue, c'est la **charge**, selon ce
qui a été réellement fait.

### Mouvements à fourchette (développé couché, tirage vertical, squat Smith)

- **Ancre** : le 1RM mesuré utilisé au premier passage de l'exercice dans le
  cycle. Elle ne monte jamais en cours de cycle (un test plus haut sert au
  cycle suivant) ; un test plus bas s'applique tout de suite.
- **Charge cible** = ancre × % de la séance, sans arrondi. Première séance :
  le bas de la fourchette.
  Le champ kg s'ouvre sur cette charge cible ; on la modifie si les disques
  disponibles ne permettent pas de la charger.
- **Classement de la séance précédente**, dans cet ordre :
  1. **Échec** : une série enregistrée sous les répétitions prescrites.
  2. **Incomplète** : moins de séries que prescrit.
  3. **Sous-charge** : charge la plus basse ÷ ancre < % prescrit − 2,5 points,
     ou charge non saisie.
  4. **Dure** : RIR 0 saisi sur la dernière série.
  5. **Réussite** : RIR 1 ou plus saisi.
  6. **Réussite à confirmer** : pas de RIR saisi.
- **% suivant** :

| Classement | % suivant |
|---|---|
| Réussite | + 2,5, sans dépasser le haut de la fourchette |
| Réussite à confirmer | + 2,5 si la séance d'avant était déjà une réussite au même %, sinon le même |
| Dure, incomplète, sous-charge | le même |
| Échec, après une séance qui n'était pas un échec | le même |
| Échec, après un échec | − 5, sans descendre sous le bas ; si on y était déjà : suspendu |

- **Suspendu** : plus de % proposé, charge libre, « Référence à réévaluer ».
  Un nouveau test direct crée une nouvelle ancre et repart du bas.
- Une séance non faite ne compte pas. Les séries saisies sont toujours
  conservées. Le RIR (0, 1, 2, 3 ou plus) est facultatif et se saisit sur la
  dernière série seulement.

### Exercices complémentaires et push press

| Exercice | Progression |
|---|---|
| Développé incliné haltères | Plage |
| Écarté couché | Plage |
| Barre au front | Fixe |
| Extension triceps allongé | Plage |
| Rowing buste penché / Tirage horizontal large | Fixe |
| Tirage vertical supination | Plage |
| Pull-over poulie haute | Plage |
| Curl barre W | Fixe |
| Curl haltères | Fixe |
| Leg extension | Plage |
| Leg curl | Plage |
| Fentes avant / arrière / bulgares | Plage |
| Push press | Push press |
| Élévations frontales | Plage |
| Élévations latérales | Plage |
| Oiseau penché / Pec fly inversée | Plage |

- **Plage** : des répétitions prescrites à + 2. Toutes les séries au haut de
  la plage → augmenter la charge et revenir au bas. Une série sous le bas,
  deux séances de suite → baisser. Sinon : garder, viser + 1.
- **Fixe** (RPE prescrit, superset) : répétitions fixes. Deux séances
  complètes de suite à la même charge → augmenter. Une série manquée, deux
  séances de suite → baisser. Sinon : garder.
- **Push press** : 4 × 4 complet avec un RIR de 2 ou plus → augmenter. Sans
  RIR, la charge est gardée.
- Aucun kilo n'est calculé : MAJK dit « augmente », « garde » ou « baisse ».
  Une séance incomplète garde la charge.

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

- Fourchette du push press ; fourchette du squat à la barre libre.
- Fourchette au-delà du haut actuel (plafond atteint : refaire le combiné).
- Formules d'estimation du 1RM, protocole du combiné.
- Séries fractionnées (4 + 4 avec 5 à 10 s de pause) : à l'étude.
