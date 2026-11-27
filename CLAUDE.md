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
  les DEUX journées avec la même cible (§5). Rien n'est enregistré.
  **Côté utilisateur, lot 1 — FAIT** (« go lot 1 », 26 novembre, nutrition
  automatique) : à la fin du questionnaire, carte « Ta cible »
  (`components/CibleCalculee.tsx`, moteur `engine/cibleProposee.ts`). Même
  lecture que le coach (`lireResume(resume(etat))`), donc même chiffre.
  POWER, LADIES, importés, et MASS depuis le 27 novembre
  (`regles-nutrition-mass.md`). Cas du §6
  (exclusion OU plancher) : « Ta cible sera posée par Guillaume », AUCUN
  chiffre ni raison détaillée. Chiffre d'abord, calcul REPLIÉ, UN bouton
  « Utiliser cette cible » → `ciblesNutrition` les deux jours ; cible en
  place annoncée, plan historique masqué annoncé (même règle que la fiche).
  « Aucune cible posée » (Nutrition) mène au questionnaire. Rien avant le
  bouton. `components/cibleCalculee.test.tsx`.
  **Côté utilisateur, lot 2 — FAIT** (« go lot 2 », 26 novembre) : la
  semaine de repas. Source de vérité : `regles-repas-automatiques.md`
  (choix de l'appli, relu par `data/reglesRepasAutomatiques.test.ts`) :
  4 repas (25/30/15/30 %), deux leviers bornés, calories d'abord, pièces
  arrondies puis aliments pesés, ± 10 % par repas, PROTÉINES AVANT LA
  VARIÉTÉ (mesuré : sinon un jour sur deux rate ses protéines d'un quart à
  un tiers), aucun hasard. Moteur `engine/semaineRepas.ts` ; réglage
  `semaineRepas` (non indexé, pas de migration). Composée UNE fois : à
  « Utiliser cette cible » (si aucune semaine ; reprend les aliments du
  questionnaire si la liste est vide) ou par « Composer ma semaine »
  (Nutrition). Elle REMPLACE l'affichage de « Mon plan » (`planPerso`
  jamais effacé) : rangée Lun → Dim ouverte sur aujourd'hui, `PlanPerso`
  en mode `semaine`, « Changer ce repas » = bibliothèque déjà ajustée
  (`ChoixRepas` `ajuster`). Cible changée = bandeau + « Recomposer »,
  jamais seule ; recomposer et « Revenir à mon plan » se confirment.
  Mesuré sur 7 profils (1 200 à 4 000 kcal) : chaque jour entre − 5 et
  + 5 % des calories, protéines à quelques grammes ; 9 à 14 plats par
  semaine ; à 1 200 kcal une seule collation tient sa part (elle revient 6
  jours sur 7) ; l'omelette peut monter à 7 œufs (levier × 2).
  `engine/semaineRepas.test.ts`, `components/semaineRepas.test.tsx`.
  **Lot 3 — FAIT** (« go lot 3 », facteurs validés par Guillaume le 26
  novembre) : « Ma liste de courses » sous les repas de la semaine
  (`components/ListeCourses.tsx`, plein écran). Source de vérité :
  `regles-courses.md` (VALIDÉ), relu par `data/reglesCourses.test.ts`. Facteurs
  de rendement (cuit ÷ cru) de Bognár 2002 (BFE-R-02-03), ligne citée pour
  chacun ; semoule = rapport des calories (choix de l'appli), courgette et
  aubergine = données faibles (ragoût avec ingrédients, n = 3), saumon = la
  ligne du poisson blanc. Poids PRÊT À CUIRE (épluchures en plus, l'écran
  le dit) ; arrondi VERS LE HAUT (10, puis 50 dès 1 000) ; rayons fixes,
  œufs à la crèmerie, pain à la boulangerie ; légumineuses : aussi « en
  conserve, égouttées » (≈ cuit). Coches en `localStorage`
  (`state/coursesCochees.ts`) pour UNE semaine composée (`creeLe`), jamais
  en base. Partage : feuille de partage, sinon presse-papiers. Un test
  refuse tout aliment pesé cuit des repas sans facteur. Les cases à cocher
  sont DESSINÉES (le style commun des champs les étirait). Corrigé au
  passage (lot 2) : en mode semaine, la fiche d'un plat montre les
  quantités DU REPAS (« quantités de ton repas »), plus celles de
  référence. `engine/courses.test.ts`, `components/listeCourses.test.tsx`.
  **Lot 4 — FAIT** (« go lot 4 », précisions validées par Guillaume le 26
  novembre) : le point des deux semaines. Le §7 donnait le tableau ; ses
  « Précisions de calcul » (VALIDÉES, `regles-cibles-nutrition.md`) fixent
  le reste :
  14 jours après la cible acceptée puis après chaque point ; moyenne des 7
  derniers jours contre les 7 d'avant, 4 pesées au moins dans CHACUNE ;
  bornes comprises = on ne change rien ; nouvelle cible = calories ± 100
  puis répartition du §5 refaite (`repartir`, `calculCibles.ts`) sur le
  poids moyen récent ; plancher ou IMC < 18,5 en perte → « vu avec
  Guillaume », sans chiffre. Moteur pur `engine/reajustement.ts`, valeurs
  `REAJUSTEMENT` (`data/reglesCiblesNutrition.ts`, relues dans le .md).
  Réglage `profilNutrition` (non indexé, pas de migration) : enregistré à
  « Utiliser cette cible », JAMAIS les réponses de sécurité ; il porte la
  date du dernier point. Sans profil : pas de point. Une fiche du coach
  avec des cibles (`patchDeFiche`) ou « Effacer mes cibles » le remet à
  `null` — l'appli n'ajuste pas la cible de quelqu'un d'autre. Écran
  (`components/PointDeuxSemaines.tsx`, sous la cible de Nutrition) : une
  ligne tant que ce n'est pas dû ; le constat AVANT la proposition ;
  « Accepter cette cible » / « Garder ma cible » referment TOUS LES DEUX le
  point pour 2 semaines (un refus n'est pas redemandé chaque jour).
  Accepter écrit la cible les deux jours ; la semaine de repas affiche
  alors « Ta cible a changé » (lot 2), jamais recomposée seule. Cible
  acceptée avant le lot 4 : bouton « Activer le point des 2 semaines » à
  la fin du questionnaire. Pas fait : le contrôle de cohérence avec la
  tendance déclarée sur 4 semaines (§1).
  `engine/reajustement.test.ts`, `components/pointDeuxSemaines.test.tsx`.
  **Cocher un repas mangé** (Guillaume, 26 novembre : « cocher les repas
  faits et pas ajouter "ce que j'ai mangé" qui paraît redondant ») — en
  mode semaine seulement. Une coche par repas posé, à gauche (48 px, pastille
  26, verte une fois mangé) ; SEULEMENT sur le jour même (la semaine est un
  modèle : un autre jour n'a pas de coche). Rangé dans le journal existant
  des repas pris (`mealLog`, clé `semaine:<créneau>` : aucun identifiant du
  plan historique ne s'y confond), par DATE — le lendemain repart vierge.
  « Ce que j'ai mangé » devient « Mon compte du jour » : repas cochés (tels
  qu'ils sont à l'écran) + aliments ajoutés « hors de mes repas », le reste
  à manger dessous. Hors semaine (« Mon plan », plan historique) : rien ne
  change. `cleRepasFait`, `repasFaits`, `mangeDesRepas`
  (`engine/semaineRepas.ts`).
  **Exclusions — « Je ne mange pas »** (Guillaume, 26 novembre, « go
  exclusion » : la semaine ignorait les allergies écrites). Source de
  vérité : §4 de `regles-repas-automatiques.md` (7 familles : viande,
  poisson, œufs, laitiers, arachide, fruits à coque, gluten — avoine
  comprise), transcrit dans `data/exclusionsRepas.ts`, relu par
  `exclusionsRepas.test.ts`. Le questionnaire (copie du site) n'a PAS de
  question « régime » : l'appli ne devine rien, la personne COCHE ; ses
  allergies écrites PRÉ-COCHENT ce qu'elles nomment à « Utiliser cette
  cible » (jamais ne décochent), et le non reconnu est dit mot pour mot
  (`lireAllergies`). Réglage `exclusionsRepas` (non indexé, pas de
  migration). Un repas avec UN aliment écarté n'entre ni dans la semaine
  (même pour remplir : le créneau reste VIDE et c'est dit) ni dans
  « Changer ce repas » / « Choisir un repas », les DEUX modes (seule
  exception à « les cartes s'affichent toujours » : c'est de la sécurité).
  Carte repliable « Je ne mange pas » sous les jours ; phrase de prudence
  TOUJOURS affichée ; changer ses exclusions ne recompose rien (bandeau
  « Ta semaine contient encore… » + « Recomposer »). Limites mesurées : en
  végétalien, 98 g de protéines pour 180 visés ; sans gluten ni laitiers,
  aucun petit-déjeuner ni collation (−40 %). `components/exclusionsRepas.test.tsx`.

  **Refonte « Journal » + nombre de repas** (Guillaume, 26 novembre, « go
  refonte C avec la possibilité d'ajouter un repas » — maquette C parmi
  trois). Mode SEMAINE de repas seulement : « Mon plan » et le plan
  historique ne bougent pas. Écran : carte « Il te reste aujourd'hui »
  (`components/ResteDuJour.tsx` : le reste en grand, une barre par chiffre
  POSÉ, dépassement dit en mots) — elle REMPLACE « Ta cible aujourd'hui » et
  « Mon compte du jour » ; sept pastilles DATÉES (semaine en cours,
  aujourd'hui repéré par son contour) ; les repas en FRISE (`PlanPerso` mode
  `semaine` : point vert + « · mangé », photo, plat, quantités, kcal, coche
  à droite ; toucher la carte l'ouvre) ; « + Ajouter un aliment hors de mes
  repas » ; pesée ; outils en TUILES (courses, « Je ne mange pas », point
  des 2 semaines tant qu'il n'est pas dû — dû, il monte en carte en haut —,
  recomposer). La phrase de prudence des exclusions reste TOUJOURS
  affichée. Le sélecteur entraînement / repos ne s'affiche en mode semaine
  que si les deux cibles DIFFÈRENT (fiche de coach) : la cible calculée est
  la même les deux jours. **4, 5 ou 6 repas par jour** (§1 de
  `regles-repas-automatiques.md`, relu par le test) : parts 25/30/15/30,
  20/15/25/15/25, 17,5/12,5/22,5/12,5/22,5/12,5 ; 6e créneau `collation3`
  « Collation du soir » (`REPAS_DU_SOIR`, `REPAS_JOURNEE` ; `REPAS_PERSO`
  reste à CINQ pour « Mon plan »), qui puise dans les repas de la collation
  de l'après-midi. **Seuils MESURÉS** (24 cibles, 7 répartitions) : 5 repas
  dès 1 500 kcal, 6 dès 1 900 (`CIBLE_MINIMALE`) — en dessous les collations
  dépassent leur part (jusqu'à + 16 % et + 45 % à 1 200 kcal) : le choix est
  désactivé ET expliqué, `nombreAdmis` plafonne à la recomposition. Des
  collations à 10 % ne tenaient qu'à 2 600 kcal : ne pas y revenir. Le
  nombre vit sur la semaine (`repasParJour`, absent = 4 : une semaine à 4
  repas garde sa forme d'avant) et se choisit EN RECOMPOSANT (tuile, ou
  « + Ajouter un repas » sous le dernier repas) — jamais dans le
  questionnaire, copie du site. Limite : 11 collations en bibliothèque, la
  même peut revenir 7 jours sur 7 à 5-6 repas. Pas fait : le style
  « Journal » hors mode semaine. `components/journalNutrition.test.tsx`,
  `engine/semaineRepas.test.ts`.

  **Couleurs des macros « Relief »** (Guillaume, 27 novembre, planche de 3
  variantes, « go B, MASS suit aussi » : bleu, rose et jaune « paraissaient
  ternes »). POWER et MASS : glucides `#45a6ff`, protéines `#ff5e9c`,
  lipides `#f2c230`, léger dégradé + liseré (comme les boutons rouges),
  barre de 10 px. Tout passe par des JETONS (`--macro-*-relief`,
  `--macro-liseret`, `--macro-epaisseur`… sur `:root`) : aucune règle de
  thème dans les écrans. LADIES, ME, MYSELF & I et la plateforme restent À
  PLAT avec leur palette — leurs blocs remettent chaque jeton relief à zéro,
  et LADIES écrit désormais ses trois teintes (elle héritait de POWER ; le
  jaune vif tombe à 1,5:1 sur fond clair). Le jaune est proche de `--orange`
  : il ne sert qu'à un remplissage, et un DÉPASSEMENT (`.progressOver`) est
  maintenant hachuré. Variantes non retenues : A (à plat), C (pastilles).
  MASS n'affiche aujourd'hui aucune barre de macros : le réglage attend sa
  nutrition. `styles/macrosRelief.test.ts`.

- `regles-nutrition-mass.md` — le REGARD MASS sur la nutrition (Guillaume,
  27 novembre : MASS construit du muscle, POWER vise la performance). **Pas
  un second système** : MASS reçoit le calcul commun, le fichier ne dit que
  ce qui diffère EN PRISE DE MASSE. Cinq points tranchés par lui.
  **Lot 1 — FAIT** (« texte validé, go MASS lot 1 ») : valeurs dans
  `data/reglesNutritionMass.ts` (relues dans le `.md`, exemple du §12
  rejoué : `reglesNutritionMass.test.tsx`). `Regard` = `'commun' | 'mass'`,
  passé à `calculerCibles` et `repartir` : protéines **2,0 g/kg** (1,8
  ailleurs) et alerte glucides sous **3 g/kg**, seulement si
  `regardApplique` (MASS ET prise) — une perte ou un maintien sous MASS =
  règles communes au gramme près. Le regard SUIT LA CIBLE : noté dans
  `profilNutrition.regard` à l'acceptation (absent = commun, un ancien
  profil garde sa forme), le point des 2 semaines refait la répartition
  avec. `FAMILLES_AVEC_CALCUL` compte MASS. Repas par défaut d'une semaine
  composée la 1re fois (`repasParDefaut`, plafonné par `nombreAdmis`) : 5
  sous FORCE et HYPERTROPHIE, **4 sous CONGESTION** (son 1er principe écrit
  « 4 prises par jour » ; DÉCIDÉ par Guillaume : « 4 repas, conseillé 5
  pour une meilleure répartition des macros mais 4 est possible »). D'où le
  CONSEIL des 5 repas (`conseilRepasMass`, `CONSEIL_REPAS_MASS`) : une
  phrase au-dessus de « + Ajouter un repas », sous MASS en prise de masse,
  tant que la semaine a moins de 5 repas et que la cible en tient 5 — un
  conseil, rien ne se recompose seul.
  Écran : `NutritionPrincipesScreen` enveloppe `NutritionScreen`
  (`sansPlanHistorique` : JAMAIS le plan de POWER sous MASS, même réglage
  allumé ; `avant`, `programmeId`). Vues : `nutrition-principes`
  (CONGESTION : ses six principes « gardés » EN TÊTE, ouverts sans cible,
  repliés avec) et `nutrition-calcul` (FORCE : le calcul seul) — jamais
  `nutrition`. Le raccourci d'Aujourd'hui lit la cible posée, jamais les
  menus (`nutritionMass`, `registre.ts`). Pas fait : le calcul du coach
  (`#/admin`) reste aux règles communes.
  **Lots 2 à 5 — FAITS** (« go MASS lot 2-3-4-5 », 27 novembre ;
  `components/massLots2a5.test.tsx` relit tableaux et textes du `.md`) :
  - **Lot 2, collations à boire** : quatre repas « À boire : … » dans la
    bibliothèque (31 repas), deux avec whey, deux sans, AUX COLLATIONS
    seulement, pour TOUS les programmes. La whey est du LAIT : écartée avec
    « Produits laitiers » (§4 des règles des repas ; le test de sécurité le
    vérifie) et rangée à l'épicerie dans les courses. **Photos à venir** :
    `photoAVenir` + `VignetteRepas` (vignette neutre, jamais d'image
    cassée) ; le test refuse un repas marqué ainsi qui a sa photo, et
    l'inverse — déposer `public/repas/<id>.webp` ET retirer le marqueur.
    Mesuré : elles entrent peu d'elles-mêmes dans une semaine (0 à 3 repas
    sur 28 à 42) ; elles servent surtout par « Changer ce repas ».
  - **Lot 3, « Remplacer » à apport égal** (`engine/equivalence.ts`,
    `MACRO_CONSERVEE`) : même groupe → la quantité qui garde les protéines,
    les glucides ou les lipides (fruits et légumes : inchangée) ; arrondie,
    pièce entière ; une note sous la ligne dit d'où elle vient, oubliée dès
    qu'on règle à la main. Les DEUX modes (semaine et « Mon plan » : c'est
    la quantité de la personne, convertie — pas une quantité inventée).
    Rien à convertir : groupes différents, quantité non posée, aliment déjà
    dans le repas, macro absente.
  - **Lot 4, repères d'horaires** : deux phrases (`REPERES_HORAIRES_MASS`)
    en bas de la Nutrition MASS (`apres`), quel que soit l'objectif.
  - **Lot 5, carte « Créatine »** (`data/creatine.ts`, texte VALIDÉ, comparé
    au `.md` mot pour mot ; `CarteCreatine`) : POWER et MASS seulement
    (prop `creatine`), JAMAIS LADIES ni le plan historique (qui garde sa
    note « 5 g »). Repliée = titre seul : la dose ne s'affiche jamais sans
    la phrase de prudence. AUCUNE marque, aucun lien, aucun code promo (le
    test le refuse). « Compléments : aucun avis ici » retiré des principes
    de CONGESTION.
  L'ebook de départ n'est ni reproduit ni versé au dépôt (ses conditions
  l'interdisent) : seules des idées générales, avec nos valeurs.
  **Le même aliment plusieurs fois dans la journée est ACCEPTÉ** (Guillaume,
  27 novembre : trois repas aux œufs, skyr matin et après-midi, « ce n'est
  pas si dérangeant […] l'utilisateur choisira ») — écrit au §3 de
  `regles-repas-automatiques.md`. Ne pas ajouter de règle « une seule fois
  la même source de protéines ».
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
  supprimer une version qu'un cycle suit passe par DEUX confirmations
  (Guillaume, 26 novembre : « après sa seconde confirmation, on
  supprime ») : la 1re dit ce qui part (`bilanSuppression` : cycles,
  séances faites, séries), la 2de efface le programme ET ses cycles en une
  transaction (`supprimerProgramme(cle, { avecSesCycles: true })`, toutes
  les tables du cycle, `femmesSeances` comprise ; cycle actif → le plus
  récent en cours, sinon 0). Jamais le programme seul : un cycle orphelin
  rendrait la sauvegarde irrestaurable (`programmesDeSauvegarde`). Sans
  l'option, toujours refusé. Après coup, le téléphone a moins de données
  que le compte en ligne : l'envoi automatique s'arrête et propose
  « Restaurer » / « Remplacer quand même » (règle existante).
  `suppressionDouble.test.tsx`, `programmesImportes.test.ts`. La famille
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
- **ME, MYSELF & I illustré — lots 1 à 6 FAITS** (architecture validée par
  Guillaume, 25 novembre). Un programme illustré arrive en **.zip** :
  `programme.json` (le format de toujours, INCHANGÉ), `majk-illustrations.json`
  (fichier de liens : exercice → illustration de l'archive, `{ "majk":
  "power12:…" }` ou `null` déclaré) et les images (PNG, JPEG, WebP). Un .json
  seul s'importe comme avant ; un .zip SANS `programme.json` complète la
  version la plus récente du programme désigné par `programmeUid`. Règles à
  ne pas « corriger » :
  - association par IDENTIFIANT seulement ; tout défaut refuse l'archive en
    entier, toutes les erreurs d'un coup (`engine/perso/illustrations.ts`) ;
    fichier inattendu dans l'archive = refusé et nommé (`media/archive.ts`) ;
  - bombe zip : tailles DÉCLARÉES lues et plafonnées avant extraction
    (2 Mo/image, 15 Mo au total, archive 20 Mo, 4096 px) ; type lu dans les
    octets (`media/enteteImage.ts`) ; image décodée puis ré-enregistrée par le
    navigateur (`media/illustration.ts`) ; `fflate` 0.8.2 figé ;
  - base v26 : table `illustrations`, UNE image par empreinte SHA-256 du
    fichier d'origine ; liens sur la ligne du programme (`illustrations`, non
    indexé) ; import en UNE transaction (`db/programmesImportes.ts`) ; images
    orphelines retirées après suppression ou remplacement ; ajouter des
    illustrations ne crée pas de version 2, en remplacer se confirme ;
  - affichage (`FicheTechnique.tsx`) : fiche déposée à la main > illustration
    importée > fiche de MAJK > rien. Sous ME, MYSELF & I : fond blanc, sans
    voile. La prescription ne bouge pas ;
  - **fiches retrouvées « peu importe le programme »** (`db/fichesRetrouvees.ts`)
    : fiches livrées, illustrations des autres programmes importés, fiches
    ajoutées à la main (LADIES compris). PROPOSÉES dans l'aperçu, cases
    COCHÉES avec l'image, à décocher : nom STRICTEMENT identique (accents et
    casse mis à part) et une seule planche possible, sinon rien. Un exercice
    que le fichier de liens mentionne (même `null`) n'est jamais proposé ;
  - sauvegarde : images dans le fichier de PHOTOS (relues avant tout
    effacement ; un ancien fichier n'y touche pas), JAMAIS dans le fichier de
    données qui part en ligne ;
  - **contenus tiers** : les illustrations du Top Body Challenge (Sonia Tlev,
    extraites du livre) ne vont NI dans le dépôt, NI dans l'appli publiée, NI
    en ligne (décision de Guillaume : « c'est juste un test »). Les tests
    utilisent des images FABRIQUÉES (`media/imagesFactices.ts`). Jamais de
    fiche importée versée à la bibliothèque native.
  Tests : `illustrations.test.ts` (moteur et base), `archive.test.ts`,
  `archiveIllustree.test.ts`, `importIllustre.test.tsx`, `module.test.ts`.
  À vérifier sur iPhone : choisir un .zip dans Fichiers, et le format
  ré-enregistré (PNG si Safari n'écrit pas le WebP).
- **Thème d'un programme importé — lot 1 FAIT** (Guillaume, 26 novembre,
  « go thème lot 1 »). Carte « Thème de ce programme » dans ses Réglages :
  ME, MYSELF & I (défaut), POWER, MASS (`data/themesImportes.ts`,
  `components/perso/ThemeProgramme.tsx`). Le thème = couleurs (`data-theme`)
  ET bandeaux (`BANDEAUX_IMPORTES`, `familleVisuelle`, `themeImporteDe`) ;
  les textes (« ME, MYSELF & I », sous-titres, nom du programme) ne bougent
  pas, la séance n'a jamais de bandeau. Rangé sur la ligne du programme
  (`theme`, non indexé, absent = défaut), repris par une nouvelle version,
  relu à la restauration (thème inconnu ignoré). **Seule exception** à
  « chaque image reste dans son programme » : un programme importé, sur
  choix explicite ; POWER, MASS et LADIES gardent leurs photos. Repère
  `data-importe` sur la page : les illustrations restent sur fond blanc sans
  voile sous tout thème. **Proposé dès l'import** (Guillaume, 26 novembre,
  « dès le début, juste après avoir importé son programme ») : sous
  « « … » est importé. », la même carte `ThemeProgramme` pour CE programme,
  sur son thème actuel, avec « Tu pourras le changer quand tu veux dans ses
  Réglages ». Proposée, jamais imposée ; seulement après un import réussi ;
  un autre fichier choisi la retire. Pas de second cadre dans le panneau
  (`.themeApresImport`). `components/perso/themeApresImport.test.tsx`.
  **Lot 2 — LADIES, FAIT** (« go thème lot 2 ») :
  ses bandeaux Aujourd'hui / Semaine / Réglages, et Progrès
  (`femmesProgres`, `56_femmes_progres_*`, image de Guillaume du 26
  novembre : LADIES n'a pas d'écran Progrès, ce bandeau ne sert qu'aux
  programmes importés) ; l'en-tête commun reprend la planche des bandeaux LADIES sous
  `[data-theme='femmes']` (voile mauve horizontal, titre blanc italique,
  trait rose `#f3a6bb`), les pastilles d'Aujourd'hui passent sur le fond
  des cartes, et le menu du bas commun a son onglet actif en rose écrit
  (`:root[data-theme='femmes']` redéfinit `--ivoire` / `--encre`). Les
  écrans LADIES eux-mêmes n'ont pas bougé (comparés au pixel). Le test
  « aucun bandeau FEMMES hors des écrans FEMMES » n'admet que
  `BANDEAUX_IMPORTES`. `data/themesImportes.test.tsx`.
- **Circuits minutés des programmes importés** (Top Body Challenge, 25
  novembre : « 3 circuits de 3 exercices, circuits 1 & 2 deux fois, 10 min
  chacun, 20 s entre les exercices, 1 à 2 min entre les circuits »). Trois
  champs FACULTATIFS du format (un ancien fichier garde exactement sa forme
  canonique) : `minutesBloc` sur la 1re ligne d'un groupe (minuteur du bloc,
  `useBlocMinute`), `reposApresBloc` sur sa dernière ligne (repos après le
  DERNIER tour, distinct de celui entre deux tours ; `SetEntry` reçoit
  `reposSec`), `prescription.affichage` (le passage tel que le document
  l'écrit : « 20 lentes + 20 rapides » ; dans un groupe il remplace le
  chiffre, seul il s'affiche dessous ; l'objectif reste le total du passage).
  Trois mouvements ou plus = « Circuit », même en alternance
  (`titreRythme`, « Un passage de chaque, 20 s entre les exercices »). Sous
  la fiche d'un bloc : « Séries saisies tour par tour, plus bas » (les fiches
  sont AVANT les tours). Le Top Body Challenge converti (hors dépôt) : 75
  exercices (un par mouvement et par circuit : un même mouvement ne peut
  figurer deux fois dans une séance), 348 lignes, suivi complet, consignes =
  descriptions du livre.
- **Identité ME, MYSELF & I = « ivoire · chocolat · champagne »** (maquette
  de Guillaume, 25 novembre). Troisième identité de la plateforme, CLAIRE :
  `[data-theme='perso']` — ivoire `#f5f0e6` (fonds), chocolat `#49352b`
  (boutons, titres), champagne `#c5a775` (filets, décors). **Le champagne ne
  porte JAMAIS de texte** (2,0:1 sur l'ivoire) : le texte doré passe par
  `--accent-ink` `#7a5a2c`. Nuances ajustées à sa demande : texte courant
  `#3f2d24`, vert olive `#3f6b3a` pour « fait », couleurs d'état redéfinies
  (celles de POWER sont faites pour un fond sombre), `color-scheme: light`.
  Le menu du bas S'INVERSE (`:root[data-theme='perso']` : pastille chocolat,
  écrite en ivoire). Bande de l'heure `--barre-etat` `#6b5548`, prolongée en
  fondu par le haut de l'en-tête. **Quatre bandeaux photo** (Guillaume, 25
  novembre) : Aujourd'hui `persoAujourdhui`, Semaine `persoSemaine`, Progrès
  `persoProgres`, Réglages `persoReglages` (`HABILLAGE.perso.entetes`) ; la
  Séance n'en a pas (aucun fourni, dégradé champagne rayé). Ses fichiers
  portaient le titre INCRUSTÉ : seule la partie PHOTO est servie
  (`60_`–`63_perso_*`), l'appli écrit le titre. La photo tient la DROITE de
  l'en-tête et se fond LARGEMENT vers l'ivoire (masque CSS, opaque dès
  58 %) : choix de Guillaume entre deux captures — « même si le titre mord
  sur le bandeau, on voit mieux le bandeau » ; ne pas reculer la photo
  derrière le titre. Pas de voile clair sur le sujet ; tête de l'athlète
  calée en haut (`focus … 0%`). **Titres = ceux des bandeaux** :
  sur-titre « ME, MYSELF & I », sous-titres « Ma séance du jour », « Mon
  programme », « Mes évolutions », « Mon programme » (`sousTitres`,
  `titresBandeauDe`) ; sur l'Accueil, le nom du programme importé (verbatim)
  et la semaine descendent SOUS le bandeau (`detail`), la date n'y est plus.
  La Semaine ne prend PAS la variante `argent` (réservée à MASS). Jamais une
  photo
  d'une autre famille. Le bloc « Ajouter la fiche technique » est un aplat
  champagne (la seule image de la famille, `cartePerso`, est sombre et
  virait au gris sous le voile clair). Les règles du thème, dans les
  fichiers partagés, sont sous `:global([data-theme='perso'])` et placées
  AVANT les blocs MASS (les tests de confinement MASS lisent jusqu'à la fin
  du fichier). Le contenu de la maquette (Bench Press, Semaine 11,
  Nutrition) est celui de POWER : seul le STYLE est repris.
  **Sélecteurs** (charge, reps, pesée ; `Stepper.module.css`) : cadre brun
  doré `#9a7d4f` (3,2:1 sur la série en cours), valeur sur fond clair,
  boutons − / + champagne `#e2cfa9` — gris beige, ils se perdaient (iPhone
  de Guillaume, 25 novembre).
  `styles/themePerso.test.ts`.
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
  qu'on peut » : chaque planche se vérifie avant d'entrer. **La bibliothèque
  sert aussi les programmes importés** (Guillaume, 26 novembre : « garde-les
  dans la bibliothèque dès que ce mouvement fera partie d'un programme ») :
  chaque entrée est une fiche native désignable (`power12-libre:<fichier>`,
  `fichesNatives.ts`) et PROPOSÉE à l'import sous son nom ET ses alias (une
  même image sous plusieurs noms reste une planche). Entrées du 26 novembre :
  Landmine press assis, Wall ball, Copenhague plank (`bibliothequePlanches.test.ts`).
  Toute nouvelle planche s'inscrit aussi dans `planches-power-relues.json`
  (après l'avoir regardée).
- **Planches POWER : plus de logo NFL** (Guillaume, 26 novembre : « il y
  avait le logo NFL en fond »). L'écusson était sur 35 planches sur 39 (102
  écussons, sur le mur du fond ; pas sur cable chop, rotation externe, lateral
  bound, rowing buste penché). Effacé par retouche locale du mur, mêmes noms
  de fichier (les fiches sont dans le pré-cache, révisé à chaque version :
  la règle « une image remplacée change de nom » ne vaut que pour
  `visuels/`). Athlète, matériel et bannière « POWER » intacts ; 10 écussons
  passaient derrière un disque, un visage ou une main, protégés par un
  contour tracé à la main. Vérifié par détection automatique : 0 restant.
  `data/planchesSansLogo.test.ts` fige l'EMPREINTE des planches relues (42 au 26 novembre)
  (`__fixtures__/planches-power-relues.json`) : toute planche ajoutée ou
  remplacée se REGARDE (logo, marque) avant d'y être inscrite. **Reste,
  non traité** : la virgule Nike sur les chaussettes et les chaussures de
  presque toutes les planches (décision de Guillaume attendue).
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
  (`tempoExplique.test.tsx`). Les **cartes d'un superset sont AVANT les
  tours** (« Tour 1 »), après les questions (`propositionsSuperset.test.tsx`).
  **« Fiche collée »** (Guillaume, 26 novembre, tous programmes) : leur IMAGE
  n'y est plus — elle est dans la station du tour EN COURS, entre le nom et
  les boutons de saisie (le bloc fini : au dernier tour). En haut, la carte ne
  garde que « Ajouter la fiche technique » quand il n'y a pas de fiche
  (`FicheTechnique` `affichage` : `complet` / `image` / `ajout`). Déposer une
  fiche prévient les deux endroits (`annoncerFicheChangee`).
  `components/ficheCollee.test.tsx`.
- **Choix visuels du 23 novembre** (planches de variantes, Guillaume) :
  **N3** — l'onglet actif du menu du bas porte une pastille IVOIRE, encre
  sombre (jetons `--ivoire` #f4f1ea / `--encre` #151a22 sur `:root`), plus de
  rouge ni de trait au-dessus ; **M2** — l'encadré « Montée en charge » a un
  filet rouge à gauche (comme « Contraste »), plus de contour rouge foncé. **M + boutons en relief** (26 novembre, « le même aspect que
  ceux de MASS, avec l'identité POWER ») : la FORME vient de MASS, la couleur
  et la police restent POWER. Sélecteurs (charge, reps, RPE, pesée) : cadre
  fin, dégradé bleu, grand chiffre blanc en italique extra-gras (jetons
  `--power-curseur-*`). Boutons rouges (Valider, Fiche technique, Démarrer,
  Ouvrir la séance, Fermer, C'est compris…) : dégradé rouge POWER, bord
  clair, liseré, halo, police DROITE (`--power-degrade-action`, 4,76:1 au
  plus clair). Tout sous `[data-theme='power']`. **L'essai ivoire « D » n'a
  PAS été retenu** : ne pas y revenir. À trois sélecteurs, le chiffre se règle
  sur la largeur de l'écran (`clamp`) : à taille fixe, « 102,5 » poussait le
  bouton + hors du cadre. **LADIES, même traitement** (26 novembre) en
  « Rosée Sculptée », thème CLAIR : boutons Commencer / Démarrer / Valider
  en dégradé rose (`--femmes-degrade-action`, blanc 4,61:1), bord plus FONCÉ
  que le bouton (un bord clair disparaît sur le fond poudré) ; sélecteurs
  bordés, fond blanc → rose, grand chiffre en italique Oswald. « Séance
  terminée » reste vert, le choix Maison / Salle n'est pas touché. Une case
  VIDE (« à poser », « — ») s'écrit en petit, droit et gris sous POWER et
  LADIES (`data-vide` posé par `Stepper`) ; « PDC » n'est PAS une case vide
  (le poids du corps est une valeur : `emptyIsValue`, `loadEntry.ts`).
  `styles/touchesClaires.test.ts`. Tempo : variante TB (voir « Retours du
  23 novembre (séance POWER) »).
- **Police du TEXTE = Barlow Semi Condensed** (Guillaume, 26 novembre,
  planche de 8 réglages, « go police E » : le texte, qui prenait la police
  du téléphone, était « trop fade »). `--font` sur `:root`, donc plateforme,
  POWER, MASS et ME, MYSELF & I ; **LADIES garde Inter** (sa planche). Les
  titres (`--font-cond`) et les gros chiffres ne bougent pas. Trois réglages
  de la planche vivent dans `fonts.css`, sans toucher une règle d'écran :
  PAS de coupe 400 (la 500 couvre 400-500 : le texte courant sort « un cran
  plus gras »), la 700 couvre 700-900, `size-adjust: 107%` (« légèrement
  agrandi » : une police étroite paraît plus petite). Sous POWER seulement,
  `--ink-2` éclairci (#aebecd → #cdd8e3) ; MASS et ME, MYSELF & I gardent
  leurs couleurs de maquette. +69 Ko (3 fichiers, OFL, même projet que
  Barlow Condensed). Les capitales des petits libellés et les noms
  d'exercice de la planche existaient déjà dans l'appli. Réglages NON
  retenus : Barlow, Archivo, Saira, Exo 2, Kanit. `styles/policeTexte.test.ts`.
- **Accueil : les cartes « ressortent »** (Guillaume, 26 novembre, capture de
  référence). Les photos des cartes (programme en cours, familles) sont à
  PLEINE opacité — toute photo d'ambiance est à 38 % (`.visuelCover`,
  `Decor.module.css`), c'est ce qui les éteignait ; ailleurs elle le reste.
  Voile ramené à mi-hauteur, bord et halo à la couleur de la famille, nom
  centré, barres en bas à droite ; dégradé sur « Prochaine séance » et « Mon
  parcours » ; fumée légère en fond (bruit SVG `feTurbulence`, aucun
  fichier). **Programmes et Parcours, même traitement** (« également ») :
  bannières de famille et carte de cycle à pleine opacité, voile à gauche
  seulement, bord et halo à la couleur de la famille, dégradé sur le bilan
  sportif et les rubriques ; la fumée vit dans `styles/plateforme.module.css`
  (`.fumee`), prise par les trois écrans de la plateforme, jamais par ceux
  d'un programme. `styles/accueilCartes.test.ts`.
- **Accueil : la carte d'une famille SE RETOURNE** (Guillaume, 26 novembre,
  « volets explicatifs […] comme une carte qu'on retourne »). Toucher une
  tuile la fait pivoter d'un demi-tour en s'agrandissant presque à la taille
  de l'écran (`components/FamilleRetournee.tsx`, rendue dans `body` : sinon
  le menu du bas passait devant). Le verso ne dit QUE le catalogue, mot pour
  mot : sous-titre, résumé, puis « Ce que tu développes » = les `objectifs`
  ÉCRITS de chaque programme (`qualitesDe`), CHACUN SOUS SON NOM (un
  objectif est celui d'un cycle, pas de la famille) ; ME, MYSELF & I n'a que
  son résumé. N'en inventer aucun. Retours du 26 novembre : demi-tour
  ralenti à 950 ms (`DUREE_RETOURNEMENT`, passée au CSS par `--duree`,
  « la vitesse est parfaite ») ; le VERSO est dessiné à sa taille FINALE et
  mis à l'échelle de la carte (`.versoInterieur`, même courbe) — dessiné à
  la largeur du moment, son texte se recomposait à chaque image (« effet
  bizarre ») ; photos de la carte en `prioritaire` (Safari laissait noire une
  image différée dans la carte en 3D) ;
  l'objectif POWER « rattraper l'écart chaîne postérieure / squat » est
  RETIRÉ du catalogue (personnel à Guillaume) ; MASS FORCE a son objectif,
  dans ses mots (« devenir plus fort et continuer de progresser, sans se
  blesser ») — la force n'est pas le but premier de MASS, mais elle n'en
  est pas absente. Le résumé de LADIES annonce ses cycles tels qu'ils
  existent (renforcement en circuits, congestion, perte de poids, prise de
  masse) : le cycle 1 n'est pas une prise de masse (`acces.test.ts`).
  « Voir les programmes » mène au catalogue sur la famille (ce que faisait
  la tuile). Échap et ✕ ferment ; mouvement réduit = sans animation.
  `components/familleRetournee.test.ts`.
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
- **Quantités alimentaires** : « Mon plan » n'en propose AUCUNE (il
  additionne et affiche l'écart). **Exception décidée par Guillaume (26
  novembre)** : la semaine de repas automatique, pour les programmes sans
  plan propre (voir « Côté utilisateur, lot 2 »), MASS compris depuis le 27
  novembre. Le plan historique n'est pas concerné.
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
     Progrès = vue `a-venir`, sans contenu ; Nutrition = `nutrition-calcul`
     depuis le 27 novembre (`regles-nutrition-mass.md`). Superset biceps :
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
  9. **Identité MASS = « SCULPTED » (maquette de Guillaume, 25 novembre)** —
     elle REMPLACE celle du 14 novembre décrite ci-dessous, pour toute la
     famille. Toujours sombre, mais noir chaud (`--bg` #141212), BORDEAUX
     (`--accent` #a5313f, dégradé #a5313f → #561520) à la place du rouge
     vif, blanc chaud, texte « rouge » en vieux rose (`--accent-ink`
     #ee7f8f). Décisions du 14-15 novembre RENVERSÉES, ne pas y revenir :
     plus AUCUN « // » ; « MASS » est une étiquette devant la date de
     l'Accueil (« MASS · mercredi 18 novembre »), le nom du cycle est le
     grand titre ; le trait est court et COLLÉ au sous-titre (sauf Semaine
     et Combiné) ; titres blanc chaud (`--mass-argent` n'est plus argenté) ;
     Semaine : UNE CARTE PAR SÉANCE ; numéros « Au programme » en chiffres
     vieux rose ; Nutrition : un trait bordeaux par principe. Les PHOTOS
     des bandeaux restent celles en place (« les bandeaux sont déjà bons ») :
     un `filter` CSS accorde leur teinte et leur lumière, aucun fichier
     nouveau. Boutons toujours en italique (maquette), menu ivoire inchangé.
     Plus de rouge vif en dur : tout passe par les jetons `--mass-*`
     (`themeMass.test.ts` le refuse, comme le « // »). Essais NON retenus,
     à ne pas ressortir : FORGE, ivoire et rouge, ivoire-chocolat-champagne,
     bandeaux bronze. Ce qui suit décrit l'ANCIENNE identité (dimensions et
     confinement toujours valables, couleurs et « // » périmés) :
     **Maquettes sombres de Guillaume (14 novembre)**, pour
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
