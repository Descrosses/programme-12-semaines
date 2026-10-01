# Modèle de référence — programme de préparation athlétique

> Document extrait du dépôt `programme-12-semaines` (commit `4c8427f`, 26/09/2026), à coller tel quel dans un autre projet Claude.
> Il décrit **le programme et l'application qui le pilote**, sans aucune donnée personnelle.
>
> Convention de lecture :
> - **[DÉPÔT]** = présent dans le dépôt, repris tel quel (texte du `.md` ou constante du code).
> - **[PROPOSITION]** = ajout de ma part, **à valider** avant usage.
> - `{{variable}}` = valeur à renseigner pour chaque personne (liste complète dans `GUIDE_ADAPTATION.md`).
>
> Sources principales : `programme-final-12-semaines.md` (source de vérité déclarée), `src/data/*.ts` (transcription), `src/engine/*.ts` (règles automatisées), `plan-alimentaire-12-semaines.md`.

---

## 1. Philosophie du programme [DÉPÔT]

**Objectif** : préparation physique athlétique — force maximale, puissance (sauts, vitesse) et rattrapage de la chaîne postérieure — sur 12 semaines, encadrée par trois séries de tests (« combines »).

**Qualités visées** (§1 et §2 du `.md`) :
- Force absolue sur 4 mouvements de référence : Back Squat, Bench Press, Deadlift, Tractions lestées.
- Chaîne postérieure (ischios, fessiers, érecteurs, adducteurs) : « c'est le moteur du sprint et du saut ».
- Puissance : sauts et travail de vitesse « présents dès la semaine 1, faible volume, priorité qualité ».
- Haut du corps : « on l'entretient et on le fait progresser avec un volume raisonnable ».

**Logique générale** :
- Ratio hebdomadaire : **3 jours durs + 1 jour neuronal rapide + 1 jour modéré**. Justification du `.md` : « Cinq séances RPE 8-9 avec ton métier et deux enfants = plafond garanti en semaine 5. »
- Périodisation par blocs : accumulation → deload → force max → deload + tests → conversion force/puissance (contraste) → taper + tests.
- Le RPE pilote, le chiffre suit : « Le tableau est un plan initial. Le RPE prime sur le chiffre. »
- Rien n'est appliqué en silence : l'appli **propose** une charge, l'utilisateur accepte ou saisit la sienne.
- **Le vrai critère de réussite** (§13) : l'écart deadlift − squat. « S'il devient nul ou positif, la chaîne postérieure a rattrapé son retard. Si les 1RM montent mais que les sauts stagnent, le programme n'a produit que de la force : demi-échec, le bloc suivant sera orienté vitesse. »

> ⚠️ Cette philosophie est **construite sur un diagnostic individuel** (deadlift inférieur au squat). Pour une autre personne, la priorité n°1 doit venir de sa propre fiche de synthèse — voir `CORRESPONDANCE_QUESTIONNAIRE.md`.

---

## 2. Structure globale [DÉPÔT]

13 semaines au calendrier : **semaine 0 = semaine de tests (combine initial)**, puis semaines 1 à 12.

| Semaine(s) | Bloc (`Block`) | Intensité lifts principaux | Volume | Objectif |
|---|---|---|---|---|
| 0 | `test` — Combine initial | Tests 1RM | — | Établir les références : 1RM, sauts, sprint, référence de readiness |
| 1-3 | `accumulation` | 71-79 % | Élevé | Base de force, technique hinge, apprentissage des sauts |
| 4 | `deload` | 65 % | −50 % | Dissipation de fatigue |
| 5-7 | `maxforce` — Force maximale | 82-90 % | Moyen | Force absolue, longs repos |
| 8 | `deload` + combine intermédiaire | 70 % | −50 % | Récupération + tests athlétiques (pas de 1RM) |
| 9-11 | `power` — Conversion force → puissance | 84-89 % + vitesse 55-60 % | Bas | Contraste, RFD, fraîcheur |
| 12 | `taper` — Taper + combine final | Léger | Minimal | Tests |

Constantes du code (`src/data/program.ts`) :
```ts
WEEK_BLOCKS = { 0:'test', 1:'accumulation', 2:'accumulation', 3:'accumulation', 4:'deload',
  5:'maxforce', 6:'maxforce', 7:'maxforce', 8:'deload', 9:'power', 10:'power', 11:'power', 12:'taper' }
TRAINING_DAYS = [0, 2, 4, 5, 6]          // lundi, mercredi, vendredi, samedi, dimanche
WEEK_DAYS[0]  = [0, 1, 3, 4, 5]          // semaine de tests : lun, mar, jeu, ven, sam
```

Calendrier (`src/engine/calendar.ts`) : une seule ancre, **le lundi de la semaine de tests** (`startDate`). Formule : `date = startDate + semaine × 7 + jour` (jour 0 = lundi). L'appli refuse une ancre qui n'est pas un lundi et propose le lundi le plus proche.

---

## 3. Semaine de tests (combine initial, « semaine 0 ») [DÉPÔT]

> ⚠️ Dans le dépôt, la semaine de tests s'appelle **semaine 0** et précède les 12 semaines. Ta demande parle de « semaine 1 de tests » → voir Points à confirmer P1.
> ⚠️ Le `.md` (§12) et le code ne décrivent pas le même calendrier de tests → P2. **C'est la version du code qui est décrite ci-dessous** (la plus récente, commit `9b41446` « Restructure le combine initial sur six jours »).

Règle générale (§12) : « Même lieu, mêmes chaussures, même protocole, idéalement même heure. »
Règle de répartition (code) : « jamais deux efforts de tirage ou de préhension à moins de 48 h ».

| Jour | Séance | Durée | Tests (repos entre essais) |
|---|---|---|---|
| Lundi | Sauts, sprints, squat 1RM | 75 min | Broad Jump 3 essais (3 min) — Vertical Jump 5 essais (90 s) — Sprint 10 m et 20 m, 4 essais (4 min), « si la surface ne s'y prête pas, saute ce test » — **Back Squat 1RM** (paliers, 5 min) |
| Mardi | Tractions lestées 1RM | 40 min | **Tractions lestées 1RM** seule, repos 4 min |
| Mercredi | Repos | — | — |
| Jeudi | Deadlift 1RM | 45 min | **Deadlift 1RM** seul — « Si la barre ralentit franchement, c'est le max. » |
| Vendredi | Bench 1RM + ab wheel | 55 min | **Bench 1RM** puis Ab Wheel max strict |
| Samedi | Tractions max, leg raise, farmer | 50 min | Tractions strictes max (1 série) → Hanging Leg Raise max → Farmer Carry distance max (2 × `{{farmer_test_kg}}`). Ordre imposé, identique aux 3 combines. |
| Dimanche | Repos complet | — | « La semaine 1 démarre lundi, à froid. » |

Poids de corps : « moyenne de 3 matins, à jeun », relevé à la maison, saisi dans Réglages (jamais pendant la séance de test).

**Paliers de montée** (structure ; les kilos sont personnels) :
- Squat initial : 5 reps / 3 / 2 / 1 / 1, puis 2 essais (le dernier « si rapide »).
- Bench initial : 5 / 3 / 1 / 1, puis 3 essais (le dernier optionnel).
- Deadlift initial : 5 / 3 / 2 / 1 / 1, puis 3 essais « selon vitesse ».
- Tractions lestées initial : 3 / 1 / 1, puis 2 essais.
Les % dérivés de chaque palier (par rapport au 1RM *estimé*) sont dans `modele-vierge.json` (`seances_ecrites[*].slots[*].ramp[*].pct_derive`). Exemple squat : 43 % / 57 % / 71 % / 82 % / 93 % puis essais à 102 % et 105 % de l'estimation.

**Comment les résultats alimentent le programme** :

| Résultat | Où il va | Effet | Statut |
|---|---|---|---|
| Meilleur broad jump | `Settings.broadJumpBaselineCm` | Référence **figée** du readiness pour 12 semaines | [DÉPÔT] |
| 4 × 1RM (squat, bench, deadlift, tractions lestées) | `Settings.oneRM` | Utilisé **uniquement** par le readiness ROUGE (65 % du 1RM) | [DÉPÔT] |
| 4 × 1RM | Tableau §9 des charges | **Recalcul manuel** : « Chaque case garde le pourcentage que le programme visait, appliqué au vrai maximum et arrondi au 2,5 kg. » Le code ne recalcule rien : les kilos sont écrits en dur. | [DÉPÔT] (manuel) |
| 4 × 1RM | Paliers du combine final (S12) | Recalcul manuel : « les mêmes rapports de montée que le test initial, appliqués au maximum mesuré, arrondis au 2,5 kg ». Dernier palier deadlift ramené à 93 %. | [DÉPÔT] (manuel) |
| 4 × 1RM | Cibles à 12 semaines (§13) | « Chaque cible garde la progression relative que le programme visait, appliquée au vrai départ : squat +7 à +11 %, bench +4 à +6 %, tractions lestées +13 %, deadlift +15 à +19 %. » | [DÉPÔT] |
| 1RM squat | Speed Squat | « 55 % en accumulation, 60 % en force max et en puissance, 50 % en deload et au taper », arrondi au 2,5 kg le plus proche | [DÉPÔT] |
| 1RM | Charges du tableau (squat, bench, deadlift, tractions, front squat, speed squat) | `charge = arrondi_2,5(1RM × pct)` avec les % du JSON | **[VALIDÉ le 01/10/2026]** |

---

## 4. Semaine type [DÉPÔT]

| Jour | Séance | Durée | Intensité | Échauffement | Readiness |
|---|---|---|---|---|---|
| Lundi | Lower Strength — squat | 65-70 min | DUR | Lower | Oui |
| Mardi | Repos | — | — | — | — |
| Mercredi | Upper Strength — bench + tractions | 65 min | DUR | Upper | Non |
| Jeudi | Repos | — | — | — | — |
| Vendredi | Total Body Power — sauts, vitesse | 60 min | RAPIDE | Lower | Oui |
| Samedi | Posterior Chain — deadlift | 90 min | DUR | Lower | Oui |
| Dimanche | Upper Athletic + tronc + conditioning | 80-90 min | MODÉRÉ | Upper | Non |

« Pourquoi cet ordre : vendredi (neuronal, peu de dommages) potentialise samedi ; dimanche = haut du corps pour que les jambes récupèrent entre le deadlift du samedi et le squat du lundi. »

**Répartition par qualité** (comptée sur les trames S1-3, champ `role` / `fn` du code) :

| Qualité | Lundi | Mercredi | Vendredi | Samedi | Dimanche |
|---|---|---|---|---|---|
| Force (lift principal, `main`) | Back Squat | Bench, Tractions lestées | Push Press, Speed Squat | Deadlift, Front Squat | — |
| Explosivité (`power`) | Pogo, Box Jump | Plyo Push-Up | Broad Jump, Hang High Pull, Lateral Bound, Jump Squat | Broad Jump | — |
| Chaîne postérieure (`fn: hinge`) | RDL | — | (Hang High Pull) | Deadlift, Hip Thrust, Nordic, Single-Leg RDL | — |
| Gainage / tronc (`core`) | Ab Wheel | Pallof Press | Dead Bug | Copenhagen Plank | Cable Chop, Leg Raise, Bear Crawl |
| Portés (`carry`) | — | — | Farmer Carry | Suitcase Carry | — |
| Accessoires haut | — | Landmine, Row, Face Pull, Rot. externe | Explosive Cable Row | — | Incline DB Press, Tractions neutres, Cable Row, Landmine |
| Conditioning | — | — | — | — | 8 × (20 s / 70 s) |

---

## 5. Format d'une séance [DÉPÔT]

### 5.1 Échauffements (§6)
- **Lower (8-10 min)** : 3 min vélo, ankle rocks × 10/côté, 90/90 hip switch × 8, adductor rockback × 8, glute bridge × 10, squat poids du corps × 10, puis montées de charge.
- **Upper (7-9 min)** : 3 min rameur, band pull-apart × 15, scap push-up × 10, rotation externe câble × 12, pompes × 8, puis montées de charge.
Dans l'appli : listes cochables, chaque item a un `id` stable.

### 5.2 Ordre dans la séance
Échauffement → readiness (jours jambes) → explosif d'abord (à froid du point de vue nerveux) → lift principal → accessoires → tronc / portés → conditioning.

### 5.3 Champs d'un exercice dans une séance (`Slot` / `Exercise`)
| Champ | Contenu | Exemple |
|---|---|---|
| `exId` | identifiant **gelé** (clé de l'historique) | `back-squat` |
| `sets` | séries | 5 |
| `work` | `reps` (nombre, fourchette `{min,max}`, `'max'`, `perSide`), `distance` (m), `time` (s), `intervals` (rounds/workSec/easySec), `attempts`, `maxSet` | 5 reps |
| `load` | `barbell` (pas 2,5), `dbPair` / `dbSingle` (pas 2), `added` (lest), `pct1RM`, `autoreg` (charge tirée de l'historique, avec `seed` de départ), `bodyweight`, `text`, `none` | barre |
| `targetRPE` | intervalle `{min,max,label}` : « RPE 7 », « RPE 7-8 », « RPE ≤ 7 », ou `null` | RPE 7 |
| `restSec` | repos en secondes | 210 |
| `liftId` | si présent, séries/reps/charge/RPE sont lus dans le tableau §9 | `back-squat` |
| `note`, `ramp`, `contrastWith` | précision, paliers de test, explosif intercalé | |

Fiche exercice (`ExerciseDef`) : `name`, `fn` (squat, hinge, push, pull, jump, core, carry, conditioning, mobility, test), `role` (main, accessory, power, core, carry, conditioning, test), `intent` (consigne), `cues`, `progressionRule` (texte), `altBasicFit` (alternative matériel), `explosive`, `measure` (cm, kg, reps, m, s).

### 5.4 Règle pour tous les mouvements explosifs (§5) — reprise telle quelle
> Chaque répétition est une tentative de performance. Reset complet entre les reps (5-10 s).
> Tu arrêtes l'exercice quand : la distance ou la hauteur baisse d'environ 5 %, le contact au sol devient lent, la réception devient lourde, ou tu ne te sens plus explosif. Jamais de séries de 10-15 box jumps. Un exercice de puissance qui ralentit est terminé, même si des séries sont écrites.

### 5.5 Temps de repos (§10) — repris tel quel
| Travail | Repos |
|---|---|
| Pogo, dead bug, tronc léger | 45 s |
| Bounds, plyo push-up, box jump | 75-90 s |
| Broad jump, jump squat | 90 s à 2 min |
| Contraste (sem. 9-11) | 2 min lourd → explosif, 2 min explosif → lourd (90 s après bench) |
| Squat / deadlift 71-79 % | 3 min 30 |
| Squat / deadlift 82-90 % | 4 min |
| Bench / tractions 71-79 % | 3 min / 2 min 30 |
| Bench / tractions 82-90 % | 3 min 30 / 3 min |
| Speed squat | 60 s → 75 s → 90 s selon bloc |
| Push press | 2 min → 2 min 30 |
| RDL, hip thrust, front squat, Bulgarian | 90 s à 2 min 30 |
| Accessoires haut, carries | 60-90 s |

« Chronomètre. Un repos raccourci sur un lift lourd transforme la force en fatigue. »
Code : « les valeurs exactes de §7 priment sur les fourchettes de §10. Quand §7 donne lui-même une fourchette (« 45-60 s »), on retient la borne haute. »

### 5.6 Les 5 séances de référence (S1-3)
Le détail complet (séries, reps, RPE, repos, tempo, consignes) est dans `modele-vierge.json` → `trames_semaine_type` et `exercices`. Résumé :

- **Lundi** : Pogo Jumps 3×10 (45 s) · Box Jump 4×3 (90 s) · Back Squat [tableau] tempo 3-0-X (3 min 30) · Bulgarian Split Squat 3×8/jambe RPE 7-8, tempo 3-1-X-0 (90 s) · RDL [tableau] tempo 3-1-X-1 (2 min 30) · Ab Wheel 3×8 (60 s).
- **Mercredi** : Plyo Push-Up 4×4 (90 s) · Bench [tableau] tempo 2-1-X-0 (3 min) · Tractions lestées [tableau] (2 min 30) · Landmine Press half-kneeling 3×8/côté RPE 7 (75 s) · Chest-supported DB Row 3×8 RPE 8 (90 s) · Face Pull 2×15 + Rotation externe 2×12/côté (45 s) · Pallof Press Step-Out 3×6/côté (60 s).
- **Vendredi** : Broad Jump 5×2 (2 min) · Hang High Pull 3×3 (90 s) · Lateral Bound 3×3/côté (75 s) · Push Press [tableau] (2 min) · Speed Squat [tableau] (60 s) · Jump Squat haltères 4×4 (90 s) · Explosive Cable Row 3×5 RPE 6 (75 s) · Farmer Carry 4×25 m (90 s) · Dead Bug câble 3×6/côté (45 s). « Tu dois sortir en te disant « j'aurais pu en faire plus ». »
- **Samedi** : Broad Jump 3×2 potentiation (90 s) · Deadlift [tableau] (3 min 30) · Front Squat [tableau] (2 min) · Hip Thrust 4×8 RPE 8 (90 s) · Nordic Curl 3×5 (2 min) · Single-Leg RDL 3×8/côté (60 s) · Copenhagen Plank 3×8/côté (60 s) · Suitcase Carry 3×30 m/côté (60 s).
- **Dimanche** : Incline DB Press 4×8 RPE 7-8 (90 s) · Tractions prise neutre 4×6-8 RPE 7 (90 s) · One-Arm Cable Row 3×10/côté (75 s) · Landmine Press debout 3×8/côté (75 s) · Cable Chop 3×8/côté (60 s) · Hanging Leg Raise 3×8-12 (60 s) · Bear Crawl 3×20 m (60 s) · Conditioning 8 × (20 s / 70 s) vélo ou rameur, « 8/10 sur les 20 s, pas de sprint maximal ».

### 5.7 Modifications par bloc (§8) — reprises telles quelles

**Semaines 4 et 8 — Deload**
- Lifts principaux : 3 × 3 à 65-70 % (voir tableau)
- Accessoires : 2 séries au lieu de 3-4, −20 %
- Sauts : volume divisé par 2, intention maximale conservée
- Aucun Nordic difficile, aucun conditioning
- Zéro série au-dessus de RPE 6
- Semaine 8 : combine intermédiaire samedi + dimanche (section 11), les lifts restent à 70 %

Encodage (`DELOAD_POLICY`) : `accessorySets: 2`, `accessoryLoadFactor: 0.8`, `jumpVolumeDivisor: 2`, `maxRPE: 6`, `removeExIds: ['nordic-curl', 'conditioning', 'zone2-bike']`. Base de calcul décidée : « 80 % de la charge RÉELLE de la dernière semaine non-deload du même exercice ». Sauts : `sets = max(1, ceil(sets / 2))`.

**Semaines 5-7 — Force maximale**
- Squat, Bench, Deadlift, Tractions : 5 × 3 → 4 × 3 → 4 × 2 à 82-90 %
- Repos : **4 min** squat/deadlift, **3 min 30** bench/tractions
- Fini le tempo 3 s : descente contrôlée ~2 s, remontée intention maximale
- Box Jump 4 × 2, repos 2 min
- Bulgarian 4 × 5/jambe RPE 8, repos 2 min
- RDL 3 × 6 × 90 kg → 4 × 5 × 92,5-95 kg *(kilos personnels → `{{rdl_s5_kg}}` … `{{rdl_s7_kg}}`)*
- Front Squat 4 × 5 → 4 × 4
- Hip Thrust 4 × 6 RPE 8, repos 2 min
- Accessoires haut : 3 × 6 au lieu de 3 × 8, +10 %
- Hang High Pull 4 × 3, repos 2 min
- Push Press 6 × 2, RPE 6-7, repos 2 min 30
- Speed Squat 6 × 2 × 65 kg (60 %), repos 75 s *(→ 60 % de `{{back_squat_1rm}}`)*
- Dimanche : tout à 3 séries, conditioning 6 × 20 s / 100 s

**Semaines 9-11 — Conversion force → puissance (contraste)**
« Principe : série lourde → repos → mouvement explosif → repos → série lourde suivante. C'est du contraste, pas un superset. »

| Jour | Lourd | Explosif | Repos lourd → explosif | Repos explosif → lourd |
|---|---|---|---|---|
| Lundi | Back Squat | Box Jump × 2 | 2 min | 2 min (cycle ≈ 4 min) |
| Mercredi | Bench | Plyo Push-Up × 3 | 90 s | 2 min (cycle ≈ 3 min 30) |
| Samedi | Deadlift | Broad Jump × 2 | 2 min | 2 min (cycle ≈ 4 min) |

Autres changements (texte §8) : lundi — pogos et box jumps de début de séance supprimés, Bulgarian 3 × 5, RDL 3 × 5 RPE 7, Ab Wheel 3 × 8. Mercredi — tractions lestées 3 × 3 intention explosive, repos 3 min, Landmine explosif 4 × 5/côté RPE 6, Row 3 × 6, Pallof 3 × 5. Vendredi — Broad Jump 5 × 2, Hang High Pull 4 × 3 (« la charge ne monte que si les reps restent vives »), Pogo 3 × 10, Lateral Bound 4 × 2/côté (90 s), Push Press 6 × 2 RPE 6-7, Speed Squat 8 × 2 (90 s), Jump Squat 5 × 3 (2 min), Farmer 3 × 20 m ; « Pas de dead bug, pas de conditioning. Tu quittes la salle stimulé, pas détruit. » Samedi — Hip Thrust 4 × 5 explosif, Front Squat 3 × 3 RPE 7, Nordic 2 × 4 seulement, Copenhagen 3 × 5, Suitcase 3 × 20 m. Dimanche — Incline 3 × 6-8, tractions 3 × 5-6, row 3 × 8, landmine 2 × 8, chop 3 × 6, leg raise 3 × 8, bear crawl 3 × 15 m ; conditioning facultatif 10-15 min zone 2 vélo.

**Semaine 12 — Taper + tests** (version du code) : lundi = seule vraie séance (Box Jump 3×2, Squat 3×2 RPE 5-6, Bulgarian 2×5 léger, Ab Wheel 2×6, + Bench 3×2 et Push Press 3×2 « placés le lundi, après le squat ») · mercredi TEST Deadlift 1RM · vendredi tests athlétiques (45 min max) + speed squat léger · samedi TEST Back Squat 1RM + Farmer · dimanche TEST Bench 1RM + tractions lestées 1RM + Ab Wheel max.

### 5.8 Tableau des charges §9 (structure)
Une ligne par semaine, une colonne par lift : Back Squat (lun), Bench (mer), Deadlift (sam), Tractions lestées (mer), Push Press (ven), Front Squat (sam), Speed Squat (ven), + ligne RDL. Schémas séries × reps et RPE cibles :

| Sem | Squat / Bench | Deadlift | Tractions lestées | Push Press | Front Squat | Speed Squat |
|---|---|---|---|---|---|---|
| 1 | 5×5 RPE 7 | 4×5 RPE 7 | 4×5 | 5×3 | 3×6 | 6×2 |
| 2 | 5×5 RPE 7,5 | 4×5 RPE 7,5 | 4×5 | 5×3 | 3×6 | 6×2 |
| 3 | 5×4 RPE 8 | 4×4 RPE 8 | 4×4 | 6×2 | 3×6 | 6×2 |
| 4 | 3×3 RPE 5 | 3×3 RPE 5 | 3×3 | 3×3 | 2×5 | 4×2 |
| 5 | 5×3 RPE 8 | 4×3 RPE 8 | 4×3 | 6×2 | 4×5 | 6×2 |
| 6 | 4×3 RPE 8,5 | 3×3 RPE 8,5 | 4×3 | 6×2 | 4×4 | 6×2 |
| 7 | 4×2 RPE 9 | 3×2 RPE 9 | 4×2 | 6×2 | 4×4 | 6×2 |
| 8 | 3×3 RPE 5 | 3×3 RPE 5 | 3×2 | 3×2 | 2×4 | 4×2 |
| 9 | 4×2 + contraste | 3×2 + contraste | 3×3 | 6×2 | 3×3 | 8×2 |
| 10 | 4×2 + contraste | 3×2 + contraste | 3×3 | 6×2 | 3×3 | 8×2 |
| 11 | 4×1-2 + contraste | 3×1-2 + contraste | 3×2 | 6×2 | 3×3 | 8×2 |
| 12 | 3×2 puis TEST | TEST mer | TEST dim | 3×2 | — | 2×2 |

RPE complétés par le code (décisions documentées) : tractions lestées alignées sur le bench de la même semaine ; Push Press « ≤ 7 » S1-3, « 6-7 » S5-7 et S9-11, « ≤ 6 » en deload ; S9-11 sans RPE (« la vitesse de barre pilote ») ; Speed Squat jamais de RPE.

**% du 1RM mesuré correspondant à chaque case** (dérivés en divisant les kilos du dépôt par les 1RM mesurés) — **[VALIDÉ le 01/10/2026]** :

| Sem | Back Squat | Bench | Deadlift | Tractions (lest) | Front Squat (÷ squat) |
|---|---|---|---|---|---|
| 1 | 70,5 % | 73,9 % | 75,0 % | 44,4 % | 54,5 % |
| 2 | 75,0 % | 76,1 % | 78,6 % | 50,0 % | 54,5 % |
| 3 | 79,5 % | 78,3 % | 82,1 % | 55,6 % | 56,8 % |
| 4 | 63,6 % | 67,4 % | 66,1 % | 22,2 % | 45,5 % |
| 5 | 81,8 % | 82,6 % | 83,9 % | 66,7 % | 59,1 % |
| 6 | 86,4 % | 84,8 % | 89,3 % | 72,2 % | 63,6 % |
| 7 | 88,6 % | 89,1 % | 92,9 % | 77,8 % | 63,6 % |
| 8 | 70,5 % | 71,7 % | 69,6 % | 33,3 % | 50,0 % |
| 9 | 84,1 % | 82,6 % | 85,7 % | 66,7 % | 63,6 % |
| 10 | 86,4 % | 84,8 % | 91,1 % | 72,2 % | 65,9 % |
| 11 | 88,6 % | 89,1 % | 92,9 % | 77,8 % | 68,2 % |
| 12 | 70,5 % | 71,7 % | TEST | TEST | — |

Formule retenue : `charge = arrondi_au_pas(1RM_mesuré × pct)`, pas = 2,5 kg (barre). Push Press et RDL : **pas de %** — charge choisie à la 1re séance au RPE cible, puis règles §11 (décision P7).

---

## 6. Règles de progression

### 6.1 Texte du programme (§11) — repris tel quel [DÉPÔT]

> **Cas 1 — RPE atteint = RPE prévu** → programme inchangé.
>
> **Cas 2 — beaucoup trop facile (RPE 6-6,5 pour 8 prévu)** → séance suivante : +5 kg bas du corps, +2,5 kg haut du corps, pas davantage. On ne récompense pas une bonne journée en sabotant la semaine suivante.
>
> **Cas 3 — légèrement trop facile (RPE 7 pour 8 prévu)** → +2,5 kg sur les gros mouvements.
>
> **Cas 4 — RPE 9 pour 8 prévu** → répète la même charge la semaine suivante. Si ça se reproduit deux fois : recalcule le tableau à −5 %.
>
> **Cas 5 — rep ratée** → ne retente pas. −5 à −7,5 %, termine le volume à RPE ≤ 8. Semaine suivante : reconstruction sur 2 semaines. Les échecs sur squat/bench/deadlift doivent être exceptionnels.
>
> **Cas 6 — mauvaise journée (boulot, enfants, sommeil)** → feu tricolore section 4. Ne saute pas la séance, adapte-la.
>
> **Cas 7 — performances explosives en baisse deux semaines de suite** (broad jump, box jump, vitesse de barre) → lifts principaux à 3 séries, suppression du conditioning. Si ça persiste 10 jours : deload anticipé.
>
> Règle générale : un exercice progresse quand la dernière série sort au RPE prévu avec la même technique que la première.

### 6.2 Constantes du code (`src/data/program.ts`) — reprises telles quelles [DÉPÔT]
```ts
export const PROGRESSION_RULES = {
  /** Cas 2 : RPE 6-6,5 pour 8 prévu. */
  wayTooEasy: { rpeGapAtLeast: 1.5, lowerBodyKg: 5, upperBodyKg: 2.5 },
  /** Cas 3 : RPE 7 pour 8 prévu. */
  slightlyTooEasy: { rpeGapAtLeast: 0.5, kg: 2.5 },
  /** Cas 4 : RPE 9 pour 8 prévu → même charge. Deux fois de suite → tableau −5 %. */
  tooHard: { repeatSameLoad: true, recalcAfterOccurrences: 2, recalcFactor: 0.95 },
  /** Cas 5 : rep ratée → −5 à −7,5 %, on retient −7,5 % (le plus prudent). */
  missedRep: { loadFactor: 0.925, rebuildWeeks: 2 },
  /** Cas 7 : sauts en baisse 2 semaines de suite. */
  explosiveDecline: { weeks: 2, mainLiftSets: 3, removeConditioning: true, deloadAfterDays: 10 },
} as const;
```

### 6.3 Formules du moteur (`src/engine/progression.ts`) — reprises telles quelles [DÉPÔT]
Modèle : **progression cumulative par décalage**.
```
décalage   = dernière charge réelle − charge que le plan annonçait ce jour-là
suggestion = charge du plan cette semaine + décalage + ajustement §11
```
Classement (dans cet ordre) :
1. `last.failed` → **cas 5** (prioritaire sur tout).
2. Exception deadlift : `exerciseId === 'deadlift' && week === 1 && rpe <= 6` → **cas 2** (voir P5).
3. `rpe > target.max` → **cas 4** ; compte des occurrences consécutives trop dures.
4. `gap = target.min − rpe` ; `gap >= 1.5` → **cas 2** ; `gap >= 0.5` → **cas 3**.
5. Sinon → **cas 1**.

Suggestions chiffrées :
- Cas 1 : `arrondi(plan + décalage)`, plafonné (`kgMax`).
- Cas 2 : `arrondi(plan + décalage + bump)`, `bump = 5` si bas du corps (`fn` ∈ squat, hinge, jump, carry) sinon `2.5`.
- Cas 3 : `arrondi(plan + décalage + 2.5)`.
- Cas 4 : même charge que la dernière ; si `consécutives >= 2` → `arrondi(dernière × 0.95)`.
- Cas 5 : `roundIntoRange(dernière × 0.925, dernière × 0.95, pas)` (multiple du pas le plus proche de −7,5 %, dans l'intervalle).
- Sans RPE cible (contraste, taper, Speed Squat, Hang High Pull) : on reporte seulement le décalage, aucune règle.
- Pas d'historique ou dernière séance sautée : on affiche le plan, sans mention de cas.
- Cas 2 à 5 : `requiresConfirm: true` — **jamais appliqué sans un geste de l'utilisateur**.

Arrondis (`src/engine/rounding.ts`) : « 2,5 kg pour tout ce qui se charge en barre, 2 kg pour les haltères » (1 kg pour les poulies), arrondi au plus proche, départage vers le haut.

### 6.4 Ordre d'application dans une séance (`getSession.ts`) [DÉPÔT]
1. trame de départ (séance écrite S0/S8/S12, sinon trame §7 du jour) → 2. règles de bloc §8 → 3. deload → 4. tableau §9 → 5. progression §11 (suggestion) → 6. feu tricolore §4 (appliqué à la charge affichée ET à la suggestion) → 7. cas 7 (sauts en baisse).

### 6.5 Règles de progression propres à certains exercices [DÉPÔT — affichées, pas automatisées]
- Bulgarian : « 8 reps propres à RPE ≤ 7,5 → +2 kg par haltère. »
- Hang High Pull : « +2,5 kg quand les 3 reps de toutes les séries restent rapides et propres. »
- Push Press : « +2,5 kg quand les reps de toutes les séries sont rapides. »
- Farmer Carry : « +2 kg quand les 25 m sont tenus sans ralentir. »
- Front Squat : « +2,5 kg par semaine si le RPE est conforme. »
- Hip Thrust : « +10 kg quand le RPE est ≤ 7. »
- RDL : « S2 : 85 kg, S3 : 90 kg si RPE conforme. »
Ces textes s'affichent sur la fiche de l'exercice ; seul le moteur §11 calcule (voir P10).

---

## 7. Test de readiness (feu tricolore, §4) [DÉPÔT]

**Quand** : avant chaque séance jambes (lundi, vendredi, samedi), après l'échauffement.
**Protocole** : « 3 Broad Jumps, repos 1 min entre chaque, note le meilleur. »
**Référence** : meilleur broad jump du combine initial, figé (`broadJumpBaselineCm`). Le `.md` dit autre chose → P3.

**Scoring** :
```
pctDelta = (saut_du_jour − référence) / référence × 100
pctDelta ≥ −2 %          → VERT
−5 % < pctDelta < −2 %   → ORANGE
pctDelta ≤ −5 %          → ROUGE   (« le "ou pire" est inclusif : à exactement −5 %, c'est rouge »)
```
Constantes :
```ts
READINESS_THRESHOLDS = {
  greenPct: -2, orangePct: -5,
  orange: { mainLoadFactor: 0.95, accessorySetsDelta: -1 },
  red: { pctOf1RM: 0.65, sets: 3, reps: 3 },   // « technique à 60-70 % » → 65 %, milieu de fourchette
}
BIG_MOVEMENT_IDS = ['back-squat','bench-press','deadlift','front-squat','rdl','hip-thrust','bulgarian-split-squat']
```

**Décisions** (texte §4, repris tel quel) :
- « Référence à −2 % ou mieux → **VERT** : séance complète. »
- « Référence −2 % à −5 % → **ORANGE** : −5 % sur les gros mouvements, une série de moins sur les accessoires. »
- « Référence −5 % ou pire → **ROUGE** : pas de travail RPE 8+. Technique à 60-70 % sur le lift principal (3 × 3), tronc, mobilité, et tu rentres. »
- « Le rouge se déclenche aussi sans test si : moins de 5 h de sommeil + courbatures généralisées + échauffement anormalement lourd. » (codé dans `manualRed`, **non branché dans l'interface** → P4)

Application par le code : ORANGE = gros mouvements (liste ci-dessus + tout `role: main`) × 0,95, accessoires −1 série (min 1). ROUGE = lifts principaux remplacés par 3 × 3 à 65 % du 1RM des Réglages, on ne garde que `core` et `mobility`, tout le reste (explosif compris) est retiré.

**Cas 7 (`trends.ts`)** : meilleur saut de readiness par semaine ; si 2 baisses consécutives → lifts principaux à 3 séries, conditioning supprimé ; si le déclin dure ≥ 10 jours depuis le dernier pic → message « deload anticipé ».

---

## 8. Onglet « Combine » [DÉPÔT]

**À quoi il sert** : saisir et comparer les **trois combines** (initial, intermédiaire S8 sans 1RM, final S12), et suivre le critère central du programme.

**Organisation** (`src/screens/CombineScreen.tsx`) :
1. Sélecteur de phase : *Initial* (avant la semaine 1) · *Intermédiaire* (semaine 8, sans 1RM) · *Final* (semaine 12).
2. Carte **« Écart deadlift − squat »** : « Le vrai critère du programme. S'il devient nul ou positif, la chaîne postérieure a rattrapé son retard. » Vert si ≥ 0, orange sinon ; légende calculée uniquement à partir des combines saisis.
3. **Tableau de comparaison** : une ligne par mesure (poids, broad jump, vertical jump, sprint 10 m, sprint 20 m, 4 × 1RM, tractions strictes max, farmer carry, ab wheel max, leg raise max) × colonnes Initial / S8 / Final / Cible. Flèche inversée pour les sprints (plus bas = mieux).
4. **Saisie guidée** : une carte par mesure, avec la consigne, les **paliers** (ceux du test initial pour les phases initial/S8, ceux recalculés pour le final), un pavé +/− adapté à l'unité (cm pas 5, s pas 0,1, m pas 5, kg pas 2,5, reps pas 1). Le poids peut être repris des Réglages.
5. Bouton « Enregistrer le combine » (stocké en base locale, table `combines`, clé `phase`).

Cibles à 12 semaines (§13), en relatif — reprises telles quelles : Deadlift +15 à +19 % · Back Squat +7 à +11 % · Bench +4 à +6 % · Tractions lestées +13 % · Broad Jump +5 à 8 % · Vertical Jump +4 à 6 cm · Sprint 10 m −2 à 4 % · Farmer Carry +20 % distance · Ab Wheel +20-30 % reps. (Tractions strictes et poids : cibles en absolu, personnelles.)

---

## 9. Fonctionnalités de l'appli [DÉPÔT]

PWA React + TypeScript + Vite, **100 % hors ligne**, données uniquement sur l'appareil (IndexedDB via Dexie) : « pas de compte, pas de serveur, pas de base distante ».

| Onglet | Fonction |
|---|---|
| **Aujourd'hui** | Séance du jour d'après le calendrier (ou repos / prochaine séance / avant le début / programme terminé), raccourci nutrition, rappel de poids avant un combine |
| **Semaine** | Sélecteur de semaine 0 à 12 coloré par bloc, liste des jours → ouverture d'une séance. La semaine consultée est retenue d'un onglet à l'autre |
| **Séance** | Échauffement cochable, readiness (3 sauts → verdict qui modifie la séance affichée), cartes d'exercice : ligne de charge, suggestion §11 à accepter/refuser, saisie charge/reps/RPE/échec par série (pavé numérique), « dernière performance réelle » sous chaque exercice, remarque libre par exercice, fiche technique dépliable (consignes, alternative matériel, règle de progression), photo/vidéo de référence du mouvement, explication de chaque ajustement (bloc, deload, orange, rouge, cas 7, plafond) |
| **Nutrition** | Palier entraînement/repos, repas décomposés en aliments modifiables (quantité et composition, étiquette en main), écart repas ↔ cible, « carburant du jour », pesée du matin + tour de taille, moyenne 7 jours, conseil d'ajustement |
| **Progrès** | Courbes de charge par lift, broad jump de readiness, RPE moyen par séance, suivi photo hebdomadaire avec comparaison |
| **Combine** | Voir §8 |
| **Réglages** | Date de début (lundi), poids de corps, référence broad jump, 1RM testés, son/vibration de fin de repos, export/import JSON de toutes les données, export des photos, remise à zéro |

**Chrono de repos** (`src/timer/restTimer.ts`, `RestBar.tsx`) : lancé à la validation d'une série avec le `restSec` de l'exercice. Il **ne décompte pas** : il stocke l'horodatage de fin (localStorage) et recalcule le temps restant, donc il reste juste après verrouillage ou fermeture de l'appli. Barre persistante : temps restant, libellé, « +30 s », « Passer », dépassement affiché « +0:12 ». Fin : bip (Web Audio), vibration, notification locale via le service worker. **Screen Wake Lock** pendant le repos (« écran allumé » / « écran non tenu »). Limite connue : pas d'alerte sonore écran verrouillé sur iPhone.

Mise à jour : bandeau « Nouvelle version disponible » (pas de rechargement automatique en pleine série). Déploiement : GitHub Actions → tests + typecheck + build → GitHub Pages. Les tests relisent le `.md` et vérifient le tableau §9 case par case : « si le programme change, ou si la transcription dérive, le déploiement échoue ».

---

## 10. Plan alimentaire [DÉPÔT]

Principes (`plan-alimentaire-12-semaines.md`), repris tels quels :
- « Beaucoup de glucides, protéines élevées, lipides modérés. Les glucides se concentrent autour de l'entraînement (avant/après). »
- « **Deux paliers, pas plus** : jour d'entraînement et jour de repos. Le jour de repos garde les six prises et les mêmes protéines : on allège uniquement les féculents. »
- 6 prises : réveil, collation, collation, déjeuner, autour de la séance (avant 1 h 30 / après 45 min), dîner.
- Hydratation : « utilise la couleur des urines comme repère. Pas de règle rigide du type « 3 L obligatoires ». »
- Complément : « créatine monohydrate, 5 g/jour ». « La whey est un dépannage pratique, pas une obligation. »
- Règles simples : « Une protéine à chaque repas, sans exception. Glucides concentrés avant et après l'entraînement. Légumes à volonté. Moyenne 7 jours, jamais une pesée isolée. »

Suivi et ajustement (texte) :
- « Moyenne 7 jours stable (moins de 150-200 g de variation) sur 2-3 semaines → ajoute 50 g de féculent au dîner. »
- « Moyenne 7 jours qui monte de plus de 400-500 g/semaine, plusieurs semaines de suite, avec tour de taille qui suit → retire 50 g de féculent au dîner. »
- « Objectif de vitesse de prise : environ +0,15 à +0,30 kg/semaine en moyenne. »

Seuils codés (`ADJUST_RULES`, bord prudent de chaque fourchette) : `stableKg: 0.15`, `stableWeeks: 3`, `fastGainKg: 0.4`, `fastGainWeeks: 2`, `waistRiseCm: 0.5`.

Carburant du jour (décision de l'utilisateur, hors `.md`) : bonus glucidique facultatif selon la séance — lundi et samedi « CARBURANT ++ » (≈ +240 kcal), vendredi et dimanche « CARBURANT + » (≈ +145 kcal), mercredi « STANDARD », repos « REPOS ». Jamais ajouté aux totaux.

Le plan est **personnel** (objectif prise de masse, calories, horaires) : dans `modele-vierge.json`, cibles et quantités sont des variables. Le dépôt **ne contient aucune formule** pour calculer les besoins d'une autre personne → P12. **Décision : protéines à 2 g/kg par défaut**, ajustées selon le questionnaire.

---

## 11. Historique des modifications importantes (git log résumé) [DÉPÔT]

60 commits du 08/09/2026 au 26/09/2026.
- **08/09** — Première version : données, moteur, écran séance, PWA ; puis écrans Aujourd'hui, Semaine, Progression, Combine, Réglages ; bandeau de mise à jour.
- **PR #1-3** — Combine regroupé en semaine 0, saisie clavier ; onglet Nutrition (cibles, suivi de poids, ajustement) ; suivi visuel + documentation des mouvements ; **combine initial restructuré sur six jours (lun→sam)**.
- **PR #4-8** — Tableau §9 recalé sur les 1RM réellement testés ; choix photo depuis la pellicule ; fiche technique séparée du suivi ; collation du matin et écart repas/cible.
- **PR #9-15** — Plan alimentaire refait pour atteindre vraiment 3600/3100 kcal ; carburant du jour ; dates recalculées quand la date de début change ; jour de repos à six prises allégées ; aliments modifiables ; alerte excédent/déficit distinguée.
- **PR #16-21** — Les charges §9 ne dépendent plus du 1RM des Réglages ; champ de charge sur chaque exercice ; Speed Squat et Front Squat recalés sur le squat testé ; tout §9 recalé sur les 1RM du combine ; cibles §13 recalées ; paliers du test final recalés.
- **PR #22-26** — Semaine consultée retenue entre onglets ; **Hang High Pull ajouté le vendredi** ; remarque libre par exercice ; dernière performance réelle sous chaque exercice ; correctif « une occurrence est une séance, pas une semaine ».

Leçon tirée de l'historique : les estimations de 1RM d'avant test étaient fausses jusqu'à 27 % (squat estimé 140, mesuré 110), ce qui a obligé à recalculer à la main tout le tableau. **C'est l'argument principal pour faire calculer les charges à partir des tests de la semaine de tests** [PROPOSITION].

---

## 12. Ce que le dépôt ne contient pas

Aucune notion de questionnaire, de fiche de synthèse, de profil multi-utilisateur, de variante à 2/3/4 séances, de version maison ou extérieure, d'adaptation santé (blessure, post-partum, senior, adolescent), ni de formule de calcul calorique. Tout ce qui touche à ces sujets dans les autres fichiers est **[PROPOSITION]**.

---

## 13. Points à confirmer

### Décisions prises le 01/10/2026
| # | Décision |
|---|---|
| P1 | **13 semaines = 1 semaine de tests + 12 semaines d'entraînement.** Structure du dépôt conservée (dans le code, la semaine de tests porte l'index 0). |
| P2 | **La version du code fait foi** (combine lundi → samedi, semaine 1 le lundi). Le `.md` sera aligné. |
| P3 | Référence du readiness : **à décider pour chaque personne**, selon ses réponses au questionnaire et selon la cohérence avec son programme (y compris le choix d'un test sans saut, P13). |
| P4 | **Rien ne change** : la règle du rouge sans test reste écrite, sans être branchée dans l'interface. |
| P5 | Exception deadlift semaine 1 : **à décider pour chaque personne**, après le questionnaire. |
| P12 / C3 | Protéines : **2 g/kg de poids de corps par défaut** (et non 3,1 g/kg), ajustées selon les réponses au questionnaire. |
| P14 | Alternative aux tractions lestées : **tirage vertical**. |
| P6 / P8 | **Charges calculées à partir des tests** : `charge = arrondi_2,5(1RM mesuré × %)`, avec les % de la section 5.8 (squat, bench, deadlift, tractions lestées ; front squat en % du back squat). |
| P7 / P9 | **Push Press, RDL et accessoires : pas de calcul.** À la 1re séance, la personne choisit la charge qui donne le RPE cible ; ensuite, les règles de progression §11 prennent le relais. |

Restent ouverts : P10, P11, P13 (lié à P3), P15 à P17.


| # | Point | Ce que dit le dépôt | Ce qu'il faut décider |
|---|---|---|---|
| P1 | Numérotation de la semaine de tests | Tests = **semaine 0**, puis 12 semaines d'entraînement (13 semaines au total). Ta demande parle de « semaine 1 de tests ». | Garder 0 + 12, ou faire 1 (tests) + 11 semaines d'entraînement ? |
| P2 | Calendrier du combine initial | `.md` §12 : samedi / dimanche / lundi, semaine 1 le mercredi. Code : lundi → samedi (5 séances), semaine 1 le lundi. Le `.md` n'a pas été mis à jour. | Confirmer que la version du code est la référence. |
| P3 | Référence du readiness | `.md` §4 : « Construis ta référence sur les deux premières semaines ». Code : meilleur broad jump du combine initial, figé. | Laquelle garder pour le modèle ? |
| P4 | Rouge sans test (sommeil < 5 h + courbatures + échauffement lourd) | Écrit dans le `.md` et codé (`manualRed`), mais branché nulle part dans l'interface. | L'intégrer au modèle (et à l'appli) ? |
| P5 | Exception deadlift semaine 1 (RPE ≤ 6 → cas 2) | Toujours active dans le code et la consigne de l'exercice, alors que sa justification (« ton 130 est sous-estimé ») a disparu du `.md`. | La garder en règle générique (« lift dont le 1RM est douteux ») ou la supprimer ? |
| P6 | Calcul des charges à partir des 1RM | Le code n'en calcule aucune : kilos écrits en dur, recalés à la main. Deux commentaires de code se contredisent (`getSession.ts` vs `mainLiftTable.ts`, qui cite un « 97,5 kg » alors que le tableau dit 105). | Valider les % dérivés et la formule `arrondi(1RM × %)`. |
| P7 | Push Press et RDL | Kilos absolus, « non indexés ». Aucune règle pour une autre personne. | Quelle base de calcul (ex. % du bench / du deadlift) ? |
| P8 | Front Squat | Aucun % écrit, recalé « × 110/140 ». | Valider le % du back squat proposé. |
| P9 | Charges de départ des accessoires (Bulgarian, Hip Thrust, Hang High Pull, haltères, portés) | Kilos fixes. Seul le Hang High Pull a une justification (≈ 29 % du deadlift testé, en commentaire). | Définir une règle (ex. RPE cible en semaine 1) ? |
| P10 | Règles de progression propres aux exercices | Affichées en texte, pas calculées ; seul §11 est automatisé. | Les automatiser ou les laisser en consigne ? |
| P11 | Commentaires obsolètes dans `src/data/nutrition.ts` | Ils parlent de 100 g de lipides et d'un calcul « 170 × 4 + 480 × 4 » ; les valeurs actuelles sont 105 g / 425 g. | Aucun impact sur le modèle, à nettoyer dans l'appli. |
| P12 | Calcul des besoins nutritionnels | Aucune formule : 3 600 / 3 050 kcal et 240 g de protéines sont donnés tels quels. | Choisir une méthode de calcul (proposition dans `CORRESPONDANCE_QUESTIONNAIRE.md`). |
| P13 | Readiness pour quelqu'un qui ne peut pas sauter | Le seul indicateur est le broad jump. | Quel test de remplacement (post-partum, senior, blessure membre inférieur) ? |
| P14 | Tractions lestées pour quelqu'un qui ne fait pas de traction stricte | Aucune alternative. | Quelle progression (assistée, négatives, tirage) ? |
| P15 | Nombre de séances | 5 séances fixes, aucune variante. | Valider les découpages 2 / 3 / 4 séances proposés. |
| P16 | Fichier `programme-12-semaines-app.html` | Ancien prototype autonome (titre avec le prénom), pas utilisé par l'appli. | À exclure de la copie pour un nouveau client ? |
| P17 | Combine S8 | `.md` : « Poids, Broad Jump, Vertical Jump, sprint, tractions strictes max, Farmer Carry, Ab Wheel max, Leg Raise max » sur sam + dim. Code : même liste, plus le travail de deload après les tests. | Confirmer. |
