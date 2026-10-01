# Guide d'adaptation — créer le programme d'une nouvelle personne

> Statuts : **[DÉPÔT]** = présent dans le dépôt · **[PROPOSITION]** = mon ajout, à valider.
> Fichiers liés : `MODELE_REFERENCE.md` (le programme), `modele-vierge.json` (les données à remplir), `CORRESPONDANCE_QUESTIONNAIRE.md` (les règles de décision).

---

## 1. Variables à renseigner

Toutes les variables de `modele-vierge.json` sont entre `{{ }}`. Elles se remplissent en **deux temps** :
- **Temps A — avant la semaine 0** : à partir du questionnaire et de la fiche de synthèse.
- **Temps B — après la semaine 0** : à partir des tests (1RM, sauts, sprint…), jamais du questionnaire.

### 1.1 Temps A — questionnaire / fiche de synthèse
| Variable | Contenu | Source |
|---|---|---|
| `{{prenom}}` | Prénom affiché | Questionnaire |
| `{{age}}`, `{{sexe}}`, `{{taille_cm}}`, `{{poids_kg}}` | Profil | Questionnaire |
| `{{contexte_travail}}` | Métier / activité quotidienne (remplace « chantier ») | Questionnaire |
| `{{salle}}` | Nom ou type du lieu (remplace « Basic-Fit » dans les alternatives) | Questionnaire |
| `{{seances_par_semaine}}` | 2 à 5 | Questionnaire |
| `{{duree_seance_min_par_jour}}` | Minutes disponibles, lundi → dimanche | Questionnaire |
| `{{date_debut_lundi}}` | Lundi de la semaine 0 (`startDate`, l'appli exige un lundi) | Fiche de synthèse |
| `{{back_squat_1rm_estime}}`, `{{bench_1rm_estime}}`, `{{deadlift_1rm_estime}}`, `{{tractions_lestees_1rm_lest_estime}}` | Repères de force facultatifs → servent **uniquement** à calculer les paliers du test initial | Module performance |
| `{{back_squat_palier_initial_1..7_kg}}`, `{{bench_press_palier_initial_1..7_kg}}`, `{{deadlift_palier_initial_1..8_kg}}`, `{{weighted_pullup_palier_initial_1..5_kg}}` | Paliers du test initial = `arrondi_2,5(1RM_estimé × pct_derive)` (pct dans le JSON) | Calcul [PROPOSITION] |
| `{{farmer_test_kg}}` | Charge par main du Farmer Carry test (identique aux 3 combines) | Fiche de synthèse |
| `{{box_jump_hauteur_cm}}` | Fourchette de hauteur de box | Fiche de synthèse |
| `{{kcal_jour_entrainement}}`, `{{kcal_jour_repos}}` | Cibles caloriques | Calcul [PROPOSITION, voir Correspondance §2.7] |
| `{{proteines_g_jour_*}}`, `{{glucides_g_jour_*}}`, `{{lipides_g_jour_*}}` | Macros des deux paliers | Calcul |
| `{{nombre_repas}}`, `{{heure_repas_1..6}}` | Rythme des repas | Questionnaire (journée type) |
| `{{qte.<id_ligne>}}` (40 lignes) | Quantité de chaque aliment de chaque repas | Calcul à partir des cibles |
| `{{prise_min_kg_semaine}}`, `{{prise_max_kg_semaine}}` | Vitesse d'évolution du poids visée (dépôt : +0,15 à +0,30) | Objectif alimentaire |
| `{{situation}}`, `{{niveau}}`, `{{lieu}}`, `{{materiel}}`, `{{exercices_exclus}}`, `{{substitutions}}`, `{{avis_medical_requis}}`, `{{aliments_exclus}}`… | Aiguillages des règles de décision | Fiche de synthèse [PROPOSITION — ces variables pilotent les règles, elles ne figurent pas dans le JSON] |

### 1.2 Temps B — résultats de la semaine 0
| Variable | Contenu | Utilisée par |
|---|---|---|
| `{{broad_jump_reference_cm}}` | Meilleur broad jump du combine initial | Readiness (`broadJumpBaselineCm`) [DÉPÔT] |
| `{{back_squat_1rm}}`, `{{bench_1rm}}`, `{{deadlift_1rm}}`, `{{tractions_lestees_1rm_lest}}` | 1RM mesurés | Readiness ROUGE (65 %) [DÉPÔT] ; tableau §9, paliers finaux, cibles [calcul DÉPÔT fait à la main, automatisation PROPOSITION] |
| `{{<lift>_s1_kg}}` … `{{<lift>_s12_kg}}` pour `back_squat`, `bench_press`, `deadlift`, `weighted_pullup`, `front_squat`, `speed_squat` | Charges du tableau §9 = `arrondi_2,5(1RM × pct_derive)` (champ `formule_proposee` du JSON) — **validé le 01/10/2026** | Séances |
| `{{push_press_s1..12_kg}}`, `{{rdl_s1..11_kg}}`, `{{rdl_plafond_kg}}` | **Pas de calcul** (décision 01/10/2026) : charge choisie à la 1re séance au RPE cible, puis règles §11 | Séances |
| `{{<lift>_palier_final_*_kg}}` | Paliers du combine final = mêmes rapports que l'initial, appliqués au 1RM mesuré | Semaine 12 |
| `{{deadlift_s12_dernier_palier_ecrit_kg}}`, `{{back_squat_essai_propre_kg}}`, `{{back_squat_essai_limite_kg}}` | Textes de consigne de la semaine 12 | Semaine 12 |
| `{{depart.<mesure>}}`, `{{cible.<mesure>}}` (11 mesures) | Départ = combine initial ; cible = départ × progression relative du §13 | Onglet Combine |
| Charges de départ des accessoires : `{{bulgarian_split_squat_depart_kg}}`, `{{bulgarian_split_squat_s12_depart_kg}}`, `{{hip_thrust_depart_kg}}`, `{{hang_high_pull_depart_kg}}`, `{{landmine_press_kneeling_kg}}`, `{{landmine_alt_haltere_kg}}`, `{{chest_supported_row_kg}}`, `{{farmer_carry_kg}}`, `{{single_leg_rdl_kg}}`, `{{suitcase_carry_kg}}`, `{{incline_db_press_kg}}`, `{{incline_db_press_s8_kg}}`, `{{jump_squat_db_charge_texte}}`, `{{jump_squat_charge_a_eviter_kg}}`, `{{neutral_grip_pullup_charge_texte}}` | **Décision 01/10/2026** : charge permettant le schéma de la semaine 1 au RPE cible, choisie pendant la 1re séance, puis règles §11 (repère indicatif pour le Hang High Pull : ≈ 29 % du deadlift testé, [DÉPÔT, commentaire]) | Séances |

Réglages de l'appli à saisir (écran Réglages) : date de début, poids de corps, référence broad jump, 4 × 1RM testés. [DÉPÔT]

---

## 2. Générique / personnel

| Élément | Fichier | GÉNÉRIQUE (garder tel quel) | PERSONNEL (adapter) |
|---|---|---|---|
| Périodisation 0 + 12 semaines, blocs | `src/data/program.ts` (`BLOCKS`, `WEEK_BLOCKS`) | ✅ | Seulement si objectif ≠ force/puissance (Correspondance §2.6) |
| Jours d'entraînement | `program.ts` (`TRAINING_DAYS`, `WEEK_DAYS`) | | ✅ selon `{{seances_par_semaine}}` |
| Seuils readiness | `program.ts` (`READINESS_THRESHOLDS`, `BIG_MOVEMENT_IDS`) | ✅ | Référence et test choisis pour chaque personne selon le questionnaire (P3, P13) |
| Règles de progression §11 | `program.ts` (`PROGRESSION_RULES`), `src/engine/progression.ts` | ✅ (ne pas toucher) | Exception deadlift S1 : décidée pour chaque personne après le questionnaire (P5) |
| Deload, règles de bloc, contraste | `src/data/blockRules.ts` | ✅ | Exclusions santé, substitutions |
| Échauffements | `src/data/warmups.ts` | ✅ | Matériel (vélo, rameur) |
| Catalogue d'exercices (ids, consignes, règle §5) | `src/data/exercises.ts` | ✅ ids gelés, consignes | Alternatives (`altBasicFit`), une phrase de consigne personnelle (deadlift « ton 130 »), « Ne mets pas 40 kg » |
| Trames des 5 séances | `src/data/baseSessions.ts` | ✅ séries, reps, RPE, repos, ordre | Charges fixes et de départ ; nombre de séances |
| Tableau §9 | `src/data/mainLiftTable.ts` | ✅ schémas séries × reps, RPE | ✅ tous les kilos |
| Combines, taper, paliers, cibles | `src/data/testSessions.ts` | ✅ protocole, ordre, repos, jours | ✅ paliers, `MESURES_COMBINE`, `TARGETS_12_WEEKS`, charge du farmer |
| Programme rédigé | `programme-final-12-semaines.md` | ✅ §2-§12 (hors chiffres) | ✅ en-tête (profil), §1 diagnostic, §9, §12 paliers, §13 |
| Moteur, chrono, base de données, écrans | `src/engine/`, `src/timer/`, `src/db/`, `src/screens/`, `src/components/` | ✅ | Valeurs de départ des 1RM affichées dans Réglages (`ONE_RM_FIELDS` dans `SettingsScreen.tsx`) |
| Plan alimentaire | `plan-alimentaire-12-semaines.md`, `src/data/nutrition.ts` | ✅ principes, 2 paliers, règles d'ajustement, composition des produits | ✅ cibles, quantités, horaires, aliments exclus, carburant par jour |
| Nom de l'appli | `index.html`, `vite.config.ts` (manifest) | | ✅ si plusieurs personnes sur un même téléphone |
| Prototype ancien | `programme-12-semaines-app.html` | | À **ne pas** copier (contient le prénom) — P16 |
| Tests automatiques | `src/**/*.test.ts` | ✅ | Ceux qui relisent le `.md` ou vérifient des kilos (`mainLiftTable.test.ts`, `program.test.ts`, `nutrition.test.ts`, `hangHighPull.test.ts`…) échoueront tant que les chiffres ne sont pas mis à jour **aux deux endroits** — c'est voulu |

---

## 3. Fiche de synthèse type (intermédiaire questionnaire → programme) [PROPOSITION]

```markdown
# Fiche de synthèse — {{prenom}}            Date : …   Version : 1

## 0. Feu vert de démarrage
- Avis médical requis : OUI / NON — motif : …            (voir Correspondance §3)
- Avis obtenu le : …  Restrictions écrites : …
- Tests 1RM autorisés en semaine 0 : OUI / NON / seulement sur : …

## 1. Profil
Âge … · Sexe … · Taille … cm · Poids … kg · Métier … · Activité quotidienne : faible / moyenne / élevée

## 2. Objectif
- Objectif principal : …
- Objectif chiffré / échéance : …
- Priorités : 1) …  2) …  3) …
- **Priorité n°1 du programme** (le « §1 ») : …
- **Indicateur de réussite** affiché dans l'onglet Combine : … (ex. écart deadlift − squat)

## 3. Santé
- Douleur / blessure actuelle : …
- Antécédents : …   Traitements / consignes : …
- Exercices exclus : …
- Tractions lestées possibles : OUI / NON → si NON : tirage vertical
- Substitutions : exercice → remplaçant : …

## 4. Niveau
- Niveau : débutant / intermédiaire / confirmé
- Exercices maîtrisés : …   Non maîtrisés (version d'apprentissage) : …
- Repères de force (facultatifs) : squat … / bench … / deadlift … / tractions lestées + …
- Type de test en semaine 0 : 1RM / 5 reps à RPE 8 / aucun

## 5. Organisation
- Séances par semaine : …  Jours retenus : …
- Minutes disponibles : lun … mar … mer … jeu … ven … sam … dim …
- Lieu : salle / maison / extérieur   Matériel : …
- Découpage choisi : 5 / 4 / 3 / 2 séances (Correspondance §2.1)
- Date de début (lundi de la semaine 0) : …

## 6. Récupération
- Sommeil : … h, qualité …/10   Stress : …/10
- Ajustement de départ : aucun / −1 série semaine 1 / jours durs max = …
- Readiness : référence = … ; test = broad jump / autre : … (P3)
- Exception deadlift semaine 1 : OUI / NON (P5)

## 7. Alimentation
- Objectif : prise / maintien / perte   Vitesse visée : … kg/semaine
- Calories : entraînement … / repos …   Protéines … g (défaut : 2 g/kg × poids) · Glucides … g · Lipides … g
- Nombre de repas : …   Horaires : …   Repas autour de la séance : …
- Allergies / intolérances : …   Aliments refusés : …   À garder : …
- Contraintes pratiques : …   Boissons : …

## 8. Module performance (si sportif)
Historique … · Dernier programme … · Qualités à développer … · Points forts … · Points faibles …
Mobilité … · Gainage … · Autres efforts (sport, matchs) … · Équipement spécifique …

## 9. Situation particulière
Aucune / post-partum / reprise après blessure / perte de poids importante / senior / adolescent / sport : …
Garde-fous appliqués : …

## 10. Paramètres générés (à recopier dans modele-vierge.json)
Liste des variables du temps A avec leur valeur.
```

---

## 4. Dupliquer l'appli pour une nouvelle personne

### 4.1 Ce que fait déjà le dépôt [DÉPÔT]
- Un push sur `main` lance `.github/workflows/deploy.yml` : tests → vérification des types → build → publication **GitHub Pages**.
- L'adresse de base (`base` de Vite) est déduite du nom du dépôt : « renommer le dépôt ne casse rien ».
- Toutes les données de suivi restent **sur le téléphone** de la personne (IndexedDB) : rien n'est partagé entre deux personnes qui ont chacune leur téléphone.

### 4.2 Procédure [PROPOSITION]
1. **Copier** : créer un nouveau dépôt à partir de celui-ci (« Use this template » ou copie), nommé par exemple `programme-<prenom>`. Ne pas utiliser un *fork* public si le dépôt contient des données de santé.
2. **Ne pas copier** : `programme-12-semaines-app.html` (ancien prototype nominatif), `mockups/`, `.claude/launch.json` (chemin Windows local), le dossier `export-modele/`.
3. **Remplacer** les données personnelles, en partant de `modele-vierge.json` et dans cet ordre :
   1. `programme-final-12-semaines.md` : en-tête profil, §1 diagnostic, §9, §12, §13.
   2. `src/data/mainLiftTable.ts` : tous les kilos (mêmes valeurs qu'au §9 du `.md`).
   3. `src/data/testSessions.ts` : `RAMP_*`, `RAMP_*_S12`, `MESURES_COMBINE`, `TARGETS_12_WEEKS`, charge du farmer.
   4. `src/data/baseSessions.ts` : charges fixes et `seed` des charges autorégulées.
   5. `src/data/exercises.ts` : alternatives de matériel, consignes contenant des chiffres personnels.
   6. `plan-alimentaire-12-semaines.md` + `src/data/nutrition.ts` : cibles, quantités, horaires.
   7. `src/screens/SettingsScreen.tsx` : valeurs de départ `ONE_RM_FIELDS`.
   8. Remplacer « Guillaume » partout dans les commentaires et textes (`grep -ri guillaume`).
4. **Si plusieurs appli doivent cohabiter sur un même téléphone** (le tien, pour suivre tes clients) : changer le nom de la base `super('programme-12-semaines')` dans `src/db/db.ts`, les clés `p12s:rest-timer` (`src/timer/restTimer.ts`) et `p12s:last-week` (`src/state/lastWeek.ts`), le `name` / `short_name` du manifest (`vite.config.ts`) et le `<title>` d'`index.html`. Raison : toutes les pages `<compte>.github.io/<dépôt>` partagent le même stockage navigateur.
5. **Vérifier** en local : `npm install`, `npm test`, `npm run typecheck`, `npm run build`. Les tests qui comparent le `.md` au code doivent passer.
6. **Déployer** : activer GitHub Pages (Settings → Pages → Source : GitHub Actions) sur le nouveau dépôt, pousser sur `main`.
7. **Installer** : envoyer l'adresse à la personne, qui l'ouvre une fois avec du réseau puis « Ajouter à l'écran d'accueil » (indispensable sur iPhone pour le maintien de l'écran et les notifications).
8. **Semaine 0** : la personne saisit sa date de début, puis ses résultats de tests (Réglages + onglet Combine). Toi, tu calcules les charges (temps B), tu mets à jour `.md` + `mainLiftTable.ts` + `testSessions.ts`, tu pousses : l'appli propose la mise à jour par un bandeau.

### 4.3 ⚠️ Confidentialité — à lire avant de déployer
Une page GitHub Pages est **publique** : n'importe qui ayant l'adresse peut lire le programme publié, donc tout ce qui est écrit dans `programme-final-12-semaines.md` et `src/data/` (prénom, poids, 1RM, et demain blessures ou situation post-partum). Sur un compte GitHub gratuit, le dépôt lui-même doit aussi être public pour utiliser Pages.
Règle à appliquer : **aucune donnée de santé ni nom de famille dans le code publié**. Garder la fiche de synthèse et le questionnaire hors du dépôt. Vérifier la visibilité de ton dépôt actuel, qui contient déjà ton prénom, ton poids et tes 1RM.

---

## 5. Points de vigilance sécurité [PROPOSITION, sauf mention]

**Pour tout le monde**
- Les garde-fous du dépôt restent actifs et ne doivent jamais être retirés : feu tricolore, « ne retente pas » sur rep ratée, « Un exercice de puissance qui ralentit est terminé », « Douleur articulaire (pas musculaire) qui dure plus de 48 h → retire l'exercice, ne pousse pas à travers » [DÉPÔT].
- Les estimations de 1RM peuvent être fausses de 25 % (squat estimé 140, mesuré 110 dans le dépôt) : **jamais de charge d'entraînement calculée sur une estimation** — seulement les paliers de test.
- Toute suggestion de charge reste à confirmer par la personne (`requiresConfirm`) [DÉPÔT].

**Débutants**
- Pas de 1RM en semaine 0 ; test sous-maximal (5 reps à RPE 8).
- Pas de contraste, pas de Nordic complet, pas de Hang High Pull, sauts à faible volume.
- Les 3 premières semaines sont techniques (RPE ≤ 7).

**Blessures et douleurs**
- Avis médical avant de commencer (Correspondance §3) ; restrictions écrites dans la fiche de synthèse.
- Aucun test max sur la zone concernée.
- Le readiness par broad jump n'est pas utilisable après une blessure du membre inférieur : prévoir un autre indicateur (P13).

**Post-partum**
- Feu vert médical + bilan périnéal / diastasis obligatoires.
- Ni sauts, ni sprints, ni Ab Wheel / Hanging Leg Raise, ni charges lourdes au départ ; aucun 1RM.
- Pas de déficit calorique pendant l'allaitement ; avis d'un professionnel pour la nutrition.

**Adolescents**
- Accord parental ; pas de 1RM ; technique avant charge ; RPE ≤ 8.
- Aucun objectif de perte de poids, pas de créatine ni de complément.
- Volume de sauts modéré, attention aux douleurs de croissance (genou, talon) → arrêt et avis.

**Seniors**
- Avis médical si sédentaire ou traité ; pas de sprint maximal ni de 1RM vrai.
- Sauts remplacés par des montées de step rapides ; ajouter de l'équilibre.

**Nutrition**
- Le plan du dépôt est un plan de **prise de masse** à ≈ 3,1 g de protéines par kg : ne pas le transposer tel quel. **Règle retenue : 2 g/kg par défaut**, ajustée selon le questionnaire.
- Antécédent de trouble alimentaire → pas de plan chiffré sans professionnel.

---

## 6. Points à confirmer (spécifiques à ce fichier)
- G1. L'attribution « temps A / temps B » de chaque variable est ma proposition.
- G2. ~~Push Press, RDL, accessoires~~ → tranché le 01/10/2026 : charge choisie à la 1re séance au RPE cible, puis §11.
- G3. Le mode de déploiement multi-personnes (un dépôt par personne) est une proposition ; une seule appli multi-profils demanderait une refonte du stockage.
- G4. La règle de confidentialité suppose que tu veux protéger les données de santé de tes clients ; le dépôt actuel n'en contient pas, mais il contient tes propres mesures.
