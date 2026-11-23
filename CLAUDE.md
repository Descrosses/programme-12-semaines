# Dcross-fit — notes pour Claude Code

Application web installable (PWA) de préparation physique. Hors ligne à 100 %.
Sans compte, aucune donnée ne quitte l'appareil. Depuis le lot 1 du compte en
ligne (23 novembre), un compte **facultatif** sauvegarde une copie en ligne
(voir plus bas).

Interlocuteur : **Guillaume**, 34 ans, père de famille, peu de temps, débutant
en IA. **Réponds toujours en français.**

---

## La règle qui prime sur toutes les autres

**Le fichier `.md` est la source de vérité. Le code le transcrit, il ne le
réinterprète pas.**

- `programme-final-12-semaines.md` — le programme POWER 12, section par section
  (§3 semaine type, §8 modifications par bloc, §11 règles de progression,
  §13 objectifs). Il n'y a plus de §14 : le suivi de l'adducteur gauche a
  été retiré, voir plus bas.
- `plan-alimentaire-12-semaines.md` — le plan alimentaire personnel de
  Guillaume.
- `regles-cibles-nutrition.md` — les règles de calcul des cibles
  nutritionnelles (validées le 23 novembre, **codées côté coach seulement**) : Mifflin-St
  Jeor, grille d'activité, objectif (perte −15/−20/−25 %, prise +5/+10/+15 %),
  protéines 1,8 g/kg (2,2 en perte), lipides 25 % (≥ 0,6 g/kg), glucides le
  reste, même cible repos/entraînement, exclusions et planchers, réajustement
  ±100 kcal toutes les 2 semaines. Chaque section sépare les études des choix
  de l'appli : ne pas présenter un choix de l'appli comme une recommandation
  scientifique.
  **Calcul coach — FAIT** (« go calcul coach ») : valeurs dans
  `data/reglesCiblesNutrition.ts` (relues dans le `.md` tableau par tableau,
  exemple du §8 rejoué : `reglesCiblesNutrition.test.ts`), moteur pur
  `engine/calculCibles.ts` (étapes détaillées, exclusions §6, plancher →
  `proposable: false`, chiffres TOUJOURS calculés pour que le coach décide).
  `engine/lireResumeQuestionnaire.ts` relit le résumé du questionnaire collé
  tel quel (message entier, apostrophes typographiques) ; un libellé inconnu
  = donnée manquante, jamais devinée (aller-retour sur 400 profils depuis
  `resume()`). Écran : `components/CalculCoach.tsx` dans la carte
  « Préparer une fiche » de `#/admin` ; « Utiliser cette cible » remplit
  les DEUX journées avec la même cible (§5). Rien n'est enregistré. Côté
  utilisateur (profil en base, proposition, réajustement §7) : pas fait.

- `regles-orientation-programmes.md` — orienter vers un programme à partir du
  bilan sportif (validé le 23 novembre, codé : voir « Bilan sportif » plus bas).

Des tests **relisent ces `.md`** et comparent case par case (`mainLiftTable.test.ts`,
`program.test.ts`). Si le code et le `.md` divergent, le déploiement échoue.
Quand tu changes une prescription, change les deux.

---

## Architecture

| Dossier | Rôle | Interdit |
|---|---|---|
| `src/data/` | Transcription du `.md` : exercices, séances, règles de bloc | Aucune logique |
| `src/engine/` | Fonctions **pures** : séance du jour, progression, feu tricolore | Aucun React |
| `src/db/` | Dexie/IndexedDB — ce qui a été réellement fait | — |
| `src/screens/`, `src/components/` | Affichage (CSS Modules) | — |

Routage par hash : `#/session/{semaine}/{jour}`, `#/settings`, `#/nutrition`,
`#/combine`. Les jours sont indexés 0 = lundi, 2 = mercredi, 4 = vendredi,
5 = samedi, 6 = dimanche.

---

## Commandes

```bash
npm install          # conteneur neuf : vitest n'existe pas sans ça
npm test             # suite complète
npm run typecheck
npm run build
npm run empreinte    # régénère l'empreinte (voir plus bas)
```

Formatage : `npx prettier --write <fichiers touchés>`. **Jamais sur tout le
dépôt.**

---

## L'empreinte, et son angle mort

`src/engine/__fixtures__/empreinte.txt` fige les douze semaines, séance par
séance, exercice par exercice. Toute modification du programme la fait tomber.

Après l'avoir régénérée, **lis le diff et vérifie qu'il ne contient que ce que
tu voulais changer.** C'est le meilleur garde-fou du dépôt.

**Ce qu'elle ne voit pas :** elle compare les séries, le travail, la charge, le
repos et le RPE — **pas les notes de prescription**. Une progression qui passe
par la consigne lui est invisible : on peut vider les consignes et l'empreinte
reste verte (vérifié). Si tu touches à des consignes, écris un test dédié
(modèle : `src/engine/progressionTronc.test.ts`).

---

## Discipline de vérification

Trois obligations avant d'annoncer qu'une chose marche :

1. **Prouve un garde-fou en le cassant.** Casse délibérément la décision que tu
   viens de prendre, vérifie que le test tombe, restaure. Un test qu'on n'a pas
   vu échouer ne protège rien.
2. **Regarde l'app.** Playwright est préinstallé :
   `/opt/node22/lib/node_modules/playwright/index.mjs`, binaire
   `/opt/pw-browsers/chromium`, option `--no-sandbox`. Viewport 402 × 874,
   `deviceScaleFactor: 2`. L'écran Réglages exige un cycle actif : semer avec
   `demarrerCycle` depuis `src/db/repo.ts`.
3. **Dis les chiffres.** Durée de séance, nombre de tests, taille du diff. Pas
   « ça marche ».

---

## Travailler avec Guillaume

- **Ne déploie jamais sans son « déploie » explicite.** Commit et push sur la
  branche, puis attends. Cette règle n'a pas d'exception.
- **Une seule recommandation, tranchée.** Pas de liste d'options sans
  conclusion. Son avis se corrige, pas son temps.
- **Sois honnête, surtout quand ça contrarie la demande.** Les meilleures
  décisions de ce dépôt sont nées d'un « voilà pourquoi c'est une mauvaise
  idée » chiffré. Donne le coût réel (minutes de séance, tests cassés) avant
  de coder.
- **Termine par UNE action concrète.**
- Niveau d'effort : jamais en dessous de `medium` pour la base de données ou un
  calcul sportif.

### Déploiement

Commit → push → `create_pull_request` → attendre `validate-pr.yml` →
`merge_pull_request` en **squash** avec le SHA complet (40 caractères) →
vérifier `deploy.yml`.

**Piège connu :** le merge en squash réécrit l'historique côté `main`. La PR
suivante sur la même branche arrive en conflit (`mergeable_state: dirty`). Le
force-push est bloqué par le classifieur — **fusionne `origin/main` dans la
branche** plutôt que de la réécrire, puis vérifie que
`git diff --stat origin/main..HEAD` ne contient que le travail nouveau.

---

## Le catalogue, et la famille FEMMES

`src/data/catalogue.ts` décrit les familles et leur **état réel**.

Un programme n'est `disponible` que s'il est **réellement jouable de bout en
bout**. Tout le reste est `a-venir`, et un programme `a-venir` ne se démarre
pas : le bouton n'existe pas, il n'est pas seulement grisé.

| Famille | État |
|---|---|
| POWER | Disponible — c'est le programme de ce dépôt |
| MASS | Trois programmes indépendants, ordre conseillé SANS verrou : HYPERTROPHIE (`mass8`, à venir) → FORCE (`mass-force`, **disponible en version de travail, S1 seule** — ouvert à la demande de Guillaume) → CONGESTION (`mass4`, disponible) |
| LADIES (ex-FEMMES) | Parcours de 8 étapes. Le cycle 1 (FEMMES 8, affiché LADIES CYCLE 1) est **disponible** ; les 7 autres `a-venir` |
| PERSO | Programme apporté par quelqu'un d'autre |

**Renommée LADIES** (Guillaume, 23 novembre, « go ladies ») : seuls les
NOMS affichés changent (famille « LADIES », étapes « LADIES CYCLE n » /
« LADIES TRANSITION n », aussi dans `regles-orientation-programmes.md`).
L'identifiant `femmes`, `femmes8`, les routes `#/femmes/*`, le thème
`[data-theme='femmes']`, les tables et le code gardent « femmes », comme
MASS 4 devenu MASS CONGESTION. Le badge retire le préfixe LADIES
(`engine/acces.ts`). `acces.test.ts` fige le nom.

**La place de FEMMES est déjà faite** : l'identifiant existe, l'entrée du
catalogue existe, le bloc de thème `[data-theme='femmes']` existe dans
`src/styles/tokens.css`. Ce qui manque, c'est le contenu sportif et l'identité
visuelle.

**N'invente ni l'un ni l'autre.** Pas d'objectifs, pas d'exercices, pas de
durées. Ces règles viennent de Guillaume ; le code les cite comme « §4 » (ne
rien inventer) et « §15 » (identité visuelle à définir plus tard).

**L'identité visuelle est « Rosée Sculptée »** (planche de Guillaume, 23
novembre, « refonte complète ») — elle REMPLACE l'ancienne identité
synthwave (nuit violette, néon magenta, `#d1006e`) : n'y revenir sous aucune
forme. Thème CLAIR, rose poudré : fond `#fdf7f5`, cartes `#fff1f4`, rose
`#c05a7a` (décors, grands boutons), Oswald (titres, italique synthétique) et
Inter (texte), embarquées en local (`assets/fonts/`, OFL). Trois valeurs de
la planche sont ASSOMBRIES pour le petit texte, et c'est voulu : bouton plein
`#b14f6e` (blanc 4,98), rose écrit `#a8435f`, vert « faite » `#2e6b47` sur
`#d5ecdd`. Seul thème clair : il redéfinit les couleurs d'état de POWER
(orange, rouge, bleu, faites pour un fond sombre) et passe
`color-scheme: light`. **Bandeaux photo** (Guillaume, 23 novembre, générés
SANS texte) : `Bandeau photo=…` — Aujourd'hui `femmesAujourdhui` (squat),
Semaine `femmesSemaine` (kettlebell), Nutrition `femmesNutrition`, Profil
`femmesReglages` (téléphone) ; `femmesMesures` (carnet) attend l'écran
Mesures. **Titres = planche des six bandeaux** (« AUJOURD'HUI / Ma séance
du jour », « SEMAINE / Mon programme · semaine par semaine », « NUTRITION /
Mon suivi nutritionnel », « RÉGLAGES / Mon compte, mes préférences · et mon
programme ») ; le numéro de semaine et la phase passent dans la carte de
Semaine. **Le bandeau REMONTE jusqu'en haut** : `.app` réserve déjà
l'encoche, `.hero` l'annule (marge négative) — sinon un vide doublait
l'encoche (vu sur iPhone). La photo nette commence sous l'heure (têtes en
haut des fichiers), CALÉE EN HAUT (`focus` en `… 0%`) avec un fondu de
10 px au plus — recadrée par le haut et fondue sur 26 px, elle effaçait les
têtes (iPhone de Guillaume) ; **une image REMPLACÉE change de nom de
fichier** : les images sont en `CacheFirst` 180 jours (`vite.config.ts`),
l'ancienne restait sur l'iPhone (bol Nutrition = `55_femmes_nutrition_bol_*`) ; son double flouté passe dessous ; la bande `--barre-etat`
est transparente en haut d'un écran à photo et revient au défilement
(`data-bandeau-photo` / `data-defile`, posés par `Bandeau`). Sur iOS 26
l'heure est NOIRE sur un voile clair posé par le système (captures de
Guillaume) : ne pas compter sur `black-translucent`. Jamais hors des
écrans FEMMES. Pas de Progrès FEMMES pour l'instant (décision de Guillaume) ;
le menu dit « Mesures », pas « Combiné ».
**Nutrition FEMMES** (`#/femmes/nutrition`, `NutritionFemmes.tsx`) : l'écran
« Mon plan » de l'appli sous le bandeau et le menu FEMMES, JAMAIS le plan
historique (`sansPlanHistorique`). Palier du jour : « entraînement » si une
séance FEMMES a été TERMINÉE ce jour-là, sinon « repos » ; le choix à
l'écran l'emporte. Cibles et fiche dans le Profil (`CartesNutrition`,
partagé avec les Réglages, `avecPlanHistorique={false}`). Sous FEMMES,
`#/nutrition` (retour du questionnaire) mène à `#/femmes/nutrition`. La
page Nutrition n'a PAS la classe `.page` (elle lève le plancher de 48 px
des boutons). `nutritionFemmes.test.tsx`.
Le contenu de la planche (Bloc Congestion, 71-79 %…) est celui de POWER :
seul le STYLE est repris, le contenu FEMMES ne bouge pas.
`styles/themeFemmes.test.ts` mesure les contrastes et refuse le synthwave.
**Écran Semaine — lot 1/6 FAIT** (référence iPhone + planche, « go
semaine ») : bandeau « PHASE n · NOM » + deux lignes (séances · durée,
tours × exercices · repos), cases de semaine défilantes (numéro, nom de la
phase, trait rose-or / mauve / rose par phase, choisie = contour 2 px),
carte de phase (filet rose, haltère, objectif), lignes « Séance n » avec
« ≈ durée » et la date SEULEMENT une fois faite ou passée (pas de date
prévue : la séance du jour est la première non faite). États réels : Faite
(vert), Non faite (gris), Prévue (rose plein), À faire (contour). Les
textes de la référence (Bloc Congestion, Jambes & Fessiers, DIM…) sont des
exemples POWER, jamais repris : `screens/femmes/semaineFemmes.test.tsx`.
Écart voulu : le bandeau passe SOUS l'heure de l'iPhone (barre d'état
`black-translucent`, heure blanche, réglage commun lu au lancement).
**Barre d'état FEMMES** : une bande fixe `--barre-etat` #8f4561 (blanc
6,58:1) tient la zone de l'heure sur TOUS les écrans FEMMES
(`html[data-theme='femmes'] body::before`, `global.css`) — sans elle,
l'heure disparaissait sur la Séance et dès qu'un écran défilait. Hauteur
nulle sans encoche. `themeFemmes.test.ts`.
**Alignement des autres écrans sur Semaine — FAIT** (« go alignement
FEMMES », sans maquette par écran) : titres de carte 22 px, texte 14,5 px ;
Aujourd'hui reprend la carte de phase de Semaine (haltère, filet rose) ;
Profil : niveau choisi = filet + pastille « CHOISI » (jamais la couleur
seule) ; séance : le circuit perd son double contour épais (filet rose à
gauche, sous `:global([data-theme='femmes'])` dans `Session.module.css`,
POWER et MASS inchangés). Les cinq autres écrans : lots 2 à 6.

### Décision prise : le programme FEMMES sera GÉNÉRIQUE

Pas calibré sur une personne. Plusieurs pratiquantes doivent pouvoir le suivre.

**Ce qui est déjà générique, et qu'il ne faut surtout pas réécrire :**

- Les charges des lifts principaux sont des **pourcentages du 1RM**
  (`pct(82, 'back-squat', 95)` dans `mainLiftTable.ts`). Le troisième argument,
  `kgOrigine`, n'est qu'une référence historique affichée : c'est le `%` qui
  calcule la charge, à partir du 1RM saisi par la pratiquante.
- Le **combine initial** (semaine 0) mesure ces 1RM : squat, bench, deadlift,
  tractions. Le moteur en dérive tout le tableau.

Autrement dit : une femme qui démarre à 40 kg de squat reçoit déjà les bonnes
charges, sans qu'une ligne de code change.

**Ce qui était personnel à Guillaume et EST SORTI :** le §14 (adducteur
gauche). Plus de champ `painWatch`, plus d'écran de suivi de douleur, plus
aucune consigne qui nomme sa blessure. Décision de Guillaume : « disparaît »,
pas de mécanisme de blessure déclarée. La table `painLog` reste en base et
dans l'export : on ne supprime pas des données saisies. Les décisions de
programme qu'elle avait motivées (Zercher March déprogrammé, Copenhagen au
vendredi en levier court) sont **gardées telles quelles**. Des tests
(`coreCycle.test.ts`, `program.test.ts`) empêchent tout retour.

**Ce qui reste strictement personnel à Guillaume, et doit sortir :**

1. **Les rampes d'échauffement du combine** (`RAMP_SQUAT` et consorts) portent
   des kilos absolus (« 147,5 seulement si 142,5 passe proprement »). À dériver
   du 1RM estimé, ou à redemander à chaque combine.
2. **Le plan alimentaire** (`plan-alimentaire-12-semaines.md`) est le sien.
3. **Les objectifs du §13**, calculés sur ses 1RM à lui.

**FEMMES 8 n'est PAS un programme post-partum** (Guillaume, 23 novembre :
« supprime cette donnée »). Sa base d'origine l'était ; les questions datées
(visite post-natale, diastasis, rééducation périnéale) ont été retirées et
`femmes.test.ts` interdit tout retour de « post-partum », « accouchement » ou
« grossesse » dans ses textes. Ne jamais le présenter, le commenter ni le
calibrer comme une reprise post-partum.

Un programme ne se justifie pas par le sexe seul. Il se justifie par sa
**structure** — ici, des circuits en tours, du matériel léger à domicile, une
question de sécurité (gêne du périnée à l'effort, non bloquante) et des
substitutions automatiques. Rien de tout cela n'existe dans POWER 12, et c'est
bien pour ça que le programme a lieu d'être.

Demande à Guillaume le niveau visé, l'objectif, les jours disponibles, le
matériel et la durée avant d'écrire la moindre séance.

---

## Ce qui est volontaire et n'est pas à « corriger »

- **Compte en ligne : FACULTATIF, lot 1 FAIT (décision de Guillaume, 23
  novembre).** Remplace l'ancien « pas de compte, tout local ». Supabase
  (région Francfort), configuré par `src/cloud/config.ts` : deux valeurs
  publiques ; vides = aucune carte, aucune requête, appli d'avant. Mise en
  route : `docs/compte-en-ligne.md` + `supabase/setup.sql` (un dossier
  privé par compte, `supprimer_mon_compte`). Connexion par CODE e-mail (un
  lien ouvrirait Safari, pas la PWA), consentement explicite (données de
  santé, RGPD). Ce qui part = l'export « Exporter mes données » tel quel,
  SANS photos ni vidéos ; la restauration passe par la même confirmation
  que le fichier. Déclencheurs : « Séance terminée » (POWER/MASS/importés
  et FEMMES), ouverture si dernière réussite > 24 h ou envoi en attente,
  retour du réseau. **Règles à ne pas « corriger »** (`cloud/regles.ts`) :
  une base vierge n'est JAMAIS envoyée, même forcée ; moins de données que
  le compte = rien n'est envoyé, l'écran propose « Restaurer » ou
  « Remplacer quand même » ; la précédente est gardée à côté. Une
  sauvegarde ratée ne bloque jamais une séance (« en attente », repart
  seule). État local (`state/cloudEtat.ts`) en `localStorage`, jamais en
  base. Pas de synchronisation multi-appareils (les clés `++id` l'
  interdisent sans renuméroter toute la base) ; pas d'admin (question RGPD /
  HDS à trancher d'abord). Le client Supabase est un chunk à part
  (`supabase-*.js`), hors pré-cache. Tests : `cloud/regles.test.ts`,
  `cloud/sauvegarde.test.ts`, `components/compteCloud.test.tsx`.
- Le Zercher March est **déprogrammé mais conservé au catalogue** : « on ne
  supprime pas d'exercices existants ».
- Le Bear Crawl est **déprogrammé dès la semaine 1 mais conservé au catalogue**,
  pour la même raison. Le tronc du dimanche tient en deux exercices sur les
  douze semaines.
- Le samedi porte deux exercices de « flexion latérale » (Suitcase Carry +
  Roman Side Bench). C'est l'**unique dérogation** à la règle « jamais deux
  exercices du tronc de la même famille le même jour », écrite comme une paire
  nommée et assumée par Guillaume.
- **Case « Charge » vide = à toi de choisir, et l'écran le dit** (POWER).
  Sans historique, un accessoire autorégulé ou un repère de forme n'affiche
  aucun kilo (jamais la charge de l'auteur). `aideChargeVide`
  (`engine/loadEntry.ts`) écrit dessous « Première fois : choisis une charge
  qui tient les répétitions demandées à RPE x… » ; pour les 4 mouvements du
  combine, « Charge calculée sur ton 1RM… ». Jamais au poids du corps, donc
  jamais sur MASS. L'alternative du Landmine Press ne donne plus « 22 kg »
  (charge de l'auteur) mais un repère relatif (−10 à 15 % du Landmine barre)
  et le RPE — `.md` et code, `data/alternativeLandmine.test.ts`. Le RDL (§3
  du `.md`) ne dit plus « S2 : 85 kg, S3 : 90 kg » mais une règle au RPE
  (« monte d'un cran si le RPE […] est resté à 7 ou moins »), décision de
  Guillaume — `data/consigneRdl.test.ts`. Le moteur, lui, n'a pas changé :
  charge « forme » recalée sur le réel ; la règle RPE est une consigne.
- **« Mon plan » (nutrition sans plan historique) se lit comme les « Repas
  types »** (demande de Guillaume, 15 novembre) : une ligne par aliment (nom,
  quantité, kcal), le curseur / « Remplacer » / « Retirer » seulement sur la
  ligne touchée, les pastilles derrière « + Ajouter un aliment ». Le « % » de
  l'en-tête est la part de la CIBLE du jour (le plan est incomplet), à défaut
  du total du plan. `components/planPersoPresentation.test.tsx`.
- **Photos des plats** (Guillaume, 15 novembre). Toucher une carte de « Choisir
  un repas » ouvre `FicheRepas` (photo en grand, chaque ingrédient avec
  quantité et kcal, « Choisir ce repas »). Dans « Mon plan », le repas porte la
  vignette de son plat tant que TOUS les ingrédients du plat y sont
  (`engine/repasReconnu.ts`) : quantité changée ou aliment ajouté la gardent,
  ingrédient remplacé ou retiré l'efface. Rien n'est écrit en base. Les plats
  aux brocolis utilisent `brocolisCuits` (« Brocolis cuits », fleurettes sur
  les photos), jamais `brocolis` (« Purée de brocolis », celle du plan
  historique, inchangée) ; le questionnaire « brocolis » pointe vers
  `brocolisCuits`. `ficheRepas.test.tsx`, `repasReconnu.test.ts`,
  `bibliothequeRepas.test.ts`.
- **ME, MYSELF & I (programmes importés en JSON) — lots 1 à 6 FAITS.** Source :
  `docs/ADR-perso.md` (branche `docs/adr-perso`). Validateur pur
  (`engine/perso/`), table v25 `programmesImportes` et sauvegardes au format 4
  (`db/programmesImportes.ts`), mémoire synchrone remplie avant le premier
  écran (`programmes/perso/memoire.ts`), module générique
  (`programmes/perso/module.ts`). Règles à ne pas « corriger » : une absence
  n'est jamais 0 ; texte verbatim ; 12 semaines au plus ; aucune charge,
  aucun RPE, aucune progression calculée ; le champ de charge s'ouvre VIDE
  (l'historique n'est qu'un repère écrit) ; un identifiant inconnu ouvre
  « Programme indisponible », jamais POWER 12 (`femmes8`, `null` et le
  catalogue compilé gardent leur repli). Fichier d'exemple : Training 1
  (`engine/perso/__fixtures__/training1.json`, identique à l'annexe B).
  **Lot 5, la page** (`components/perso/`, famille `perso` du catalogue) :
  le fichier est validé et montré AVANT d'être enregistré (suivi complet ou
  « Suivi partiel : X exercices sur Y », « Ce que le document ne disait
  pas ») ; une durée absente est demandée de 1 à 12 semaines, « Choisir »
  sélectionné et bouton désactivé tant qu'il manque — jamais de valeur par
  défaut. Archiver sort la version de la liste (section « Archivés ») ;
  supprimer est refusé, avec la raison, tant qu'un cycle la suit. La famille
  n'est jamais « À venir ». La restauration annonce les programmes importés
  qu'elle remplace. `components/perso/importPerso.test.tsx`.
  **Lot 6, non-régression (tests seulement)** : `db/nonRegressionV25.test.ts`
  restaure une VRAIE sauvegarde format 3 (`db/__fixtures__/sauvegarde-avant-v25.json`,
  fabriquée avec la version d'avant le lot 1 : POWER, MASS CONGESTION et
  FEMMES joués) et rejoue Training 1 importé → séance jouée → export → base
  neuve → restauration. Ne pas régénérer ce fichier avec la version
  actuelle : il doit rester d'AVANT la v25. Comparaison navigateur faite le
  22 novembre : les mêmes séances écrivent les mêmes lignes en base avant et
  après les lots 1-5. Un seul PDF réel éprouvé (Training 1) : pas de second
  programme fourni.
- **Retours du 22 novembre (toute l'appli).** Le TEMPO s'affiche en tête de
  carte, pastille à droite de « RPE · Repos » (`TempoChip`), et en tête de
  superset. Champ `tempo` (`TempoPrescrit` : texte, semaines?, jours?) sur
  les définitions d'exercice des 4 programmes ; le texte est EXTRAIT mot pour
  mot de la consigne, jamais reformulé (`engine/tempo.test.tsx` relit chaque
  segment « · »). Squat : 3-0-X en S1-3, « descente contrôlée ~2 s » en
  S5-7, rien ailleurs ; barre au front MASS CONGESTION : 3 s lundi, 2 s
  samedi. Les programmes importés n'ont pas de tempo extrait (texte
  verbatim). **Rappel de sauvegarde** : carte au-dessus de « Séance
  terminée » le DERNIER jour d'entraînement de la semaine du programme
  (`RappelSauvegarde`, aussi dans la séance FEMMES), qui lance l'export ;
  elle se tait après un export du jour. La date du dernier export vit en
  `localStorage` (`state/dernierExport.ts`), jamais en base : restaurer une
  vieille sauvegarde ne doit pas faire croire qu'un export vient d'être fait.
  **« Préparer une fiche pour quelqu'un »** est sorti des Réglages vers
  `#/admin` (`AdminScreen`), qu'aucun lien n'ouvre : outil de coach.
  **Les questions d'un exercice se posent AVANT ses séries, superset
  compris** (le vrai « point 1 » de Guillaume) : aligner les reps et charge
  de la semaine (§11) vivent dans `PropositionsExercice`. Un « cas 10 »
  (changer la charge après la 1re série) a été écrit sur un malentendu puis
  RETIRÉ à la demande de Guillaume : ne pas le réintroduire sans qu'il l'écrive. Carte seule : au même endroit qu'avant. Superset :
  en tête de bloc, avant « Tour 1 », avec le nom de la station ; la fiche du
  bas (`hideSets`) ne les répète pas. `components/propositionsSuperset.test.tsx`.
- **Recalage sur le réel : EN PROPORTION, sauf le lest** (Guillaume, 22
  novembre, écrit au §11 du `.md`). L'écart réel / prévu se reporte en %
  pour toute charge écrite par le programme : les lifts du §9 (déjà le cas)
  et désormais le RDL et le Pin Squat (seules cases en kilos). Le lest des
  tractions reste en kilos. Le §11 (`enPourcentage`) suit la même règle.
  La proportion est dans la PREMIÈRE phrase du message (seule visible sur la
  carte). `engine/recalageToutEnProportion.test.ts`. Les INCRÉMENTS du §11
  (+5 / +2,5 kg des cas 2-3, +10 kg Hip Thrust, +2,5 kg Front Squat, +1 kg
  poulie) restent en kilos : les passer en % demande des chiffres de Guillaume.
- **Speed Squat = planche du back squat** (`MEME_GESTE`, `fichesPower12.ts`) :
  la planche que Guillaume y avait déposée était celle du back squat, au
  pixel près. **Bibliothèque des exercices LIBRES de POWER**
  (`BIBLIOTHEQUE_LIBRE_POWER`) : un exercice de remplacement tapé à la main
  dont le nom (ou un alias, casse et accents ignorés, via `freeId`) y figure
  reçoit sa planche — sous un cycle POWER seulement (`ficheLibrePower`, passé
  par `useSessionData`). Il est aussi proposé dans le panneau « Remplacer ».
  Première entrée : Rowing buste penché. « On étoffe la bibliothèque dès
  qu'on peut » : chaque planche se vérifie avant d'entrer.
- **Contraste S9-11, carte du lourd** : elle porte AUSSI la planche du
  mouvement explosif (box jump, plyo push-up, broad jump), chaque bouton
  nommé (« Fiche — … ») ; elle ne se grise qu'une fois le saut de la DERNIÈRE
  série validé (`onAttenteExplosif`). **Vendredi S9-11 : ordre de Guillaume**
  — Broad Jump, Pogo, Lateral Bound, PUIS Hang High Pull (op `move` des
  règles de bloc ; S1-8 inchangés). `hangHighPull.test.ts`.
  **Vendredi plafonné à 3 séries par exercice, sur les douze semaines,
  Push Press et Speed Squat exceptés (4)** — Guillaume : « trop de séries
  empêchent de rester explosif jusqu'au bout ». Broad Jump 3 × 2 (deload :
  2), Hang High Pull 3 × 3 (tous blocs), Lateral Bound 3, Farmer Carry 3,
  **Jump Squat GARDÉ à 3 séries** (3 × 4 S1-8, 3 × 3 S9-11 ; 2 en deload),
  Push Press et Speed Squat à 4 (§9 ET `mainLiftTable.ts`). Vendredi : 77
  (S1-3), 81 (S5-7), 79 (S9-11), 59 en deload, montée en charge comprise ;
  « 55-85 min » au §3 = `durationLabel` du code (testé).
  `data/vendrediPlafond.test.ts` (81 au plus).
- **Contraste S9-11 : l'en-tête de carte dit le cycle** (« Cycle ≈ 3 min 30 »
  sur les trois jours, §10), plus le repos de base qui n'a pas cours. Le
  chrono suivait déjà la séquence. **Repos : 1 min 30 lourd → explosif, 2 min
  explosif → lourd, squat, bench ET deadlift** (Guillaume, 23 novembre : « 1'30
  après le mouvement lourd et 2' après mouvement explosif » ; le squat du lundi
  était à 2 / 2). `enteteContraste.test.tsx`, `program.test.ts` (relit le §8).
- **Muscles et erreurs sous les 38 planches POWER** (repris du lot 6 de
  MAJK, 22 novembre). Texte transcrit tel quel du tableau « MAJK — Fiches
  techniques POWER 12 » (révision 5, toutes lignes « Validé » par Guillaume)
  dans `data/musclesErreursPower12.ts` : le tableau fait foi. Rattaché par
  `def()` d'`exercises.ts`, seulement quand le mouvement a une planche ; les
  tests du combiné empruntent le texte de leur mouvement ; MASS et FEMMES
  n'en ont pas. Affiché sous la planche ouverte (`InfosDeLaFiche`), section
  vide = pas de section, « C'est compris — aux séries » referme la fiche. La
  section CSS est AVANT le bloc MASS de `FicheMouvement.module.css`
  (`confinementMass.test.ts`). `musclesErreursPower12.test.tsx`.
- **Retours du 23 novembre (séance POWER).** La **montée en charge est
  REPLIÉE par défaut** : une ligne (« 5 · 3 · 2-3 · 2 reps · 1 min entre
  chaque », puis « n/4 faits ») ; on l'ouvre pour les kilos et les boutons,
  replier ne perd rien (`monteeEnCharge.test.tsx`). Le **tempo chiffré
  s'affiche en QUATRE CASES** (variante TB, choix de Guillaume) : « 2
  descente · 1 en bas · X montée · 0 en haut » (`phasesTempo`,
  `engine/tempo.ts`), en ivoire DOUX `--ivoire-doux` #d8d1c3 (« pas un blanc
  trop blanc, que ça reste discret »), case X rouge ; le lecteur d'écran lit
  la phrase complète (`expliquerTempo`). Un tempo en mots reste une pastille
  (`tempoExplique.test.tsx`). Les **fiches d'un superset sont AVANT les
  tours** (« Tour 1 »), après les questions (`propositionsSuperset.test.tsx`).
- **Choix visuels du 23 novembre** (planches de variantes, Guillaume) :
  **N3** — l'onglet actif du menu du bas porte une pastille IVOIRE, encre
  sombre (jetons `--ivoire` #f4f1ea / `--encre` #151a22 sur `:root`), plus de
  rouge ni de trait au-dessus ; **M2** — l'encadré « Montée en charge » a un
  filet rouge à gauche (comme « Contraste »), plus de contour rouge foncé.
  `styles/touchesClaires.test.ts`. Tempo : variante TB (voir « Retours du
  23 novembre (séance POWER) »).
- **« Mon avant · après » — l'image à publier** (Guillaume, 23 novembre,
  maquette B2 thème POWER, « go comparatif »). Carte de l'écran Combine
  (`components/ComparatifPartage.tsx`) : combine INITIAL (S0) face aux tests
  FINAUX (S12) — l'appli ne mesure pas en S1. Moteur pur
  `engine/comparatif.ts` : quatre barres (squat, bench, deadlift, tractions
  lestées) + deux tuiles (broad jump, sprint 10 m) ; **une mesure absente
  s'écrit « non mesuré S0 / S12 »** (décision de Guillaume), jamais 0, jamais
  une ligne retirée ; **vert = progrès, rouge = recul** (hachuré), jugement
  d'`ecartCombine` (sprint plus court = progrès) ; 1RM en %, lest en kg.
  Image 1080 × 1350 dessinée au canvas dans le téléphone
  (`media/comparatifImage.ts`), partagée par la feuille de partage, sinon
  téléchargée. Photos : première et dernière photo de suivi du cycle par
  défaut, remplaçables à l'écran ; le choix n'est enregistré NULLE PART.
  S'ouvre dès une mesure S12 ; avant, la carte l'annonce. POWER seulement
  (MASS et FEMMES n'ont pas de combine S0/S12). `comparatif.test.ts`,
  `comparatifPartage.test.tsx`.
- **Alignement des reps** : la question n'est posée que sur un exercice
  marqué `alignable` par la séance POWER (MASS, importé, remplacé : jamais),
  et les curseurs des séries non validées suivent l'attendu accepté.
  `components/alignementApplique.test.tsx`.
- **Montée en charge avant le PREMIER mouvement lourd de la séance**
  (Guillaume, 23 novembre ; §6 du `.md` POWER, §2 bis de MASS FORCE, même
  tableau) : 5 reps à 50 %, 3 à 70 %, 2-3 à 85 %, 2 à 90-95 % de la charge
  de travail, 1 min de repos. Données `data/monteeEnCharge.ts`, kilos
  arrondis au pas par `engine/monteeEnCharge.ts` (sans charge connue : des
  %, jamais un kilo). POWER : le premier lift `main` de la séance (squat,
  Pin Squat en S5-7, bench, push press, deadlift — même APRÈS un explosif),
  combiné S8 compris, jamais en S0 ni S12. MASS FORCE : le mouvement évalué
  qui ouvre chaque séance. Jamais MASS CONGESTION, FEMMES ni importés. Bloc
  `MonteeEnCharge` en tête de carte, retiré à la 1re série de travail ;
  « Fait → 1 min » lance le chrono ; RIEN n'est enregistré. Compté dans les
  durées (`SEC_MONTEE_EN_CHARGE`, ~5 min) : §3 relevé à 50-85 / 55-85 /
  55-85 / 45-85. `components/monteeEnCharge.test.tsx`.
- **Questionnaire « Votre plan alimentaire » dans l'appli** (Guillaume, 23
  novembre : « une appli, pas dix liens »). Route `#/questionnaire`, ouverte
  depuis « Mon plan » vide et Réglages → Partager une fiche. Source FIGÉE :
  `docs/questionnaires/plan-alimentaire/` (copies exactes du site) ; texte
  transcrit mot pour mot (« vous », apostrophes droites) dans
  `data/questionnairePlanAlimentaire.ts`, logique dans
  `engine/questionnairePlanAlimentaire.ts`. Le test EXÉCUTE le code du site
  et compare erreurs et résumé sur 400 profils : le résumé envoyé est le
  même au caractère près (Guillaume et ses outils le relisent). Un seul
  écart voulu : AUCUNE valeur nutritionnelle sur les cartes (celles du site
  sont « non vérifiées », celles du catalogue comptent 5 aliments à
  l'unité) — la phrase « Valeurs moyennes pour 100 g » n'est pas reprise.
  Réponses en `localStorage` (`state/questionnairePlan.ts`), jamais en base,
  ni export ni cloud. Seul geste propre à l'appli, à la fin : « Utiliser ces
  N aliments dans Mon plan » (`alimentsPreferes`, traduits par
  `alimentPour`) ; une liste existante est annoncée avant d'être remplacée ;
  les aliments ajoutés à la main restent dans le résumé seulement.
  Aucun calcul de cibles : le questionnaire recueille, Guillaume décide.
- **Bilan sportif et nutrition dans l'appli** (Guillaume, 23 novembre, « go
  bilan sportif »). Route `#/bilan`, ouverte par la carte « Pas sûr de ton
  choix ? Fais ton bilan sportif » du catalogue et par Réglages → Partager une
  fiche. Source FIGÉE : `docs/questionnaires/bilan-sportif/bilan.js` (script
  du site, copie exacte). Transcription mot pour mot (« tu », apostrophes
  droites, noms de champs du site) dans `data/questionnaireBilanSportif.ts` ;
  logique dans `engine/questionnaireBilanSportif.ts`, fonction par fonction.
  Le test EXÉCUTE le script du site et compare, sur 400 jeux de réponses,
  sections montrées, conditions, questions obligatoires, vigilance, arrêt de
  sécurité et résumé (au caractère près). Réponses en `localStorage`
  (`state/questionnaireBilan.ts`), jamais en base, ni export ni cloud.
  L'appli n'en tire RIEN : ni programme, ni charge, ni cible. Les « bases
  candidates » du résumé sont celles du site (Force + explosivité, Prise de
  masse, Perte de poids H/F, Pilates), indicatives pour le coach, et ne
  désignent AUCUN programme de l'appli. Le « max estimé ≈ » du résumé est la
  formule du site (Epley), affichée au coach seulement : elle ne doit jamais
  servir à une charge (règle « aucune formule validée » de MASS FORCE).
  **Orientation — FAIT** (« go brouillon orientation », réponses A à H de
  Guillaume) : `regles-orientation-programmes.md` (VALIDÉ, source de vérité)
  → `data/orientationProgrammes.ts` (relu tableau par tableau par
  `orientationProgrammes.test.ts`, qui rejoue chaque réponse) →
  `engine/orientation.ts`. Encart « Les programmes qui te correspondent » en
  tête de l'écran de fin du bilan, JAMAIS dans le résumé envoyé. Une
  indication : « Voir le programme » ouvre le catalogue, rien ne démarre ni
  ne se verrouille. Toutes les conditions doivent passer, programme
  `disponible` seulement, au plus deux. Orange = aucune suggestion ; rouge
  et hors périmètre = rien. POWER : 5 séances, 5 jours à 60 min, salle, trois
  barres maîtrisées, intermédiaire+. MASS : MASS FORCE en attendant
  HYPERTROPHIE (mention « bientôt disponible »), CONGESTION jamais au départ.
  FEMMES CYCLE 1 : seulement « Femme » (décision de Guillaume, écart assumé
  au « le sexe ne décide jamais » du site, écrit au §5 du `.md`). Perte de
  poids, mobilité, Pilates : aucune suggestion (aucun programme).
- **Nutrition, lot 1 — un objectif en CALORIES suffit** (Guillaume, 23
  novembre). `cibleSaisie` (`data/ciblesNutrition.ts`) : calories dans les
  bornes OBLIGATOIRES, protéines / glucides / lipides FACULTATIFS un par un ;
  une macro absente reste `null`, JAMAIS 0 ; une macro hors bornes rend la
  journée inutilisable. `macrosValides` garde son sens (les 4 chiffres) et ne
  sert plus qu'à la barre de répartition (`macrosPosees`) et au contrôle
  d'écart kcal/macros. Le reste à manger et l'écart de « Mon plan » ne citent
  que les macros posées (`ecartCible`, `phraseReste` : avec les 4 chiffres,
  la phrase d'avant mot pour mot). FICHE : une macro absente s'écrit « - »
  (`C=2400,-,-,-`), JAMAIS une case vide — l'ancienne lecture prenait « »
  pour 0 ; l'ancien format à 4 nombres se relit tel quel. Les deux journées
  restent exigées par la fiche. `engine/caloriesSeules.test.tsx`. Lots 2 et
  3 (écran du choix, mises en place, écran du jour fusionné : maquettes du
  23 novembre) attendent les maquettes de la refonte visuelle.
- Le chrono de sprint est un **indicateur de transfert**, pas un objectif :
  aucune séance ne fait sprinter.
- Le programme ne propose **aucune quantité alimentaire** : il additionne et
  affiche l'écart. Proposer un gramme serait une prescription.
- **FEMMES 8 n'est pas un module, il a ses propres écrans.** L'App aiguille
  tout cycle `femmes8` vers `#/femmes/*` (et renvoie au catalogue un
  `#/femmes/*` sans cycle FEMMES). Ses séances vivent dans `femmesSeances`
  (v23), son niveau et ses deux réponses de sécurité sur la ligne du cycle
  (`cycle.femmes`). **La séance du jour est la première non faite**, pas une
  date : une séance manquée n'est jamais sautée (`avancement.test.ts`).
  `femmesSeances` n'est PAS dans `TABLES_PAR_CYCLE` (la montée v17 tournerait
  sans elle) mais DOIT rester dans `TABLES_DU_CYCLE` de `repo.ts`, sinon un
  cycle FEMMES avec des séances passe pour vierge et peut être supprimé.
  **La séance FEMMES se présente comme celle de POWER** (demande de Guillaume) :
  `SeanceFemmes.tsx` reprend `Session.module.css`, `WarmupSection`, `Stepper`
  et la carte de circuit de POWER — le thème FEMMES repeint le tout. Chaque
  tour se valide sur sa ligne ; `actual` = le plus petit des tours, `kg` = la
  charge du dernier (`tours.ts`), pour que la progression des charges lise les
  mêmes champs qu'avant. Le repos se lance en fin de tour, jamais entre deux
  exercices d'un même tour.
- **Le parcours FEMMES ne s'ouvre PAS comme celui de POWER.** POWER est
  linéaire : chaque étape attend la précédente. FEMMES (4 cycles de 8
  semaines, 4 transitions de 4) suit l'exception de Guillaume : **terminer un
  cycle ouvre la transition qui le suit ET le cycle suivant**. Une transition
  n'ouvre rien. Des tests de `acces.test.ts` figent cette règle.
- **Les transitions seront AU CHOIX — décision de Guillaume, pas encore codée.**
  À chaque étape « Transition » d'un parcours, l'utilisateur choisira UN cycle
  de renfo parmi plusieurs, selon le point faible qu'il veut travailler (par
  exemple dos, ischios, pecs-épaules, fessiers — toujours avec un gros travail
  CORE). Rien n'est imposé. Deux règles tranchées :
  1. **Chaque famille a ses propres renfos** (POWER, MASS, FEMMES) : un
     « renfo fessiers » FEMMES n'est pas celui de POWER.
  2. **Un même renfo peut se refaire** plusieurs fois dans le parcours (« si le
     besoin de continuer à renforcer son dos se fait ressentir »).
  Terminer n'importe lequel des renfos proposés compte comme la transition
  faite. **Ne rien construire avant que Guillaume ait écrit les cycles** : pas
  de lignes « À venir » aux noms provisoires. Les noms ci-dessus sont des
  exemples, pas des titres.
- **MASS : trois programmes, aucun verrou** (décisions de Guillaume, audit MASS
  FORCE). L'ancien « MASS 4 » s'appelle MASS CONGESTION : seul son NOM a changé,
  l'identifiant `mass4` et le contenu sportif sont strictement inchangés.
  MASS 12 est retiré. L'ordre conseillé (hypertrophie → force → congestion) se
  lit au catalogue — numéros + « Ordre conseillé, pas obligatoire » —, jamais
  comme un déverrouillage (`ordreConseille`, pas `deblocage`).
  Décisions déjà prises pour la suite, À NE PAS CODER sans « go » du lot :
  1. **MASS FORCE ne démarre qu'après un combiné** (développé couché, tirage
     vertical, squat, push press). Le combiné n'est jamais imposé à
     CONGESTION.
  2. **Ses références de force sont dans une table À PART** — FAIT (lot 2,
     base v24, `referencesForce`) —, jamais dans `settings.oneRM` (qui pilote
     tout le tableau de POWER). Une ligne = exercice, variante de matériel,
     `direct` (1RM, 1 rep) ou `sous-maximal` (charge × reps BRUTES), date.
     Ajout seul : `db/references.ts` n'a volontairement ni modification ni
     suppression. Pas rattachée à un cycle (hors `TABLES_DU_CYCLE`) : supprimer
     un cycle ne l'emporte jamais. `referenceCourante` (moteur) ne cherche que
     le MÊME exercice et la MÊME variante : aucune conversion de matériel.
     Des tests (`references.test.ts`, moteur et base) figent tout cela.
  3. **Le sous-maximal enregistre ses données brutes** (charge × reps) sans
     estimation : aucune formule n'est validée. Ne pas en inventer.
     L'écran du combiné existe — FAIT (lot 3, `#/evaluation`,
     `EvaluationScreen.tsx`), accessible depuis MASS FORCE au catalogue même
     tant qu'il est « à venir ». Matériels en LISTE FERMÉE
     (`data/combineMass.ts` : barre, Smith, haltères, poulie, machine
     guidée ; décision de Guillaume) ; un matériel hors liste est refusé.
     Chaque test ne propose que les matériels qui lui conviennent (push
     press : Smith ou barre). Le test direct porte la phrase de Guillaume
     (« pour les pratiquants expérimentés, dans des conditions appropriées »)
     et AUCUN critère d'éligibilité inventé.
  4. Les séries fractionnées ne s'implémentent pas avant validation, et
     jamais via `secondReps` (qui veut dire « dégressive » à l'écran).
  5. **MASS FORCE, lot 4a — FAIT, semaine type S1 seulement.** Source :
     `programme-mass-force.md` (§1 tableau, §3 consignes/vigilance), relu case
     par case par `massforce.test.ts`. Module `programmes/massforce/`
     (`semaines: [1]`) : aucune charge, aucun %, aucun champ RPE (« RPE 8 »
     est une consigne). Les 4 mouvements évalués portent « charge libre en
     attendant ». Ouvert ensuite au catalogue (statut `disponible`, S1 seule).
     Chaque option (matériel/variante) est un exercice à part (`mf-…`), donc
     un historique à part ; le choix est fait une fois par cycle
     (`CycleRow.massForce.choix`, passé aux séances par `ctx.choixCycle`).
     **La porte** (`depart.ts`, `PorteMassForce`) : Aujourd'hui, Semaine et
     les séances restent fermés tant que les choix ne sont pas confirmés ET
     que chaque test a une référence AU MATÉRIEL CHOISI (une référence barre
     n'ouvre pas un cycle Smith). Onglet Combiné = `EvaluationScreen` ;
     Progrès et Nutrition = vue `a-venir`, sans contenu. Superset biceps :
     3e rythme `transition` (repos court puis long), le chrono dit
     « Transition → … ». Combiné : bench barre/Smith, plus d'haltères.
     Reste à écrire par Guillaume : S2–S4.
  6. **MASS FORCE, lot 5 — FAIT : fourchettes de charge S1.** Paramètres
     propres à MASS FORCE dans `programmes/massforce/charges.ts`, rangés PAR
     SEMAINE (seule la S1 existe ; une semaine absente n'hérite de rien) et
     par exercice-matériel : bench et tirage vertical 75–82,5 % (les deux
     matériels, chacun sur SON 1RM), squat 70–80 % **Smith seulement**, push
     press AUCUNE. Seul un 1RM **mesuré** (test direct), même exercice et
     même matériel, sert ; le plus récent ; un sous-maximal n'est jamais pris
     pour un 1RM (aucune formule validée). Fourchette sans arrondi. Depuis
     le lot 6, le champ kg s'ouvre sur la charge cible (décision de Guillaume). Affichage `chargeCible` dans `ExerciseCard` (absent
     pour POWER et MASS CONGESTION). `charges.test.ts` fige tout cela.
  7. **MASS FORCE, lot 6 — FAIT : progression S1 → S4** (§1 ter du .md).
     Prescription IDENTIQUE sur 4 semaines (`SEMAINES_FORCE = [1,2,3,4]`) ;
     seule la charge évolue, selon les séances réellement faites
     (`programmes/massforce/progression.ts`, fonctions pures sur les séries
     BRUTES du cycle — jamais `buildHistoryIndex`, dont `completed` veut dire
     « au moins une série »). Fourchettes = couloir : départ au bas, +2,5 %
     après réussite, plafond au haut, −5 % après deux échecs, suspendu au bas.
     Tolérance de 2,5 points (sous-charge = même %). Sans RIR : deux
     réussites au même % avant de monter. Ancre figée à la hausse, baisse
     immédiate. Trois champs FACULTATIFS sur `SetRow` (`pctPrescrit`,
     `kgCible`, `rirSaisi`), non indexés : pas de migration, l'export les
     garde. **Ne jamais réutiliser `actualRpe` pour le RIR** : son sélecteur
     est pré-rempli (une absence deviendrait une valeur) et les écrans
     Progrès en font la moyenne. Complémentaires : `plage` (+2), `fixe` (RPE
     prescrit, superset), `push-press` (RIR ≥ 2) — conseil sans kilos.
     `progression.test.ts` rejoue les anomalies et trois profils.
     Le bouton « Rep ratée » s'affiche sur TOUS les exercices MASS FORCE
     (`signaleEchec`, posé par le module ; POWER : rôle `main` seulement,
     MASS CONGESTION : jamais). Une série ratée = échec pour la progression.
     `repRatee.test.tsx` fige les trois programmes.
  8. **Le parcours d'accueil et l'écran Aujourd'hui dépendent du programme**
     (régression signalée par Guillaume : MASS FORCE ouvrait le parcours de
     POWER avec ses 1RM de septembre). `OnboardingScreen` ne montre les
     maxima et la référence de saut que si `reglages.force` ; sinon, la date
     seule (« Lundi de la semaine 1 »). Les textes hors séance (combine
     initial, « N semaines bouclées », raccourci Nutrition) passent par
     `programmes/textesCycle.ts`. POWER ne change pas d'un mot — des tests
     (`OnboardingScreen.test.tsx`, `textesCycle.test.ts`) le figent.
  9. **Identité MASS = maquettes sombres de Guillaume (14 novembre)**, pour
     toute la famille (FORCE et CONGESTION) : `[data-theme='mass']` presque
     noir et rouge, « // » rouge après les titres, semaine choisie rouge.
     Elle REMPLACE la palette claire ardoise (décision antérieure, renversée
     par Guillaume). Contrastes mesurés par `styles/themeMass.test.ts`.
     **Photos d'en-tête MASS — FAIT** : quatre photos fournies par Guillaume
     (885 px de large, pas agrandies), une par écran
     (`HABILLAGE.mass.entetes` : athlète → Accueil, disque → Semaine, salle →
     Séance, disques → Combiné). Sujet à droite, voile horizontal à gauche
     sous le titre. **L'en-tête de l'Accueil MASS est PERMANENT** (décision
     de Guillaume) : « MASS // » argent, nom exact du cycle (MASS FORCE ou
     MASS CONGESTION, lu au catalogue), « Semaine X / Y ». L'état du jour
     (« Ça commence bientôt », nom de séance, « Repos ») descend sous
     l'en-tête, en petit (`.titreJour`). POWER et FEMMES : rien ne change —
     `data/enteteMass.test.tsx` le fige.
     **Écrans Semaine et Combiné MASS — FAIT**, transcrits des références
     iPhone de Guillaume (mesurées : 1 px de référence = 1,336 px CSS pour
     Semaine, × 0,473 pour le Combiné). Titres en vrai italique extra-gras
     (famille `Barlow Mass` dans `fonts.css` : même fichier que l'italique
     800 de FEMMES, zéro octet de plus) et en argent. Semaine : variante
     `argent` de `ScreenHeader`, sans « // ». Combiné : « MASS FORCE » est
     une ÉTIQUETTE dans le cycle (pas de bouton retour : on navigue par les
     onglets), trois encadrés à icône (haltère ajoutée à `Icon.tsx`).
     Écarts VOULUS aux références, à ne pas « corriger » : boutons, curseurs
     et date gardent 48 px (`--tap`), « Enregistrer le test » reste.
     `screens/combineMass.test.tsx` fige l'étiquette et la variante.
     **Écran Séance MASS — FAIT** (référence × 0,473), pour FORCE et
     CONGESTION. Tout le bloc « SÉANCE MASS » de `Session.module.css` est
     préfixé `:global([data-theme='mass']) .ecranSeance` : ces classes sont
     partagées avec la séance POWER, la séance FEMMES et le COMBINÉ MASS (une
     première version les repeignait aussi). `screens/seanceMass.test.ts`
     refuse tout sélecteur non confiné. Pas de trait sous le titre de séance ;
     « DUR » (et toute intensité MASS) en bord rouge. Écarts voulus : curseurs
     et bouton de fiche à 48 px, zone du retour qui mord de 12 px sur la
     barre d'état, photo de fiche inchangée (pas de fichier fourni).
     **Harmonisation de toute la famille MASS — FAIT** (lots B à E, audit
     validé par Guillaume). Les valeurs validées vivent dans des jetons
     `--mass-*` sur `:root` (`tokens.css`) : les réutiliser, n'en inventer
     aucune. En-têtes sans photo : compacts, sans le décor de POWER, titre
     argent. Cartes, boutons, champs, sélecteurs, panneaux de séance, barre
     de repos : tous en jetons MASS. Décisions de Guillaume : le « // » reste
     partout sauf sur Semaine ; le VERT reste pour « fait » (séance, série,
     interrupteur, fin de repos) ; le premier lancement MASS n'a pas de
     photo (le stade est à POWER). Chaque règle MASS d'un fichier partagé
     avec POWER est sous `:global([data-theme='mass'])` — trois tests de
     confinement (`enteteMassCss`, `confinementMass`, `seanceMass`) le
     vérifient. Photo de Semaine calée à DROITE (à gauche, un iPhone de
     430 px montrait une bande noire).
     **Fiches de MASS FORCE — COMPLÈTES : 28 exercices sur 28.** Table
     propre `programmes/massforce/fiches.ts` : 10 planches de MASS CONGESTION
     au même geste et au même matériel, 2 rattachements décidés par
     Guillaume (leg curl → leg curl allongé ; élévations frontales →
     alternées), 16 planches générées par Guillaume pour MASS FORCE, fond
     BLANC (décision de Guillaume pour toute la bibliothèque MASS), avatar
     MASS. Jamais un `power12-*`. MASS CONGESTION garde sa table
     (`mass4/fiches.ts`), inchangée. Les pièges de l'audit ont LEUR planche —
     ne jamais leur rattacher la voisine : tirage horizontal large ≠ prise
     serrée, push press ≠ développé militaire, incliné haltères ≠ incliné
     Smith. Toute planche fournie se vérifie (geste, matériel, muscles,
     cohérence avec la prescription) avant intégration : le curl et
     l'extension triceps ont été refaits pour des muscles ou un tempo faux.
     Le fond du bloc fiche (exercice sans fiche) de MASS FORCE est la salle
     MASS (`massSalle`, `ambianceFicheDe`). `massforce/fiches.test.ts`.
     **Bandeaux du 14 novembre — FAIT.** Sept images de Guillaume (3:1,
     ramenées à 1200/640 px). POWER : Nutrition (`nutritionPower`), Combine
     (`combinePower`, logo de chaussure effacé du fichier), Semaine
     (`semainePower`) ; leur voile est allégé (règle `data-visuel` de
     `ScreenHeader.module.css`), les autres en-têtes POWER ne changent pas.
     MASS (famille, `HABILLAGE.mass.entetes`) : nutrition, progres, mesures,
     reglages — aussi sur les onglets « à venir » de MASS FORCE. Jamais une
     image d'une famille chez l'autre : `data/bandeaux.test.ts`. `ballon` et
     `casque` supprimés (plus utilisés) ; `stade` reste (Aujourd'hui).
     Séance et Combiné MASS : le contenu commence SOUS la barre d'état
     (`--haut-ecran + 10px`), la photo reste dessous ; le rebond iOS est
     bloqué sur `html[data-theme='mass']` (bande vide sous l'heure, vidéo de
     Guillaume du 15 novembre).
     **Retours du 15 novembre** (`ScreenHeader.module.css`, thème MASS) :
     UN seul trait rouge sous les titres MASS, celui de Semaine et du
     Combiné (court, qui s'éteint) — plus de ligne de sous-titre entre deux
     traits ; le sous-titre reste dessous. Le voile du titre des bandeaux naît
     en fondu dans les 40 px au-dessus du texte (sinon arête nette, « film
     noir ») ; contraste des titres mesuré ≥ 3,5:1. Accueil : la photo de
     l'athlète commence SOUS la barre d'état (sa tête est en haut du fichier,
     elle passait sous l'heure). La Séance MASS n'a toujours pas de trait.
- **FEMMES 8, phase 2 : la confirmée rejoint l'intermédiaire, et c'est voulu.**
  La grille donne 4 tours fixes à la confirmée tandis que l'intermédiaire y
  monte de 3 à 4 : en semaine 5 les deux séances sont identiques. Le
  comportement a été montré à Guillaume avec son correctif (5 tours, comme la
  phase 3) ; il a tranché pour 4. La phase 2 est une construction commune,
  c'est la phase 3 qui sépare les niveaux — 3, 4 et 5 tours. Un test de
  `niveaux.test.ts` fige cette décision : s'il tombe, c'est qu'un chiffre a
  bougé par mégarde, pas qu'il faut « réparer » la grille.
