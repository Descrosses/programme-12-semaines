# ADR — ME, MYSELF & I : programmes importés en JSON

**Statut :** proposé, amendé par le correctif n° 2 puis par l'étape 0 (PDF « Training 1 », décisions de Guillaume du 16 novembre), en attente de validation de Guillaume. Aucun code applicatif écrit.
**Date :** 16 novembre 2026. **Périmètre lu :** les fichiers listés par la mission et son correctif n° 2 (`registre.test.ts`, `App.tsx` lignes 150-220, une recherche des lecteurs du catalogue), rien d'autre.

Un premier PDF réel a été éprouvé à l'étape 0 : « Training 1 Guillaume ». Sa conversion complète est en annexe B.

**Trois identifiants, à ne jamais confondre :**

| Nom | Exemple | Ce que c'est |
|---|---|---|
| Lignée (`uid`) | `k3f9a1c2e` | « Le programme de mon coach », toutes versions confondues. Vient du JSON. |
| Clé de version (`cle`) | `perso-k3f9a1c2e-2` | Une version figée de ses prescriptions. Attribuée par MAJK. |
| Cycle (`CycleRow.id`) | `7` | « Mon passage sur cette version, commencé le 5 janvier ». Existe déjà. |

---

## 1. Les cinq décisions

### D1 — Validation et import du JSON

**Aujourd'hui.** Le seul contrôle de fichier est `parseExport`. Il vérifie la syntaxe, le champ `format` et la version, puis fait confiance au contenu. C'est suffisant pour une sauvegarde écrite par MAJK, pas pour un fichier venu d'ailleurs.

**Décision.** Une fonction pure `validerProgramme(texte)`, écrite à la main, sans dépendance. Elle ne lève jamais d'exception. Elle rend soit la liste complète des erreurs, soit un programme normalisé avec son rapport de compatibilité. Trois issues seulement :

- **Refusé** : rien n'est écrit en base.
- **Accepté avec réserves** : tout est importé, mais certaines lignes ne sont que consultables. Un écran les liste, et Guillaume confirme.
- **Accepté** : toutes les lignes sont suivies série par série.

Il n'y a jamais d'import partiel : un programme entre en entier ou n'entre pas.

**La frontière.** Hors de MAJK : l'extraction du PDF et la vérification humaine que le JSON dit bien ce que dit le PDF. Dans MAJK : la structure, la cohérence interne, le classement et le stockage. MAJK ne voit jamais le PDF. Il ne peut donc pas garantir la fidélité au document. Il garantit autre chose : rien de ce que contient le JSON n'est modifié, complété ou perdu.

**Écarté.** Zod (absent du projet). Tolérer les clés inconnues : une clé ignorée serait une consigne perdue sans bruit.

**Risque de régression.** Faible, tant que le validateur reste isolé : code neuf, aucun fichier existant touché.

### D2 — Format et fidélité sportive

**Aujourd'hui.** Une séance est un `ResolvedSession` : pour chaque exercice, un nombre de séries, un travail (reps, durée, distance), un repos, une ligne de texte. POWER y ajoute charges et progression, MASS CONGESTION non.

**Décision.** Chaque ligne d'exercice porte deux choses :

1. `texteOriginal` : la prescription mot pour mot. Obligatoire, toujours affichée sur la carte.
2. `prescription` : facultative. C'est la liste des séries, une entrée par série, dans l'ordre. Chaque série a son propre objectif (reps, durée ou distance) et, si le document l'écrit, sa propre charge en kilos. Un repos commun peut s'y ajouter.

Cette structure sert uniquement à compter les séries et à lancer le chrono. Tout le reste (tempo, RPE, « 75 % du 1RM ») reste du texte affiché, jamais calculé.

Trois exemples :

- « 4 × 8, tempo 3-1-1, RPE 8, repos 90 s » : quatre séries de 8 reps et un repos de 90 s. Le tempo et le RPE se lisent dans le texte d'origine.
- « Pyramide 12 / 10 / 8 / 6 en montant la charge » : quatre séries de 12, 10, 8 puis 6 reps. « En montant la charge » reste du texte : le document ne donne pas de kilos, MAJK n'en met pas.
- « 12 × 60 kg, 10 × 70 kg, 8 × 80 kg » : trois séries, chacune avec ses reps et ses kilos.

**Les trois états**, calculés par MAJK et jamais déclarés par le fichier :

| État | Critère | Effet |
|---|---|---|
| Compatible | `prescription` présente : le nombre de séries est connu, chaque série a un objectif, et toutes les séries de la ligne ont un objectif de même nature (toutes en reps, ou toutes en durée, ou toutes en distance). Les valeurs peuvent différer d'une série à l'autre. Un groupe (superset, circuit) peut compter autant de stations que nécessaire. | Carte normale : séries à valider, chrono. |
| Consultable | Pas de `prescription` : nombre de séries non fixé, objectif double, natures mélangées dans une ligne. | Carte en lecture : texte d'origine et note libre. Aucune ligne de série. |
| Bloquant | La trame ne tient pas dans le calendrier de MAJK (voir §2). | Fichier refusé. |

**Séries « max » et AMRAP.** Aucun de ces cas n'est bloquant : ils ne cassent pas le calendrier.

| Cas | Exemple | Classement | Pourquoi |
|---|---|---|---|
| Répétitions maximales sur une série | « 3 × max », « dernière série au max » | Compatible | Le nombre de séries est connu et la personne note ses reps. `reps: 'max'` existe déjà dans le moteur. |
| AMRAP au temps, un exercice | « max de pompes en 60 s » | Consultable | Il faut borner le temps et compter les reps. Le contrat n'a qu'un objectif par série : n'en garder qu'un déformerait la consigne. |
| AMRAP en tours, plusieurs exercices | « AMRAP 12 min : 10 pompes, 15 squats, 20 abdos » | Consultable | Le nombre de tours n'est pas connu d'avance : aucune liste de séries ne peut être écrite. |
| Tours fixes | « 4 tours de A, B, C, D, sans repos entre, 1 min à la fin » | Compatible, quel que soit le nombre de stations | Vérifié à l'étape 0 : `groupSupersets` (`engine/superset.ts`) réunit toute la suite de lignes consécutives qui portent le même groupe, deux ou plus, compte les tours et lit le rythme dans les repos. |
| Nombre de séries en fourchette | « 3 à 4 séries » | Consultable | Choisir 3 ou 4 serait interpréter. |

Si le repos varie d'une série à l'autre, `reposSec` est omis : le chrono ne propose aucune durée et le texte d'origine fait foi.

**Groupes, rythme et repos.** Le moteur ne lit pas le rythme d'un groupe dans un champ : il le déduit des repos (`rythmeDe`).

- Toutes les stations sauf la dernière à 0 s : enchaîné, le repos vient après le groupe. C'est le superset classique et le circuit d'abdos de Training 1.
- Toutes à un même repos non nul : alterné.
- Toutes sauf la dernière à un repos plus court : transition.

Conséquence pour la conversion : un 0 s n'est écrit que si le document dit « sans repos » ou utilise un terme que Guillaume a défini ainsi. Pour « en super set », c'est sa décision du 16 novembre (annexe A). Sans l'un ou l'autre, le repos de la station reste absent, et la ligne n'entre pas dans un groupe.

**Plusieurs blocs le même jour.** Une séance MAJK correspond à un jour. Quand le planning du document écrit plusieurs blocs pour un jour (« Séance 1 + abdos »), la conversion les juxtapose dans une seule séance, dans l'ordre du planning. Chaque ligne porte alors sa `section` (« SEANCE ABDOS »), affichée comme intertitre. Ce n'est pas une interprétation : le planning écrit justement une ligne par jour.

**Échauffements.** « 5 minutes de rameur » n'est pas une série. Il va dans les `notes` de la séance, en texte, hors de tout décompte. Le type `Warmup` du moteur n'est pas réutilisé : son `id` ne vaut que `'lower'` ou `'upper'`, il est taillé pour POWER.

**Un objectif par série est-il portable dans le moteur ?**

- **En base, oui.** Chaque ligne de `SetRow` porte déjà `plannedReps` et `plannedKg`. Les durées et distances prévues n'ont pas de colonne, et n'en ont pas besoin : la version du programme est immuable et le cycle la désigne, donc l'objectif d'une série se relit toujours dans le document.
- **Dans le contrat de séance, non.** `ResolvedExercise` porte un seul `work` et un seul `planKg` pour toutes les séries. Changement minimal : un champ facultatif `objectifsParSerie` (une entrée par série : son travail et sa charge prescrite, ou `null`), sur le modèle de `sansBloc`. Absent, rien ne change : POWER et MASS ne le posent pas.
- `work` reste obligatoire. Il porte la nature commune de la ligne, d'où la règle « même nature pour toutes les séries ».
- `ramp` (paliers d'un test 1RM) et `secondPart` (série dégressive) existent déjà mais portent un autre sens : ils ne sont pas réutilisés.

**Séance terminée.** Terminer une séance reste un geste de l'utilisateur. Les lignes consultables n'entrent dans aucun compteur. Le résumé les affiche à part : « 12 séries enregistrées sur 12 » et, en dessous, « 2 consignes hors suivi, non enregistrées ». MAJK ne déduit rien et n'invente aucune règle.

**Programme.** Il porte « Suivi complet » seulement si toutes ses lignes sont compatibles. Sinon : « Suivi partiel : 14 exercices sur 18 ». MAJK ne juge pas ce qui est « essentiel » : une seule ligne consultable suffit.

**Contrat moteur.** Le module générique remplit `ResolvedExercise` comme MASS CONGESTION : aucune charge calculée, `suggestion: null`, `targetRPE: null`, aucun ajustement. Famille de mouvement `libre` (elle existe déjà pour « un mouvement que le programme ne connaît pas »), rôle `accessory`, jamais `main`. Trois champs facultatifs sont à ajouter au contrat : `objectifsParSerie` sur l'exercice, `sansIntensite` et `sansDuree` sur la séance. Sans les deux derniers, l'écran afficherait « MODÉRÉ » ou une durée que le document n'a jamais écrits.

**Durée du programme.** Le questionnaire est une décision de Guillaume (16 novembre). La limite de 12 semaines reste une proposition à valider.

- **La limite actuelle.** `useRoute.ts` ramène toute semaine hors de 0 à 12 vers la semaine 1 (`clampWeek`). C'est la seule limite que j'ai vue : `WeekIndex` est un simple nombre, et ni `SetRow` ni `ModuleProgramme` ne bornent les semaines. Je n'ai pas lu les écrans.
- **Le coût d'une extension.** La borne tient en une ligne, mais elle est partagée par POWER et MASS. Fichiers à examiner avant de la déplacer : `src/state/useRoute.ts` et ses tests, `src/screens/WeekScreen.tsx`, `src/engine/calendar.ts` (`locateToday`, `currentWeek`), `src/App.tsx`, les écrans Progrès, et tout test qui écrit « 12 ». Cet ADR ne conçoit pas l'extension.
- **Quand le document fixe une durée**, le fichier la porte (`dureeSemaines`) et ses semaines la couvrent. Au-delà de 12, l'import est refusé avec un message clair (proposition à valider).
- **Quand le document ne la fixe pas** (Training 1 : aucune durée écrite), ce n'est plus un blocage. Le fichier décrit une seule semaine type, sans numéros. Au moment de l'import, MAJK pose la question à la personne : « Combien de semaines veux-tu suivre ce programme ? », avec une réponse de 1 à 12. MAJK n'invente pas de valeur par défaut : sans réponse, le programme n'est pas importé.
- **Où vit la réponse.** Avec la version importée, dans un champ `reponses` distinct du `document`. Elle n'est pas une prescription et MAJK ne l'affiche jamais comme telle (« Durée : 8 semaines, choisie par toi »). Le registre reste synchrone : un programme garde une durée fixe. Suivre le même document sur une autre durée crée une nouvelle version (voir §3).

**Écarté.** Interpréter le RPE ou les pourcentages : cela brancherait les règles de POWER ou de MASS FORCE sur un programme qui ne les prescrit pas. Découper une pyramide en plusieurs exercices d'une série : cela déformerait la séance.

**Risque.** Les trois champs touchent la carte d'exercice et l'écran de séance, partagés avec POWER et MASS. Absents, ils ne changent rien.

### D3 — Persistance, versions et sauvegardes

**Aujourd'hui.** `CycleRow` porte déjà `programmeId` et `programmeVersion`. Aucune table ne peut accueillir un programme.

**Décision.** Une seule table nouvelle, `programmesImportes`, une ligne par version figée. `CycleRow` et `SetRow` ne changent pas : le cycle range la clé de version dans `programmeId`. Détail en §3.

**La migration v25 est-elle nécessaire ?** Oui. Dexie exige une nouvelle version pour créer une table. Elle se réduit à une déclaration `.stores(...)`, sans fonction de transformation, comme la v23 (`femmesSeances`) et la v24 (`referencesForce`). Aucune donnée existante n'est lue ni réécrite.

**Écarté.** Ranger les programmes dans la ligne `settings` : elle est lue par tous les écrans. Copier le programme dans chaque cycle : un programme importé mais pas encore démarré n'aurait nulle part où vivre.

**Risque.** `importAll` est modifié (voir §3). C'est la fonction qui restaure aussi POWER et MASS.

### D4 — Registre dynamique et moteur (le cœur du problème)

**Aujourd'hui.** `FAMILLES` et `MODULES` sont des listes compilées, lues de façon synchrone à 23 endroits : 12 `programmeParId` (recomptés par recherche) et 11 `modulePourCycle` (chiffre de la mission, non recompté). La base, elle, répond en différé. Et `modulePourCycle` retombe sur POWER 12 pour tout identifiant sans module. FEMMES 8 en dépend volontairement : `femmes8` est « disponible » au catalogue, n'a pas de module, et `App.tsx` calcule la semaine et le jour courants avec ce module de repli (`locateToday`, `currentWeek`).

Un module compilé par programme importé est écarté : il faudrait recompiler l'application à chaque import.

**Décision : un miroir en mémoire, rempli avant le premier affichage.**

1. **Une mémoire** (`programmes/perso/memoire.ts`) : un module sans React ni Dexie, qui garde les programmes importés et un état `chargement`, `pret` ou `erreur`.
2. **Hydratation au démarrage** : la table est lue une fois, avant le premier rendu, avec un délai de garde. Les lectures synchrones existantes restent synchrones : elles lisent la mémoire, pas la base.
3. **Un module générique** (`creerModuleImporte`) : il transforme une ligne de la table en `ModuleProgramme`, construit une fois à l'hydratation.
4. **Deux points d'entrée complétés, zéro appelant modifié** : `programmeParId` et `moduleParId` cherchent d'abord dans les listes compilées, puis dans la mémoire. Un programme importé ne peut donc jamais masquer POWER. `FAMILLES`, `MODULES` et `tousLesProgrammes` restent strictement compilés.
5. **Fin du repli silencieux, pour les seuls identifiants inconnus.** `modulePourCycle` rend un « module indisponible » (aucune semaine, aucune séance, seul l'onglet Réglages) quand l'identifiant remplit trois conditions à la fois : absent des listes compilées (`MODULES` et `FAMILLES`), absent de la mémoire, et différent de `FEMMES_PROGRAMME_ID`. `App.tsx` affiche alors l'écran « Programme indisponible », avec l'accès à la restauration.

**Ce qui ne change pas.** Le repli sur POWER 12 reste strictement identique pour `null` (aucun cycle) et pour `femmes8`. Il reste aussi identique pour tout programme inscrit au catalogue compilé sans module (`mass8`, les étapes « à venir »). `femmes8` est donc protégé deux fois : par le catalogue et par son nom.

**Ce qui change, et qu'il faut assumer.** Le test « ne laisse jamais un cycle sans programme » de `registre.test.ts` vérifie aujourd'hui que `modulePourCycle('power99')` rend POWER 12. Il sera réécrit au lot 3 : `power99` rendra le module indisponible, `null` et `femmes8` rendront POWER 12.

**Point pour Opus.** `FEMMES_PROGRAMME_ID` vit dans `db/femmesRepo`. `registre.ts` ne doit pas importer la couche base, que `repo.ts` relie déjà au registre. À vérifier au lot 3 : déplacer la constante ou la lire autrement.

**Cycle de vie.**

| Moment | Comportement |
|---|---|
| Démarrage | Lecture de la table, puis état `pret`. Aucun écran de cycle ne s'affiche avant. |
| Après un import | Écriture en base, puis mise à jour de la mémoire. La page perso s'abonne et se redessine. |
| Erreur de lecture | État `erreur`. POWER et MASS fonctionnent comme avant. La page perso propose « Réessayer ». |
| Cycle importé dont le programme manque | Écran « Programme indisponible ». Les séries du cycle restent en base. Un cycle FEMMES n'est jamais concerné. |

**Qui a besoin d'être prévenu d'un changement ?** La recherche des lecteurs du catalogue donne trois groupes.

| Lecteurs | Où | Notification |
|---|---|---|
| Ceux qui résolvent le programme d'un cycle existant | `acces.ts`, `famillesVisuel.ts`, `theme.ts`, `ParcoursScreen`, `AccueilScreen` (ligne 104) | Aucune. Une version est immuable, et un programme référencé par un cycle ne peut pas être supprimé. Ils lisent la mémoire au moment de s'afficher. |
| Ceux qui parcourent `FAMILLES` | `CatalogueScreen` (ligne 139), `AccueilScreen` (ligne 337) | À vérifier. `FAMILLES` reste compilée et sa famille perso reste vide. S'ils affichent un compte ou une liste de programmes, ils devront lire la mémoire. |
| La nouvelle page ME, MYSELF & I | À créer | Oui : c'est là qu'on importe, archive et supprime. |

`tousLesProgrammes` et `programmesDisponibles` ne sont lus par aucun écran, seulement par le catalogue lui-même et par des tests.

**Mécanisme minimal.** La mémoire expose deux fonctions : s'abonner, et lire un instantané. Un seul crochet React (`useProgrammesImportes`) les branche, et seule la page perso l'utilise au départ. Aucun appelant existant n'est modifié.

**Points de vérification pour Opus au lot 3**, faute d'avoir ouvert ces écrans :

1. Ce que `AccueilScreen` (ligne 337) et `CatalogueScreen` (ligne 139) affichent pour une famille dont `programmes` est vide.
2. Si les écrans sont démontés à chaque changement de route. Si oui, une simple lecture à l'affichage suffit pour eux.
3. Après une restauration, la mémoire doit être rechargée avant que `App.tsx` ne relise le cycle actif (son compteur `dataVersion`) et avant le recalcul du thème.

**Identifiants d'exercices.** Chaque exercice reçoit l'identifiant `<cle>-<id local>`, par exemple `perso-k3f9a1c2e-2-squat`. Le préfixe `perso-` est réservé. Un test refusera tout identifiant compilé qui commence ainsi. Conséquences :

- `exerciseReference` (index unique global sur `exerciseId`) : une image de référence ne peut pas passer d'un programme à l'autre, ni d'une version à la suivante.
- `referencesForce` et `settings.oneRM` : le module générique ne les lit jamais et n'y écrit jamais.

**Progression.** Aucune. Le module ignore `settings`, les références de force et l'historique pour construire la prescription.

**Trois notions de charge, jamais confondues.**

| Notion | D'où elle vient | Où elle va |
|---|---|---|
| Charge prescrite | Le document (`chargeKg` de la série) | Affichée sur la carte ; enregistrée dans `plannedKg`. |
| Dernière charge réalisée | L'historique de la personne : même exercice, même cycle | Affichée comme repère : « Dernière fois : 80 kg ». |
| Charge saisie | La personne, pendant la séance | Enregistrée dans `actualKg`. |

Aucune ne remplace automatiquement une autre. Règle ferme : `actualKg` ne contient qu'une valeur que la personne a tapée ou reprise par un geste explicite. Une série validée sans charge enregistre une absence (`null`), jamais zéro, jamais le repère, jamais la charge prescrite.

Proposition pour la première version : le champ s'ouvre vide, les deux repères sont affichés à côté, et un appui permet d'en reprendre un. C'est le précédent du sélecteur de RIR, où un champ pré-rempli transformait une absence en valeur. À vérifier au lot 4 dans la carte d'exercice (non ouverte) : comment elle pré-remplit aujourd'hui, et si `lastKg: null` suffit à laisser le champ vide.

**Chrono, historique, statistiques.** Le chrono reçoit `restSec` comme pour MASS. L'historique passe par `allSets`, déjà limité au cycle actif : aucun mélange. Pour les statistiques, voir §5.

**Écarté.** Tout rendre asynchrone (23 appelants et leurs écrans à réécrire). Un contexte React (inaccessible à `acces.ts`, `theme.ts`, `repo.ts`). Rendre `modulePourCycle` nullable (11 fichiers de POWER et MASS à modifier).

**Risque.** C'est le lot le plus sensible. Garde-fou : pour tout identifiant compilé, les modules rendus sont les mêmes objets qu'aujourd'hui.

### D5 — Transitions « au choix »

**Compatible : oui.** Les transitions demandent plusieurs cycles sur un même programme et une règle « l'un de ces programmes terminé suffit ». Le premier point est déjà permis par cet ADR. Le second relève d'`acces.ts`, que cet ADR ne touche pas. Trois contraintes à garder :

1. Un programme importé n'a pas de `deblocage` et ne valide aucune transition.
2. La famille d'un programme se lit dans sa définition, jamais dans son préfixe.
3. Les renfos de POWER, MASS et FEMMES resteront des modules compilés écrits par Guillaume.

---

## 2. Interfaces et validation JSON

Interfaces documentaires : aucun fichier TypeScript n'est créé.

```ts
/** Clé absente ou null = « non précisé par le document ». Jamais zéro. */
interface FichierProgrammeMajk {
  format: 'majk-programme';
  schemaVersion: 1;
  programme: {
    uid: string;               // lignée : [a-z0-9]{8,24}, créé à la conversion
    nom: string;               // titre du document
    versionSource?: string;    // libellé du coach, affiché, jamais interprété
    source: { document: string; auteur?: string };
    dureeSemaines?: number;    // absente : MAJK pose la question à l'import
    consignes?: string[];      // consignes générales du document, mot pour mot
    /** Ce que Guillaume a tranché parce que le document ne le dit pas. */
    decisions?: { sujet: 'jours' | 'exclusion' | 'identite' | 'convention' | 'texte'; texte: string }[];
  };
  exercices: { id: string; nom: string; consignes?: string[] }[];
  semaines: BlocSemaines[];    // avec dureeSemaines : couvrent 1..N, une seule fois chacune
}

interface BlocSemaines {
  numeros?: number[];          // absent : semaine type unique, répétée sur la durée choisie
  libelle?: string;            // nom de phase écrit dans le document
  seances: SeanceImportee[];   // peut être vide : semaine de repos
}

interface SeanceImportee {
  id: string;
  jour: 0 | 1 | 2 | 3 | 4 | 5 | 6;   // 0 = lundi ; une séance par jour
  titre: string;
  dureeMinutes?: number;       // seulement si le document la donne
  notes?: string[];            // échauffement, consignes de séance, mot pour mot
  lignes: LigneImportee[];
}

interface LigneImportee {
  exerciceId: string;
  section?: string;            // intertitre d'un bloc du document (« SEANCE ABDOS »)
  texteOriginal: string;       // toujours affiché ; cellules du document jointes par « | »
  prescription?: PrescriptionStructuree;   // absente : ligne consultable
  groupe?: string;             // superset ou circuit : lignes consécutives, deux ou plus
}

/** Deux formes, exclusives : séries identiques, ou détail série par série. */
type PrescriptionStructuree = { cote?: 'côté' | 'jambe'; reposSec?: number } & (
  | { series: number; objectif: Objectif; chargeKg?: number }
  | { detail: { objectif: Objectif; chargeKg?: number }[] }   // pyramides
);

type Objectif =                // même `type` pour toutes les séries d'une ligne
  | { type: 'reps'; reps: number | { min: number; max: number } | 'max' }
  | { type: 'duree'; secondes: number }
  | { type: 'distance'; metres: number };
```

Pourquoi deux formes : les 44 lignes de Training 1 ont toutes des séries identiques. Les écrire série par série aurait quadruplé le fichier sans rien apporter. Le validateur ramène les deux formes à la même liste de séries. `cote` reprend les deux libellés que le moteur sait afficher (`sideLabel`).

**Classes d'erreurs.** Chaque erreur porte un code, un chemin (`semaines[1].seances[0].lignes[3]`) et un message en français. Les deux premières arrêtent tout ; les suivantes sont toutes collectées, pour corriger le fichier en une passe.

| Code | Déclencheur |
|---|---|
| `json-invalide` | Syntaxe JSON, ou fichier au-delà du plafond de taille. |
| `version-inconnue` | `format` différent, ou `schemaVersion` non gérée (« Mets l'application à jour »). |
| `structure-invalide` | Champ obligatoire manquant, mauvais type, nombre non entier ou négatif, texte vide, clé inconnue, clé `__proto__`, `series` ou `detail` vides, les deux formes à la fois, objectifs de natures différentes dans une même ligne, lignes d'un même `groupe` non consécutives, `numeros` absent alors que `dureeSemaines` est présente (ou l'inverse). |
| `identifiant-duplique` | Deux exercices ou deux séances de même identifiant ; le même exercice deux fois dans une séance. |
| `prescription-incompatible` | Cas bloquants ci-dessous. |

**Cas bloquants** : plus de 12 semaines (limite proposée, toujours à valider : voir D2), séance sans jour, deux séances le même jour d'une même semaine (la table `sessions` impose une séance par jour ; la conversion juxtapose les blocs d'un même jour, voir D2), ligne qui cite un exercice non déclaré. La durée absente n'est plus bloquante : MAJK la demande à l'import. Si le document ne fixe pas les jours, Guillaume les tranche à la conversion et l'écrit dans `decisions`. MAJK affiche toutes les `decisions` à l'import et dans le programme, sous le titre « Ce que le document ne disait pas ».

**Texte verbatim.** `texteOriginal`, `nom`, `consignes` et `notes` reproduisent le document au caractère près, fautes comprises (« pique de concertation », « potine »). Quand la conversion ne sait pas trancher entre deux lectures, elle ne choisit pas : elle s'arrête et pose la question à Guillaume, dont la réponse entre dans `decisions` (décision du 16 novembre).

**Règles transverses.**

- L'objet normalisé est reconstruit champ par champ, jamais recopié depuis l'entrée.
- Les textes sont affichés comme du texte, jamais comme du HTML.
- Plafonds de garde proposés, à ajuster : fichier de 1 Mo, 7 séances par semaine, 40 lignes par séance, 2 000 caractères par texte.

---

## 3. Persistance, versionnement et sauvegardes

**La table (v25).** `programmesImportes: '++id, &cle, uid'`. Une ligne contient : `cle`, `uid`, `rev`, `nom`, `importeLe`, `archive`, le `document` normalisé, les `reponses` du questionnaire d'import (aujourd'hui, la seule durée choisie) et le classement de chaque ligne, figés à l'import. Après l'import, seul `archive` peut changer.

**Le classement est figé** : une mise à jour de MAJK ne change pas le comportement d'un cycle en cours.

**Listes de tables.** `TABLES_PAR_CYCLE` et `TABLES_DU_CYCLE` restent inchangées. Un programme n'appartient à aucun cycle, et la montée v17 parcourt `TABLES_PAR_CYCLE` sur des bases où cette table n'existe pas.

| Cas | Comportement |
|---|---|
| Deux programmes différents | Deux lignées, deux clés, identifiants d'exercices préfixés par la clé : aucun croisement possible. |
| Même JSON réimporté | Document et réponses identiques à une version stockée (comparaison de la forme canonique) : rien n'est écrit, « déjà importé ». Même document, autre durée choisie : nouvelle version `rev + 1`, après confirmation. |
| Nouvelle version | Même `uid`, contenu différent : confirmation avec les deux noms affichés, puis nouvelle ligne `rev + 1`. Les cycles existants gardent leur version. |
| Plusieurs cycles sur un programme | Même clé dans chaque `CycleRow`. Les séries restent séparées par `cycleId`. |
| Suppression d'un cycle | Règles actuelles inchangées. Le programme source n'est jamais touché. |
| Suppression d'un programme | Refusée si un cycle le référence : l'archivage est proposé (masqué du catalogue, toujours lisible). Sinon, suppression de la ligne et de ses images de référence, en une transaction. |
| Restauration de plusieurs versions | Lignes restaurées telles quelles ; l'index unique sur `cle` interdit les doublons. |

**Sauvegardes.**

- `ExportFile` gagne `programmesImportes?`. `exportAll`, `parseExport` (liste vide par défaut), `importAll` et `TABLES_SAUVEGARDEES` suivent.
- `EXPORT_VERSION` passe de 3 à 4. Une application pas encore mise à jour refusera le fichier, au lieu d'en perdre les programmes en silence.
- Les sauvegardes actuelles (version 3 et moins) restent importables : le champ est simplement absent.
- Le premier test d'`exportRoundTrip.test.ts` échouera tant que la table n'est pas dans `TABLES_SAUVEGARDEES`. C'est le garde-fou voulu.

**Protection des restaurations.** Avant d'ouvrir la transaction d'`importAll`, donc avant le moindre effacement :

1. Chaque programme du fichier repasse par `validerProgramme`.
2. Chaque cycle dont le `programmeId` commence par `perso-` doit trouver son programme dans le fichier.

Si l'un des deux contrôles échoue, la restauration est refusée et la base reste telle qu'elle était. Sinon, la table rejoint la transaction existante : tout passe ou rien ne passe. La mémoire est rechargée ensuite.

---

## 4. Plan Opus

**Étape 0 — FAITE le 16 novembre sur « Training 1 Guillaume ».** 5 jours d'entraînement, 30 exercices, 44 occurrences par semaine, dont 3 supersets et un circuit d'abdos de 4 stations répété 3 jours. Avec l'ADR d'avant l'étape 0 : 32 compatibles, 12 consultables (le circuit), et quatre blocages de structure (durée absente, deux blocs le même jour, « sans les bras » non défini, consignes générales sans place). Après les corrections de cette version : **44 compatibles sur 44**, aucun blocage. Aucune correction ne touche le moteur, la base ou le registre. La conversion complète est en annexe B, et elle sert de fichier d'exemple aux lots 1, 4 et 6.

**À refaire sur un second PDF** avant le lot 4, si possible avec une pyramide ou un AMRAP : Training 1 n'en contient aucun.

| Lot | Objectif | Fichiers | Test d'acceptation | Risque de régression |
|---|---|---|---|---|
| 1 | Format, validateur, classement, forme canonique. | Nouveaux, sous `src/engine/perso/`. | L'annexe B est acceptée : 44 lignes compatibles sur 44, durée « à demander », 5 décisions lues. Un fichier fautif par classe d'erreur ; une valeur absente ne devient jamais 0 ; une clé inconnue est refusée ; une pyramide est compatible, un AMRAP au temps est consultable. | Faible, tant que le validateur reste isolé. |
| 2 | Table v25, import, archivage, suppression, sauvegardes. | `db/db.ts`, nouveau `db/programmesImportes.ts`, `db/export.ts`, `exportRoundTrip.test.ts`. | Aller-retour avec deux programmes, dont un en deux versions, et leurs cycles ; un fichier v3 se restaure ; une restauration incohérente ne modifie rien. | Moyen : `importAll`. |
| 3 | Mémoire, hydratation, fin du repli pour les seuls identifiants inconnus. | Nouveau `programmes/perso/memoire.ts`, `programmes/registre.ts`, `registre.test.ts`, `data/catalogue.ts` (`programmeParId` seul), `main.tsx`, `App.tsx`. | Pour `femmes8` et pour `null`, `modulePourCycle` et les valeurs que calcule `App.tsx` (`locateToday`, `currentWeek`) sont identiques à aujourd'hui ; les identifiants compilés rendent les mêmes modules qu'avant ; un identifiant inconnu ne rend jamais POWER 12 ; suite complète verte. | Élevé. |
| 4 | Module générique et champs du contrat. | Nouveau `programmes/perso/module.ts`, `engine/getSession.ts` (types), carte d'exercice, écran de séance. | Les séances de l'annexe B sont comparées ligne à ligne et série à série au fichier ; le circuit d'abdos sort en un bloc de 4 stations, 4 tours, rythme enchaîné, 60 s ; les trois supersets sortent enchaînés ; les sections et les consignes générales s'affichent ; une ligne consultable n'a aucune série ; un contexte rempli de 1RM ne change rien ; une série validée sans charge enregistre `null`. | Moyen : composants partagés. |
| 5 | Page ME, MYSELF & I : import, questionnaire de durée, rapport, décisions, démarrage, archivage. | `CatalogueScreen.tsx`, `programmes/textesCycle.ts`, nouveaux composants. | Parcours Playwright : import de l'annexe B, question de durée (aucune valeur par défaut), séance, série, export, remise à zéro, restauration. | Faible. |
| 6 | Non-régression de POWER, MASS et FEMMES, et validation sur programmes réels. | Tests seulement. | L'empreinte de POWER est inchangée à l'octet ; la suite complète est verte ; une séance POWER, une MASS et une FEMMES se jouent comme avant (Playwright) ; une sauvegarde d'avant la v25 se restaure avec les mêmes décomptes ; chaque programme réel de l'étape 0 s'importe, ses séances égalent son fichier ligne à ligne, et une séance jouée survit à export, remise à zéro et restauration. | Nul : aucun code applicatif. |

---

## 5. Risques et incertitudes

**Risques.**

1. **Fidélité au PDF.** MAJK ne la vérifie pas. Elle repose sur la relecture de Guillaume.
2. **Suivi parfois partiel.** Sur Training 1, le suivi est complet (44 sur 44). Restent consultables les AMRAP et les nombres de séries en fourchette, absents de ce PDF : leur part réelle reste à mesurer sur un second document.
3. **Cycles au programme inconnu.** Les cycles FEMMES ne changent pas : `femmes8` garde son repli sur POWER 12, dont `App.tsx` dépend. Changent seulement les identifiants absents du catalogue compilé et de la mémoire : ils afficheront « Programme indisponible » au lieu de POWER 12. Un cas possible : `mass12`, retiré du catalogue. Je ne sais pas si un cycle `mass12` a pu exister sur une installation ou dans une sauvegarde. Ses données resteraient en base dans tous les cas.
4. **Un test existant est réécrit.** `registre.test.ts` affirme aujourd'hui le repli pour `power99`. C'est un changement voulu, à valider.
5. **Attente au démarrage.** Une lecture de table avant le premier affichage. À chronométrer au lot 3.

**Incertitudes, hors du périmètre de lecture.**

- Je n'ai pas vérifié si l'écran Progrès sait afficher autre chose que les mouvements POWER ; fichier hors périmètre. Tant que ce n'est pas tranché, l'onglet Progrès d'un programme importé ouvre la vue `a-venir`.
- Le décompte de 11 appelants de `modulePourCycle` vient de la mission ; je ne l'ai pas recompté. Celui de `programmeParId` (12) est recompté.
- Je suppose que terminer une séance est un geste de l'utilisateur. Je n'ai lu ni l'écran de séance ni `SessionRow`.
- Je n'ai pas lu `saveSet`. Qu'il enregistre `plannedKg` et `plannedReps` par série est un fait donné par le correctif, cohérent avec les colonnes de `SetRow`. Ce qu'il écrit dans `plannedReps` pour une fourchette ou pour « max » reste à vérifier.
- Un seul PDF réel éprouvé, sans pyramide, sans AMRAP, sans charge prescrite et sans durée totale.
- Le questionnaire de durée est placé à l'import dans MAJK. C'est ma lecture de la réponse de Guillaume (« un questionnaire sera établi avec cette question et l'utilisateur y répondra ») : à confirmer.

**Fichiers à lire par Opus avant de coder (non ouverts, sauf mention) :**

| Fichier | Raison |
|---|---|
| `src/main.tsx`, `src/App.tsx` (lu : lignes 150-220) | Où placer l'hydratation et l'écran « Programme indisponible ». |
| `src/db/femmesRepo.ts` | Où vit `FEMMES_PROGRAMME_ID`, sans créer de dépendance du registre vers la base. |
| `src/db/repo.ts` (hors lignes lues) | Pourquoi il appelle `modulePourCycle` ; ce que vérifient `demarrerCycle` et `saveSet`. |
| `src/components/ExerciseCard.tsx` | Lecture de `objectifsParSerie` ; pré-remplissage du champ de charge. |
| `src/engine/loadResolver.ts`, `src/engine/loadEntry.ts` | Forme de `ResolvedLoad` ; l'aide « Première fois : choisis une charge… » ne doit pas inventer de consigne. |
| `src/engine/superset.ts` (lu à l'étape 0) | Les groupes de N stations sont gérés. Reste à vérifier à l'écran : une station en durée (planche, 1 min) au milieu de stations en reps. |
| Écran de séance, barre de repos | Affichage d'un repos non précisé (`restSec` à 0) et des champs `sansIntensite`, `sansDuree`. |
| Remplacement d'exercice en séance (`sessionExercises`) | Quels exercices sont proposés sous un programme importé. |
| `src/screens/CatalogueScreen.tsx`, `src/screens/AccueilScreen.tsx` | Ce qu'ils affichent pour la famille perso ; besoin ou non de notification. |
| `src/programmes/textesCycle.ts` | Textes hors séance pour un programme importé. |
| `src/state/theme.ts`, `src/data/famillesVisuel.ts` | Aucune identité visuelle n'est définie pour la famille perso : à fournir par Guillaume. |
| `src/state/useRoute.ts`, `src/screens/WeekScreen.tsx`, `src/engine/calendar.ts` | Seulement si la limite de 12 semaines doit être levée. |

---

## Annexe A — Décisions de Guillaume (16 novembre 2026), étape 0

| # | Question | Décision |
|---|---|---|
| 1 | Durée de Training 1, que le PDF ne donne pas | Un questionnaire la pose ; la personne répond (voir D2). |
| 2 | « Séance 1 sans les bras » = sans le superset curl EZ / barre au front EZ ? | Oui. |
| 3 | « + abdos » : après la séance ? | Oui. |
| 4 | « Barre au front EZ » et « Barre au front » : même exercice ? | Oui, même exercice, un seul historique. |
| 5 | « en super set » = sans repos entre les exercices ? | Oui. |
| 6 | Fautes du PDF | Verbatim. Quand l'IA ne sait pas trancher, Guillaume tranche. |

## Annexe B — « Training 1 Guillaume », converti au format MAJK

Écrit à la main depuis le PDF, sans aucun ajout. Cellules d'une ligne du tableau jointes par « | ». Pas de `dureeSemaines` : le PDF n'en donne pas, MAJK la demandera.

```json
{
  "format": "majk-programme",
  "schemaVersion": 1,
  "programme": {
    "uid": "training1guillaume201005",
    "nom": "Training 1",
    "versionSource": "Guillaume 05/10/20",
    "source": { "document": "Training 1 Guillaume (3).pdf" },
    "consignes": [
      "Pour l’ensemble des exercices, une pique de concertation est obligatoire Tu dois contracté à chaque rép",
      "Pour l'ensemble des exercices, un contrôle des charge dans la phrase excentrique est obligatoire.",
      "C’est pour quoi, l’accent doit être mis sur la propreté de chaque mouvement et ne pas sur les charges."
    ],
    "decisions": [
      { "sujet": "exclusion", "texte": "« Séance 1 sans les bras » : la séance 1 sans le superset curl barre EZ / barre au front EZ." },
      { "sujet": "convention", "texte": "« + abdos » : les abdos se font après la séance." },
      { "sujet": "identite", "texte": "« Barre au front EZ » (séance 1) et « Barre au front » (séance 4) sont le même exercice, nommé « Barre au front »." },
      { "sujet": "convention", "texte": "« en super set » : enchaînement sans repos entre les exercices ; le repos écrit suit le groupe." },
      { "sujet": "texte", "texte": "Texte du document reproduit verbatim, fautes comprises." }
    ]
  },
  "exercices": [
    { "id": "oiseau-poulie-haute", "nom": "Arrière épaule oiseau à la poulie haute" },
    { "id": "militaire-smith", "nom": "Développé militaire smith ( assis )" },
    { "id": "arnold", "nom": "Développé épaule Arnold ( assis )" },
    { "id": "oiseau-banc-incline", "nom": "Oiseau sur banc incliné haltère" },
    { "id": "elevation-laterale", "nom": "Elévation latérale", "consignes": ["Ne montes pas trop haut les haltère. Ne pas dépasser la ligne d'épaule, pour ne pas mettre l'accent sur les trapèzes"] },
    { "id": "curl-ez", "nom": "Curl barre Ez" },
    { "id": "barre-au-front", "nom": "Barre au front" },
    { "id": "fentes", "nom": "Fentes" },
    { "id": "squat", "nom": "Squat" },
    { "id": "presse-verticale", "nom": "Presse cuisse verticale" },
    { "id": "leg-extension", "nom": "Leg extension" },
    { "id": "leg-curl", "nom": "Leg curl" },
    { "id": "mollet-presse", "nom": "Mollet presse horizontale" },
    { "id": "pull-over-poulie", "nom": "Pull over à la poulie haute bras tendus" },
    { "id": "traction-large", "nom": "Traction prise large", "consignes": ["Assisté ; poids libre ou lesté selon ton niveau"] },
    { "id": "rowing-pronation", "nom": "Rowing barre pronation", "consignes": ["Ceinture", "Ramène la barre vers nombril pour accentuer la pression sur les grand dorsal. Gardes la barre prés de tes genoux pour ne pas agresser les lombaires"] },
    { "id": "tirage-horizontal", "nom": "Tirage horizontale prise serré avec poignet en fer" },
    { "id": "tirage-vertical", "nom": "Tirage verticale prise serré supination", "consignes": ["Ramène la au milieu des pecs pour mettre l'accent sur les coiffes des rotateurs et deltoïde postérieurs en muscle secondaire"] },
    { "id": "curl-haltere-incline", "nom": "Curl haltère sur banc incliné" },
    { "id": "pupitre-ez", "nom": "Biceps pupitre barre EZ ( une prise serré )" },
    { "id": "ecarte-poulie-haute", "nom": "Ecarté à la poulie haute" },
    { "id": "couche-haltere", "nom": "Développé couché haltère" },
    { "id": "incline-haltere", "nom": "Développé incliné haltère" },
    { "id": "ecarte-incline", "nom": "Ecarté incliné" },
    { "id": "ecarte-couche", "nom": "Ecarté couché" },
    { "id": "triceps-corde", "nom": "Triceps à la poulie haute corde" },
    { "id": "releve-buste", "nom": "Relevé de buste pieds au sol avec un disque sur potine" },
    { "id": "releve-jambes", "nom": "Relevé de jambes au sol" },
    { "id": "twist", "nom": "Twist medcines ball ( ou haltère ou autre objet )" },
    { "id": "planche", "nom": "La planche ( gainage )" }
  ],
  "semaines": [
    {
      "seances": [
        {
          "id": "lundi", "jour": 0, "titre": "Séance 1 + abdos",
          "notes": ["Echauffement : 5 minutes de rameur", "Enchainer les 4 exercices sans temps de repos entre chaque. À la fin de chaque circuit, prendre 1min de repos."],
          "lignes": [
            { "exerciceId": "oiseau-poulie-haute", "section": "SEANCE 1 EPAULES BRAS", "texteOriginal": "Arrière épaule oiseau à la poulie haute | 1min | 3 x 15", "prescription": { "series": 3, "objectif": { "type": "reps", "reps": 15 }, "reposSec": 60 } },
            { "exerciceId": "militaire-smith", "section": "SEANCE 1 EPAULES BRAS", "texteOriginal": "Développé militaire smith ( assis ) | 1min30 | 4 x 6 à 8", "prescription": { "series": 4, "objectif": { "type": "reps", "reps": { "min": 6, "max": 8 } }, "reposSec": 90 } },
            { "exerciceId": "arnold", "section": "SEANCE 1 EPAULES BRAS", "texteOriginal": "Développé épaule Arnold ( assis ) | 1min30 | 4 x 8 à 10", "prescription": { "series": 4, "objectif": { "type": "reps", "reps": { "min": 8, "max": 10 } }, "reposSec": 90 } },
            { "exerciceId": "oiseau-banc-incline", "section": "SEANCE 1 EPAULES BRAS", "texteOriginal": "Oiseau sur banc incliné haltère | 1min30 | 4 x 9 à 12", "prescription": { "series": 4, "objectif": { "type": "reps", "reps": { "min": 9, "max": 12 } }, "reposSec": 90 } },
            { "exerciceId": "elevation-laterale", "section": "SEANCE 1 EPAULES BRAS", "texteOriginal": "Elévation latérale | 1min30 | 4 x 12", "prescription": { "series": 4, "objectif": { "type": "reps", "reps": 12 }, "reposSec": 90 } },
            { "exerciceId": "curl-ez", "section": "SEANCE 1 EPAULES BRAS", "groupe": "bras", "texteOriginal": "Curl barre Ez en super set avec barre au front EZ | 1min30 | 4 x 12", "prescription": { "series": 4, "objectif": { "type": "reps", "reps": 12 }, "reposSec": 0 } },
            { "exerciceId": "barre-au-front", "section": "SEANCE 1 EPAULES BRAS", "groupe": "bras", "texteOriginal": "Curl barre Ez en super set avec barre au front EZ | 1min30 | 4 x 12", "prescription": { "series": 4, "objectif": { "type": "reps", "reps": 12 }, "reposSec": 90 } },
            { "exerciceId": "releve-buste", "section": "SEANCE ABDOS", "groupe": "abdos", "texteOriginal": "Relevé de buste pieds au sol avec un disque sur potine | 10 | ou tu prends un poids quand tu le fais à la maison", "prescription": { "series": 4, "objectif": { "type": "reps", "reps": 10 }, "reposSec": 0 } },
            { "exerciceId": "releve-jambes", "section": "SEANCE ABDOS", "groupe": "abdos", "texteOriginal": "Relevé de jambes au sol | 10", "prescription": { "series": 4, "objectif": { "type": "reps", "reps": 10 }, "reposSec": 0 } },
            { "exerciceId": "twist", "section": "SEANCE ABDOS", "groupe": "abdos", "texteOriginal": "Twist medcines ball ( ou haltère ou autre objet ) | 10 de chaque coté | ou une bouteille 1L5 quand tu fais à la maison", "prescription": { "series": 4, "objectif": { "type": "reps", "reps": 10 }, "cote": "côté", "reposSec": 0 } },
            { "exerciceId": "planche", "section": "SEANCE ABDOS", "groupe": "abdos", "texteOriginal": "La planche ( gainage ) | 1min", "prescription": { "series": 4, "objectif": { "type": "duree", "secondes": 60 }, "reposSec": 60 } }
          ]
        },
        {
          "id": "mardi", "jour": 1, "titre": "Séance 2",
          "notes": ["Echauffement : 5 minutes de vélo"],
          "lignes": [
            { "exerciceId": "fentes", "section": "SEANCE 2 JAMBES", "texteOriginal": "Fentes | 1min30 | 4 x 10 de chaque jambes", "prescription": { "series": 4, "objectif": { "type": "reps", "reps": 10 }, "cote": "jambe", "reposSec": 90 } },
            { "exerciceId": "squat", "section": "SEANCE 2 JAMBES", "texteOriginal": "Squat | 2min | 4 x 8", "prescription": { "series": 4, "objectif": { "type": "reps", "reps": 8 }, "reposSec": 120 } },
            { "exerciceId": "presse-verticale", "section": "SEANCE 2 JAMBES", "texteOriginal": "Presse cuisse verticale | 2min | 4 x 10", "prescription": { "series": 4, "objectif": { "type": "reps", "reps": 10 }, "reposSec": 120 } },
            { "exerciceId": "leg-extension", "section": "SEANCE 2 JAMBES", "groupe": "cuisses", "texteOriginal": "Leg extension en super set avec leg curl | 1min30 | 4 x 10 + 10", "prescription": { "series": 4, "objectif": { "type": "reps", "reps": 10 }, "reposSec": 0 } },
            { "exerciceId": "leg-curl", "section": "SEANCE 2 JAMBES", "groupe": "cuisses", "texteOriginal": "Leg extension en super set avec leg curl | 1min30 | 4 x 10 + 10", "prescription": { "series": 4, "objectif": { "type": "reps", "reps": 10 }, "reposSec": 90 } },
            { "exerciceId": "mollet-presse", "section": "SEANCE 2 JAMBES", "texteOriginal": "Mollet presse horizontale | 1min | 4 x 15", "prescription": { "series": 4, "objectif": { "type": "reps", "reps": 15 }, "reposSec": 60 } }
          ]
        },
        {
          "id": "jeudi", "jour": 3, "titre": "Séance 1 sans les bras + abdos",
          "notes": ["Echauffement : 5 minutes de rameur", "Enchainer les 4 exercices sans temps de repos entre chaque. À la fin de chaque circuit, prendre 1min de repos."],
          "lignes": [
            { "exerciceId": "oiseau-poulie-haute", "section": "SEANCE 1 EPAULES BRAS", "texteOriginal": "Arrière épaule oiseau à la poulie haute | 1min | 3 x 15", "prescription": { "series": 3, "objectif": { "type": "reps", "reps": 15 }, "reposSec": 60 } },
            { "exerciceId": "militaire-smith", "section": "SEANCE 1 EPAULES BRAS", "texteOriginal": "Développé militaire smith ( assis ) | 1min30 | 4 x 6 à 8", "prescription": { "series": 4, "objectif": { "type": "reps", "reps": { "min": 6, "max": 8 } }, "reposSec": 90 } },
            { "exerciceId": "arnold", "section": "SEANCE 1 EPAULES BRAS", "texteOriginal": "Développé épaule Arnold ( assis ) | 1min30 | 4 x 8 à 10", "prescription": { "series": 4, "objectif": { "type": "reps", "reps": { "min": 8, "max": 10 } }, "reposSec": 90 } },
            { "exerciceId": "oiseau-banc-incline", "section": "SEANCE 1 EPAULES BRAS", "texteOriginal": "Oiseau sur banc incliné haltère | 1min30 | 4 x 9 à 12", "prescription": { "series": 4, "objectif": { "type": "reps", "reps": { "min": 9, "max": 12 } }, "reposSec": 90 } },
            { "exerciceId": "elevation-laterale", "section": "SEANCE 1 EPAULES BRAS", "texteOriginal": "Elévation latérale | 1min30 | 4 x 12", "prescription": { "series": 4, "objectif": { "type": "reps", "reps": 12 }, "reposSec": 90 } },
            { "exerciceId": "releve-buste", "section": "SEANCE ABDOS", "groupe": "abdos", "texteOriginal": "Relevé de buste pieds au sol avec un disque sur potine | 10 | ou tu prends un poids quand tu le fais à la maison", "prescription": { "series": 4, "objectif": { "type": "reps", "reps": 10 }, "reposSec": 0 } },
            { "exerciceId": "releve-jambes", "section": "SEANCE ABDOS", "groupe": "abdos", "texteOriginal": "Relevé de jambes au sol | 10", "prescription": { "series": 4, "objectif": { "type": "reps", "reps": 10 }, "reposSec": 0 } },
            { "exerciceId": "twist", "section": "SEANCE ABDOS", "groupe": "abdos", "texteOriginal": "Twist medcines ball ( ou haltère ou autre objet ) | 10 de chaque coté | ou une bouteille 1L5 quand tu fais à la maison", "prescription": { "series": 4, "objectif": { "type": "reps", "reps": 10 }, "cote": "côté", "reposSec": 0 } },
            { "exerciceId": "planche", "section": "SEANCE ABDOS", "groupe": "abdos", "texteOriginal": "La planche ( gainage ) | 1min", "prescription": { "series": 4, "objectif": { "type": "duree", "secondes": 60 }, "reposSec": 60 } }
          ]
        },
        {
          "id": "vendredi", "jour": 4, "titre": "Séance 3",
          "notes": ["Echauffement : 5 minutes rameur"],
          "lignes": [
            { "exerciceId": "pull-over-poulie", "section": "SEANCE 3 DOS BICEPS", "texteOriginal": "Pull over à la poulie haute bras tendus | 1min | 3 x 15", "prescription": { "series": 3, "objectif": { "type": "reps", "reps": 15 }, "reposSec": 60 } },
            { "exerciceId": "traction-large", "section": "SEANCE 3 DOS BICEPS", "texteOriginal": "Traction prise large | 1min30 | 4 x 6 à 8", "prescription": { "series": 4, "objectif": { "type": "reps", "reps": { "min": 6, "max": 8 } }, "reposSec": 90 } },
            { "exerciceId": "rowing-pronation", "section": "SEANCE 3 DOS BICEPS", "texteOriginal": "Rowing barre pronation | Ceinture | 1min30 | 4 x 8 à 10", "prescription": { "series": 4, "objectif": { "type": "reps", "reps": { "min": 8, "max": 10 } }, "reposSec": 90 } },
            { "exerciceId": "tirage-horizontal", "section": "SEANCE 3 DOS BICEPS", "texteOriginal": "Tirage horizontale prise serré avec poignet en fer | 1min30 | 4 x 9 à 12", "prescription": { "series": 4, "objectif": { "type": "reps", "reps": { "min": 9, "max": 12 } }, "reposSec": 90 } },
            { "exerciceId": "tirage-vertical", "section": "SEANCE 3 DOS BICEPS", "texteOriginal": "Tirage verticale prise serré supination | 1min30 | 4 x 12", "prescription": { "series": 4, "objectif": { "type": "reps", "reps": 12 }, "reposSec": 90 } },
            { "exerciceId": "curl-haltere-incline", "section": "SEANCE 3 DOS BICEPS", "texteOriginal": "Curl haltère sur banc incliné | 1min30 | 4 x 10", "prescription": { "series": 4, "objectif": { "type": "reps", "reps": 10 }, "reposSec": 90 } },
            { "exerciceId": "pupitre-ez", "section": "SEANCE 3 DOS BICEPS", "texteOriginal": "Biceps pupitre barre EZ ( une prise serré ) | 1min30 | 4 x 12 à 15", "prescription": { "series": 4, "objectif": { "type": "reps", "reps": { "min": 12, "max": 15 } }, "reposSec": 90 } }
          ]
        },
        {
          "id": "samedi", "jour": 5, "titre": "Séance 4 + abdos",
          "notes": ["Echauffement : 5 minutes de rameur", "Enchainer les 4 exercices sans temps de repos entre chaque. À la fin de chaque circuit, prendre 1min de repos."],
          "lignes": [
            { "exerciceId": "ecarte-poulie-haute", "section": "SEANCE 4 PEC TRICEPS", "texteOriginal": "Ecarté à la poulie haute | 1min | 3 x 15", "prescription": { "series": 3, "objectif": { "type": "reps", "reps": 15 }, "reposSec": 60 } },
            { "exerciceId": "couche-haltere", "section": "SEANCE 4 PEC TRICEPS", "texteOriginal": "Développé couché haltère | 1min30 | 4 x 6 à 8", "prescription": { "series": 4, "objectif": { "type": "reps", "reps": { "min": 6, "max": 8 } }, "reposSec": 90 } },
            { "exerciceId": "incline-haltere", "section": "SEANCE 4 PEC TRICEPS", "texteOriginal": "Développé incliné haltère | 1min30 | 4 x 8 à 10", "prescription": { "series": 4, "objectif": { "type": "reps", "reps": { "min": 8, "max": 10 } }, "reposSec": 90 } },
            { "exerciceId": "ecarte-incline", "section": "SEANCE 4 PEC TRICEPS", "groupe": "pecs", "texteOriginal": "Ecarté incliné en super set avec écarté couché | 1min30 | 4 x 10 + 10 | 10rép pour écarté incliné suib sans repos de 10 rép pour écarté couché", "prescription": { "series": 4, "objectif": { "type": "reps", "reps": 10 }, "reposSec": 0 } },
            { "exerciceId": "ecarte-couche", "section": "SEANCE 4 PEC TRICEPS", "groupe": "pecs", "texteOriginal": "Ecarté incliné en super set avec écarté couché | 1min30 | 4 x 10 + 10 | 10rép pour écarté incliné suib sans repos de 10 rép pour écarté couché", "prescription": { "series": 4, "objectif": { "type": "reps", "reps": 10 }, "reposSec": 90 } },
            { "exerciceId": "barre-au-front", "section": "SEANCE 4 PEC TRICEPS", "texteOriginal": "Barre au front | chauffe bien tes coudes | 1min30 | 4 x 10 à 12", "prescription": { "series": 4, "objectif": { "type": "reps", "reps": { "min": 10, "max": 12 } }, "reposSec": 90 } },
            { "exerciceId": "triceps-corde", "section": "SEANCE 4 PEC TRICEPS", "texteOriginal": "Triceps à la poulie haute corde | 1min30 | 4 x 12 à 15", "prescription": { "series": 4, "objectif": { "type": "reps", "reps": { "min": 12, "max": 15 } }, "reposSec": 90 } },
            { "exerciceId": "releve-buste", "section": "SEANCE ABDOS", "groupe": "abdos", "texteOriginal": "Relevé de buste pieds au sol avec un disque sur potine | 10 | ou tu prends un poids quand tu le fais à la maison", "prescription": { "series": 4, "objectif": { "type": "reps", "reps": 10 }, "reposSec": 0 } },
            { "exerciceId": "releve-jambes", "section": "SEANCE ABDOS", "groupe": "abdos", "texteOriginal": "Relevé de jambes au sol | 10", "prescription": { "series": 4, "objectif": { "type": "reps", "reps": 10 }, "reposSec": 0 } },
            { "exerciceId": "twist", "section": "SEANCE ABDOS", "groupe": "abdos", "texteOriginal": "Twist medcines ball ( ou haltère ou autre objet ) | 10 de chaque coté | ou une bouteille 1L5 quand tu fais à la maison", "prescription": { "series": 4, "objectif": { "type": "reps", "reps": 10 }, "cote": "côté", "reposSec": 0 } },
            { "exerciceId": "planche", "section": "SEANCE ABDOS", "groupe": "abdos", "texteOriginal": "La planche ( gainage ) | 1min", "prescription": { "series": 4, "objectif": { "type": "duree", "secondes": 60 }, "reposSec": 60 } }
          ]
        }
      ]
    }
  ]
}
```
