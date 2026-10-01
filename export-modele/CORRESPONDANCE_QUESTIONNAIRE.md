# Correspondance questionnaire → paramètres du modèle

> Circuit visé : **questionnaire → fiche de synthèse → paramètres → programme personnalisé**.
> Statut de chaque ligne :
> - **DÉPÔT** = le paramètre existe déjà dans l'appli et a cet effet (même s'il est aujourd'hui figé pour une seule personne).
> - **DÉPÔT (partiel)** = l'appli a l'idée, mais pas la variable ni l'automatisme.
> - **PROPOSITION** = mon ajout, **à valider par toi**.
>
> Noms de paramètres : ceux de `modele-vierge.json` (`{{variable}}`) ou du code (`Settings.oneRM`, `WEEK_DAYS`…). Références `§n` = sections de `programme-final-12-semaines.md`.

---

## 1. Table de correspondance

### Profil
| Réponse du questionnaire | Paramètre du modèle qu'elle pilote | Effet concret sur le programme | Statut |
|---|---|---|---|
| Âge | `{{age}}` → aiguillage « adolescent » / « senior » ; plafond d'intensité des tests | < 18 ans ou ≥ 65 ans : règles de la section 2.8 (pas de 1RM vrai, garde-fous) | PROPOSITION |
| Sexe | `{{sexe}}` → calcul des besoins caloriques ; aiguillage post-partum | Aucun effet sur la structure d'entraînement ; change la formule calorique | PROPOSITION |
| Taille | `{{taille_cm}}` → calcul calorique ; ratios de force (charge ÷ poids de corps, §1) | Sert au diagnostic et à la nutrition | DÉPÔT (partiel) : le §1 raisonne en ratios « × PDC » ; la taille n'est utilisée nulle part |
| Poids | `{{poids_kg}}`, `{{depart.test-bodyweight}}`, `{{cible.test-bodyweight}}` | Ratios de force du diagnostic, besoins nutritionnels, suivi « moyenne 7 jours » | DÉPÔT : poids saisi dans Réglages, journal de pesées, ratios du §1 |
| Activité quotidienne | `{{facteur_activite}}` (nutrition) ; nombre de séances DURES par semaine | Activité physique lourde → garder au maximum 3 séances dures (le ratio 3 durs + 1 rapide + 1 modéré du §1) | DÉPÔT (partiel) : le ratio du §1 est justifié par « ton métier et deux enfants » ; aucune variable |
| Métier | `{{contexte_travail}}` ; `{{facteur_activite}}` ; horaires des repas | Métier physique → hydratation et sel renforcés, collations transportables, jamais plus de 3 séances dures | DÉPÔT (partiel) : hydratation « chantier », collations « sur la route » écrites en dur |

### Objectif
| Réponse | Paramètre | Effet concret | Statut |
|---|---|---|---|
| Objectif principal | Répartition des qualités (section 2.6) ; choix de la priorité n°1 du §1 | Choisit quelle séance est protégée (placée après le jour neuronal) et quel lift reçoit le plus de volume | DÉPÔT (partiel) : la priorité n°1 (chaîne postérieure) est écrite en dur dans §1 |
| Objectif chiffré ou échéance | `{{cible.*}}` (§13) ; `{{date_debut_lundi}}` | Les cibles s'expriment en % du départ mesuré ; la date de fin = début + 13 semaines | DÉPÔT : cibles relatives §13 et calendrier calculé depuis le lundi de départ |
| 3 priorités | Ordre des blocs dans la séance ; choix des accessoires | Priorité 1 = premier lift de la séance la plus fraîche ; priorité 3 = accessoires seulement | PROPOSITION |

### Santé
| Réponse | Paramètre | Effet concret | Statut |
|---|---|---|---|
| Douleur ou blessure actuelle | `{{exercices_exclus}}`, `{{substitutions}}` ; feu « stop » avant démarrage | Retirer ou remplacer chaque exercice qui sollicite la zone (section 2.4) ; avis médical si douleur articulaire | DÉPÔT (partiel) : §13 « Douleur articulaire (pas musculaire) qui dure plus de 48 h → retire l'exercice, ne pousse pas à travers » |
| Antécédents médicaux | `{{avis_medical_requis}}` (oui/non) ; exclusions | Conditionne le démarrage (section 3) | PROPOSITION |
| Traitements ou consignes médicales | `{{avis_medical_requis}}` ; `{{rpe_max}}` ; `{{tests_1rm_autorises}}` | Une consigne médicale prime sur tout le programme ; peut interdire les tests max | PROPOSITION |

### Niveau
| Réponse | Paramètre | Effet concret | Statut |
|---|---|---|---|
| Niveau en musculation | `{{niveau}}` → type de test semaine 0, complexité, volume, vitesse de progression (section 2.3) | Débutant : pas de 1RM, pas de contraste, progression plus lente ; confirmé : modèle tel quel | PROPOSITION |
| Activité actuelle | `{{volume_depart}}` (séries par séance en semaine 1) | Sédentaire ou reprise : semaine 1 à −1 série partout | PROPOSITION |
| Exercices maîtrisés | `{{exercices_maitrises}}` → liste des exercices autorisés tels quels / à remplacer par une version plus simple | Un exercice non maîtrisé passe en version d'apprentissage (ex. Back Squat → Goblet Squat ; Hang High Pull retiré) | PROPOSITION (l'appli prévoit déjà des semaines « techniques » pour le Hang High Pull, nouveau geste) |

### Organisation
| Réponse | Paramètre | Effet concret | Statut |
|---|---|---|---|
| Nombre de séances par semaine | `{{seances_par_semaine}}` → `TRAINING_DAYS`, `WEEK_DAYS`, `BASE_SESSIONS` | Choisit le découpage (section 2.1) | DÉPÔT (partiel) : 5 séances écrites en dur (`TRAINING_DAYS = [0, 2, 4, 5, 6]`) |
| Disponibilité en minutes, jour par jour | `{{duree_seance_min_par_jour}}` → `durationLabel` ; ordre de retrait des exercices | Place les séances longues les jours disponibles ; coupe dans l'ordre de la section 2.1 | DÉPÔT (partiel) : durées 60-90 min fixées par jour (§3) |
| Lieu (maison, salle, extérieur) | `{{lieu}}` → `altBasicFit` (renommé `alternative`) et table de substitution | Remplace les exercices impossibles (section 2.2) | DÉPÔT (partiel) : champ `altBasicFit` = alternative quand le matériel de la salle ne suit pas |
| Matériel disponible | `{{materiel}}` → `LoadSpec.step` (pas de charge), substitutions | Haltères fixes = pas de charge plus gros ; pas de barre = pas de 1RM barre | DÉPÔT (partiel) : pas 2,5 kg barre / 2 kg haltères / 1 kg poulie |

### Alimentation
| Réponse | Paramètre | Effet concret | Statut |
|---|---|---|---|
| Objectif alimentaire | `{{kcal_jour_entrainement}}`, `{{kcal_jour_repos}}`, `{{prise_min_kg_semaine}}`, `{{prise_max_kg_semaine}}` | Sens et vitesse de l'évolution du poids ; règle d'ajustement inversée en perte de poids | DÉPÔT (partiel) : plan de prise de masse uniquement (+0,15 à +0,30 kg/semaine) |
| Journée type | `{{heure_repas_1}}` … `{{heure_repas_6}}` ; placement du repas « autour de la séance » | Les glucides se placent avant/après la séance réelle | DÉPÔT : « Les glucides se concentrent autour de l'entraînement » |
| Nombre de repas souhaité | `{{nombre_repas}}` | Répartition des aliments en N prises | DÉPÔT (partiel) : 6 prises fixes, justifiées par la cible |
| Allergies et intolérances | `{{aliments_exclus}}` → remplacement des `product` (`oeuf`, `lait`, `skyr`, `amandes`, `whey`, `pain`…) | Retire le produit de toutes les lignes ; remplace à protéines égales | DÉPÔT (partiel) : chaque aliment est un `product` modifiable ; « zéro allergène particulier » écrit en dur |
| Aliments refusés ou à garder | `{{aliments_exclus}}`, `{{aliments_a_garder}}` | Idem, et ancre les repas sur les aliments aimés | PROPOSITION |
| Contraintes pratiques | `{{contraintes_repas}}` (transport, cuisson, budget) | Collations à préparer la veille, pas de pesée au chantier (`unit: 'unité'`) | DÉPÔT (partiel) : « se prépare la veille », unités comptables (banane, œuf) |
| Boissons | `{{boissons}}` | Café, alcool, boissons sucrées comptés dans les kcal ; hydratation | DÉPÔT (partiel) : seule la règle d'hydratation existe |

### Récupération
| Réponse | Paramètre | Effet concret | Statut |
|---|---|---|---|
| Heures de sommeil | `{{sommeil_h}}` → `manualRed` ; `{{seances_dures_max}}` | < 5 h + courbatures + échauffement lourd → ROUGE sans test | DÉPÔT (texte §4 + fonction `manualRed`, non branchée ; décision 01/10/2026 : on laisse tel quel) |
| Qualité du sommeil | `{{sommeil_qualite}}` → volume de départ | Sommeil mauvais : section 2.5 | PROPOSITION |
| Stress | `{{stress}}` → volume de départ, nombre de jours durs | Stress élevé : section 2.5 | DÉPÔT (partiel) : cas 6 « mauvaise journée (boulot, enfants, sommeil) → feu tricolore » |

### Module performance (sportifs)
| Réponse | Paramètre | Effet concret | Statut |
|---|---|---|---|
| Historique d'entraînement | `{{niveau}}` ; durée des blocs | > 2 ans de pratique structurée : modèle tel quel ; sinon section 2.3 | PROPOSITION |
| Dernier programme | Point de départ du bloc 1 ; éviter de répéter un bloc identique | Si le dernier programme était orienté force pure → le §13 prévoit « le bloc suivant sera orienté vitesse » | DÉPÔT (partiel) : règle du §13 |
| Qualités à développer | Répartition des qualités (section 2.6) | — | PROPOSITION |
| Points forts et points faibles | Priorité n°1 (§1) ; critère de réussite (§13) | Le point faible devient la priorité n°1 et l'indicateur de l'onglet Combine (ex. écart deadlift − squat) | DÉPÔT : c'est exactement la logique du §1 et du §13 (écrite pour un seul cas) |
| Repères de force (facultatifs) | `{{back_squat_1rm_estime}}`, `{{bench_1rm_estime}}`, `{{deadlift_1rm_estime}}`, `{{tractions_lestees_1rm_lest_estime}}` | Calibrent **uniquement les paliers de montée** du test de la semaine 0, jamais les charges d'entraînement | DÉPÔT : les paliers initiaux §12 ont été écrits sur les estimations ; les charges ont ensuite été recalées sur les mesures |
| Mobilité | `{{limitations_mobilite}}` → substitutions (squat → box squat, deadlift → trap bar ou surélevé) ; échauffement prolongé | — | PROPOSITION |
| Gainage | `{{niveau_gainage}}` → version de l'Ab Wheel, du Hanging Leg Raise, du Copenhagen | Version facile : « Genoux fléchis si trop dur », « Mains sur un step » | DÉPÔT (partiel) : alternatives écrites pour Leg Raise et Plyo Push-Up |
| Autres efforts à intégrer | `{{autres_efforts}}` (sport, matchs, course) → placement des jours durs | Jamais de séance DURE jambes la veille d'un match ou d'une séance intense ; le conditioning du dimanche est retiré si le sport en apporte déjà | PROPOSITION |
| Équipement spécifique | `{{materiel}}` | Idem matériel | PROPOSITION |

### Situations particulières
| Réponse | Paramètre | Effet concret | Statut |
|---|---|---|---|
| Post-partum | `{{situation}} = post_partum` | Avis médical obligatoire, pas de sauts ni de charges lourdes au départ, readiness remplacé (section 2.8) | PROPOSITION |
| Reprise après blessure | `{{situation}} = reprise_blessure` | Exclusion / substitution, pas de 1RM sur la zone, progression ralentie | PROPOSITION (s'appuie sur la règle §13 « douleur articulaire > 48 h ») |
| Perte de poids importante | `{{situation}} = perte_poids` | Pas de sauts répétés au départ si fort surpoids, déficit calorique, règle d'ajustement inversée | PROPOSITION |
| Senior | `{{situation}} = senior` | Pas de 1RM vrai, pas de sprint max, équilibre et force privilégiés | PROPOSITION |
| Adolescent | `{{situation}} = adolescent` | Pas de 1RM, technique avant charge, aucune restriction calorique | PROPOSITION |
| Sport spécifique | `{{sport}}` → priorité n°1, choix des tests, calendrier | Ex. sport de sprint : le modèle tel quel ; sport d'endurance : conditioning conservé | PROPOSITION |

---

## 2. Règles de décision (toutes **PROPOSITION**, sauf mention contraire)

Principe transversal repris du dépôt : **on adapte la séance, on ne la saute pas** (§11 cas 6), et **on ne raccourcit jamais le repos d'un lift lourd** (§10 : « Un repos raccourci sur un lift lourd transforme la force en fatigue »).

### 2.1 Séances par semaine et durée disponible → découpage et volume
- **Si 5 séances** et ≥ 60 min en semaine, ≥ 80 min sur deux jours → modèle tel quel (lun / mer / ven / sam / dim). [DÉPÔT]
- **Si 4 séances** → supprimer le vendredi « Total Body Power » ; déplacer Broad Jump + Speed Squat en début de lundi, Hang High Pull + Push Press en début de samedi, à volume réduit de moitié ; garder 48 h entre deux séances jambes.
- **Si 3 séances** → A = Lower squat (+ sauts), B = Upper (bench + tractions + 2 accessoires du dimanche), C = Posterior chain (+ broad jump) ; conditioning supprimé ou remplacé par 10-15 min zone 2 ; au moins un jour de repos entre A et C.
- **Si 2 séances** → deux full body : A (squat + bench + saut), B (deadlift + tractions + saut) ; accessoires réduits au tronc ; progression plus lente (cas 3 seulement, jamais cas 2).
- **Si la durée disponible < durée de la trame** → retirer dans cet ordre : 1) conditioning, 2) dernier accessoire de la séance, 3) une série sur chaque accessoire restant (minimum 2), 4) un exercice de tronc. Ne jamais toucher : échauffement, readiness, lift principal, ses repos.
- **Si moins de 45 min** sur un jour → ce jour ne reçoit qu'une séance « lift principal + 1 accessoire ».
- **Si les jours disponibles ne permettent pas 48 h entre deux séances jambes dures** → passer la deuxième en version MODÉRÉE (RPE ≤ 7).

### 2.2 Lieu et matériel → exercices de substitution
| Exercice du modèle (`id`) | Salle sans le matériel | Maison (haltères / élastiques) | Extérieur |
|---|---|---|---|
| `back-squat` | Goblet squat lourd, presse | Goblet squat, Bulgarian lesté | Goblet squat avec sac lesté |
| `bench-press` | Développé haltères | Développé haltères au sol, pompes lestées | Pompes lestées, dips aux barres |
| `deadlift` | Trap bar, RDL haltères | RDL haltères, hip hinge élastique | RDL avec sac lesté |
| `weighted-pullup` | **Tirage vertical** [DÉCISION 01/10/2026] | Tractions à une barre de porte, rowing élastique | Barre de parc |
| `push-press` | Push press haltères | Push press haltères | — |
| `hang-high-pull` | High pull haltères | High pull haltère / kettlebell swing | Swing kettlebell |
| `box-jump` | Saut sur step / cible murale [DÉPÔT : « sinon Vertical Jump sur cible »] | Saut vertical sur place | Saut sur banc de parc |
| `nordic-curl` | Leg Curl 3 × 8, tempo 4-0-1-0 [DÉPÔT] | Nordic sous un canapé, glissé de jambes | Nordic avec partenaire |
| `farmer-carry` / `suitcase-carry` | Haltères les plus lourds | Sacs / bidons | Bidons d'eau |
| `conditioning` | Vélo, rameur [DÉPÔT] | Corde à sauter, burpees modérés | Côtes, fractionné 20 s / 70 s |
| Poulies (`face-pull`, `pallof-press`, `cable-chop`, `dead-bug-cable`, `one-arm-cable-row`) | — | Élastique | Élastique |
| `test-sprint-10m` / `20m` | « Jamais sur tapis » [DÉPÔT] | Supprimé | Piste ou terrain |

- **Si pas de barre olympique** → pas de 1RM barre en semaine 0 : test remplacé par une série de 5 à RPE 8 aux haltères, et charges en RPE uniquement.
- **Si haltères à pas fixe de 2,5 / 5 kg** → `step` correspondant ; les cas 2/3 ne peuvent pas proposer moins que ce pas.
- **Si la personne ne fait pas de traction stricte, ou si les tractions lestées ne sont pas adaptées** → tirage vertical, même schéma séries × reps et même RPE que la colonne « tractions lestées » du tableau §9 [DÉCISION 01/10/2026].
- Chaque substitution doit garder la même `fn` (squat, hinge, push, pull…) et le même `role`, pour que deload, readiness et progression continuent de s'appliquer.

### 2.3 Niveau d'expérience → complexité, volume, vitesse de progression
- **Si débutant (< 1 an structuré)** → semaine 0 : pas de 1RM, test de 5 répétitions à RPE 8 (estimation : 1RM ≈ charge × (1 + reps / 30), formule d'Epley, **hors dépôt**) ; supprimer contraste S9-11 (remplacé par un deuxième bloc force) ; pas de Hang High Pull, pas de Nordic complet ; volume −1 série sur tout ; progression : cas 3 seulement (+2,5 kg), pas de cas 2.
- **Si intermédiaire (1-3 ans)** → modèle tel quel, mais contraste réduit à 3 séries ; 1RM testé seulement sur les lifts maîtrisés.
- **Si confirmé (> 3 ans, repères de force fournis)** → modèle tel quel. [DÉPÔT]
- **Si un exercice n'est pas maîtrisé** → semaine 1 en « technique » (RPE ≤ 6), comme prévu pour le Hang High Pull [DÉPÔT : « les trois premières semaines sont techniques »].

### 2.4 Blessure, douleur ou limitation → exclusions et remplacements
- **Si douleur actuelle** → avis d'un professionnel de santé **avant** de démarrer (section 3).
- **Si douleur articulaire (pas musculaire) > 48 h pendant le programme** → « retire l'exercice, ne pousse pas à travers » [DÉPÔT §13].
- **Genou** → exclure Box Jump, Pogo, Lateral Bound, Jump Squat, Bulgarian profond ; remplacer par Box Squat, Hip Thrust, Leg Curl ; readiness par un test sans saut (P13).
- **Lombaires** → exclure Deadlift du sol, Good-morning, Ab Wheel ; remplacer par Trap bar surélevé ou Hip Thrust, Dead Bug, Pallof ; pas de 1RM deadlift.
- **Épaule** → exclure Bench lourd, Push Press, Tractions lestées, Plyo Push-Up, Landmine au-dessus de l'horizontale ; garder Face Pull et Rotation externe (« non négociables » [DÉPÔT]).
- **Cheville / tendon d'Achille** → exclure Pogo, sprints, sauts ; conditioning sur vélo uniquement.
- **Ischios** → Nordic retiré jusqu'à avis ; RDL léger tempo lent seulement.

### 2.5 Sommeil, stress, activité quotidienne → charge de travail et récupération
- **Si sommeil < 5 h + courbatures généralisées + échauffement anormalement lourd** → ROUGE sans test [DÉPÔT §4].
- **Si sommeil moyen < 6 h ou qualité mauvaise** → 4 séances maximum, dont 2 dures ; semaine 1 à −1 série.
- **Si stress élevé (≥ 7/10)** → 2 séances dures maximum ; deload possible dès la semaine 3 si le readiness est ORANGE deux fois de suite.
- **Si métier physique / activité quotidienne élevée** → 3 séances dures maximum (ratio du §1) [DÉPÔT (partiel)] ; facteur d'activité nutrition relevé.
- **Si readiness ORANGE ou ROUGE ≥ 3 fois sur 2 semaines** → appliquer le cas 7 sans attendre les 2 semaines de baisse.

### 2.6 Objectif principal et priorités → répartition force / explosivité / endurance / hypertrophie
- **Si force + puissance (sportif)** → modèle tel quel. [DÉPÔT]
- **Si force pure** → garder les blocs 1-8, remplacer le bloc contraste S9-11 par un deuxième bloc force max ; sauts réduits à l'échauffement.
- **Si hypertrophie** → accessoires en 3-4 × 8-12 RPE 7-8 ; lifts principaux en 4 × 6-8 ; sauts réduits à 2 exercices par semaine ; repos accessoires 60-90 s.
- **Si endurance / santé générale** → 3 séances force (lun / mer / sam) + conditioning conservé et allongé (zone 2 20-40 min) ; pas de contraste.
- **Si sport collectif ou de sprint** → priorité aux sauts et sprints, chaîne postérieure en priorité n°1 (logique du §1).
- La priorité n°1 détermine l'indicateur de réussite affiché dans l'onglet Combine (dans le dépôt : écart deadlift − squat).

### 2.7 Objectif alimentaire, allergies, nombre de repas → structure du plan
Méthode de calcul (**hors dépôt**, le dépôt n'en contient aucune) :
1. Métabolisme de base : formule de Mifflin-St Jeor (homme : 10 × poids + 6,25 × taille − 5 × âge + 5 ; femme : … − 161).
2. × facteur d'activité (sédentaire 1,4 → très actif 1,9) selon métier + séances.
3. Objectif : prise de masse +10 à +15 % ; maintien 0 ; perte −15 à −20 %.
4. **Protéines : 2 g/kg de poids de corps par défaut** [DÉCISION 01/10/2026 — le dépôt était à ≈ 3,1 g/kg, jugé trop élevé], ajustées selon les réponses au questionnaire ; lipides ≥ 0,8 g/kg ; le reste en glucides.
5. Jour de repos = jour d'entraînement − 15 %, pris **uniquement sur les féculents** (le dépôt : 3 050 / 3 600 = −15 %, « mêmes protéines, mêmes lipides ») [ratio DÉPÔT, généralisation PROPOSITION].
- **Si perte de poids** → règle d'ajustement inversée : poids stable 3 semaines → −50 g de féculent au dîner ; perte > 1 % du poids par semaine 2 semaines de suite → +50 g.
- **Si allergie / intolérance** → retirer le `product` partout et le remplacer à protéines égales (œuf → blanc de poulet / tofu ; lait / skyr → versions sans lactose ou soja ; amandes → graines ; whey → protéine végétale).
- **Si 3 repas souhaités** → regrouper : collation 1 → petit-déjeuner, collation 2 → déjeuner, repas « autour de la séance » conservé si possible ; **Si 4-5** → fusionner les deux collations du matin.
- **Si végétarien** → le dépôt prévoit déjà « 4-5 œufs si végé ce soir-là » au dîner [DÉPÔT].

### 2.8 Situations particulières → adaptations et garde-fous
- **Post-partum** → feu vert médical + bilan périnéal / diastasis **avant** démarrage ; ni sauts, ni sprints, ni charges lourdes les premières semaines ; pas de 1RM ; readiness sans saut ; gainage sans Ab Wheel ni Hanging Leg Raise au départ ; aucune restriction calorique en allaitement.
- **Reprise après blessure** → feu vert du professionnel qui suit la blessure ; zone exclue jusqu'à autorisation ; pas de test max sur la zone ; progression cas 3 seulement.
- **Perte de poids importante (IMC ≥ 30 ou objectif > 10 % du poids)** → pas de pogo, box jump ni sprint au départ (impacts) ; conditioning sur vélo ; déficit modéré ; contrôle médical si IMC ≥ 35 ou pathologie associée.
- **Senior (≥ 65 ans)** → pas de 1RM vrai (test 5 reps à RPE 7) ; pas de sprint maximal ; sauts remplacés par montées de step rapides ; ajout d'équilibre ; avis médical si sédentaire ou traitement.
- **Adolescent (< 18 ans)** → accord parental ; pas de 1RM ; technique avant la charge ; RPE ≤ 8 ; aucun objectif de perte de poids ni de complément (créatine retirée du plan) ; sauts autorisés à faible volume.
- **Sport spécifique** → calendrier des compétitions intégré : pas de séance DURE jambes à moins de 48 h d'un match ; le deload S8 se cale sur une période chargée si besoin.

---

## 3. Cas où un avis de professionnel de santé est requis **avant de commencer** (PROPOSITION)

Démarrage bloqué tant que l'avis n'est pas obtenu si **une seule** de ces réponses est « oui » :
1. Douleur actuelle (articulaire, dorsale, thoracique) ou blessure de moins de 6 mois.
2. Antécédent cardiaque, malaise ou douleur thoracique à l'effort, essoufflement anormal, hypertension non contrôlée.
3. Diabète traité, épilepsie, maladie respiratoire, maladie chronique en cours de traitement.
4. Traitement médicamenteux qui influence le cœur, la tension ou la coagulation, ou consigne médicale restrictive.
5. Grossesse en cours ou accouchement il y a moins d'un an (post-partum), césarienne, diastasis ou symptômes périnéaux.
6. Opération dans les 12 derniers mois.
7. Âge ≥ 65 ans avec sédentarité ou pathologie, ou adolescent (accord parental + avis si pathologie).
8. IMC ≥ 35, ou perte de poids visée > 15 % du poids.
9. Antécédent de trouble du comportement alimentaire → le **plan alimentaire** n'est pas fourni sans suivi par un professionnel (diététicien / médecin).

Dans tous ces cas : pas de test 1RM en semaine 0 sans autorisation explicite.

---

## 4. Points à confirmer (spécifiques à ce fichier)
- C1. Toutes les règles de la section 2 sont des propositions : aucune n'existe dans le dépôt, qui est écrit pour une seule personne, 5 séances, en salle.
- C2. La formule d'Epley (estimation du 1RM pour débutants) et Mifflin-St Jeor (calories) sont des standards externes, pas des éléments du dépôt.
- C3. ~~Apport protéique~~ → **tranché le 01/10/2026 : 2 g/kg par défaut**, ajusté selon le questionnaire.
- C4. Aucun test de readiness sans saut n'existe dans le dépôt (voir P13 de `MODELE_REFERENCE.md`). Décision : la référence et le test de readiness se choisissent pour chaque personne, selon le questionnaire (P3).
- C5. Les seuils (sommeil < 6 h, stress ≥ 7/10, IMC ≥ 30/35, 65 ans) sont des seuils de travail à valider, idéalement avec un professionnel de santé.
