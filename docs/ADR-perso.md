# ADR — ME, MYSELF & I : programmes importés en JSON

**Statut :** proposé, amendé par le correctif n° 2, en attente de validation de Guillaume. Aucun code applicatif écrit.
**Date :** 16 novembre 2026. **Périmètre lu :** les fichiers listés par la mission et son correctif n° 2 (`registre.test.ts`, `App.tsx` lignes 150-220, une recherche des lecteurs du catalogue), rien d'autre.

Aucun PDF d'exemple n'a été fourni pour cette conception. Chaque choix prend donc l'hypothèse la plus prudente.

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
| Compatible | `prescription` présente : le nombre de séries est connu, chaque série a un objectif, et toutes les séries de la ligne ont un objectif de même nature (toutes en reps, ou toutes en durée, ou toutes en distance). Les valeurs peuvent différer d'une série à l'autre. Superset de deux au plus. | Carte normale : séries à valider, chrono. |
| Consultable | Pas de `prescription` : nombre de séries non fixé, objectif double, natures mélangées dans une ligne, groupe de trois exercices et plus. | Carte en lecture : texte d'origine et note libre. Aucune ligne de série. |
| Bloquant | La trame ne tient pas dans le calendrier de MAJK (voir §2). | Fichier refusé. |

**Séries « max » et AMRAP.** Aucun de ces cas n'est bloquant : ils ne cassent pas le calendrier.

| Cas | Exemple | Classement | Pourquoi |
|---|---|---|---|
| Répétitions maximales sur une série | « 3 × max », « dernière série au max » | Compatible | Le nombre de séries est connu et la personne note ses reps. `reps: 'max'` existe déjà dans le moteur. |
| AMRAP au temps, un exercice | « max de pompes en 60 s » | Consultable | Il faut borner le temps et compter les reps. Le contrat n'a qu'un objectif par série : n'en garder qu'un déformerait la consigne. |
| AMRAP en tours, plusieurs exercices | « AMRAP 12 min : 10 pompes, 15 squats, 20 abdos » | Consultable | Le nombre de tours n'est pas connu d'avance : aucune liste de séries ne peut être écrite. |
| Tours fixes | « 5 tours de A puis B » | Compatible à deux exercices (superset, 5 séries chacun) ; consultable à trois et plus | Le moteur n'encadre que deux mouvements voisins ; au-delà, voir `superset.ts` (non ouvert). |
| Nombre de séries en fourchette | « 3 à 4 séries » | Consultable | Choisir 3 ou 4 serait interpréter. |

Si le repos varie d'une série à l'autre, `reposSec` est omis : le chrono ne propose aucune durée et le texte d'origine fait foi.

**Un objectif par série est-il portable dans le moteur ?**

- **En base, oui.** Chaque ligne de `SetRow` porte déjà `plannedReps` et `plannedKg`. Les durées et distances prévues n'ont pas de colonne, et n'en ont pas besoin : la version du programme est immuable et le cycle la désigne, donc l'objectif d'une série se relit toujours dans le document.
- **Dans le contrat de séance, non.** `ResolvedExercise` porte un seul `work` et un seul `planKg` pour toutes les séries. Changement minimal : un champ facultatif `objectifsParSerie` (une entrée par série : son travail et sa charge prescrite, ou `null`), sur le modèle de `sansBloc`. Absent, rien ne change : POWER et MASS ne le posent pas.
- `work` reste obligatoire. Il porte la nature commune de la ligne, d'où la règle « même nature pour toutes les séries ».
- `ramp` (paliers d'un test 1RM) et `secondPart` (série dégressive) existent déjà mais portent un autre sens : ils ne sont pas réutilisés.

**Séance terminée.** Terminer une séance reste un geste de l'utilisateur. Les lignes consultables n'entrent dans aucun compteur. Le résumé les affiche à part : « 12 séries enregistrées sur 12 » et, en dessous, « 2 consignes hors suivi, non enregistrées ». MAJK ne déduit rien et n'invente aucune règle.

**Programme.** Il porte « Suivi complet » seulement si toutes ses lignes sont compatibles. Sinon : « Suivi partiel : 14 exercices sur 18 ». MAJK ne juge pas ce qui est « essentiel » : une seule ligne consultable suffit.

**Contrat moteur.** Le module générique remplit `ResolvedExercise` comme MASS CONGESTION : aucune charge calculée, `suggestion: null`, `targetRPE: null`, aucun ajustement. Famille de mouvement `libre` (elle existe déjà pour « un mouvement que le programme ne connaît pas »), rôle `accessory`, jamais `main`. Trois champs facultatifs sont à ajouter au contrat : `objectifsParSerie` sur l'exercice, `sansIntensite` et `sansDuree` sur la séance. Sans les deux derniers, l'écran afficherait « MODÉRÉ » ou une durée que le document n'a jamais écrits.

**Durée du programme : une décision à valider.**

- **La limite actuelle.** `useRoute.ts` ramène toute semaine hors de 0 à 12 vers la semaine 1 (`clampWeek`). C'est la seule limite que j'ai vue : `WeekIndex` est un simple nombre, et ni `SetRow` ni `ModuleProgramme` ne bornent les semaines. Je n'ai pas lu les écrans.
- **La capacité souhaitable.** Un coach peut écrire 16 semaines. Je n'ai aucun chiffre sur les durées réelles : l'étape 0 en donnera.
- **Le coût d'une extension.** La borne tient en une ligne, mais elle est partagée par POWER et MASS. Fichiers qu'Opus devra examiner avant de la déplacer : `src/state/useRoute.ts` et ses tests, `src/screens/WeekScreen.tsx` (sélecteur de semaines), `src/engine/calendar.ts` (`locateToday`, `currentWeek`), `src/App.tsx`, les écrans Progrès, et tout test qui écrit « 12 ». Cet ADR ne conçoit pas l'extension.
- **Proposition pour la première version : 12 semaines au plus.** Un programme plus long est refusé à l'import avec un message clair. Le fichier reste valable pour plus tard, rien n'est perdu. À valider par Guillaume ; à revoir si l'étape 0 montre des programmes plus longs.

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
    /** Ce que la personne a décidé parce que le document ne le dit pas. */
    choixUtilisateur?: ('jours' | 'duree')[];
  };
  exercices: { id: string; nom: string; consignes?: string[] }[];
  semaines: BlocSemaines[];    // couvrent 1..N, chaque semaine une seule fois
}

interface BlocSemaines {
  numeros: number[];           // [1,2,3,4] : « la même semaine quatre fois »
  libelle?: string;            // nom de phase écrit dans le document
  seances: SeanceImportee[];   // peut être vide : semaine de repos
}

interface SeanceImportee {
  id: string;
  jour: 0 | 1 | 2 | 3 | 4 | 5 | 6;   // 0 = lundi
  titre: string;
  dureeMinutes?: number;       // seulement si le document la donne
  notes?: string[];            // échauffement, consignes de séance, mot pour mot
  lignes: LigneImportee[];
}

interface LigneImportee {
  exerciceId: string;
  texteOriginal: string;       // toujours affiché
  prescription?: PrescriptionStructuree;   // absente : ligne consultable
  groupe?: string;             // superset
}

interface PrescriptionStructuree {
  series: SerieImportee[];     // une entrée par série, dans l'ordre ; au moins une
  parCote?: boolean;           // « par côté », « par jambe »
  reposSec?: number;           // omis si le repos varie d'une série à l'autre
}

interface SerieImportee {
  objectif:                    // même `type` pour toutes les séries d'une ligne
    | { type: 'reps'; reps: number | { min: number; max: number } | 'max' }
    | { type: 'duree'; secondes: number }
    | { type: 'distance'; metres: number };
  chargeKg?: number;           // seulement si le document écrit des kilos
}
```

**Classes d'erreurs.** Chaque erreur porte un code, un chemin (`semaines[1].seances[0].lignes[3]`) et un message en français. Les deux premières arrêtent tout ; les suivantes sont toutes collectées, pour corriger le fichier en une passe.

| Code | Déclencheur |
|---|---|
| `json-invalide` | Syntaxe JSON, ou fichier au-delà du plafond de taille. |
| `version-inconnue` | `format` différent, ou `schemaVersion` non gérée (« Mets l'application à jour »). |
| `structure-invalide` | Champ obligatoire manquant, mauvais type, nombre non entier ou négatif, texte vide, clé inconnue, clé `__proto__`, `series` vide, objectifs de natures différentes dans une même ligne. |
| `identifiant-duplique` | Deux exercices ou deux séances de même identifiant ; le même exercice deux fois dans une séance. |
| `prescription-incompatible` | Cas bloquants ci-dessous. |

**Cas bloquants** : durée du programme absente, plus de 12 semaines (limite proposée pour la première version, à valider : voir D2), séance sans jour, deux séances le même jour d'une même semaine (la table `sessions` impose une séance par jour), ligne qui cite un exercice non déclaré. Si le document ne fixe ni jours ni durée, ils se décident avec la personne avant la conversion et se déclarent dans `choixUtilisateur`. MAJK affichera alors « jours choisis par toi ».

**Règles transverses.**

- L'objet normalisé est reconstruit champ par champ, jamais recopié depuis l'entrée.
- Les textes sont affichés comme du texte, jamais comme du HTML.
- Plafonds de garde proposés, à ajuster : fichier de 1 Mo, 7 séances par semaine, 40 lignes par séance, 2 000 caractères par texte.

---

## 3. Persistance, versionnement et sauvegardes

**La table (v25).** `programmesImportes: '++id, &cle, uid'`. Une ligne contient : `cle`, `uid`, `rev`, `nom`, `importeLe`, `archive`, le `document` normalisé et le classement de chaque ligne, figé à l'import. Après l'import, seul `archive` peut changer.

**Le classement est figé** : une mise à jour de MAJK ne change pas le comportement d'un cycle en cours.

**Listes de tables.** `TABLES_PAR_CYCLE` et `TABLES_DU_CYCLE` restent inchangées. Un programme n'appartient à aucun cycle, et la montée v17 parcourt `TABLES_PAR_CYCLE` sur des bases où cette table n'existe pas.

| Cas | Comportement |
|---|---|
| Deux programmes différents | Deux lignées, deux clés, identifiants d'exercices préfixés par la clé : aucun croisement possible. |
| Même JSON réimporté | Contenu identique à une version stockée (comparaison de la forme canonique) : rien n'est écrit, « déjà importé ». |
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

**Étape 0, hors lots et avant tout développement : éprouver le format sur un vrai PDF de coach.** Le PDF est converti hors de MAJK, à la main, selon les interfaces du §2. On compte les lignes compatibles, consultables et bloquantes, et on note la durée du programme. Guillaume décide ensuite, chiffres en main, si le format part tel quel. Aucun lot ne commence avant.

| Lot | Objectif | Fichiers | Test d'acceptation | Risque de régression |
|---|---|---|---|---|
| 1 | Format, validateur, classement, forme canonique. | Nouveaux, sous `src/engine/perso/`. | Un fichier fautif par classe d'erreur ; une valeur absente ne devient jamais 0 ; une clé inconnue est refusée ; une pyramide est compatible, un AMRAP au temps est consultable. | Faible, tant que le validateur reste isolé. |
| 2 | Table v25, import, archivage, suppression, sauvegardes. | `db/db.ts`, nouveau `db/programmesImportes.ts`, `db/export.ts`, `exportRoundTrip.test.ts`. | Aller-retour avec deux programmes, dont un en deux versions, et leurs cycles ; un fichier v3 se restaure ; une restauration incohérente ne modifie rien. | Moyen : `importAll`. |
| 3 | Mémoire, hydratation, fin du repli pour les seuls identifiants inconnus. | Nouveau `programmes/perso/memoire.ts`, `programmes/registre.ts`, `registre.test.ts`, `data/catalogue.ts` (`programmeParId` seul), `main.tsx`, `App.tsx`. | Pour `femmes8` et pour `null`, `modulePourCycle` et les valeurs que calcule `App.tsx` (`locateToday`, `currentWeek`) sont identiques à aujourd'hui ; les identifiants compilés rendent les mêmes modules qu'avant ; un identifiant inconnu ne rend jamais POWER 12 ; suite complète verte. | Élevé. |
| 4 | Module générique et champs du contrat. | Nouveau `programmes/perso/module.ts`, `engine/getSession.ts` (types), carte d'exercice, écran de séance. | Les séances rendues sont comparées ligne à ligne et série à série au fichier d'exemple ; une ligne consultable n'a aucune série ; un contexte rempli de 1RM ne change rien ; une série validée sans charge enregistre `null`. | Moyen : composants partagés. |
| 5 | Page ME, MYSELF & I : import, rapport, démarrage, archivage. | `CatalogueScreen.tsx`, `programmes/textesCycle.ts`, nouveaux composants. | Parcours Playwright : import, séance, série, export, remise à zéro, restauration. | Faible. |
| 6 | Non-régression de POWER, MASS et FEMMES, et validation sur programmes réels. | Tests seulement. | L'empreinte de POWER est inchangée à l'octet ; la suite complète est verte ; une séance POWER, une MASS et une FEMMES se jouent comme avant (Playwright) ; une sauvegarde d'avant la v25 se restaure avec les mêmes décomptes ; chaque programme réel de l'étape 0 s'importe, ses séances égalent son fichier ligne à ligne, et une séance jouée survit à export, remise à zéro et restauration. | Nul : aucun code applicatif. |

---

## 5. Risques et incertitudes

**Risques.**

1. **Fidélité au PDF.** MAJK ne la vérifie pas. Elle repose sur la relecture de Guillaume.
2. **Suivi parfois partiel.** Les pyramides sont désormais compatibles. Restent consultables les AMRAP, les circuits de trois exercices et plus, et les nombres de séries en fourchette. Leur part réelle se mesure à l'étape 0.
3. **Cycles au programme inconnu.** Les cycles FEMMES ne changent pas : `femmes8` garde son repli sur POWER 12, dont `App.tsx` dépend. Changent seulement les identifiants absents du catalogue compilé et de la mémoire : ils afficheront « Programme indisponible » au lieu de POWER 12. Un cas possible : `mass12`, retiré du catalogue. Je ne sais pas si un cycle `mass12` a pu exister sur une installation ou dans une sauvegarde. Ses données resteraient en base dans tous les cas.
4. **Un test existant est réécrit.** `registre.test.ts` affirme aujourd'hui le repli pour `power99`. C'est un changement voulu, à valider.
5. **Attente au démarrage.** Une lecture de table avant le premier affichage. À chronométrer au lot 3.

**Incertitudes, hors du périmètre de lecture.**

- Je n'ai pas vérifié si l'écran Progrès sait afficher autre chose que les mouvements POWER ; fichier hors périmètre. Tant que ce n'est pas tranché, l'onglet Progrès d'un programme importé ouvre la vue `a-venir`.
- Le décompte de 11 appelants de `modulePourCycle` vient de la mission ; je ne l'ai pas recompté. Celui de `programmeParId` (12) est recompté.
- Je suppose que terminer une séance est un geste de l'utilisateur. Je n'ai lu ni l'écran de séance ni `SessionRow`.
- Je n'ai pas lu `saveSet`. Qu'il enregistre `plannedKg` et `plannedReps` par série est un fait donné par le correctif, cohérent avec les colonnes de `SetRow`. Ce qu'il écrit dans `plannedReps` pour une fourchette ou pour « max » reste à vérifier.
- Je n'ai aucune donnée sur la durée réelle des programmes de coach.

**Fichiers à lire par Opus avant de coder (non ouverts, sauf mention) :**

| Fichier | Raison |
|---|---|
| `src/main.tsx`, `src/App.tsx` (lu : lignes 150-220) | Où placer l'hydratation et l'écran « Programme indisponible ». |
| `src/db/femmesRepo.ts` | Où vit `FEMMES_PROGRAMME_ID`, sans créer de dépendance du registre vers la base. |
| `src/db/repo.ts` (hors lignes lues) | Pourquoi il appelle `modulePourCycle` ; ce que vérifient `demarrerCycle` et `saveSet`. |
| `src/components/ExerciseCard.tsx` | Lecture de `objectifsParSerie` ; pré-remplissage du champ de charge. |
| `src/engine/loadResolver.ts`, `src/engine/loadEntry.ts` | Forme de `ResolvedLoad` ; l'aide « Première fois : choisis une charge… » ne doit pas inventer de consigne. |
| `src/engine/superset.ts` | Un groupe de trois exercices est-il affichable ? |
| Écran de séance, barre de repos | Affichage d'un repos non précisé (`restSec` à 0) et des champs `sansIntensite`, `sansDuree`. |
| Remplacement d'exercice en séance (`sessionExercises`) | Quels exercices sont proposés sous un programme importé. |
| `src/screens/CatalogueScreen.tsx`, `src/screens/AccueilScreen.tsx` | Ce qu'ils affichent pour la famille perso ; besoin ou non de notification. |
| `src/programmes/textesCycle.ts` | Textes hors séance pour un programme importé. |
| `src/state/theme.ts`, `src/data/famillesVisuel.ts` | Aucune identité visuelle n'est définie pour la famille perso : à fournir par Guillaume. |
| `src/state/useRoute.ts`, `src/screens/WeekScreen.tsx`, `src/engine/calendar.ts` | Seulement si la limite de 12 semaines doit être levée. |
